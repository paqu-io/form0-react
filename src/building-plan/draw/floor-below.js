/**
 * The floor below, drawn under the floor shown (F2, 2026-11-22; U2): its wall bands as hairline
 * outlines (both faces) and its columns, no fills, labels, openings or handles. The canvas draws
 * it over the room surfaces and under this floor's walls, so the walls below still show inside a
 * room drawn over them. Core's canvas snapshot carries it (`floorBelow`), in canvas units.
 */

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ walls: Array<Array<{ x: number, y: number }>>,
 *   columns: Array<Array<{ x: number, y: number }>> } | null} floorBelow
 * @param {{ theme: Readonly<Record<string, string>>, pixel: number }} style `pixel`: one screen
 *   pixel in canvas units
 */
export function drawFloorBelow(ctx, floorBelow, { theme, pixel }) {
  const outlines = [...(floorBelow?.walls || []), ...(floorBelow?.columns || [])];
  if (!outlines.length) return;
  ctx.save();
  ctx.strokeStyle = theme.below;
  ctx.lineWidth = pixel;
  ctx.lineJoin = 'miter';
  ctx.beginPath();
  for (const outline of outlines) {
    if (outline.length < 2) continue;
    ctx.moveTo(outline[0].x, outline[0].y);
    for (const point of outline.slice(1)) ctx.lineTo(point.x, point.y);
    ctx.closePath();
  }
  ctx.stroke();
  ctx.restore();
}
