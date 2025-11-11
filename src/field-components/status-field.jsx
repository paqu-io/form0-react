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
  const getChoice = (val) =>
    choices.find((choice) => choice.value === val) || null;
  const defaultChoice =
    field?.default_value !== undefined ? getChoice(field.default_value) : null;
  const selectedChoice =
    value !== undefined && value !== null ? getChoice(value) : null;
  const resolvedChoice = selectedChoice || defaultChoice;
  const resolvedLabel =
    resolvedChoice?.label ||
    resolvedChoice?.value ||
    value ||
    field?.default_value ||
    '';

  const handleChange = (event) => {
    if (typeof onChange !== 'function' || readOnly || field?.enabled === false) {
      return;
    }
    const nextValue = event.target.value;
    onChange(nextValue || null);
  };

  const isDisabled = readOnly || field?.enabled === false;
  const selectClassName = className
    ? `${className} ${styles.statusSelect}`
    : `${styles.input} ${styles.statusSelect}`;
  const selectValue =
    readOnly || isDisabled
      ? resolvedChoice?.value ?? ''
      : value ?? '';

  return (
    <select
      {...inputProps}
      value={selectValue}
      onChange={handleChange}
      onKeyDown={onKeyDown}
      disabled={isDisabled}
      className={selectClassName}
    >
      <option value="">Select status…</option>
      {choices.map((choice) => (
        <option key={choice.value} value={choice.value}>
          {choice.label || choice.value}
        </option>
      ))}
    </select>
  );
}
