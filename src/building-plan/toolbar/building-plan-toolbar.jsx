import React, { useEffect, useCallback, useMemo } from 'react';
import { MousePointer2, X, Square, DoorOpen, Grid2x2, Scissors, Pin } from 'lucide-react';
import { BeamIcon, ColumnIcon, RejoinIcon, WallIcon } from './plan-icons.jsx';
import { TOOL_MODES, getButtonsForMode } from './toolbar-config.js';
import { isPlanShortcutEvent, planShortcut, planShortcutKey } from '../plan-shortcuts.js';
import { planText } from '../plan-text.js';
import './toolbar.css.js';

/**
 * Icon component lookup by name.
 */
const ICON_MAP = {
  MousePointer2,
  X,
  Square,
  Wall: WallIcon,
  Column: ColumnIcon,
  Beam: BeamIcon,
  DoorOpen,
  Grid2x2,
  Scissors,
  Rejoin: RejoinIcon,
  Pin,
};

/** The rail's groups, top to bottom, with a separator between two that have buttons. */
const GROUPS = ['primary', 'structural', 'openings', 'editing'];

/**
 * Get the icon component for a button.
 */
function getIconComponent(iconName) {
  return ICON_MAP[iconName] || null;
}

/**
 * BuildingPlanToolbar - Floating vertical toolbar for canvas tools.
 *
 * @param {Object} props
 * @param {string} props.canvasMode - Current canvas mode ('parent' | 'floor' | 'room')
 * @param {string} props.activeToolMode - Currently active tool mode
 * @param {Function} props.onModeChange - Callback when tool mode changes
 * @param {Function} props.onClearSelection - Callback to clear current selection
 * @param {Function} [props.onCommand] - Called with a command button ("Add door", 3b)
 * @param {Record<string, string>} [props.unavailable] - Commands waiting for a selection, by id:
 *   the hint key saying what to select (the button stays focusable, so its tooltip says it)
 * @param {boolean} props.disabled - Whether the entire toolbar is disabled
 */
export function BuildingPlanToolbar({
  canvasMode = 'parent',
  activeToolMode = TOOL_MODES.SELECT,
  onModeChange,
  onClearSelection,
  onCommand,
  unavailable = {},
  disabled = false,
}) {
  // Get buttons configured for this canvas mode
  const buttons = useMemo(() => getButtonsForMode(canvasMode), [canvasMode]);

  const groups = useMemo(
    () =>
      GROUPS.map((group) => buttons.filter((btn) => btn.group === group)).filter(
        (group) => group.length > 0
      ),
    [buttons]
  );

  // Handle button click
  const handleButtonClick = useCallback(
    (button) => {
      if (disabled || !button.enabled) return;

      if (button.isAction) {
        // Action buttons (like Clear) trigger a callback
        if (button.id === 'clear' && typeof onClearSelection === 'function') {
          onClearSelection();
        } else if (button.command && typeof onCommand === 'function') {
          onCommand(button);
        }
      } else {
        // Mode buttons change the active tool
        if (typeof onModeChange === 'function') {
          onModeChange(button.mode);
        }
      }
    },
    [disabled, onModeChange, onClearSelection, onCommand]
  );

  // Keyboard shortcut handler (Alt+Shift+letter, matched on the physical key)
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleKeyDown = (event) => {
      if (!isPlanShortcutEvent(event)) {
        return;
      }

      const key = planShortcutKey(event);
      if (!key) return;

      // Find matching button
      const button = buttons.find((btn) => btn.shortcutKey === key && btn.enabled && !disabled);

      if (button) {
        event.preventDefault();
        event.stopPropagation();
        handleButtonClick(button);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [buttons, disabled, handleButtonClick]);

  // One button; its name and shortcut show in the plan tooltip.
  const renderButton = (button) => {
    const IconComponent = getIconComponent(button.icon);
    const isActive = !button.isAction && button.mode === activeToolMode;
    const isDisabled = disabled || !button.enabled;
    const waiting = !isDisabled && unavailable[button.id];
    const shortcut = planShortcut(button.shortcutKey);

    return (
      <div key={button.id} className="building-plan-toolbar-item">
        <button
          type="button"
          className={`building-plan-toolbar-btn ${isActive ? 'active' : ''} ${waiting ? 'is-unavailable' : ''}`}
          disabled={isDisabled}
          aria-disabled={waiting ? 'true' : undefined}
          onClick={() => handleButtonClick(button)}
          data-tooltip={waiting ? planText(waiting) : button.label}
          data-shortcut={shortcut || undefined}
          aria-label={button.label}
          aria-keyshortcuts={shortcut || undefined}
          aria-pressed={isActive}
        >
          {IconComponent && <IconComponent />}
        </button>
      </div>
    );
  };

  return (
    <div className="building-plan-toolbar-float" role="toolbar" aria-label="Canvas tools">
      {groups.map((group, index) => (
        <React.Fragment key={group[0].group}>
          {index > 0 && <div className="building-plan-toolbar-separator" role="separator" />}
          <div className="building-plan-toolbar-group">{group.map(renderButton)}</div>
        </React.Fragment>
      ))}
    </div>
  );
}

export default BuildingPlanToolbar;
