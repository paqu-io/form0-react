import React from 'react';
import * as styles from '../field-renderer.css.js';

const normalizeDateValue = (raw) => {
  if (!raw || typeof raw !== 'string') return '';
  // Accept ISO strings with time component by trimming to date portion.
  if (raw.includes('T')) {
    return raw.split('T')[0];
  }
  return raw;
};

export function DateFieldComponent({ value, onChange, onKeyDown, readOnly, inputProps = {} }) {
  const normalizedValue = normalizeDateValue(value);

  const handleChange = (event) => {
    if (typeof onChange !== 'function' || readOnly) return;
    const nextValue = event.target.value;
    onChange(nextValue === '' ? null : nextValue);
  };

  return (
    <input
      type="date"
      value={normalizedValue}
      onChange={handleChange}
      onKeyDown={onKeyDown}
      readOnly={readOnly}
      disabled={readOnly}
      className={styles.input}
      {...inputProps}
    />
  );
}
