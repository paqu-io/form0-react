import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createFormEngine, validateSchema } from 'form0-core';
import { cloneDeep, prepareSchema, ensureSchemaKeys } from './utils/schema.js';

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

  useEffect(() => {
    initialValuesRef.current = initialValues || {};
  }, [initialValues]);

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
    schema: preparedSchema,
    engine: engineRef.current,
  };
}
