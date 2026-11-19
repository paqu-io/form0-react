import { FULL, HALF, OUT, levelTheme } from './scope-levels.js';

/**
 * The walls' footprints: the solid cut of each physical wall, and a dashed line on the axis of a
 * wall whose thickness is unknown. Drawn by scope level (1e, V1), faded first, then half, then
 * full, so a wall the room in scope shares with a faded room shows at the stronger level.
 * Opaque fills compose the junctions without double-stroked seams. Moved from the legacy canvas.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{ id: string, polygons: Array<Array<{ x: number, y: number }>>,
 *   schematicSegments?: Array<{ points: Array<{ x: number, y: number }> }> }>} footprints
 * @param {{ theme: object, levelOf: (footprint: object) => string, zoom?: number }} options
 */
export function drawWallFootprints(ctx, footprints, { theme, levelOf, zoom = 1 }) {
  if (!footprints?.length) return;
  ctx.save();
  for (const level of [OUT, HALF, FULL]) {
    const walls = footprints.filter((wall) => levelOf(wall) === level);
    if (!walls.length) continue;
    const color = levelTheme(theme, level).wall;
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.beginPath();
    for (const wall of walls)
      for (const polygon of wall.polygons) {
        if (!polygon.length) continue;
        ctx.moveTo(polygon[0].x, polygon[0].y);
        for (const point of polygon.slice(1)) ctx.lineTo(point.x, point.y);
        ctx.closePath();
      }
    ctx.fill();
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1 / zoom;
    for (const wall of walls)
      for (const segment of wall.schematicSegments || []) {
        ctx.beginPath();
        ctx.moveTo(segment.points[0].x, segment.points[0].y);
        ctx.lineTo(segment.points[1].x, segment.points[1].y);
        ctx.stroke();
      }
    ctx.setLineDash([]);
  }
  ctx.restore();
}
