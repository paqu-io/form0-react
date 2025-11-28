/**
 * Toolbar configuration for BuildingPlan canvas.
 * Defines buttons, shortcuts, icons, and per-mode visibility/enabled rules.
 */

// Canvas modes
export const CANVAS_MODES = {
  PARENT: 'parent',
  FLOOR: 'floor',
  ROOM: 'room',
};

// Tool modes (matching legacy canvas)
export const TOOL_MODES = {
  SELECT: 'select',
  DRAW_ROOM: 'draw-room',
  DRAW_WALL: 'draw-wall',
  DRAW_DOOR: 'draw-door',
  DRAW_WINDOW: 'draw-window',
  DRAW_COLUMN: 'draw-column',
  DRAW_BEAM: 'draw-beam',
  CLEAR: 'clear', // Special action, not a mode
};

/**
 * Selection capabilities per canvas mode.
 * Defines what actions are possible after selecting an element.
 */
export const CAPABILITIES_BY_MODE = {
  [CANVAS_MODES.PARENT]: {
    canSelect: true,
    canMove: false,
    canResize: false,
  },
  [CANVAS_MODES.FLOOR]: {
    canSelect: true,
    canMove: true,
    canResize: false,
  },
  [CANVAS_MODES.ROOM]: {
    canSelect: true,
    canMove: true,
    canResize: true,
  },
};

/**
 * Button visibility/enabled state per canvas mode.
 * - 'enabled': button is visible and clickable
 * - 'disabled': button is visible but grayed out
 * - 'hidden': button is not rendered
 */
const BUTTON_STATES = {
  ENABLED: 'enabled',
  DISABLED: 'disabled',
  HIDDEN: 'hidden',
};

/**
 * Toolbar button definitions.
 * Each button has an id, label, icon name (Lucide), shortcut key, and per-mode state.
 */
export const TOOLBAR_BUTTONS = [
  // Primary actions (top section)
  {
    id: 'select',
    label: 'Select',
    icon: 'MousePointer2',
    shortcutKey: 'S',
    mode: TOOL_MODES.SELECT,
    isAction: false,
    group: 'primary',
    stateByCanvasMode: {
      [CANVAS_MODES.PARENT]: BUTTON_STATES.ENABLED,
      [CANVAS_MODES.FLOOR]: BUTTON_STATES.ENABLED,
      [CANVAS_MODES.ROOM]: BUTTON_STATES.ENABLED,
    },
  },
  {
    id: 'clear',
    label: 'Clear',
    icon: 'X',
    shortcutKey: 'X',
    mode: TOOL_MODES.CLEAR,
    isAction: true, // This triggers an action, not a mode change
    group: 'primary',
    stateByCanvasMode: {
      [CANVAS_MODES.PARENT]: BUTTON_STATES.ENABLED,
      [CANVAS_MODES.FLOOR]: BUTTON_STATES.ENABLED,
      [CANVAS_MODES.ROOM]: BUTTON_STATES.ENABLED,
    },
  },
  // Structural elements (below separator)
  {
    id: 'column',
    label: 'Column',
    icon: 'Square',
    shortcutKey: 'O',
    mode: TOOL_MODES.DRAW_COLUMN,
    isAction: false,
    group: 'structural',
    stateByCanvasMode: {
      [CANVAS_MODES.PARENT]: BUTTON_STATES.DISABLED,
      [CANVAS_MODES.FLOOR]: BUTTON_STATES.DISABLED,
      [CANVAS_MODES.ROOM]: BUTTON_STATES.ENABLED,
    },
  },
  {
    id: 'beam',
    label: 'Beam',
    icon: 'GripHorizontal',
    shortcutKey: 'E',
    mode: TOOL_MODES.DRAW_BEAM,
    isAction: false,
    group: 'structural',
    stateByCanvasMode: {
      [CANVAS_MODES.PARENT]: BUTTON_STATES.DISABLED,
      [CANVAS_MODES.FLOOR]: BUTTON_STATES.DISABLED,
      [CANVAS_MODES.ROOM]: BUTTON_STATES.ENABLED,
    },
  },
  {
    id: 'wall',
    label: 'Wall',
    icon: 'Minus',
    shortcutKey: 'W',
    mode: TOOL_MODES.DRAW_WALL,
    isAction: false,
    group: 'structural',
    stateByCanvasMode: {
      [CANVAS_MODES.PARENT]: BUTTON_STATES.DISABLED,
      [CANVAS_MODES.FLOOR]: BUTTON_STATES.DISABLED,
      [CANVAS_MODES.ROOM]: BUTTON_STATES.ENABLED,
    },
  },
  // Openings (below separator)
  {
    id: 'door',
    label: 'Door',
    icon: 'DoorOpen',
    shortcutKey: 'D',
    mode: TOOL_MODES.DRAW_DOOR,
    isAction: false,
    group: 'openings',
    stateByCanvasMode: {
      [CANVAS_MODES.PARENT]: BUTTON_STATES.DISABLED,
      [CANVAS_MODES.FLOOR]: BUTTON_STATES.DISABLED,
      [CANVAS_MODES.ROOM]: BUTTON_STATES.ENABLED,
    },
  },
  {
    id: 'window',
    label: 'Window',
    icon: 'Grid2x2',
    shortcutKey: 'I',
    mode: TOOL_MODES.DRAW_WINDOW,
    isAction: false,
    group: 'openings',
    stateByCanvasMode: {
      [CANVAS_MODES.PARENT]: BUTTON_STATES.DISABLED,
      [CANVAS_MODES.FLOOR]: BUTTON_STATES.DISABLED,
      [CANVAS_MODES.ROOM]: BUTTON_STATES.ENABLED,
    },
  },
];

/**
 * Normalize canvas mode to handle both short ('floor') and modal-suffixed ('floor-modal') names.
 */
function normalizeCanvasMode(mode) {
  if (!mode) return CANVAS_MODES.PARENT;
  const normalized = String(mode).replace('-modal', '');
  if (normalized === 'floor') return CANVAS_MODES.FLOOR;
  if (normalized === 'room') return CANVAS_MODES.ROOM;
  return CANVAS_MODES.PARENT;
}

/**
 * Get visible buttons for a given canvas mode.
 * Filters out hidden buttons and returns state info.
 */
export function getButtonsForMode(canvasMode) {
  const normalizedMode = normalizeCanvasMode(canvasMode);
  return TOOLBAR_BUTTONS.map((button) => {
    const state = button.stateByCanvasMode[normalizedMode] || BUTTON_STATES.DISABLED;
    if (state === BUTTON_STATES.HIDDEN) {
      return null;
    }
    return {
      ...button,
      enabled: state === BUTTON_STATES.ENABLED,
      state,
    };
  }).filter(Boolean);
}

/**
 * Get capabilities for a given canvas mode.
 */
export function getCapabilitiesForMode(canvasMode) {
  const normalizedMode = normalizeCanvasMode(canvasMode);
  return CAPABILITIES_BY_MODE[normalizedMode] || CAPABILITIES_BY_MODE[CANVAS_MODES.PARENT];
}

/**
 * Find button by shortcut key.
 */
export function getButtonByShortcut(key) {
  const upperKey = key.toUpperCase();
  return TOOLBAR_BUTTONS.find((button) => button.shortcutKey === upperKey) || null;
}

/**
 * Format shortcut label for display (lowercase).
 */
export function formatShortcutLabel(shortcutKey) {
  if (!shortcutKey) return null;
  return `alt+shift+${shortcutKey.toLowerCase()}`;
}

/**
 * Format compact shortcut for display under buttons.
 */
export function formatCompactShortcut(shortcutKey) {
  if (!shortcutKey) return null;
  return `alt+shift+${shortcutKey.toLowerCase()}`;
}

