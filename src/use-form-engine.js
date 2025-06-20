import { useRef, useState, useEffect } from 'react';
import { createFormEngine, validateSchema } from 'form0-core';
import { ensureKeys } from './utils/ensure-keys';

export function useFormEngine(schema, initialValues = {}, overrideValues) {
  const [state, setState] = useState({
    values: {},
    visible: {},
    required: {},
    read_only: {},
    errors: {},
  });

  const engineRef = useRef(null);
  const schemaCopy = JSON.parse(JSON.stringify(schema));

  useEffect(() => {
    // Only add keys if missing (to avoid overwriting consistent ones)
    let needsKeys = false;
    const checkForMissingKeys = (elements) => {
      for (const el of elements) {
        if (!el.key && el.data_name) {
          needsKeys = true;
          return;
        }
        if (el.type === 'Section') {
          checkForMissingKeys(el.elements || []);
        }
      }
    };
    checkForMissingKeys(schemaCopy.form.elements);
    if (needsKeys) {
      ensureKeys(schemaCopy.form.elements);
    }

    validateSchema(schemaCopy.form);

    engineRef.current = createFormEngine({
      schema: schemaCopy,
      initialValues: { ...initialValues },
    });
    engineRef.current.eval();
    setState(engineRef.current.getState());
  }, [schema]);

  const setValue = (field, value) => {
    if (!engineRef.current) return;
    const state = engineRef.current.getState();
    state.values[field] = value;
    engineRef.current.eval();
    setState(engineRef.current.getState()); // ✅ Re-eval to apply rules
  };

  if (overrideValues && engineRef.current) {
    Object.assign(engineRef.current.getState().values, overrideValues);
    engineRef.current.eval();
    setState(engineRef.current.getState());
  }

  return {
    ...state,
    setValue,
    submit: () => engineRef.current?.getState().values || {},
    schema: schemaCopy,
  };
}
