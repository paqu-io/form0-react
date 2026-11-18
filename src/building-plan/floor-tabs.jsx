import React from 'react';
import { Plus, Redo2, Undo2 } from 'lucide-react';
import { planText } from './plan-text.js';
import { planShortcut } from './plan-shortcuts.js';
import * as styles from './floor-tabs.css.js';

/**
 * The row above the plan canvas: the floors as one segmented control (they switch the floor the
 * canvas shows), "+" to add a floor where the plan page allows it, and Undo / Redo where the
 * canvas edits. Names and shortcuts show in the plan tooltip.
 * @param {{
 *   tabs: Array<{ index: number, label: string, active: boolean }>,
 *   onSelect: (index: number) => void,
 *   onAdd?: (() => void) | null,
 *   history?: { canUndo: boolean, canRedo: boolean, onUndo: () => void, onRedo: () => void } | null,
 *   viewOnly?: boolean,
 * }} props
 */
export function FloorTabs({ tabs, onSelect, onAdd = null, history = null, viewOnly = false }) {
  return (
    <div className={styles.row}>
      <div className={styles.tabs} role="tablist" aria-label={planText('plan.floor.tabs')}>
        {tabs.length === 0 && <span className={styles.empty}>{planText('plan.floor.none')}</span>}
        {tabs.map((floor) => (
          <button
            key={floor.index}
            type="button"
            role="tab"
            className={styles.tab}
            aria-selected={floor.active}
            onClick={() => onSelect(floor.index)}
          >
            {floor.label}
          </button>
        ))}
        {onAdd && (
          <button
            type="button"
            className={styles.iconButton}
            onClick={onAdd}
            aria-label={planText('plan.floor.add')}
            data-tooltip={planText('plan.floor.add')}
          >
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        )}
      </div>
      {viewOnly && <span className={styles.viewOnly}>{planText('plan.viewOnly')}</span>}
      {history && (
        <div className={styles.history}>
          <button
            type="button"
            className={styles.iconButton}
            disabled={!history.canUndo}
            onClick={history.onUndo}
            aria-label={planText('plan.history.undo')}
            aria-keyshortcuts={planShortcut('Z')}
            data-tooltip={planText('plan.history.undo')}
            data-shortcut={planShortcut('Z')}
          >
            <Undo2 size={16} strokeWidth={2} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={styles.iconButton}
            disabled={!history.canRedo}
            onClick={history.onRedo}
            aria-label={planText('plan.history.redo')}
            aria-keyshortcuts={planShortcut('Y')}
            data-tooltip={planText('plan.history.redo')}
            data-shortcut={planShortcut('Y')}
          >
            <Redo2 size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
