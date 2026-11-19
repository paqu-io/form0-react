/**
 * Doors and windows on a 1 cm step (after the V1 hand test, 2026-11-19): a dragged, resized or
 * placed opening keeps its distance from the wall start and its width in whole centimetres. The
 * canvas works in ratios along a room side's portion of a wall (its `binding`); the stored values
 * are metres along the physical wall, so the step is taken there and turned back into ratios.
 */

export const OPENING_STEP_M = 0.01;

/**
 * @param {{ interval: [number, number], direction: number } | null | undefined} binding the room
 *   side's portion of the physical wall: from and to (m along the wall), and its direction
 * @param {number} startRatio
 * @param {number} endRatio
 * @param {{ keepWidth?: boolean, step?: number }} [options] `keepWidth`: a move (the width stays,
 *   rounded); otherwise each end goes to the step (a resize, a placement)
 * @returns {{ startRatio: number, endRatio: number, width: number | null }} `width` in metres,
 *   null without a binding (the ratios are then returned as they are)
 */
export function snapOpeningRatios(
  binding,
  startRatio,
  endRatio,
  { keepWidth = false, step = OPENING_STEP_M } = {}
) {
  const [from, to] = binding?.interval || [];
  const span = to - from;
  if (!(span > 0)) return { startRatio, endRatio, width: null };
  const forward = binding.direction > 0;
  const round = (value) => Math.round(value / step) * step;
  // The opening's ends in metres along the physical wall.
  let start = forward ? from + startRatio * span : to - endRatio * span;
  let end = forward ? from + endRatio * span : to - startRatio * span;
  if (keepWidth) {
    const width = Math.min(span, Math.max(step, round(end - start)));
    start = Math.min(Math.max(round(start), from), to - width);
    end = start + width;
  } else {
    start = Math.max(round(start), from);
    end = Math.min(round(end), to);
    if (end - start < step) end = Math.min(start + step, to);
  }
  const ratio = (value) => Math.min(Math.max(value / span, 0), 1);
  return {
    startRatio: ratio(forward ? start - from : to - end),
    endRatio: ratio(forward ? end - from : to - start),
    width: Math.round((end - start) * 1000) / 1000,
  };
}
