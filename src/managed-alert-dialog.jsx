// The dialog that ALERT and MESSAGEBOX open: a title, a message, an optional answer input and
// any number of buttons (the first is the primary one).
//
// When it closes, its backdrop stays for a moment and fades. A MESSAGEBOX whose answer opens
// another dialog (an ALERT from its callback) is answered first and the next dialog is queued a
// little later, once the engine has run the callback; without the lingering backdrop the page
// showed through for those frames, as a flash. The next dialog reuses the backdrop.
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import * as styles from './form-renderer.css.js';

const LINGER_MS = 200;

/**
 * @param {object} props
 * @param {object | null} props.alert the active dialog: title, message, input, placeholder,
 *   buttons ([{ id, label }]; one OK button by default)
 * @param {Element | null} props.portalTarget
 * @param {string} props.themeClass
 * @param {React.Ref} props.dialogRef
 * @param {React.Ref} props.firstButtonRef
 * @param {string} props.input the answer typed in the input
 * @param {(value: string) => void} props.onInputChange
 * @param {() => void} props.onClose the × button
 * @param {(button: { id: string, label: string }) => void} props.onAnswer
 */
export function ManagedAlertDialog({
  alert,
  portalTarget,
  themeClass,
  dialogRef,
  firstButtonRef,
  input,
  onInputChange,
  onClose,
  onAnswer,
}) {
  const [lingering, setLingering] = useState(false);
  const [previous, setPrevious] = useState(alert);
  if (previous !== alert) {
    setPrevious(alert);
    setLingering(Boolean(previous) && !alert);
  }
  useEffect(() => {
    if (!lingering) return undefined;
    const timer = setTimeout(() => setLingering(false), LINGER_MS);
    return () => clearTimeout(timer);
  }, [lingering]);

  if (!portalTarget || (!alert && !lingering)) return null;
  if (!alert) {
    // The same element as the open overlay, so a dialog that follows keeps the backdrop.
    return createPortal(
      <div className={styles.alertOverlay} data-closing="true" aria-hidden="true" />,
      portalTarget
    );
  }
  return createPortal(
    <div
      className={styles.alertOverlay}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="form0-react-alert-title"
      aria-describedby="form0-react-alert-message"
    >
      <div className={`${styles.alertDialog} ${themeClass}`} ref={dialogRef} tabIndex={-1}>
        <button
          type="button"
          className={styles.alertCloseButton}
          aria-label="Close alert"
          onClick={onClose}
        >
          ×
        </button>
        <h3 id="form0-react-alert-title" className={styles.alertTitle}>
          {alert.title}
        </h3>
        <div id="form0-react-alert-message" className={styles.alertMessage}>
          {alert.message || ''}
          {alert.input && (
            <input
              aria-label={alert.placeholder || 'Response'}
              placeholder={alert.placeholder}
              value={input}
              onChange={(event) => onInputChange(event.target.value)}
            />
          )}
        </div>
        <div className={styles.alertFooter}>
          {(alert.buttons || [{ id: 'OK', label: 'OK' }]).map((button, index) => (
            <button
              key={button.id}
              type="button"
              ref={index === 0 ? firstButtonRef : undefined}
              className={styles.alertOkButton}
              onClick={() => onAnswer(button)}
            >
              {button.label}
            </button>
          ))}
        </div>
      </div>
    </div>,
    portalTarget
  );
}
