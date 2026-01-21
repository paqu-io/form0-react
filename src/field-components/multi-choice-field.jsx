import React from 'react';
import * as styles from '../field-renderer.css.js';

const OTHER_OPTION_VALUE = '__other__';

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

function mapChoices(field, values) {
  return Array.from(values)
    .map((choiceValue) => mapChoice(field, choiceValue))
    .filter(Boolean);
}

export function MultiChoiceFieldComponent({
  field,
  value,
  onChange,
  onKeyDown,
  readOnly,
  inputProps = {},
}) {
  const inputOnFocus = inputProps.onFocus;
  const choices = Array.isArray(field.choices) ? field.choices : [];
  const selectedValues = new Set(
    Array.isArray(value?.choices) ? value.choices.map((c) => c.value).filter(Boolean) : []
  );
  const otherEntries = Array.isArray(value?.other) ? value.other : [];
  const hasOtherSelection = field.allow_other && otherEntries.length > 0;
  const otherValue = hasOtherSelection ? otherEntries[0]?.label ?? '' : '';
  const required = inputProps.required && !readOnly;

  const emitChange = (nextChoices, otherLabel, forceOther = false) => {
    if (typeof onChange !== 'function' || readOnly) return;
    const normalizedChoices = mapChoices(field, nextChoices);
    const shouldIncludeOther =
      field.allow_other && (forceOther || (otherLabel && otherLabel.length > 0));
    const normalizedOther = shouldIncludeOther
      ? [{ label: otherLabel ?? '' }]
      : [];
    onChange({
      choices: normalizedChoices,
      other: normalizedOther,
    });
  };

  const handleCheckboxChange = (event, choiceValue) => {
    const nextChoices = new Set(selectedValues);
    if (event.target.checked) {
      nextChoices.add(choiceValue);
    } else {
      nextChoices.delete(choiceValue);
    }
    emitChange(nextChoices, otherValue, hasOtherSelection);
  };

  const handleOtherCheckboxChange = (event) => {
    const nextChoices = new Set(selectedValues);
    emitChange(nextChoices, event.target.checked ? otherValue : '', event.target.checked);
  };

  const handleOtherInputChange = (event) => {
    emitChange(new Set(selectedValues), event.target.value, true);
  };

  const handleSelectChange = (event) => {
    const selectedOptions = Array.from(event.target.selectedOptions).map((option) => option.value);
    const choiceValues = selectedOptions.filter((val) => val !== OTHER_OPTION_VALUE);
    const nextChoices = new Set(choiceValues);
    const includesOther = field.allow_other && selectedOptions.includes(OTHER_OPTION_VALUE);
    const nextOther = includesOther ? otherValue : '';
    emitChange(nextChoices, nextOther, includesOther);
  };

  if (field.display === 'checkbox') {
    const otherChecked = hasOtherSelection;

    return (
      <div
        className={styles.multiChoiceGroup}
        role="group"
        aria-labelledby={inputProps['aria-labelledby']}
      >
        {choices.map((choice) => {
          const checkboxId = `${inputProps.id || field.data_name}_${choice.value}`;
          const isChecked = selectedValues.has(choice.value);
          return (
            <label key={choice.value} className={styles.multiChoiceOption} htmlFor={checkboxId}>
              <input
                type="checkbox"
                id={checkboxId}
                name={field.data_name}
                value={choice.value}
                checked={isChecked}
                onChange={(event) => handleCheckboxChange(event, choice.value)}
                onKeyDown={onKeyDown}
                disabled={readOnly}
                onFocus={inputOnFocus}
              />
              <span>{choice.label || choice.value}</span>
            </label>
          );
        })}

        {field.allow_other && (
          <div className={styles.multiChoiceOption}>
            <input
              type="checkbox"
              id={`${inputProps.id || field.data_name}_other`}
              name={`${field.data_name}_other`}
              value={OTHER_OPTION_VALUE}
              checked={otherChecked}
              onChange={handleOtherCheckboxChange}
              onKeyDown={onKeyDown}
              disabled={readOnly}
              onFocus={inputOnFocus}
            />
            <label htmlFor={`${inputProps.id || field.data_name}_other`}>Other</label>
          </div>
        )}

        {field.allow_other && (
          <input
            type="text"
            value={otherValue}
            onChange={handleOtherInputChange}
            onKeyDown={onKeyDown}
            readOnly={readOnly}
            disabled={readOnly}
            className={`${styles.input} ${styles.multiChoiceOtherInput}`}
            placeholder="Please specify..."
            aria-hidden={!otherChecked}
            style={{ display: otherChecked ? 'block' : 'none' }}
            onFocus={inputOnFocus}
          />
        )}
      </div>
    );
  }

  const selectValues = Array.from(selectedValues);
  if (field.allow_other && (otherValue.length > 0 || hasOtherSelection)) {
    selectValues.push(OTHER_OPTION_VALUE);
  }

  const showOtherInput =
    field.allow_other && (selectValues.includes(OTHER_OPTION_VALUE) || otherValue.length > 0);

  return (
    <div>
      <select
        {...inputProps}
        id={inputProps.id}
        name={inputProps.name || `${field.data_name}_choices`}
        multiple
        value={selectValues}
        onChange={handleSelectChange}
        onKeyDown={onKeyDown}
        disabled={readOnly}
        required={required && selectValues.length === 0}
        className={styles.input}
        onFocus={inputOnFocus}
      >
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
          onChange={handleOtherInputChange}
          onKeyDown={onKeyDown}
          readOnly={readOnly}
          disabled={readOnly}
          className={`${styles.input} ${styles.multiChoiceOtherInput}`}
          placeholder="Please specify..."
          onFocus={inputOnFocus}
        />
      )}
    </div>
  );
}
