import * as core from 'form0-core';

/**
 * A dragged door or window stays clear of columns (3b of the building plan UI round,
 * 2026-11-20): it moves and resizes within the stretch of its wall face that holds it, between
 * the columns standing against the wall or in it (core's `buildingPlanOpeningStretches`, columns
 * only: core itself refuses an opening dropped on another, and says why).
 */

const EPS = 1e-9;

/**
 * The stretch of the face's segment, between columns, that holds the opening's middle; null when
 * there is none (an older core, or the opening already over a column).
 * @param {object} plan the legacy canvas
 * @param {object} wall the face
 * @param {number} segmentIndex
 * @param {number} startRatio the opening before the drag
 * @param {number} endRatio
 * @returns {[number, number] | null}
 */
export function columnStretch(plan, wall, segmentIndex, startRatio, endRatio) {
  if (typeof core.buildingPlanOpeningStretches !== 'function' || !plan.controller?.getSnapshot)
    return null;
  const found = core.buildingPlanOpeningStretches(
    { ...plan.controller.getSnapshot(), gridSize: plan.gridSize },
    { wallId: wall.id, segmentIndex, openings: false }
  );
  const middle = (startRatio + endRatio) / 2;
  return found?.stretches.find(([a, b]) => middle >= a - EPS && middle <= b + EPS) || null;
}

/**
 * An opening's ratios after the 1 cm step, moved back inside `stretch` by whole steps when the
 * rounding took it past a column: both ends together for a move, the end past it for a resize.
 * @param {{ startRatio: number, endRatio: number }} snapped
 * @param {[number, number] | null} stretch
 * @param {{ interval?: [number, number] } | undefined} binding the segment's portion of the
 *   physical wall, for the step's size in ratios
 * @param {boolean} keepWidth a move
 */
export function keepInStretch(snapped, stretch, binding, keepWidth) {
  if (!stretch) return snapped;
  const [from, to] = binding?.interval || [];
  const step = to - from > 0 ? 0.01 / (to - from) : 0;
  let { startRatio, endRatio } = snapped;
  for (let i = 0; i < 3 && step && startRatio < stretch[0] - EPS; i += 1) {
    startRatio += step;
    if (keepWidth) endRatio += step;
  }
  for (let i = 0; i < 3 && step && endRatio > stretch[1] + EPS; i += 1) {
    endRatio -= step;
    if (keepWidth) startRatio -= step;
  }
  return { ...snapped, startRatio, endRatio };
}
