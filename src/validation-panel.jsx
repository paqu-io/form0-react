import React, { useEffect, useRef, useState } from 'react';
import * as styles from './navigation-tree.css.js';
import { getValidationPage, VALIDATION_PAGE_SIZE } from './utils/validation-pagination.js';

/**
 * The Validation tab's list (moved out of `navigation-tree.jsx`, 2026-11-25): the findings a page
 * at a time. After a failed Save or Submit (`focusFirst`), the list goes back to its first page
 * and its first finding takes the focus, so keyboard and screen reader users land on what blocks
 * the save; `onFocused` reports it done.
 * @param {{
 *   issues: object[],
 *   enabled: boolean,
 *   onSelect?: (issue: object) => void,
 *   onResolve?: (issue: object) => Promise<void>,
 *   focusFirst?: boolean,
 *   onFocused?: () => void,
 * }} props
 */
export function ValidationPanel({ issues, enabled, onSelect, onResolve, focusFirst, onFocused }) {
  const [issueOffset, setIssueOffset] = useState(0);
  const page = getValidationPage(issueOffset, issues.length);
  useEffect(() => setIssueOffset(page.offset), [page.offset]);
  const listRef = useRef(null);
  useEffect(() => {
    if (!focusFirst) return;
    if (page.offset !== 0) {
      setIssueOffset(0);
      return;
    }
    listRef.current?.querySelector('button')?.focus();
    onFocused?.();
  }, [focusFirst, page.offset]);

  if (!enabled) {
    return (
      <div className={styles.validationEmptyState}>
        Submit or validate the form to view validation results.
      </div>
    );
  }
  if (!issues.length) {
    return <div className={styles.validationEmptyState}>No validation issues.</div>;
  }
  return (
    <ul ref={listRef} className={styles.validationList}>
      {issues.slice(page.offset, page.end).map((issue) => (
        <li key={issue.id} className={styles.validationItem}>
          <ValidationFinding issue={issue} onSelect={onSelect} onResolve={onResolve} />
        </li>
      ))}
      {page.hasPages && (
        <li className={styles.validationPager}>
          <button
            type="button"
            className={styles.validationPageButton}
            aria-label="Previous"
            title="Previous findings"
            disabled={!page.hasPrevious}
            onClick={() => setIssueOffset(page.offset - VALIDATION_PAGE_SIZE)}
          >
            <span aria-hidden="true">‹</span>
          </button>
          <span className={styles.validationPageCount} aria-live="polite">
            {page.offset + 1}–{page.end} of {issues.length}
          </span>
          <button
            type="button"
            className={styles.validationPageButton}
            aria-label="Next"
            title="Next findings"
            disabled={!page.hasNext}
            onClick={() => setIssueOffset(page.offset + VALIDATION_PAGE_SIZE)}
          >
            <span aria-hidden="true">›</span>
          </button>
        </li>
      )}
    </ul>
  );
}

function ValidationFinding({ issue, onSelect, onResolve }) {
  const [busy, setBusy] = useState(false);
  const content = (
    <>
      <div className={styles.validationHeader}>
        <span>{issue.label}</span>
        <span className={styles.validationField}>
          {[issue.recordPathLabel, issue.planField ? null : issue.fieldName || 'Record']
            .filter(Boolean)
            .join(' · ')}
        </span>
      </div>
      <div className={styles.validationMessage}>
        {(issue.messages?.length ? issue.messages : ['Validation error']).map((message, index) => (
          <span key={index}>{message}</span>
        ))}
      </div>
    </>
  );
  if (!issue.hidden)
    return (
      <button type="button" className={styles.validationButton} onClick={() => onSelect?.(issue)}>
        {content}
      </button>
    );
  return (
    <div className={styles.validationButton}>
      {content}
      <p>
        This value is hidden. Make the field visible to correct it, or ask the application to
        resolve it.
      </p>
      {onResolve ? (
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onResolve(issue);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? 'Resolving…' : 'Resolve hidden value'}
        </button>
      ) : null}
    </div>
  );
}
