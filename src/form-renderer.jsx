import React, { useEffect, useState } from 'react';
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
  const flattenedElements = simplifiedMode 
    ? flattenFormElements(schema.form?.elements || [])
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
    ? !required[currentField.data_name] || (
        values[currentField.data_name] !== null && 
        values[currentField.data_name] !== undefined && 
        values[currentField.data_name] !== '' &&
        (typeof values[currentField.data_name] === 'string' ? values[currentField.data_name].trim() !== '' : true)
      )
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

  const handleFieldChange = (fieldName, value) => {
    setValue(fieldName, value);
    
  };

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
            value={values[currentField.data_name]}
            readOnly={read_only[currentField.data_name] || mode === 'readonly'}
            required={required[currentField.data_name]}
            error={errors[currentField.data_name]}
            onChange={(val) => handleFieldChange(currentField.data_name, val)}
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
            values, 
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
  const renderElements = (elements) => {
    return elements.map((field) => {
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

      return (
        visible[field.data_name] !== false && (
          <FieldRenderer
            key={field.key || field.data_name}
            field={field}
            value={values[field.data_name]}
            readOnly={read_only[field.data_name] || mode === 'readonly'}
            required={required[field.data_name]}
            error={errors[field.data_name]}
            onChange={(val) => setValue(field.data_name, val)}
            labelPosition={labelPosition}
            labelWidthPercent={labelWidthPercent}
          />
        )
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
        activeSection
          ? (schema.form?.elements || []).filter((e) => e.data_name === activeSection)
          : schema.form?.elements || []
      )}
      {mode !== 'readonly' && (
        <button type="submit" className={styles.button}>
          Submit
        </button>
      )}
      {debug && (
        <pre>{JSON.stringify({ values, visible, read_only, required, errors }, null, 2)}</pre>
      )}
    </form>
  );
}
