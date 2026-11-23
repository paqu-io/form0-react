import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Layers } from 'lucide-react';
import { planText } from './plan-text.js';
import { OPEN_ATTRIBUTE } from '../field-components/choice-dropdown-layout.js';
import * as styles from './plan-show-menu.css.js';

/**
 * "Show" in the floor row (step 2, S1): the plan's read-only layers as switches. A dot on the
 * button while one is off. Nothing shows without items.
 * @param {{
 *   items: Array<{ key: string, label: string, hint?: string, on: boolean }>,
 *   onToggle: (key: string, on: boolean) => void,
 * }} props
 */
export function PlanShowMenu({ items, onToggle }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const id = useId();

  // A click elsewhere or Esc closes the menu (Esc goes no further: the dialog stays open). While
  // open it is marked as an open dropdown, so a dialog's shortcuts leave its keys to it.
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

  if (!items.length) return null;
  const someOff = items.some((item) => !item.on);
  const title = planText('plan.show.title');
  return (
    <div ref={rootRef} className={styles.root} {...(open ? { [OPEN_ATTRIBUTE]: '' } : {})}>
      <button
        type="button"
        className={styles.button}
        aria-expanded={open}
        aria-controls={`${id}-menu`}
        aria-label={someOff ? `${title} · ${planText('plan.show.someOff')}` : title}
        data-tooltip={title}
        onClick={() => setOpen((value) => !value)}
      >
        <Layers size={15} strokeWidth={2} aria-hidden="true" />
        {planText('plan.show.button')}
        <ChevronDown size={14} strokeWidth={2.25} aria-hidden="true" />
        {someOff && <span className={styles.dot} aria-hidden="true" />}
      </button>
      {open && (
        <div id={`${id}-menu`} className={styles.menu} role="group" aria-label={title}>
          {items.map((item) => (
            <label key={item.key} className={styles.item}>
              <input
                type="checkbox"
                className={styles.check}
                checked={item.on}
                onChange={(event) => onToggle(item.key, event.target.checked)}
              />
              <span className={styles.text}>
                <span className={styles.label}>{item.label}</span>
                {item.hint && <span className={styles.hint}>{item.hint}</span>}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
