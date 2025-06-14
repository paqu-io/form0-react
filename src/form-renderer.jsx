import React from 'react';
import { useFormEngine } from './use-form-engine';
import { FieldRenderer } from './field-renderer';

export function FormRenderer({ schema, initialValues = {}, overrideValues, onSubmit, mode = 'edit', debug = false }) {
  const { values, visible, read_only, required, errors, setValue, submit } = useFormEngine(schema, initialValues, overrideValues);

  const elements = schema.form?.elements || [];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(submit());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {elements.map((field) => (
        visible[field.data_name] !== false && (
          <FieldRenderer
            key={field.key || field.data_name}
            field={field}
            value={values[field.data_name]}
            readOnly={read_only[field.data_name] || mode === 'readonly'}
            required={required[field.data_name]}
            error={errors[field.data_name]}
            onChange={(val) => setValue(field.data_name, val)}
          />
        )
      ))}
      {mode !== 'readonly' && (
        <button type="submit" className="bg-black text-white px-4 py-2 rounded">
          Submit
        </button>
      )}
      {debug && (
        <pre className="bg-gray-100 p-2 text-sm border mt-4 overflow-auto">
          {JSON.stringify({ values, visible, read_only, required, errors }, null, 2)}
        </pre>
      )}
    </form>
  );
}