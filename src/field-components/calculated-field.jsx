import React from 'react';

function formatDisplayValue(value, style) {
  if (value == null) return '';
  switch (style) {
    case 'currency':
      return `$${parseFloat(value).toFixed(2)}`;
    case 'date':
      return new Date(value).toLocaleDateString();
    case 'numeric':
      return Number(value);
    default:
      return String(value);
  }
}

export function CalculatedFieldComponent({ field, value, onKeyDown, inputProps, className }) {
  const mergedInputProps = {
    ...inputProps,
    readOnly: true,
  };

  return (
    <input
      type="text"
      value={formatDisplayValue(value, field.display?.style)}
      onKeyDown={onKeyDown}
      className={className}
      {...mergedInputProps}
    />
  );
}
