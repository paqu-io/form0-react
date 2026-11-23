import { PILL_HEIGHT, layoutPills } from './dimension-layout.js';

/**
 * Lengths on the plan canvas (step 3, 3-L3): a thin line beside what is measured, slash ticks at
 * its ends, extension lines back to the element when the line stands off, and the value on a
 * pill in the mono face, kept upright. Values that change are drawn in the accent. Sizes are
 * screen pixels (`pixel` is one screen pixel in canvas units), so a length reads the same at
 * any zoom. Built for the lengths shown while dragging; step 2 (a room's lengths) uses it too,
 * and step 4 (lengths you type, on the pill) will.
 */

/** How far the line stands off what it measures, by default. */
export const DIMENSION_OFFSET = 20;

const FONT = '600 11px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const PILL_PADDING = 5;
const PILL_RADIUS = 4;
const TICK = 4.5;
// Extension lines start this far from the element and run this far past the line.
const EXTENSION_GAP = 3;
// Angles this close to vertical count as vertical.
const UPRIGHT = 1e-6;
const formats = new Map();

/** @typedef {{ x: number, y: number }} Point */

/**
 * A length in the plan's unit and the locale's decimal sign, with two decimals and no unit (the
 * status line names it, 3-L4).
 * @param {number} metres
 * @param {{ toDisplayLength: (metres: number) => number, locale?: string }} presentation
 * @returns {string}
 */
export function formatLength(metres, presentation) {
  const locale = presentation?.locale || 'en';
  if (!formats.has(locale))
    formats.set(
      locale,
      new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        useGrouping: false,
      })
    );
  const value = presentation ? presentation.toDisplayLength(metres) : metres;
  return formats.get(locale).format(value);
}

/**
 * Draws a set of lengths: their lines, then their pills on top, each pill on its line's middle
 * or, when it doesn't fit there, past an end or stepped out (S11, `dimension-layout.js`).
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{ from: Point, to: Point, normal: Point, text: string, changing?: boolean,
 *   offset?: number }>} dimensions `normal`: the unit vector the line stands off along;
 *   `offset` in screen pixels
 * @param {{ theme: Readonly<Record<string, string>>, pixel: number,
 *   isInside?: ((point: Point) => boolean) | null }} style `isInside`: whether a point is in the
 *   room the lengths are about, for the pills that don't fit
 * @returns {Array<{ centre: Point, angle: number, width: number, height: number }>} the pills,
 *   their size in screen pixels (for a later hit test)
 */
export function drawDimensions(ctx, dimensions, { theme, pixel, isInside = null }) {
  ctx.save();
  ctx.font = FONT;
  const lines = dimensions
    .map((dimension) => lineOf(dimension, pixel))
    .filter(Boolean)
    .map((line) => ({ ...line, width: ctx.measureText(line.text).width + 2 * PILL_PADDING }));
  ctx.restore();
  const spots = layoutPills(lines, { pixel, isInside });
  lines.forEach((line, index) => strokeLine(ctx, line, spots[index], { theme, pixel }));
  lines.forEach((line, index) => drawPill(ctx, line, spots[index].centre, { theme, pixel }));
  return lines.map((line, index) => ({
    centre: spots[index].centre,
    angle: line.angle,
    width: line.width,
    height: PILL_HEIGHT,
  }));
}

// A length's line, standing off what it measures, and its pill's angle (upright).
function lineOf(dimension, pixel) {
  const { from, to, normal: n, text, changing = false, offset = DIMENSION_OFFSET } = dimension;
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  if (!length) return null;
  const u = { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
  const shift = (point, by) => ({ x: point.x + n.x * by * pixel, y: point.y + n.y * by * pixel });
  // Readable from the bottom or the right: a vertical length reads bottom to top.
  let angle = Math.atan2(u.y, u.x);
  if (angle > Math.PI / 2 - UPRIGHT) angle -= Math.PI;
  if (angle < -Math.PI / 2 - UPRIGHT) angle += Math.PI;
  return {
    from,
    to,
    n,
    u,
    a: shift(from, offset),
    b: shift(to, offset),
    offset,
    angle,
    text,
    changing,
  };
}

// The line with its ticks, its extension lines back to what it measures, and a pill's leader.
function strokeLine(ctx, line, spot, { theme, pixel }) {
  const { from, to, n, u, a, b, offset, changing } = line;
  const shift = (point, by) => ({ x: point.x + n.x * by * pixel, y: point.y + n.y * by * pixel });
  const segment = (p, q) => {
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
  };
  ctx.save();
  ctx.strokeStyle = changing ? theme.accent : theme.labelMuted;
  ctx.lineWidth = pixel;
  ctx.beginPath();
  if (offset > EXTENSION_GAP + 1) {
    segment(shift(from, EXTENSION_GAP), shift(from, offset + EXTENSION_GAP));
    segment(shift(to, EXTENSION_GAP), shift(to, offset + EXTENSION_GAP));
  }
  segment(a, b);
  // Slash ticks, across the line at 45°.
  const slash = { x: u.x + n.x, y: u.y + n.y };
  const slashLength = Math.hypot(slash.x, slash.y) || 1;
  const t = {
    x: (slash.x / slashLength) * TICK * pixel,
    y: (slash.y / slashLength) * TICK * pixel,
  };
  for (const end of [a, b])
    segment({ x: end.x - t.x, y: end.y - t.y }, { x: end.x + t.x, y: end.y + t.y });
  if (spot.leader) segment(...spot.leader);
  ctx.stroke();
  ctx.restore();
}

// The pill, upright, in screen pixels.
function drawPill(ctx, line, centre, { theme, pixel }) {
  const { text, changing, angle, width } = line;
  ctx.save();
  ctx.translate(centre.x, centre.y);
  ctx.rotate(angle);
  ctx.scale(pixel, pixel);
  ctx.font = FONT;
  roundedRect(ctx, -width / 2, -PILL_HEIGHT / 2, width, PILL_HEIGHT, PILL_RADIUS);
  ctx.fillStyle = changing ? theme.accent : theme.room;
  ctx.fill();
  if (!changing) {
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = theme.labelMuted;
    ctx.lineWidth = 0.75;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = changing ? theme.handle : theme.label;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 0.5);
  ctx.restore();
}

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}
