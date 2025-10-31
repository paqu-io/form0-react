import React from 'react';
import * as styles from './field-renderer.css.js';
import { getFieldComponent } from './field-registry.js';

const LABEL_SIDE = 'side';

export function FieldRenderer({
  field,
  value,
  onChange,
  readOnly,
  required,
  error,
  labelPosition = 'top',
  labelWidthPercent = 30,
  onKeyDown,
}) {
  const FieldComponent = getFieldComponent(field.type);
  const elementKey = field.key || field.data_name;

  if (!FieldComponent) {
    return (
      <div
        className={`${styles.fieldWrapper} ${styles.labelTop}`}
        role="group"
        aria-labelledby={`${elementKey}-label`}
      >
        <label id={`${elementKey}-label`} className={styles.label}>
          {field.label}
        </label>
        <div className={styles.error}>Unsupported field type: {field.type}</div>
      </div>
    );
  }

  const wrapperClass =
    labelPosition === LABEL_SIDE ? styles.labelSide : styles.labelTop;
  const labelClass =
    labelPosition === LABEL_SIDE
      ? `${styles.label} ${styles.labelSideFixed}`
      : styles.label;
  const wrapperStyle =
    labelPosition === LABEL_SIDE
      ? { '--label-width': `${labelWidthPercent}%` }
      : undefined;

  const inputProps = {
    id: field.key,
    name: field.data_name,
    readOnly,
    required,
    disabled: readOnly,
  };

  const handleChange =
    onChange &&
    ((nextValue) => {
      onChange(nextValue);
    });

  const fieldInput = (
    <FieldComponent
      field={field}
      value={value}
      onChange={handleChange}
      onKeyDown={onKeyDown}
      readOnly={readOnly}
      inputProps={inputProps}
      className={styles.input}
    />
  );

  return (
    <div
      className={`${styles.fieldWrapper} ${wrapperClass}`}
      style={wrapperStyle}
    >
      {labelPosition === LABEL_SIDE ? (
        <div className={styles.labelInputRow}>
          <label htmlFor={field.key} className={labelClass}>
            {field.label} {required && '*'}
          </label>
          <div className={styles.inputWrapper}>{fieldInput}</div>
        </div>
      ) : (
        <>
          <label htmlFor={field.key} className={labelClass}>
            {field.label} {required && '*'}
          </label>
          {fieldInput}
        </>
      )}
      <div className={styles.error}>{error}</div>
    </div>
  );
}
