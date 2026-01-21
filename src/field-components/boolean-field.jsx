import React from 'react';
import * as styles from '../field-renderer.css.js';

function mapChoice(field, value) {
  const choice = field.choices?.find((c) => c.value === value);
  if (!choice) {
    return value ? { value } : null;
  }
  return {
    value: choice.value,
    ...(choice.label ? { label: choice.label } : {}),
  };
}

export function BooleanFieldComponent({
  field,
  value,
  onChange,
  onKeyDown,
  readOnly,
  inputProps = {},
}) {
  const inputOnFocus = inputProps.onFocus;
  const choices = Array.isArray(field.choices) ? field.choices : [];
  const selectedChoice = value?.choice?.[0]?.value ?? '';
  const required = inputProps.required && !readOnly;

  const emitChange = (choiceValue) => {
    if (typeof onChange !== 'function' || readOnly) return;
    const mappedChoice = mapChoice(field, choiceValue);
    onChange({
      choice: mappedChoice ? [mappedChoice] : [],
      other: [],
    });
  };

  const handleClick = (event, choiceValue) => {
    event.preventDefault();
    if (readOnly) return;
    emitChange(choiceValue);
  };

  return (
    <div
      className={styles.booleanSegmented}
      role="radiogroup"
      aria-labelledby={inputProps['aria-labelledby']}
    >
      {choices.map((choice, index) => {
        const isSelected = selectedChoice === choice.value;
        return (
          <button
            key={choice.value}
            type="button"
            onClick={(event) => handleClick(event, choice.value)}
            onKeyDown={onKeyDown}
            disabled={readOnly}
            aria-pressed={isSelected}
            aria-checked={isSelected}
            role="radio"
            tabIndex={isSelected || index === 0 ? 0 : -1}
            className={`${styles.booleanOption} ${
              isSelected ? styles.booleanOptionSelected : ''
            }`}
            {...(required && index === 0 ? { 'aria-required': true } : {})}
            onFocus={inputOnFocus}
          >
            {choice.label || choice.value}
          </button>
        );
      })}
    </div>
  );
}
