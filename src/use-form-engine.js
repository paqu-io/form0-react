import { useRef, useState, useEffect } from 'react';
import { createFormEngine, validateSchema } from 'form0';
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

  useEffect(() => {
    const schemaCopy = JSON.parse(JSON.stringify(schema));
    ensureKeys(schemaCopy.form.elements);
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
    engineRef.current.getState().values[field] = value;
    engineRef.current.eval();
    setState(engineRef.current.getState());
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
  };
}