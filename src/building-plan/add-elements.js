import * as core from 'form0-core';
import { currentMark } from './insertion-mark.js';
import { columnWallValues } from './column-placement.js';

/**
 * "Add door", "Add window" and "Add column" (3b of the building plan UI round, 2026-11-20):
 * select where it goes, then add it. Core works out where (`placeBuildingPlanOpening`,
 * `placeBuildingPlanColumn`: at the insertion mark, else a default place, moved to the nearest
 * place that fits); the canvas creates it and selects it.
 */

/** What each kind needs selected before it can be added, and the hint saying so. */
export const ADD_NEEDS = Object.freeze({
  door: { collection: 'walls', hintKey: 'plan.add.doorNeedsWall' },
  window: { collection: 'walls', hintKey: 'plan.add.windowNeedsWall' },
});

/**
 * The commands waiting for a selection, by toolbar id, each with the hint saying what to select.
 * @param {string | null} selectedCollection the collection of the element selected on the canvas
 * @returns {Record<string, string>}
 */
export function waitingCommands(selectedCollection) {
  return Object.fromEntries(
    Object.entries(ADD_NEEDS)
      .filter(([, need]) => need.collection !== selectedCollection)
      .map(([kind, need]) => [kind, need.hintKey])
  );
}

const NO_ROOM = Object.freeze({
  door: 'plan.add.noRoomDoor',
  window: 'plan.add.noRoomWindow',
  column: 'plan.add.noRoomColumn',
});

/** The selected wall when it belongs to the room in scope, else null. */
function selectedWall(plan, roomId) {
  const wall = (plan.walls || []).find((entry) => entry.id === plan.selectedWallId);
  return wall && wall.roomId === roomId ? wall : null;
}

/**
 * Adds a door, window or column where the selection and the insertion mark say.
 * @param {object} plan the legacy canvas
 * @param {'door' | 'window' | 'column'} kind
 * @param {{ door: object, window: object, column: object }} sizes metres: door and window
 *   `{ width, height }` (a window also `sill`); column `{ width, height, vertical }`
 * @returns {Promise<{ status: 'added', id: string } | { status: 'needs', hintKey: string }
 *   | { status: 'refused', messageKey: string } | { status: 'unavailable' }>}
 */
export async function addPlanElement(plan, kind, sizes) {
  const controller = plan.controller;
  const roomId = controller?.scope?.roomId;
  if (!roomId || plan.readOnly || !controller?.getSnapshot) return { status: 'unavailable' };
  const view = { ...controller.getSnapshot(), gridSize: plan.gridSize };
  const mark = currentMark(plan);
  const wall = selectedWall(plan, roomId);
  if (kind === 'column') {
    if (typeof core.placeBuildingPlanColumn !== 'function') return { status: 'unavailable' };
    const size = sizes.column;
    // A wall selected without a mark (from the Walls list): against the middle of it.
    const points = wall ? plan.getRenderedWallPoints(wall) || [] : [];
    const middle =
      points.length > 1
        ? { x: (points[0].x + points.at(-1).x) / 2, y: (points[0].y + points.at(-1).y) / 2 }
        : null;
    const centre = core.placeBuildingPlanColumn(view, {
      roomId,
      wallId: wall ? wall.id : null,
      mark: (wall && mark?.kind !== 'wall' ? middle : mark?.point) || null,
      width: size.width,
      height: size.height,
      zoom: plan.zoomLevel,
    });
    if (!centre) return { status: 'refused', messageKey: NO_ROOM.column };
    const rect = plan.getRoomRect(roomId);
    const created = await controller.createColumn?.(roomId, {
      centerU: (centre.x - rect.x) / rect.width,
      centerV: (centre.y - rect.y) / rect.height,
      ...columnWallValues(plan, centre, { roomId, width: size.width, height: size.height }),
      width: size.width,
      height: size.height,
      vertical: size.vertical,
    });
    return created ? { status: 'added', id: created.id } : { status: 'unavailable' };
  }
  if (!wall) return { status: 'needs', hintKey: ADD_NEEDS[kind].hintKey };
  if (typeof core.placeBuildingPlanOpening !== 'function') return { status: 'unavailable' };
  const size = sizes[kind];
  const placed = core.placeBuildingPlanOpening(view, {
    wallId: wall.id,
    width: size.width,
    mark: mark?.kind === 'wall' && mark.wallId === wall.id ? mark.point : null,
  });
  if (!placed) return { status: 'refused', messageKey: NO_ROOM[kind] };
  const options = {
    segmentIndex: placed.segmentIndex,
    startRatio: placed.startRatio,
    endRatio: placed.endRatio,
    width: placed.width,
    height: size.height,
    ...(kind === 'window' ? { distanceFromFloor: size.sill } : {}),
  };
  const created = await (kind === 'door'
    ? controller.createDoor?.(wall.id, options)
    : controller.createWindow?.(wall.id, options));
  return created ? { status: 'added', id: created.id } : { status: 'unavailable' };
}
