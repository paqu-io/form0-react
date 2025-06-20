import React, { useEffect, useState } from 'react';
import { useFormEngine } from './use-form-engine';
import { FieldRenderer } from './field-renderer';

export function FormRenderer({
  schema,
  initialValues = {},
  overrideValues,
  onSubmit,
  mode = 'edit',
  debug = false,
  onSchemaReady,
}) {
  const [activeSection, setActiveSection] = useState(null);
  const {
    values,
    visible,
    read_only,
    required,
    errors,
    setValue,
    submit,
    schema: finalSchema,
  } = useFormEngine(schema, initialValues, overrideValues);

  useEffect(() => {
    if (onSchemaReady) onSchemaReady(finalSchema);
  }, [finalSchema]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(submit());
    }
  };

  const renderElements = (elements) => {
    return elements.map((field) => {
      if (field.type === 'Section') {
        const display = field.display || 'inline';

        // 🔎 DRILLDOWN
        if (display === 'drilldown') {
          if (activeSection !== field.data_name) {
            return (
              <div
                key={field.key || field.data_name}
                className="p-4 rounded border border-gray-400 bg-gray-100 dark:bg-gray-800"
              >
                <div className="flex flex-row items-center justify-between gap-2 w-full">
                  <span className="text-lg font-semibold text-red-500 bg-yellow-100 whitespace-nowrap">
                    📛 {field.label}
                  </span>
                  <button
                    type="button"
                    className="inline-flex text-sm text-blue-600 underline bg-green-100"
                    onClick={() => setActiveSection(field.data_name)}
                  >
                    View &gt;
                  </button>
                </div>
              </div>
            );
          }

          // Section is active
          return (
            <div key={field.key || field.data_name} className="space-y-4">
              <button
                className="text-sm text-gray-500 underline mb-2"
                onClick={() => setActiveSection(null)}
              >
                &lt; Back
              </button>
              <h3 className="text-xl font-bold">{field.label}</h3>
              {renderElements(field.elements || [])}
            </div>
          );
        }

        // 🧱 INLINE
        return (
          <div
            key={field.key || field.data_name}
            className="p-4 rounded border border-gray-300 bg-gray-50 dark:bg-gray-700 space-y-4"
          >
            <h3 className="text-lg font-semibold">{field.label}</h3>
            {renderElements(field.elements || [])}
          </div>
        );
      }

      return (
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
      );
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* {renderElements(schema.form?.elements || [])} */}
      {renderElements(
        activeSection
          ? (schema.form?.elements || []).filter((e) => e.data_name === activeSection)
          : schema.form?.elements || []
      )}
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
