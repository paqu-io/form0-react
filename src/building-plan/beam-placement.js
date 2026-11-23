/**
 * Room beams on the canvas (3a, 2026-11-23): drawn, their ends dragged and moved whole through
 * core's beam snapping (`interaction.snapBeamEnd`, `snapBeamTranslation`): an end locks level or
 * plumb, pulls to corners and ends, then lines (the room's faces, free walls' sides and
 * centrelines, columns' sides and centres, other beams' sides and centrelines), lines up with
 * corners and ends on the floor, else takes the 1 cm step; the beam's body stays in its room,
 * flush against a face it is pushed into. Without core's beam snapping (an older core), as
 * before: each end held in the room's box and put on a wall face within reach.
 */

/** Closer than this to a wall's face (a millimetre), a beam's end counts as on it. */
const ON_FACE_M = 0.001;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const tidy = (point) => ({
  x: Math.round(point.x * 1000) / 1000,
  y: Math.round(point.y * 1000) / 1000,
});

/** Today's rule, without core's beam snapping: held in the room's box, onto a face near it. */
function heldInBox(plan, point, roomId) {
  const rect = plan.getRoomRect(roomId);
  const held = rect
    ? {
        x: clamp(point.x, rect.x, rect.x + rect.width),
        y: clamp(point.y, rect.y, rect.y + rect.height),
      }
    : { x: point.x, y: point.y };
  return plan.snapPointToWall(held, roomId)?.point || held;
}

const shared = (plan, beam) => ({
  roomId: beam.roomId,
  beamId: beam.beamId ?? null,
  width: beam.width,
  zoom: plan.zoomLevel,
  bypass: Boolean(plan.lastPointerEvent?.altKey),
});

/**
 * Where an end of a beam being drawn or dragged goes for `point`.
 * @param {object} plan the legacy canvas
 * @param {{ x: number, y: number }} point
 * @param {{ roomId: string, beamId?: string | null, width: number,
 *   from?: { x: number, y: number } | null }} beam its width in metres; `from`: the other end
 *   (none for a drawing's first point)
 */
export function snapBeamEnd(plan, point, beam) {
  const interaction = plan.controller?.interaction;
  if (!interaction?.snapBeamEnd) return heldInBox(plan, point, beam.roomId);
  return tidy(interaction.snapBeamEnd(point, { ...shared(plan, beam), from: beam.from ?? null }));
}

/**
 * Where a whole beam being moved goes for its ends moved with the pointer (`points`).
 * @param {object} plan the legacy canvas
 * @param {Array<{ x: number, y: number }>} points
 * @param {{ roomId: string, beamId: string, width: number,
 *   originalPoints: Array<{ x: number, y: number }> }} beam
 */
export function snapBeamMove(plan, points, beam) {
  const interaction = plan.controller?.interaction;
  if (!interaction?.snapBeamTranslation) {
    const rect = plan.getRoomRect(beam.roomId);
    if (!rect) return points;
    return points.map((point) => ({
      x: clamp(point.x, rect.x, rect.x + rect.width),
      y: clamp(point.y, rect.y, rect.y + rect.height),
    }));
  }
  return interaction
    .snapBeamTranslation(points, { ...shared(plan, beam), originalPoints: beam.originalPoints })
    .map(tidy);
}

/**
 * The legacy wall fields (`beam_wall_segment_index`, `beam_start_ratio`, `beam_end_ratio`), kept
 * with their meaning (3a, B8): both ends on one segment of a room wall's face, within a
 * millimetre, give that segment and where each end falls along it; else -1, 0 and 1. Core doesn't
 * read them.
 * @param {object} plan the legacy canvas
 * @param {string} roomId
 * @param {{ x: number, y: number }} start
 * @param {{ x: number, y: number }} end
 * @returns {{ wallSegmentIndex: number, startRatio: number, endRatio: number }}
 */
export function beamWallValues(plan, roomId, start, end) {
  const reach = ON_FACE_M * plan.gridSize;
  for (const wall of plan.walls || []) {
    if (wall.roomId !== roomId || !(wall.isBoundary || wall.isCutPortion) || wall.isDimmed)
      continue;
    // A Split free wall portion keeps its face here (core gives its centreline since 4a-3).
    const points = wall.sidePoints || plan.getRenderedWallPoints(wall) || [];
    for (let index = 0; index < points.length - 1; index += 1) {
      const [a, b] = [points[index], points[index + 1]];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const squared = dx * dx + dy * dy;
      if (!squared) continue;
      const ratio = (p) => ((p.x - a.x) * dx + (p.y - a.y) * dy) / squared;
      const off = (p) => {
        const t = clamp(ratio(p), 0, 1);
        return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
      };
      if (off(start) > reach || off(end) > reach) continue;
      return {
        wallSegmentIndex: index,
        startRatio: clamp(ratio(start), 0, 1),
        endRatio: clamp(ratio(end), 0, 1),
      };
    }
  }
  return { wallSegmentIndex: -1, startRatio: 0, endRatio: 1 };
}

/**
 * What the canvas keeps for a beam being drawn or dragged: its ends as fractions of its room's
 * box (a beam lies in its room), the legacy wall fields, and the ends themselves.
 * @param {object} plan the legacy canvas
 * @param {string} roomId
 * @param {{ x: number, y: number }} start
 * @param {{ x: number, y: number }} end
 */
export function beamPreview(plan, roomId, start, end) {
  const rect = plan.getRoomRect(roomId);
  if (!rect?.width || !rect?.height) return null;
  const u = (point) => clamp((point.x - rect.x) / rect.width, 0, 1);
  const v = (point) => clamp((point.y - rect.y) / rect.height, 0, 1);
  return {
    startU: u(start),
    startV: v(start),
    endU: u(end),
    endV: v(end),
    ...beamWallValues(plan, roomId, start, end),
    startPoint: start,
    endPoint: end,
  };
}
