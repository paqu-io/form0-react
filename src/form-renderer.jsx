import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFormEngine } from './use-form-engine';
import { FieldRenderer } from './field-renderer';
import { NavigationTree } from './navigation-tree';
import { ThemeProvider } from './theme-context';
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
  const [activeDrilldownPath, setActiveDrilldownPath] = useState([]);
  const sectionRefs = useRef(new Map());
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

    // Calculate scrollbar width to prevent content shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
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
    if (statusField && statusField.enabled !== false) {
      fields.push(statusField);
    }
    return fields;
  }, [statusField]);

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

  const recordTitleDisplay = useMemo(() => {
    if (!titleField) {
      return null;
    }
    const cleaned = typeof titleValue === 'string' ? titleValue.trim() : '';
    if (cleaned.length > 0) {
      return cleaned;
    }
    return 'Untitled';
  }, [titleField, titleValue]);

  const displayValues = useMemo(() => {
    let next = values;
    if (statusFieldName) {
      next = {
        ...next,
        [statusFieldName]: statusValue ?? null,
      };
    }
    if (titleField) {
      const titleValueForDisplay = recordTitleDisplay ?? 'Untitled';
      next = {
        ...next,
        [titleField.data_name]: titleValueForDisplay,
      };
    }
    return next;
  }, [statusFieldName, statusValue, titleField, recordTitleDisplay, values]);

  const recordStatusInfo = useMemo(() => {
    if (!statusField) {
      return null;
    }
    const fieldEnabled = statusField.enabled !== false;
    const choices = Array.isArray(statusField.choices) ? statusField.choices : [];
    const getChoice = (val) => choices.find((choice) => choice.value === val) || null;
    const effectiveValue =
      statusValue != null
        ? statusValue
        : statusField.default_value != null
        ? statusField.default_value
        : null;
    const selectedChoice = effectiveValue != null ? getChoice(effectiveValue) : null;
    const color = selectedChoice?.color || '#d4d4d8';
    const label = selectedChoice?.label || selectedChoice?.value || effectiveValue || '';
    return { color, label, disabled: !fieldEnabled };
  }, [statusField, statusValue]);

  const elementsForFlattening = baseElements;

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

  // If theme is a string, check if it's a named theme or a custom class name.
  let themeClass;
  if (typeof theme === 'string') {
    const effectiveThemeKey = `${theme}-${effectiveColorMode}`;
    // Check if it's a named theme (exists in themeMap)
    if (themeMap[effectiveThemeKey]) {
      themeClass = themeMap[effectiveThemeKey];
    } else {
      // Not a named theme, assume it's a custom theme class name
      themeClass = theme;
    }
  } else {
    // Assume it's a class name (custom theme)
    themeClass = theme;
  }

  const { sectionTree, sectionMetadata, fieldToSectionPath } = useMemo(() => {
    const metadata = {};
    const fieldPathMap = {};

    const traverse = (elements, sectionPath = [], drilldownPath = []) => {
      if (!Array.isArray(elements)) return [];

      const nodes = [];

      elements.forEach((el) => {
        if (!el) {
          return;
        }

        if (el.type === 'Section') {
          const sectionId = el.data_name || el.key;
          const hasSectionId = typeof sectionId === 'string' && sectionId.length > 0;
          const display = el.display || 'inline';
          const nextSectionPath = hasSectionId ? [...sectionPath, sectionId] : sectionPath;
          const nextDrilldownPath =
            display === 'drilldown' && hasSectionId
              ? [...drilldownPath, sectionId]
              : drilldownPath;

          if (hasSectionId) {
            metadata[sectionId] = {
              id: sectionId,
              display,
              path: nextSectionPath,
              drilldownPath: nextDrilldownPath,
            };
          }

          const childNodes = traverse(el.elements || [], nextSectionPath, nextDrilldownPath);

          if (hasSectionId) {
            nodes.push({
              id: sectionId,
              label: el.label || el.data_name || 'Unnamed Section',
              display,
              children: childNodes,
            });
          } else {
            nodes.push(...childNodes);
          }
        } else if (el.data_name) {
          fieldPathMap[el.data_name] = sectionPath;
        }
      });

      return nodes;
    };

    const treeNodes = traverse(baseElements);
    return { sectionTree: treeNodes, sectionMetadata: metadata, fieldToSectionPath: fieldPathMap };
  }, [baseElements]);

  const [highlightedSections, setHighlightedSections] = useState([]);
  const [navigationClickTimestamp, setNavigationClickTimestamp] = useState(0);

  const hasNavigableSections = sectionTree.length > 0;
  const activeDrilldownSectionId =
    activeDrilldownPath.length > 0 ? activeDrilldownPath[activeDrilldownPath.length - 1] : null;
  const activeDrilldownFullPath =
    activeDrilldownSectionId && sectionMetadata[activeDrilldownSectionId]
      ? sectionMetadata[activeDrilldownSectionId].path || []
      : [];

  const registerSectionNode = useCallback((sectionId, node) => {
    if (!sectionId) {
      return;
    }
    if (node) {
      sectionRefs.current.set(sectionId, node);
    } else {
      sectionRefs.current.delete(sectionId);
    }
  }, []);

  const scrollSectionIntoView = useCallback((sectionId) => {
    const node = sectionRefs.current.get(sectionId);
    if (!node || typeof node.scrollIntoView !== 'function') {
      return false;
    }
    node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (typeof node.focus === 'function') {
      try {
        node.focus({ preventScroll: true });
      } catch {
        node.focus();
      }
    }
    return true;
  }, []);

  const focusSectionAfterNavigation = useCallback((sectionId) => {
    if (!sectionId) return;

    const attemptFocus = () => scrollSectionIntoView(sectionId);

    const schedule =
      typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
        ? window.requestAnimationFrame
        : (cb) => setTimeout(cb, 16);

    schedule(() => {
      if (attemptFocus()) return;
      setTimeout(attemptFocus, 80);
    });
  }, [scrollSectionIntoView]);

  const setHighlightedPath = useCallback((path = []) => {
    setHighlightedSections(path);
  }, []);

  const markNavigationInteraction = useCallback(() => {
    setNavigationClickTimestamp(Date.now());
  }, []);

  const setActiveDrilldownForSection = useCallback(
    (sectionId) => {
      const section = sectionMetadata[sectionId];
      if (!section) return;
      setActiveDrilldownPath(section.drilldownPath);
      setHighlightedPath(section.path);
    },
    [sectionMetadata, setHighlightedPath]
  );

  const handleNavigate = useCallback(
    (sectionId) => {
      const section = sectionMetadata[sectionId];
      if (!section) {
        return;
      }
      if (section.display === 'drilldown') {
        setActiveDrilldownForSection(sectionId);
      } else {
        setActiveDrilldownPath(section.drilldownPath);
        setHighlightedPath(section.path);
      }
      markNavigationInteraction();
      focusSectionAfterNavigation(sectionId);
    },
    [
      focusSectionAfterNavigation,
      sectionMetadata,
      setActiveDrilldownForSection,
      setHighlightedPath,
      markNavigationInteraction,
    ]
  );

  const handleFieldFocus = useCallback(
    (fieldDataName) => {
      const timeSinceNavClick = Date.now() - navigationClickTimestamp;
      if (timeSinceNavClick < 500) {
        return;
      }

      const sectionPath = fieldToSectionPath[fieldDataName];
      if (sectionPath && sectionPath.length > 0) {
        setHighlightedPath(sectionPath);
      } else {
        setHighlightedPath([]);
      }
    },
    [fieldToSectionPath, navigationClickTimestamp, setHighlightedPath]
  );

  const isPathPrefix = (candidate = [], target = []) => {
    if (candidate.length === 0 || candidate.length > target.length) {
      return false;
    }
    return candidate.every((id, idx) => target[idx] === id);
  };

  const handleDrilldownBack = useCallback(
    (sectionId) => {
      const info = sectionMetadata[sectionId];
      if (!info) {
        setActiveDrilldownPath([]);
        setHighlightedPath([]);
        return;
      }
      const nextDrilldownPath = info.drilldownPath.slice(0, -1);
      setActiveDrilldownPath(nextDrilldownPath);
      const nextHighlightPath =
        info.path && info.path.length > 1 ? info.path.slice(0, -1) : [];
      setHighlightedPath(nextHighlightPath);
      markNavigationInteraction();
      const parentSectionId =
        info.path && info.path.length > 1 ? info.path[info.path.length - 2] : null;
      if (parentSectionId) {
        focusSectionAfterNavigation(parentSectionId);
      }
    },
    [focusSectionAfterNavigation, sectionMetadata, setHighlightedPath, markNavigationInteraction]
  );

  const renderRecordSummary = useCallback(() => {
    if (!recordTitleDisplay && !recordStatusInfo) {
      return null;
    }
    const titleText = recordTitleDisplay || 'Untitled';
    const statusColor = recordStatusInfo?.color || '#d4d4d8';
    const statusLabel = recordStatusInfo?.label
      ? `Status: ${recordStatusInfo.label}${recordStatusInfo?.disabled ? ' (disabled)' : ''}`
      : recordStatusInfo?.disabled
      ? 'Status disabled'
      : undefined;
    const statusBadgeClass = recordStatusInfo?.disabled
      ? styles.recordSummaryStatusDisabled
      : styles.recordSummaryStatus;
    const statusBadgeStyle =
      recordStatusInfo?.disabled || !statusColor ? undefined : { backgroundColor: statusColor };

    return (
      <div className={styles.recordSummary} role="group" aria-label="Record summary">
        <span
          className={statusBadgeClass}
          style={statusBadgeStyle}
          {...(statusLabel ? { role: 'img', 'aria-label': statusLabel } : { 'aria-hidden': 'true' })}
        />
        <div className={styles.recordSummaryContent}>
          <div className={styles.recordSummaryTitle}>{titleText}</div>
        </div>
      </div>
    );
  }, [recordStatusInfo, recordTitleDisplay]);

  const renderRecordMetadata = useCallback(() => {
    if (!headerFields || headerFields.length === 0) {
      return null;
    }
    if (activeDrilldownPath.length > 0) {
      return null;
    }

    const metadataFields = headerFields
      .map((field) => {
        if (!field || !field.data_name) {
          return null;
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
            onFocus={() => handleFieldFocus(field.data_name)}
            labelPosition={labelPosition}
            labelWidthPercent={labelWidthPercent}
          />
        );
      })
      .filter(Boolean);

    if (metadataFields.length === 0) {
      return null;
    }

    return (
      <section
        className={`${styles.section} ${styles.recordMetadata}`}
        aria-label="Record Metadata"
      >
        <h3 className={styles.sectionHeader}>Record Metadata</h3>
        <div className={styles.recordMetadataFields}>{metadataFields}</div>
      </section>
    );
  }, [
    headerFields,
    resolveFieldVisibility,
    resolveFieldRequired,
    displayValues,
    mode,
    resolveFieldReadOnly,
    computeFieldError,
    handleFieldValueChange,
    handleFieldFocus,
    labelWidthPercent,
    labelPosition,
    activeDrilldownPath.length,
  ]);

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
      <ThemeProvider themeClass={themeClass}>
        <form
          onSubmit={handleSubmit}
          className={`${styles.form} ${themeClass} ${className}`}
          onKeyDown={handleKeyDown}
          {...rest}
        >
          {renderRecordSummary()}
          {renderRecordMetadata()}
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
        </form>

        {activeAlert && typeof document !== 'undefined' && createPortal(
          <div
            className={styles.alertOverlay}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="form0-react-alert-title"
            aria-describedby="form0-react-alert-message"
            onClick={handleAlertOverlayClick}
          >
            <div className={`${styles.alertDialog} ${themeClass}`}>
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
          </div>,
          document.body
        )}
      </ThemeProvider>
    );
  }

  const renderElements = (elements = [], parentSectionPath = []) => {
    return elements.map((field) => {
      if (!field) return null;

      if (activeDrilldownSectionId) {
        if (field.type === 'Section') {
          const sectionId = field.data_name || field.key;
          if (!sectionId) {
            return null;
          }
          const sectionPath = [...parentSectionPath, sectionId];
          const isAncestorOfActive =
            sectionId !== activeDrilldownSectionId && activeDrilldownFullPath.includes(sectionId);
          const isWithinActiveBranch = sectionPath.includes(activeDrilldownSectionId);

          if (!isAncestorOfActive && !isWithinActiveBranch) {
            return null;
          }

          if (isAncestorOfActive) {
            return (
              <React.Fragment key={sectionId}>
                {renderElements(field.elements || [], sectionPath)}
              </React.Fragment>
            );
          }

          // fall through to normal section rendering when within active branch
        } else if (!parentSectionPath.includes(activeDrilldownSectionId)) {
          return null;
        }
      }

      if (field.type === 'Section') {
        const sectionId = field.data_name || field.key;
        const display = field.display || 'inline';

        if (!sectionId) {
          return (
            <React.Fragment key={field.key || Math.random()}>
              {renderElements(field.elements || [], parentSectionPath)}
            </React.Fragment>
          );
        }

        const sectionPath = [...parentSectionPath, sectionId];
        const sectionInfo = sectionMetadata[sectionId];
        const drilldownPath = sectionInfo?.drilldownPath ?? [];

        if (display === 'drilldown') {
          const isOnActivePath = isPathPrefix(drilldownPath, activeDrilldownPath);
          const isCurrentLevelActive =
            isOnActivePath && drilldownPath.length === activeDrilldownPath.length;

          if (activeDrilldownPath.length > 0 && !isOnActivePath) {
            return null;
          }

          if (!isOnActivePath) {
            return (
              <div key={sectionId} className={styles.drilldownInactive}>
                <div>
                  <span className={styles.sectionHeader}>📛 {field.label}</span>
                  <button
                    type="button"
                    className={styles.drilldownButton}
                    onClick={() => {
                      setActiveDrilldownForSection(sectionId);
                      markNavigationInteraction();
                      focusSectionAfterNavigation(sectionId);
                    }}
                  >
                    View &gt;
                  </button>
                </div>
              </div>
            );
          }

          if (!isCurrentLevelActive) {
            return (
              <React.Fragment key={sectionId}>
                {renderElements(field.elements || [], sectionPath)}
              </React.Fragment>
            );
          }

          return (
            <div
              key={sectionId}
              className={styles.drilldownActive}
              ref={(node) => registerSectionNode(sectionId, node)}
              tabIndex={-1}
            >
              <button
                className={styles.backButton}
                onClick={() => handleDrilldownBack(sectionId)}
              >
                &lt; Back
              </button>
              <h3 className={styles.sectionHeader}>{field.label}</h3>
              {renderElements(field.elements || [], sectionPath)}
            </div>
          );
        }

        return (
          <div
            key={sectionId}
            className={styles.section}
            ref={(node) => registerSectionNode(sectionId, node)}
            tabIndex={-1}
          >
            <h3 className={styles.sectionHeader}>{field.label}</h3>
            {renderElements(field.elements || [], sectionPath)}
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
          onFocus={() => handleFieldFocus(field.data_name)}
          labelPosition={labelPosition}
          labelWidthPercent={labelWidthPercent}
        />
      );
    });
  };

  return (
    <ThemeProvider themeClass={themeClass}>
      <div style={{ display: 'flex', gap: '0', width: '100%' }}>
        {hasNavigableSections && !simplifiedMode && (
          <NavigationTree
            sections={sectionTree}
            highlightedSections={highlightedSections}
            onNavigate={handleNavigate}
          />
        )}
        <form
          onSubmit={handleSubmit}
          className={`${styles.form} ${themeClass} ${className}`}
          style={{ flex: 1 }}
          //style={{ '--label-width': `${labelWidthPercent}%` }}
          //style={{ width: formWidth }}
          {...rest}
        >
          {renderRecordSummary()}
          {renderRecordMetadata()}
          {renderElements(baseElements)}
          {mode !== 'readonly' && (
            <button type="submit" className={styles.button}>
              Submit
            </button>
          )}
          {debug && <pre className={styles.debugPanel}>{debugText}</pre>}
        </form>
      </div>

      {activeAlert && typeof document !== 'undefined' && createPortal(
        <div
          className={styles.alertOverlay}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="form0-react-alert-title"
          aria-describedby="form0-react-alert-message"
          onClick={handleAlertOverlayClick}
        >
          <div className={`${styles.alertDialog} ${themeClass}`}>
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
        </div>,
        document.body
      )}
    </ThemeProvider>
  );
}
