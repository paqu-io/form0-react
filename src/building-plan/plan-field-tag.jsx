import React, { useEffect, useId, useRef, useState } from 'react';
import { Columns2 } from 'lucide-react';
import { OPEN_ATTRIBUTE } from '../field-components/choice-dropdown-layout.js';
import * as styles from './plan-field-tag.css.js';

/**
 * A building plan field's tag, after its label (`field-tag.js`). With a note (a whole-wall field of
 * a wall other rooms share), the tag is a button that opens it: a click, a tap, or Enter or Space
 * on it. A click elsewhere or Esc closes it (Esc goes no further: the dialog stays open); while
 * open it is marked as an open dropdown, so a dialog's shortcuts leave its keys to it. Decided
 * with a mockup, 2026-11-23.
 * @param {{ text: string, note?: { title: string, body: string } | null, className: string }} props
 *   `className`: the field's tag style
 */
export function PlanFieldTag({ text, note = null, className }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const id = useId();

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

  if (!note) return <span className={className}>{text}</span>;
  return (
    <span ref={rootRef} className={styles.root} {...(open ? { [OPEN_ATTRIBUTE]: '' } : {})}>
      <button
        type="button"
        className={`${className} ${styles.shared}`}
        aria-expanded={open}
        aria-controls={id}
        aria-label={`${text}: ${note.title}`}
        onClick={() => setOpen((value) => !value)}
      >
        <Columns2 size={12} strokeWidth={2.4} aria-hidden="true" />
        {text}
      </button>
      <span id={id} role="status" className={styles.note} hidden={!open}>
        {open ? (
          <>
            <span className={styles.noteTitle}>{note.title}</span>
            <span className={styles.noteBody}>{note.body}</span>
          </>
        ) : null}
      </span>
    </span>
  );
}
