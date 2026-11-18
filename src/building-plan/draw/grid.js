/**
 * The plan's grid, magicplan style: a cross on every metre at every zoom, with finer dots when
 * they are far enough apart on screen. Crosses fade, then disappear, when zoomed far out.
 */

const DOT_STEPS_M = [0.1, 0.5];
// Dots appear only when they are this far apart on screen, so at 100% only crosses show.
const MIN_DOT_GAP_PX = 14;
const HIDE_CROSSES_BELOW_PX = 6;
const FULL_CROSSES_FROM_PX = 18;
const CROSS_ARM_PX = 3;
const DOT_SIZE_PX = 1.25;

/**
 * What the grid shows at a scale.
 * @param {number} pxPerMetre screen pixels per metre
 * @returns {{ dotStep: number | null, crossAlpha: number }} dot spacing in metres (null: none),
 *   cross opacity (0: hidden)
 */
export function gridLevels(pxPerMetre) {
  const dotStep = DOT_STEPS_M.find((step) => step * pxPerMetre >= MIN_DOT_GAP_PX) ?? null;
  const crossAlpha =
    pxPerMetre < HIDE_CROSSES_BELOW_PX
      ? 0
      : Math.min(
          1,
          (pxPerMetre - HIDE_CROSSES_BELOW_PX) / (FULL_CROSSES_FROM_PX - HIDE_CROSSES_BELOW_PX)
        );
  return { dotStep, crossAlpha };
}

const onWholeMetre = (value) => Math.abs(value - Math.round(value)) < 1e-6;

/**
 * Draws the grid in canvas units (the context already carries zoom and pan).
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ bounds: { minX: number, minY: number, maxX: number, maxY: number },
 *   metre: number, zoom: number, pixelRatio?: number, theme: { cross: string, dot: string } }}
 *   options `metre` is canvas units per metre (the grid size); crosses are one screen (device)
 *   pixel wide
 */
export function drawGrid(ctx, { bounds, metre, zoom, pixelRatio = 1, theme }) {
  if (!(metre > 0) || !(zoom > 0)) return;
  const pixel = 1 / zoom;
  const devicePixel = pixel / (pixelRatio > 0 ? pixelRatio : 1);
  const { dotStep, crossAlpha } = gridLevels(metre * zoom);
  const first = (value, step) => Math.floor(value / step) * step;

  ctx.save();
  if (dotStep) {
    const step = dotStep * metre;
    const size = DOT_SIZE_PX * pixel;
    ctx.fillStyle = theme.dot;
    for (let x = first(bounds.minX, step); x <= bounds.maxX; x += step) {
      const onCrossColumn = crossAlpha > 0 && onWholeMetre(x / metre);
      for (let y = first(bounds.minY, step); y <= bounds.maxY; y += step) {
        if (onCrossColumn && onWholeMetre(y / metre)) continue;
        ctx.fillRect(x - size / 2, y - size / 2, size, size);
      }
    }
  }
  if (crossAlpha > 0) {
    const arm = CROSS_ARM_PX * pixel;
    ctx.globalAlpha = crossAlpha;
    ctx.strokeStyle = theme.cross;
    ctx.lineWidth = devicePixel;
    ctx.beginPath();
    for (let x = first(bounds.minX, metre); x <= bounds.maxX + metre; x += metre) {
      for (let y = first(bounds.minY, metre); y <= bounds.maxY + metre; y += metre) {
        ctx.moveTo(x - arm, y);
        ctx.lineTo(x + arm, y);
        ctx.moveTo(x, y - arm);
        ctx.lineTo(x, y + arm);
      }
    }
    ctx.stroke();
  }
  ctx.restore();
}
