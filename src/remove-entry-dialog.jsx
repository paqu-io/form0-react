import React, { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Trash2 } from 'lucide-react';
import * as styles from './form-renderer.css.js';
import { useThemeClass } from './theme-context';
import { useFocusTrap } from './use-focus-trap.js';

const DIALOG_ATTRIBUTE = 'data-form0-remove-entry-dialog';

// The same shortcuts as the discard dialog: Alt+Q cancels, Alt+Y confirms (⌥ on Apple devices).
const altPrefix = () => {
  const platform =
    typeof navigator === 'undefined'
      ? ''
      : navigator.userAgentData?.platform || navigator.platform || '';
  return /mac|ip(hone|ad|od)/i.test(platform) ? '⌥' : 'Alt';
};
const isPlainAlt = (event) => event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;
// By physical key, since Alt changes the character on some layouts (⌥Q types œ on a Mac).
const isKey = (event, code, key) =>
  event.code ? event.code === code : String(event.key).toLowerCase() === key;

/**
 * Whether a key event comes from inside the remove confirmation. The form's global shortcuts
 * (Alt+S, Escape) leave those events to the dialog.
 * @param {Event} event
 * @returns {boolean}
 */
export function isRemoveEntryDialogEvent(event) {
  return Boolean(event?.target?.closest?.(`[${DIALOG_ATTRIBUTE}]`));
}

/**
 * Asks before an entry is removed, with the same words as on mobile. Cancel has the focus;
 * Escape and Alt+Q cancel, Alt+Y removes; focus stays in the dialog until it closes.
 * @param {{ entryTitle?: string, onCancel: () => void, onConfirm: () => void }} props
 */
export function RemoveEntryDialog({ entryTitle, onCancel, onConfirm }) {
  const themeClass = useThemeClass();
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const titleId = useId();
  const messageId = useId();
  useFocusTrap(true, dialogRef, { initialFocusRef: cancelRef });
  const prefix = altPrefix();

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div
      className={styles.alertOverlay}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={messageId}
      {...{ [DIALOG_ATTRIBUTE]: '' }}
      onKeyDown={(event) => {
        const cancel = event.key === 'Escape' || (isPlainAlt(event) && isKey(event, 'KeyQ', 'q'));
        const confirm = !cancel && isPlainAlt(event) && isKey(event, 'KeyY', 'y');
        if (!cancel && !confirm) return;
        event.preventDefault();
        event.stopPropagation();
        if (cancel) onCancel();
        else onConfirm();
      }}
    >
      <div className={`${styles.alertDialog} ${themeClass || ''}`} ref={dialogRef} tabIndex={-1}>
        <h3 id={titleId} className={styles.alertTitle}>
          Remove this entry?
        </h3>
        {/* Two lines, one gap: the message lays its children out with a gap between each. */}
        <p id={messageId} className={styles.alertMessage}>
          {entryTitle ? <strong>{entryTitle}</strong> : null}
          <span>This cannot be undone.</span>
        </p>
        <div className={styles.confirmDialogActions}>
          <button
            type="button"
            className={styles.confirmSecondaryButton}
            ref={cancelRef}
            onClick={onCancel}
          >
            Cancel
            <span className={styles.shortcutBadge} aria-hidden="true">
              {`${prefix}+Q`}
            </span>
          </button>
          <button type="button" className={styles.confirmPrimaryButton} onClick={onConfirm}>
            <Trash2 size={16} strokeWidth={2} aria-hidden="true" />
            Remove
            <span className={styles.shortcutBadge} aria-hidden="true">
              {`${prefix}+Y`}
            </span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
