import React, { useEffect, useCallback, useMemo } from 'react';
import {
  MousePointer2,
  X,
  Minus,
  Square,
  GripHorizontal,
  DoorOpen,
  Grid2x2,
} from 'lucide-react';
import {
  TOOL_MODES,
  TOOLBAR_BUTTONS,
  getButtonsForMode,
  formatCompactShortcut,
} from './toolbar-config.js';
import './toolbar.css';

/**
 * Icon component lookup by name.
 */
const ICON_MAP = {
  MousePointer2,
  X,
  Minus,
  Square,
  GripHorizontal,
  DoorOpen,
  Grid2x2,
};

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
 * @param {boolean} props.disabled - Whether the entire toolbar is disabled
 */
export function BuildingPlanToolbar({
  canvasMode = 'parent',
  activeToolMode = TOOL_MODES.SELECT,
  onModeChange,
  onClearSelection,
  disabled = false,
}) {
  // Get buttons configured for this canvas mode
  const buttons = useMemo(() => getButtonsForMode(canvasMode), [canvasMode]);

  // Split buttons into groups
  const primaryButtons = useMemo(
    () => buttons.filter((btn) => btn.group === 'primary'),
    [buttons]
  );
  const structuralButtons = useMemo(
    () => buttons.filter((btn) => btn.group === 'structural'),
    [buttons]
  );
  const openingsButtons = useMemo(
    () => buttons.filter((btn) => btn.group === 'openings'),
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
        }
      } else {
        // Mode buttons change the active tool
        if (typeof onModeChange === 'function') {
          onModeChange(button.mode);
        }
      }
    },
    [disabled, onModeChange, onClearSelection]
  );

  // Keyboard shortcut handler (ALT+SHIFT+letter)
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleKeyDown = (event) => {
      // Check for ALT+SHIFT modifier
      if (!event.altKey || !event.shiftKey || event.ctrlKey || event.metaKey) {
        return;
      }

      // Get the key pressed
      const key = event.key.toUpperCase();

      // Find matching button
      const button = buttons.find(
        (btn) => btn.shortcutKey === key && btn.enabled && !disabled
      );

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

  // Render a single button with shortcut label below
  const renderButton = (button) => {
    const IconComponent = getIconComponent(button.icon);
    const isActive = !button.isAction && button.mode === activeToolMode;
    const isDisabled = disabled || !button.enabled;
    const shortcutLabel = formatCompactShortcut(button.shortcutKey);

    return (
      <div key={button.id} className="building-plan-toolbar-item">
        <button
          type="button"
          className={`building-plan-toolbar-btn ${isActive ? 'active' : ''}`}
          disabled={isDisabled}
          onClick={() => handleButtonClick(button)}
          data-tooltip={button.label}
          aria-label={button.label}
          aria-pressed={isActive}
        >
          {IconComponent && <IconComponent />}
        </button>
        {shortcutLabel && (
          <span className="building-plan-toolbar-shortcut">{shortcutLabel}</span>
        )}
      </div>
    );
  };

  return (
    <div className="building-plan-toolbar-float" role="toolbar" aria-label="Canvas tools">
      {/* Primary actions */}
      {primaryButtons.length > 0 && (
        <div className="building-plan-toolbar-group">
          {primaryButtons.map(renderButton)}
        </div>
      )}

      {/* Separator before structural */}
      {primaryButtons.length > 0 && structuralButtons.length > 0 && (
        <div className="building-plan-toolbar-separator" role="separator" />
      )}

      {/* Structural tools (column, beam, wall) */}
      {structuralButtons.length > 0 && (
        <div className="building-plan-toolbar-group">
          {structuralButtons.map(renderButton)}
        </div>
      )}

      {/* Separator before openings */}
      {structuralButtons.length > 0 && openingsButtons.length > 0 && (
        <div className="building-plan-toolbar-separator" role="separator" />
      )}

      {/* Openings (door, window) */}
      {openingsButtons.length > 0 && (
        <div className="building-plan-toolbar-group">
          {openingsButtons.map(renderButton)}
        </div>
      )}
    </div>
  );
}

export default BuildingPlanToolbar;

