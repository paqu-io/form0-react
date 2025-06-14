import React from 'react';

export function FieldRenderer({ field, value, onChange, readOnly, required, error }) {
  const commonProps = {
    id: field.key,
    name: field.data_name,
    disabled: readOnly,
    required,
    className: 'border rounded px-2 py-1 w-full'
  };

  return (
    <div>
        <label htmlFor={field.key} className="block font-medium mb-1">
            {field.label} {required && '*'}
        </label>

        {field.type === 'TextField' && (
            <input
                type="text"
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
                {...commonProps}
            />
        )}

        {field.type === 'NumericField' && (
            <input
                type="number"
                value={value === null || value === undefined ? '' : value}
                onChange={(e) => {
                const raw = e.target.value;
                const val = raw === '' ? null : Number(raw);
                onChange(val);
                }}
                {...commonProps}
            />
        )}

        {/* Future support: ChoiceField, DateField, etc. */}

        {error && <div className="text-red-600 text-sm mt-1">{error}</div>}
    </div>
  );
}