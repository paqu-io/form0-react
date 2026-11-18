import React, { useRef, useState } from 'react';
import { ChevronRight, List, Plus, Trash2 } from 'lucide-react';
import * as styles from './form-renderer.css.js';
import { RemoveEntryDialog } from './remove-entry-dialog.jsx';

/**
 * A repeatable section's entries, as one list: each row opens its entry, and while editing a
 * trash button at the row's end removes it after a confirmation, as on mobile. Used by the
 * repeatable lists (root and nested) and by the building plan's floor list.
 * @param {{
 *   entries: Array<{ id: string, title: string }>,
 *   label?: string,
 *   readOnly?: boolean,
 *   onOpen: (id: string) => void,
 *   onRemove?: (id: string) => void,
 * }} props
 */
export function RepeatableEntryRows({ entries, label, readOnly, onOpen, onRemove }) {
  const [pending, setPending] = useState(null);
  // The trash button that asked, to give it the focus back when the removal is cancelled.
  const askedFrom = useRef(null);
  const closeDialog = () => {
    setPending(null);
    const trigger = askedFrom.current;
    askedFrom.current = null;
    if (trigger?.isConnected) trigger.focus();
  };
  return (
    <>
      <RemovableEntryList
        entries={entries}
        label={label}
        readOnly={readOnly}
        onOpen={onOpen}
        onRemove={
          typeof onRemove === 'function'
            ? (entry, trigger) => {
                askedFrom.current = trigger;
                setPending(entry);
              }
            : undefined
        }
      />
      {pending ? (
        <RemoveEntryDialog
          entryTitle={pending.title}
          onCancel={closeDialog}
          onConfirm={() => {
            askedFrom.current = null;
            setPending(null);
            onRemove(pending.id);
          }}
        />
      ) : null}
    </>
  );
}

function RemovableEntryList({ entries, label, readOnly, onOpen, onRemove }) {
  return (
    // Named after its section, so assistive technology announces which list this is.
    <ul className={styles.repeatableEntryList} aria-label={label || undefined}>
      {entries.map(({ id, title }, index) => (
        <li key={id ?? index} className={styles.repeatableEntryRow}>
          <button type="button" className={styles.repeatableEntryOpen} onClick={() => onOpen(id)}>
            <span className={styles.repeatableEntryTitle}>{title}</span>
            <ChevronRight
              className={styles.repeatableEntryChevron}
              size={18}
              strokeWidth={2}
              aria-hidden="true"
            />
          </button>
          {!readOnly && typeof onRemove === 'function' ? (
            <button
              type="button"
              className={styles.repeatableEntryRemove}
              onClick={(event) => onRemove({ id, title }, event.currentTarget)}
              aria-label={`Remove ${title}`}
              title="Remove"
            >
              <Trash2 size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/**
 * Shown while a repeatable section has no entries. While editing it offers the first Add
 * where the eye already is; the page header keeps its own Add.
 * @param {{ readOnly?: boolean, onAdd?: () => void }} props
 */
export function RepeatableEmptyState({ readOnly, onAdd }) {
  const canAdd = !readOnly && typeof onAdd === 'function';
  return (
    <div className={styles.repeatableEmptyState}>
      <List className={styles.repeatableEmptyIcon} size={22} strokeWidth={2} aria-hidden="true" />
      <span className={styles.repeatableEmptyTitle}>No entries yet</span>
      {canAdd ? (
        <>
          <span className={styles.repeatableEmptyHint}>Each entry you add appears here.</span>
          <button type="button" className={styles.repeatableEmptyAdd} onClick={onAdd}>
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
            Add the first entry
          </button>
        </>
      ) : null}
    </div>
  );
}

/** The number of entries beside a list's title. */
export function RepeatableCount({ count }) {
  return (
    <span
      className={`${styles.repeatableCountPill} ${
        count > 0 ? styles.repeatableCountPillFilled : styles.repeatableCountPillEmpty
      }`}
    >
      {count}
    </span>
  );
}
