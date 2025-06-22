import React, { useEffect, useState } from 'react';
import { useFormEngine } from './use-form-engine';
import { FieldRenderer } from './field-renderer';
import * as styles from './form-renderer.css.js';
import { standardThemeLight, standardThemeDark, modalThemeLight, modalThemeDark, simplifiedThemeLight, simplifiedThemeDark } from './theme.css.js';

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
  ...rest
}) {
  console.log('FormRenderer received theme prop:', theme);
  const [activeSection, setActiveSection] = useState(null);
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(submit());
    }
  };

  const themeMap = {
    'standard-light': standardThemeLight,
    'standard-dark': standardThemeDark,
    'modal-light': modalThemeLight,
    'modal-dark': modalThemeDark,
    'simplified-light': simplifiedThemeLight,
    'simplified-dark': simplifiedThemeDark,
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

  const effectiveColorMode =
    colorMode === 'system' ? (systemDark ? 'dark' : 'light') : colorMode;

  // If theme is a string, use the map. If it's a class name, use it directly.
  let themeClass;
  if (typeof theme === 'string') {
    const effectiveThemeKey = `${theme}-${effectiveColorMode}`;
    themeClass = themeMap[effectiveThemeKey] || standardThemeLight;
  } else {
    // Assume it's a class name (custom theme)
    themeClass = theme;
  }

  const renderElements = (elements) => {
    return elements.map((field) => {
      if (field.type === 'Section') {
        const display = field.display || 'inline';

        // 🔎 DRILLDOWN
        if (display === 'drilldown') {
          if (activeSection !== field.data_name) {
            return (
              <div
                key={field.key || field.data_name}
                className={styles.drilldownInactive}
              >
                <div>
                  <span className={styles.sectionHeader}>
                    📛 {field.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveSection(field.data_name)}
                  >
                    View &gt;
                  </button>
                </div>
              </div>
            );
          }

          // Section is active
          return (
            <div key={field.key || field.data_name} className={styles.drilldownActive}>
              <button
                onClick={() => setActiveSection(null)}
              >
                &lt; Back
              </button>
              <h3 className={styles.sectionHeader}>{field.label}</h3>
              {renderElements(field.elements || [])}
            </div>
          );
        }

        // 🧱 INLINE
        return (
          <div
            key={field.key || field.data_name}
            className={styles.section}
          >
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
          />
        )
      );
    });
  };

  return (
    <form onSubmit={handleSubmit} className={`${styles.form} ${themeClass} ${className}`} {...rest}>
      {/* {renderElements(schema.form?.elements || [])} */}
      {renderElements(
        activeSection
          ? (schema.form?.elements || []).filter((e) => e.data_name === activeSection)
          : schema.form?.elements || []
      )}
      {mode !== 'readonly' && (
        <button type="submit">
          Submit
        </button>
      )}
      {debug && (
        <pre>
          {JSON.stringify({ values, visible, read_only, required, errors }, null, 2)}
        </pre>
      )}
    </form>
  );
}
