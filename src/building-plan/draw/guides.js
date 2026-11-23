import { COLUMN_GRIP_RADIUS, WALL_GRIP_RADIUS } from './handles.js';

/**
 * The pulls' guides (moved from the legacy canvas, 2026-11-23): dashed lines from what a pull
 * lined up with; a ring on a point of the floor below that a pull took (F3, U7). A pull that
 * places the whole element over the floor below (U6: a column over a column below, a wall
 * stacked on a wall below) names the grip it goes around (`grip`): its ring stands just outside
 * that grip, which would hide a small one. Sizes are screen pixels; `pixel` is one in canvas units.
 */

/** A ring on a point below: a 10 px circle. */
const RING_RADIUS = 5;
// How far outside a grip its ring stands.
const RING_GAP = 4;
const GRIPS = { wall: WALL_GRIP_RADIUS, column: COLUMN_GRIP_RADIUS };

/**
 * A guide's ring radius in screen pixels: around its grip, else a small ring.
 * @param {{ grip?: 'wall' | 'column' }} guide
 */
export function ringRadius(guide) {
  return GRIPS[guide.grip] ? GRIPS[guide.grip] + RING_GAP : RING_RADIUS;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{ from: object, to: object, below?: boolean, grip?: string }>} guides
 * @param {{ theme: Readonly<Record<string, string>>, pixel: number }} style
 */
export function drawGuides(ctx, guides, { theme, pixel }) {
  if (!guides.length) return;
  ctx.save();
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 1.5 * pixel;
  ctx.setLineDash([5 * pixel, 4 * pixel]);
  for (const guide of guides) {
    ctx.beginPath();
    ctx.moveTo(guide.from.x, guide.from.y);
    ctx.lineTo(guide.to.x, guide.to.y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  for (const guide of guides.filter((entry) => entry.below)) {
    ctx.beginPath();
    ctx.arc(guide.from.x, guide.from.y, ringRadius(guide) * pixel, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}
