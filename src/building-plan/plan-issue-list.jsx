import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, CircleAlert } from 'lucide-react';
import { planText } from './plan-text.js';
import * as styles from './plan-issue-list.css.js';

/**
 * "n issues" in the floor row and the list it opens (1e, M2): the validation findings of the
 * plan in scope. A click on an item selects its element on the canvas (and the entry's list
 * marks its row); a double-click opens the item's entry. Nothing shows without findings.
 * @param {{
 *   items: Array<{ key: string, title: string, detail: string }>,
 *   onSelect: (item: object) => void,
 *   onOpen: (item: object) => void,
 * }} props
 */
export function PlanIssueList({ items, onSelect, onOpen }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const rootRef = useRef(null);
  const count = items.length;

  useEffect(() => {
    if (!count) setOpen(false);
  }, [count]);

  // A click elsewhere or Esc closes the list (Esc goes no further: the dialog stays open).
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open]);

  if (!count) return null;
  const label = planText(count === 1 ? 'plan.issues.one' : 'plan.issues.other', { count });
  return (
    <div ref={rootRef} className={styles.root}>
      <button
        type="button"
        className={styles.chip}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <CircleAlert size={14} strokeWidth={2.25} aria-hidden="true" />
        {label}
        <ChevronDown size={14} strokeWidth={2.25} aria-hidden="true" />
      </button>
      {open && (
        <ul className={styles.list} aria-label={planText('plan.issues.list')}>
          {items.map((item) => (
            <li key={item.key}>
              <button
                type="button"
                className={styles.item}
                aria-current={current === item.key ? 'true' : undefined}
                data-tooltip={planText('plan.issues.open')}
                onClick={() => {
                  setCurrent(item.key);
                  onSelect(item);
                }}
                onDoubleClick={() => {
                  setOpen(false);
                  onOpen(item);
                }}
              >
                <span className={styles.dot} aria-hidden="true">
                  !
                </span>
                <span className={styles.text}>
                  <span className={styles.title}>{item.title}</span>
                  <span className={styles.detail}>{item.detail}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
