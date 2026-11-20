/**
 * Plan symbols in one ink colour, following drafting conventions: an opening is cut into its
 * wall, a column is cut (filled like a wall), a beam sits above the cut (dashed). Selection is
 * the accent. All lengths are canvas units; `pixel` is one screen pixel in canvas units.
 */

/**
 * @typedef {{ startPoint: {x:number,y:number}, endPoint: {x:number,y:number},
 *   perpendicular: {x:number,y:number} }} OpeningGeometry
 * @typedef {{ thickness: number, theme: Record<string,string>, selected?: boolean,
 *   pixel: number }} SymbolOptions
 */

function line(ctx, a, b) {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

const offset = (point, normal, distance) => ({
  x: point.x + normal.x * distance,
  y: point.y + normal.y * distance,
});

/** Clears the wall band where the opening is and draws its two jambs. */
function cut(ctx, geometry, { thickness, theme, selected, pixel }) {
  const { startPoint, endPoint, perpendicular: n } = geometry;
  ctx.lineCap = 'butt';
  ctx.strokeStyle = theme.room;
  ctx.lineWidth = thickness + pixel;
  line(ctx, startPoint, endPoint);
  ctx.strokeStyle = selected ? theme.accent : theme.symbol;
  ctx.lineWidth = (selected ? 2 : 1.25) * pixel;
  for (const end of [startPoint, endPoint])
    line(ctx, offset(end, n, -thickness / 2), offset(end, n, thickness / 2));
}

/**
 * A door as a plain cut in its wall, with a threshold line; the hinge and swing come later,
 * with their own fields.
 * @param {CanvasRenderingContext2D} ctx
 * @param {OpeningGeometry} geometry
 * @param {SymbolOptions} options
 */
export function drawDoorSymbol(ctx, geometry, options) {
  ctx.save();
  cut(ctx, geometry, options);
  const { theme, selected, pixel } = options;
  ctx.strokeStyle = selected ? theme.accent : theme.symbol;
  ctx.lineWidth = (selected ? 2 : 1) * pixel;
  ctx.setLineDash([3 * pixel, 3 * pixel]);
  line(ctx, geometry.startPoint, geometry.endPoint);
  ctx.restore();
}

/**
 * A window: the cut, two glass lines and a thin middle line.
 * @param {CanvasRenderingContext2D} ctx
 * @param {OpeningGeometry} geometry
 * @param {SymbolOptions} options
 */
export function drawWindowSymbol(ctx, geometry, options) {
  ctx.save();
  cut(ctx, geometry, options);
  const { theme, selected, pixel, thickness } = options;
  const n = geometry.perpendicular;
  ctx.strokeStyle = selected ? theme.accent : theme.symbol;
  ctx.lineWidth = (selected ? 2 : 1.25) * pixel;
  for (const side of [-1, 1])
    line(
      ctx,
      offset(geometry.startPoint, n, side * thickness * 0.22),
      offset(geometry.endPoint, n, side * thickness * 0.22)
    );
  ctx.lineWidth = 0.75 * pixel;
  line(ctx, geometry.startPoint, geometry.endPoint);
  ctx.restore();
}

/** How opaque a column's fill is (after the unit 3 hand test: see-through, not solid). */
const COLUMN_FILL_ALPHA = 0.55;

/**
 * A column, cut by the plan, as the toolbar icon draws it: its outline and both diagonals in the
 * wall's tone, on the room's surface (half see-through); the outline in the accent when
 * selected. (Filled like a
 * wall, a column flush against one read as a notch in it: unit 3, 2026-11-20.)
 * @param {CanvasRenderingContext2D} ctx
 * @param {{x:number,y:number,width:number,height:number}} rect
 * @param {{ theme: Record<string,string>, selected?: boolean, pixel: number }} options
 */
export function drawColumnSymbol(ctx, rect, { theme, selected, pixel }) {
  const { x, y, width, height } = rect;
  ctx.save();
  // Half see-through, so what lies under it (a wall it stands in, the grid) shows while placing.
  ctx.globalAlpha = COLUMN_FILL_ALPHA;
  ctx.fillStyle = theme.room;
  ctx.fillRect(x, y, width, height);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = theme.wall;
  ctx.lineWidth = 1.5 * pixel;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + width, y + height);
  ctx.moveTo(x + width, y);
  ctx.lineTo(x, y + height);
  ctx.stroke();
  // Inside its edges, so a column flush against a wall keeps its outline.
  const line = (selected ? 2 : 1.5) * pixel;
  ctx.strokeStyle = selected ? theme.accent : theme.wall;
  ctx.lineWidth = line;
  ctx.strokeRect(x + line / 2, y + line / 2, width - line, height - line);
  ctx.restore();
}

/**
 * A beam: a dashed outline as wide as the beam, since it sits above the cut plane.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{x:number,y:number}} start
 * @param {{x:number,y:number}} end
 * @param {number} width canvas units
 * @param {{ theme: Record<string,string>, selected?: boolean, pixel: number }} options
 */
export function drawBeamSymbol(ctx, start, end, width, { theme, selected, pixel }) {
  const length = Math.hypot(end.x - start.x, end.y - start.y);
  if (!length) return;
  const n = { x: -(end.y - start.y) / length, y: (end.x - start.x) / length };
  const half = width / 2;
  const corners = [
    offset(start, n, half),
    offset(end, n, half),
    offset(end, n, -half),
    offset(start, n, -half),
  ];
  ctx.save();
  ctx.strokeStyle = selected ? theme.accent : theme.symbol;
  ctx.lineWidth = (selected ? 2 : 1.25) * pixel;
  ctx.setLineDash([6 * pixel, 4 * pixel]);
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (const corner of corners.slice(1)) ctx.lineTo(corner.x, corner.y);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

/**
 * A name on the plan: plain text with a halo in the room colour, so it reads over lines.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {{x:number,y:number}} centre
 * @param {{ font: string, color: string, halo: string, haloWidth: number }} options
 */
export function drawPlanLabel(ctx, text, centre, { font, color, halo, haloWidth }) {
  ctx.save();
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = halo;
  ctx.lineWidth = haloWidth;
  ctx.strokeText(text, centre.x, centre.y);
  ctx.fillStyle = color;
  ctx.fillText(text, centre.x, centre.y);
  ctx.restore();
}
