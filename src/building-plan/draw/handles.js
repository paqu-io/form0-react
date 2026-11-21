/**
 * Handles on the plan canvas (step 3: 3-H1, 3-H2, 3-P). One style for every point you drag (room
 * corners, wall ends, a free wall's split point, opening and beam ends); a capsule that slides a
 * door or window along its wall; round grips with arrows (the wall grip, a column's four-way
 * grip); a pinned wall's badge. Sizes are screen pixels: `pixel` is one screen pixel in canvas
 * units (1 / zoom), so they keep their size at any zoom.
 */

/** A drag handle's radius: a 10 px circle. */
export const HANDLE_RADIUS = 5;
/** A column's four-way grip: 22 px. */
export const COLUMN_GRIP_RADIUS = 11;
/** A pinned wall's badge: 16 px. */
export const PIN_BADGE_RADIUS = 8;

const CAPSULE_LENGTH = 20;
const CAPSULE_WIDTH = 8;
// The tint a grip takes under the pointer (the handles fill with the accent instead).
const GRIP_HOT_ALPHA = 0.16;
// Lucide's "pin", on its 24-unit grid.
const PIN_ICON =
  'M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 ' +
  '1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 ' +
  '0 0 0 0 4 1 1 0 0 1 1 1z';
const PIN_ICON_SIZE = 11;

/** @typedef {{ x: number, y: number }} Point */
/** @typedef {{ theme: Readonly<Record<string, string>>, pixel: number, hot?: boolean }} HandleStyle */

/**
 * A point you drag: a circle in the theme background with an accent ring, filled with the accent
 * under the pointer (`hot`).
 * @param {CanvasRenderingContext2D} ctx
 * @param {Point} point
 * @param {HandleStyle} style
 */
export function drawHandle(ctx, point, { theme, pixel, hot = false }) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(point.x, point.y, HANDLE_RADIUS * pixel, 0, Math.PI * 2);
  ctx.fillStyle = hot ? theme.accent : theme.handle;
  ctx.fill();
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 2 * pixel;
  ctx.stroke();
  ctx.restore();
}

/**
 * The grip that slides a door or window along its wall: a capsule along `direction`, in the
 * handle style.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Point} centre
 * @param {Point} direction the wall's direction (any length)
 * @param {HandleStyle} style
 */
export function drawCapsule(ctx, centre, direction, { theme, pixel, hot = false }) {
  const half = (CAPSULE_LENGTH - CAPSULE_WIDTH) / 2;
  ctx.save();
  ctx.translate(centre.x, centre.y);
  ctx.rotate(Math.atan2(direction.y, direction.x));
  ctx.scale(pixel, pixel);
  ctx.beginPath();
  ctx.arc(half, 0, CAPSULE_WIDTH / 2, -Math.PI / 2, Math.PI / 2);
  ctx.arc(-half, 0, CAPSULE_WIDTH / 2, Math.PI / 2, (Math.PI * 3) / 2);
  ctx.closePath();
  ctx.fillStyle = hot ? theme.accent : theme.handle;
  ctx.fill();
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

/**
 * A round grip with double arrows along each of `axes` (unit vectors): the wall grip (one axis,
 * or two for a free wall) and a column's four-way grip. Tinted with the accent under the pointer.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Point} centre
 * @param {Point[]} axes
 * @param {HandleStyle & { radius: number }} style `radius` in screen pixels
 */
export function drawGrip(ctx, centre, axes, { theme, pixel, radius, hot = false }) {
  const c = centre;
  const r = radius * pixel;
  ctx.save();
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.fillStyle = theme.handle;
  ctx.fill();
  if (hot) {
    ctx.globalAlpha = GRIP_HOT_ALPHA;
    ctx.fillStyle = theme.accent;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 2 * pixel;
  ctx.stroke();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const reach = r * 0.6;
  const head = r * 0.3;
  for (const axis of axes) {
    const side = { x: -axis.y, y: axis.x };
    ctx.beginPath();
    ctx.moveTo(c.x - axis.x * reach, c.y - axis.y * reach);
    ctx.lineTo(c.x + axis.x * reach, c.y + axis.y * reach);
    for (const sign of [-1, 1]) {
      const tip = { x: c.x + axis.x * reach * sign, y: c.y + axis.y * reach * sign };
      const back = { x: tip.x - axis.x * head * sign, y: tip.y - axis.y * head * sign };
      ctx.moveTo(back.x + side.x * head, back.y + side.y * head);
      ctx.lineTo(tip.x, tip.y);
      ctx.lineTo(back.x - side.x * head, back.y - side.y * head);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * A pinned wall's badge: an accent disc with a pin, ringed in the handle colour.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Point} point
 * @param {HandleStyle} style
 */
export function drawPinBadge(ctx, point, { theme, pixel }) {
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.scale(pixel, pixel);
  ctx.beginPath();
  ctx.arc(0, 0, PIN_BADGE_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = theme.accent;
  ctx.fill();
  ctx.strokeStyle = theme.handle;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  if (typeof Path2D === 'function') {
    const scale = PIN_ICON_SIZE / 24;
    ctx.translate(-PIN_ICON_SIZE / 2, -PIN_ICON_SIZE / 2);
    ctx.scale(scale, scale);
    ctx.lineWidth = 1.1 / scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke(new Path2D(PIN_ICON));
  }
  ctx.restore();
}

/**
 * The point a quarter along a polyline: where a pinned wall's badge sits, clear of the grip in
 * the middle and of a length's label.
 * @param {Point[]} points
 * @returns {Point | null}
 */
export function quarterAlong(points) {
  if (!Array.isArray(points) || points.length < 2) return null;
  const lengths = points
    .slice(1)
    .map((point, index) => Math.hypot(point.x - points[index].x, point.y - points[index].y));
  let rest = lengths.reduce((sum, length) => sum + length, 0) / 4;
  let index = 0;
  while (index < lengths.length - 1 && rest > lengths[index]) {
    rest -= lengths[index];
    index += 1;
  }
  const t = lengths[index] ? rest / lengths[index] : 0;
  const from = points[index];
  const to = points[index + 1];
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
}
