import React, { useEffect, useMemo, useRef } from 'react';
import {
  createChangeLabels,
  displaySubmissionValue as display,
  submissionMessages,
} from './utils/submission-presentation.js';
export { submissionMessages } from './utils/submission-presentation.js';

export function SubmissionReview({ state, schema, snapshot, messages: overrides }) {
  const messages = { ...submissionMessages, ...overrides };
  const label = useMemo(
    () => (state.review ? createChangeLabels(schema, snapshot) : () => ''),
    [schema, snapshot]
  );
  const dialog = useRef(null);
  useEffect(() => {
    if (!state.review) return;
    const previous = document.activeElement;
    dialog.current?.querySelector('button')?.focus();
    return () => previous?.focus?.();
  }, [state.review?.preparationId]);
  if (!state.review) return null;
  const review = state.review;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: '#0008',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label={messages.title}
        style={{
          background: 'Canvas',
          color: 'CanvasText',
          borderRadius: 12,
          padding: 24,
          maxWidth: 760,
          width: '90%',
          maxHeight: '85vh',
          overflow: 'auto',
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            state.choose('cancel');
          }
          if (event.key === 'Tab') {
            const buttons = [...dialog.current.querySelectorAll('button:not([disabled])')];
            const first = buttons[0],
              last = buttons.at(-1);
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <h2>{messages.title}</h2>
        <p>{messages.explanation}</p>
        <p>
          {review.childChangeCount} {messages.childCalculations} · {review.changeCount}{' '}
          {messages.totalChanges}
        </p>
        <ul>
          {(review.page?.changes || []).map((change, index) => (
            <li key={review.offset + index}>
              <strong>{label(change)}</strong>: {display(change.before)} → {display(change.after)}
            </li>
          ))}
        </ul>
        {review.page?.issues?.length ? <p role="alert">{review.page.issues[0].message}</p> : null}
        <div>
          <button
            type="button"
            disabled={!review.offset}
            onClick={() => state.page(Math.max(0, review.offset - 50))}
          >
            {messages.previous}
          </button>
          <button
            type="button"
            disabled={review.offset + 50 >= review.changeCount}
            onClick={() => state.page(review.offset + 50)}
          >
            {messages.next}
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
          <button type="button" onClick={() => state.choose('refresh')}>
            {messages.refresh}
          </button>
          {review.choices.includes('retain') ? (
            <button type="button" onClick={() => state.choose('retain')}>
              {messages.retain}
            </button>
          ) : null}
          <button type="button" onClick={() => state.choose('cancel')}>
            {messages.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}
