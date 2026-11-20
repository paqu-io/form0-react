import * as core from 'form0-core';

/**
 * Free walls come from core by their centreline (`points`), with their row's face (`sidePoints`),
 * since 4a-3 (2026-11-20). The face as the wall stands at `points` (dragged or previewed), at the
 * side and distance core gives; a wall given by its face, or an older core, returns `points`.
 * @param {{ points?: object[], sidePoints?: object[] }} wall a canvas wall
 * @param {Array<{ x: number, y: number }>} points the wall's line as drawn now
 * @returns {Array<{ x: number, y: number }>}
 */
export function freeWallSide(wall, points) {
  if (!wall?.sidePoints?.length || typeof core.buildingPlanFreeWallSide !== 'function')
    return points;
  return core.buildingPlanFreeWallSide(wall, points);
}
