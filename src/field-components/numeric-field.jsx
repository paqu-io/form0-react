import React from 'react';

export function NumericFieldComponent({ field, value, onChange, onKeyDown, inputProps, className }) {
  const handleChange =
    onChange &&
    ((event) => {
      const raw = event.target.value;
      if (field.format === 'integer' && (raw.includes('.') || raw.includes(','))) {
        return;
      }
      const nextValue = raw === '' ? null : Number(raw);
      onChange(nextValue);
    });

  const handleKeyDown = (event) => {
    if (field.format === 'integer' && (event.key === '.' || event.key === ',')) {
      event.preventDefault();
      return;
    }
    if (onKeyDown) {
      onKeyDown(event);
    }
  };

  return (
    <input
      type="number"
      step={field.format === 'integer' ? '1' : 'any'}
      value={value === null || value === undefined ? '' : value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      className={className}
      {...inputProps}
    />
  );
}
