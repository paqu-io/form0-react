import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { isFieldValueEmpty } from './helpers/is-field-value-empty.js';

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
  const touchedFieldsRef = useRef(new Set());
  const [, setTouchVersion] = useState(0);
  const [submitCount, setSubmitCount] = useState(0);
  const [alertQueue, setAlertQueue] = useState([]);
  const [activeAlert, setActiveAlert] = useState(null);
  const loadEventTriggeredRef = useRef(false);
  const alertOkButtonRef = useRef(null);
  const previousAlertFocusRef = useRef(null);

  const markFieldTouched = useCallback(
    (dataName) => {
      if (!dataName) return;
      if (!touchedFieldsRef.current.has(dataName)) {
        touchedFieldsRef.current.add(dataName);
        setTouchVersion((version) => version + 1);
      }
    },
    [setTouchVersion]
  );

  const isFieldTouched = useCallback(
    (dataName) => touchedFieldsRef.current.has(dataName),
    []
  );
  
  const handleOperations = useCallback(
    (operations, meta, fallback) => {
      if (!Array.isArray(operations) || operations.length === 0) {
        return;
      }

      const deferredOperations = [];

      operations.forEach((operation) => {
        if (!operation || typeof operation !== 'object') {
          return;
        }

        if (operation.type === 'UI_OPERATION' && operation.operation === 'ALERT') {
          const rawTitle = operation.params?.title ?? '';
          const rawMessage = operation.params?.message ?? '';
          setAlertQueue((queue) => [
            ...queue,
            {
              title: String(rawTitle || '').trim() || 'Alert',
              message: String(rawMessage || ''),
            },
          ]);
        } else {
          deferredOperations.push(operation);
        }
      });

      if (deferredOperations.length > 0) {
        if (typeof fallback === 'function') {
          fallback(deferredOperations, meta);
        } else {
          console.warn(
            'form0-react: onOperations handler received operations but fallback handler was not provided.',
            deferredOperations
          );
        }
      }
    },
    [setAlertQueue]
  );

  const engineOptions = useMemo(
    () => ({
      onOperations: handleOperations,
    }),
    [handleOperations]
  );

  const closeAlert = useCallback(() => {
    setActiveAlert(null);
  }, []);

  const {
    values,
    visible,
    read_only,
    required,
    errors,
    setValue,
    submit,
    triggerEvent,
    schema: finalSchema,
    engine,
  } = useFormEngine(schema, initialValues, overrideValues, engineOptions);

  useEffect(() => {
    if (onSchemaReady) onSchemaReady(finalSchema);
  }, [finalSchema]);

  useEffect(() => {
    loadEventTriggeredRef.current = false;
  }, [engine]);

  useEffect(() => {
    if (!engine || loadEventTriggeredRef.current) {
      return;
    }
    triggerEvent('load-record');
    loadEventTriggeredRef.current = true;
  }, [engine, triggerEvent]);

  useEffect(() => {
    if (activeAlert || alertQueue.length === 0) {
      return;
    }
    setActiveAlert(alertQueue[0]);
    setAlertQueue((prev) => prev.slice(1));
  }, [alertQueue, activeAlert, setAlertQueue, setActiveAlert]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }
    if (!activeAlert) {
      return undefined;
    }

    previousAlertFocusRef.current = document.activeElement;
    const focusTimer = setTimeout(() => {
      alertOkButtonRef.current?.focus?.();
    }, 0);

    return () => {
      clearTimeout(focusTimer);
      previousAlertFocusRef.current?.focus?.();
      previousAlertFocusRef.current = null;
    };
  }, [activeAlert]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }
    if (!activeAlert) {
      return undefined;
    }
    const handler = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeAlert();
      }
    };
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
    };
  }, [activeAlert, closeAlert]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }
    if (!activeAlert) {
      return undefined;
    }
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [activeAlert]);

  const handleAlertOverlayClick = useCallback(
    (event) => {
      if (event.target === event.currentTarget) {
        closeAlert();
      }
    },
    [closeAlert]
  );

  // Flatten form elements for simplified mode
  const schemaForRender = finalSchema || schema;
  const titleField = schemaForRender?.form?.title_field || null;
  const statusField = schemaForRender?.form?.status_field || null;
  const baseElements = schemaForRender?.form?.elements || [];

  const headerFields = useMemo(() => {
    const fields = [];
    if (statusField) {
      fields.push(statusField);
    }
    if (titleField) {
      fields.push(titleField);
    }
    return fields;
  }, [statusField, titleField]);

  const statusFieldName = statusField?.data_name || null;

  const overrideStatusSignature = useMemo(() => {
    if (!statusFieldName || !overrideValues) {
      return '__no_override__';
    }
    if (!Object.prototype.hasOwnProperty.call(overrideValues, statusFieldName)) {
      return '__no_override__';
    }
    return JSON.stringify(overrideValues[statusFieldName]);
  }, [statusFieldName, overrideValues]);

  const initialStatusSignature = useMemo(() => {
    if (!statusFieldName || !initialValues) {
      return '__no_initial__';
    }
    if (!Object.prototype.hasOwnProperty.call(initialValues, statusFieldName)) {
      return '__no_initial__';
    }
    return JSON.stringify(initialValues[statusFieldName]);
  }, [statusFieldName, initialValues]);

  const computeStatusSourceValue = () => {
    if (!statusField || !statusFieldName) {
      return null;
    }
    if (overrideValues && Object.prototype.hasOwnProperty.call(overrideValues, statusFieldName)) {
      return overrideValues[statusFieldName];
    }
    if (initialValues && Object.prototype.hasOwnProperty.call(initialValues, statusFieldName)) {
      return initialValues[statusFieldName];
    }
    if (statusField.default_value !== undefined) {
      return statusField.default_value;
    }
    return null;
  };

  const [statusValue, setStatusValue] = useState(() => computeStatusSourceValue());

  useEffect(() => {
    if (!statusField || !statusFieldName) {
      if (statusValue !== null) {
        setStatusValue(null);
      }
      return;
    }
    const next = computeStatusSourceValue();
    setStatusValue((prev) => (Object.is(prev, next) ? prev : next));
  }, [statusField, statusFieldName, overrideStatusSignature, initialStatusSignature]);

  const handleFieldValueChange = useCallback(
    (fieldDef, nextValue) => {
      if (!fieldDef?.data_name) return;
      const dataName = fieldDef.data_name;
      markFieldTouched(dataName);
      if (fieldDef.type === 'StatusField') {
        setStatusValue(nextValue ?? null);
      } else {
        setValue(dataName, nextValue);
      }
      triggerEvent('change', dataName, { value: nextValue, field: fieldDef });
    },
    [markFieldTouched, setStatusValue, setValue, triggerEvent]
  );

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
    let next = values;
    if (statusFieldName) {
      next = {
        ...next,
        [statusFieldName]: statusValue ?? null,
      };
    }
    if (titleField) {
      next = {
        ...next,
        [titleField.data_name]: titleValue,
      };
    }
    return next;
  }, [statusFieldName, statusValue, titleField, titleValue, values]);

  const elementsForFlattening = headerFields.length > 0 ? [...headerFields, ...baseElements] : baseElements;

  const flattenedElements = simplifiedMode
    ? flattenFormElements(elementsForFlattening)
    : [];
  const flattenedElementsLength = flattenedElements.length;

  const resolveFieldVisibility = useCallback(
    (field) => {
      if (!field || !field.data_name) {
        return false;
      }
      const key = field.data_name;
      if (Object.prototype.hasOwnProperty.call(visible, key)) {
        return visible[key] !== false;
      }
      return field.visible !== false;
    },
    [visible]
  );

  const resolveFieldReadOnly = useCallback(
    (field) => {
      if (!field || !field.data_name) {
        return false;
      }
      const key = field.data_name;
      if (Object.prototype.hasOwnProperty.call(read_only, key)) {
        return read_only[key] === true;
      }
      return field.read_only === true;
    },
    [read_only]
  );

  const resolveFieldRequired = useCallback(
    (field) => {
      if (!field || !field.data_name) {
        return false;
      }
      const key = field.data_name;
      if (Object.prototype.hasOwnProperty.call(required, key)) {
        return required[key];
      }
      return !!field.required;
    },
    [required]
  );

  const computeFieldError = useCallback(
    (field, fieldValue, fieldRequired) => {
      if (!field || !field.data_name) {
        return null;
      }
      const dataName = field.data_name;
      const engineError = errors[dataName];
      if (engineError) {
        return engineError;
      }
      if (!fieldRequired) {
        return null;
      }
      const shouldShowRequired =
        (isFieldTouched(dataName) || submitCount > 0) && isFieldValueEmpty(field, fieldValue);
      return shouldShowRequired ? 'This field is required' : null;
    },
    [errors, isFieldTouched, submitCount]
  );

  // Get current field in simplified mode
  const currentField = simplifiedMode && flattenedElementsLength > 0
    ? flattenedElements[currentFieldIndex] 
    : null;

  // Check if current field is visible
  const isCurrentFieldVisible = currentField ? resolveFieldVisibility(currentField) : true;

  const currentFieldRequired = currentField ? resolveFieldRequired(currentField) : false;
  const currentFieldValue = currentField ? displayValues[currentField.data_name] : null;
  const currentFieldError = currentField
    ? computeFieldError(currentField, currentFieldValue, currentFieldRequired)
    : null;
  const hasCurrentFieldError = currentField ? currentFieldError != null : false;
  const isCurrentFieldValid = currentField ? !hasCurrentFieldError : true;
  const currentFieldKey = currentField?.data_name ?? null;
  const debugIsLastField =
    simplifiedMode && flattenedElementsLength > 0
      ? currentFieldIndex === flattenedElementsLength - 1
      : false;

  const debugData = useMemo(
    () => ({
      values: displayValues,
      visible,
      read_only,
      required,
      errors,
      currentFieldIndex,
      currentField: currentFieldKey,
      isLastField: debugIsLastField,
      isCurrentFieldValid,
      hasCurrentFieldError,
      flattenedElementsLength,
    }),
    [
      displayValues,
      visible,
      read_only,
      required,
      errors,
      currentFieldIndex,
      currentFieldKey,
      debugIsLastField,
      isCurrentFieldValid,
      hasCurrentFieldError,
      flattenedElementsLength,
    ]
  );

  const debugText = useMemo(
    () =>
      JSON.stringify(
        debugData,
        (key, value) => {
          if (typeof value === 'string' && value.length > 160) {
            const visiblePart = value.slice(0, 120);
            const remaining = value.length - 120;
            return `${visiblePart}… (${remaining} more chars)`;
          }
          return value;
        },
        2
      ),
    [debugData]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitCount((count) => count + 1);
    if (onSubmit) {
      const submission = submit();
      const result =
        statusFieldName && statusFieldName.length > 0
          ? { ...submission, [statusFieldName]: statusValue ?? null }
          : submission;
      onSubmit(result);
    }
  };

  // Simplified mode navigation handlers
  const handleNext = () => {
    if (currentFieldIndex < flattenedElementsLength - 1) {
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
        if (currentFieldIndex === flattenedElementsLength - 1) {
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
            if (currentFieldIndex === flattenedElementsLength - 1) {
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
  }, [simplifiedMode, currentFieldIndex, isCurrentFieldValid, hasCurrentFieldError, flattenedElementsLength]);

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

    const isLastField = currentFieldIndex === flattenedElementsLength - 1;

    const currentFieldValue = displayValues[currentField.data_name];
    const currentFieldReadOnly =
      mode === 'readonly' ||
      resolveFieldReadOnly(currentField) ||
      currentField.type === 'TitleField';
    const currentFieldChangeHandler =
      currentField.type === 'TitleField'
        ? undefined
        : (val) => handleFieldValueChange(currentField, val);

    return (
      <form
        onSubmit={handleSubmit}
        className={`${styles.form} ${themeClass} ${className}`}
        onKeyDown={handleKeyDown}
        {...rest}
      >
        {/* Progress indicator */}
        <div className={styles.simplifiedProgress}>
          Question {currentFieldIndex + 1} of {flattenedElementsLength}
        </div>

        {/* Current field */}
        {isCurrentFieldVisible && (
          <FieldRenderer
            key={currentField.key || currentField.data_name}
            field={currentField}
            value={currentFieldValue}
            readOnly={currentFieldReadOnly}
            required={currentFieldRequired}
            error={currentFieldError}
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

        {debug && <pre className={styles.debugPanel}>{debugText}</pre>}

        {activeAlert && (
          <div
            className={styles.alertOverlay}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="form0-react-alert-title"
            aria-describedby="form0-react-alert-message"
            onClick={handleAlertOverlayClick}
          >
            <div className={styles.alertDialog}>
              <button
                type="button"
                className={styles.alertCloseButton}
                aria-label="Close alert"
                onClick={closeAlert}
              >
                ×
              </button>
              <h3 id="form0-react-alert-title" className={styles.alertTitle}>
                {activeAlert.title}
              </h3>
              <div id="form0-react-alert-message" className={styles.alertMessage}>
                {activeAlert.message || ''}
              </div>
              <div className={styles.alertFooter}>
                <button
                  type="button"
                  ref={alertOkButtonRef}
                  className={styles.alertOkButton}
                  onClick={closeAlert}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
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

      if (!resolveFieldVisibility(field)) {
        return null;
      }

      const fieldRequired = resolveFieldRequired(field);
      const fieldValue = displayValues[field.data_name];
      const fieldReadOnly =
        mode === 'readonly' ||
        resolveFieldReadOnly(field) ||
        field.type === 'TitleField';
      const fieldError = computeFieldError(field, fieldValue, fieldRequired);
      const handleFieldChange =
        field.type === 'TitleField' ? undefined : (val) => handleFieldValueChange(field, val);

      return (
        <FieldRenderer
          key={field.key || field.data_name}
          field={field}
          value={fieldValue}
          readOnly={fieldReadOnly}
          required={fieldRequired}
          error={fieldError}
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
        headerFields.length > 0
          ? [
              ...headerFields,
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
      {debug && <pre className={styles.debugPanel}>{debugText}</pre>}

      {activeAlert && (
        <div
          className={styles.alertOverlay}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="form0-react-alert-title"
          aria-describedby="form0-react-alert-message"
          onClick={handleAlertOverlayClick}
        >
          <div className={styles.alertDialog}>
            <button
              type="button"
              className={styles.alertCloseButton}
              aria-label="Close alert"
              onClick={closeAlert}
            >
              ×
            </button>
            <h3 id="form0-react-alert-title" className={styles.alertTitle}>
              {activeAlert.title}
            </h3>
            <div id="form0-react-alert-message" className={styles.alertMessage}>
              {activeAlert.message || ''}
            </div>
            <div className={styles.alertFooter}>
              <button
                type="button"
                ref={alertOkButtonRef}
                className={styles.alertOkButton}
                onClick={closeAlert}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
