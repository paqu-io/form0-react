import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Layers } from 'lucide-react';
import { planText } from './plan-text.js';
import { OPEN_ATTRIBUTE } from '../field-components/choice-dropdown-layout.js';
import * as styles from './plan-show-menu.css.js';

/**
 * "Show" in the floor row (step 2, S1): the plan's read-only layers as switches. A dot on the
 * button while one that applies here and is on by default is off (bands are off by default, D1b).
 * A switch that doesn't apply here (no floor below) is listed disabled; with none that applies the
 * button stays, disabled (2a hand test).
 * @param {{
 *   items: Array<{
 *     key: string,
 *     label: string,
 *     hint?: string,
 *     on: boolean,
 *     disabled?: boolean,
 *     offByDefault?: boolean,
 *   }>,
 *   onToggle: (key: string, on: boolean) => void,
 *   disabledHint?: string | null,
 * }} props `disabledHint`: the menu doesn't apply here (Front, A2): the button disabled, this
 *   its tooltip
 */
export function PlanShowMenu({ items, onToggle, disabledHint = null }) {
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
  const someOff = items.some((item) => !item.on && !item.disabled && !item.offByDefault);
  const usable = !disabledHint && items.some((item) => !item.disabled);
  const title = planText('plan.show.title');
  return (
    <div
      ref={rootRef}
      className={styles.root}
      data-tooltip={disabledHint || undefined}
      {...(open ? { [OPEN_ATTRIBUTE]: '' } : {})}
    >
      <button
        type="button"
        className={styles.button}
        aria-expanded={open}
        aria-controls={`${id}-menu`}
        aria-label={someOff ? `${title} · ${planText('plan.show.someOff')}` : title}
        data-tooltip={disabledHint ? undefined : title}
        // Its root shows the tooltip of a menu that doesn't apply.
        style={disabledHint ? { pointerEvents: 'none' } : undefined}
        disabled={!usable}
        onClick={() => setOpen((value) => !value)}
      >
        <Layers size={15} strokeWidth={2} aria-hidden="true" />
        {planText('plan.show.button')}
        <ChevronDown size={14} strokeWidth={2.25} aria-hidden="true" />
        {someOff && <span className={styles.dot} aria-hidden="true" />}
      </button>
      {open && usable && (
        <div id={`${id}-menu`} className={styles.menu} role="group" aria-label={title}>
          {items.map((item) => (
            <label
              key={item.key}
              className={styles.item}
              data-disabled={item.disabled || undefined}
            >
              <input
                type="checkbox"
                className={styles.check}
                checked={item.on}
                disabled={item.disabled}
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
