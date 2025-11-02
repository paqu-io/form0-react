import React, { useEffect, useMemo, useState } from 'react';
import { useFormEngine } from './use-form-engine';
import { FieldRenderer } from './field-renderer';
import * as styles from './form-renderer.css.js';
import {
  standardThemeLight,
  standardThemeDark,
  modalThemeLight,
  modalThemeDark,
  simplifiedThemeLight,
  simplifiedThemeDark,
  spotlightThemeLight,
  spotlightThemeDark,
} from './theme.css.js';
import { flattenFormElements } from './helpers/flatten-form-elements';

export function FormRenderer({
  schema,
  initialValues = {},
  overrideValues,
  onSubmit,
  mode = 'edit',
  debug = false,
  onSchemaReady,
  theme = 'standard',
  colorMode = 'light',
  className = '',
  labelPosition = 'top',
  labelWidthPercent = 30,
  formWidth = '30vw', //Accepts 30vw or 50%
  simplifiedMode = false,
  onSimplifiedNavigation,
  ...rest
}) {
  const [activeSection, setActiveSection] = useState(null);
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  
  const {
    values,
    visible,
    read_only,
    required,
    errors,
    setValue,
    submit,
    schema: finalSchema,
  } = useFormEngine(schema, initialValues, overrideValues);

  useEffect(() => {
    if (onSchemaReady) onSchemaReady(finalSchema);
  }, [finalSchema]);

  // Flatten form elements for simplified mode
  const schemaForRender = finalSchema || schema;
  const titleField = schemaForRender?.form?.title_field || null;
  const baseElements = schemaForRender?.form?.elements || [];

  const fieldLookup = useMemo(() => {
    const byKey = new Map();
    const byDataName = new Map();

    const collect = (elements) => {
      if (!Array.isArray(elements)) return;
      for (const element of elements) {
        if (!element) continue;
        if (element.type === 'Section') {
          collect(element.elements);
        } else {
          if (element.key) {
            byKey.set(element.key, element);
          }
          if (element.data_name) {
            byDataName.set(element.data_name, element);
          }
        }
      }
    };

    collect(baseElements);
    return { byKey, byDataName };
  }, [baseElements]);

  const titleValue = useMemo(() => {
    if (!titleField || !Array.isArray(titleField.elements)) {
      return '';
    }

    const getChoiceLabel = (fieldDef, choice) => {
      if (!choice) return '';
      if (typeof choice.label === 'string' && choice.label.trim() !== '') {
        return choice.label.trim();
      }
      if (choice.value != null) {
        const match = (fieldDef.choices || []).find((c) => c.value === choice.value);
        if (match && typeof match.label === 'string' && match.label.trim() !== '') {
          return match.label.trim();
        }
        return String(choice.value);
      }
      return '';
    };

    const collectOtherEntries = (entries) => {
      if (!Array.isArray(entries) || entries.length === 0) return [];
      const results = [];
      for (const entry of entries) {
        if (!entry) continue;
        if (typeof entry === 'string') {
          const trimmed = entry.trim();
          if (trimmed) results.push(trimmed);
        } else if (typeof entry.label === 'string') {
          const trimmed = entry.label.trim();
          if (trimmed) results.push(trimmed);
        } else if (entry.value != null) {
          const valueString = String(entry.value).trim();
          if (valueString) results.push(valueString);
        }
      }
      return results;
    };

    const resolveSingleChoiceText = (fieldDef, value) => {
      if (value == null) return '';
      if (typeof value !== 'object') {
        return String(value).trim();
      }
      const labels = [];
      const choiceArray = Array.isArray(value.choice) ? value.choice : [];
      if (choiceArray.length > 0) {
        labels.push(getChoiceLabel(fieldDef, choiceArray[0]));
      }
      labels.push(...collectOtherEntries(value.other));
      return labels.filter(Boolean).join(', ');
    };

    const resolveMultiChoiceText = (fieldDef, value) => {
      if (value == null) return '';
      if (typeof value !== 'object') {
        return String(value).trim();
      }
      const labels = [];
      const choiceArray = Array.isArray(value.choices) ? value.choices : [];
      for (const choice of choiceArray) {
        labels.push(getChoiceLabel(fieldDef, choice));
      }
      labels.push(...collectOtherEntries(value.other));
      return labels.filter(Boolean).join(', ');
    };

    const parts = [];
    for (const ref of titleField.elements) {
      if (typeof ref !== 'string') continue;
      const referencedField =
        fieldLookup.byKey.get(ref) || fieldLookup.byDataName.get(ref);
      if (!referencedField || !referencedField.data_name) continue;
      const rawValue = values[referencedField.data_name];
      if (rawValue == null) continue;
      let text = '';
      if (referencedField.type === 'SingleChoiceField' || referencedField.type === 'BooleanField') {
        text = resolveSingleChoiceText(referencedField, rawValue);
      } else if (referencedField.type === 'MultiChoiceField') {
        text = resolveMultiChoiceText(referencedField, rawValue);
      } else if (
        typeof rawValue === 'string' ||
        typeof rawValue === 'number' ||
        typeof rawValue === 'boolean'
      ) {
        text = String(rawValue);
      } else if (rawValue instanceof Date) {
        text = rawValue.toISOString();
      } else if (rawValue && typeof rawValue === 'object' && 'value' in rawValue) {
        text = String(rawValue.value);
      }
      if (text && typeof text === 'string' && text.trim() !== '') {
        parts.push(text.trim());
      }
    }
    return parts.join(', ');
  }, [fieldLookup, titleField, values]);

  const displayValues = useMemo(() => {
    if (!titleField) return values;
    return {
      ...values,
      [titleField.data_name]: titleValue,
    };
  }, [titleField, titleValue, values]);

  const elementsWithTitle = titleField ? [titleField, ...baseElements] : baseElements;

  const flattenedElements = simplifiedMode
    ? flattenFormElements(elementsWithTitle)
    : [];

  // Get current field in simplified mode
  const currentField = simplifiedMode && flattenedElements.length > 0 
    ? flattenedElements[currentFieldIndex] 
    : null;

  // Check if current field is visible
  const isCurrentFieldVisible = currentField 
    ? visible[currentField.data_name] !== false 
    : true;

  // Check if current field has errors
  const hasCurrentFieldError = currentField 
    ? !!errors[currentField.data_name] 
    : false;

  // Check if current field is required and has value
  const isCurrentFieldValid = currentField
    ? !required[currentField.data_name] ||
        (displayValues[currentField.data_name] !== null &&
          displayValues[currentField.data_name] !== undefined &&
          displayValues[currentField.data_name] !== '' &&
          (typeof displayValues[currentField.data_name] === 'string'
            ? displayValues[currentField.data_name].trim() !== ''
            : true))
    : true;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(submit());
    }
  };

  // Simplified mode navigation handlers
  const handleNext = () => {
    if (currentFieldIndex < flattenedElements.length - 1) {
      const nextIndex = currentFieldIndex + 1;
      setCurrentFieldIndex(nextIndex);
      if (onSimplifiedNavigation) {
        onSimplifiedNavigation({
          type: 'next',
          currentIndex: currentFieldIndex,
          nextIndex,
          currentField,
          nextField: flattenedElements[nextIndex]
        });
      }
    }
  };

  const handleBack = () => {
    if (currentFieldIndex > 0) {
      const prevIndex = currentFieldIndex - 1;
      setCurrentFieldIndex(prevIndex);
      if (onSimplifiedNavigation) {
        onSimplifiedNavigation({
          type: 'back',
          currentIndex: currentFieldIndex,
          prevIndex,
          currentField,
          prevField: flattenedElements[prevIndex]
        });
      }
    }
  };

  // Handle Enter key for navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && simplifiedMode) {
      e.preventDefault();
      if (isCurrentFieldValid && !hasCurrentFieldError) {
        if (currentFieldIndex === flattenedElements.length - 1) {
          // Submit on last field
          handleSubmit(e);
        } else {
          // Go to next field
          handleNext();
        }
      }
    }
  };

  // Global keyboard listener for simplified mode
  useEffect(() => {
    if (simplifiedMode) {
      const handleGlobalKeyDown = (e) => {
        if (e.key === 'Enter' && !e.target.matches('input, textarea, select')) {
          e.preventDefault();
          if (isCurrentFieldValid && !hasCurrentFieldError) {
            if (currentFieldIndex === flattenedElements.length - 1) {
              // Submit on last field
              handleSubmit(e);
            } else {
              // Go to next field
              handleNext();
            }
          }
        }
      };

      document.addEventListener('keydown', handleGlobalKeyDown);
      return () => document.removeEventListener('keydown', handleGlobalKeyDown);
    }
  }, [simplifiedMode, currentFieldIndex, isCurrentFieldValid, hasCurrentFieldError, flattenedElements.length]);

  const themeMap = {
    'standard-light': standardThemeLight,
    'standard-dark': standardThemeDark,
    'modal-light': modalThemeLight,
    'modal-dark': modalThemeDark,
    'simplified-light': simplifiedThemeLight,
    'simplified-dark': simplifiedThemeDark,
    'spotlight-light': spotlightThemeLight,
    'spotlight-dark': spotlightThemeDark,
  };

  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    if (colorMode === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      setSystemDark(mq.matches);
      const handler = (e) => setSystemDark(e.matches);
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [colorMode]);

  const effectiveColorMode = colorMode === 'system' ? (systemDark ? 'dark' : 'light') : colorMode;

  // If theme is a string, use the map. If it's a class name, use it directly.
  let themeClass;
  if (typeof theme === 'string') {
    const effectiveThemeKey = `${theme}-${effectiveColorMode}`;
    themeClass = themeMap[effectiveThemeKey] || standardThemeLight;
  } else {
    // Assume it's a class name (custom theme)
    themeClass = theme;
  }

  // Simplified mode rendering
  if (simplifiedMode) {
    if (!currentField) {
      return (
        <div className={`${styles.form} ${themeClass} ${className}`} {...rest}>
          <p>No fields to display</p>
        </div>
      );
    }

    const isLastField = currentFieldIndex === flattenedElements.length - 1;

    const currentFieldValue = displayValues[currentField.data_name];
    const currentFieldReadOnly =
      mode === 'readonly' ||
      read_only[currentField.data_name] === true ||
      currentField.type === 'TitleField';
    const currentFieldChangeHandler =
      currentField.type === 'TitleField'
        ? undefined
        : (val) => setValue(currentField.data_name, val);

    return (
      <form
        onSubmit={handleSubmit}
        className={`${styles.form} ${themeClass} ${className}`}
        onKeyDown={handleKeyDown}
        {...rest}
      >
        {/* Progress indicator */}
        <div className={styles.simplifiedProgress}>
          Question {currentFieldIndex + 1} of {flattenedElements.length}
        </div>

        {/* Current field */}
        {isCurrentFieldVisible && (
          <FieldRenderer
            key={currentField.key || currentField.data_name}
            field={currentField}
            value={currentFieldValue}
            readOnly={currentFieldReadOnly}
            required={required[currentField.data_name]}
            error={errors[currentField.data_name]}
            onChange={currentFieldChangeHandler}
            onKeyDown={handleKeyDown}
            labelPosition="top"
            labelWidthPercent={100}
          />
        )}

        {/* Navigation buttons */}
        <div className={styles.simplifiedNavigation}>
          <button
            type="button"
            onClick={handleBack}
            disabled={currentFieldIndex === 0}
            className={`${styles.simplifiedButton} ${currentFieldIndex === 0 ? styles.simplifiedButtonDisabled : ''}`}
          >
            ← Back
          </button>
          
          {isLastField ? (
            <button
              type="submit"
              className={`${styles.simplifiedButton} ${(!isCurrentFieldValid || hasCurrentFieldError) ? styles.simplifiedButtonDisabled : ''}`}
              disabled={!isCurrentFieldValid || hasCurrentFieldError}
            >
              Submit
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              disabled={!isCurrentFieldValid || hasCurrentFieldError}
              className={`${styles.simplifiedButton} ${(!isCurrentFieldValid || hasCurrentFieldError) ? styles.simplifiedButtonDisabled : ''}`}
            >
              Next →
            </button>
          )}
        </div>

        {debug && (
          <pre>{JSON.stringify({ 
            values: displayValues, 
            visible, 
            read_only, 
            required, 
            errors, 
            currentFieldIndex,
            currentField: currentField?.data_name,
            isLastField,
            isCurrentFieldValid,
            hasCurrentFieldError,
            flattenedElementsLength: flattenedElements.length
          }, null, 2)}</pre>
        )}
      </form>
    );
  }

  // Regular mode rendering (existing logic)
  const renderElements = (elements = []) => {
    return elements.map((field) => {
      if (!field) return null;

      if (field.type === 'Section') {
        const display = field.display || 'inline';

        // 🔎 DRILLDOWN
        if (display === 'drilldown') {
          if (activeSection !== field.data_name) {
            return (
              <div key={field.key || field.data_name} className={styles.drilldownInactive}>
                <div>
                  <span className={styles.sectionHeader}>📛 {field.label}</span>
                  <button type="button" className={styles.drilldownButton} onClick={() => setActiveSection(field.data_name)}>
                    View &gt;
                  </button>
                </div>
              </div>
            );
          }

          // Section is active
          return (
            <div key={field.key || field.data_name} className={styles.drilldownActive}>
              <button className={styles.backButton} onClick={() => setActiveSection(null)}>&lt; Back</button>
              <h3 className={styles.sectionHeader}>{field.label}</h3>
              {renderElements(field.elements || [])}
            </div>
          );
        }

        // 🧱 INLINE
        return (
          <div key={field.key || field.data_name} className={styles.section}>
            <h3 className={styles.sectionHeader}>{field.label}</h3>
            {renderElements(field.elements || [])}
          </div>
        );
      }

      const hasVisibility = Object.prototype.hasOwnProperty.call(visible, field.data_name);
      const isVisible = hasVisibility ? visible[field.data_name] !== false : field.visible !== false;
      if (!isVisible) {
        return null;
      }

      const fieldValue = displayValues[field.data_name];
      const fieldReadOnly =
        mode === 'readonly' ||
        read_only[field.data_name] === true ||
        field.type === 'TitleField';
      const handleFieldChange =
        field.type === 'TitleField'
          ? undefined
          : (val) => setValue(field.data_name, val);

      return (
        <FieldRenderer
          key={field.key || field.data_name}
          field={field}
          value={fieldValue}
          readOnly={fieldReadOnly}
          required={required[field.data_name]}
          error={errors[field.data_name]}
          onChange={handleFieldChange}
          labelPosition={labelPosition}
          labelWidthPercent={labelWidthPercent}
        />
      );
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`${styles.form} ${themeClass} ${className}`}
      //style={{ '--label-width': `${labelWidthPercent}%` }}
      //style={{ width: formWidth }}
      {...rest}
    >
      {renderElements(
        titleField
          ? [
              titleField,
              ...(activeSection
                ? baseElements.filter((e) => e.data_name === activeSection)
                : baseElements),
            ]
          : activeSection
          ? baseElements.filter((e) => e.data_name === activeSection)
          : baseElements
      )}
      {mode !== 'readonly' && (
        <button type="submit" className={styles.button}>
          Submit
        </button>
      )}
      {debug && (
        <pre>{JSON.stringify({ values: displayValues, visible, read_only, required, errors }, null, 2)}</pre>
      )}
    </form>
  );
}
