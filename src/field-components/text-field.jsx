import React from 'react';

export function TextFieldComponent({ value, onChange, onKeyDown, inputProps, className }) {
  return (
    <input
      type="text"
      value={value ?? ''}
      onChange={
        onChange
          ? (event) => onChange(event.target.value)
          : undefined
      }
      onKeyDown={onKeyDown}
      className={className}
      {...inputProps}
    />
  );
}
