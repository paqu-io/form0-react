import React from 'react';
import * as styles from './form-renderer.css.js';

/**
 * The record row under the form name: a status bar, the record's title and, when the form has
 * a status, its name. Used by the form header and the repeatable entry dialog.
 * @param {{
 *   title: string,
 *   statusInfo?: { color?: string, label?: string, disabled?: boolean } | null,
 *   ariaLabel: string,
 *   className?: string,
 * }} props
 */
export function RecordSummary({ title, statusInfo, ariaLabel, className }) {
  const disabled = Boolean(statusInfo?.disabled);
  const label = statusInfo?.label || '';
  const barStyle =
    !disabled && statusInfo?.color ? { backgroundColor: statusInfo.color } : undefined;

  return (
    <div
      className={className ? `${styles.recordSummary} ${className}` : styles.recordSummary}
      role="group"
      aria-label={ariaLabel}
    >
      {/* The status is named by the text at the end of the row, so the bar is decorative. */}
      <span
        className={disabled ? styles.recordSummaryStatusDisabled : styles.recordSummaryStatus}
        style={barStyle}
        aria-hidden="true"
      />
      <div className={styles.recordSummaryContent}>
        <div className={styles.recordSummaryTitle}>{title}</div>
      </div>
      {label ? (
        <span className={styles.recordSummaryStatusText}>
          <span className={styles.srOnly}>Status: </span>
          {disabled ? `${label} (disabled)` : label}
        </span>
      ) : disabled ? (
        <span className={styles.recordSummaryStatusText}>Status disabled</span>
      ) : null}
    </div>
  );
}
