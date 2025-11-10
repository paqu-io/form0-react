import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useThemeClass } from '../theme-context';
import * as styles from '../field-renderer.css.js';

const PLACEHOLDER_RECORDS_COUNT = 3;

function normalizeLinkedRecords(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }
      const recordIdRaw = typeof entry.record_id === 'string' ? entry.record_id.trim() : '';
      if (!recordIdRaw) {
        return null;
      }
      const labelRaw =
        typeof entry.label === 'string'
          ? entry.label.trim()
          : typeof entry.display_label === 'string'
            ? entry.display_label.trim()
            : null;
      const key = entry._localId || entry.local_id || recordIdRaw || `record-${index}`;

      return {
        key,
        record_id: recordIdRaw,
        label: labelRaw || null,
        original: entry,
      };
    })
    .filter(Boolean);
}

function mapToValue(items) {
  return items.map((item) => {
    const base = item.original && typeof item.original === 'object' ? { ...item.original } : {};
    const label = item.label || base.label || base.display_label || null;

    return {
      ...base,
      record_id: item.record_id,
      ...(label ? { label } : {}),
    };
  });
}

export function FormLinkFieldComponent({ field, value, readOnly, inputProps = {}, className }) {
  const themeClass = useThemeClass();
  const items = useMemo(() => normalizeLinkedRecords(value), [value]);
  const [activeModal, setActiveModal] = useState(null);
  const [placeholderSelection, setPlaceholderSelection] = useState([]);
  const previousFocusRef = useRef(null);
  const {
    id: inputId,
    name: inputName,
    readOnly: _ignoredReadOnly,
    disabled: _ignoredDisabled,
    ...restInputProps
  } = inputProps;

  const openModal = useCallback((type) => {
    previousFocusRef.current = typeof document !== 'undefined' ? document.activeElement : null;
    setActiveModal(type);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
  }, []);

  useEffect(() => {
    if (!activeModal && previousFocusRef.current) {
      previousFocusRef.current.focus?.();
      previousFocusRef.current = null;
    }
  }, [activeModal]);

  useEffect(() => {
    if (!activeModal) return;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeModal();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeModal, closeModal]);

  useEffect(() => {
    if (activeModal !== 'select') {
      setPlaceholderSelection([]);
    }
  }, [activeModal]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }
    if (!activeModal) {
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
  }, [activeModal]);

  const togglePlaceholderSelection = useCallback(
    (value) => {
      setPlaceholderSelection((prev) => {
        if (field.allow_multiple_records) {
          return prev.includes(value) ? prev.filter((entry) => entry !== value) : [...prev, value];
        }
        return prev.includes(value) ? [] : [value];
      });
    },
    [field.allow_multiple_records]
  );

  const handleOverlayClick = useCallback(
    (event) => {
      if (event.target === event.currentTarget) {
        closeModal();
      }
    },
    [closeModal]
  );

  const serializedValue = useMemo(() => {
    try {
      return JSON.stringify(mapToValue(items));
    } catch (error) {
      return '[]';
    }
  }, [items]);

  const modalTitleId = useMemo(
    () => `${field.data_name || 'form-link'}-modal-title`,
    [field.data_name]
  );

  let modalTitle = '';
  let modalPrimaryLabel = null;
  let modalBody = null;

  if (activeModal === 'create') {
    modalTitle = 'Create Linked Record';
    modalPrimaryLabel = 'Save';
    modalBody = (
      <p className={styles.formLinkModalNote}>
        Creating linked records is only available in reform. This button is included here for parity
        with the CLI preview.
      </p>
    );
  } else if (activeModal === 'select') {
    modalTitle = 'Select Linked Record(s)';
    modalPrimaryLabel = 'Select';
    modalBody = (
      <>
        <p className={styles.formLinkModalNote}>
          Selecting linked records is only available in reform. These placeholder entries exist so
          the CLI and React preview share the same affordances.
        </p>
        <div className={styles.formLinkModalPlaceholderList}>
          {Array.from({ length: PLACEHOLDER_RECORDS_COUNT }, (_, index) => {
            const placeholderId = `placeholder-${index + 1}`;
            const isMultiple = field.allow_multiple_records === true;
            const inputType = isMultiple ? 'checkbox' : 'radio';
            const checked = placeholderSelection.includes(placeholderId);
            return (
              <label key={placeholderId} className={styles.formLinkModalPlaceholderItem}>
                <input
                  type={inputType}
                  name="form-link-placeholder"
                  value={placeholderId}
                  checked={checked}
                  onChange={() => togglePlaceholderSelection(placeholderId)}
                />
                <span className={styles.formLinkModalPlaceholderLabel}>
                  Placeholder Record {index + 1}
                </span>
              </label>
            );
          })}
        </div>
      </>
    );
  } else if (activeModal === 'preview') {
    modalTitle = 'Linked Record Preview';
    modalBody = (
      <p className={styles.formLinkModalNote}>
        Record preview is not available in form0-react. Open this form inside reform to view and
        edit the full linked record details.
      </p>
    );
  }

  return (
    <div className={`${styles.formLinkField} ${className || ''}`}>
      {!readOnly && (
        <div className={styles.formLinkActions}>
          {field.allow_creating_records && (
            <button
              type="button"
              className={styles.formLinkActionButtonPrimary}
              onClick={() => openModal('create')}
            >
              Create Record
            </button>
          )}
          {(field.allow_existing_records || field.allow_multiple_records) && (
            <button
              type="button"
              className={styles.formLinkActionButtonPrimary}
              onClick={() => openModal('select')}
            >
              Select Record{field.allow_multiple_records ? 's' : ''}
            </button>
          )}
        </div>
      )}

      <div className={styles.formLinkBanner} role="note">
        The feature "FormLinkField" is not supported in form0-react. Full support available in
        reform platform only.
        <br />
        Want to learn more?{' '}
        <a
          href="https://docs.form0.dev/unsupported-features/form-link-field"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.formLinkDocsLink}
        >
          https://docs.form0.dev/unsupported-features/form-link-field
        </a>
        .
      </div>

      {activeModal && typeof document !== 'undefined' && createPortal(
        <div
          className={styles.formLinkModalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby={modalTitleId}
          onClick={handleOverlayClick}
        >
          <div className={`${styles.formLinkModal} ${themeClass}`}>
            <div className={styles.formLinkModalHeader} id={modalTitleId}>
              {modalTitle}
            </div>
            <div className={styles.formLinkModalBody}>{modalBody}</div>
            <div className={styles.formLinkModalFooter}>
              {modalPrimaryLabel ? (
                <button
                  type="button"
                  className={styles.formLinkActionButtonPrimary}
                  disabled
                  aria-disabled="true"
                >
                  {modalPrimaryLabel}
                </button>
              ) : null}
              <button
                type="button"
                className={styles.formLinkActionButton}
                onClick={closeModal}
                autoFocus
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {inputName && (
        <input
          type="text"
          id={inputId}
          name={inputName}
          value={serializedValue}
          {...restInputProps}
          className={styles.formLinkHiddenInput}
          readOnly
          tabIndex={-1}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
