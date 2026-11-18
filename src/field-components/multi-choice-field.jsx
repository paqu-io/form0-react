import { useBuildingPlanPresentation } from '../building-plan/presentation.jsx';
import React, { useEffect, useRef } from 'react';
import * as styles from '../field-renderer.css.js';
import { stack } from '../choice-dropdown.css.js';
import { ChoiceDropdown, OTHER_VALUE } from './choice-dropdown.jsx';

const OTHER_OPTION_VALUE = OTHER_VALUE;

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
  const presentation = useBuildingPlanPresentation();
  const inputOnFocus = inputProps.onFocus;
  const choices = Array.isArray(field.choices) ? field.choices : [];
  const selectedValues = new Set(
    Array.isArray(value?.choices) ? value.choices.map((c) => c.value).filter(Boolean) : []
  );
  const otherEntries = Array.isArray(value?.other) ? value.other : [];
  const hasOtherSelection = field.allow_other && otherEntries.length > 0;
  const otherValue = hasOtherSelection ? (otherEntries[0]?.label ?? '') : '';
  const required = inputProps.required && !readOnly;

  const emitChange = (nextChoices, otherLabel, forceOther = false) => {
    if (typeof onChange !== 'function' || readOnly) return;
    const normalizedChoices = mapChoices(field, nextChoices);
    const shouldIncludeOther =
      field.allow_other && (forceOther || (otherLabel && otherLabel.length > 0));
    const normalizedOther = shouldIncludeOther ? [{ label: otherLabel ?? '' }] : [];
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

  // The dropdown toggles one option at a time; "Other" keeps its text while it stays chosen.
  // Toggles start from the selection just sent until the engine's value comes back, so quick
  // clicks on a slow engine (a worker, a large form) do not undo each other.
  const pending = useRef(null);
  useEffect(() => {
    pending.current = null;
  }, [value]);
  const handleToggle = (choiceValue) => {
    const current = pending.current || {
      choices: new Set(selectedValues),
      other: hasOtherSelection,
    };
    const next = { choices: new Set(current.choices), other: current.other };
    if (choiceValue === OTHER_OPTION_VALUE) next.other = !current.other;
    else if (next.choices.has(choiceValue)) next.choices.delete(choiceValue);
    else next.choices.add(choiceValue);
    pending.current = next;
    emitChange(next.choices, next.other ? otherValue : '', next.other);
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
            <label htmlFor={`${inputProps.id || field.data_name}_other`}>
              {presentation.t('Other')}
            </label>
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
  const otherLabel = field.allow_other ? presentation.t('Other') : null;

  // Every dropdown, searchable or not, uses ChoiceDropdown (review of 2026-11-18).
  return (
    <div className={stack}>
      <ChoiceDropdown
        id={inputProps.id}
        labelledBy={inputProps['aria-labelledby']}
        options={choices.map((choice) => ({
          value: choice.value,
          label: choice.label || choice.value,
        }))}
        otherOption={otherLabel ? { value: OTHER_OPTION_VALUE, label: otherLabel } : null}
        selected={selectValues}
        multiple
        searchable={field.is_searchable === true && field.is_searchable_mode === 'default'}
        placeholder="Select options..."
        disabled={readOnly}
        required={required}
        invalid={inputProps['aria-invalid'] === true}
        onPick={handleToggle}
        onClear={() => emitChange(new Set(), '', false)}
        onFocus={inputOnFocus}
        onKeyDown={onKeyDown}
      />
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
          aria-label={`${field.label || field.data_name}: ${otherLabel}`}
          onFocus={inputOnFocus}
        />
      )}
    </div>
  );
}
