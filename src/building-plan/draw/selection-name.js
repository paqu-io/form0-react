/**
 * Where the name of a selected wall or opening goes (after the V1 hand test, 2026-11-19): beside
 * the middle of its line, on the room's side, clear of the line and of a wall's thickness. Names
 * of walls and openings are otherwise not shown; a selected one is named so it can be told apart.
 * @param {{ x: number, y: number }} start
 * @param {{ x: number, y: number }} end
 * @param {{
 *   size: { width: number, height: number },
 *   clearance: number,
 *   isInside: (point: { x: number, y: number }) => boolean,
 * }} options `size`: the name's box; `clearance`: from the line to the name's box (canvas units,
 *   half a wall's thickness and a gap for an opening on the wall's axis); `isInside`: whether a
 *   point is in the room
 * @returns {{ x: number, y: number }} the name's centre
 */
export function nameBeside(start, end, { size, clearance, isInside }) {
  const middle = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  const length = Math.hypot(end.x - start.x, end.y - start.y);
  if (!(length > 0)) return { x: middle.x, y: middle.y - clearance - size.height / 2 };
  let normal = { x: -(end.y - start.y) / length, y: (end.x - start.x) / length };
  const probe = (direction) => ({
    x: middle.x + direction.x * (clearance + 1),
    y: middle.y + direction.y * (clearance + 1),
  });
  if (!isInside(probe(normal)) && isInside(probe({ x: -normal.x, y: -normal.y })))
    normal = { x: -normal.x, y: -normal.y };
  // Clear of the line along the normal, whatever the name's box is turned to.
  const reach =
    clearance + (Math.abs(normal.x) * size.width) / 2 + (Math.abs(normal.y) * size.height) / 2;
  return { x: middle.x + normal.x * reach, y: middle.y + normal.y * reach };
}
