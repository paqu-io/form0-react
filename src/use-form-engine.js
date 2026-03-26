import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
} from 'react';
import { createFormEngine, validateSchema, expandBuildingPlanSchema } from 'form0-core';
import { cloneDeep, prepareSchema, ensureSchemaKeys } from './utils/schema.js';
import {
  buildRepeatableInfo,
  createEmptyRepeatableInstance,
} from './utils/repeatable-manager.js';
import { EngineWorkerClient } from './engine-worker-client.js';
import { createEngineStore } from './engine-store.js';

const createEmptyState = () => ({
  values: {},
  visible: {},
  required: {},
  read_only: {},
  errors: {},
});

const CAN_USE_WORKERS = typeof window !== 'undefined' && typeof Worker !== 'undefined';
const useStoreSyncEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function useFormEngine(schema, initialValues = {}, overrideValues, options = {}) {
  const normalizedOptions = useMemo(() => {
    const desiredMode = options?.engineMode === 'worker' ? 'worker' : 'main-thread';
    const engineMode =
      desiredMode === 'worker' && CAN_USE_WORKERS ? 'worker' : 'main-thread';
    const desiredStoreMode =
      options?.engineStoreMode === 'selector' || options?.storeMode === 'selector'
        ? 'selector'
        : 'snapshot';
    return {
      ...options,
      engineMode,
      engineStoreMode: desiredStoreMode,
    };
  }, [options]);
  const engineMode = normalizedOptions.engineMode;
  const engineStoreMode = normalizedOptions.engineStoreMode;
  const [state, setState] = useState(createEmptyState);
  const [engineVersion, setEngineVersion] = useState(0);
  const engineRef = useRef(null);
  const engineStoreRef = useRef(createEngineStore(createEmptyState()));
  const engineStore = engineStoreRef.current;
  const initialValuesRef = useRef(initialValues || {});
  const initialValuesSignatureRef = useRef(null);
  const optionsRef = useRef(normalizedOptions || {});
  const warningCleanupRef = useRef(null);
  const fieldDefinitionsRef = useRef(new Map());
  const repeatableStateRef = useRef({});
  const [repeatableState, setRepeatableStateInternal] = useState({});
  const workerClientRef = useRef(null);
  const engineModeRef = useRef(engineMode);
  const workerReadyRef = useRef(false);
  const pendingWorkerUpdatesRef = useRef([]);
  const workerStateVersionRef = useRef(0);
  const valueUpdateVersionRef = useRef(0);
  const fieldUpdateVersionRef = useRef(new Map());
  const optimisticValuesRef = useRef({});
  const workerInitTokenRef = useRef(0);
  const workerInitInFlightRef = useRef(false);
  const [engineReadyVersion, setEngineReadyVersion] = useState(0);

  useEffect(() => {
    optionsRef.current = normalizedOptions || {};
  }, [normalizedOptions]);

  useEffect(() => {
    engineModeRef.current = engineMode;
  }, [engineMode]);

  useStoreSyncEffect(() => {
    engineStore.setState(state);
  }, [engineStore, state]);

  useEffect(() => {
    if (engineStoreMode === 'selector') {
      console.info('[form0-react] selector store enabled (parent form)');
      if (typeof window !== 'undefined') {
        const info =
          window.__FORM0_SELECTOR_INFO__ && typeof window.__FORM0_SELECTOR_INFO__ === 'object'
            ? window.__FORM0_SELECTOR_INFO__
            : {};
        if (!info.repeatables) {
          info.repeatables = [];
        }
        info.parent = true;
        window.__FORM0_SELECTOR_INFO__ = info;
      }
    }
  }, [engineStoreMode]);

  const resetWorkerSyncState = useCallback(() => {
    workerStateVersionRef.current = 0;
    valueUpdateVersionRef.current = 0;
    fieldUpdateVersionRef.current = new Map();
    optimisticValuesRef.current = {};
    pendingWorkerUpdatesRef.current = [];
  }, []);

  const cleanupWorkerClient = useCallback(
    ({ bumpToken = true, resetInFlight = true } = {}) => {
      if (bumpToken) {
        workerInitTokenRef.current += 1;
      }
      if (resetInFlight) {
        workerInitInFlightRef.current = false;
      }
      if (workerClientRef.current) {
        workerClientRef.current.terminate();
        workerClientRef.current = null;
      }
      workerReadyRef.current = false;
      resetWorkerSyncState();
    },
    [resetWorkerSyncState]
  );

  useEffect(() => () => cleanupWorkerClient(), [cleanupWorkerClient]);

  const { schema: preparedSchema, buildingPlanMeta } = useMemo(() => {
    if (!schema) return { schema: null, buildingPlanMeta: [] };

    // Clone and ensure stable keys before expanding building plan nodes
    const copy = prepareSchema(schema);

    // Expand BuildingPlanSection into scoped repeatables and collect meta
    const { schema: expandedSchema, buildingPlanMeta = [] } = expandBuildingPlanSchema(copy);

    const form = expandedSchema?.form;
    if (!form || !Array.isArray(form.elements)) {
      throw new Error('form0-react: schema.form.elements must be defined');
    }

    // Defensive: ensure any newly added elements still have keys
    ensureSchemaKeys(form.elements);
    validateSchema(form);

    return { schema: expandedSchema, buildingPlanMeta };
  }, [schema]);

  const repeatableMetadata = useMemo(() => {
    if (!preparedSchema?.form?.elements) {
      return {
        repeatableSectionTree: new Map(),
        fieldOwnership: new Map(),
        sectionFields: new Set(),
        byPreferredKey: new Map(),
      };
    }
    const meta = buildRepeatableInfo(preparedSchema.form.elements);
    const byPreferredKey = new Map();
    if (meta?.repeatableSectionTree) {
      meta.repeatableSectionTree.forEach((info) => {
        if (info?.preferredKey) {
          byPreferredKey.set(info.preferredKey, info);
        }
      });
    }
    return {
      ...meta,
      byPreferredKey,
    };
  }, [preparedSchema]);

  useEffect(() => {
    if (preparedSchema?.form) {
      fieldDefinitionsRef.current = buildFieldDefinitionMap(preparedSchema.form);
    } else {
      fieldDefinitionsRef.current = new Map();
    }
  }, [preparedSchema]);

  useEffect(() => {
    initialValuesRef.current = initialValues || {};
  }, [initialValues]);

  useEffect(() => {
    repeatableStateRef.current = repeatableState;
  }, [repeatableState]);

  const updateRepeatableState = useCallback((updater) => {
    setRepeatableStateInternal((prev) => {
      const next =
        typeof updater === 'function'
          ? updater(prev || {})
          : updater && typeof updater === 'object'
          ? updater
          : {};
      repeatableStateRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    updateRepeatableState({});
  }, [preparedSchema, updateRepeatableState]);

  const mutateRepeatableState = useCallback(
    (mutator) => {
      updateRepeatableState((prev) => {
        const base = prev && typeof prev === 'object' ? prev : {};
        const draft = cloneDeep(base);
        mutator(draft);
        return draft;
      });
    },
    [updateRepeatableState]
  );

  const resolveRepeatableContainer = useCallback((state, path = [], { createIfMissing = false } = {}) => {
    let container = state || {};
    if (!Array.isArray(path) || path.length === 0) {
      return container;
    }
    for (const segment of path) {
      if (!segment || typeof segment.key !== 'string') {
        return null;
      }
      const list = container?.[segment.key];
      if (!Array.isArray(list)) {
        return null;
      }
      const targetIndex = list.findIndex((instance) => instance.id === segment.id);
      if (targetIndex === -1) {
        return null;
      }
      const target = list[targetIndex];
      if (!target.repeatable || typeof target.repeatable !== 'object') {
        if (createIfMissing) {
          target.repeatable = {};
        } else {
          return null;
        }
      }
      container = target.repeatable;
    }
    return container;
  }, []);

  const getRepeatableInstances = useCallback(
    (repeatableKey, parentPath = []) => {
      const container = resolveRepeatableContainer(
        repeatableStateRef.current || {},
        parentPath
      );
      const list = container?.[repeatableKey];
      return Array.isArray(list) ? list : [];
    },
    [resolveRepeatableContainer]
  );

  const getRepeatableInstance = useCallback(
    (repeatableKey, instanceId, parentPath = []) => {
      const list = getRepeatableInstances(repeatableKey, parentPath);
      return list.find((instance) => instance.id === instanceId) || null;
    },
    [getRepeatableInstances]
  );

  const addRepeatableInstance = useCallback(
    (repeatableKey, { parentPath = [], seedValues = {}, instanceId } = {}) => {
      const repInfo = repeatableMetadata.byPreferredKey.get(repeatableKey);
      if (!repInfo) {
        console.warn(`form0-react: unknown RepeatableSection key "${repeatableKey}"`);
        return null;
      }
      const newInstance = createEmptyRepeatableInstance(repInfo);
      if (instanceId) {
        newInstance.id = instanceId;
      }
      if (seedValues && typeof seedValues === 'object') {
        newInstance.values = {
          ...newInstance.values,
          ...seedValues,
        };
      }
      mutateRepeatableState((draft) => {
        const container =
          resolveRepeatableContainer(draft, parentPath, { createIfMissing: true }) || draft;
        if (!Array.isArray(container[repeatableKey])) {
          container[repeatableKey] = [];
        }
        container[repeatableKey].push(newInstance);
      });
      return newInstance;
    },
    [mutateRepeatableState, repeatableMetadata, resolveRepeatableContainer]
  );

  const updateRepeatableInstance = useCallback(
    (repeatableKey, instanceId, updater, parentPath = []) => {
      if (typeof updater !== 'function' && (updater == null || typeof updater !== 'object')) {
        return;
      }
      mutateRepeatableState((draft) => {
        const container = resolveRepeatableContainer(draft, parentPath);
        if (!container) {
          return;
        }
        const list = container[repeatableKey];
        if (!Array.isArray(list)) {
          return;
        }
        const index = list.findIndex((instance) => instance.id === instanceId);
        if (index === -1) {
          return;
        }
        const current = list[index];
        const nextInstance =
          typeof updater === 'function'
            ? updater(cloneDeep(current))
            : { ...current, ...updater };
        list[index] = nextInstance;
      });
    },
    [mutateRepeatableState, resolveRepeatableContainer]
  );

  const removeRepeatableInstance = useCallback(
    (repeatableKey, instanceId, parentPath = []) => {
      mutateRepeatableState((draft) => {
        const container = resolveRepeatableContainer(draft, parentPath);
        if (!container) {
          return;
        }
        const list = container[repeatableKey];
        if (!Array.isArray(list)) {
          return;
        }
        const index = list.findIndex((instance) => instance.id === instanceId);
        if (index === -1) {
          return;
        }
        list.splice(index, 1);
      });
    },
    [mutateRepeatableState, resolveRepeatableContainer]
  );
  const setRepeatableInstances = useCallback(
    (repeatableKey, instances = [], parentPath = []) => {
      mutateRepeatableState((draft) => {
        const container =
          resolveRepeatableContainer(draft, parentPath, { createIfMissing: true }) || draft;
        container[repeatableKey] = Array.isArray(instances) ? cloneDeep(instances) : [];
      });
    },
    [mutateRepeatableState, resolveRepeatableContainer]
  );

  const syncState = useCallback((engineStateOverride = null) => {
    const sourceState =
      engineStateOverride ||
      (engineRef.current && typeof engineRef.current.getState === 'function'
        ? engineRef.current.getState()
        : null);
    if (!sourceState) {
      const empty = createEmptyState();
      engineStore.setState(empty);
      setState(empty);
      return;
    }
    const preparedState = {
      values: { ...(sourceState.values || {}) },
      visible: { ...(sourceState.visible || {}) },
      required: { ...(sourceState.required || {}) },
      read_only: { ...(sourceState.read_only || {}) },
      errors: { ...(sourceState.errors || {}) },
    };
    engineStore.setState(preparedState);
    setState(preparedState);
  }, [engineStore]);

  const syncWorkerState = useCallback((engineStateOverride = null, meta = {}) => {
    const sourceState = engineStateOverride || null;
    if (!sourceState) {
      const empty = createEmptyState();
      engineStore.setState(empty);
      setState(empty);
      return;
    }

    const incomingVersion = Number(meta?.stateVersion || 0);
    const currentVersion = Number(workerStateVersionRef.current || 0);
    if (incomingVersion > 0 && incomingVersion < currentVersion) {
      return;
    }
    if (incomingVersion > 0 && incomingVersion > currentVersion) {
      workerStateVersionRef.current = incomingVersion;
    }

    const updateVersion = Number(meta?.updateVersion || 0);
    const preparedState = {
      values: { ...(sourceState.values || {}) },
      visible: { ...(sourceState.visible || {}) },
      required: { ...(sourceState.required || {}) },
      read_only: { ...(sourceState.read_only || {}) },
      errors: { ...(sourceState.errors || {}) },
    };

    if (updateVersion > 0) {
      const fieldsToClear = [];
      fieldUpdateVersionRef.current.forEach((version, field) => {
        if (version > updateVersion) {
          if (field in optimisticValuesRef.current) {
            preparedState.values[field] = optimisticValuesRef.current[field];
          }
          return;
        }
        fieldsToClear.push(field);
      });

      if (fieldsToClear.length > 0) {
        fieldsToClear.forEach((field) => {
          fieldUpdateVersionRef.current.delete(field);
        });
        const nextOptimistic = { ...optimisticValuesRef.current };
        fieldsToClear.forEach((field) => {
          delete nextOptimistic[field];
        });
        optimisticValuesRef.current = nextOptimistic;
      }
    }

    engineStore.setState(preparedState);
    setState(preparedState);
  }, [engineStore]);

  const createWorkerClient = useCallback(() => {
    if (!CAN_USE_WORKERS) {
      return null;
    }
    try {
      const workerOptions = optionsRef.current || {};
      const client = new EngineWorkerClient({
        onState: (nextState, meta) => syncWorkerState(nextState, meta),
        createWorker: workerOptions.createWorker,
        workerUrl: workerOptions.workerUrl,
      });
      workerClientRef.current = client;
      return client;
    } catch (error) {
      console.warn('form0-react: failed to initialize engine worker.', error);
      workerClientRef.current = null;
      return null;
    }
  }, [syncWorkerState]);

  const sendWorkerValueUpdates = useCallback(
    (updates = {}, updateVersion = 0) => {
      const client = workerClientRef.current;
      if (!client) {
        return;
      }
      if (!workerReadyRef.current) {
        pendingWorkerUpdatesRef.current.push({ updates: { ...updates }, updateVersion });
        return;
      }
      client
        .setValues(updates, { updateVersion })
        .then((result) => {
          if (result?.state) {
            syncWorkerState(result.state, result);
          }
        })
        .catch((error) => {
          console.warn('form0-react: engine worker setValues failed.', error);
        });
    },
    [syncWorkerState]
  );

  const flushPendingWorkerUpdates = useCallback(() => {
    if (!workerReadyRef.current || pendingWorkerUpdatesRef.current.length === 0) {
      return;
    }
    let latestUpdateVersion = 0;
    const merged = pendingWorkerUpdatesRef.current.reduce((acc, entry) => {
      const updates = entry?.updates || entry || {};
      if (entry?.updateVersion && entry.updateVersion > latestUpdateVersion) {
        latestUpdateVersion = entry.updateVersion;
      }
      Object.entries(updates).forEach(([key, value]) => {
        acc[key] = value;
      });
      return acc;
    }, {});
    pendingWorkerUpdatesRef.current = [];
    if (Object.keys(merged).length > 0) {
      sendWorkerValueUpdates(merged, latestUpdateVersion);
    }
  }, [sendWorkerValueUpdates]);

  const rebuildEngine = useCallback(
    (seedValues = initialValuesRef.current) => {
      //console.log('[form0-react] rebuildEngine start', { mode: engineModeRef.current });
      if (!preparedSchema) {
        engineRef.current = null;
        cleanupWorkerClient();
        const empty = createEmptyState();
        engineStore.setState(empty);
        setState(empty);
        setEngineReadyVersion(0);
        return;
      }

      const isWorkerMode = engineModeRef.current === 'worker';

      if (isWorkerMode) {
        if (workerInitInFlightRef.current) {
          //console.log('[form0-react] worker init already in flight, skipping');
          return;
        }
        cleanupWorkerClient({ bumpToken: false });
        engineRef.current = null;
        const initToken = workerInitTokenRef.current + 1;
        workerInitTokenRef.current = initToken;
        workerInitInFlightRef.current = true;
        console.info('[form0-react] worker init start', { token: initToken });
        workerReadyRef.current = false;
        pendingWorkerUpdatesRef.current = [];
        const client = createWorkerClient();
        if (client) {
          engineRef.current = client;
          client
            .init({
              schema: preparedSchema,
              initialValues: { ...(seedValues || {}) },
              helpers: optionsRef.current.helpers,
              security: optionsRef.current.security,
            })
            .then((result) => {
              // console.log(
              //   '[form0-react] worker init resolved',
              //   initToken,
              //   'current token',
              //   workerInitTokenRef.current
              // );
              workerInitInFlightRef.current = false;
              if (workerInitTokenRef.current !== initToken) {
                //console.log('[form0-react] stale worker init token, ignoring result');
                return;
              }
              workerReadyRef.current = true;
              if (result?.state) {
                syncWorkerState(result.state, result);
              }
              flushPendingWorkerUpdates();
              setEngineVersion((version) => version + 1);
              setEngineReadyVersion((version) => version + 1);
            })
            .catch((error) => {
              // console.log(
              //   '[form0-react] worker init failed',
              //   initToken,
              //   'current token',
              //   workerInitTokenRef.current,
              //   error
              // );
              workerInitInFlightRef.current = false;
              if (workerInitTokenRef.current !== initToken) {
                return;
              }
              console.warn('form0-react: engine worker initialization failed.', error);
            });
          return;
        }
        workerInitInFlightRef.current = false;
      }

      cleanupWorkerClient({ bumpToken: !isWorkerMode });
      const engine = createFormEngine({
        schema: preparedSchema,
        initialValues: { ...(seedValues || {}) },
        helpers: optionsRef.current.helpers,
        security: optionsRef.current.security,
      });
      engineRef.current = engine;
      engine.eval();
      syncState();
      setEngineVersion((version) => version + 1);
      setEngineReadyVersion((version) => version + 1);
    },
    [
      engineStore,
      cleanupWorkerClient,
      createWorkerClient,
      flushPendingWorkerUpdates,
      preparedSchema,
      syncState,
      syncWorkerState,
    ]
  );

  const evaluateAndSync = useCallback(() => {
    if (engineModeRef.current === 'worker') {
      const client = workerClientRef.current;
      if (!client || !workerReadyRef.current) {
        return;
      }
      client
        .eval()
        .then((result) => {
          if (result?.state) {
            syncWorkerState(result.state, result);
          }
        })
        .catch((error) => {
          console.warn('form0-react: engine worker evaluation failed.', error);
        });
      return;
    }
    if (!engineRef.current) return;
    engineRef.current.eval();
    syncState();
  }, [syncState, syncWorkerState]);

  const applyOptimisticValues = useCallback((updates = {}) => {
    if (!updates || typeof updates !== 'object') {
      return;
    }
    optimisticValuesRef.current = {
      ...optimisticValuesRef.current,
      ...updates,
    };
    setState((prev) => {
      if (!prev) {
        return prev;
      }
      let dirty = false;
      const nextValues = { ...(prev.values || {}) };
      for (const [field, value] of Object.entries(updates)) {
        if (nextValues[field] !== value) {
          nextValues[field] = value;
          dirty = true;
        }
      }
      if (!dirty) {
        return prev;
      }
      return {
        ...prev,
        values: nextValues,
      };
    });
  }, []);

  const setValues = useCallback(
    (updates = {}) => {
      if (!updates || typeof updates !== 'object') return;
      //console.log('[form0-react] setValues called', updates, 'mode=', engineModeRef.current);
      if (engineModeRef.current === 'worker') {
        if (!workerClientRef.current) {
          //console.log('[form0-react] worker client missing');
          return;
        }
        const updateVersion = valueUpdateVersionRef.current + 1;
        valueUpdateVersionRef.current = updateVersion;
        Object.keys(updates || {}).forEach((field) => {
          fieldUpdateVersionRef.current.set(field, updateVersion);
        });
        applyOptimisticValues(updates);
        if (!workerReadyRef.current) {
          //console.log('[form0-react] worker not ready, queueing updates');
          pendingWorkerUpdatesRef.current.push({ updates: { ...updates }, updateVersion });
          return;
        }
        sendWorkerValueUpdates(updates, updateVersion);
        return;
      }
      if (!engineRef.current) return;
      const engineState = engineRef.current.getState();
      let dirty = false;
      for (const [field, value] of Object.entries(updates)) {
        if (engineState.values[field] !== value) {
          engineState.values[field] = value;
          dirty = true;
        }
      }
      if (dirty) {
        evaluateAndSync();
      }
    },
    [applyOptimisticValues, evaluateAndSync, sendWorkerValueUpdates]
  );

  const setValue = useCallback(
    (field, value) => {
      if (!field) return;
      if (engineModeRef.current === 'worker') {
        //console.log('[form0-react] setValue proxied to setValues', field, value);
        setValues({ [field]: value });
        return;
      }
      if (!engineRef.current) return;
      const engineState = engineRef.current.getState();
      if (engineState.values[field] === value) return;
      engineState.values[field] = value;
      evaluateAndSync();
    },
    [evaluateAndSync, setValues]
  );

  const reset = useCallback(
    (nextValues = initialValuesRef.current) => {
      rebuildEngine(nextValues || {});
    },
    [rebuildEngine]
  );

  const submit = useCallback(() => {
    if (!engineRef.current) return {};
    const { values } = engineRef.current.getState();
    return cloneDeep(values) || {};
  }, []);

  const normalizeValueForField = useCallback((fieldName, value) => {
    const fieldDef = fieldDefinitionsRef.current.get(fieldName);
    if (!fieldDef) {
      return typeof value === 'object' && value !== null ? cloneDeep(value) : value;
    }
    switch (fieldDef.type) {
      case 'SingleChoiceField':
      case 'BooleanField':
        return normalizeSingleChoiceValue(fieldDef, value);
      case 'MultiChoiceField':
        return normalizeMultiChoiceValue(fieldDef, value);
      default:
        return typeof value === 'object' && value !== null ? cloneDeep(value) : value;
    }
  }, []);

  const defaultProcessOperations = useCallback(
    (operations = [], meta = {}) => {
      if (!Array.isArray(operations) || operations.length === 0) {
        return;
      }

      const pendingValueUpdates = {};

      operations.forEach((operation) => {
        if (!operation || typeof operation !== 'object') {
          return;
        }

        const { type, operation: opName, params = {} } = operation;

        if (type === 'FIELD_OPERATION' && opName === 'SETVALUE') {
          const { fieldDataName, valueToSet } = params || {};
          if (typeof fieldDataName !== 'string' || fieldDataName.length === 0) {
            console.warn('form0-react: SETVALUE operation missing fieldDataName.', operation);
            return;
          }
          pendingValueUpdates[fieldDataName] = normalizeValueForField(fieldDataName, valueToSet);
          return;
        }

        if (type === 'UI_OPERATION' && opName === 'ALERT') {
          const title = params?.title != null ? String(params.title) : '';
          const message = params?.message != null ? String(params.message) : '';
          const text = [title, message].filter(Boolean).join('\n\n');
          if (typeof window !== 'undefined' && typeof window.alert === 'function') {
            window.alert(text);
          } else {
            console.warn(
              'form0-react: ALERT operation received but window.alert is unavailable.',
              { title, message }
            );
          }
          return;
        }

        if (type === 'UI_OPERATION' || type === 'FIELD_OPERATION') {
          console.warn(
            'form0-react: Unhandled operation received. Provide an onOperations callback to manage custom operations.',
            operation
          );
        }
      });

      if (Object.keys(pendingValueUpdates).length > 0) {
        setValues(pendingValueUpdates);
      }
    },
    [setValues, normalizeValueForField]
  );

  const processOperations = useCallback(
    (operations = [], meta = {}) => {
      if (!Array.isArray(operations) || operations.length === 0) {
        return;
      }
      const handler = optionsRef.current.onOperations;
      if (typeof handler === 'function') {
        handler(operations, meta, defaultProcessOperations);
      } else {
        defaultProcessOperations(operations, meta);
      }
    },
    [defaultProcessOperations]
  );

  const triggerEvent = useCallback(
    (eventType, fieldKey = null, metadata = {}) => {
      if (typeof eventType !== 'string' || eventType.length === 0) {
        console.warn('form0-react: triggerEvent requires a non-empty eventType string.');
        return [];
      }

      if (engineModeRef.current === 'worker') {
        const client = workerClientRef.current;
        if (!client || !workerReadyRef.current) {
          return [];
        }
        client
          .triggerEvent(eventType, fieldKey, metadata)
          .then((result) => {
            const operations = Array.isArray(result?.operations) ? result.operations : [];
            if (operations.length > 0) {
              processOperations(operations, { eventType, fieldKey, metadata });
            }
          })
          .catch((error) => {
            console.warn('form0-react: worker triggerEvent failed.', error);
          });
        return [];
      }

      if (!engineRef.current) return [];
      try {
        const operations = engineRef.current.trigger(eventType, fieldKey, metadata) || [];
        if (operations.length > 0) {
          processOperations(operations, { eventType, fieldKey, metadata });
        }
        return operations;
      } catch (error) {
        console.warn('form0-react: triggerEvent failed.', error);
        return [];
      }
    },
    [processOperations]
  );

  const overrideSignature = useMemo(
    () => (overrideValues ? JSON.stringify(overrideValues) : null),
    [overrideValues]
  );

  const initialValuesSignature = useMemo(
    () => JSON.stringify(initialValues || {}),
    [initialValues]
  );

  const rebuildEngineRef = useRef(rebuildEngine);
  useEffect(() => {
    rebuildEngineRef.current = rebuildEngine;
  }, [rebuildEngine]);

  useEffect(() => {
    if (!preparedSchema) {
      engineRef.current = null;
      cleanupWorkerClient();
        const empty = createEmptyState();
        setState(empty);
        return;
      }
    rebuildEngineRef.current(initialValuesRef.current);
    initialValuesSignatureRef.current = initialValuesSignature;
    return () => {
      engineRef.current = null;
      cleanupWorkerClient();
    };
  }, [cleanupWorkerClient, engineStore, initialValuesSignature, preparedSchema]);

  useEffect(() => {
    if (!engineRef.current) return;
    if (initialValuesSignatureRef.current === null) {
      initialValuesSignatureRef.current = initialValuesSignature;
      return;
    }
    if (initialValuesSignatureRef.current !== initialValuesSignature) {
      initialValuesSignatureRef.current = initialValuesSignature;
      reset(initialValues);
    }
  }, [initialValues, initialValuesSignature, reset]);

  useEffect(() => {
    if (!overrideValues || !engineRef.current) return;
    setValues(overrideValues);
  }, [overrideSignature, overrideValues, setValues]);

  useEffect(() => {
    const handler = optionsRef.current.onUpdate;
    if (typeof handler === 'function' && engineRef.current) {
      handler({ ...state }, engineRef.current);
    }
  }, [state]);

  useEffect(() => {
    if (warningCleanupRef.current) {
      warningCleanupRef.current();
      warningCleanupRef.current = null;
    }

    const warningHandler = optionsRef.current.onWarning;
    if (typeof warningHandler !== 'function') {
      return;
    }

    const proxy = (warning) => {
      const latest = optionsRef.current.onWarning;
      if (typeof latest === 'function') {
        latest(warning);
      }
    };

    if (engineMode === 'worker') {
      const client = workerClientRef.current;
      if (!client) {
        return undefined;
      }
      client.addWarningHandler(proxy);
      warningCleanupRef.current = () => client.removeWarningHandler(proxy);
      return () => {
        if (warningCleanupRef.current) {
          warningCleanupRef.current();
          warningCleanupRef.current = null;
        }
      };
    }

    const warningSystem = engineRef.current?.getWarningSystem?.();
    if (!warningSystem || typeof warningSystem.addWarningHandler !== 'function') {
      return undefined;
    }

    warningSystem.addWarningHandler(proxy);
    warningCleanupRef.current = () => warningSystem.removeWarningHandler(proxy);

    return () => {
      if (warningCleanupRef.current) {
        warningCleanupRef.current();
        warningCleanupRef.current = null;
      } else {
        warningSystem.removeWarningHandler(proxy);
      }
    };
  }, [engineMode, engineVersion, normalizedOptions.onWarning]);

  useEffect(() => {
    return () => {
      if (warningCleanupRef.current) {
        warningCleanupRef.current();
        warningCleanupRef.current = null;
      }
    };
  }, []);

  return {
    ...state,
    setValue,
    setValues,
    reset,
    submit,
    triggerEvent,
    processOperations,
    schema: preparedSchema,
    engine: engineRef.current,
    engineStore,
    engineStoreMode,
    engineReadyVersion,
    repeatable: repeatableState,
    setRepeatableState: updateRepeatableState,
    addRepeatableInstance,
    updateRepeatableInstance,
    removeRepeatableInstance,
    setRepeatableInstances,
    getRepeatableInstances,
    getRepeatableInstance,
    repeatableMetadata,
    buildingPlanMeta,
  };
}

function buildFieldDefinitionMap(form) {
  const map = new Map();
  if (!form) {
    return map;
  }

  const visit = (elements) => {
    if (!Array.isArray(elements)) {
      return;
    }
    elements.forEach((element) => {
      if (!element) return;
      if (
        element.type === 'Section' ||
        element.type === 'RepeatableSection' ||
        element.type === 'BuildingPlanSection'
      ) {
        visit(element.elements);
      } else if (element.data_name) {
        map.set(element.data_name, element);
      }
    });
  };

  visit(form.elements);

  if (form.status_field?.data_name) {
    map.set(form.status_field.data_name, form.status_field);
  }
  if (form.title_field?.data_name) {
    map.set(form.title_field.data_name, form.title_field);
  }

  return map;
}

function coerceChoiceValue(field, rawValue) {
  const choices = Array.isArray(field?.choices) ? field.choices : [];
  const match = choices.find(
    (choice) => choice && String(choice.value) === String(rawValue)
  );
  if (match) {
    return match.value;
  }
  return rawValue;
}

function lookupChoiceLabel(field, value) {
  const choices = Array.isArray(field?.choices) ? field.choices : [];
  const match = choices.find(
    (choice) => choice && String(choice.value) === String(value)
  );
  if (match && typeof match.label === 'string' && match.label.trim() !== '') {
    return match.label;
  }
  return value != null ? String(value) : '';
}

function normalizeChoiceEntry(field, entry) {
  if (entry == null) {
    return null;
  }

  if (
    typeof entry === 'string' ||
    typeof entry === 'number' ||
    typeof entry === 'boolean'
  ) {
    const coercedValue = coerceChoiceValue(field, entry);
    return {
      value: coercedValue,
      label: lookupChoiceLabel(field, coercedValue),
    };
  }

  if (typeof entry === 'object') {
    const value = coerceChoiceValue(
      field,
      entry.value != null
        ? entry.value
        : typeof entry.label === 'string' && entry.label.trim() !== ''
        ? entry.label
        : null
    );
    if (value == null) {
      return null;
    }
    const label =
      typeof entry.label === 'string' && entry.label.trim() !== ''
        ? entry.label
        : lookupChoiceLabel(field, value);
    return {
      ...entry,
      value,
      label,
    };
  }

  return null;
}

function normalizeOtherEntry(entry) {
  if (entry == null) {
    return null;
  }
  if (typeof entry === 'string') {
    const trimmed = entry.trim();
    return trimmed ? { label: trimmed } : null;
  }
  if (typeof entry === 'object') {
    const label =
      typeof entry.label === 'string' && entry.label.trim() !== ''
        ? entry.label
        : entry.value != null
        ? String(entry.value)
        : '';
    return {
      ...entry,
      label,
    };
  }
  return null;
}

function normalizeSingleChoiceValue(field, value) {
  if (value == null) {
    return { choice: [], other: [] };
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    const normalizedChoice = normalizeChoiceEntry(field, value);
    return {
      choice: normalizedChoice ? [normalizedChoice] : [],
      other: [],
    };
  }

  if (Array.isArray(value)) {
    const normalizedChoice = value
      .map((entry) => normalizeChoiceEntry(field, entry))
      .filter(Boolean);
    return {
      choice: normalizedChoice,
      other: [],
    };
  }

  if (typeof value === 'object') {
    const choiceSource = Array.isArray(value.choice)
      ? value.choice
      : Array.isArray(value.choices)
      ? value.choices
      : [];
    const otherSource = Array.isArray(value.other) ? value.other : [];
    const normalizedChoice = choiceSource
      .map((entry) => normalizeChoiceEntry(field, entry))
      .filter(Boolean);
    const normalizedOther = otherSource
      .map((entry) => normalizeOtherEntry(entry))
      .filter(Boolean);
    return {
      choice: normalizedChoice,
      other: normalizedOther,
    };
  }

  return { choice: [], other: [] };
}

function normalizeMultiChoiceValue(field, value) {
  if (value == null) {
    return { choices: [], other: [] };
  }

  if (Array.isArray(value)) {
    const normalizedChoices = value
      .map((entry) => normalizeChoiceEntry(field, entry))
      .filter(Boolean);
    return {
      choices: normalizedChoices,
      other: [],
    };
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    const normalizedChoice = normalizeChoiceEntry(field, value);
    return {
      choices: normalizedChoice ? [normalizedChoice] : [],
      other: [],
    };
  }

  if (typeof value === 'object') {
    const choiceSource = Array.isArray(value.choices)
      ? value.choices
      : Array.isArray(value.choice)
      ? value.choice
      : [];
    const otherSource = Array.isArray(value.other) ? value.other : [];
    const normalizedChoices = choiceSource
      .map((entry) => normalizeChoiceEntry(field, entry))
      .filter(Boolean);
    const normalizedOther = otherSource
      .map((entry) => normalizeOtherEntry(entry))
      .filter(Boolean);
    return {
      choices: normalizedChoices,
      other: normalizedOther,
    };
  }

  return { choices: [], other: [] };
}
