/**
 * The marks of a refused edit (1e, M1): a dashed ghost where the gesture would have put the
 * element, and an outline around the elements the refusal names (the element in the way).
 *
 * Core keeps the last allowed preview while a drag goes on, so the refused geometry exists only
 * in the canvas's own drag state. These helpers read it, and the elements, from the legacy canvas
 * (`plan`); they draw nothing themselves except in `drawRefusalMarks`.
 */
import { planIssueTargets } from '../plan-messages.js';

/** @typedef {{ x: number, y: number }} Point */
/** @typedef {{ points: Point[], closed: boolean, from?: Point, to?: Point }} Shape */

const rectPoints = (rect) => [
  { x: rect.x, y: rect.y },
  { x: rect.x + rect.width, y: rect.y },
  { x: rect.x + rect.width, y: rect.y + rect.height },
  { x: rect.x, y: rect.y + rect.height },
];
const rectCentre = (rect) => ({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
const middle = (points) => ({
  x: (points[0].x + points.at(-1).x) / 2,
  y: (points[0].y + points.at(-1).y) / 2,
});

/** A band of half-width `half` around the segment start–end. */
function band(start, end, half) {
  const length = Math.hypot(end.x - start.x, end.y - start.y) || 1;
  const n = { x: (-(end.y - start.y) / length) * half, y: ((end.x - start.x) / length) * half };
  return [
    { x: start.x + n.x, y: start.y + n.y },
    { x: end.x + n.x, y: end.y + n.y },
    { x: end.x - n.x, y: end.y - n.y },
    { x: start.x - n.x, y: start.y - n.y },
  ];
}

/** The polygon pushed out from its centre by `pad`, so a small outline clears what it marks. */
function grow(points, pad) {
  const c = points.reduce((sum, p) => ({ x: sum.x + p.x, y: sum.y + p.y }), { x: 0, y: 0 });
  c.x /= points.length;
  c.y /= points.length;
  return points.map((p) => {
    const d = Math.hypot(p.x - c.x, p.y - c.y) || 1;
    return { x: p.x + ((p.x - c.x) / d) * pad, y: p.y + ((p.y - c.y) / d) * pad };
  });
}

function nearestIndex(points, target) {
  let best = -1;
  let bestDistance = Infinity;
  points.forEach((p, index) => {
    const d = Math.hypot(p.x - target.x, p.y - target.y);
    if (d < bestDistance) [best, bestDistance] = [index, d];
  });
  return best;
}

/**
 * Where the running gesture would put the element: a room moved or resized, a corner, a wall or
 * an opening. Columns and beams don't preview, so they have none.
 * @returns {Shape | null}
 */
export function refusalGhost(plan) {
  const { dragState, cornerDragState, wallDragState, openingDragState } = plan;
  const zoom = plan.zoomLevel || 1;
  if (dragState?.moved) {
    const room = plan.rooms?.find((entry) => entry.id === dragState.roomId);
    const rect = room?.previewRect || dragState.previewRect;
    if (!rect) return null;
    const start = plan.gestureRooms?.get(dragState.roomId);
    if (dragState.type === 'move' && start?.rect && start.vertices?.length > 2) {
      const dx = rect.x - start.rect.x;
      const dy = rect.y - start.rect.y;
      return {
        points: start.vertices.map((p) => ({ x: p.x + dx, y: p.y + dy })),
        closed: true,
        from: rectCentre(start.rect),
        to: rectCentre(rect),
      };
    }
    return { points: rectPoints(rect), closed: true };
  }
  if (cornerDragState?.moved && cornerDragState.previewPoint && cornerDragState.point) {
    const { roomId, point, previewPoint } = cornerDragState;
    const vertices =
      plan.gestureRooms?.get(roomId)?.vertices ||
      plan.rooms?.find((entry) => entry.id === roomId)?.vertices ||
      [];
    const index = vertices.length > 2 ? nearestIndex(vertices, point) : -1;
    if (index < 0) return null;
    const n = vertices.length;
    return {
      points: [vertices[(index + n - 1) % n], previewPoint, vertices[(index + 1) % n]],
      closed: false,
      from: point,
      to: previewPoint,
    };
  }
  if (wallDragState?.moved && wallDragState.previewPoints?.length > 1) {
    const { previewPoints, originalPoints } = wallDragState;
    return {
      points: previewPoints,
      closed: false,
      ...(originalPoints?.length > 1
        ? { from: middle(originalPoints), to: middle(previewPoints) }
        : {}),
    };
  }
  if (openingDragState?.moved && openingDragState.preview) {
    const opening = plan.getOpeningById?.(openingDragState.type, openingDragState.openingId);
    const geometry = opening && plan.getOpeningGeometry?.(opening, openingDragState.preview);
    if (!geometry) return null;
    const thickness = opening.physical?.thickness || geometry.wall?.thickness || 0;
    const half = Math.max((thickness * (plan.gridSize || 1)) / 2, 3 / zoom);
    return { points: band(geometry.startPoint, geometry.endPoint, half), closed: true };
  }
  return null;
}

/**
 * Outlines around the elements the issues name, from what the canvas shows now. A room face is
 * outlined by its physical wall; an opening, column or beam by a box a little larger than it.
 * @returns {Shape[]}
 */
export function refusalOutlines(plan, issues) {
  const targets = planIssueTargets(issues);
  const pad = 4 / (plan.zoomLevel || 1);
  const shapes = [];
  for (const room of plan.rooms || [])
    if (targets.rooms.has(room.id) && room.vertices?.length > 2)
      shapes.push({ points: room.vertices, closed: true });
  const wallIds = new Set(targets.walls);
  const footprints = plan.wallFootprints || [];
  for (const face of plan.walls || []) {
    if (!targets.faces.has(face.id)) continue;
    if (footprints.some((footprint) => footprint.id === face.physicalWallId))
      wallIds.add(face.physicalWallId);
    else if (face.points?.length > 1) shapes.push({ points: face.points, closed: false });
  }
  for (const footprint of footprints)
    if (wallIds.has(footprint.id))
      for (const polygon of footprint.polygons || [])
        if (polygon.length > 2) shapes.push({ points: polygon, closed: true });
  const seen = new Set();
  for (const opening of [...(plan.doors || []), ...(plan.windows || [])]) {
    const id = opening.subjectId || opening.id;
    if (!targets.openings.has(id) || seen.has(id)) continue;
    seen.add(id);
    const polygon = opening.physical?.polygon;
    if (polygon?.length > 2) shapes.push({ points: grow(polygon, pad), closed: true });
    else {
      const geometry = plan.getOpeningGeometry?.(opening);
      if (geometry)
        shapes.push({
          points: grow(band(geometry.startPoint, geometry.endPoint, pad), pad),
          closed: true,
        });
    }
  }
  for (const column of plan.columns || []) {
    if (!targets.columns.has(column.id)) continue;
    const info = plan.getColumnRenderInfo?.(column);
    if (info?.rect) shapes.push({ points: grow(rectPoints(info.rect), pad), closed: true });
  }
  for (const beam of plan.beams || []) {
    if (!targets.beams.has(beam.id)) continue;
    const info = plan.getBeamRenderInfo?.(beam);
    if (info?.startPoint && info.endPoint)
      shapes.push({
        points: grow(band(info.startPoint, info.endPoint, (info.lineWidth || 0) / 2), pad),
        closed: true,
      });
  }
  return shapes;
}

function trace(ctx, { points, closed }) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) ctx.lineTo(point.x, point.y);
  if (closed) ctx.closePath();
}

/** An arrow from where the element is to where the gesture tried to put it. */
function arrow(ctx, from, to, px) {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  if (length < 16 * px) return;
  const u = { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
  const head = 8 * px;
  const base = { x: to.x - u.x * head, y: to.y - u.y * head };
  ctx.lineWidth = 1.5 * px;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(base.x, base.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(base.x - u.y * head * 0.5, base.y + u.x * head * 0.5);
  ctx.lineTo(base.x + u.y * head * 0.5, base.y - u.x * head * 0.5);
  ctx.closePath();
  ctx.fill();
}

/**
 * Draws the outlines (solid) and the ghost (dashed, with its arrow) in `color`, at widths that
 * stay the same on screen whatever the zoom.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ ghost?: Shape | null, outlines?: Shape[], color: string, zoom?: number }} marks
 */
export function drawRefusalMarks(ctx, { ghost = null, outlines = [], color, zoom = 1 }) {
  if (!ghost && !outlines.length) return;
  const px = 1 / zoom;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = 2 * px;
  ctx.setLineDash([]);
  for (const shape of outlines) {
    trace(ctx, shape);
    ctx.stroke();
  }
  if (ghost) {
    ctx.setLineDash([7 * px, 5 * px]);
    trace(ctx, ghost);
    ctx.stroke();
    ctx.setLineDash([]);
    if (ghost.from && ghost.to) arrow(ctx, ghost.from, ghost.to, px);
  }
  ctx.restore();
}
