import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createFormEngine, validateSchema } from 'form0-core';
import { cloneDeep, prepareSchema, ensureSchemaKeys } from './utils/schema.js';
import {
  buildRepeatableInfo,
  createEmptyRepeatableInstance,
} from './utils/repeatable-manager.js';

const createEmptyState = () => ({
  values: {},
  visible: {},
  required: {},
  read_only: {},
  errors: {},
});

export function useFormEngine(schema, initialValues = {}, overrideValues, options = {}) {
  const [state, setState] = useState(createEmptyState);
  const [engineVersion, setEngineVersion] = useState(0);
  const engineRef = useRef(null);
  const initialValuesRef = useRef(initialValues || {});
  const initialValuesSignatureRef = useRef(null);
  const optionsRef = useRef(options || {});
  const warningCleanupRef = useRef(null);
  const fieldDefinitionsRef = useRef(new Map());
  const repeatableStateRef = useRef({});
  const [repeatableState, setRepeatableStateInternal] = useState({});

  useEffect(() => {
    optionsRef.current = options || {};
  }, [options]);

  const preparedSchema = useMemo(() => {
    if (!schema) return null;
    const copy = prepareSchema(schema);
    const form = copy?.form;
    if (!form || !Array.isArray(form.elements)) {
      throw new Error('form0-react: schema.form.elements must be defined');
    }
    // ensureSchemaKeys is invoked within prepareSchema, but call defensively
    ensureSchemaKeys(form.elements);
    validateSchema(form);
    return copy;
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

  const syncState = useCallback(() => {
    if (!engineRef.current) {
      setState(createEmptyState());
      return;
    }
    const engineState = engineRef.current.getState();
    setState({
      values: { ...engineState.values },
      visible: { ...engineState.visible },
      required: { ...engineState.required },
      read_only: { ...engineState.read_only },
      errors: { ...engineState.errors },
    });
  }, []);

  const rebuildEngine = useCallback(
    (seedValues = initialValuesRef.current) => {
      if (!preparedSchema) {
        engineRef.current = null;
        setState(createEmptyState());
        return;
      }
      const engine = createFormEngine({
        schema: preparedSchema,
        initialValues: { ...(seedValues || {}) },
      });
      engineRef.current = engine;
      engine.eval();
      syncState();
      setEngineVersion((version) => version + 1);
    },
    [preparedSchema, syncState]
  );

  const evaluateAndSync = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.eval();
    syncState();
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
      if (!engineRef.current) return [];
      if (typeof eventType !== 'string' || eventType.length === 0) {
        console.warn('form0-react: triggerEvent requires a non-empty eventType string.');
        return [];
      }

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

  useEffect(() => {
    if (!preparedSchema) {
      engineRef.current = null;
      setState(createEmptyState());
      return;
    }
    rebuildEngine(initialValuesRef.current);
    initialValuesSignatureRef.current = initialValuesSignature;
    return () => {
      engineRef.current = null;
    };
  }, [preparedSchema, rebuildEngine, initialValuesSignature]);

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
    const warningSystem = engineRef.current?.getWarningSystem?.();
    const warningHandler = optionsRef.current.onWarning;

    if (warningCleanupRef.current) {
      warningCleanupRef.current();
      warningCleanupRef.current = null;
    }

    if (!warningSystem || typeof warningHandler !== 'function') {
      return;
    }

    const proxy = (warning) => {
      const latest = optionsRef.current.onWarning;
      if (typeof latest === 'function') {
        latest(warning);
      }
    };

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
  }, [engineVersion, options.onWarning]);

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
    repeatable: repeatableState,
    setRepeatableState: updateRepeatableState,
    addRepeatableInstance,
    updateRepeatableInstance,
    removeRepeatableInstance,
    setRepeatableInstances,
    getRepeatableInstances,
    getRepeatableInstance,
    repeatableMetadata,
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
