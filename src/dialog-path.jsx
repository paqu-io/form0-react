import React, { useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import { collapsedPathParts, pathTitle } from './dialog-path-parts.js';
import { DialogPathMenu } from './dialog-path-menu.jsx';
import * as styles from './dialog-path.css.js';

/** A part's class for its kind: rows in the title's colour, lists muted (2026-11-26). */
const kindClass = (part) => (part?.kind === 'row' ? styles.row : '');

/**
 * A RepeatableSection dialog's header title (2026-11-22): the path to it, "Floors › Ground floor
 * › Rooms", the last part the title ("this entry" on a row's page, set apart, 2026-11-26). When it
 * doesn't fit between the header's buttons, its middle collapses ("Floors › … › Walls › this
 * entry"), then all but the last two ("… › Walls › this entry"). A single part renders as the
 * title did before. With `onSelect`, the parts before the title are buttons: pressing one hands
 * its `target` to `onSelect`, and the "…" opens a menu of the parts it hides (2026-11-26).
 * @param {{
 *   parts: Array<{ label: string, target: object | null }>,
 *   className?: string,
 *   onSelect?: (target: object) => void,
 * }} props
 */
export function DialogPath({ parts, className = '', onSelect }) {
  const ref = useRef(null);
  const rootRef = useRef(null);
  // 0: the whole path; 1: its middle collapsed; 2: the last two, after an ellipsis.
  const [level, setLevel] = useState(0);
  // A new width measures again even when the level is already 0 (found 2026-11-26: a window
  // narrowed while the whole path fitted kept it whole until something else drew the dialog).
  const [, remeasure] = useReducer((count) => count + 1, 0);
  const labels = parts.map((part) => part.label);
  const signature = labels.join('\u0000');

  // A new path, or a new width, starts whole; it collapses a step at a time while it overflows.
  useLayoutEffect(() => setLevel(0), [signature]);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || level >= 2 || parts.length <= 1) return;
    // The parts' own widths (they shrink with an ellipsis, so the box itself rarely overflows).
    const gap = parseFloat(getComputedStyle(node).columnGap) || 0;
    const children = [...node.children];
    const natural = children.reduce((sum, child) => sum + child.scrollWidth, 0);
    if (natural + gap * (children.length - 1) > node.clientWidth)
      setLevel(parts.length > 3 ? level + 1 : 2);
  });
  // The title's box takes the header's free width whatever it holds, so watching it (not the
  // path, which shrinks when it collapses) can't loop.
  const whole = parts.length > 1;
  useEffect(() => {
    const box = rootRef.current?.parentElement;
    if (!box || typeof ResizeObserver === 'undefined') return undefined;
    let width = box.clientWidth;
    const observer = new ResizeObserver(() => {
      if (box.clientWidth === width) return;
      width = box.clientWidth;
      setLevel(0);
      remeasure();
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, [whole]);

  if (parts.length <= 1) return <span className={className}>{labels[0] || ''}</span>;
  const shown = level ? collapsedPathParts(parts, level) : parts;
  const hidden = parts.filter((part) => !shown.includes(part) && part.target);
  const last = (part) => `${styles.current} ${part.kind === 'entry' ? styles.entry : ''}`.trimEnd();
  return (
    // The root holds the path's place; the title's box around it is watched for its width.
    <span ref={rootRef} className={styles.root}>
      <span ref={ref} className={`${styles.path} ${className}`} title={pathTitle(parts)}>
        {shown.map((part, index) => (
          <React.Fragment key={index}>
            {index > 0 && (
              <span className={styles.separator} aria-hidden="true">
                ›
              </span>
            )}
            {index === shown.length - 1 ? (
              <span className={last(part)} data-kind={part.kind}>
                {part.label}
              </span>
            ) : !part && onSelect && hidden.length ? (
              <DialogPathMenu
                key={`${signature}:${level}`}
                parts={hidden}
                onSelect={onSelect}
                kindClass={kindClass}
              />
            ) : part && part.target && onSelect ? (
              <button
                type="button"
                className={`${styles.ancestor} ${styles.link} ${kindClass(part)}`}
                data-kind={part.kind}
                onClick={() => onSelect(part.target)}
              >
                {part.label}
              </button>
            ) : (
              <span className={`${styles.ancestor} ${kindClass(part)}`} data-kind={part?.kind}>
                {part ? part.label : '…'}
              </span>
            )}
          </React.Fragment>
        ))}
      </span>
    </span>
  );
}
