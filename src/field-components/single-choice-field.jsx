import { useBuildingPlanPresentation } from '../building-plan/presentation.jsx';
import React, { useEffect, useRef } from 'react';
import * as styles from '../field-renderer.css.js';
import { stack } from '../choice-dropdown.css.js';
import { ChoiceDropdown, OTHER_VALUE } from './choice-dropdown.jsx';

const OTHER_OPTION_VALUE = OTHER_VALUE;

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
  const presentation = useBuildingPlanPresentation();
  const inputOnFocus = inputProps.onFocus;
  const choices = Array.isArray(field.choices) ? field.choices : [];
  const selectedChoice = value?.choice?.[0]?.value ?? '';
  const otherEntries = Array.isArray(value?.other) ? value.other : [];
  const hasOtherSelection = field.allow_other && otherEntries.length > 0;
  const otherValue = hasOtherSelection ? (otherEntries[0]?.label ?? '') : '';
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
      other: [{ label: nextText }],
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
      <div
        className={styles.choiceGroup}
        role="radiogroup"
        aria-labelledby={inputProps['aria-labelledby']}
      >
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
                onFocus={inputOnFocus}
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
              onFocus={inputOnFocus}
            />
            <label htmlFor={`${inputProps.id || field.data_name}_other`}>
              {presentation.t('Other')}
            </label>
            <input
              type="text"
              value={otherValue || ''}
              onChange={handleOtherChange}
              onKeyDown={onKeyDown}
              readOnly={readOnly}
              className={`${styles.input} ${styles.choiceOtherInput}`}
              placeholder="Please specify..."
              disabled={readOnly}
              onFocus={inputOnFocus}
            />
          </div>
        )}
      </div>
    );
  }

  const showOtherInput = field.allow_other && selectValue === OTHER_OPTION_VALUE;
  const options = choices.map((choice) => ({
    value: choice.value,
    label: choice.label || choice.value,
  }));

  return (
    <SingleChoiceDropdown
      field={field}
      inputProps={inputProps}
      options={options}
      otherLabel={field.allow_other ? presentation.t('Other') : null}
      selectValue={selectValue}
      showOtherInput={showOtherInput}
      otherValue={otherValue}
      readOnly={readOnly}
      required={required}
      onPick={(next) => emitChange(next, next === OTHER_OPTION_VALUE ? otherValue || '' : '')}
      onClear={() => emitChange('', '')}
      onOtherChange={handleOtherChange}
      onKeyDown={onKeyDown}
    />
  );
}

// Every dropdown, searchable or not, uses ChoiceDropdown (review of 2026-11-18). "Other" opens
// the text input under the field and moves the focus into it.
function SingleChoiceDropdown({
  field,
  inputProps,
  options,
  otherLabel,
  selectValue,
  showOtherInput,
  otherValue,
  readOnly,
  required,
  onPick,
  onClear,
  onOtherChange,
  onKeyDown,
}) {
  const otherInputRef = useRef(null);
  const focusOther = useRef(false);
  useEffect(() => {
    if (showOtherInput && focusOther.current) otherInputRef.current?.focus();
    focusOther.current = false;
  }, [showOtherInput]);
  const searchable = field.is_searchable === true && field.is_searchable_mode === 'default';

  return (
    <div className={stack}>
      <ChoiceDropdown
        id={inputProps.id}
        labelledBy={inputProps['aria-labelledby']}
        options={options}
        otherOption={otherLabel ? { value: OTHER_OPTION_VALUE, label: otherLabel } : null}
        selected={selectValue ? [selectValue] : []}
        searchable={searchable}
        placeholder="Select an option..."
        disabled={readOnly}
        required={required}
        invalid={inputProps['aria-invalid'] === true}
        onPick={(next) => {
          if (next === OTHER_OPTION_VALUE) focusOther.current = true;
          onPick(next);
        }}
        onClear={onClear}
        onFocus={inputProps.onFocus}
        onKeyDown={onKeyDown}
      />
      {showOtherInput && (
        <input
          ref={otherInputRef}
          type="text"
          value={otherValue}
          onChange={onOtherChange}
          onKeyDown={onKeyDown}
          readOnly={readOnly}
          className={`${styles.input} ${styles.choiceOtherInput}`}
          placeholder="Please specify..."
          aria-label={`${field.label || field.data_name}: ${otherLabel}`}
          disabled={readOnly}
          onFocus={inputProps.onFocus}
        />
      )}
    </div>
  );
}
