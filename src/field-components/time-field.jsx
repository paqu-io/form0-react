import React from 'react';
import * as styles from '../field-renderer.css.js';

const normalizeTimeValue = (raw) => {
  if (!raw || typeof raw !== 'string') return '';
  // Input accepts HH:MM or HH:MM:SS when step set; prefer HH:MM:SS if provided.
  const match = raw.match(/^\d{2}:\d{2}(?::\d{2})?$/);
  if (!match) return '';
  const time = match[0];
  if (time.length === 5) {
    return `${time}:00`;
  }
  return time;
};

export function TimeFieldComponent({ value, onChange, onKeyDown, readOnly, inputProps = {} }) {
  const normalizedValue = normalizeTimeValue(value);

  const handleChange = (event) => {
    if (typeof onChange !== 'function' || readOnly) return;
    const nextValue = event.target.value;
    if (nextValue === '') {
      onChange(null);
      return;
    }
    // Ensure seconds are always included for engine compatibility.
    const withSeconds = nextValue.length === 5 ? `${nextValue}:00` : nextValue;
    onChange(withSeconds);
  };

  return (
    <input
      type="time"
      step={1}
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
