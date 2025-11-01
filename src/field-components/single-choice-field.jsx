import React from 'react';
import * as styles from '../field-renderer.css.js';

const OTHER_OPTION_VALUE = '__other__';

function mapChoice(field, value) {
  const choice = field.choices?.find((c) => c.value === value);
  if (choice) {
    return {
      value: choice.value,
      ...(choice.label ? { label: choice.label } : {}),
    };
  }
  return value ? { value } : null;
}

export function SingleChoiceFieldComponent({
  field,
  value,
  onChange,
  onKeyDown,
  readOnly,
  inputProps = {},
}) {
  const choices = Array.isArray(field.choices) ? field.choices : [];
  const selectedChoice = value?.choice?.[0]?.value ?? '';
  const otherEntries = Array.isArray(value?.other) ? value.other : [];
  const hasOtherSelection = field.allow_other && otherEntries.length > 0;
  const otherValue = hasOtherSelection ? otherEntries[0]?.label ?? '' : '';
  const selectValue = field.allow_other && hasOtherSelection ? OTHER_OPTION_VALUE : selectedChoice;
  const required = inputProps.required && !readOnly;

  const emitChange = (choiceValue, otherLabel) => {
    if (typeof onChange !== 'function' || readOnly) {
      return;
    }

    if (field.allow_other && choiceValue === OTHER_OPTION_VALUE) {
      const normalizedOther = [{ label: otherLabel ?? '' }];
      onChange({
        choice: [],
        other: normalizedOther,
      });
      return;
    }

    const mappedChoice = mapChoice(field, choiceValue);
    onChange({
      choice: mappedChoice ? [mappedChoice] : [],
      other: [],
    });
  };

  const handleSelectChange = (event) => {
    const nextValue = event.target.value;
    if (!nextValue) {
      emitChange('', '');
      return;
    }
    emitChange(nextValue, otherValue || '');
  };

  const handleOtherChange = (event) => {
    const nextText = event.target.value;
    if (typeof onChange !== 'function' || readOnly) return;
    onChange({
      choice: [],
      other: nextText ? [{ label: nextText }] : [],
    });
  };

  const handleRadioChange = (event) => {
    const nextValue = event.target.value;
    if (!nextValue) {
      emitChange('', '');
      return;
    }
    emitChange(nextValue, otherValue || '');
  };

  if (field.display === 'radio') {
    const radioName = inputProps.name || `${field.data_name}_choice`;
    const isOtherSelected = hasOtherSelection;

    return (
      <div className={styles.choiceGroup} role="radiogroup" aria-labelledby={inputProps.id}>
        {choices.map((choice) => {
          const radioId = `${inputProps.id || field.data_name}_${choice.value}`;
          return (
            <label key={choice.value} className={styles.choiceOption} htmlFor={radioId}>
              <input
                type="radio"
                id={radioId}
                name={radioName}
                value={choice.value}
                checked={!isOtherSelected && selectedChoice === choice.value}
                onChange={handleRadioChange}
                onKeyDown={onKeyDown}
                disabled={readOnly}
                required={required}
              />
              <span>{choice.label || choice.value}</span>
            </label>
          );
        })}

        {field.allow_other && (
          <div className={styles.choiceOption}>
            <input
              type="radio"
              id={`${inputProps.id || field.data_name}_other`}
              name={radioName}
              value={OTHER_OPTION_VALUE}
              checked={isOtherSelected}
              onChange={handleRadioChange}
              onKeyDown={onKeyDown}
              disabled={readOnly}
              required={required && !selectedChoice}
            />
            <label htmlFor={`${inputProps.id || field.data_name}_other`}>Other</label>
            <input
              type="text"
              value={otherValue || ''}
              onChange={handleOtherChange}
              onKeyDown={onKeyDown}
              readOnly={readOnly}
              className={`${styles.input} ${styles.choiceOtherInput}`}
              placeholder="Please specify..."
              disabled={readOnly}
            />
          </div>
        )}
      </div>
    );
  }

  const showOtherInput = field.allow_other && selectValue === OTHER_OPTION_VALUE;

  return (
    <div>
      <select
        {...inputProps}
        id={inputProps.id}
        name={inputProps.name || `${field.data_name}_choice`}
        value={selectValue}
        onChange={handleSelectChange}
        onKeyDown={onKeyDown}
        disabled={readOnly}
        required={required}
        className={styles.input}
      >
        <option value="">Select an option...</option>
        {choices.map((choice) => (
          <option key={choice.value} value={choice.value}>
            {choice.label || choice.value}
          </option>
        ))}
        {field.allow_other && <option value={OTHER_OPTION_VALUE}>Other</option>}
      </select>
      {field.allow_other && showOtherInput && (
        <input
          type="text"
          value={otherValue}
          onChange={handleOtherChange}
          onKeyDown={onKeyDown}
          readOnly={readOnly}
          className={`${styles.input} ${styles.choiceOtherInput}`}
          placeholder="Please specify..."
          disabled={readOnly}
        />
      )}
    </div>
  );
}
