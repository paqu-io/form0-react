/**
 * Columns on the canvas (unit 3 of the building plan UI round, 2026-11-20): placed and dragged
 * through core's column snapping (`interaction.snapColumn`): pulls to faces, corners, other
 * columns, jambs and lining up, else the 1 cm step on its sides, always inside its room (and its
 * walls, as far as core allows) and clear of other columns, doors and windows.
 */

/**
 * A column's centre as fractions of its room's box, not clamped: a column standing in a wall
 * (4a-1) has its centre outside the box.
 * @param {{ x: number, y: number }} centre
 * @param {{ x: number, y: number, width: number, height: number } | null} rect
 */
export function columnRatios(centre, rect) {
  if (!rect?.width || !rect?.height) return { u: 0, v: 0 };
  return { u: (centre.x - rect.x) / rect.width, v: (centre.y - rect.y) / rect.height };
}

/** Closer than this to a wall's face (a millimetre), a column counts as against it. */
const AGAINST_M = 0.001;

/**
 * Where a column's centre goes for `centre` (the pointer plus where it was grabbed), through
 * core. Null when it fits nowhere near. Without core's column snapping (an older core),
 * `fallback(centre)` as before.
 * @param {object} plan the legacy canvas
 * @param {{ x: number, y: number }} centre
 * @param {{ roomId: string, columnId?: string | null, width: number, height: number,
 *   from?: { x: number, y: number } | null }} column sizes in metres; `from`: where a dragged
 *   column last was
 * @param {(centre: { x: number, y: number }) => object} fallback
 */
export function snapColumnCentre(plan, centre, column, fallback) {
  const interaction = plan.controller?.interaction;
  if (!interaction?.snapColumn) return fallback(centre);
  return interaction.snapColumn(centre, {
    roomId: column.roomId,
    columnId: column.columnId ?? null,
    width: column.width,
    height: column.height,
    from: column.from ?? null,
    zoom: plan.zoomLevel,
    bypass: Boolean(plan.lastPointerEvent?.altKey),
  });
}

function segmentToRectDistance(a, b, rect) {
  const inside = (p) =>
    p.x >= rect.minX && p.x <= rect.maxX && p.y >= rect.minY && p.y <= rect.maxY;
  if (inside(a) || inside(b)) return 0;
  const toSegment = (p, s, e) => {
    const dx = e.x - s.x;
    const dy = e.y - s.y;
    const squared = dx * dx + dy * dy;
    const t = squared
      ? Math.max(0, Math.min(1, ((p.x - s.x) * dx + (p.y - s.y) * dy) / squared))
      : 0;
    return Math.hypot(p.x - (s.x + dx * t), p.y - (s.y + dy * t));
  };
  const corners = [
    { x: rect.minX, y: rect.minY },
    { x: rect.maxX, y: rect.minY },
    { x: rect.maxX, y: rect.maxY },
    { x: rect.minX, y: rect.maxY },
  ];
  const crosses = (p, q, s, e) => {
    const side = (o, u, v) => (u.x - o.x) * (v.y - o.y) - (u.y - o.y) * (v.x - o.x);
    return side(p, q, s) * side(p, q, e) < 0 && side(s, e, p) * side(s, e, q) < 0;
  };
  if (corners.some((corner, index) => crosses(a, b, corner, corners[(index + 1) % 4]))) return 0;
  return Math.min(
    ...corners.map((corner) => toSegment(corner, a, b)),
    ...[a, b].flatMap((point) =>
      corners.map((corner, index) => toSegment(point, corner, corners[(index + 1) % 4]))
    )
  );
}

function inPolygon(point, polygon) {
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

/**
 * The legacy wall fields (`column_wall_segment_index`, `column_wall_ratio`), kept with their
 * meaning (decided 2026-11-20): the room wall a column stands against or in, the segment of it
 * and where the column's centre falls along it; else -1 and 0. Core doesn't read them.
 * @param {object} plan the legacy canvas
 * @param {{ x: number, y: number }} centre
 * @param {{ roomId: string, width: number, height: number }} column sizes in metres
 * @returns {{ wallSegmentIndex: number, wallRatio: number }}
 */
export function columnWallValues(plan, centre, { roomId, width, height }) {
  const half = { x: (width * plan.gridSize) / 2, y: (height * plan.gridSize) / 2 };
  const rect = {
    minX: centre.x - half.x,
    minY: centre.y - half.y,
    maxX: centre.x + half.x,
    maxY: centre.y + half.y,
  };
  const reach = AGAINST_M * plan.gridSize;
  let best = null;
  for (const wall of plan.walls || []) {
    if (wall.roomId !== roomId || !(wall.isBoundary || wall.isCutPortion) || wall.isDimmed)
      continue;
    const points = plan.getRenderedWallPoints(wall) || [];
    const body = plan.wallFootprints?.find((entry) => entry.id === wall.physicalWallId);
    const inBody = body?.polygons?.some((polygon) => inPolygon(centre, polygon));
    for (let index = 0; index < points.length - 1; index += 1) {
      const [a, b] = [points[index], points[index + 1]];
      if (!inBody && segmentToRectDistance(a, b, rect) > reach) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const squared = dx * dx + dy * dy;
      if (!squared) continue;
      const along = ((centre.x - a.x) * dx + (centre.y - a.y) * dy) / squared;
      const ratio = Math.max(0, Math.min(1, along));
      const away = Math.hypot(centre.x - (a.x + dx * ratio), centre.y - (a.y + dy * ratio));
      if (!best || away < best.away) best = { away, wallSegmentIndex: index, wallRatio: ratio };
    }
  }
  return best
    ? { wallSegmentIndex: best.wallSegmentIndex, wallRatio: best.wallRatio }
    : { wallSegmentIndex: -1, wallRatio: 0 };
}
