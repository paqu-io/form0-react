/**
 * The selection a plan canvas shows besides its own presses (moved out of the legacy canvas):
 * the entry's own element and a hovered list row's (`highlight`), and, on a locked canvas (a
 * view-only entry, a read-only record), the element a click picked (`pick`, decided 2026-11-26):
 * a click selects there as in a room's entry, nothing moving; a click on nothing goes back to the
 * entry's own element; a hovered list row replaces the pick; data refreshes keep it.
 *
 * OPTION, off by default (decided 2026-11-26): only with `lockedSelection` true, from
 * `FormRenderer`'s `buildingPlanLockedSelection`; off, a locked canvas selects nothing by a click,
 * as before (a selectable element looked openable, though an entry opens only its own rows).
 */

/** Whether the canvas picks: locked, and the host turned picks on. */
export const picksOn = (canvas) => Boolean(canvas.readOnly) && canvas.lockedSelection === true;

/** The canvas's selection field per collection. */
export const HIGHLIGHT_FIELDS = Object.freeze({
  rooms: 'selectedRoomId',
  walls: 'selectedWallId',
  doors: 'selectedDoorId',
  windows: 'selectedWindowId',
  columns: 'selectedColumnId',
  beams: 'selectedBeamId',
  // A wall beam or band (D1c): from its entry, a problem or the front view, never a plan press.
  wallBeams: 'selectedWallBeamId',
});

const PRESS_SLOP = 4; // screen px a click may move and still be a click

const shown = (canvas, target) =>
  Boolean(
    target &&
    HIGHLIGHT_FIELDS[target.collection] &&
    (canvas[target.collection] || []).some((entry) => entry.id === target.id)
  );

/**
 * What a press on a locked canvas hits, in the press's order: a door or window, a column, a room
 * beam, a wall, a room. A canvas scoped to a room picks the element (nothing in a faded room, as
 * the hover shows); a floor's picks the element's room, as an editable Floor canvas does.
 * @returns {{ target: { collection: string, id: string } | null, open: (() => void) | null }}
 *   `open`: what a double-click opens
 */
export function lockedPress(canvas, point) {
  const { controller } = canvas;
  const hit = hitAt(canvas, point);
  if (!hit) return { target: null, open: null };
  const focus = {
    doors: 'focusDoor',
    windows: 'focusWindow',
    columns: 'focusColumn',
    beams: 'focusBeam',
    walls: 'focusWall',
    rooms: 'focusRoom',
  }[hit.collection];
  const open = () => controller?.[focus]?.(hit.id);
  if (!controller?.scope?.roomId)
    return { target: hit.roomId ? { collection: 'rooms', id: hit.roomId } : null, open };
  const opening = hit.collection === 'doors' || hit.collection === 'windows';
  const picked = hit.collection !== 'rooms' && (opening || !canvas.isFadedAt?.(point));
  return { target: picked ? { collection: hit.collection, id: hit.id } : null, open };
}

function hitAt(canvas, point) {
  const roomOf = (collection, id) =>
    (canvas[collection] || []).find((entry) => entry.id === id)?.roomId || null;
  const opening = canvas.findOpeningNearPoint(point);
  if (opening) {
    const collection = opening.type === 'door' ? 'doors' : 'windows';
    return { collection, id: opening.openingId, roomId: roomOf(collection, opening.openingId) };
  }
  const column = canvas.findColumnHit(point)?.column;
  if (column) return { collection: 'columns', id: column.id, roomId: column.roomId || null };
  const beam = canvas.findBeamHit(point)?.beam;
  if (beam) return { collection: 'beams', id: beam.id, roomId: beam.roomId || null };
  const wall = canvas.findWallNearPoint(point)?.wall;
  if (wall) return { collection: 'walls', id: wall.id, roomId: wall.roomId || null };
  const room = canvas.findRoomAtPoint(point);
  return room ? { collection: 'rooms', id: room.id, roomId: room.id } : null;
}

/**
 * The release of a press on a locked canvas: a click (moved less than a few px) picks what it
 * pressed, or nothing; a drag picks nothing.
 */
export function releaseLockedPress(canvas, point) {
  const pressed = canvas.lockedTarget;
  const from = canvas.pressPoint;
  canvas.lockedTarget = null;
  if (!picksOn(canvas)) return;
  const zoom = canvas.zoomLevel || 1;
  if (from && point && Math.hypot(point.x - from.x, point.y - from.y) * zoom > PRESS_SLOP) return;
  pickElement(canvas, pressed);
}

/**
 * Picks an element on a locked canvas (a click, an issue, a dialog opened on the way), or none:
 * the entry's own element again. False when the canvas doesn't show it.
 * @param {object} canvas the legacy canvas
 * @param {{ collection: string, id: string } | null} target
 */
export function pickElement(canvas, target) {
  const found = shown(canvas, target);
  canvas.pick = found ? { collection: target.collection, id: target.id } : null;
  if (!canvas.pick) for (const field of Object.values(HIGHLIGHT_FIELDS)) canvas[field] = null;
  applyMarks(canvas);
  canvas.updateButtonStates?.();
  canvas.render();
  return found;
}

/** Applies the pick, else the highlight (the entry's own, a hovered row's), to the selection. */
export function applyMarks(canvas) {
  const target = [canvas.pick, canvas.highlight].find((entry) => shown(canvas, entry));
  if (!target) return;
  for (const field of Object.values(HIGHLIGHT_FIELDS))
    if (field !== 'selectedRoomId') canvas[field] = null;
  canvas[HIGHLIGHT_FIELDS[target.collection]] = target.id;
}

/** A new highlight (the entry's own element, a hovered row's) drops the pick. */
export function setMarks(canvas, highlight) {
  const previous = canvas.highlight;
  canvas.highlight = highlight || null;
  canvas.pick = null;
  if (!canvas.highlight && previous) {
    const field = HIGHLIGHT_FIELDS[previous.collection];
    if (field && canvas[field] === previous.id) canvas[field] = null;
  }
  applyMarks(canvas);
  canvas.render();
}
