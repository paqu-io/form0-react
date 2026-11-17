import React, { useEffect, useRef } from 'react';
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
  // The browser's date input is left uncontrolled while typing: it reports intermediate years
  // (0002, 0020, ...) and an empty value while a segment is incomplete, and writing the last
  // known value back between keystrokes made typed digits disappear. External changes still
  // replace what is shown; echoes of what was just typed do not.
  const inputRef = useRef(null);
  const sentValues = useRef([]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const echo = sentValues.current.lastIndexOf(normalizedValue);
    if (echo >= 0) {
      sentValues.current.splice(0, echo + 1);
      return;
    }
    sentValues.current = [];
    if (input.value !== normalizedValue) input.value = normalizedValue;
  }, [normalizedValue]);

  const handleChange = (event) => {
    if (typeof onChange !== 'function' || readOnly) return;
    const input = event.target;
    // An incomplete date reads as empty with badInput set: keep typing, send nothing yet.
    if (input.value === '' && input.validity?.badInput) return;
    sentValues.current.push(input.value);
    onChange(input.value === '' ? null : input.value);
  };

  return (
    <input
      ref={inputRef}
      type="date"
      defaultValue={normalizedValue}
      onChange={handleChange}
      onKeyDown={onKeyDown}
      readOnly={readOnly}
      disabled={readOnly}
      className={styles.input}
      {...inputProps}
    />
  );
}
