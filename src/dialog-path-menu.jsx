import React, { useEffect, useRef, useState } from 'react';
import { OPEN_ATTRIBUTE } from './field-components/choice-dropdown-layout.js';
import * as styles from './dialog-path.css.js';

const MORE_LABEL = 'Show the whole path';
const MENU_LABEL = 'Path';
const MENU_GAP = 6; // px under the "…"

/**
 * A collapsed dialog path's "…" (2026-11-26): a menu of the parts it hides, in order, each
 * stepping up to its level as pressing that part does. It opens under the "…", fixed so the
 * path's clipping doesn't cut it, its first item focused; the arrows, Home and End move through
 * the items, round. A press elsewhere, Esc (going no further: the dialog stays open) or Tab
 * closes it; while open it is marked as an open dropdown, so the dialog's shortcuts leave its keys
 * to it.
 * @param {{
 *   parts: Array<{ label: string, kind: string, target: object }>,
 *   onSelect: (target: object) => void,
 *   kindClass: (part: object) => string,
 * }} props `kindClass`: the class a part's kind takes in the path (rows in the title's colour)
 */
export function DialogPathMenu({ parts, onSelect, kindClass }) {
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const itemsRef = useRef([]);
  const [at, setAt] = useState(null);
  const open = Boolean(at);

  useEffect(() => {
    if (!open) return undefined;
    itemsRef.current[0]?.focus();
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setAt(null);
    };
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      setAt(null);
      buttonRef.current?.focus();
    };
    const onResize = () => setAt(null);
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  const toggle = () => {
    if (open) return setAt(null);
    const box = buttonRef.current.getBoundingClientRect();
    return setAt({ left: box.left, top: box.bottom + MENU_GAP });
  };
  const onMenuKeyDown = (event) => {
    if (event.key === 'Tab') return setAt(null);
    const items = itemsRef.current.filter(Boolean);
    const index = items.indexOf(document.activeElement);
    const next = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: items.length - 1 }[
      event.key
    ];
    if (next === undefined) return undefined;
    event.preventDefault();
    return items[(next + items.length) % items.length]?.focus();
  };

  return (
    <span ref={rootRef} className={styles.more} {...(open ? { [OPEN_ATTRIBUTE]: '' } : {})}>
      <button
        ref={buttonRef}
        type="button"
        className={`${styles.ancestor} ${styles.link}`}
        aria-label={MORE_LABEL}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
      >
        …
      </button>
      {open && (
        // Its own (empty) title, so the path's tooltip doesn't show over the items.
        <span
          role="menu"
          aria-label={MENU_LABEL}
          title=""
          className={styles.menu}
          style={{ left: at.left, top: at.top }}
          onKeyDown={onMenuKeyDown}
        >
          {parts.map((part, index) => (
            <button
              key={index}
              ref={(node) => {
                itemsRef.current[index] = node;
              }}
              type="button"
              role="menuitem"
              className={`${styles.menuItem} ${kindClass(part)}`}
              data-kind={part.kind}
              onClick={() => {
                setAt(null);
                onSelect(part.target);
              }}
            >
              {part.label}
            </button>
          ))}
        </span>
      )}
    </span>
  );
}
