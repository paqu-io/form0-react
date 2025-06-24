import React from 'react';
import * as styles from './field-renderer.css.js';

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

export function FieldRenderer({ field, value, onChange, readOnly, required, error, labelPosition = 'top' }) {
  const commonProps = {
    id: field.key,
    name: field.data_name,
    disabled: readOnly,
    required,
  };

  return (
    <div
      className={`${styles.fieldWrapper} ${
        labelPosition === 'side' ? styles.labelSide : styles.labelTop
      }`}
    >
      {labelPosition === 'side' ? (
        <div className={styles.labelInputRow}>
          <label htmlFor={field.key} className={`${styles.label} ${styles.labelSideFixed}`}>
            {field.label} {required && '*'}
          </label>
          <div className={styles.inputWrapper}>
            {field.type === 'TextField' && (
              <input
                type="text"
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
                readOnly={readOnly}
                className={styles.input}
                {...commonProps}
              />
            )}
            {field.type === 'NumericField' && (
              <input
                type="number"
                step={field.format === 'integer' ? '1' : 'any'}
                value={value === null || value === undefined ? '' : value}
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
                className={styles.input}
                {...commonProps}
              />
            )}
            {field.type === 'CalculatedField' && (
              <input
                type="text"
                value={formatDisplayValue(value, field.display?.style)}
                readOnly
                className={styles.input}
                {...commonProps}
              />
            )}
          </div>
        </div>
      ) : (
        <>
          <label htmlFor={field.key} className={styles.label}>
            {field.label} {required && '*'}
          </label>
          {field.type === 'TextField' && (
            <input
              type="text"
              value={value ?? ''}
              onChange={(e) => onChange(e.target.value)}
              readOnly={readOnly}
              className={styles.input}
              {...commonProps}
            />
          )}
          {field.type === 'NumericField' && (
            <input
              type="number"
              step={field.format === 'integer' ? '1' : 'any'}
              value={value === null || value === undefined ? '' : value}
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
              className={styles.input}
              {...commonProps}
            />
          )}
          {field.type === 'CalculatedField' && (
            <input
              type="text"
              value={formatDisplayValue(value, field.display?.style)}
              readOnly
              className={styles.input}
              {...commonProps}
            />
          )}
        </>
      )}
      <div className={styles.error}>{error}</div>
    </div>
  );
}
