import {
  BUILDING_PLAN_ZOOM_LIMITS,
  buildingPlanLabelPlacement,
  createBuildingPlanPresentation,
} from 'form0-core';
import { DEFAULT_PLAN_THEME } from '../draw/plan-theme.js';
import { groupPlanMessages } from '../plan-messages.js';
import { drawFindingMarkers, elementAtPath, findingMarkerAnchors } from '../draw/issue-markers.js';
import {
  drawRefusalMarks,
  refusalArrowStart,
  refusalGhost,
  refusalOutlines,
} from '../draw/refusal-marks.js';
import { drawGrid as drawPlanGrid } from '../draw/grid.js';
import { NO_SCOPE, OUT, levelTheme, scopeLevels } from '../draw/scope-levels.js';
import { drawWallFootprints } from '../draw/walls.js';
import { nameBeside } from '../draw/selection-name.js';
import { snapOpeningRatios } from '../opening-snap.js';
import { columnRatios, columnWallValues, snapColumnCentre } from '../column-placement.js';
import { markFromClick } from '../insertion-mark.js';
import { columnStretch, keepInStretch } from '../opening-clear.js';
import { addPlanElement } from '../add-elements.js';
import { drawInsertionMark } from '../draw/insertion-mark.js';
import { planText } from '../plan-text.js';
import {
  drawBeamSymbol,
  drawColumnSymbol,
  drawDoorSymbol,
  drawPlanLabel,
  drawWindowSymbol,
} from '../draw/symbols.js';
const MODE_SELECT = 'select';
const MODE_DRAW_ROOM = 'draw-room';
const MODE_DRAW_WALL = 'draw-wall';
const MODE_DRAW_DOOR = 'draw-door';
const MODE_DRAW_WINDOW = 'draw-window';
const MODE_DRAW_COLUMN = 'draw-column';
const MODE_DRAW_BEAM = 'draw-beam';
// The pointer over a faded element, outside the room in scope (1e, V1): a plain arrow.
const FADED_HOVER = Object.freeze({ type: 'faded' });

// Canvas units per metre: at 100% zoom a metre is 100 px, so a 1,000 to 1,500 px canvas shows 10
// to 15 m, a usual floor plan. Labels, handles and pointer tolerances are in canvas units, so
// they keep their screen size at 100%; geometry is in metres throughout.
const DEFAULT_GRID_SIZE = 100;
// The furthest fitting zooms in (250%: a small room doesn't fill the canvas with its walls).
const FIT_MAX_ZOOM = 2.5;
const FIT_MARGIN_PX = 48;
const SNAP_RADIUS = 10;
// Handle sizes and hit distances are screen pixels: `px()` turns them into canvas units, so they
// keep their size at any zoom.
const WALL_HIT_TOLERANCE = 6;
const ROOM_HANDLE_SIZE = 8;
const ROOM_HANDLE_HIT_SIZE = 16;
const WALL_HANDLE_HIT_RADIUS = 8;
const OPENING_HIT_TOLERANCE = 12;
const OPENING_HANDLE_RADIUS = 10;
// An opening is hit anywhere on its band through the wall, or this close to it.
const OPENING_REACH = 6;
// The grip on a selected wall's middle.
const WALL_GRIP_RADIUS = 14;
const DOOR_LINE_WIDTH = 6;
const WINDOW_LINE_WIDTH = 6;
const LABEL_FONT_SIZE = 12;
// Room names are the plan's main labels: a little larger than wall, opening and element names.
const ROOM_LABEL_FONT_SIZE = 14;
const labelFont = (scale = 1, size = LABEL_FONT_SIZE) =>
  `600 ${size * scale}px Inter, system-ui, sans-serif`;
const LABEL_PADDING_X = 6;
const LABEL_PADDING_Y = 4;
const STRUCTURAL_SNAP_TOLERANCE = 14;
const DEFAULT_DOOR_WIDTH_M = 0.9;
const DEFAULT_DOOR_HEIGHT_M = 2;
const DEFAULT_WINDOW_WIDTH_M = 1.2;
const DEFAULT_WINDOW_HEIGHT_M = 1.2;
const DEFAULT_WINDOW_SILL_HEIGHT_M = 0.9;
const DEFAULT_COLUMN_WIDTH_M = 0.3;
const DEFAULT_COLUMN_HEIGHT_M = 0.3;
const DEFAULT_COLUMN_VERTICAL_HEIGHT_M = 3;
const DEFAULT_BEAM_WIDTH_M = 0.25;
const DEFAULT_BEAM_HEIGHT_M = 0.4;
const MIN_OPENING_RATIO = 0.05;
const ROUND_DECIMALS = 3;

// Zoom configuration
const { min: MIN_ZOOM, max: MAX_ZOOM } = BUILDING_PLAN_ZOOM_LIMITS;
// Multiplicative, so each click is proportionate across the whole zoom range.
const ZOOM_STEP = 1.25;
const ZOOM_WHEEL_SENSITIVITY = 0.002;

// The selection field each highlighted collection sets.
const HIGHLIGHT_FIELDS = {
  rooms: 'selectedRoomId',
  walls: 'selectedWallId',
  doors: 'selectedDoorId',
  windows: 'selectedWindowId',
  columns: 'selectedColumnId',
  beams: 'selectedBeamId',
};

const DEFAULT_LABEL_SETTINGS = {
  rooms: true,
  walls: true,
  doors: true,
  windows: true,
  columns: true,
  beams: true,
};

const CAPABILITY_DEFAULTS = {
  canMove: false,
  canMoveRoom: false,
  canMoveStructural: false,
  canResize: false,
  canDrawFloor: false,
  canDrawRoom: false,
  canDrawWall: false,
  canDrawColumn: false,
  canDrawBeam: false,
  canDrawDoor: false,
  canDrawWindow: false,
};

function getCapabilities(controller) {
  if (controller && controller.toolbarState && typeof controller.toolbarState === 'object') {
    return { ...CAPABILITY_DEFAULTS, ...controller.toolbarState };
  }
  return { ...CAPABILITY_DEFAULTS };
}

function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function clonePoints(points = []) {
  return Array.isArray(points) ? points.map((point) => ({ ...point })) : [];
}

function pointToSegmentDistance(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) return distance(point, a);

  const t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy);
  if (t < 0) return distance(point, a);
  if (t > 1) return distance(point, b);
  return distance(point, { x: a.x + t * dx, y: a.y + t * dy });
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function projectScalarToSegment(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return 0;
  return ((point.x - a.x) * dx + (point.y - a.y) * dy) / lenSq;
}

function getSegmentPoints(points = [], segmentIndex = 0) {
  if (!Array.isArray(points) || points.length < 2) {
    return null;
  }
  const index = clamp(segmentIndex, 0, points.length - 2);
  const start = points[index];
  const end = points[index + 1];
  if (!start || !end) {
    return null;
  }
  return { start, end };
}

function lengthToMeters(length, gridSize = DEFAULT_GRID_SIZE) {
  if (!Number.isFinite(length) || !Number.isFinite(gridSize) || gridSize === 0) {
    return 0;
  }
  return length / gridSize;
}

function metersToLength(meters, gridSize = DEFAULT_GRID_SIZE) {
  if (!Number.isFinite(meters)) return 0;
  return meters * gridSize;
}

function getRoomRatios(point, rect) {
  if (!rect || rect.width === 0 || rect.height === 0) {
    return { u: 0, v: 0 };
  }
  return {
    u: clamp((point.x - rect.x) / rect.width, 0, 1),
    v: clamp((point.y - rect.y) / rect.height, 0, 1),
  };
}

function clampPointToRoom(point, rect) {
  if (!rect) return { x: point.x, y: point.y };
  return {
    x: clamp(point.x, rect.x, rect.x + rect.width),
    y: clamp(point.y, rect.y, rect.y + rect.height),
  };
}

function pointInRect(point, rect) {
  if (!rect) return false;
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

function pointInRoom(point, room) {
  const vertices = room.previewRect ? null : room.vertices;
  if (!vertices?.length) return pointInRect(point, room.previewRect || room.rect);
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const a = vertices[i],
      b = vertices[j];
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside;
}

function inflateRect(rect, amount) {
  return {
    x: rect.x - amount,
    y: rect.y - amount,
    width: rect.width + amount * 2,
    height: rect.height + amount * 2,
  };
}

function formatShortLabel(label, prefix, fallbackNumber = null, longPrefix = null) {
  const upperPrefix = prefix ? String(prefix).toUpperCase() : '';
  const expected = (longPrefix || prefix || '').toLowerCase();
  if (typeof label === 'string' && label.trim() !== '') {
    const trimmed = label.trim();
    const lowerTrimmed = trimmed.toLowerCase();
    const hashMatch = trimmed.match(/#\s*(\d+)/);
    if (hashMatch && upperPrefix) {
      return `${upperPrefix}#${hashMatch[1]}`;
    }
    if (expected && lowerTrimmed.startsWith(expected)) {
      const numberMatch = trimmed.match(/(\d+)/);
      if (numberMatch && upperPrefix) {
        return `${upperPrefix}#${numberMatch[1]}`;
      }
    }
    return trimmed;
  }
  if (fallbackNumber != null && upperPrefix) {
    return `${upperPrefix}#${fallbackNumber}`;
  }
  return label || null;
}

function roundCoordinate(value, decimals = ROUND_DECIMALS) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function roundPointValues(point, decimals = ROUND_DECIMALS) {
  if (!point) return { x: 0, y: 0 };
  return {
    x: roundCoordinate(point.x, decimals),
    y: roundCoordinate(point.y, decimals),
  };
}

function roundRectValues(rect, decimals = ROUND_DECIMALS) {
  if (!rect) return null;
  return {
    x: roundCoordinate(rect.x, decimals),
    y: roundCoordinate(rect.y, decimals),
    width: roundCoordinate(rect.width, decimals),
    height: roundCoordinate(rect.height, decimals),
  };
}

function roundPoints(points, decimals = ROUND_DECIMALS) {
  return Array.isArray(points) ? points.map((point) => roundPointValues(point, decimals)) : [];
}

// The canvas last touched: Esc dismisses its refusal, and no other canvas's (a plan page under a
// dialog keeps its own message).
let activeCanvas = null;

export class BuildingPlanCanvas {
  constructor({
    container,
    controller,
    labelSettings = {},
    presentation,
    externalToolbar = false,
    readOnly = false,
    onFloorTabs = null,
    onStatus = null,
    onMessages = null,
  }) {
    this.container = container;
    // With an external toolbar the host draws the floor tabs from this report.
    this.onFloorTabs = typeof onFloorTabs === 'function' ? onFloorTabs : null;
    // ...and the status line: the tool's hint (onStatus) and an edit core refused (onMessages).
    this.onStatus = typeof onStatus === 'function' ? onStatus : null;
    this.onMessages = typeof onMessages === 'function' ? onMessages : null;
    // A refused edit (1e): its messages, the one shown, and where the gesture would have put the
    // element (the ghost of the running gesture, and the one kept with the messages).
    this.messages = [];
    this.messageIndex = 0;
    this.gestureGhost = null;
    this.messageGhost = null;
    // Rows with validation findings, marked on their elements (1e, M2): index paths.
    this.findingMarkers = [];
    this.controller = controller;
    this.presentation = presentation || createBuildingPlanPresentation();
    this.labelSettings = { ...DEFAULT_LABEL_SETTINGS, ...labelSettings };
    this.externalToolbar = externalToolbar;
    this.readOnly = readOnly;

    this.mode = MODE_SELECT;
    // An element marked from outside (a view-only entry, a hovered list row): { collection, id }.
    this.highlight = null;
    // The entry's own element (1e, V1), and the scope levels of the last render.
    this.focus = null;
    this.levels = null;
    // The view fits the plan once it has rooms and a size (on open, after a floor switch).
    this.fitPending = true;
    this.rooms = [];
    this.walls = [];
    this.doors = [];
    this.windows = [];
    this.columns = [];
    this.beams = [];
    this.floors = [];
    this.activeFloorIndex = 0;
    this.hasFloors = false;
    this.selectedRoomId = null;
    this.selectedWallId = null;
    this.selectedDoorId = null;
    this.selectedWindowId = null;
    this.selectedColumnId = null;
    this.selectedBeamId = null;

    this.dragState = null;
    this.wallDragState = null;
    this.openingDragState = null;
    this.columnDragState = null;
    this.beamDragState = null;
    this.wallDraft = null;
    this.roomDraft = null;
    this.beamDraft = null;
    this.hoverState = null;

    this.gridSize = DEFAULT_GRID_SIZE;
    if (this.controller && typeof this.controller.setGridSize === 'function') {
      this.controller.setGridSize(this.gridSize);
    }

    // Zoom and pan state
    this.zoomLevel = 1;
    this.panOffset = { x: 0, y: 0 };
    this.onZoomChange = null; // Callback for React integration

    // Panning state (always allowed, even in readOnly mode)
    this.isPanning = false;
    this.panStartPoint = null;
    this.panStartOffset = null;

    this.unsubscribe = null;
    this.floorTabsContainer = null;

    this.buildUI();
    this.attachEvents();
    this.subscribeToController();
    this.render();
  }

  destroy() {
    this.stopEdgePan();
    if (this.moveFrame != null) cancelAnimationFrame(this.moveFrame);
    this.canvas?.removeEventListener('pointercancel', this.boundPointerCancel);
    this.canvas?.removeEventListener('lostpointercapture', this.boundLostCapture);
    window.removeEventListener('keydown', this.boundGestureKey, true);
    if (activeCanvas === this) activeCanvas = null;
    window.removeEventListener('resize', this.boundResizeHandler);
    this.pixelRatioQuery?.removeEventListener?.('change', this.boundPixelRatioChange);
    this.pixelRatioQuery = null;
    if (this.resizeObserver) {
      try {
        this.resizeObserver.disconnect();
      } catch (err) {
        console.error('[BuildingPlan] Resize observer disconnect error', err);
      }
      this.resizeObserver = null;
    }
    if (this.canvas) {
      this.canvas.removeEventListener('pointerdown', this.boundMouseDown);
      this.canvas.removeEventListener('pointermove', this.boundMouseMove);
      this.canvas.removeEventListener('pointerup', this.boundMouseUp);
      this.canvas.removeEventListener('dblclick', this.boundDoubleClick);
      this.canvas.removeEventListener('mouseleave', this.boundMouseLeave);
      this.canvas.removeEventListener('wheel', this.boundWheelHandler);
    }
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  /**
   * Colours from the form theme, resolved by the host (`draw/plan-theme.js`).
   * @param {typeof DEFAULT_PLAN_THEME} theme
   */
  setTheme(theme) {
    this.theme = theme || null;
    this.render();
  }

  /** The colours in use: the host's theme, or the light defaults until it arrives. */
  get planTheme() {
    return this.theme || DEFAULT_PLAN_THEME;
  }

  setLabelSettings(settings = {}) {
    const next = { ...DEFAULT_LABEL_SETTINGS, ...settings };
    const changed = Object.keys(DEFAULT_LABEL_SETTINGS).some(
      (key) => this.labelSettings[key] !== next[key]
    );
    this.labelSettings = next;
    if (changed) {
      this.render();
    }
  }

  // ─── Zoom Methods ────────────────────────────────────────────────────────────

  /**
   * Set the zoom level, clamped to valid range.
   * @param {number} level - New zoom level
   * @param {Object} [focalPoint] - Optional point to zoom toward (canvas coordinates)
   */
  setZoom(level, focalPoint = null) {
    const prevZoom = this.zoomLevel;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, level));

    if (newZoom === prevZoom) return;

    // If a focal point is provided, adjust pan to keep that point stationary
    if (focalPoint) {
      // Convert focal point to world coordinates at old zoom
      const worldX = (focalPoint.x - this.panOffset.x) / prevZoom;
      const worldY = (focalPoint.y - this.panOffset.y) / prevZoom;

      // Calculate new pan offset to keep focal point at same screen position
      this.panOffset.x = focalPoint.x - worldX * newZoom;
      this.panOffset.y = focalPoint.y - worldY * newZoom;
    }

    this.zoomLevel = newZoom;
    this.notifyZoomChange();
    this.render();
  }

  /**
   * Get the current zoom level.
   */
  getZoom() {
    return this.zoomLevel;
  }

  /**
   * Zoom in by one step.
   */
  zoomIn() {
    const center = this.getCanvasCenter();
    this.setZoom(this.zoomLevel * ZOOM_STEP, center);
  }

  /**
   * Zoom out by one step.
   */
  zoomOut() {
    const center = this.getCanvasCenter();
    this.setZoom(this.zoomLevel / ZOOM_STEP, center);
  }

  /**
   * Reset zoom to 100% and center the view.
   */
  resetZoom() {
    this.zoomLevel = 1;
    this.panOffset = { x: 0, y: 0 };
    this.notifyZoomChange();
    this.render();
  }

  /**
   * Get the center point of the canvas in screen coordinates.
   */
  getCanvasCenter() {
    const { width, height } = this.getViewSize();
    return { x: width / 2, y: height / 2 };
  }

  /**
   * Notify listeners of zoom level changes.
   */
  notifyZoomChange() {
    if (typeof this.onZoomChange === 'function') {
      this.onZoomChange(this.zoomLevel);
    }
  }

  /**
   * Handle mouse wheel for zooming.
   */
  handleWheel(event) {
    // Prevent default scroll behavior
    event.preventDefault();

    // Get mouse position relative to canvas
    const rect = this.canvas.getBoundingClientRect();
    const focalPoint = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    // Calculate zoom delta (negative deltaY = zoom in)
    const delta = -event.deltaY * ZOOM_WHEEL_SENSITIVITY;
    const newZoom = this.zoomLevel * (1 + delta);

    this.setZoom(newZoom, focalPoint);
  }

  shouldShowLabel(type) {
    if (!this.labelSettings) return true;
    if (Object.prototype.hasOwnProperty.call(this.labelSettings, type)) {
      return Boolean(this.labelSettings[type]);
    }
    return true;
  }

  buildUI() {
    this.container.innerHTML = '';
    this.container.classList.add('building-plan-canvas-wrapper');

    // Only create the legacy toolbar if not using external (React) toolbar
    if (!this.externalToolbar) {
      this.toolbar = document.createElement('div');
      this.toolbar.className = 'building-plan-toolbar';

      this.selectButton = this.createToolbarButton('Select / Move / Resize', MODE_SELECT);
      this.floorButton = document.createElement('button');
      this.floorButton.type = 'button';
      this.floorButton.className = 'building-plan-toolbar-button';
      this.floorButton.textContent = 'Draw Floor';
      this.floorButton.addEventListener('click', () => {
        if (this.controller && typeof this.controller.createFloor === 'function') {
          this.controller.createFloor();
        }
      });
      this.roomButton = this.createToolbarButton('Draw Room', MODE_DRAW_ROOM);
      this.wallButton = this.createToolbarButton('Draw Wall', MODE_DRAW_WALL);
      this.columnButton = this.createToolbarButton('Place Column', MODE_DRAW_COLUMN);
      this.beamButton = this.createToolbarButton('Draw Beam', MODE_DRAW_BEAM);
      this.doorButton = this.createToolbarButton('Place Door', MODE_DRAW_DOOR);
      this.windowButton = this.createToolbarButton('Place Window', MODE_DRAW_WINDOW);

      this.clearButton = document.createElement('button');
      this.clearButton.type = 'button';
      this.clearButton.className = 'building-plan-toolbar-button';
      this.clearButton.textContent = 'Clear Selection';
      this.clearButton.addEventListener('click', () => this.clearSelection());

      this.toolbar.appendChild(this.selectButton);
      this.toolbar.appendChild(this.floorButton);
      this.toolbar.appendChild(this.roomButton);
      this.toolbar.appendChild(this.wallButton);
      this.toolbar.appendChild(this.columnButton);
      this.toolbar.appendChild(this.beamButton);
      this.toolbar.appendChild(this.doorButton);
      this.toolbar.appendChild(this.windowButton);
      this.toolbar.appendChild(this.clearButton);
    }

    this.canvasContainer = document.createElement('div');
    this.canvasContainer.className = 'building-plan-canvas-container';

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'building-plan-canvas';
    this.ctx = this.canvas.getContext('2d');
    this.canvasContainer.appendChild(this.canvas);

    if (!this.onFloorTabs) {
      this.floorTabsContainer = document.createElement('div');
      this.floorTabsContainer.className = 'building-plan-floor-tabs';
      this.container.appendChild(this.floorTabsContainer);
    }

    // Only append toolbar if it was created
    if (this.toolbar) {
      this.container.appendChild(this.toolbar);
    }
    this.buildCutControls();
    this.container.appendChild(this.canvasContainer);

    this.renderFloorTabs();

    this.boundResizeHandler = () => this.resizeCanvas();
    window.addEventListener('resize', this.boundResizeHandler);

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.resizeCanvas());
      this.resizeObserver.observe(this.canvasContainer);
    }
    this.watchPixelRatio();

    this.resizeCanvas();
    this.updateCursor();
    this.updateButtonStates();
  }

  createToolbarButton(label, mode) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.className = 'building-plan-toolbar-button';
    button.addEventListener('click', () => {
      this.setMode(mode);
    });
    if (mode === this.mode) {
      button.classList.add('active');
    }
    return button;
  }

  setMode(mode) {
    this.insertionMark = null;
    this.hintOverride = null;
    this.cornerDragState = null;
    this.pinTarget = null;
    this.cutGesture = false;
    this.cutTarget = this.cutDraft = null;
    const caps = getCapabilities(this.controller);
    const modeAllowed =
      mode === MODE_SELECT ||
      (['split', 'rejoin', 'pin'].includes(mode) && caps.canResize) ||
      (mode === MODE_DRAW_ROOM && caps.canDrawRoom) ||
      (mode === MODE_DRAW_WALL && caps.canDrawWall) ||
      (mode === MODE_DRAW_COLUMN && caps.canDrawColumn) ||
      (mode === MODE_DRAW_BEAM && caps.canDrawBeam) ||
      (mode === MODE_DRAW_DOOR && caps.canDrawDoor) ||
      (mode === MODE_DRAW_WINDOW && caps.canDrawWindow) ||
      (mode === MODE_DRAW_ROOM && caps.canDrawRoom) ||
      (mode === MODE_DRAW_ROOM && caps.canDrawRoom);
    if (!modeAllowed) {
      return;
    }
    if (mode === MODE_DRAW_ROOM && this.roomButton && this.roomButton.disabled) {
      return;
    }
    if (mode === MODE_DRAW_WALL && this.wallButton && this.wallButton.disabled) {
      return;
    }
    if (mode === MODE_DRAW_COLUMN && this.columnButton && this.columnButton.disabled) {
      return;
    }
    if (mode === MODE_DRAW_BEAM && this.beamButton && this.beamButton.disabled) {
      return;
    }
    if (mode === MODE_DRAW_DOOR && this.doorButton && this.doorButton.disabled) {
      return;
    }
    if (mode === MODE_DRAW_WINDOW && this.windowButton && this.windowButton.disabled) {
      return;
    }
    this.mode = mode;

    // Ensure a primary room is selected when entering wall mode
    if (mode === MODE_DRAW_WALL && !this.selectedRoomId && Array.isArray(this.rooms)) {
      const primary = this.rooms.find((room) => room && !room.isDimmed) || this.rooms[0];
      if (primary) {
        this.selectedRoomId = primary.id;
      }
    }
    // Only update button states if not using external toolbar
    if (this.selectButton) {
      this.selectButton.classList.toggle('active', mode === MODE_SELECT);
    }
    if (this.roomButton) {
      this.roomButton.classList.toggle('active', mode === MODE_DRAW_ROOM);
    }
    if (this.wallButton) {
      this.wallButton.classList.toggle('active', mode === MODE_DRAW_WALL);
    }
    if (this.columnButton) {
      this.columnButton.classList.toggle('active', mode === MODE_DRAW_COLUMN);
    }
    if (this.beamButton) {
      this.beamButton.classList.toggle('active', mode === MODE_DRAW_BEAM);
    }
    if (this.doorButton) {
      this.doorButton.classList.toggle('active', mode === MODE_DRAW_DOOR);
    }
    if (this.windowButton) {
      this.windowButton.classList.toggle('active', mode === MODE_DRAW_WINDOW);
    }
    this.wallDraft = null;
    this.roomDraft = null;
    this.beamDraft = null;
    this.dragState = null;
    this.wallDragState = null;
    this.openingDragState = null;
    this.columnDragState = null;
    this.beamDragState = null;
    this.hoverState = null;
    this.updateCursor();
    this.updateButtonStates();
    this.render();
  }

  buildCornerControls() {
    if (!this.controller?.getCornerPlacement) return;
    if (this.externalToolbar) {
      // Pin is a tool of the external rail; the hints live in a status line on the canvas.
      this.buildStatusLine();
      return;
    }
    this.cornerToolbar = document.createElement('div');
    this.cornerToolbar.className = 'building-plan-toolbar';
    this.pinWallButton = document.createElement('button');
    this.pinWallButton.type = 'button';
    this.pinWallButton.className = 'building-plan-toolbar-button';
    this.pinWallButton.addEventListener('click', () => {
      if (this.cutAllowed()) this.setMode(this.mode === 'pin' ? MODE_SELECT : 'pin');
      this.render();
    });
    const hint = document.createElement('span');
    hint.textContent =
      'Drag a corner to reshape. Alt allows free corner movement. Wall drags stay parallel.';
    this.cornerHint = hint;
    this.cornerToolbar.append(this.pinWallButton, hint);
    this.container.appendChild(this.cornerToolbar);
  }

  /** The host shows the status line (plan-status.jsx); the canvas reports what goes in it. */
  buildStatusLine() {
    this.reportsStatus = true;
    this.statusKey = undefined;
  }

  /** The status text for the current tool, or null for drawing tools (they say nothing yet). */
  statusTextKey() {
    if (this.hintOverride) return this.hintOverride;
    if (this.mode === 'split') return 'plan.status.split';
    if (this.mode === 'rejoin') return 'plan.status.rejoin';
    if (this.mode === 'pin') return 'plan.status.pin';
    if (this.mode !== MODE_SELECT) return null;
    return this.cutAllowed() ? 'plan.status.select' : 'plan.status.view';
  }

  updateStatusLine() {
    if (!this.reportsStatus) return;
    const key = this.statusTextKey();
    if (key === this.statusKey) return;
    this.statusKey = key;
    this.onStatus?.(key);
  }

  /**
   * Issues from the controller (an edit core refused) or the host (undo / redo), grouped by
   * message; an empty list clears them. A refusal reported during a gesture keeps where the
   * gesture would have put the element, until the next gesture, × or Esc (1e).
   */
  receiveIssues(issues) {
    const messages = groupPlanMessages(issues);
    if (!messages.length && !this.messages.length) return;
    const same =
      messages.length === this.messages.length &&
      messages.every((entry, index) => entry.message === this.messages[index].message);
    this.messages = messages;
    this.messageGhost = messages.length ? this.gestureGhost : null;
    if (!same) {
      this.messageIndex = 0;
      this.reportMessages();
    }
    this.render();
  }

  /** Shows message `index` of several (it wraps), with its outline. */
  showMessage(index) {
    const count = this.messages.length;
    if (!count) return;
    this.messageIndex = ((index % count) + count) % count;
    this.reportMessages();
    this.render();
  }

  dismissMessages() {
    this.receiveIssues([]);
  }

  reportMessages() {
    const current = this.messages[this.messageIndex];
    this.onMessages?.({
      messages: this.messages.map((entry) => entry.message),
      index: this.messageIndex,
      codes: [...new Set((current?.issues || []).map((issue) => issue.code).filter(Boolean))],
    });
  }

  /** Rows with validation findings (index paths), marked on their elements with a "!" (1e, M2). */
  setFindingMarkers(paths) {
    this.findingMarkers = Array.isArray(paths) ? paths : [];
    this.render();
  }

  /** Selects the element of a row (an index path), as `selectElement`; false if not shown. */
  selectRow(indexPath) {
    const found = elementAtPath(this, indexPath);
    return found ? this.selectElement({ collection: found.collection, id: found.entry.id }) : false;
  }

  drawFindings() {
    if (!this.findingMarkers.length) return;
    drawFindingMarkers(this.ctx, findingMarkerAnchors(this, this.findingMarkers), {
      color: this.planTheme.error,
      ground: this.planTheme.room,
      zoom: this.zoomLevel,
    });
  }

  /**
   * Selects an element from outside the canvas (an item of the issues list) as a click on it
   * does, so the selection is reported and the entry's list marks its row.
   * @param {{ collection: string, id: string }} target
   * @returns {boolean} false when the canvas doesn't show it
   */
  selectElement(target) {
    const field = target && HIGHLIGHT_FIELDS[target.collection];
    const entry = field && (this[target.collection] || []).find((item) => item.id === target.id);
    if (!entry) return false;
    this.insertionMark = null;
    for (const other of Object.values(HIGHLIGHT_FIELDS)) this[other] = null;
    this[field] = target.id;
    if (target.collection !== 'rooms' && entry.roomId) this.selectedRoomId = entry.roomId;
    this.updateButtonStates();
    this.render();
    return true;
  }

  /** The ghost, and the outline of the elements the message shown names, over everything. */
  drawRefusal() {
    if (!this.messages.length) return;
    const ghost = this.messageGhost;
    drawRefusalMarks(this.ctx, {
      // The arrow starts where the element is shown now: where it stopped, or where it went back.
      ghost: ghost && { ...ghost, from: refusalArrowStart(this, ghost) },
      outlines: refusalOutlines(this, this.messages[this.messageIndex]?.issues),
      color: this.planTheme.error,
      zoom: this.zoomLevel,
    });
  }

  cornerAt(point) {
    if (!this.controller?.getCornerPlacement || !this.cutAllowed()) return null;
    return this.controller.getCornerPlacement(point, {
      roomId: this.controller.scope?.roomId || this.controller.getActiveRoomId?.(),
      preferredRoomId:
        this.controller.getActiveRoomId?.() ||
        this.controller.preferredRoomId ||
        this.selectedRoomId,
      zoom: this.zoomLevel,
    });
  }

  drawCornerControls() {
    if (!this.controller?.getCornerPlacement) return;
    const view = this.controller.getSnapshot();
    const roomId =
      this.controller.scope?.roomId ||
      this.controller.getActiveRoomId?.() ||
      this.controller.preferredRoomId ||
      this.selectedRoomId;
    const ctx = this.ctx;
    ctx.save();
    if (this.cutAllowed() && this.mode === MODE_SELECT)
      for (const corner of view.corners || []) {
        if (corner.roomId !== roomId) continue;
        ctx.beginPath();
        ctx.arc(corner.point.x, corner.point.y, 4 / this.zoomLevel, 0, Math.PI * 2);
        ctx.fillStyle = this.planTheme.handle;
        ctx.fill();
        ctx.strokeStyle = this.planTheme.accent;
        ctx.lineWidth = 1.5 / this.zoomLevel;
        ctx.stroke();
      }
    ctx.font = `${11 / this.zoomLevel}px sans-serif`;
    ctx.fillStyle = this.planTheme.accent;
    for (const wall of view.walls.filter((wall) => wall.pinned)) {
      const a = wall.points[0],
        b = wall.points.at(-1);
      ctx.fillText('Pinned', (a.x + b.x) / 2, (a.y + b.y) / 2 - 8 / this.zoomLevel);
    }
    ctx.restore();
    if (this.pinWallButton) {
      this.pinWallButton.disabled = !this.cutAllowed();
      this.pinWallButton.textContent = 'Pin / unpin';
      this.pinWallButton.title = 'Choose this tool, then click a wall to pin or unpin it.';
      this.pinWallButton.setAttribute('aria-pressed', String(this.mode === 'pin'));
      this.cornerHint.textContent =
        this.mode === 'pin'
          ? 'Click a wall to pin or unpin it, then return to Select.'
          : 'Drag a corner to reshape. Alt allows free corner movement. Wall drags stay parallel.';
    }
  }

  buildCutControls() {
    if (!this.controller?.getCutPlacement) return;
    if (!this.externalToolbar) {
      this.splitButton = this.createToolbarButton('Split', 'split');
      this.rejoinButton = this.createToolbarButton('Rejoin', 'rejoin');
      this.toolbar.append(this.splitButton, this.rejoinButton);
    }
    this.cutToolbar = document.createElement('div');
    // With the external toolbar the distance is a small bar floating on the canvas.
    this.cutToolbar.className = this.externalToolbar
      ? 'building-plan-cut-bar'
      : 'building-plan-toolbar';
    const label = document.createElement('label');
    this.cutDistanceLabel = label;
    label.textContent = `${this.presentation.t('Split distance')} [${this.presentation.unitFor()}] `;
    this.cutDistanceInput = document.createElement('input');
    this.cutDistanceInput.type = 'number';
    this.cutDistanceInput.step = 'any';
    this.cutDistanceInput.min = '0';
    this.cutDistanceInput.style.width = '90px';
    this.cutDistanceInput.setAttribute(
      'aria-label',
      `${this.presentation.t('Split distance')} [${this.presentation.unitFor()}]`
    );
    this.cutDistanceInput.addEventListener('input', () => {
      const target = this.cutTarget;
      if (!target) return;
      const ratio =
        this.presentation.fromDisplayLength(Number(this.cutDistanceInput.value)) / target.length;
      this.cutDraft = {
        ...target,
        point: {
          x: target.start.x + (target.end.x - target.start.x) * ratio,
          y: target.start.y + (target.end.y - target.start.y) * ratio,
        },
        guide: null,
      };
      this.render();
    });
    label.appendChild(this.cutDistanceInput);
    this.cutDistanceButton = document.createElement('button');
    this.cutDistanceButton.type = 'button';
    this.cutDistanceButton.className = 'building-plan-toolbar-button';
    this.cutDistanceButton.textContent = 'Split at distance';
    this.cutDistanceButton.addEventListener('click', async () => {
      if (!this.cutAllowed() || !this.cutTarget) return;
      await this.controller.splitWall(this.cutTarget.wallId, {
        offset: this.presentation.fromDisplayLength(Number(this.cutDistanceInput.value)),
      });
      this.cutTarget = this.cutDraft = null;
      this.render();
    });
    if (this.externalToolbar) {
      // The hint is in the status line.
      this.cutToolbar.append(label, this.cutDistanceButton);
      this.canvasContainer.appendChild(this.cutToolbar);
    } else {
      const hint = document.createElement('span');
      hint.textContent = 'Point at a wall, then click or enter a distance from its marked 0 end.';
      this.cutToolbar.append(label, this.cutDistanceButton, hint);
      this.container.appendChild(this.cutToolbar);
    }
    this.buildCornerControls();
  }

  cutAllowed() {
    return Boolean(
      this.controller?.getCutPlacement &&
      this.controller.canEdit() &&
      !this.readOnly &&
      (!this.externalToolbar || this.controller.toolbarState?.canResize)
    );
  }

  setPresentation(presentation) {
    this.presentation = presentation;
    if (!this.cutDistanceLabel) return;
    const text = `${presentation.t('Split distance')} [${presentation.unitFor()}]`;
    this.cutDistanceLabel.firstChild.textContent = `${text} `;
    this.cutDistanceInput.setAttribute('aria-label', text);
  }

  updateCutControls() {
    for (const [button, mode] of [
      [this.splitButton, 'split'],
      [this.rejoinButton, 'rejoin'],
    ]) {
      if (!button) continue;
      button.disabled = !this.cutAllowed();
      button.classList.toggle('active', this.mode === mode);
      button.setAttribute('aria-pressed', String(this.mode === mode));
    }
    this.updateStatusLine();
    if (!this.cutToolbar) return;
    this.cutToolbar.style.display = this.mode === 'split' ? 'flex' : 'none';
    const disabled = !this.cutAllowed() || !this.cutTarget;
    this.cutDistanceInput.disabled = disabled;
    this.cutDistanceButton.disabled = disabled;
  }

  updateCutPlacement(point, event) {
    if (!this.cutAllowed()) return;
    const options = {
      roomId: this.controller.scope?.roomId,
      preferredRoomId: this.controller.getActiveRoomId?.() || this.selectedRoomId,
      zoom: this.zoomLevel,
      bypass: Boolean(event.altKey),
    };
    this.cutDraft =
      this.mode === 'split'
        ? this.controller.getCutPlacement(point, options)
        : this.controller.getJoinPlacement(point, options);
    if (this.mode === 'split' && this.cutDraft) {
      this.cutTarget = this.cutDraft;
      // Shown to the centimetre (two decimals of the plan's unit); typed values keep their own.
      if (document.activeElement !== this.cutDistanceInput)
        this.cutDistanceInput.value = String(
          Math.round(this.presentation.toDisplayLength(this.cutDraft.offset) * 100) / 100
        );
    }
    this.render();
  }

  drawEditingCuts() {
    const roomId = this.controller?.scope?.roomId;
    const nodes = (this.editingCuts || []).filter((cut) => !roomId || cut.roomId === roomId);
    if (this.cutDraft) nodes.push(this.cutDraft);
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = this.planTheme.handle;
    ctx.strokeStyle = this.planTheme.accent;
    ctx.lineWidth = 1.5 / this.zoomLevel;
    for (const node of nodes) {
      ctx.beginPath();
      ctx.arc(
        node.point.x,
        node.point.y,
        (node === this.cutDraft ? 5 : 3) / this.zoomLevel,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.stroke();
    }
    if (this.cutDraft?.guide) {
      ctx.setLineDash([4 / this.zoomLevel, 4 / this.zoomLevel]);
      ctx.beginPath();
      ctx.moveTo(this.cutDraft.guide.from.x, this.cutDraft.guide.from.y);
      ctx.lineTo(this.cutDraft.guide.to.x, this.cutDraft.guide.to.y);
      ctx.stroke();
    }
    if (this.mode === 'split' && this.cutTarget?.start) {
      const origin = this.cutTarget.start;
      ctx.setLineDash([]);
      ctx.font = `${11 / this.zoomLevel}px sans-serif`;
      ctx.fillStyle = this.planTheme.accent;
      ctx.fillText('0', origin.x + 6 / this.zoomLevel, origin.y - 6 / this.zoomLevel);
    }
    ctx.restore();
  }

  snapRoomOrigin(room, origin) {
    if (!this.controller?.interaction) return this.snapPoint(origin);
    const initial = this.gestureRooms?.get(room.id);
    if (!initial?.vertices?.length) return origin;
    const points = initial.vertices.map((point) => ({
      x: point.x + origin.x - initial.rect.x,
      y: point.y + origin.y - initial.rect.y,
    }));
    const snapped = this.controller.interaction.snapTranslation(points, {
      roomId: room.id,
      zoom: this.zoomLevel,
      originalPoints: initial.vertices,
      bypass: Boolean(this.lastPointerEvent?.altKey),
    });
    return { x: origin.x + snapped[0].x - points[0].x, y: origin.y + snapped[0].y - points[0].y };
  }

  drawAlignmentGuides() {
    const guides = this.controller?.interaction?.getGuides() || [];
    if (!guides.length) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = this.planTheme.accent;
    ctx.lineWidth = 1.5 / this.zoomLevel;
    ctx.setLineDash([5 / this.zoomLevel, 4 / this.zoomLevel]);
    for (const guide of guides) {
      ctx.beginPath();
      ctx.moveTo(guide.from.x, guide.from.y);
      ctx.lineTo(guide.to.x, guide.to.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  stopEdgePan() {
    if (this.edgePanFrame != null) cancelAnimationFrame(this.edgePanFrame);
    this.edgePanFrame = null;
    this.edgePanEvent = null;
  }

  queueEdgePan(event) {
    if (!this.controller?.interaction || this.activePointerId == null) return;
    this.edgePanEvent = event;
    if (this.edgePanFrame != null) return;
    const tick = (now) => {
      this.edgePanFrame = null;
      const latest = this.edgePanEvent;
      if (!latest || this.activePointerId == null) return;
      if (
        !this.isPanning &&
        !this.panGesture &&
        (this.dragState?.moved || this.wallDragState?.moved || this.roomDraft || this.wallDraft)
      ) {
        const box = this.canvas.getBoundingClientRect();
        const delta = this.controller.interaction.edgePan(
          { x: latest.clientX - box.left, y: latest.clientY - box.top },
          { width: box.width, height: box.height },
          now
        );
        if (delta.x || delta.y) {
          this.panOffset.x += delta.x;
          this.panOffset.y += delta.y;
          this.pendingMove = latest;
          this.flushPointerMove();
        }
      }
      this.edgePanFrame = requestAnimationFrame(tick);
    };
    this.edgePanFrame = requestAnimationFrame(tick);
  }

  attachEvents() {
    this.canvas.style.touchAction = 'none';
    this.boundMouseDown = (event) => {
      if (this.activePointerId != null) return;
      this.activePointerId = event.pointerId;
      this.lastPointerEvent = event;
      this.gestureRooms = new Map(
        this.rooms.map((room) => [
          room.id,
          {
            rect: { ...room.rect },
            vertices: room.vertices?.map((point) => ({ ...point })),
          },
        ])
      );
      this.pendingFocus = null;
      activeCanvas = this;
      this.gestureGhost = null;
      // Where the press landed, for the insertion mark (3b); a hint a command showed goes.
      this.pressPoint = this.getCanvasPoint(event);
      if (this.hintOverride) {
        this.hintOverride = null;
        this.updateStatusLine();
      }
      this.controller?.clearPreview?.({ clearIssues: true });
      this.controller?.interaction?.begin();
      this.canvas.setPointerCapture?.(event.pointerId);
      return this.handleMouseDown(event);
    };
    const flushMove = () => {
      if (this.moveFrame != null) cancelAnimationFrame(this.moveFrame);
      this.moveFrame = null;
      const event = this.pendingMove;
      this.pendingMove = null;
      if (event) {
        this.handleMouseMove(event);
        // A drag or resize that starts takes the insertion mark away (3b).
        if (this.insertionMark && this.gestureMoved()) {
          this.insertionMark = null;
          this.render();
        }
        // Kept before the previews: a refused one shows it (receiveIssues).
        this.gestureGhost = refusalGhost(this);
        if (this.cornerDragState?.moved && this.cornerDragState.previewPoint) {
          const state = this.cornerDragState;
          this.controller.previewCorner(state.roomId, state.id, state.previewPoint);
        }
        if (this.dragState?.moved && this.controller?.previewRoom) {
          const room = this.rooms.find((entry) => entry.id === this.dragState.roomId);
          if (room) this.controller.previewRoom(room.id, room.previewRect || room.rect);
        }
        if (
          this.wallDragState?.moved &&
          this.controller?.previewWall &&
          this.wallDragState.previewPoints
        )
          this.controller.previewWall(this.wallDragState.wallId, this.wallDragState.previewPoints);
        // The wall closes behind a dragged opening and opens under it while it moves.
        if (this.openingDragState?.moved && this.controller?.previewOpening) {
          const state = this.openingDragState;
          const updates = this.openingDragUpdates(state);
          if (updates)
            this.controller.previewOpening(
              state.type === 'door' ? 'doors' : 'windows',
              state.openingId,
              updates
            );
        }
      }
    };
    this.flushPointerMove = flushMove;
    this.boundMouseMove = (event) => {
      this.lastPointerEvent = event;
      this.queueEdgePan(event);
      this.pendingMove = event;
      if (this.moveFrame == null) this.moveFrame = requestAnimationFrame(flushMove);
    };
    this.boundMouseUp = async (event) => {
      if (this.activePointerId !== event.pointerId) return;
      flushMove();
      this.activePointerId = null;
      this.stopEdgePan();
      this.canvas.releasePointerCapture?.(event.pointerId);
      const moved = this.gestureMoved();
      // A click only selects; a double-click opens the clicked item's row (boundDoubleClick).
      this.clickFocus = moved ? null : this.pendingFocus;
      this.pendingFocus = null;
      try {
        if (this.mode === 'pin') {
          if (this.pinTarget && this.cutAllowed()) this.controller.toggleWallPin(this.pinTarget);
          this.pinTarget = null;
          this.render();
        } else {
          await this.handleMouseUp(event);
          // A click on one of the room's walls, or inside it, leaves the insertion mark there.
          this.insertionMark = moved ? null : markFromClick(this, this.pressPoint);
          this.render();
        }
      } finally {
        this.controller?.clearPreview?.();
        this.gestureGhost = null;
      }
    };
    this.boundDoubleClick = () => {
      const focus = this.clickFocus;
      this.clickFocus = null;
      focus?.();
    };
    this.boundMouseLeave = () => {
      if (this.activePointerId == null) this.handleMouseLeave();
    };
    this.boundPointerCancel = () => {
      const pointerId = this.activePointerId;
      this.cornerDragState = null;
      this.activePointerId = null;
      this.stopEdgePan();
      if (pointerId != null && this.canvas.hasPointerCapture?.(pointerId))
        this.canvas.releasePointerCapture?.(pointerId);
      this.isPanning = false;
      this.panStartPoint = null;
      this.panStartOffset = null;
      this.pendingFocus = null;
      this.clickFocus = null;
      this.pendingMove = null;
      if (this.moveFrame != null) cancelAnimationFrame(this.moveFrame);
      this.moveFrame = null;
      this.handleMouseLeave();
      this.gestureGhost = null;
      this.controller?.clearPreview?.({ clearIssues: true });
    };
    this.boundGestureKey = (event) => {
      if (
        event.key === 'Escape' &&
        (this.activePointerId != null || ['split', 'rejoin', 'pin'].includes(this.mode))
      ) {
        event.preventDefault();
        event.stopPropagation();
        this.boundPointerCancel();
        if (['split', 'rejoin', 'pin'].includes(this.mode)) this.setMode(MODE_SELECT);
      } else if (event.key === 'Escape' && this.messages.length && activeCanvas === this) {
        event.preventDefault();
        event.stopPropagation();
        this.dismissMessages();
      }
    };
    this.canvas.addEventListener('pointercancel', this.boundPointerCancel);
    this.boundLostCapture = () => {
      if (this.activePointerId != null) this.boundPointerCancel();
    };
    this.canvas.addEventListener('lostpointercapture', this.boundLostCapture);
    window.addEventListener('keydown', this.boundGestureKey, true);

    this.boundWheelHandler = (event) => this.handleWheel(event);

    this.canvas.addEventListener('pointerdown', this.boundMouseDown);
    this.canvas.addEventListener('pointermove', this.boundMouseMove);
    this.canvas.addEventListener('pointerup', this.boundMouseUp);
    this.canvas.addEventListener('dblclick', this.boundDoubleClick);
    this.canvas.addEventListener('mouseleave', this.boundMouseLeave);
    this.canvas.addEventListener('wheel', this.boundWheelHandler, { passive: false });
  }

  subscribeToController() {
    if (!this.controller) return;
    this.unsubscribe = this.controller.subscribe((snapshot) => {
      const prevActiveFloor = this.activeFloorIndex;
      const prevFloorCount = this.floors ? this.floors.length : 0;

      this.rooms = snapshot.rooms || [];
      this.walls = snapshot.walls || [];
      this.wallFootprints = snapshot.wallFootprints;
      this.editingCuts = snapshot.editingCuts || [];
      this.columns = snapshot.columns || [];
      this.beams = snapshot.beams || [];
      this.doors = snapshot.doors || [];
      this.windows = snapshot.windows || [];
      this.floors = snapshot.floors || [];
      this.activeFloorIndex =
        typeof snapshot.activeFloorIndex === 'number' ? snapshot.activeFloorIndex : 0;
      this.hasFloors = this.floors.length > 0;
      if (prevActiveFloor !== this.activeFloorIndex) this.fitPending = true;
      if (prevFloorCount === 0 && this.hasFloors && this.wallFootprints?.length) {
        // Initial framing includes material outside room faces at the floor origin.
        // Later previews and completed gestures never recenter the viewport.
        const points = this.wallFootprints.flatMap((wall) => wall.polygons.flat());
        if (points.length)
          this.panOffset = {
            x: Math.max(0, 8 - Math.min(...points.map((point) => point.x))),
            y: Math.max(0, 8 - Math.min(...points.map((point) => point.y))),
          };
      }

      // Auto-select a primary room (preferring non-dimmed) when none is selected.
      if (!this.selectedRoomId && Array.isArray(this.rooms) && this.rooms.length > 0) {
        const primary = this.rooms.find((room) => room && !room.isDimmed) || this.rooms[0];
        if (primary) {
          this.selectedRoomId = primary.id;
        }
      }

      if (prevActiveFloor !== this.activeFloorIndex || prevFloorCount !== this.floors.length) {
        this.selectedRoomId = null;
        this.selectedWallId = null;
        this.wallDragState = null;
        this.selectedDoorId = null;
        this.selectedWindowId = null;
        this.openingDragState = null;
      } else {
        if (this.selectedRoomId && !this.rooms.find((room) => room.id === this.selectedRoomId)) {
          this.selectedRoomId = null;
        }
        if (this.selectedWallId && !this.walls.find((wall) => wall.id === this.selectedWallId)) {
          this.selectedWallId = null;
        }
        if (this.selectedDoorId && !this.doors.find((door) => door.id === this.selectedDoorId)) {
          this.selectedDoorId = null;
        }
        if (
          this.selectedWindowId &&
          !this.windows.find((window) => window.id === this.selectedWindowId)
        ) {
          this.selectedWindowId = null;
        }
        if (
          this.selectedColumnId &&
          !this.columns.find((column) => column.id === this.selectedColumnId)
        ) {
          this.selectedColumnId = null;
        }
        if (this.selectedBeamId && !this.beams.find((beam) => beam.id === this.selectedBeamId)) {
          this.selectedBeamId = null;
        }
      }

      this.applyHighlight();
      if (this.fitPending && this.fitToContent({ render: false })) this.fitPending = false;
      this.renderFloorTabs();
      this.updateCursor();
      this.updateButtonStates();
      this.render();
    });
  }

  /** Tells `onSelect` which element is selected, when that changes (doors before walls before rooms). */
  reportSelection() {
    if (typeof this.onSelect !== 'function') return;
    const pick = [
      ['doors', 'selectedDoorId'],
      ['windows', 'selectedWindowId'],
      ['columns', 'selectedColumnId'],
      ['beams', 'selectedBeamId'],
      ['walls', 'selectedWallId'],
      ['rooms', 'selectedRoomId'],
    ].find(([, field]) => this[field]);
    const key = pick ? `${pick[0]}:${this[pick[1]]}` : '';
    if (key === this.reportedSelection) return;
    this.reportedSelection = key;
    const entry = pick ? (this[pick[0]] || []).find((item) => item.id === this[pick[1]]) : null;
    this.onSelect(entry ? { collection: pick[0], entry } : null);
  }

  /**
   * Marks one element as selected from outside the canvas (a view-only entry shows its element,
   * a hovered list row its own). It is applied again after every data refresh; null clears it.
   * @param {{ collection: 'walls'|'doors'|'windows'|'columns'|'beams'|'rooms', id: string } | null} highlight
   */
  /**
   * The entry's own element, { collection, id } (1e, V1): drawn in full, the rest of its room at
   * half strength. Unlike `highlight`, a hovered list row doesn't change it.
   */
  setFocus(focus) {
    this.focus = focus || null;
    this.render();
  }

  /** How strongly an element is drawn (`draw/scope-levels.js`). */
  levelOf(collection, entry) {
    return (this.levels || NO_SCOPE).of(collection, entry);
  }

  /** Whether `point` lies on a faded room or wall, outside the room in scope. */
  isFadedAt(point) {
    if (!point || !this.levels) return false;
    const faded = (collection, entry) => this.levelOf(collection, entry) === OUT;
    return (
      (this.rooms || []).some((room) => faded('rooms', room) && pointInRoom(point, room)) ||
      (this.wallFootprints || []).some(
        (wall) =>
          faded('footprints', wall) &&
          wall.polygons.some((vertices) => pointInRoom(point, { vertices }))
      )
    );
  }

  setHighlight(highlight) {
    const previous = this.highlight;
    this.highlight = highlight || null;
    if (!this.highlight && previous) {
      const field = HIGHLIGHT_FIELDS[previous.collection];
      if (field && this[field] === previous.id) this[field] = null;
    }
    this.applyHighlight();
    this.render();
  }

  applyHighlight() {
    const highlight = this.highlight;
    const field = highlight && HIGHLIGHT_FIELDS[highlight.collection];
    if (!field || !(this[highlight.collection] || []).some((entry) => entry.id === highlight.id))
      return;
    for (const other of Object.values(HIGHLIGHT_FIELDS))
      if (other !== 'selectedRoomId') this[other] = null;
    this[field] = highlight.id;
  }

  /**
   * Fits the view to the rooms in scope (the floor's rooms, or the room an entry is about), with
   * a margin, zooming in no further than FIT_MAX_ZOOM.
   * @returns {boolean} false when there is nothing to fit or the canvas has no size yet
   */
  fitToContent({ render = true } = {}) {
    const inScope = (this.rooms || []).filter((room) => room && !room.isDimmed);
    const rooms = inScope.length ? inScope : this.rooms || [];
    const points = rooms.flatMap((room) => {
      if (room.vertices?.length) return room.vertices;
      const rect = room.rect;
      return rect
        ? [
            { x: rect.x, y: rect.y },
            { x: rect.x + rect.width, y: rect.y + rect.height },
          ]
        : [];
    });
    const { width, height } = this.getViewSize();
    if (!points.length || !(width > 0) || !(height > 0)) return false;
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const spanX = Math.max(Math.max(...xs) - minX, 1);
    const spanY = Math.max(Math.max(...ys) - minY, 1);
    const zoom = clamp(
      Math.min((width - 2 * FIT_MARGIN_PX) / spanX, (height - 2 * FIT_MARGIN_PX) / spanY),
      MIN_ZOOM,
      Math.min(FIT_MAX_ZOOM, MAX_ZOOM)
    );
    this.zoomLevel = zoom;
    this.panOffset = {
      x: width / 2 - (minX + spanX / 2) * zoom,
      y: height / 2 - (minY + spanY / 2) * zoom,
    };
    this.notifyZoomChange();
    if (render) this.render();
    return true;
  }

  updateCursor() {
    if (!this.canvas) return;
    if (this.mode !== MODE_SELECT) {
      this.canvas.style.cursor = 'crosshair';
      return;
    }

    if (this.dragState) {
      if (this.dragState.type === 'resize') {
        this.canvas.style.cursor = this.getCursorForHandle(this.dragState.handle);
        return;
      }
      this.canvas.style.cursor = 'grabbing';
      return;
    }

    if (this.wallDragState) {
      if (this.wallDragState.type === 'resize') {
        this.canvas.style.cursor = 'crosshair';
        return;
      }
      this.canvas.style.cursor = 'grabbing';
      return;
    }

    if (this.columnDragState) {
      this.canvas.style.cursor = 'grabbing';
      return;
    }

    if (this.beamDragState) {
      if (this.beamDragState.mode && this.beamDragState.mode.startsWith('resize')) {
        this.canvas.style.cursor = 'ew-resize';
      } else {
        this.canvas.style.cursor = 'grabbing';
      }
      return;
    }

    if (this.openingDragState) {
      if (this.openingDragState.handle === 'move') {
        this.canvas.style.cursor = 'grabbing';
      } else {
        this.canvas.style.cursor = 'ew-resize';
      }
      return;
    }

    const hover = this.hoverState;
    if (hover && hover.type === 'room-handle') {
      this.canvas.style.cursor = this.getCursorForHandle(hover.handle);
      return;
    }
    if (hover && hover.type === 'wall-handle') {
      this.canvas.style.cursor = 'crosshair';
      return;
    }
    if (hover && hover.type === 'wall-grip') {
      const grip = this.wallGrip();
      this.canvas.style.cursor = grip ? this.gripCursor(grip) : 'grab';
      return;
    }
    if (hover && hover.type === 'opening-handle') {
      this.canvas.style.cursor = hover.handle === 'center' ? 'grab' : 'ew-resize';
      return;
    }
    if (hover && hover.type === 'opening') {
      this.canvas.style.cursor = 'grab';
      return;
    }
    if (hover && hover.type === 'column') {
      this.canvas.style.cursor = 'grab';
      return;
    }
    if (hover && hover.type === 'beam-handle') {
      this.canvas.style.cursor = 'ew-resize';
      return;
    }
    if (hover && hover.type === 'beam') {
      this.canvas.style.cursor = 'grab';
      return;
    }
    if (hover && hover.type === 'faded') {
      this.canvas.style.cursor = 'default';
      return;
    }

    this.canvas.style.cursor = 'grab';
  }

  /**
   * Sizes the canvas to its box. The bitmap has one pixel per screen pixel
   * (devicePixelRatio), so lines and text stay sharp on high-density screens; positions, pan
   * and zoom stay in CSS pixels.
   */
  resizeCanvas() {
    const rect = this.canvasContainer.getBoundingClientRect();
    const ratio = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    this.pixelRatio = ratio;
    this.viewWidth = rect.width;
    this.viewHeight = rect.height;
    this.canvas.width = Math.round(rect.width * ratio);
    this.canvas.height = Math.round(rect.height * ratio);
    if (this.fitPending && this.fitToContent({ render: false })) this.fitPending = false;
    this.render();
  }

  /** Screen pixels in canvas units: handles and hit distances keep their size at any zoom. */
  px(value) {
    return value / (this.zoomLevel || 1);
  }

  /** The canvas box in CSS pixels (the bitmap is larger on high-density screens). */
  getViewSize() {
    return {
      width: this.viewWidth ?? this.canvas.width,
      height: this.viewHeight ?? this.canvas.height,
    };
  }

  /** Re-sizes the bitmap when the screen density changes (another monitor, browser zoom). */
  watchPixelRatio() {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    this.pixelRatioQuery?.removeEventListener?.('change', this.boundPixelRatioChange);
    this.boundPixelRatioChange ??= () => {
      this.resizeCanvas();
      this.watchPixelRatio();
    };
    this.pixelRatioQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    this.pixelRatioQuery.addEventListener?.('change', this.boundPixelRatioChange);
  }

  clearSelection() {
    this.insertionMark = null;
    this.selectedRoomId = null;
    this.selectedWallId = null;
    this.selectedDoorId = null;
    this.selectedWindowId = null;
    this.selectedColumnId = null;
    this.selectedBeamId = null;
    this.wallDragState = null;
    this.openingDragState = null;
    this.columnDragState = null;
    this.beamDragState = null;
    this.beamDraft = null;
    this.hoverState = null;
    this.rooms.forEach((room) => {
      if (room.previewRect) delete room.previewRect;
    });
    this.walls.forEach((wall) => {
      if (wall.previewPoints) delete wall.previewPoints;
    });
    if (Array.isArray(this.doors)) {
      this.doors.forEach((door) => {
        if (door.preview && door.preview.points) {
          delete door.preview;
        }
      });
    }
    if (Array.isArray(this.windows)) {
      this.windows.forEach((window) => {
        if (window.preview && window.preview.points) {
          delete window.preview;
        }
      });
    }
    if (Array.isArray(this.columns)) {
      this.columns.forEach((column) => {
        if (column.preview) {
          delete column.preview;
        }
      });
    }
    if (Array.isArray(this.beams)) {
      this.beams.forEach((beam) => {
        if (beam.preview) {
          delete beam.preview;
        }
      });
    }
    this.updateCursor();
    this.updateButtonStates();
    this.render();
  }

  async handleMouseDown(event) {
    // Panning with middle mouse button or space+left click (always allowed)
    if (event.button === 1 || (event.button === 0 && event.shiftKey)) {
      event.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      this.isPanning = true;
      this.panStartPoint = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      this.panStartOffset = { ...this.panOffset };
      this.canvas.style.cursor = 'grabbing';
      return;
    }

    // Block all other interactions in read-only mode
    if (this.readOnly) {
      const point = this.getCanvasPoint(event);
      const opening = this.findOpeningNearPoint(point);
      const column = this.findColumnHit(point)?.column;
      const beam = this.findBeamHit(point)?.beam;
      const wall = this.findWallNearPoint(point)?.wall;
      const room = this.findRoomAtPoint(point);
      this.pendingFocus = opening
        ? () =>
            this.controller?.[opening.type === 'door' ? 'focusDoor' : 'focusWindow']?.(
              opening.opening.id
            )
        : column
          ? () => this.controller?.focusColumn?.(column.id)
          : beam
            ? () => this.controller?.focusBeam?.(beam.id)
            : wall
              ? () => this.controller?.focusWall?.(wall.id)
              : room
                ? () => this.controller?.focusRoom?.(room.id)
                : null;
      return;
    }

    const caps = getCapabilities(this.controller);
    const point = this.getCanvasPoint(event);
    if (this.mode === 'pin') {
      this.pendingFocus = null;
      this.pinTarget = this.cutAllowed()
        ? this.findWallNearPoint(point, this.controller.scope?.roomId)?.wall.id
        : null;
      return;
    }
    if (['split', 'rejoin'].includes(this.mode)) {
      this.pendingFocus = null;
      this.cutGesture = this.cutAllowed();
      if (this.cutGesture) this.updateCutPlacement(point, event);
      return;
    }

    if (this.mode === MODE_DRAW_COLUMN) {
      if (!caps.canDrawColumn) return;
      const room = this.findRoomAtPoint(point);
      if (!room) {
        return;
      }
      const roomRect = this.getRoomRect(room.id);
      if (!roomRect) {
        return;
      }
      const placed = this.snapColumnPoint(point, {
        roomId: room.id,
        width: DEFAULT_COLUMN_WIDTH_M,
        height: DEFAULT_COLUMN_HEIGHT_M,
      });
      if (!placed) return;
      const ratios = columnRatios(placed.point, roomRect);
      const created = await this.controller?.createColumn?.(room.id, {
        centerU: ratios.u,
        centerV: ratios.v,
        wallSegmentIndex: placed.wallSegmentIndex,
        wallRatio: placed.wallRatio,
        width: DEFAULT_COLUMN_WIDTH_M,
        height: DEFAULT_COLUMN_HEIGHT_M,
        vertical: DEFAULT_COLUMN_VERTICAL_HEIGHT_M,
      });
      if (created) {
        this.selectedColumnId = created.id;
        this.selectedBeamId = null;
        this.selectedWallId = null;
        this.selectedDoorId = null;
        this.selectedWindowId = null;
      }
      this.render();
      return;
    }

    if (this.mode === MODE_DRAW_BEAM) {
      if (!caps.canDrawBeam) return;
      const room = this.findRoomAtPoint(point);
      if (!room) {
        return;
      }
      const roomRect = this.getRoomRect(room.id);
      if (!roomRect) {
        return;
      }
      const startPoint = clampPointToRoom(point, roomRect);
      this.beamDraft = {
        roomId: room.id,
        start: startPoint,
        current: startPoint,
      };
      this.updateBeamDraft(startPoint);
      this.render();
      return;
    }

    if (this.mode === MODE_DRAW_DOOR || this.mode === MODE_DRAW_WINDOW) {
      if (this.mode === MODE_DRAW_DOOR && !caps.canDrawDoor) return;
      if (this.mode === MODE_DRAW_WINDOW && !caps.canDrawWindow) return;
      const wallHit = this.findWallNearPoint(point);
      if (wallHit && wallHit.wall) {
        await this.placeOpening(this.mode === MODE_DRAW_DOOR ? 'door' : 'window', wallHit);
        this.updateButtonStates();
        this.updateCursor();
        this.render();
      }
      return;
    }

    if (this.mode === MODE_SELECT) {
      const corner = this.cornerAt(point);
      if (corner) {
        this.cornerDragState = { ...corner, pointerStart: point, moved: false };
        this.selectedRoomId = corner.roomId;
        this.selectedWallId = null;
        this.pendingFocus = () => this.controller.focusRoom(corner.roomId);
        this.render();
        return;
      }
      const roomHandleHit = this.findRoomHandle(point);
      if (roomHandleHit && roomHandleHit.room) {
        if (!caps.canResize) return;
        const { room, handle } = roomHandleHit;
        const rect = room.previewRect || room.rect;
        if (rect) {
          this.selectedRoomId = room.id;
          this.selectedWallId = null;
          this.selectedDoorId = null;
          this.selectedWindowId = null;
          this.dragState = {
            type: 'resize',
            roomId: room.id,
            handle,
            baseRect: { ...rect },
            pointerStart: point,
            moved: false,
          };
          this.setHoverState(null);
          this.pendingFocus = () => this.controller?.focusRoom(room.id);
          this.updateButtonStates();
          this.updateCursor();
          this.render();
          return;
        }
      }

      const wallHandleHit = this.findWallHandle(point);
      if (wallHandleHit && wallHandleHit.wall) {
        if (!caps.canResize || !caps.canMoveStructural) return;
        const { wall, index } = wallHandleHit;
        const basePoints =
          wall.previewPoints && wall.previewPoints.length > 0
            ? clonePoints(wall.previewPoints)
            : clonePoints(wall.points);
        this.selectedRoomId = wall.roomId;
        this.selectedWallId = wall.id;
        this.selectedDoorId = null;
        this.selectedWindowId = null;
        this.wallDragState = {
          type: 'resize',
          wallId: wall.id,
          physicalWallId: wall.physicalWallId,
          handleIndex: index,
          originalPoints: basePoints,
          pointerStart: point,
          moved: false,
        };
        this.setHoverState(null);
        this.pendingFocus = () => this.controller?.focusWall(wall.id);
        this.updateButtonStates();
        this.updateCursor();
        this.render();
        return;
      }

      // The selected wall's grip sits over whatever is under it (an opening in the middle).
      const gripWall = this.findWallGrip(point);
      if (gripWall) {
        this.startWallMove(gripWall, point);
        return;
      }

      const columnHit = this.findColumnHit(point);
      if (columnHit) {
        if (!caps.canMoveStructural) return;
        const { column } = columnHit;
        this.selectedColumnId = column.id;
        this.selectedBeamId = null;
        this.selectedWallId = null;
        this.selectedDoorId = null;
        this.selectedWindowId = null;
        const center = column._renderCenter || { x: point.x, y: point.y };
        this.columnDragState = {
          columnId: column.id,
          pointerStart: point,
          offsetX: center.x - point.x,
          offsetY: center.y - point.y,
          lastCenter: { x: center.x, y: center.y },
          moved: false,
        };
        this.setHoverState(null);
        if (typeof this.controller?.focusColumn === 'function') {
          this.pendingFocus = () => this.controller.focusColumn(column.id);
        }
        this.updateButtonStates();
        this.updateCursor();
        this.render();
        return;
      }

      const beamHandleHit = this.findBeamHandle(point);
      if (beamHandleHit) {
        if (!caps.canResize || !caps.canMoveStructural) return;
        const { beam, handle } = beamHandleHit;
        this.selectedBeamId = beam.id;
        this.selectedColumnId = null;
        this.selectedWallId = null;
        this.selectedDoorId = null;
        this.selectedWindowId = null;
        this.beamDragState = {
          beamId: beam.id,
          mode: handle === 'start' ? 'resize-start' : 'resize-end',
          handle,
          pointerStart: point,
          roomId: beam.roomId,
          original: {
            startPoint: beam._renderStart ? { ...beam._renderStart } : null,
            endPoint: beam._renderEnd ? { ...beam._renderEnd } : null,
            startU: beam.startU,
            startV: beam.startV,
            endU: beam.endU,
            endV: beam.endV,
            width: beam.width,
            height: beam.height,
            wallSegmentIndex: beam.wallSegmentIndex,
            startRatio: beam.startRatio,
            endRatio: beam.endRatio,
          },
        };
        this.setHoverState(null);
        if (typeof this.controller?.focusBeam === 'function') {
          this.pendingFocus = () => this.controller.focusBeam(beam.id);
        }
        this.updateButtonStates();
        this.updateCursor();
        this.render();
        return;
      }

      const beamHit = this.findBeamHit(point);
      if (beamHit) {
        if (!caps.canMoveStructural) return;
        const { beam } = beamHit;
        this.selectedBeamId = beam.id;
        this.selectedColumnId = null;
        this.selectedWallId = null;
        this.selectedDoorId = null;
        this.selectedWindowId = null;
        const roomRect = this.getRoomRect(beam.roomId);
        const startPoint = beam._renderStart;
        const endPoint = beam._renderEnd;
        this.beamDragState = {
          beamId: beam.id,
          mode: 'move',
          pointerStart: point,
          roomId: beam.roomId,
          original: {
            startPoint: startPoint ? { ...startPoint } : null,
            endPoint: endPoint ? { ...endPoint } : null,
            startU: beam.startU,
            startV: beam.startV,
            endU: beam.endU,
            endV: beam.endV,
            width: beam.width,
            height: beam.height,
            wallSegmentIndex: beam.wallSegmentIndex,
            startRatio: beam.startRatio,
            endRatio: beam.endRatio,
          },
          roomRect,
        };
        this.setHoverState(null);
        if (typeof this.controller?.focusBeam === 'function') {
          this.pendingFocus = () => this.controller.focusBeam(beam.id);
        }
        this.updateButtonStates();
        this.updateCursor();
        this.render();
        return;
      }

      const openingHandleHit = this.findOpeningHandle(point);
      if (openingHandleHit) {
        if (!caps.canResize) return;
        const { handle } = openingHandleHit;
        this.grabOpening(openingHandleHit, handle === 'center' ? 'move' : handle, point);
        return;
      }

      // Anywhere else on an opening selects it and moves it, as its centre handle does (before,
      // only the centre selected an opening that wasn't selected yet).
      const openingHit = this.findOpeningNearPoint(point);
      if (openingHit) {
        if (!caps.canMove) return;
        this.grabOpening(openingHit, 'move', point);
        return;
      }
    }

    if (this.mode === MODE_DRAW_ROOM) {
      if (!caps.canDrawRoom) return;
      if (!this.hasFloors) {
        return;
      }
      this.roomDraft = { start: point, current: point };
      this.render();
      return;
    }

    if (this.mode === MODE_DRAW_WALL) {
      if (!caps.canDrawWall) return;
      if (!this.selectedRoomId) {
        const hitRoom = this.findRoomAtPoint(point);
        if (hitRoom) {
          this.selectedRoomId = hitRoom.id;
        } else {
          return;
        }
      }
      const room = this.findRoomAtPoint(point);
      if (!room || room.id !== this.selectedRoomId) {
        this.wallDraft = null;
        return;
      }

      const snapStart = this.snapFreeWallPoint(point, room);
      this.wallDraft = { roomId: room.id, start: snapStart, end: snapStart };
      this.render();
      return;
    }

    const wallHit = this.findWallNearPoint(point);
    const wall = wallHit ? wallHit.wall : null;
    const room = this.findRoomAtPoint(point);

    if (this.mode === MODE_SELECT && wall) {
      if (!caps.canMoveStructural) {
        this.pendingFocus = () => this.controller?.focusWall?.(wall.id);
        return;
      }
      this.startWallMove(wall, point);
      return;
    }

    if (room) {
      // Openings follow `canMove`; the whole room moves only where `canMoveRoom` (a floor canvas).
      if (!caps.canMoveRoom) {
        this.pendingFocus = () => this.controller?.focusRoom(room.id);
        // In the room's own entry, a click on its floor puts the insertion mark there (3b), so
        // an element selected before (a wall a door would go in) is no longer.
        if (this.controller?.scope?.roomId === room.id) {
          this.selectedWallId = this.selectedDoorId = this.selectedWindowId = null;
          this.selectedColumnId = this.selectedBeamId = null;
          this.render();
        }
        return;
      }
      this.selectedRoomId = room.id;
      this.selectedWallId = null;
      this.selectedDoorId = null;
      this.selectedWindowId = null;
      this.dragState = {
        type: 'move',
        roomId: room.id,
        pointerStart: point,
        moved: false,
        offsetX: point.x - room.rect.x,
        offsetY: point.y - room.rect.y,
      };
      this.setHoverState(null);
      this.pendingFocus = () => this.controller?.focusRoom(room.id);
      this.updateButtonStates();
      this.updateCursor();
      this.render();
      return;
    }

    this.clearSelection();
  }

  handleMouseMove(event) {
    // Handle panning (always allowed)
    if (this.isPanning && this.panStartPoint && this.panStartOffset) {
      const rect = this.canvas.getBoundingClientRect();
      const currentX = event.clientX - rect.left;
      const currentY = event.clientY - rect.top;
      this.panOffset = {
        x: this.panStartOffset.x + (currentX - this.panStartPoint.x),
        y: this.panStartOffset.y + (currentY - this.panStartPoint.y),
      };
      this.render();
      return;
    }

    // Block edits while retaining the existing pan gesture in every tool.
    if (this.readOnly || this.mode === 'pin') {
      if (this.mode === MODE_SELECT)
        this.setHoverState(this.isFadedAt(this.getCanvasPoint(event)) ? FADED_HOVER : null);
      return;
    }

    const point = this.getCanvasPoint(event);
    if (['split', 'rejoin'].includes(this.mode)) {
      this.updateCutPlacement(point, event);
      return;
    }

    if (
      this.mode === MODE_SELECT &&
      !this.dragState &&
      !this.cornerDragState &&
      !this.wallDragState &&
      !this.openingDragState &&
      !this.roomDraft &&
      !this.wallDraft
    ) {
      const roomHandle = this.findRoomHandle(point);
      if (roomHandle) {
        this.setHoverState({
          type: 'room-handle',
          handle: roomHandle.handle,
          roomId: roomHandle.room.id,
        });
      } else {
        const wallHandle = this.findWallHandle(point);
        const gripWall = wallHandle ? null : this.findWallGrip(point);
        if (wallHandle) {
          this.setHoverState({
            type: 'wall-handle',
            handle: wallHandle.index === 0 ? 'start' : 'end',
            wallId: wallHandle.wall.id,
          });
        } else if (gripWall) {
          this.setHoverState({ type: 'wall-grip', wallId: gripWall.id });
        } else {
          const columnHit = this.findColumnHit(point);
          if (columnHit) {
            this.setHoverState({
              type: 'column',
              columnId: columnHit.column.id,
              hit: columnHit.type,
            });
          } else {
            const beamHandle = this.findBeamHandle(point);
            if (beamHandle) {
              this.setHoverState({
                type: 'beam-handle',
                beamId: beamHandle.beam.id,
                handle: beamHandle.handle,
              });
            } else {
              const beamHit = this.findBeamHit(point);
              if (beamHit) {
                this.setHoverState({
                  type: 'beam',
                  beamId: beamHit.beam.id,
                  hit: beamHit.type,
                });
              } else {
                const openingHandle = this.findOpeningHandle(point);
                if (openingHandle) {
                  this.setHoverState({
                    type: 'opening-handle',
                    handle: openingHandle.handle,
                    openingType: openingHandle.type,
                    openingId: openingHandle.openingId,
                  });
                } else {
                  const openingHit = this.findOpeningNearPoint(point);
                  if (openingHit) {
                    this.setHoverState({
                      type: 'opening',
                      openingType: openingHit.type,
                      openingId: openingHit.openingId,
                    });
                  } else {
                    this.setHoverState(this.isFadedAt(point) ? FADED_HOVER : null);
                  }
                }
              }
            }
          }
        }
      }
    }

    if (this.mode === MODE_DRAW_ROOM && this.roomDraft) {
      this.roomDraft.current = point;
      this.render();
      return;
    }

    if (this.mode === MODE_DRAW_WALL && this.wallDraft) {
      const room = this.rooms.find((r) => r.id === this.wallDraft.roomId);
      if (!room) return;
      this.wallDraft.end = this.snapFreeWallPoint(point, room, { from: this.wallDraft.start });
      this.render();
      return;
    }

    if (this.mode === MODE_DRAW_BEAM && this.beamDraft) {
      this.updateBeamDraft(point);
      this.render();
      return;
    }

    if (this.mode === MODE_SELECT && this.dragState) {
      const state = this.dragState;
      const room = this.rooms.find((r) => r.id === state.roomId);
      if (!room) return;

      if (state.type === 'move') {
        state.moved =
          state.moved ||
          Math.hypot(point.x - state.pointerStart.x, point.y - state.pointerStart.y) > 3;
        const width = room.rect.width;
        const height = room.rect.height;
        const snappedOrigin = this.snapRoomOrigin(room, {
          x: point.x - state.offsetX,
          y: point.y - state.offsetY,
        });
        const newRect = roundRectValues({
          x: snappedOrigin.x,
          y: snappedOrigin.y,
          width,
          height,
        });

        this.previewRoomMovement(room.id, newRect);
      } else if (state.type === 'resize') {
        const snappedPoint = this.snapPoint(point);
        const newRect = this.computeResizedRect(state.baseRect, state.handle, snappedPoint);
        if (newRect) {
          state.moved =
            state.moved ||
            newRect.x !== state.baseRect.x ||
            newRect.y !== state.baseRect.y ||
            newRect.width !== state.baseRect.width ||
            newRect.height !== state.baseRect.height;
          const roundedRect = roundRectValues(newRect);
          this.previewRoomMovement(room.id, roundedRect);
          state.previewRect = roundedRect;
        }
      }

      this.render();
      return;
    }

    if (this.mode === MODE_SELECT && this.cornerDragState) {
      const state = this.cornerDragState;
      const delta = { x: point.x - state.pointerStart.x, y: point.y - state.pointerStart.y };
      state.moved ||= Math.hypot(delta.x, delta.y) * this.zoomLevel > 3;
      if (state.moved)
        state.previewPoint = this.controller.interaction.snapCorner(
          {
            x: state.point.x + delta.x,
            y: state.point.y + delta.y,
          },
          {
            originalPoint: state.point,
            roomId: state.roomId,
            vertexId: state.id,
            zoom: this.zoomLevel,
            bypass: Boolean(event.altKey),
          }
        );
      return;
    }

    if (this.mode === MODE_SELECT && this.wallDragState) {
      const state = this.wallDragState;
      const previewWall = this.walls.find((w) => w.id === state.wallId);
      // Candidate topology can replace this facing row during the gesture.
      // Read stable metadata from the accepted scene; write previews only to the view.
      const wall = this.controller?.walls?.get?.(state.wallId) || previewWall;
      if (!wall) return;
      const room = this.rooms.find((r) => r.id === wall.roomId);
      if (!room || !room.rect) return;

      if (state.type === 'move') {
        const deltaX = point.x - state.pointerStart.x;
        const deltaY = point.y - state.pointerStart.y;

        if (!state.moved && Math.abs(deltaX) + Math.abs(deltaY) > 1) {
          state.moved = true;
        }

        const newPoints = state.originalPoints.map((pt) => {
          const translated = {
            x: pt.x + deltaX,
            y: pt.y + deltaY,
          };
          if (this.controller?.interaction) return translated;
          if (wall.isBoundary || wall.isCutPortion) {
            const increment = this.gridSize / 10;
            return {
              x: Math.round(translated.x / increment) * increment,
              y: Math.round(translated.y / increment) * increment,
            };
          }
          const clamped = {
            x: clamp(translated.x, room.rect.x, room.rect.x + room.rect.width),
            y: clamp(translated.y, room.rect.y, room.rect.y + room.rect.height),
          };
          return this.snapPoint(clamped);
        });

        const freeWall = !wall.isBoundary && !wall.isCutPortion;
        const snappedPoints =
          freeWall && this.controller?.interaction?.snapFreeWallTranslation
            ? this.controller.interaction.snapFreeWallTranslation(newPoints, {
                roomId: room.id,
                wallId: wall.id,
                zoom: this.zoomLevel,
                originalPoints: state.originalPoints,
                bypass: Boolean(this.lastPointerEvent?.altKey),
              })
            : (wall.isBoundary || wall.isCutPortion) && this.controller?.interaction
              ? this.controller.interaction.snapWallTranslation(newPoints, {
                  perpendicular: wall.isCutPortion && !wall.isBoundary,
                  roomId: room.id,
                  physicalWallId: state.physicalWallId,
                  editingGroupId: wall.isCutPortion ? wall.editingGroupId : null,
                  faceId: wall.id,
                  zoom: this.zoomLevel,
                  originalPoints: state.originalPoints,
                  bypass: Boolean(this.lastPointerEvent?.altKey),
                })
              : newPoints;
        const roundedPoints = roundPoints(snappedPoints);
        if (previewWall) previewWall.previewPoints = roundedPoints;
        state.previewPoints = roundedPoints;
      } else if (state.type === 'resize') {
        // A click within a handle's tolerance is still a click, even off its exact centre.
        if (!state.moved && distance(point, state.pointerStart) <= 1) return;
        state.moved = true;
        const snappedPoint = wall.isBoundary
          ? {
              x: Math.round(point.x / (this.gridSize / 10)) * (this.gridSize / 10),
              y: Math.round(point.y / (this.gridSize / 10)) * (this.gridSize / 10),
            }
          : this.snapFreeWallPoint(point, room, {
              from: state.originalPoints[
                state.handleIndex === 0 ? state.originalPoints.length - 1 : 0
              ],
              wallId: wall.id,
            });
        let newPoints = state.originalPoints.map((pt, idx) =>
          idx === state.handleIndex ? { ...snappedPoint } : { ...pt }
        );
        if ((wall.isBoundary || wall.isCutPortion) && this.controller?.interaction) {
          const a = state.originalPoints[0],
            b = state.originalPoints.at(-1);
          const length = Math.hypot(b.x - a.x, b.y - a.y);
          const normal = { x: -(b.y - a.y) / length, y: (b.x - a.x) / length };
          const base = state.originalPoints[state.handleIndex];
          const amount = (point.x - base.x) * normal.x + (point.y - base.y) * normal.y;
          newPoints = this.controller.interaction.snapTranslation(
            state.originalPoints.map((pt) => ({
              x: pt.x + normal.x * amount,
              y: pt.y + normal.y * amount,
            })),
            {
              roomId: room.id,
              physicalWallId: state.physicalWallId,
              editingGroupId: wall.isCutPortion ? wall.editingGroupId : null,
              faceId: wall.id,
              zoom: this.zoomLevel,
              originalPoints: state.originalPoints,
              bypass: Boolean(this.lastPointerEvent?.altKey),
            }
          );
        }

        const roundedPoints = roundPoints(newPoints);
        if (previewWall) previewWall.previewPoints = roundedPoints;
        state.previewPoints = roundedPoints;
      }

      this.render();
      return;
    }

    if (this.mode === MODE_SELECT && this.openingDragState) {
      const state = this.openingDragState;
      const opening = this.getOpeningById(state.type, state.openingId);
      if (!opening) return;
      const wall = this.walls.find((w) => w.id === opening.wallId);
      if (!wall) return;

      const renderedPoints = this.getRenderedWallPoints(wall);
      if (!Array.isArray(renderedPoints) || renderedPoints.length < 2) return;

      if (state.handle === 'move') {
        // A click doesn't move the opening; a drag keeps the point where it was grabbed under
        // the pointer (it can be grabbed anywhere on its band, not only at its centre).
        if (!state.moved && distance(point, state.pointerStart) < this.px(3)) return;
        let segmentIndex = state.originalSegmentIndex;
        let centerRatio;
        const wallHit = this.findWallNearPoint(point);
        if (wallHit && wallHit.wall && wallHit.wall.id === wall.id) {
          segmentIndex = wallHit.segmentIndex;
          centerRatio = clamp(wallHit.ratio, 0, 1);
        } else {
          const segment = getSegmentPoints(renderedPoints, segmentIndex);
          if (!segment) return;
          centerRatio = clamp(projectScalarToSegment(point, segment.start, segment.end), 0, 1);
        }
        if (state.grabOffset === undefined) {
          const segment = getSegmentPoints(renderedPoints, state.originalSegmentIndex);
          state.grabOffset =
            segment && state.grabCenter
              ? projectScalarToSegment(state.pointerStart, segment.start, segment.end) -
                projectScalarToSegment(state.grabCenter, segment.start, segment.end)
              : 0;
        }
        centerRatio -= state.grabOffset;
        // Between the columns against the wall (3b), when the opening fits there.
        const between =
          segmentIndex === state.originalSegmentIndex
            ? columnStretch(this, wall, segmentIndex, state.originalStart, state.originalEnd)
            : null;
        const stretch = between && between[1] - between[0] >= state.spanRatio ? between : [0, 1];
        const minCenter = stretch[0] + state.spanRatio / 2;
        const maxCenter = stretch[1] - state.spanRatio / 2;
        const clampedCenter = clamp(centerRatio, minCenter, maxCenter);
        const startRatio = clamp(clampedCenter - state.spanRatio / 2, 0, 1 - state.spanRatio);
        const endRatio = clamp(startRatio + state.spanRatio, 0, 1);
        // Whole centimetres from the wall start, the width kept.
        const snapped = keepInStretch(
          snapOpeningRatios(wall.bindings?.[segmentIndex], startRatio, endRatio, {
            keepWidth: true,
          }),
          between && stretch,
          wall.bindings?.[segmentIndex],
          true
        );
        state.preview = {
          startRatio: snapped.startRatio,
          endRatio: snapped.endRatio,
          segmentIndex,
        };
        state.moved = true;
      } else {
        const segment = getSegmentPoints(renderedPoints, state.originalSegmentIndex);
        if (!segment) return;
        const ratio = clamp(projectScalarToSegment(point, segment.start, segment.end), 0, 1);
        let startRatio = state.originalStart;
        let endRatio = state.originalEnd;
        // Not past the columns against the wall (3b).
        const stretch = columnStretch(
          this,
          wall,
          state.originalSegmentIndex,
          state.originalStart,
          state.originalEnd
        ) || [0, 1];
        if (state.handle === 'start') {
          const maxStart = Math.max(0, endRatio - MIN_OPENING_RATIO);
          startRatio = clamp(ratio, Math.min(stretch[0], maxStart), maxStart);
          if (endRatio - startRatio < MIN_OPENING_RATIO) {
            startRatio = Math.max(0, endRatio - MIN_OPENING_RATIO);
          }
        } else {
          endRatio = clamp(
            ratio,
            Math.max(startRatio + MIN_OPENING_RATIO, 0),
            Math.max(stretch[1], startRatio + MIN_OPENING_RATIO)
          );
          if (endRatio - startRatio < MIN_OPENING_RATIO) {
            endRatio = Math.min(1, startRatio + MIN_OPENING_RATIO);
          }
        }
        const spanRatio = clamp(endRatio - startRatio, MIN_OPENING_RATIO, 1);
        // Both ends on whole centimetres.
        const snapped = keepInStretch(
          snapOpeningRatios(wall.bindings?.[state.originalSegmentIndex], startRatio, endRatio),
          stretch,
          wall.bindings?.[state.originalSegmentIndex],
          false
        );
        state.preview = {
          startRatio: snapped.startRatio,
          endRatio: snapped.endRatio,
          segmentIndex: state.originalSegmentIndex,
        };
        state.spanRatio = spanRatio;
        state.moved =
          state.moved ||
          Math.abs(startRatio - state.originalStart) > 0.0005 ||
          Math.abs(endRatio - state.originalEnd) > 0.0005;
      }

      this.render();
      return;
    }

    if (this.mode === MODE_SELECT && this.columnDragState) {
      const state = this.columnDragState;
      const column = this.columns.find((c) => c.id === state.columnId);
      if (!column) return;
      const roomRect = this.getRoomRect(column.roomId);
      if (!roomRect) return;

      // A click that wobbles a little is still a click: it doesn't move the column.
      if (!state.moved && distance(point, state.pointerStart) <= this.px(3)) return;
      const snapped = this.snapColumnPoint(
        { x: point.x + state.offsetX, y: point.y + state.offsetY },
        {
          roomId: column.roomId,
          columnId: column.id,
          width: column.width || DEFAULT_COLUMN_WIDTH_M,
          height: column.height || DEFAULT_COLUMN_HEIGHT_M,
          from: state.lastCenter,
        }
      );
      if (!snapped) return;
      state.lastCenter = snapped.point;
      const ratios = columnRatios(snapped.point, roomRect);
      column.preview = {
        centerU: ratios.u,
        centerV: ratios.v,
        wallSegmentIndex: snapped.wallSegmentIndex,
        wallRatio: snapped.wallRatio,
      };
      state.moved = true;
      this.render();
      return;
    }

    if (this.mode === MODE_SELECT && this.beamDragState) {
      const state = this.beamDragState;
      const beam = this.beams.find((b) => b.id === state.beamId);
      if (!beam) return;
      const roomRect = this.getRoomRect(state.roomId || beam.roomId);
      if (!roomRect) return;

      let startPoint;
      let endPoint;

      if (state.mode === 'move') {
        const originalStartPoint = state.original.startPoint || {
          x: roomRect.x + state.original.startU * roomRect.width,
          y: roomRect.y + state.original.startV * roomRect.height,
        };
        const originalEndPoint = state.original.endPoint || {
          x: roomRect.x + state.original.endU * roomRect.width,
          y: roomRect.y + state.original.endV * roomRect.height,
        };
        const deltaX = point.x - state.pointerStart.x;
        const deltaY = point.y - state.pointerStart.y;
        startPoint = {
          x: originalStartPoint.x + deltaX,
          y: originalStartPoint.y + deltaY,
        };
        endPoint = {
          x: originalEndPoint.x + deltaX,
          y: originalEndPoint.y + deltaY,
        };
        startPoint = clampPointToRoom(startPoint, roomRect);
        endPoint = clampPointToRoom(endPoint, roomRect);
      } else if (state.mode === 'resize-start') {
        const originalEndPoint = {
          x: roomRect.x + state.original.endU * roomRect.width,
          y: roomRect.y + state.original.endV * roomRect.height,
        };
        startPoint = clampPointToRoom(point, roomRect);
        endPoint = originalEndPoint;
      } else if (state.mode === 'resize-end') {
        const originalStartPoint = {
          x: roomRect.x + state.original.startU * roomRect.width,
          y: roomRect.y + state.original.startV * roomRect.height,
        };
        startPoint = originalStartPoint;
        endPoint = clampPointToRoom(point, roomRect);
      } else {
        return;
      }

      const preview = this.computeBeamPreview(beam.roomId, startPoint, endPoint);
      if (preview) {
        beam.preview = preview;
        if (!state.moved) {
          const diff =
            Math.abs(preview.startU - beam.startU) +
            Math.abs(preview.startV - beam.startV) +
            Math.abs(preview.endU - beam.endU) +
            Math.abs(preview.endV - beam.endV);
          if (diff > 0.0005) {
            state.moved = true;
          }
        }
      }
      this.render();
      return;
    }
  }

  async handleMouseUp(event) {
    // Stop panning (always allowed)
    if (this.isPanning) {
      this.isPanning = false;
      this.panStartPoint = null;
      this.panStartOffset = null;
      this.updateCursor();
      return;
    }

    // Block all other interactions in read-only mode
    if (this.readOnly) return;

    const point = this.getCanvasPoint(event);
    if (['split', 'rejoin'].includes(this.mode)) {
      const target = this.cutDraft;
      const allowed = this.cutGesture && this.cutAllowed();
      this.cutGesture = false;
      if (allowed && target)
        await (this.mode === 'split'
          ? this.controller.splitWall(target.wallId, { offset: target.offset })
          : this.controller.rejoinCut(target.id));
      this.cutDraft = this.cutTarget = null;
      this.render();
      return;
    }

    if (this.mode === MODE_DRAW_ROOM && this.roomDraft) {
      const rect = this.normalizeRectangle(this.roomDraft.start, point);
      this.roomDraft = null;

      if (rect.width >= 5 && rect.height >= 5) {
        const snapped = {
          x: this.snapCoordinate(rect.x),
          y: this.snapCoordinate(rect.y),
          width: this.snapSize(rect.width),
          height: this.snapSize(rect.height),
        };
        const created = await this.controller?.createRoom(snapped);
        if (created) this.selectedRoomId = created.id;
      }

      this.updateCursor();
      this.updateButtonStates();
      this.render();
      return;
    }

    if (this.mode === MODE_DRAW_WALL && this.wallDraft) {
      const room = this.rooms.find((r) => r.id === this.wallDraft.roomId);
      if (room) {
        const endPoint = this.snapFreeWallPoint(point, room, { from: this.wallDraft.start });
        if (distance(this.wallDraft.start, endPoint) > 3) {
          const wallPoints = roundPoints([this.wallDraft.start, endPoint]);
          const created = await this.controller?.createWall(room.id, wallPoints);
          if (created) this.selectedWallId = created.id;
        }
      }
      this.wallDraft = null;
      this.updateCursor();
      this.updateButtonStates();
      this.render();
      return;
    }

    if (this.mode === MODE_DRAW_BEAM && this.beamDraft) {
      const draft = this.beamDraft;
      if (draft.preview) {
        const preview = draft.preview;
        const startPoint = preview.startPoint;
        const endPoint = preview.endPoint;
        const length = startPoint && endPoint ? distance(startPoint, endPoint) : 0;
        if (length > 5) {
          const created = await this.controller?.createBeam?.(draft.roomId, {
            startU: preview.startU,
            startV: preview.startV,
            endU: preview.endU,
            endV: preview.endV,
            wallSegmentIndex: preview.wallSegmentIndex,
            startRatio: preview.startRatio,
            endRatio: preview.endRatio,
            width: DEFAULT_BEAM_WIDTH_M,
            height: DEFAULT_BEAM_HEIGHT_M,
          });
          if (created) {
            this.selectedBeamId = created.id;
            this.selectedColumnId = null;
            this.selectedDoorId = null;
            this.selectedWindowId = null;
            this.selectedWallId = null;
          }
        }
      }
      this.beamDraft = null;
      this.render();
      this.updateCursor();
      this.updateButtonStates();
      return;
    }

    if (this.mode === MODE_SELECT && this.dragState) {
      const state = this.dragState;
      const room = this.rooms.find((r) => r.id === state.roomId);
      if (room) {
        const commitRect = room.previewRect || room.rect;
        if (commitRect && state.moved) {
          await this.controller?.updateRoom(room.id, commitRect);
        }
      }
      this.dragState = null;
      this.rooms.forEach((r) => delete r.previewRect);
      this.updateCursor();
      this.updateButtonStates();
      this.render();
      return;
    }

    if (this.mode === MODE_SELECT && this.cornerDragState) {
      const state = this.cornerDragState;
      this.cornerDragState = null;
      if (state.moved && state.previewPoint)
        await this.controller.updateCorner(state.roomId, state.id, state.previewPoint);
      this.updateButtonStates();
      this.render();
      return;
    }

    if (this.mode === MODE_SELECT && this.wallDragState) {
      const state = this.wallDragState;
      this.wallDragState = null;
      try {
        if (state.previewPoints && state.moved)
          await this.controller?.updateWall(state.wallId, state.previewPoints);
      } finally {
        for (const wall of this.walls) delete wall.previewPoints;
        this.updateCursor();
        this.updateButtonStates();
        this.render();
      }
      return;
    }

    if (this.mode === MODE_SELECT && this.openingDragState) {
      const state = this.openingDragState;
      const updates = state.moved ? this.openingDragUpdates(state) : null;
      if (updates) {
        if (state.type === 'door') await this.controller?.updateDoor?.(state.openingId, updates);
        else await this.controller?.updateWindow?.(state.openingId, updates);
      }
      this.openingDragState = null;
      this.updateCursor();
      this.updateButtonStates();
      this.render();
      return;
    }

    if (this.mode === MODE_SELECT && this.columnDragState) {
      const state = this.columnDragState;
      const column = this.columns.find((c) => c.id === state.columnId);
      if (column) {
        const preview = column.preview;
        if (preview && state.moved) {
          await this.controller?.updateColumn?.(column.id, {
            centerU: preview.centerU,
            centerV: preview.centerV,
            wallSegmentIndex: preview.wallSegmentIndex,
            wallRatio: preview.wallRatio,
          });
        }
        if (column.preview) {
          delete column.preview;
        }
      }
      this.columnDragState = null;
      this.updateCursor();
      this.updateButtonStates();
      this.render();
      return;
    }

    if (this.mode === MODE_SELECT && this.beamDragState) {
      const state = this.beamDragState;
      const beam = this.beams.find((b) => b.id === state.beamId);
      if (beam) {
        const preview = beam.preview;
        if (preview && state.moved) {
          await this.controller?.updateBeam?.(beam.id, {
            startU: preview.startU,
            startV: preview.startV,
            endU: preview.endU,
            endV: preview.endV,
            wallSegmentIndex: preview.wallSegmentIndex,
            startRatio: preview.startRatio,
            endRatio: preview.endRatio,
          });
        }
        if (beam.preview) {
          delete beam.preview;
        }
      }
      this.beamDragState = null;
      this.updateCursor();
      this.updateButtonStates();
      this.render();
      return;
    }
  }

  handleMouseLeave() {
    this.cutGesture = false;
    this.cutDraft = null;
    if (this.mode === MODE_DRAW_ROOM) {
      this.roomDraft = null;
    }
    if (this.mode === MODE_DRAW_WALL) {
      this.wallDraft = null;
    }
    if (this.mode === MODE_DRAW_BEAM) {
      this.beamDraft = null;
    }
    if (this.mode === MODE_SELECT) {
      this.rooms.forEach((r) => delete r.previewRect);
      this.dragState = null;
      if (this.wallDragState) {
        const wall = this.walls.find((w) => w.id === this.wallDragState.wallId);
        if (wall) {
          delete wall.previewPoints;
        }
        this.wallDragState = null;
      }
      if (this.columnDragState) {
        const column = this.columns.find((c) => c.id === this.columnDragState.columnId);
        if (column && column.preview) {
          delete column.preview;
        }
        this.columnDragState = null;
      }
      if (this.beamDragState) {
        const beam = this.beams.find((b) => b.id === this.beamDragState.beamId);
        if (beam && beam.preview) {
          delete beam.preview;
        }
        this.beamDragState = null;
      }
      this.openingDragState = null;
      this.setHoverState(null);
    }
    this.updateCursor();
    this.updateButtonStates();
    this.render();
  }

  /**
   * Convert screen coordinates to world (canvas) coordinates,
   * accounting for zoom and pan.
   */
  getCanvasPoint(event) {
    const rect = this.canvas.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;

    // Convert screen coordinates to world coordinates
    return {
      x: (screenX - this.panOffset.x) / this.zoomLevel,
      y: (screenY - this.panOffset.y) / this.zoomLevel,
    };
  }

  /**
   * Convert world coordinates to screen coordinates.
   */
  worldToScreen(worldPoint) {
    return {
      x: worldPoint.x * this.zoomLevel + this.panOffset.x,
      y: worldPoint.y * this.zoomLevel + this.panOffset.y,
    };
  }

  normalizeRectangle(start, end) {
    const x1 = start.x;
    const y1 = start.y;
    const x2 = end.x;
    const y2 = end.y;
    return {
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      width: Math.abs(x2 - x1),
      height: Math.abs(y2 - y1),
    };
  }

  /**
   * Get the effective snap size based on current zoom level.
   * At higher zoom levels, use finer snapping.
   * At lower zoom levels, use coarser snapping.
   *
   * Thresholds:
   * - zoom <= 0.5: snap to 5m (gridSize * 5)
   * - zoom < 1.5: snap to 1m (gridSize)
   * - zoom >= 1.5: snap to 10cm (gridSize / 10)
   */
  getEffectiveSnapSize() {
    if (this.zoomLevel <= 0.5) {
      return this.gridSize * 5; // 5m snap at very low zoom
    }
    if (this.zoomLevel >= 1.5) {
      return this.gridSize / 10; // 10cm snap at high zoom
    }
    return this.gridSize; // 1m snap at normal zoom
  }

  snapCoordinate(value) {
    if (this.controller?.interaction) return value;
    const snapSize = this.getEffectiveSnapSize();
    return Math.round(value / snapSize) * snapSize;
  }

  snapSize(value) {
    if (this.controller?.interaction) return Math.max(0.001, value);
    const snapSize = this.getEffectiveSnapSize();
    return Math.max(snapSize, Math.round(value / snapSize) * snapSize);
  }

  snapPoint(point) {
    if (this.controller?.interaction)
      return this.controller.interaction.snapPoint(point, {
        roomId: this.dragState?.roomId,
        zoom: this.zoomLevel,
        bypass: Boolean(this.lastPointerEvent?.altKey),
      });
    const snapped = {
      x: this.snapCoordinate(point.x),
      y: this.snapCoordinate(point.y),
    };

    let bestPoint = snapped;
    let bestDistance = SNAP_RADIUS + 1;

    this.rooms.forEach((room) => {
      const vertices = room.rect
        ? [
            { x: room.rect.x, y: room.rect.y },
            { x: room.rect.x + room.rect.width, y: room.rect.y },
            { x: room.rect.x, y: room.rect.y + room.rect.height },
            { x: room.rect.x + room.rect.width, y: room.rect.y + room.rect.height },
          ]
        : [];

      vertices.forEach((vertex) => {
        const dist = distance(vertex, point);
        if (dist < bestDistance) {
          bestDistance = dist;
          bestPoint = { x: vertex.x, y: vertex.y };
        }
      });
    });

    return roundPointValues(bestPoint);
  }

  /**
   * An end of a free wall being drawn or dragged, through core's free wall snapping: horizontal or
   * vertical with `from`, pulls, lining up, the 1 cm step, and never outside the room. Without it
   * (an older core), the room's edges as before.
   */
  snapFreeWallPoint(point, room, { from = null, wallId = null } = {}) {
    const interaction = this.controller?.interaction;
    if (!interaction?.snapFreeWallEnd) return this.snapToRoomEdges(point, room);
    return roundPointValues(
      interaction.snapFreeWallEnd(point, {
        roomId: room.id,
        wallId,
        from,
        zoom: this.zoomLevel,
        bypass: Boolean(this.lastPointerEvent?.altKey),
      })
    );
  }

  /**
   * "Add door", "Add window" or "Add column" (3b): adds one where the selection and the insertion
   * mark say (`add-elements.js`), then selects it. Without the selection it needs, the status line
   * says what to select; where it can't go, a refusal says so.
   * @param {'door' | 'window' | 'column'} kind
   */
  async addElement(kind) {
    const result = await addPlanElement(this, kind, {
      door: { width: DEFAULT_DOOR_WIDTH_M, height: DEFAULT_DOOR_HEIGHT_M },
      window: {
        width: DEFAULT_WINDOW_WIDTH_M,
        height: DEFAULT_WINDOW_HEIGHT_M,
        sill: DEFAULT_WINDOW_SILL_HEIGHT_M,
      },
      column: {
        width: DEFAULT_COLUMN_WIDTH_M,
        height: DEFAULT_COLUMN_HEIGHT_M,
        vertical: DEFAULT_COLUMN_VERTICAL_HEIGHT_M,
      },
    });
    if (result.status === 'needs') return this.showHint(result.hintKey);
    if (result.status === 'refused') {
      this.receiveIssues([{ code: 'no_room_to_add', message: planText(result.messageKey) }]);
      return;
    }
    if (result.status !== 'added') return;
    const field = {
      door: 'selectedDoorId',
      window: 'selectedWindowId',
      column: 'selectedColumnId',
    };
    const wallId = this.selectedWallId;
    this.selectedDoorId = this.selectedWindowId = this.selectedColumnId = null;
    this.selectedBeamId = null;
    this[field[kind]] = result.id;
    this.selectedWallId = kind === 'column' ? null : wallId;
    this.insertionMark = null;
    this.updateButtonStates();
    this.render();
  }

  /** Whether the gesture under way has moved something (a drag or a resize, not a click). */
  gestureMoved() {
    return [
      this.dragState,
      this.cornerDragState,
      this.wallDragState,
      this.columnDragState,
      this.beamDragState,
      this.openingDragState,
    ].some((state) => state?.moved);
  }

  /** Shows a hint in the status line (a command waiting for a selection) until the next press. */
  showHint(key) {
    this.hintOverride = key;
    this.updateStatusLine();
  }

  /**
   * A column's centre through core's column snapping (`column-placement.js`), with the legacy
   * wall fields; null when it fits nowhere near. Without it (an older core), inside its room's box
   * with the centre on a nearby wall line, as before.
   * @param {{ x: number, y: number }} center
   * @param {{ roomId: string, columnId?: string, width: number, height: number, from?: object }} column
   * @returns {{ point: { x: number, y: number }, wallSegmentIndex: number, wallRatio: number } | null}
   */
  snapColumnPoint(center, column) {
    let legacy = null;
    const snapped = snapColumnCentre(this, center, column, (point) => {
      const clamped = clampPointToRoom(point, this.getRoomRect(column.roomId));
      const wallSnap = this.snapPointToWall(clamped, column.roomId);
      legacy = wallSnap
        ? { wallSegmentIndex: wallSnap.segmentIndex, wallRatio: wallSnap.ratio }
        : { wallSegmentIndex: -1, wallRatio: 0 };
      return wallSnap ? wallSnap.point : clamped;
    });
    if (!snapped) return null;
    const point = { x: snapped.x, y: snapped.y };
    return { point, ...(legacy || columnWallValues(this, point, column)) };
  }

  snapToRoomEdges(point, room) {
    const rect = room.rect;
    if (!rect) return this.snapPoint(point);

    const snapped = this.snapPoint(point);
    const insideX = snapped.x >= rect.x && snapped.x <= rect.x + rect.width;
    const insideY = snapped.y >= rect.y && snapped.y <= rect.y + rect.height;

    const clamped = {
      x: clamp(snapped.x, rect.x, rect.x + rect.width),
      y: clamp(snapped.y, rect.y, rect.y + rect.height),
    };

    const vertices = [
      { x: rect.x, y: rect.y },
      { x: rect.x + rect.width, y: rect.y },
      { x: rect.x + rect.width, y: rect.y + rect.height },
      { x: rect.x, y: rect.y + rect.height },
    ];

    let bestVertex = null;
    let bestDistance = SNAP_RADIUS;

    vertices.forEach((vertex) => {
      const dist = distance(vertex, snapped);
      if (dist < bestDistance) {
        bestDistance = dist;
        bestVertex = vertex;
      }
    });

    if (bestVertex) {
      return roundPointValues(bestVertex);
    }

    const edgeOptions = [];
    if (insideY) {
      edgeOptions.push({ point: { x: rect.x, y: snapped.y }, dist: Math.abs(snapped.x - rect.x) });
      edgeOptions.push({
        point: { x: rect.x + rect.width, y: snapped.y },
        dist: Math.abs(snapped.x - (rect.x + rect.width)),
      });
    }
    if (insideX) {
      edgeOptions.push({ point: { x: snapped.x, y: rect.y }, dist: Math.abs(snapped.y - rect.y) });
      edgeOptions.push({
        point: { x: snapped.x, y: rect.y + rect.height },
        dist: Math.abs(snapped.y - (rect.y + rect.height)),
      });
    }

    const nearestEdge = edgeOptions.sort((a, b) => a.dist - b.dist)[0];
    if (nearestEdge && nearestEdge.dist < SNAP_RADIUS) {
      return roundPointValues(nearestEdge.point);
    }

    if (!insideX || !insideY) {
      return roundPointValues(clamped);
    }

    return roundPointValues(snapped);
  }

  findRoomAtPoint(point) {
    for (let i = this.rooms.length - 1; i >= 0; i -= 1) {
      const room = this.rooms[i];
      if (room && room.isDimmed) continue;
      if (room._labelRect && pointInRect(point, room._labelRect)) {
        return room;
      }
      const rect = room.previewRect || room.rect;
      if (!rect) continue;
      if (pointInRoom(point, room)) {
        return room;
      }
    }
    return null;
  }

  getRoomById(roomId) {
    return this.rooms.find((room) => room.id === roomId) || null;
  }

  getRoomRect(roomId) {
    const room = this.getRoomById(roomId);
    if (!room) return null;
    return room.previewRect || room.rect || null;
  }

  computeBeamPreview(roomId, startPoint, endPoint) {
    const roomRect = this.getRoomRect(roomId);
    if (!roomRect) return null;

    let start = clampPointToRoom(startPoint, roomRect);
    let end = clampPointToRoom(endPoint, roomRect);

    const startSnap = this.snapPointToWall(start, roomId);
    if (startSnap) {
      start = startSnap.point;
    }
    const endSnap = this.snapPointToWall(end, roomId);
    if (endSnap) {
      end = endSnap.point;
    }

    const startRatios = getRoomRatios(start, roomRect);
    const endRatios = getRoomRatios(end, roomRect);

    let wallSegmentIndex = -1;
    let startRatio = 0;
    let endRatio = 1;

    if (
      startSnap &&
      endSnap &&
      startSnap.wallId === endSnap.wallId &&
      startSnap.segmentIndex === endSnap.segmentIndex
    ) {
      wallSegmentIndex = startSnap.segmentIndex;
      startRatio = startSnap.ratio;
      endRatio = endSnap.ratio;
    }

    return {
      startU: startRatios.u,
      startV: startRatios.v,
      endU: endRatios.u,
      endV: endRatios.v,
      wallSegmentIndex,
      startRatio,
      endRatio,
      startPoint: start,
      endPoint: end,
    };
  }

  updateBeamDraft(point) {
    if (!this.beamDraft) return;
    const roomRect = this.getRoomRect(this.beamDraft.roomId);
    if (!roomRect) return;
    const current = clampPointToRoom(point, roomRect);
    const preview = this.computeBeamPreview(this.beamDraft.roomId, this.beamDraft.start, current);
    this.beamDraft.current = current;
    this.beamDraft.preview = preview;
  }

  findColumnHit(point) {
    const tolerance = this.px(OPENING_HIT_TOLERANCE);
    for (let i = this.columns.length - 1; i >= 0; i -= 1) {
      const column = this.columns[i];
      if (!column) continue;
      if (column.isDimmed) continue;
      const rect = column._renderRect ? inflateRect(column._renderRect, tolerance / 2) : null;
      const labelRect = column._labelRect;
      if (labelRect && pointInRect(point, labelRect)) {
        return { type: 'label', column };
      }
      if (rect && pointInRect(point, rect)) {
        return { type: 'body', column };
      }
    }
    return null;
  }

  findBeamHandle(point) {
    const tolerance = this.px(OPENING_HANDLE_RADIUS + 2);
    if (!Array.isArray(this.beams)) return null;
    for (let i = 0; i < this.beams.length; i += 1) {
      const beam = this.beams[i];
      if (!beam) continue;
      if (beam.isDimmed) continue;
      const start = beam._renderStart;
      const end = beam._renderEnd;
      if (start && distance(point, start) <= tolerance) {
        return { beam, handle: 'start' };
      }
      if (end && distance(point, end) <= tolerance) {
        return { beam, handle: 'end' };
      }
    }
    return null;
  }

  findBeamHit(point) {
    const tolerance = this.px(OPENING_HIT_TOLERANCE);
    if (!Array.isArray(this.beams)) return null;
    for (let i = this.beams.length - 1; i >= 0; i -= 1) {
      const beam = this.beams[i];
      if (!beam) continue;
      if (beam.isDimmed) continue;
      const start = beam._renderStart;
      const end = beam._renderEnd;
      if (start && end) {
        const dist = pointToSegmentDistance(point, start, end);
        if (dist <= tolerance) {
          return { type: 'segment', beam };
        }
      }
      const labelRect = beam._labelRect;
      if (labelRect && pointInRect(point, labelRect)) {
        return { type: 'label', beam };
      }
    }
    return null;
  }

  getRoomHandlePositions(rect) {
    if (!rect) return {};
    return {
      'top-left': { x: rect.x, y: rect.y },
      'top-right': { x: rect.x + rect.width, y: rect.y },
      'bottom-right': { x: rect.x + rect.width, y: rect.y + rect.height },
      'bottom-left': { x: rect.x, y: rect.y + rect.height },
    };
  }

  findRoomHandle(point) {
    if (this.controller?.getCornerPlacement) return null;
    if (!point) return null;
    const hitOffset = this.px(ROOM_HANDLE_HIT_SIZE) / 2;
    for (let i = this.rooms.length - 1; i >= 0; i -= 1) {
      const room = this.rooms[i];
      if (room && room.isDimmed) continue;
      const rect = room.previewRect || room.rect;
      if (!rect) continue;
      const handles = this.getRoomHandlePositions(rect);
      const entries = Object.entries(handles);
      for (let j = 0; j < entries.length; j += 1) {
        const [key, handlePoint] = entries[j];
        if (
          Math.abs(point.x - handlePoint.x) <= hitOffset &&
          Math.abs(point.y - handlePoint.y) <= hitOffset
        ) {
          return { room, handle: key, handlePoint };
        }
      }
    }
    return null;
  }

  findWallNearPoint(point, roomId = null) {
    let bestMatch = null;
    let bestDistance = this.px(WALL_HIT_TOLERANCE);

    this.walls.forEach((wall) => {
      if (wall && wall.isDimmed) return;
      if (roomId && wall.roomId !== roomId) {
        return;
      }
      const renderedPoints = this.getRenderedWallPoints(wall);
      if (!Array.isArray(renderedPoints) || renderedPoints.length < 2) {
        return;
      }

      if (wall._labelRect && pointInRect(point, wall._labelRect)) {
        const start = renderedPoints[0];
        const end = renderedPoints[renderedPoints.length - 1] || start;
        bestDistance = 0;
        bestMatch = {
          wall,
          segmentIndex: 0,
          distance: 0,
          ratio: 0.5,
          closestPoint:
            start && end
              ? {
                  x: (start.x + end.x) / 2,
                  y: (start.y + end.y) / 2,
                }
              : { x: point.x, y: point.y },
        };
        return;
      }

      const inMaterial = this.wallFootprints
        ?.find((entry) => entry.id === wall.physicalWallId)
        ?.polygons.some((vertices) => pointInRoom(point, { vertices }));
      for (let index = 0; index < renderedPoints.length - 1; index += 1) {
        const start = renderedPoints[index];
        const end = renderedPoints[index + 1];
        const distanceToSegment = pointToSegmentDistance(point, start, end);
        const along = projectScalarToSegment(point, start, end);
        if (
          distanceToSegment < bestDistance ||
          (inMaterial && !bestMatch && along >= 0 && along <= 1)
        ) {
          const ratio = clamp(projectScalarToSegment(point, start, end), 0, 1);
          bestDistance = distanceToSegment;
          bestMatch = {
            wall,
            segmentIndex: index,
            distance: distanceToSegment,
            ratio,
            closestPoint: {
              x: start.x + (end.x - start.x) * ratio,
              y: start.y + (end.y - start.y) * ratio,
            },
          };
        }
      }
    });

    return bestMatch;
  }

  startWallMove(wall, point) {
    const basePoints =
      wall.previewPoints && wall.previewPoints.length > 0
        ? clonePoints(wall.previewPoints)
        : clonePoints(wall.points);
    this.selectedRoomId = wall.roomId;
    this.selectedWallId = wall.id;
    // The wall becomes the selection (an opening, column or beam selected before is not).
    this.selectedDoorId = null;
    this.selectedWindowId = null;
    this.selectedColumnId = null;
    this.selectedBeamId = null;
    this.wallDragState = {
      type: 'move',
      wallId: wall.id,
      physicalWallId: wall.physicalWallId,
      pointerStart: point,
      originalPoints: basePoints,
      moved: false,
    };
    this.setHoverState(null);
    this.pendingFocus = () => this.controller?.focusWall(wall.id);
    this.updateButtonStates();
    this.updateCursor();
    this.render();
  }

  /**
   * The grip on the selected wall's middle, where the wall can move: core moves a room wall at
   * right angles to its first segment (the grip's arrows), a partition drawn with the wall tool
   * any way (four arrows).
   */
  wallGrip() {
    if (this.mode !== MODE_SELECT || this.readOnly || !this.selectedWallId) return null;
    // Only for the wall itself: an opening, column or beam selected on it keeps its own handles.
    if (
      this.selectedDoorId ||
      this.selectedWindowId ||
      this.selectedColumnId ||
      this.selectedBeamId
    )
      return null;
    if (!getCapabilities(this.controller).canMoveStructural) return null;
    const wall = this.walls.find((entry) => entry.id === this.selectedWallId);
    if (!wall || wall.isDimmed) return null;
    const points =
      wall.axisPoints?.length >= 2 ? wall.axisPoints : this.getRenderedWallPoints(wall);
    if (!Array.isArray(points) || points.length < 2) return null;
    const lengths = points.slice(1).map((point, index) => distance(points[index], point));
    let rest = lengths.reduce((sum, length) => sum + length, 0) / 2;
    let index = 0;
    while (index < lengths.length - 1 && rest > lengths[index]) {
      rest -= lengths[index];
      index += 1;
    }
    const t = lengths[index] ? rest / lengths[index] : 0.5;
    const from = points[index];
    const to = points[index + 1];
    const [a, b] = points;
    const length = distance(a, b) || 1;
    return {
      wall,
      center: { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t },
      normal: { x: -(b.y - a.y) / length, y: (b.x - a.x) / length },
      free: !wall.isBoundary,
    };
  }

  findWallGrip(point) {
    const grip = point && this.wallGrip();
    return grip && distance(point, grip.center) <= this.px(WALL_GRIP_RADIUS + 2) ? grip.wall : null;
  }

  /** The cursor over the grip: the arrows' direction, or "move" for a free partition. */
  gripCursor(grip) {
    if (grip.free) return 'move';
    const angle = ((Math.atan2(grip.normal.y, grip.normal.x) * 180) / Math.PI + 180) % 180;
    if (angle < 22.5 || angle >= 157.5) return 'ew-resize';
    if (angle < 67.5) return 'nwse-resize';
    if (angle < 112.5) return 'ns-resize';
    return 'nesw-resize';
  }

  drawWallGrip() {
    const grip = this.wallGrip();
    if (!grip) return;
    const ctx = this.ctx;
    const { center: c, normal: n } = grip;
    const radius = this.px(WALL_GRIP_RADIUS);
    ctx.save();
    ctx.fillStyle = this.planTheme.handle;
    ctx.strokeStyle = this.planTheme.accent;
    ctx.lineWidth = this.px(2);
    ctx.beginPath();
    ctx.arc(c.x, c.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Double arrows: along the wall's normal; a free partition also along the wall.
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const reach = radius * 0.6;
    const head = radius * 0.3;
    for (const axis of grip.free ? [n, { x: -n.y, y: n.x }] : [n]) {
      const side = { x: -axis.y, y: axis.x };
      ctx.beginPath();
      ctx.moveTo(c.x - axis.x * reach, c.y - axis.y * reach);
      ctx.lineTo(c.x + axis.x * reach, c.y + axis.y * reach);
      for (const sign of [-1, 1]) {
        const tip = { x: c.x + axis.x * reach * sign, y: c.y + axis.y * reach * sign };
        const back = { x: tip.x - axis.x * head * sign, y: tip.y - axis.y * head * sign };
        ctx.moveTo(back.x + side.x * head, back.y + side.y * head);
        ctx.lineTo(tip.x, tip.y);
        ctx.lineTo(back.x - side.x * head, back.y - side.y * head);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  findWallHandle(point) {
    if (!point) return null;
    const testWalls = [];
    if (this.selectedWallId) {
      const selected = this.walls.find((wall) => wall.id === this.selectedWallId);
      if (selected) {
        testWalls.push(selected);
      }
    }
    this.walls.forEach((wall) => {
      if (!this.selectedWallId || wall.id !== this.selectedWallId) {
        testWalls.push(wall);
      }
    });

    for (let i = 0; i < testWalls.length; i += 1) {
      const wall = testWalls[i];
      if (wall && wall.isDimmed) continue;
      const points = this.getRenderedWallPoints(wall);
      if (!Array.isArray(points) || points.length < 2) continue;
      for (let index = 0; index < 2; index += 1) {
        const handlePoint = points[index];
        const dist = distance(point, handlePoint);
        if (dist <= this.px(WALL_HANDLE_HIT_RADIUS)) {
          return { wall, index, handlePoint };
        }
      }
    }
    return null;
  }

  setHoverState(nextState) {
    const prev = this.hoverState;
    const same =
      prev &&
      nextState &&
      prev.type === nextState.type &&
      prev.handle === nextState.handle &&
      prev.wallId === nextState.wallId &&
      prev.roomId === nextState.roomId &&
      prev.openingId === nextState.openingId &&
      prev.openingType === nextState.openingType &&
      prev.columnId === nextState.columnId &&
      prev.beamId === nextState.beamId;
    if (same) return;
    if (!prev && !nextState) return;
    this.hoverState = nextState || null;
    this.updateCursor();
  }

  computeResizedRect(baseRect, handle, pointer) {
    if (!baseRect || !handle || !pointer) return null;
    const minSize = this.gridSize;

    let left = baseRect.x;
    let right = baseRect.x + baseRect.width;
    let top = baseRect.y;
    let bottom = baseRect.y + baseRect.height;

    switch (handle) {
      case 'top-left':
        left = Math.min(pointer.x, right - minSize);
        top = Math.min(pointer.y, bottom - minSize);
        break;
      case 'top-right':
        right = Math.max(pointer.x, left + minSize);
        top = Math.min(pointer.y, bottom - minSize);
        break;
      case 'bottom-right':
        right = Math.max(pointer.x, left + minSize);
        bottom = Math.max(pointer.y, top + minSize);
        break;
      case 'bottom-left':
        left = Math.min(pointer.x, right - minSize);
        bottom = Math.max(pointer.y, top + minSize);
        break;
      default:
        return null;
    }

    const rect = {
      x: left,
      y: top,
      width: Math.max(minSize, right - left),
      height: Math.max(minSize, bottom - top),
    };
    return roundRectValues(rect);
  }

  getCursorForHandle(handle) {
    switch (handle) {
      case 'top-left':
      case 'bottom-right':
        return 'nwse-resize';
      case 'top-right':
      case 'bottom-left':
        return 'nesw-resize';
      default:
        return 'default';
    }
  }

  previewRoomMovement(roomId, newRect) {
    const roundedRect = newRect ? roundRectValues(newRect) : null;
    let targetRoom = null;
    this.rooms.forEach((room) => {
      if (room.id === roomId && roundedRect) {
        room.previewRect = roundedRect;
        targetRoom = room;
      } else {
        delete room.previewRect;
      }
    });

    const targetRect = roundedRect || newRect;

    this.walls.forEach((wall) => {
      if (!targetRoom || !targetRect || wall.roomId !== roomId) {
        delete wall.previewPoints;
        return;
      }

      const fromRect = targetRoom.rect;
      const toRect = targetRect;
      const fromWidth = fromRect.width || 1;
      const fromHeight = fromRect.height || 1;

      const previewPoints = (wall.points || []).map((point) => {
        const relativeX = fromWidth === 0 ? 0 : (point.x - fromRect.x) / fromWidth;
        const relativeY = fromHeight === 0 ? 0 : (point.y - fromRect.y) / fromHeight;
        return {
          x: toRect.x + relativeX * toRect.width,
          y: toRect.y + relativeY * toRect.height,
        };
      });
      wall.previewPoints = roundPoints(previewPoints);
    });
  }

  render() {
    if (!this.ctx) return;
    this.updateCutControls();
    this.reportSelection();

    const ctx = this.ctx;
    const { width, height } = this.canvas;

    // Clear the whole bitmap (no transform)
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // Zoom and pan are in CSS pixels; the pixel ratio maps them onto the bitmap.
    const ratio = this.pixelRatio || 1;
    const scale = this.zoomLevel * ratio;
    ctx.setTransform(scale, 0, 0, scale, this.panOffset.x * ratio, this.panOffset.y * ratio);

    this.drawGrid();

    if (!this.hasFloors) {
      // The overlay covers the canvas in CSS pixels
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      this.drawNoFloorOverlay();
      return;
    }

    this.levels = scopeLevels({
      roomId: this.controller?.scope?.roomId || null,
      focus: this.focus,
      plan: this,
    });
    this.rooms.forEach((room) => this.drawRoom(room));

    this.drawPhysicalWalls();
    this.walls.forEach((wall) => this.drawWall(wall));
    this.drawAlignmentGuides();

    this.beams.forEach((beam) => this.drawBeam(beam));
    this.columns.forEach((column) => this.drawColumn(column));

    this.drawOpenings();
    drawInsertionMark(this.ctx, this);
    this.drawEditingCuts();
    this.drawCornerControls();
    this.drawWallGrip();

    if (this.wallDraft && this.wallDraft.start && this.wallDraft.end) {
      this.drawDraftWall(this.wallDraft.start, this.wallDraft.end);
    }

    if (this.beamDraft && this.beamDraft.preview) {
      this.drawDraftBeam(this.beamDraft);
    }

    if (this.roomDraft) {
      const rect = this.normalizeRectangle(this.roomDraft.start, this.roomDraft.current);
      const snapped = {
        x: this.snapCoordinate(rect.x),
        y: this.snapCoordinate(rect.y),
        width: this.snapSize(rect.width),
        height: this.snapSize(rect.height),
      };
      this.drawDraftRoom(snapped);
    }

    this.drawFindings();
    this.drawRefusal();

    // Reset transform for any subsequent operations
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  computeLabelRect(
    text,
    anchor,
    {
      position = 'top',
      paddingX = LABEL_PADDING_X,
      paddingY = LABEL_PADDING_Y,
      scale = 1,
      strong = false,
    } = {}
  ) {
    if (!this.ctx || !text) return null;
    const ctx = this.ctx;
    // Names keep their size on screen at any zoom (canvas units shrink as the view zooms in).
    scale /= this.zoomLevel || 1;
    ctx.save();
    ctx.font = labelFont(scale, strong ? ROOM_LABEL_FONT_SIZE : LABEL_FONT_SIZE);
    const metrics = ctx.measureText(text);
    const textHeight =
      (metrics.actualBoundingBoxAscent || 8 * scale) +
      (metrics.actualBoundingBoxDescent || 4 * scale);
    const width = metrics.width + paddingX * scale * 2;
    const height = textHeight + paddingY * scale * 2;
    let x = anchor.x - width / 2;
    let y = anchor.y - height;
    if (position === 'bottom') {
      y = anchor.y;
    } else if (position === 'center') {
      y = anchor.y - height / 2;
    }
    ctx.restore();
    return { x, y, width, height };
  }

  /**
   * A name on the plan as plain text with a halo; its rectangle is returned for hit testing.
   * Room names (`strong`) use the label colour, the others the muted one.
   */
  /**
   * The name of a selected wall or opening, beside its line on the room's side, in the selection
   * colour (`draw/selection-name.js`). `clearance`: from the line to the room (half a wall's
   * thickness for an opening drawn on the wall's axis). Returns its rectangle, for hit testing.
   */
  drawSelectedName(text, start, end, roomId, clearance = 0, away = null) {
    const room = (this.rooms || []).find((entry) => entry.id === roomId);
    const size = this.computeLabelRect(text, { x: 0, y: 0 }, { position: 'center' });
    if (!size) return null;
    // Which side of the line a point is on; `away` (a free wall's body) keeps the name off it.
    const side = (point) =>
      Math.sign((end.x - start.x) * (point.y - start.y) - (end.y - start.y) * (point.x - start.x));
    const centre = nameBeside(start, end, {
      size,
      clearance: clearance + this.px(6),
      isInside: (point) =>
        Boolean(room && pointInRoom(point, room)) && (!away || side(point) !== side(away)),
    });
    return this.drawLabelBadge(text, centre, { position: 'center', color: this.planTheme.accent });
  }

  /**
   * A selected free wall shows as a whole (after the V1 hand test): its body outlined, its own
   * side (the row's, where the line was drawn) as a thinner line. Returns the body's centre.
   */
  drawFreeWallOutline(wall) {
    const footprint = (this.wallFootprints || []).find((entry) => entry.id === wall.physicalWallId);
    const corners = (footprint?.polygons || []).flat();
    if (!corners.length) return null;
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = this.planTheme.accent;
    ctx.lineWidth = this.px(1.5);
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (const polygon of footprint.polygons) {
      if (!polygon.length) continue;
      ctx.moveTo(polygon[0].x, polygon[0].y);
      for (const point of polygon.slice(1)) ctx.lineTo(point.x, point.y);
      ctx.closePath();
    }
    ctx.stroke();
    ctx.restore();
    return {
      x: corners.reduce((sum, point) => sum + point.x, 0) / corners.length,
      y: corners.reduce((sum, point) => sum + point.y, 0) / corners.length,
    };
  }

  drawLabelBadge(text, anchor, options = {}) {
    if (!this.ctx || !text) return null;
    const rect = this.computeLabelRect(text, anchor, options);
    if (!rect) return null;
    // A faded element's name is grey on the ground (`options.theme`, 1e V1).
    const theme = options.theme || this.planTheme;
    const scale = (options.scale || 1) / (this.zoomLevel || 1);
    drawPlanLabel(
      this.ctx,
      text,
      { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 },
      {
        font: labelFont(scale, options.strong ? ROOM_LABEL_FONT_SIZE : LABEL_FONT_SIZE),
        color: options.color || (options.strong ? theme.label : theme.labelMuted),
        halo: theme.room,
        haloWidth: 3 * scale,
      }
    );
    return rect;
  }

  getColumnRenderInfo(column) {
    const roomRect = this.getRoomRect(column.roomId);
    if (!roomRect || roomRect.width === 0 || roomRect.height === 0) {
      return null;
    }
    const preview = column.preview || null;
    const centerU = preview ? preview.centerU : column.centerU;
    const centerV = preview ? preview.centerV : column.centerV;
    const widthMeters = preview && preview.width != null ? preview.width : column.width;
    const heightMeters = preview && preview.height != null ? preview.height : column.height;
    const wallSegmentIndex =
      preview && preview.wallSegmentIndex != null
        ? preview.wallSegmentIndex
        : column.wallSegmentIndex;
    const wallRatio = preview && preview.wallRatio != null ? preview.wallRatio : column.wallRatio;

    const center = {
      x: roomRect.x + centerU * roomRect.width,
      y: roomRect.y + centerV * roomRect.height,
    };
    const widthPx = Math.max(
      10,
      metersToLength(widthMeters || DEFAULT_COLUMN_WIDTH_M, this.gridSize)
    );
    const heightPx = Math.max(
      10,
      metersToLength(heightMeters || DEFAULT_COLUMN_HEIGHT_M, this.gridSize)
    );
    const rect = {
      x: center.x - widthPx / 2,
      y: center.y - heightPx / 2,
      width: widthPx,
      height: heightPx,
    };
    const baseLabel = column.displayLabel || column.label;
    const label = formatShortLabel(
      baseLabel,
      'C',
      typeof column.index === 'number' ? column.index + 1 : null,
      'column'
    );
    const labelAnchor = { x: center.x, y: rect.y - 6 };

    column._renderRect = rect;
    column._renderCenter = center;
    column._wallAttachment = { segmentIndex: wallSegmentIndex, ratio: wallRatio };

    return { center, rect, label, labelAnchor, widthPx, heightPx };
  }

  drawColumn(column) {
    column._renderRect = null;
    column._labelRect = null;
    const info = this.getColumnRenderInfo(column);
    if (!info) return;
    const ctx = this.ctx;
    const isSelected = this.selectedColumnId === column.id;
    const tones = levelTheme(this.planTheme, this.levelOf('columns', column));
    ctx.save();
    drawColumnSymbol(ctx, info.rect, {
      theme: tones,
      selected: isSelected,
      pixel: 1 / this.zoomLevel,
    });
    ctx.restore();

    if ((this.shouldShowLabel('columns') || isSelected) && info.label) {
      const labelRect = this.drawLabelBadge(info.label, info.labelAnchor, {
        position: 'top',
        theme: tones,
        color: isSelected ? this.planTheme.accent : null,
      });
      if (labelRect) {
        column._labelRect = labelRect;
      }
    } else {
      column._labelRect = null;
    }
  }

  getBeamRenderInfo(beam) {
    const roomRect = this.getRoomRect(beam.roomId);
    if (!roomRect || roomRect.width === 0 || roomRect.height === 0) {
      return null;
    }
    const preview = beam.preview || null;
    const startU = preview ? preview.startU : beam.startU;
    const startV = preview ? preview.startV : beam.startV;
    const endU = preview ? preview.endU : beam.endU;
    const endV = preview ? preview.endV : beam.endV;
    const widthMeters = preview && preview.width != null ? preview.width : beam.width;
    const heightMeters = preview && preview.height != null ? preview.height : beam.height;

    const startPoint = {
      x: roomRect.x + startU * roomRect.width,
      y: roomRect.y + startV * roomRect.height,
    };
    const endPoint = {
      x: roomRect.x + endU * roomRect.width,
      y: roomRect.y + endV * roomRect.height,
    };
    const centerPoint = {
      x: (startPoint.x + endPoint.x) / 2,
      y: (startPoint.y + endPoint.y) / 2,
    };
    const lineWidth = Math.max(
      4,
      metersToLength(heightMeters || DEFAULT_BEAM_HEIGHT_M, this.gridSize)
    );
    const baseLabel = beam.displayLabel || beam.label;
    const label = formatShortLabel(
      baseLabel,
      'B',
      typeof beam.index === 'number' ? beam.index + 1 : null,
      'beam'
    );
    const labelAnchor = { x: centerPoint.x, y: centerPoint.y - lineWidth - 6 };
    beam._renderStart = startPoint;
    beam._renderEnd = endPoint;
    const widthPx = Math.max(4, metersToLength(widthMeters || DEFAULT_BEAM_WIDTH_M, this.gridSize));

    return { startPoint, endPoint, centerPoint, lineWidth, widthPx, label, labelAnchor };
  }

  drawBeam(beam) {
    beam._labelRect = null;
    const info = this.getBeamRenderInfo(beam);
    if (!info) return;
    const ctx = this.ctx;
    const isSelected = this.selectedBeamId === beam.id;
    const tones = levelTheme(this.planTheme, this.levelOf('beams', beam));
    ctx.save();
    drawBeamSymbol(ctx, info.startPoint, info.endPoint, info.widthPx, {
      theme: tones,
      selected: isSelected,
      pixel: 1 / this.zoomLevel,
    });

    if (isSelected) {
      ctx.fillStyle = this.planTheme.accent;
      ctx.beginPath();
      ctx.arc(info.startPoint.x, info.startPoint.y, this.px(OPENING_HANDLE_RADIUS), 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(info.endPoint.x, info.endPoint.y, this.px(OPENING_HANDLE_RADIUS), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    if ((this.shouldShowLabel('beams') || isSelected) && info.label) {
      const labelRect = this.drawLabelBadge(info.label, info.labelAnchor, {
        position: 'top',
        theme: tones,
        color: isSelected ? this.planTheme.accent : null,
      });
      if (labelRect) {
        beam._labelRect = labelRect;
      }
    } else {
      beam._labelRect = null;
    }
  }

  drawDraftBeam(draft) {
    if (!draft || !draft.preview) return;
    const preview = draft.preview;
    const ctx = this.ctx;
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = this.planTheme.symbol;
    ctx.lineWidth = Math.max(4, metersToLength(DEFAULT_BEAM_HEIGHT_M, this.gridSize));
    ctx.beginPath();
    ctx.moveTo(preview.startPoint.x, preview.startPoint.y);
    ctx.lineTo(preview.endPoint.x, preview.endPoint.y);
    ctx.stroke();
    ctx.restore();
  }
  renderFloorTabs() {
    if (this.onFloorTabs) {
      this.onFloorTabs({
        tabs: (this.floors || []).map((floor) => ({
          index: floor.index,
          label:
            floor.label ||
            'Floor #' +
              ((typeof floor.displayIndex === 'number' ? floor.displayIndex : floor.index) + 1),
          active: floor.index === this.activeFloorIndex,
          // The floor's row, for the findings the plan page lists (1e, M2).
          rowId: floor.rowId ?? null,
        })),
      });
      return;
    }
    if (!this.floorTabsContainer) return;
    this.floorTabsContainer.innerHTML = '';

    // Show ghost placeholder when no floors exist
    if (!this.floors || this.floors.length === 0) {
      const placeholder = document.createElement('div');
      placeholder.className = 'building-plan-floor-placeholder';
      placeholder.textContent = 'No floors';
      placeholder.setAttribute('data-tooltip', 'Add a floor to begin drawing');
      this.floorTabsContainer.appendChild(placeholder);
      return;
    }

    this.floors.forEach((floor) => {
      const button = document.createElement('button');
      button.type = 'button';
      const displayNumber =
        typeof floor.displayIndex === 'number' ? floor.displayIndex + 1 : floor.index + 1;
      const buttonLabel = floor.label || 'Floor #' + displayNumber;
      button.textContent = buttonLabel;
      button.className = 'building-plan-floor-tab';
      if (floor.index === this.activeFloorIndex) {
        button.classList.add('active');
      }
      button.addEventListener('click', () => this.handleFloorTabClick(floor.index));
      this.floorTabsContainer.appendChild(button);
    });
  }

  handleFloorTabClick(index) {
    if (index === this.activeFloorIndex) {
      return;
    }
    this.selectedRoomId = null;
    this.selectedWallId = null;
    this.wallDragState = null;
    this.dismissMessages();
    this.activeFloorIndex = index;
    this.renderFloorTabs();
    if (this.controller && typeof this.controller.setActiveFloor === 'function') {
      this.controller.setActiveFloor(index);
    }
    this.updateButtonStates();
    this.updateCursor();
    this.render();
  }

  updateButtonStates() {
    const hasFloors = this.hasFloors;
    const hasSelectedRoom = Boolean(this.selectedRoomId);
    const hasWalls = Array.isArray(this.walls) && this.walls.length > 0;

    if (this.floorButton) {
      const canCreateFloor = Boolean(
        this.controller && typeof this.controller.createFloor === 'function'
      );
      this.floorButton.disabled = !canCreateFloor;
      this.floorButton.title = canCreateFloor ? 'Add a new floor' : 'Floor creation unavailable';
    }

    if (this.roomButton) {
      this.roomButton.disabled = !hasFloors;
      this.roomButton.title = hasFloors ? 'Draw a new room' : 'Add a floor to enable room drawing';
    }

    if (this.wallButton) {
      this.wallButton.disabled = !hasFloors || !hasSelectedRoom;
      if (!hasFloors) {
        this.wallButton.title = 'Add a floor to enable wall drawing';
      } else if (!hasSelectedRoom) {
        this.wallButton.title = 'Select a room to draw walls';
      } else {
        this.wallButton.title = 'Draw a wall for the selected room';
      }
    }

    if (this.columnButton) {
      this.columnButton.disabled = !hasFloors || !hasSelectedRoom;
      if (!hasFloors) {
        this.columnButton.title = 'Add a floor to enable column placement';
      } else if (!hasSelectedRoom) {
        this.columnButton.title = 'Select a room to place columns';
      } else {
        this.columnButton.title = 'Click inside a room to place a column';
      }
    }

    if (this.beamButton) {
      this.beamButton.disabled = !hasFloors || !hasSelectedRoom;
      if (!hasFloors) {
        this.beamButton.title = 'Add a floor to enable beam drawing';
      } else if (!hasSelectedRoom) {
        this.beamButton.title = 'Select a room to draw beams';
      } else {
        this.beamButton.title = 'Click and drag inside a room to draw a beam';
      }
    }

    if (this.doorButton) {
      this.doorButton.disabled = !hasFloors || !hasWalls;
      if (!hasFloors) {
        this.doorButton.title = 'Add a floor to enable door placement';
      } else if (!hasWalls) {
        this.doorButton.title = 'Draw or select a wall to place doors';
      } else {
        this.doorButton.title = 'Click a wall to place a door';
      }
    }

    if (this.windowButton) {
      this.windowButton.disabled = !hasFloors || !hasWalls;
      if (!hasFloors) {
        this.windowButton.title = 'Add a floor to enable window placement';
      } else if (!hasWalls) {
        this.windowButton.title = 'Draw or select a wall to place windows';
      } else {
        this.windowButton.title = 'Click a wall to place a window';
      }
    }
  }

  drawNoFloorOverlay() {
    const ctx = this.ctx;
    ctx.save();
    const view = this.getViewSize();
    ctx.fillStyle = this.planTheme.overlay;
    ctx.fillRect(0, 0, view.width, view.height);

    ctx.fillStyle = this.planTheme.labelMuted;
    ctx.font = '600 15px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Add a floor to enable the canvas tools', view.width / 2, view.height / 2);
    ctx.restore();
  }

  /**
   * Calculate the visible world bounds based on canvas size, zoom, and pan.
   */
  getVisibleWorldBounds() {
    const { width, height } = this.getViewSize();
    return {
      minX: -this.panOffset.x / this.zoomLevel,
      minY: -this.panOffset.y / this.zoomLevel,
      maxX: (width - this.panOffset.x) / this.zoomLevel,
      maxY: (height - this.panOffset.y) / this.zoomLevel,
    };
  }

  drawGrid() {
    drawPlanGrid(this.ctx, {
      bounds: this.getVisibleWorldBounds(),
      metre: this.gridSize,
      zoom: this.zoomLevel,
      pixelRatio: this.pixelRatio || 1,
      theme: this.planTheme,
    });
  }

  drawRoom(room) {
    const ctx = this.ctx;
    const rect = room.previewRect || room.rect;
    if (!rect) return;

    room._labelRect = null;

    // While another element is marked (a wall, a door…), its room doesn't draw as selected, so
    // the mark stands out.
    const marksElement = Boolean(this.highlight && this.highlight.collection !== 'rooms');
    const isSelected = this.selectedRoomId === room.id && !marksElement;
    const level = this.levelOf('rooms', room);
    const faded = level === OUT;

    const theme = this.planTheme;
    ctx.save();
    const vertices = room.previewRect ? null : room.vertices;
    ctx.beginPath();
    if (vertices?.length) {
      ctx.moveTo(vertices[0].x, vertices[0].y);
      for (const vertex of vertices.slice(1)) ctx.lineTo(vertex.x, vertex.y);
      ctx.closePath();
    } else ctx.rect(rect.x, rect.y, rect.width, rect.height);
    // A room outside the scope has no surface: the ground shows through (1e, V1).
    if (!faded) {
      ctx.fillStyle = theme.room;
      ctx.fill();
    }
    if (isSelected) {
      ctx.fillStyle = theme.accent;
      ctx.globalAlpha = 0.1;
      ctx.fill();
    } else if (room.color && !faded) {
      ctx.fillStyle = room.color;
      ctx.globalAlpha = 0.06;
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.lineWidth = isSelected ? 3 : 1.5;
    ctx.strokeStyle = isSelected ? theme.accent : levelTheme(theme, level).wall;
    ctx.stroke();

    if (isSelected && !this.controller?.getCornerPlacement) {
      const handleSize = this.px(ROOM_HANDLE_SIZE);
      const half = handleSize / 2;
      const corners = [
        { x: rect.x, y: rect.y },
        { x: rect.x + rect.width, y: rect.y },
        { x: rect.x + rect.width, y: rect.y + rect.height },
        { x: rect.x, y: rect.y + rect.height },
      ];

      ctx.fillStyle = theme.handle;
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 1;
      corners.forEach((corner) => {
        ctx.beginPath();
        ctx.rect(corner.x - half, corner.y - half, handleSize, handleSize);
        ctx.fill();
        ctx.stroke();
      });
    }

    ctx.restore();

    if (this.shouldShowLabel('rooms')) {
      const rawLabel =
        room.displayLabel || (typeof room.index === 'number' ? `R#${room.index + 1}` : null);
      const labelText = formatShortLabel(
        rawLabel,
        'R',
        typeof room.index === 'number' ? room.index + 1 : null,
        'room'
      );
      if (labelText) {
        // Inside the room, clear of its walls, shrunk when the room is small (form0-core).
        const outline = vertices?.length
          ? vertices
          : [
              { x: rect.x, y: rect.y },
              { x: rect.x + rect.width, y: rect.y },
              { x: rect.x + rect.width, y: rect.y + rect.height },
              { x: rect.x, y: rect.y + rect.height },
            ];
        const badge = this.computeLabelRect(
          labelText,
          { x: 0, y: 0 },
          { position: 'center', strong: true }
        );
        const placement = buildingPlanLabelPlacement(outline, badge) || {
          x: rect.x + rect.width / 2,
          y: rect.y + rect.height / 2,
          scale: 1,
        };
        const labelRect = this.drawLabelBadge(labelText, placement, {
          position: 'center',
          scale: placement.scale,
          strong: true,
          theme: levelTheme(theme, level),
        });
        if (labelRect) {
          room._labelRect = labelRect;
        }
      }
    } else {
      room._labelRect = null;
    }
  }

  drawDraftRoom(rect) {
    const ctx = this.ctx;
    ctx.save();
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = this.planTheme.symbol;
    ctx.lineWidth = 1;
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    ctx.restore();
  }

  drawPhysicalWalls() {
    drawWallFootprints(this.ctx, this.wallFootprints, {
      theme: this.planTheme,
      levelOf: (wall) => this.levelOf('footprints', wall),
      zoom: this.zoomLevel,
    });
  }

  drawOpenings() {
    for (const [type, collection] of [
      ['door', this.doors],
      ['window', this.windows],
    ]) {
      for (const opening of collection) opening._labelRect = null;
      const chosen = new Map();
      for (const opening of collection) {
        const key = opening.subjectId || opening.id;
        const previous = chosen.get(key);
        const selected = type === 'door' ? this.selectedDoorId : this.selectedWindowId;
        if (
          !previous ||
          opening.id === selected ||
          (previous.id !== selected &&
            (previous.isDimmed ||
              opening.roomId === (this.controller?.getActiveRoomId?.() || this.selectedRoomId)))
        )
          chosen.set(key, opening);
      }
      for (const opening of chosen.values()) this.drawOpening(opening, type);
    }
  }

  drawWall(wall) {
    const ctx = this.ctx;
    const points = this.getRenderedWallPoints(wall);
    if (!Array.isArray(points) || points.length < 2) return;
    const tones = levelTheme(this.planTheme, this.levelOf('walls', wall));
    const start = points[0];
    const end = points[points.length - 1] || points[0];

    wall._renderStart = start ? { ...start } : null;
    wall._renderEnd = end ? { ...end } : null;
    wall._labelRect = null;

    ctx.save();
    // A free wall stands in its room (not a room's side, nor a Split portion of one).
    const freeWall = !wall.isBoundary && !wall.isCutPortion;
    const selected = this.selectedWallId === wall.id;
    ctx.strokeStyle = selected ? this.planTheme.accent : tones.wall;
    ctx.lineWidth = selected ? (freeWall ? this.px(4) : 6) : 3;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    for (let i = 1; i < points.length; i += 1) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    if (!this.wallFootprints || selected) ctx.stroke();
    ctx.restore();
    const body = selected && freeWall ? this.drawFreeWallOutline(wall) : null;

    if (this.selectedWallId === wall.id) {
      const handleSize = this.px(ROOM_HANDLE_SIZE);
      const half = handleSize / 2;
      ctx.save();
      ctx.fillStyle = this.planTheme.handle;
      ctx.strokeStyle = this.planTheme.accent;
      ctx.lineWidth = this.px(1);
      [start, end].forEach((point) => {
        ctx.beginPath();
        ctx.rect(point.x - half, point.y - half, handleSize, handleSize);
        ctx.fill();
        ctx.stroke();
      });
      ctx.restore();
    }

    // A selected wall is named, unless one of its openings is the selection.
    const named = this.selectedWallId === wall.id && !this.selectedDoorId && !this.selectedWindowId;
    if (this.shouldShowLabel('walls') || named) {
      const rawLabel =
        wall.displayLabel ||
        wall.label ||
        (typeof wall.index === 'number' ? `W#${wall.index + 1}` : null);
      const labelText = formatShortLabel(
        rawLabel,
        'W',
        typeof wall.index === 'number' ? wall.index + 1 : null,
        'wall'
      );
      if (labelText && start && end && named) {
        wall._labelRect = this.drawSelectedName(labelText, start, end, wall.roomId, 0, body);
      } else if (labelText && start && end) {
        const anchor = {
          x: (start.x + end.x) / 2,
          y: (start.y + end.y) / 2,
        };
        const offset = ctx.lineWidth / 2 + 6;
        const labelRect = this.drawLabelBadge(
          labelText,
          { x: anchor.x, y: anchor.y - offset },
          { position: 'top', theme: tones }
        );
        if (labelRect) {
          wall._labelRect = labelRect;
        }
      }
    } else {
      wall._labelRect = null;
    }
  }

  getOpeningCollection(type) {
    if (type === 'door') return Array.isArray(this.doors) ? this.doors : [];
    if (type === 'window') return Array.isArray(this.windows) ? this.windows : [];
    return [];
  }

  getOpeningById(type, id) {
    if (!id) return null;
    const collection = this.getOpeningCollection(type);
    return collection.find((entry) => entry && entry.id === id) || null;
  }

  getOpeningGeometry(opening, overrides = {}) {
    if (!opening) return null;
    const wall = this.walls.find((entry) => entry.id === opening.wallId);
    if (!wall) return null;

    const wallPoints =
      opening.physical && wall.axisPoints ? wall.axisPoints : this.getRenderedWallPoints(wall);
    if (!Array.isArray(wallPoints) || wallPoints.length < 2) {
      return null;
    }

    const segmentIndexRaw =
      overrides.segmentIndex !== undefined ? overrides.segmentIndex : opening.segmentIndex || 0;
    const segment = getSegmentPoints(wallPoints, segmentIndexRaw);
    if (!segment) {
      return null;
    }

    const startRatioRaw =
      overrides.startRatio !== undefined ? overrides.startRatio : opening.startRatio || 0;
    const endRatioRaw =
      overrides.endRatio !== undefined ? overrides.endRatio : opening.endRatio || 0;

    const startRatio = clamp(startRatioRaw, 0, 1);
    const endRatio = clamp(Math.max(endRatioRaw, startRatio), 0, 1);
    const spanRatio = clamp(endRatio - startRatio, 0, 1);

    const segmentLength = distance(segment.start, segment.end);
    const widthPixels = segmentLength * spanRatio;
    const computedWidthMeters = lengthToMeters(widthPixels, this.gridSize);
    const widthMeters = Number.isFinite(opening.width) ? opening.width : computedWidthMeters;

    const startPoint = {
      x: segment.start.x + (segment.end.x - segment.start.x) * startRatio,
      y: segment.start.y + (segment.end.y - segment.start.y) * startRatio,
    };
    const endPoint = {
      x: segment.start.x + (segment.end.x - segment.start.x) * endRatio,
      y: segment.start.y + (segment.end.y - segment.start.y) * endRatio,
    };
    const centerPoint = {
      x: (startPoint.x + endPoint.x) / 2,
      y: (startPoint.y + endPoint.y) / 2,
    };

    const unit =
      segmentLength === 0
        ? { x: 0, y: 0 }
        : {
            x: (segment.end.x - segment.start.x) / segmentLength,
            y: (segment.end.y - segment.start.y) / segmentLength,
          };
    const perpendicular = { x: -unit.y, y: unit.x };

    return {
      opening,
      wall,
      segmentIndex: clamp(segmentIndexRaw, 0, wallPoints.length - 2),
      startRatio,
      endRatio,
      spanRatio,
      segmentLength,
      widthPixels,
      widthMeters,
      computedWidthMeters,
      startPoint,
      endPoint,
      centerPoint,
      unit,
      perpendicular,
    };
  }

  drawOpening(opening, type) {
    opening._labelRect = null;
    let overrides;
    if (
      this.openingDragState &&
      this.openingDragState.type === type &&
      this.openingDragState.openingId === opening.id &&
      this.openingDragState.preview
    ) {
      overrides = this.openingDragState.preview;
    }
    const geometry = this.getOpeningGeometry(opening, overrides);
    if (!geometry) return;

    const ctx = this.ctx;
    const isDoor = type === 'door';
    const isSelected = isDoor
      ? this.selectedDoorId === opening.id
      : this.selectedWindowId === opening.id;
    const lineWidth = isDoor ? DOOR_LINE_WIDTH : WINDOW_LINE_WIDTH;
    const isDimmed = Boolean(opening.isDimmed);

    ctx.save();
    // The opening occupies its host's full band when the wall is physical.
    const thickness =
      opening.physical?.thickness > 0 ? opening.physical.thickness * this.gridSize : lineWidth;
    (isDoor ? drawDoorSymbol : drawWindowSymbol)(ctx, geometry, {
      thickness,
      theme: levelTheme(this.planTheme, this.levelOf(isDoor ? 'doors' : 'windows', opening)),
      selected: isSelected,
      pixel: 1 / this.zoomLevel,
    });
    ctx.restore();

    const labelType = isDoor ? 'doors' : 'windows';
    if ((this.shouldShowLabel(labelType) || isSelected) && !isDimmed) {
      const baseLabel = opening.displayLabel || opening.label;
      const fallbackIndex = typeof opening.index === 'number' ? opening.index + 1 : null;
      const labelText = formatShortLabel(
        baseLabel,
        isDoor ? 'D' : 'W',
        fallbackIndex,
        isDoor ? 'door' : 'window'
      );
      if (labelText && isSelected) {
        opening._labelRect = this.drawSelectedName(
          labelText,
          geometry.startPoint,
          geometry.endPoint,
          opening.roomId,
          opening.physical ? thickness / 2 : 0
        );
      } else if (labelText) {
        const labelOffset = lineWidth / 2 + 6;
        const labelAnchor = {
          x: geometry.centerPoint.x,
          y: geometry.centerPoint.y - labelOffset,
        };
        const labelRect = this.drawLabelBadge(labelText, labelAnchor, { position: 'top' });
        if (labelRect) {
          opening._labelRect = labelRect;
        }
      }
    } else {
      opening._labelRect = null;
    }

    if (isSelected) {
      this.drawOpeningHandles(geometry);
    }
  }

  drawOpeningHandles(geometry) {
    const ctx = this.ctx;
    const handles = [geometry.startPoint, geometry.endPoint];
    ctx.save();
    ctx.fillStyle = this.planTheme.accent;
    ctx.strokeStyle = this.planTheme.handle;
    ctx.lineWidth = 2;
    handles.forEach((handlePoint) => {
      ctx.beginPath();
      ctx.arc(handlePoint.x, handlePoint.y, this.px(OPENING_HANDLE_RADIUS), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
    const center = geometry.centerPoint;
    ctx.fillStyle = this.planTheme.handle;
    ctx.strokeStyle = this.planTheme.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(center.x, center.y, this.px(OPENING_HANDLE_RADIUS - 2), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  snapPointToWall(point, roomId = null) {
    const hit = this.findWallNearPoint(point, roomId);
    if (!hit || hit.distance > this.px(STRUCTURAL_SNAP_TOLERANCE)) {
      return null;
    }
    return {
      point: hit.closestPoint,
      wall: hit.wall,
      wallId: hit.wall.id,
      segmentIndex: hit.segmentIndex,
      ratio: hit.ratio,
      distance: hit.distance,
    };
  }

  findOpeningHandle(point) {
    const priority = [];
    if (this.selectedDoorId) {
      const door = this.getOpeningById('door', this.selectedDoorId);
      if (door && !door.isDimmed) priority.push({ type: 'door', opening: door });
    }
    if (this.selectedWindowId) {
      const window = this.getOpeningById('window', this.selectedWindowId);
      if (window && !window.isDimmed) priority.push({ type: 'window', opening: window });
    }
    this.doors.forEach((door) => {
      if (door?.isDimmed) return;
      if (!priority.find((entry) => entry.opening.id === door.id)) {
        priority.push({ type: 'door', opening: door });
      }
    });
    this.windows.forEach((window) => {
      if (window?.isDimmed) return;
      if (!priority.find((entry) => entry.opening.id === window.id)) {
        priority.push({ type: 'window', opening: window });
      }
    });

    for (let i = 0; i < priority.length; i += 1) {
      const { type, opening } = priority[i];
      if (opening?.isDimmed) continue;
      const geometry = this.getOpeningGeometry(opening);
      if (!geometry) continue;
      const startDist = distance(point, geometry.startPoint);
      if (startDist <= this.px(OPENING_HANDLE_RADIUS)) {
        return { type, openingId: opening.id, handle: 'start', geometry };
      }
      const endDist = distance(point, geometry.endPoint);
      if (endDist <= this.px(OPENING_HANDLE_RADIUS)) {
        return { type, openingId: opening.id, handle: 'end', geometry };
      }
      const centerDist = distance(point, geometry.centerPoint);
      if (centerDist <= this.px(OPENING_HANDLE_RADIUS)) {
        return { type, openingId: opening.id, handle: 'center', geometry };
      }
    }

    return null;
  }

  /** Selects an opening and starts dragging it: `handle` is move, start or end. */
  grabOpening({ type, openingId, geometry }, handle, point) {
    this.selectedDoorId = type === 'door' ? openingId : null;
    this.selectedWindowId = type === 'door' ? null : openingId;
    this.selectedWallId = geometry.wall?.id || null;
    this.openingDragState = {
      type,
      handle,
      openingId,
      pointerStart: point,
      originalStart: geometry.startRatio,
      originalEnd: geometry.endRatio,
      originalSegmentIndex: geometry.segmentIndex,
      spanRatio: geometry.spanRatio,
      grabCenter: geometry.centerPoint,
      moved: false,
    };
    this.setHoverState(null);
    const focusFn = type === 'door' ? this.controller?.focusDoor : this.controller?.focusWindow;
    if (typeof focusFn === 'function') {
      this.pendingFocus = () => focusFn.call(this.controller, openingId);
    }
    this.updateButtonStates();
    this.updateCursor();
    this.render();
  }

  /** What a dragged opening's row becomes: the live preview and the drop send the same. */
  openingDragUpdates(state) {
    const opening = this.getOpeningById(state.type, state.openingId);
    if (!opening || !state.preview) return null;
    const geometry = this.getOpeningGeometry(opening, state.preview);
    if (!geometry) return null;
    const updates = {
      segmentIndex: geometry.segmentIndex,
      startRatio: geometry.startRatio,
      endRatio: geometry.endRatio,
      width: roundCoordinate(geometry.computedWidthMeters),
      height: opening.height,
    };
    if (state.type === 'window') updates.distanceFromFloor = opening.distanceFromFloor;
    return updates;
  }

  findOpeningNearPoint(point) {
    const candidates = [];
    if (this.selectedDoorId) {
      const door = this.getOpeningById('door', this.selectedDoorId);
      if (door && !door.isDimmed) candidates.push({ type: 'door', opening: door });
    }
    if (this.selectedWindowId) {
      const window = this.getOpeningById('window', this.selectedWindowId);
      if (window && !window.isDimmed) candidates.push({ type: 'window', opening: window });
    }
    this.doors.forEach((door) => {
      if (door?.isDimmed) return;
      if (!candidates.find((entry) => entry.opening.id === door.id)) {
        candidates.push({ type: 'door', opening: door });
      }
    });
    this.windows.forEach((window) => {
      if (window?.isDimmed) return;
      if (!candidates.find((entry) => entry.opening.id === window.id)) {
        candidates.push({ type: 'window', opening: window });
      }
    });

    let bestMatch = null;
    let bestDistance = Infinity;
    const reach = this.px(OPENING_REACH);

    candidates.forEach(({ type, opening }) => {
      if (opening?.isDimmed) return;
      const geometry = this.getOpeningGeometry(opening);
      if (!geometry || geometry.segmentLength === 0) return;
      if (opening._labelRect && pointInRect(point, opening._labelRect)) {
        bestDistance = -Infinity;
        bestMatch = { type, openingId: opening.id, geometry };
        return;
      }
      // The opening's band runs along its axis, as thick as the wall (drawOpening): anywhere on
      // it, or a few pixels around it, is a hit; inside, the nearest axis wins.
      const halfBand =
        opening.physical?.thickness > 0 ? (opening.physical.thickness * this.gridSize) / 2 : 0;
      const dist = pointToSegmentDistance(point, geometry.startPoint, geometry.endPoint) - halfBand;
      if (dist <= reach && dist < bestDistance) {
        bestDistance = dist;
        bestMatch = { type, openingId: opening.id, geometry };
      }
    });

    return bestMatch;
  }

  async placeOpening(type, wallHit) {
    const wall = wallHit?.wall;
    if (!wall) return null;

    const renderedPoints = this.getRenderedWallPoints(wall);
    const segment = getSegmentPoints(renderedPoints, wallHit.segmentIndex || 0);
    if (!segment) return null;

    const segmentLength = distance(segment.start, segment.end);
    if (segmentLength === 0) return null;

    const defaultWidthMeters = type === 'door' ? DEFAULT_DOOR_WIDTH_M : DEFAULT_WINDOW_WIDTH_M;
    const defaultHeightMeters = type === 'door' ? DEFAULT_DOOR_HEIGHT_M : DEFAULT_WINDOW_HEIGHT_M;
    const defaultDistanceFromFloor = type === 'window' ? DEFAULT_WINDOW_SILL_HEIGHT_M : undefined;

    const desiredSpanPixels = metersToLength(defaultWidthMeters, this.gridSize);
    let spanRatio = desiredSpanPixels / segmentLength;
    if (!Number.isFinite(spanRatio) || spanRatio <= 0) {
      spanRatio = MIN_OPENING_RATIO;
    }
    spanRatio = clamp(spanRatio, MIN_OPENING_RATIO, 0.9);
    const appliedWidthMeters = lengthToMeters(segmentLength * spanRatio, this.gridSize);

    const rawCenter = wallHit.ratio || 0.5;
    const minCenter = spanRatio / 2;
    const maxCenter = 1 - spanRatio / 2;
    const centerRatio = clamp(rawCenter, minCenter, maxCenter);
    // Whole centimetres from the wall start, and the default width.
    const placed = snapOpeningRatios(
      wall.bindings?.[wallHit.segmentIndex || 0],
      clamp(centerRatio - spanRatio / 2, 0, 1 - spanRatio),
      clamp(centerRatio + spanRatio / 2, spanRatio, 1),
      { keepWidth: true }
    );
    const { startRatio, endRatio } = placed;
    const width = placed.width ?? appliedWidthMeters;

    if (type === 'door' && this.controller && typeof this.controller.createDoor === 'function') {
      const result = await this.controller.createDoor(wall.id, {
        segmentIndex: wallHit.segmentIndex || 0,
        startRatio,
        endRatio,
        width,
        height: defaultHeightMeters,
      });
      if (result) {
        this.selectedDoorId = result.id;
        this.selectedWindowId = null;
        this.selectedWallId = wall.id;
      }
      return result;
    }

    if (
      type === 'window' &&
      this.controller &&
      typeof this.controller.createWindow === 'function'
    ) {
      const result = await this.controller.createWindow(wall.id, {
        segmentIndex: wallHit.segmentIndex || 0,
        startRatio,
        endRatio,
        width,
        height: defaultHeightMeters,
        distanceFromFloor: defaultDistanceFromFloor,
      });
      if (result) {
        this.selectedWindowId = result.id;
        this.selectedDoorId = null;
        this.selectedWallId = wall.id;
      }
      return result;
    }

    return null;
  }

  drawDraftWall(start, end) {
    const ctx = this.ctx;
    ctx.save();
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = this.planTheme.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.restore();
  }

  getRenderedWallPoints(wall) {
    if (!wall) return [];

    if (Array.isArray(wall.previewPoints) && wall.previewPoints.length > 0) {
      return clonePoints(wall.previewPoints);
    }

    const basePoints = Array.isArray(wall.points) ? wall.points : [];
    const room = this.rooms.find((r) => r.id === wall.roomId);
    if (!room || !room.previewRect || !room.rect) {
      return basePoints;
    }

    const deltaX = room.previewRect.x - room.rect.x;
    const deltaY = room.previewRect.y - room.rect.y;
    return basePoints.map((point) => ({ x: point.x + deltaX, y: point.y + deltaY }));
  }
}
