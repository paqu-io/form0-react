import assert from 'node:assert/strict';
import { it } from 'vitest';
import { doubleClickTarget, isElsewhere, nextEntryStep } from '../src/building-plan/entry-chain.js';
import { BuildingPlanCanvas } from '../src/building-plan/legacy/building-plan-canvas.js';

// Opening entries by double-click (decided 2026-11-22).
const door = [
  { key: 'floors', index: 0 },
  { key: 'rooms', index: 1 },
  { key: 'walls', index: 2 },
  { key: 'doors', index: 0 },
];

it('a Floor canvas and the plan page open rooms only; a Room canvas opens the element', () => {
  assert.deepEqual(doubleClickTarget(door, 'floor-modal'), door.slice(0, 2));
  assert.deepEqual(doubleClickTarget(door, 'parent'), door.slice(0, 2));
  assert.deepEqual(doubleClickTarget(door.slice(0, 2), 'floor-modal'), door.slice(0, 2));
  assert.deepEqual(doubleClickTarget(door, 'room-modal'), door);
});

it('the next row on the way from an entry is one level below it', () => {
  const room = [
    { repeatableKey: 'floors', instanceId: 'F' },
    { key: 'rooms', id: 'R' },
  ];
  const target = [
    { key: 'floors', id: 'F' },
    { key: 'rooms', id: 'R' },
    { key: 'walls', id: 'W' },
    { key: 'doors', id: 'D' },
  ];
  assert.deepEqual(nextEntryStep(room, target), {
    next: { key: 'walls', id: 'W' },
    depth: 2,
    more: true,
  });
  assert.deepEqual(nextEntryStep(room, target.slice(0, 3)), {
    next: { key: 'walls', id: 'W' },
    depth: 2,
    more: false,
  });
  assert.equal(nextEntryStep(room, target.slice(0, 2)), null, 'the entry itself');
  const otherRoom = [target[0], { key: 'rooms', id: 'R2' }, { key: 'walls', id: 'W' }];
  assert.equal(nextEntryStep(room, otherRoom), null, 'a row of another room');
});

// On a Floor canvas columns, beams and handles can't be dragged, and on the plan page nothing can
// move; a double-click still opens them (their room, once the host cuts the path).
function floorCanvas(hits) {
  const opened = [];
  const canvas = Object.assign(Object.create(BuildingPlanCanvas.prototype), {
    mode: 'select',
    readOnly: false,
    rooms: [],
    walls: [],
    controller: {
      toolbarState: {
        canMove: false,
        canMoveRoom: false,
        canMoveStructural: false,
        canResize: false,
      },
      focusColumn: (id) => opened.push(['column', id]),
      focusBeam: (id) => opened.push(['beam', id]),
      focusRoom: (id) => opened.push(['room', id]),
      focusWall: (id) => opened.push(['wall', id]),
      focusDoor: (id) => opened.push(['door', id]),
    },
    getCanvasPoint: (point) => point,
    cornerAt: () => null,
    findRoomHandle: () => hits.roomHandle || null,
    findWallHandle: () => hits.wallHandle || null,
    findWallGrip: () => null,
    findColumnHit: () => hits.column || null,
    findBeamHandle: () => hits.beamHandle || null,
    findBeamHit: () => hits.beam || null,
    findOpeningHandle: () => null,
    findOpeningNearPoint: () => hits.opening || null,
    render() {},
  });
  return { canvas, opened };
}

it('a press on a Floor canvas or the plan page records what a double-click opens, even what it cannot drag', async () => {
  for (const [hits, expected] of [
    [{ column: { column: { id: 'C1' } } }, ['column', 'C1']],
    [{ beamHandle: { beam: { id: 'B1' }, handle: 'start' } }, ['beam', 'B1']],
    [{ beam: { beam: { id: 'B2' } } }, ['beam', 'B2']],
    [{ roomHandle: { room: { id: 'R1' }, handle: 'e' } }, ['room', 'R1']],
    [{ wallHandle: { wall: { id: 'W1' }, index: 0 } }, ['wall', 'W1']],
    [{ opening: { type: 'door', openingId: 'D1', geometry: {} } }, ['door', 'D1']],
  ]) {
    const { canvas, opened } = floorCanvas(hits);
    await canvas.handleMouseDown({ x: 10, y: 10, button: 0 });
    canvas.pendingFocus?.();
    assert.deepEqual(opened, [expected]);
  }
});

it('a press on a locked canvas (a view-only entry, a read-only record) records the door it hits', async () => {
  const opened = [];
  const canvas = Object.assign(Object.create(BuildingPlanCanvas.prototype), {
    readOnly: true,
    controller: {
      focusDoor: (id) => opened.push(['door', id]),
      focusWindow: (id) => opened.push(['window', id]),
    },
    getCanvasPoint: (point) => point,
    findOpeningNearPoint: () => ({ type: 'door', openingId: 'D1', geometry: {} }),
    findColumnHit: () => null,
    findBeamHit: () => null,
    findWallNearPoint: () => null,
    findRoomAtPoint: () => null,
  });
  await canvas.handleMouseDown({ x: 10, y: 10, button: 0 });
  canvas.pendingFocus?.();
  assert.deepEqual(opened, [['door', 'D1']]);
});

// A double-click on what the entry can't open says where it opens (decided 2026-11-26): outside
// the entry's reach is neither the entry, a parent of it, nor below it.
it("tells a row outside an entry's reach from the entry, its parents and its rows", () => {
  const floor = { key: 'floors', id: 'F' };
  const room = { key: 'rooms', id: 'R1' };
  const wall = [floor, room, { repeatableKey: 'walls', instanceId: 'W1' }];
  const own = [floor, room, { key: 'walls', id: 'W1' }];
  assert.equal(isElsewhere(wall, own), false, 'the entry');
  assert.equal(isElsewhere(wall, [floor, room]), false, 'its room');
  assert.equal(isElsewhere(wall, [...own, { key: 'doors', id: 'D1' }]), false, 'its door');
  assert.equal(isElsewhere(wall, [floor, room, { key: 'columns', id: 'C1' }]), true, 'a column');
  assert.equal(
    isElsewhere(wall, [floor, room, { key: 'walls', id: 'W3' }, { key: 'doors', id: 'D2' }]),
    true,
    "another wall's door"
  );
  assert.equal(isElsewhere(wall, [floor, { key: 'rooms', id: 'R2' }]), true, 'another room');
});
