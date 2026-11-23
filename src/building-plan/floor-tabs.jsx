import React from 'react';
import { Plus, Redo2, Undo2 } from 'lucide-react';
import { planText } from './plan-text.js';
import { planShortcut } from './plan-shortcuts.js';
import { DEFAULT_PLAN_LAYERS } from './plan-layers.jsx';
import { PlanShowMenu } from './plan-show-menu.jsx';
import * as styles from './floor-tabs.css.js';

/**
 * The row above the plan canvas: the floors as one segmented control (they switch the floor the
 * canvas shows), "+" to add a floor where the plan page allows it, the floor drawn under the one
 * shown (`below`, its name, while its layer is on), the plan's issues (`issues`, "n issues" and
 * its list), "Show" with the plan's layers (`layers`, switched through `onLayer`) and Undo / Redo
 * where the canvas edits. Names and shortcuts show in the plan tooltip.
 * @param {{
 *   tabs: Array<{ index: number, label: string, active: boolean }>,
 *   below?: string | null,
 *   onSelect: (index: number) => void,
 *   onAdd?: (() => void) | null,
 *   history?: { canUndo: boolean, canRedo: boolean, onUndo: () => void, onRedo: () => void } | null,
 *   viewOnly?: boolean,
 *   issues?: React.ReactNode,
 *   layers?: typeof DEFAULT_PLAN_LAYERS,
 *   onLayer?: ((key: string, on: boolean) => void) | null,
 * }} props
 */
export function FloorTabs({
  tabs,
  below = null,
  onSelect,
  onAdd = null,
  history = null,
  viewOnly = false,
  issues = null,
  layers = DEFAULT_PLAN_LAYERS,
  onLayer = null,
}) {
  const belowShown = Boolean(below) && layers.floorBelow !== false;
  // The Show menu's layers (step 2, S2); one this floor doesn't have is listed disabled.
  const layerItems = onLayer
    ? [
        {
          key: 'floorBelow',
          label: planText('plan.show.floorBelow'),
          hint: below
            ? planText('plan.show.floorBelowHint', { floor: below })
            : planText('plan.show.floorBelowNone'),
          on: layers.floorBelow !== false,
          disabled: !below,
        },
      ]
    : [];
  const show = layerItems.length > 0;
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
      {belowShown && (
        <span className={styles.below}>{planText('plan.floor.below', { floor: below })}</span>
      )}
      {(viewOnly || issues || show || history) && (
        <div className={styles.end}>
          {viewOnly && <span className={styles.viewOnly}>{planText('plan.viewOnly')}</span>}
          {issues}
          {show && <PlanShowMenu items={layerItems} onToggle={onLayer} />}
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
      )}
    </div>
  );
}
