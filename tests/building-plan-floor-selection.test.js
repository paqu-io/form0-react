import assert from 'node:assert/strict';
import { it } from 'vitest';
import { BuildingPlanCanvas } from '../src/building-plan/legacy/building-plan-canvas.js';

// A Floor canvas edits rooms only (2026-11-22): a press on anything inside a room selects the
// room, on a Floor canvas and on the plan page; a canvas scoped to a room selects as before.
const FLOOR = { canMove: false, canMoveRoom: true, canMoveStructural: false, canResize: false };
const PAGE = { canMove: false, canMoveRoom: false, canMoveStructural: false, canResize: false };

function canvas(caps, hits, scope = { floorId: 'F1', roomId: null }) {
  return Object.assign(Object.create(BuildingPlanCanvas.prototype), {
    mode: 'select',
    readOnly: false,
    rooms: [{ id: 'R1', rect: { x: 0, y: 0, width: 500, height: 300 } }],
    walls: [],
    doors: [],
    windows: [],
    columns: [],
    beams: [],
    selectedDoorId: 'D9',
    selectedWallId: 'W9',
    controller: { toolbarState: caps, scope },
    getCanvasPoint: (point) => point,
    cornerAt: () => null,
    findRoomHandle: () => null,
    findWallHandle: () => null,
    findWallGrip: () => null,
    findColumnHit: () => hits.column || null,
    findBeamHandle: () => null,
    findBeamHit: () => hits.beam || null,
    findOpeningHandle: () => null,
    findOpeningNearPoint: () => hits.opening || null,
    findWallNearPoint: () => hits.wall || null,
    findRoomAtPoint: () => hits.room || null,
    updateButtonStates() {},
    updateCursor() {},
    setHoverState() {},
    render() {},
  });
}

it('a press inside a room on a Floor canvas or the plan page selects the room', async () => {
  const room = { id: 'R1', rect: { x: 0, y: 0, width: 500, height: 300 } };
  for (const caps of [FLOOR, PAGE])
    for (const hits of [
      { wall: { wall: { id: 'W1', roomId: 'R1' } }, room },
      { column: { column: { id: 'C1', roomId: 'R1' } } },
      { beam: { beam: { id: 'B1', roomId: 'R1' } } },
      { opening: { type: 'door', openingId: 'D1', geometry: { wall: { roomId: 'R1' } } } },
    ]) {
      const c = canvas(caps, hits);
      await c.handleMouseDown({ x: 10, y: 10, button: 0 });
      assert.equal(c.selectedRoomId, 'R1', JSON.stringify(hits));
      assert.equal(c.selectedDoorId, null);
      assert.equal(c.selectedWallId, null);
    }
  // The plan page can't move rooms; a press on one selects it too.
  const page = canvas(PAGE, { room });
  await page.handleMouseDown({ x: 10, y: 10, button: 0 });
  assert.equal(page.selectedRoomId, 'R1');
});

it('a canvas scoped to a room selects as before', async () => {
  const c = canvas(
    PAGE,
    { room: { id: 'R1', rect: { x: 0, y: 0, width: 1, height: 1 } } },
    {
      floorId: 'F1',
      roomId: 'R1',
    }
  );
  await c.handleMouseDown({ x: 10, y: 10, button: 0 });
  assert.notEqual(c.selectedRoomId, 'R1');
});
