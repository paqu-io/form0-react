import React from 'react';
import { CircleAlert, Lock, X } from 'lucide-react';
import { planText, planTextParts } from './plan-text.js';
import { isMacPlatform } from './plan-shortcuts.js';
import * as styles from './plan-status.css.js';

/** The status line before the canvas reports anything. */
export const NO_STATUS = Object.freeze({
  hintKey: null,
  noteKey: null,
  messages: [],
  index: 0,
  codes: [],
});

/**
 * The line over the canvas's bottom-left corner: what the current tool does, or, when core has
 * refused an edit, why. A refusal is red, with "1 of 2" to step through several messages and ×
 * to dismiss them; the canvas draws its ghost and outline meanwhile. One live region throughout,
 * so a screen reader hears each change. A note follows the hint (step 2: the room's lengths'
 * unit, or that they show when zoomed in). A canvas that edits nothing says so first, "View
 * only" or "Read only" (2026-11-26, in place of the floor row's badge).
 * @param {{
 *   access?: 'view' | 'read' | null,
 *   hintKey?: string | null,
 *   noteKey?: string | null,
 *   messages?: string[],
 *   index?: number,
 *   codes?: string[],
 *   onStep?: () => void,
 *   onDismiss?: () => void,
 * }} props
 */
export function PlanStatus({
  access = null,
  hintKey = null,
  hintParams = null,
  noteKey = null,
  messages = [],
  index = 0,
  codes = [],
  onStep,
  onDismiss,
}) {
  const refused = messages.length > 0;
  const current = Math.min(index, messages.length - 1);
  let content = null;
  if (refused) {
    const position = planText('plan.message.position', {
      index: current + 1,
      total: messages.length,
    });
    content = (
      <>
        <CircleAlert size={14} strokeWidth={2.25} aria-hidden="true" className={styles.icon} />
        <span className={styles.text}>{messages[current]}</span>
        {messages.length > 1 && (
          <button
            type="button"
            className={styles.step}
            onClick={onStep}
            aria-label={`${position} · ${planText('plan.message.next')}`}
            data-tooltip={planText('plan.message.next')}
          >
            {position}
          </button>
        )}
        <button
          type="button"
          className={styles.dismiss}
          onClick={onDismiss}
          aria-label={planText('plan.message.dismiss')}
          data-tooltip={planText('plan.message.dismiss')}
        >
          <X size={14} strokeWidth={2.25} aria-hidden="true" />
        </button>
      </>
    );
  } else if (hintKey || noteKey) {
    const mac = isMacPlatform();
    const caps = { alt: mac ? '⌥' : 'Alt', shift: mac ? '⇧' : 'Shift' };
    const note = noteKey ? planText(noteKey) : '';
    content = (
      <>
        {hintKey &&
          planTextParts(hintKey).map((part, i) =>
            // A placeholder the hint fills is text (a name); the others are key caps.
            part.key && hintParams?.[part.key] != null ? (
              <React.Fragment key={i}>{String(hintParams[part.key])}</React.Fragment>
            ) : part.key ? (
              <kbd key={i} className={styles.kbd}>
                {caps[part.key] || part.key}
              </kbd>
            ) : (
              <React.Fragment key={i}>{part.text}</React.Fragment>
            )
          )}
        {note && (hintKey ? ` · ${note}` : note.charAt(0).toUpperCase() + note.slice(1))}
      </>
    );
  }
  return (
    <div
      role="status"
      className={`${styles.line} ${refused ? styles.refusal : ''}`}
      hidden={!content && !access}
      data-codes={refused && codes.length ? codes.join(' ') : undefined}
    >
      {access && (
        <span className={styles.access}>
          <Lock size={12} strokeWidth={2.5} aria-hidden="true" />
          {planText(access === 'read' ? 'plan.readOnly' : 'plan.viewOnly')}
        </span>
      )}
      {content}
    </div>
  );
}
