/**
 * The select tool's cursors on the plan canvas (step 3, 3-H3). Resize arrows follow the element:
 * the nearest of the four to its direction. `move` on corners, ends, split points and four-way
 * grips; `grab`, then `grabbing`, on bodies and opening grips; the arrow over faded elements. The
 * drawing tools keep their crosshair (the canvas sets it).
 */

const RESIZE = ['ew-resize', 'nwse-resize', 'ns-resize', 'nesw-resize'];

/**
 * The resize cursor nearest to a direction, on screen axes (y down): a door on a vertical wall
 * gets `ns-resize`, a beam rising at 25° `nesw-resize`.
 * @param {{ x: number, y: number } | null | undefined} direction any length
 * @returns {string}
 */
export function resizeCursor(direction) {
  if (!direction || (!direction.x && !direction.y)) return RESIZE[0];
  const angle = ((Math.atan2(direction.y, direction.x) * 180) / Math.PI + 180) % 180;
  return RESIZE[Math.round(angle / 45) % 4];
}

/**
 * A rectangular room's corner handle (today's engine only): the diagonal through it.
 * @param {string} handle top-left, top-right, bottom-right or bottom-left
 */
function roomHandleCursor(handle) {
  if (handle === 'top-left' || handle === 'bottom-right') return 'nwse-resize';
  if (handle === 'top-right' || handle === 'bottom-left') return 'nesw-resize';
  return 'default';
}

/**
 * The cursor for what the pointer is over, with no gesture running.
 * @param {{ type: string, handle?: string, direction?: { x: number, y: number },
 *   free?: boolean } | null} hover the canvas's hover state; `direction` is the element's (an
 *   opening's wall, a beam) or, for a room wall's grip, its normal
 * @returns {string}
 */
export function hoverCursor(hover) {
  switch (hover?.type) {
    case 'corner':
    case 'wall-handle':
    case 'column':
      return 'move';
    case 'wall-grip':
      return hover.free ? 'move' : resizeCursor(hover.direction);
    case 'opening-handle':
      return hover.handle === 'center' ? 'grab' : resizeCursor(hover.direction);
    case 'beam-handle':
      return resizeCursor(hover.direction);
    case 'room-handle':
      return roomHandleCursor(hover.handle);
    case 'faded':
      return 'default';
    default:
      // Bodies: openings, beams, walls, rooms.
      return 'grab';
  }
}

/**
 * The cursor while a gesture runs: the one it started on, with a grab turned into grabbing.
 * @param {string | null | undefined} pressCursor
 */
export function dragCursor(pressCursor) {
  return !pressCursor || pressCursor === 'grab' ? 'grabbing' : pressCursor;
}
