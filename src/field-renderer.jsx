import React from 'react';

function formatDisplayValue(value, style) {
    if (value == null) return '';
    switch (style) {
      case 'currency': return `$${parseFloat(value).toFixed(2)}`;
      case 'date': return new Date(value).toLocaleDateString();
      case 'numeric': return Number(value);
      default: return String(value);
    }
}
  
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
                readOnly={readOnly}
                {...commonProps}
            />
        )}

        {field.type === 'NumericField' && (
            <input
                type="number"
                step={field.format === 'integer' ? '1' : 'any'} // ✅ block decimals at input level
                value={value === null || value === undefined ? '' : value}
                // onChange={(e) => {
                //     const raw = e.target.value;
                //     const val = raw === '' ? null : Number(raw);
                //     onChange(val);
                // }}
                onChange={(e) => {
                    const raw = e.target.value;
                    if (field.format === 'integer' && (raw.includes('.') || raw.includes(','))) return;
                    const val = raw === '' ? null : Number(raw);
                    onChange(val);
                }}
                onKeyDown={(e) => {
                    if (field.format === 'integer' && (e.key === '.' || e.key === ',')) {
                      e.preventDefault();
                    }
                }}
                readOnly={readOnly}
                {...commonProps}
            />
        )}

        {field.type === 'CalculatedField' && (
            <input
                type="text"
                value={formatDisplayValue(value, field.display?.style)}
                readOnly
                {...commonProps}
            />
        )}

        {/* Future support: ChoiceField, DateField, etc. */}

        <div style={{ color: 'red' }}>{error}</div>
    </div>
  );
}