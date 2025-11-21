import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createFormEngine } from 'form0-core';
import { cloneDeep } from './utils/schema.js';
import {
  buildRepeatableInfo,
  createEmptyRepeatableInstance,
} from './utils/repeatable-manager.js';
import { uuidv7 } from './utils/uuid.js';
import { EngineWorkerClient } from './engine-worker-client.js';

const CAN_USE_WORKERS = typeof window !== 'undefined' && typeof Worker !== 'undefined';

const createEmptyState = (repInfo) => {
  const values = {};
  if (repInfo?.fields) {
    repInfo.fields.forEach((_fieldInfo, dataName) => {
      values[dataName] = null;
    });
  }
  return {
    values,
    visible: {},
    required: {},
    read_only: {},
    errors: {},
  };
};

export function useRepeatableInstanceEngine({
  schema,
  repInfo,
  baseValues = {},
  initialInstance = {},
  engineOptions = {},
}) {
  const engineMode = useMemo(() => {
    const desiredMode = engineOptions?.engineMode === 'worker' ? 'worker' : 'main-thread';
    if (desiredMode === 'worker' && CAN_USE_WORKERS) {
      return 'worker';
    }
    return 'main-thread';
  }, [engineOptions?.engineMode]);

  const [state, setState] = useState(() => createEmptyState(repInfo));
  const [repeatableState, setRepeatableState] = useState(
    () => cloneDeep(initialInstance.repeatable || {})
  );
  const engineRef = useRef(null);
  const engineModeRef = useRef(engineMode);
  const baseValuesRef = useRef(baseValues || {});
  const valuesRef = useRef(initialInstance.values || {});
  const engineOptionsRef = useRef(engineOptions || {});
  const workerClientRef = useRef(null);
  const workerReadyRef = useRef(false);
  const workerInitTokenRef = useRef(0);
  const workerInitInFlightRef = useRef(false);
  const pendingWorkerUpdatesRef = useRef([]);
  const workerStateVersionRef = useRef(0);
  const valueUpdateVersionRef = useRef(0);
  const fieldUpdateVersionRef = useRef(new Map());
  const optimisticValuesRef = useRef({});

  useEffect(() => {
    engineModeRef.current = engineMode;
  }, [engineMode]);

  useEffect(() => {
    baseValuesRef.current = baseValues || {};
  }, [baseValues]);

  useEffect(() => {
    engineOptionsRef.current = engineOptions || {};
  }, [engineOptions]);

  const fieldNames = useMemo(() => {
    if (!repInfo?.fields) return [];
    return Array.from(repInfo.fields.keys());
  }, [repInfo]);
  const fieldNameSet = useMemo(() => new Set(fieldNames), [fieldNames]);

  const repeatableMetadata = useMemo(() => {
    if (!repInfo?.field?.elements) {
      return {
        repeatableSectionTree: new Map(),
        fieldOwnership: new Map(),
        sectionFields: new Set(),
        byPreferredKey: new Map(),
      };
    }
    const meta = buildRepeatableInfo(repInfo.field.elements);
    const byPreferredKey = new Map();
    if (meta.repeatableSectionTree) {
      meta.repeatableSectionTree.forEach((info) => {
        if (info?.preferredKey) {
          byPreferredKey.set(info.preferredKey, info);
        }
      });
    }
    return { ...meta, byPreferredKey };
  }, [repInfo]);

  const pickFields = useCallback(
    (map = {}) => {
      const slice = {};
      fieldNames.forEach((name) => {
        if (Object.prototype.hasOwnProperty.call(map, name)) {
          slice[name] = map[name];
        }
      });
      return slice;
    },
    [fieldNames]
  );

  const reduceEngineState = useCallback(
    (engineState) => {
      if (!engineState) {
        return createEmptyState(repInfo);
      }
      return {
        values: pickFields(engineState.values || {}),
        errors: pickFields(engineState.errors || {}),
        visible: pickFields(engineState.visible || {}),
        required: pickFields(engineState.required || {}),
        read_only: pickFields(engineState.read_only || {}),
      };
    },
    [pickFields, repInfo]
  );

  const filterUpdates = useCallback(
    (updates = {}) => {
      if (!updates || typeof updates !== 'object') {
        return {};
      }
      const filtered = {};
      Object.entries(updates).forEach(([key, value]) => {
        if (fieldNameSet.size === 0 || fieldNameSet.has(key)) {
          filtered[key] = value;
        }
      });
      return filtered;
    },
    [fieldNameSet]
  );

  const resetWorkerSyncState = useCallback(() => {
    workerStateVersionRef.current = 0;
    valueUpdateVersionRef.current = 0;
    fieldUpdateVersionRef.current = new Map();
    optimisticValuesRef.current = {};
    pendingWorkerUpdatesRef.current = [];
  }, []);

  const cleanupWorkerClient = useCallback(() => {
    if (workerClientRef.current) {
      workerClientRef.current.terminate();
      workerClientRef.current = null;
    }
    workerReadyRef.current = false;
    workerInitInFlightRef.current = false;
    resetWorkerSyncState();
  }, [resetWorkerSyncState]);

  useEffect(() => () => cleanupWorkerClient(), [cleanupWorkerClient]);

  const buildEngine = useCallback(
    (instanceValues) => {
      const mergedValues = {
        ...(baseValuesRef.current || {}),
        ...(instanceValues || {}),
      };
      const engine = createFormEngine({
        schema,
        initialValues: mergedValues,
        helpers: engineOptions.helpers,
        security: engineOptions.security,
      });
      engine.eval();
      return engine;
    },
    [schema, engineOptions.helpers, engineOptions.security]
  );

  const syncState = useCallback(
    (engine) => {
      if (!engine) {
        setState(createEmptyState(repInfo));
        return;
      }
      const engineState = reduceEngineState(engine.getState());
      setState(engineState);
      valuesRef.current = engineState.values;
    },
    [reduceEngineState, repInfo]
  );

  const syncWorkerState = useCallback(
    (engineStateOverride = null, meta = {}) => {
      const sourceState = engineStateOverride || null;
      if (!sourceState) {
        setState(createEmptyState(repInfo));
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
      const preparedState = reduceEngineState(sourceState);

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

      setState(preparedState);
      valuesRef.current = preparedState.values;
    },
    [reduceEngineState, repInfo]
  );

  const createWorkerClient = useCallback(() => {
    if (!CAN_USE_WORKERS) {
      return null;
    }
    try {
      const client = new EngineWorkerClient({
        onState: (nextState, meta) => syncWorkerState(nextState, meta),
      });
      workerClientRef.current = client;
      return client;
    } catch (error) {
      console.warn('form0-react: failed to initialize repeatable engine worker.', error);
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
          console.warn('form0-react: repeatable engine worker setValues failed.', error);
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
    (instanceValues = valuesRef.current) => {
      if (!schema || !repInfo) {
        engineRef.current = null;
        cleanupWorkerClient();
        setState(createEmptyState(repInfo));
        return;
      }

      valuesRef.current = instanceValues || {};
      const mergedValues = {
        ...(baseValuesRef.current || {}),
        ...(valuesRef.current || {}),
      };

      if (engineModeRef.current === 'worker') {
        if (workerInitInFlightRef.current) {
          return;
        }
        cleanupWorkerClient();
        const initToken = workerInitTokenRef.current + 1;
        workerInitTokenRef.current = initToken;
        workerInitInFlightRef.current = true;
        workerReadyRef.current = false;
        console.info('[form0-react] repeatable worker init start', {
          token: initToken,
          repeatableKey: repInfo?.preferredKey || repInfo?.field?.data_name || repInfo?.id,
        });
        const client = createWorkerClient();
        if (client) {
          engineRef.current = client;
          client
            .init({
              schema,
              initialValues: mergedValues,
              helpers: engineOptionsRef.current.helpers,
              security: engineOptionsRef.current.security,
              updateVersion: valueUpdateVersionRef.current,
            })
            .then((result) => {
              workerInitInFlightRef.current = false;
              if (workerInitTokenRef.current !== initToken) {
                return;
              }
              workerReadyRef.current = true;
              if (result?.state) {
                syncWorkerState(result.state, result);
              }
              flushPendingWorkerUpdates();
            })
            .catch((error) => {
              workerInitInFlightRef.current = false;
              if (workerInitTokenRef.current !== initToken) {
                return;
              }
              console.warn('form0-react: repeatable engine worker initialization failed.', error);
            });
          return;
        }
        workerInitInFlightRef.current = false;
      }

      cleanupWorkerClient();
      const engine = buildEngine(valuesRef.current);
      engineRef.current = engine;
      syncState(engine);
    },
    [
      baseValues,
      buildEngine,
      cleanupWorkerClient,
      createWorkerClient,
      engineMode,
      flushPendingWorkerUpdates,
      repInfo,
      schema,
      syncState,
      syncWorkerState,
    ]
  );

  useEffect(() => {
    rebuildEngine(valuesRef.current);
  }, [rebuildEngine]);

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
          console.warn('form0-react: repeatable engine worker evaluation failed.', error);
        });
      return;
    }
    if (!engineRef.current) {
      return;
    }
    engineRef.current.eval();
    syncState(engineRef.current);
  }, [syncState, syncWorkerState]);

  const applyOptimisticValues = useCallback(
    (updates = {}) => {
      const filtered = filterUpdates(updates);
      if (!filtered || Object.keys(filtered).length === 0) {
        return;
      }
      optimisticValuesRef.current = {
        ...optimisticValuesRef.current,
        ...filtered,
      };
      setState((prev) => {
        if (!prev) {
          return prev;
        }
        let dirty = false;
        const nextValues = { ...(prev.values || {}) };
        for (const [field, value] of Object.entries(filtered)) {
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
    },
    [filterUpdates]
  );

  const setValues = useCallback(
    (updates = {}) => {
      const filtered = filterUpdates(updates);
      if (!filtered || Object.keys(filtered).length === 0) return;

      if (engineModeRef.current === 'worker') {
        if (!workerClientRef.current) {
          return;
        }
        const updateVersion = valueUpdateVersionRef.current + 1;
        valueUpdateVersionRef.current = updateVersion;
        Object.keys(filtered).forEach((field) => {
          fieldUpdateVersionRef.current.set(field, updateVersion);
        });
        applyOptimisticValues(filtered);
        if (!workerReadyRef.current) {
          pendingWorkerUpdatesRef.current.push({ updates: { ...filtered }, updateVersion });
          return;
        }
        sendWorkerValueUpdates(filtered, updateVersion);
        return;
      }

      if (!engineRef.current) return;
      const engineState = engineRef.current.getState();
      let dirty = false;
      for (const [field, value] of Object.entries(filtered)) {
        if (engineState.values[field] !== value) {
          engineState.values[field] = value;
          dirty = true;
        }
      }
      if (dirty) {
        evaluateAndSync();
      }
    },
    [applyOptimisticValues, evaluateAndSync, filterUpdates, sendWorkerValueUpdates]
  );

  const setValue = useCallback(
    (field, value) => {
      if (!field) return;
      setValues({ [field]: value });
    },
    [setValues]
  );

  const reset = useCallback(
    (nextValues = initialInstance.values || {}) => {
      const mergedValues = nextValues || {};
      if (engineModeRef.current === 'worker') {
        const updateVersion = valueUpdateVersionRef.current + 1;
        valueUpdateVersionRef.current = updateVersion;
        workerStateVersionRef.current = 0;
        fieldUpdateVersionRef.current = new Map();
        optimisticValuesRef.current = {};
        pendingWorkerUpdatesRef.current = [];
        const client = workerClientRef.current;
        const payload = {
          initialValues: {
            ...(baseValuesRef.current || {}),
            ...mergedValues,
          },
          updateVersion,
        };
        if (client && workerReadyRef.current) {
          client
            .reset(payload.initialValues, { updateVersion })
            .then((result) => {
              if (result?.state) {
                syncWorkerState(result.state, result);
              }
            })
            .catch((error) => {
              console.warn('form0-react: repeatable engine worker reset failed.', error);
            });
        } else {
          rebuildEngine(mergedValues);
        }
      } else {
        const engine = buildEngine(mergedValues);
        engineRef.current = engine;
        syncState(engine);
      }
      valuesRef.current = mergedValues;
      setRepeatableState(cloneDeep(initialInstance.repeatable || {}));
    },
    [
      buildEngine,
      initialInstance.repeatable,
      initialInstance.values,
      rebuildEngine,
      syncState,
      syncWorkerState,
    ]
  );

  const submit = useCallback(() => cloneDeep(state.values), [state.values]);

  const setRepeatableSlice = useCallback((updater) => {
    setRepeatableState((prev) => {
      const base = prev && typeof prev === 'object' ? prev : {};
      const draft = cloneDeep(base);
      updater(draft);
      return draft;
    });
  }, []);

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

  const addRepeatableInstance = useCallback(
    (repeatableKey, { parentPath = [], seedValues = {}, instanceId } = {}) => {
      const childRepInfo = repeatableMetadata.byPreferredKey.get(repeatableKey);
      if (!childRepInfo) {
        console.warn(`form0-react: unknown nested RepeatableSection "${repeatableKey}"`);
        return null;
      }
      const newInstance = createEmptyRepeatableInstance(childRepInfo);
      newInstance.id = instanceId || uuidv7();
      newInstance.values = { ...newInstance.values, ...(seedValues || {}) };
      setRepeatableSlice((draft) => {
        const container =
          resolveRepeatableContainer(draft, parentPath, { createIfMissing: true }) || draft;
        if (!Array.isArray(container[repeatableKey])) {
          container[repeatableKey] = [];
        }
        container[repeatableKey].push(newInstance);
      });
      return newInstance;
    },
    [repeatableMetadata, resolveRepeatableContainer, setRepeatableSlice]
  );

  const updateRepeatableInstance = useCallback(
    (repeatableKey, instanceId, updater, parentPath = []) => {
      setRepeatableSlice((draft) => {
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
    [resolveRepeatableContainer, setRepeatableSlice]
  );

  const removeRepeatableInstance = useCallback(
    (repeatableKey, instanceId, parentPath = []) => {
      setRepeatableSlice((draft) => {
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
    [resolveRepeatableContainer, setRepeatableSlice]
  );

  const setRepeatableInstances = useCallback(
    (repeatableKey, instances = [], parentPath = []) => {
      setRepeatableSlice((draft) => {
        const container =
          resolveRepeatableContainer(draft, parentPath, { createIfMissing: true }) || draft;
        container[repeatableKey] = Array.isArray(instances) ? cloneDeep(instances) : [];
      });
    },
    [resolveRepeatableContainer, setRepeatableSlice]
  );

  const getRepeatableInstances = useCallback(
    (repeatableKey, parentPath = []) => {
      const container = resolveRepeatableContainer(repeatableState, parentPath);
      const list = container?.[repeatableKey];
      return Array.isArray(list) ? list : [];
    },
    [resolveRepeatableContainer, repeatableState]
  );

  const getRepeatableInstance = useCallback(
    (repeatableKey, instanceId, parentPath = []) => {
      const list = getRepeatableInstances(repeatableKey, parentPath);
      return list.find((instance) => instance.id === instanceId) || null;
    },
    [getRepeatableInstances]
  );

  return {
    ...state,
    setValue,
    setValues,
    reset,
    submit,
    repeatable: repeatableState,
    addRepeatableInstance,
    updateRepeatableInstance,
    removeRepeatableInstance,
    setRepeatableInstances,
    getRepeatableInstances,
    getRepeatableInstance,
    repeatableMetadata,
  };
}
