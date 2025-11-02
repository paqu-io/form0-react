import React from 'react';
import * as styles from '../field-renderer.css.js';

export function StatusFieldComponent({
  field,
  value,
  onChange,
  onKeyDown,
  readOnly,
  inputProps = {},
  className,
}) {
  const choices = Array.isArray(field.choices) ? field.choices : [];
  const selectedChoice =
    choices.find((choice) => choice.value === value) || null;
  const fallbackColor = '#9ca3af';
  const pillColor = selectedChoice?.color || fallbackColor;

  const handleChange = (event) => {
    if (typeof onChange !== 'function' || readOnly) return;
    const nextValue = event.target.value;
    onChange(nextValue || null);
  };

  if (readOnly) {
    return (
      <div className={styles.statusReadOnly}>
        <span
          className={styles.statusPill}
          style={{ '--status-color': pillColor }}
          aria-hidden="true"
        />
        <span className={styles.statusText}>
          {selectedChoice?.label || selectedChoice?.value || value || '—'}
        </span>
      </div>
    );
  }

  const selectClassName = className
    ? `${className} ${styles.statusSelect}`
    : `${styles.input} ${styles.statusSelect}`;

  return (
    <div className={styles.statusField}>
      <span
        className={styles.statusPill}
        style={{ '--status-color': pillColor }}
        aria-hidden="true"
      />
      <select
        {...inputProps}
        value={value ?? ''}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        disabled={readOnly}
        className={selectClassName}
      >
        <option value="">Select status…</option>
        {choices.map((choice) => (
          <option key={choice.value} value={choice.value}>
            {choice.label || choice.value}
          </option>
        ))}
      </select>
    </div>
  );
}
