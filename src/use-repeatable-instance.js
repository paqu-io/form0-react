import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createFormEngine } from 'form0-core';
import { cloneDeep } from './utils/schema.js';
import {
  buildRepeatableInfo,
  createEmptyRepeatableInstance,
} from './utils/repeatable-manager.js';
import { uuidv7 } from './utils/uuid.js';

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
  const [state, setState] = useState(() => createEmptyState(repInfo));
  const [repeatableState, setRepeatableState] = useState(
    () => cloneDeep(initialInstance.repeatable || {})
  );
  const engineRef = useRef(null);
  const baseValuesRef = useRef(baseValues || {});
  const valuesRef = useRef(initialInstance.values || {});

  useEffect(() => {
    baseValuesRef.current = baseValues || {};
  }, [baseValues]);

  const fieldNames = useMemo(() => {
    if (!repInfo?.fields) return [];
    return Array.from(repInfo.fields.keys());
  }, [repInfo]);

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
      const engineState = engine.getState();
      const pick = (map) => {
        const slice = {};
        fieldNames.forEach((name) => {
          if (Object.prototype.hasOwnProperty.call(map, name)) {
            slice[name] = map[name];
          }
        });
        return slice;
      };
      setState({
        values: pick(engineState.values),
        errors: pick(engineState.errors),
        visible: pick(engineState.visible),
        required: pick(engineState.required),
        read_only: pick(engineState.read_only),
      });
      valuesRef.current = pick(engineState.values);
    },
    [repInfo, fieldNames]
  );

  useEffect(() => {
    if (!schema || !repInfo) {
      setState(createEmptyState(repInfo));
      return;
    }
    const engine = buildEngine(valuesRef.current);
    engineRef.current = engine;
    syncState(engine);
  }, [schema, repInfo, buildEngine, syncState]);

  const evaluateAndSync = useCallback(() => {
    if (!engineRef.current) {
      return;
    }
    engineRef.current.eval();
    syncState(engineRef.current);
  }, [syncState]);

  const setValues = useCallback(
    (updates = {}) => {
      if (!engineRef.current || !updates) return;
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
    [evaluateAndSync]
  );

  const setValue = useCallback(
    (field, value) => {
      if (!engineRef.current) return;
      const engineState = engineRef.current.getState();
      if (engineState.values[field] === value) return;
      engineState.values[field] = value;
      evaluateAndSync();
    },
    [evaluateAndSync]
  );

  const reset = useCallback(
    (nextValues = initialInstance.values || {}) => {
      const engine = buildEngine(nextValues);
      engineRef.current = engine;
      syncState(engine);
      setRepeatableState(cloneDeep(initialInstance.repeatable || {}));
    },
    [buildEngine, syncState, initialInstance.repeatable, initialInstance.values]
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
