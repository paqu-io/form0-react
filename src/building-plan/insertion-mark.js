/**
 * The insertion mark (3b of the building plan UI round, 2026-11-20): in a room entry, a click on
 * one of the room's walls or inside the room leaves a mark where it landed, and "Add door",
 * "Add window" and "Add column" add there. A click elsewhere moves it; a drag, another selection
 * or adding clears it.
 */

/** The mark's step along a wall and in the room: a centimetre. */
const STEP_M = 0.01;

/**
 * @typedef {{ kind: 'wall', wallId: string, roomId: string, point: { x: number, y: number } }
 *   | { kind: 'room', roomId: string, point: { x: number, y: number } }} InsertionMark
 */

export function inPolygon(point, polygon = []) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[j];
    const b = polygon[i];
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside;
}

/** `point` projected on the nearest segment of `points`, on the step along it. */
function onLine(points, point, step) {
  let best = null;
  for (let index = 0; index < points.length - 1; index += 1) {
    const a = points[index];
    const b = points[index + 1];
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    if (!length) continue;
    const t = Math.max(
      0,
      Math.min(length, ((point.x - a.x) * (b.x - a.x) + (point.y - a.y) * (b.y - a.y)) / length)
    );
    const along = Math.min(length, Math.round(t / step) * step);
    const foot = {
      x: a.x + ((b.x - a.x) * along) / length,
      y: a.y + ((b.y - a.y) * along) / length,
    };
    const away = Math.hypot(point.x - foot.x, point.y - foot.y);
    if (!best || away < best.away) best = { foot, away };
  }
  return best?.foot || null;
}

/**
 * The mark a click at `point` leaves, or null: only in a room entry and with the Select tool; on
 * the selected wall when the click selected one of the room's walls, else inside the room when
 * nothing else (a column, an opening, a beam) took the click.
 * @param {object} plan the legacy canvas
 * @param {{ x: number, y: number } | null} point where the press landed (canvas units)
 * @returns {InsertionMark | null}
 */
export function markFromClick(plan, point) {
  const roomId = plan.controller?.scope?.roomId;
  if (!roomId || !point || plan.mode !== 'select' || plan.readOnly) return null;
  const step = STEP_M * plan.gridSize;
  if (plan.selectedDoorId || plan.selectedWindowId || plan.selectedColumnId || plan.selectedBeamId)
    return null;
  if (plan.selectedWallId) {
    const wall = (plan.walls || []).find((entry) => entry.id === plan.selectedWallId);
    if (!wall || wall.roomId !== roomId) return null;
    const foot = onLine(plan.getRenderedWallPoints(wall) || [], point, step);
    return foot ? { kind: 'wall', wallId: wall.id, roomId, point: foot } : null;
  }
  const room = (plan.rooms || []).find((entry) => entry.id === roomId);
  if (!room || !inPolygon(point, room.vertices)) return null;
  const round = (value) => Math.round(value / step) * step;
  return { kind: 'room', roomId, point: { x: round(point.x), y: round(point.y) } };
}

/** The mark when it still stands for something the canvas shows (its wall, its room), else null. */
export function currentMark(plan) {
  const mark = plan.insertionMark;
  if (!mark) return null;
  if (mark.kind === 'wall')
    return plan.selectedWallId === mark.wallId &&
      (plan.walls || []).some((wall) => wall.id === mark.wallId)
      ? mark
      : null;
  return (plan.rooms || []).some((room) => room.id === mark.roomId) ? mark : null;
}
