import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createFormEngine, validateSchema } from 'form0-core';
import { ensureKeys } from './utils/ensure-keys.js';

const createEmptyState = () => ({
  values: {},
  visible: {},
  required: {},
  read_only: {},
  errors: {},
});

const deepClone = (value) => {
  if (value == null) return value;
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
};

const ensureSchemaKeys = (elements = []) => {
  let needsKeys = false;
  const stack = [...elements];
  while (stack.length > 0) {
    const element = stack.pop();
    if (!element) continue;
    if (!element.key && element.data_name) {
      needsKeys = true;
    }
    if (element.elements && element.elements.length > 0) {
      stack.push(...element.elements);
    }
  }
  if (needsKeys) {
    ensureKeys(elements);
  }
};

export function useFormEngine(schema, initialValues = {}, overrideValues) {
  const [state, setState] = useState(createEmptyState);
  const engineRef = useRef(null);
  const initialValuesRef = useRef(initialValues || {});
  const initialValuesSignatureRef = useRef(null);

  const preparedSchema = useMemo(() => {
    if (!schema) return null;
    const copy = deepClone(schema);
    const form = copy?.form;
    if (!form || !Array.isArray(form.elements)) {
      throw new Error('form0-react: schema.form.elements must be defined');
    }
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
    return deepClone(values) || {};
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
