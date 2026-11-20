import { expect, it, vi } from 'vitest';
import { BuildingPlanCanvas } from '../src/building-plan/legacy/building-plan-canvas.js';
import { markFromClick } from '../src/building-plan/insertion-mark.js';
import { waitingCommands } from '../src/building-plan/add-elements.js';
import { keepInStretch } from '../src/building-plan/opening-clear.js';

// A room entry on room A (0..1000 square at 100 canvas units a metre, 20 cm walls outside it).
// Its bottom face runs from (1000, 1000) to (0, 1000), 10 m along its physical wall, with a door
// from x 490 to 400 (ratios 0.51 to 0.6); a short wall S is 1 m long.
const box = (x0, y0, x1, y1) => [
  { x: x0, y: y0 },
  { x: x1, y: y0 },
  { x: x1, y: y1 },
  { x: x0, y: y1 },
];
const room = {
  id: 'a',
  vertices: box(0, 0, 1000, 1000),
  rect: { x: 0, y: 0, width: 1000, height: 1000 },
};
const face = (id, points, length = 10) => ({
  id,
  roomId: 'a',
  isBoundary: true,
  physicalWallId: `p-${id}`,
  points,
  bindings: [{ interval: [0, length], direction: 1 }],
  thickness: 0.2,
});
const walls = [
  face('bottom', [
    { x: 1000, y: 1000 },
    { x: 0, y: 1000 },
  ]),
  face(
    'short',
    [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ],
    1
  ),
];
const view = {
  rooms: [room],
  walls,
  wallFootprints: [
    { id: 'p-bottom', roomIds: ['a'], polygons: [box(0, 1000, 1000, 1020)] },
    { id: 'p-short', roomIds: ['a'], polygons: [box(0, -20, 100, 0)] },
  ],
  physicalOpenings: [
    {
      id: 'door',
      wallId: 'p-bottom',
      thickness: 0.2,
      points: [
        { x: 490, y: 1010 },
        { x: 400, y: 1010 },
      ],
      polygon: box(400, 1000, 490, 1020),
    },
  ],
  columns: [],
};

function canvas() {
  const controller = {
    scope: { roomId: 'a' },
    getSnapshot: () => structuredClone(view),
    createDoor: vi.fn(async () => ({ id: 'new-door' })),
    createWindow: vi.fn(async () => ({ id: 'new-window' })),
    createColumn: vi.fn(async () => ({ id: 'new-column' })),
    canEdit: () => true,
  };
  return Object.assign(Object.create(BuildingPlanCanvas.prototype), {
    rooms: [room],
    walls: structuredClone(walls),
    wallFootprints: view.wallFootprints,
    columns: [],
    beams: [],
    doors: [],
    windows: [],
    mode: 'select',
    zoomLevel: 1,
    gridSize: 100,
    controller,
    reportsStatus: true,
    onStatus: vi.fn(),
    receiveIssues: vi.fn(),
    render() {},
    updateButtonStates() {},
    updateCursor() {},
  });
}

it('a click leaves the insertion mark: on the selected wall, else in the room', () => {
  const c = canvas();
  c.selectedWallId = 'bottom';
  expect(markFromClick(c, { x: 450.4, y: 1008 })).toEqual({
    kind: 'wall',
    wallId: 'bottom',
    roomId: 'a',
    point: { x: 450, y: 1000 },
  });
  c.selectedWallId = null;
  expect(markFromClick(c, { x: 300.4, y: 299.6 })).toEqual({
    kind: 'room',
    roomId: 'a',
    point: { x: 300, y: 300 },
  });
  // A column took the click; not a room entry; outside the room.
  c.selectedColumnId = 'c';
  expect(markFromClick(c, { x: 300, y: 300 })).toBeNull();
  c.selectedColumnId = null;
  expect(markFromClick(c, { x: 1300, y: 300 })).toBeNull();
  c.controller.scope = { floorId: 'f' };
  expect(markFromClick(c, { x: 300, y: 300 })).toBeNull();
});

it('"Add door" without a wall says what to select; with one, adds at the mark', async () => {
  const c = canvas();
  await c.addElement('door');
  expect(c.onStatus).toHaveBeenLastCalledWith('plan.add.doorNeedsWall');
  expect(c.controller.createDoor).not.toHaveBeenCalled();
  // On the existing door: it goes beside it, and becomes the selection.
  c.selectedWallId = 'bottom';
  c.insertionMark = markFromClick(c, { x: 450, y: 1000 });
  await c.addElement('door');
  const [wallId, options] = c.controller.createDoor.mock.calls[0];
  expect(wallId).toBe('bottom');
  expect(options).toMatchObject({ segmentIndex: 0, width: 0.9, height: 2 });
  expect(options.startRatio).toBeCloseTo(0.42, 9);
  expect(options.endRatio).toBeCloseTo(0.51, 9);
  expect(c.selectedDoorId).toBe('new-door');
  expect(c.selectedWallId).toBe('bottom');
  expect(c.insertionMark).toBeNull();
});

it('"Add window" where none fits: a refusal, nothing added', async () => {
  const c = canvas();
  c.selectedWallId = 'short';
  await c.addElement('window');
  expect(c.controller.createWindow).not.toHaveBeenCalled();
  expect(c.receiveIssues).toHaveBeenCalledWith([
    { code: 'no_room_to_add', message: 'No room for a window on this wall' },
  ]);
});

it('"Add column": at the room centre, at a room mark, flush against a selected wall', async () => {
  const c = canvas();
  await c.addElement('column');
  expect(c.controller.createColumn.mock.calls[0][1]).toMatchObject({
    centerU: 0.5,
    centerV: 0.5,
    wallSegmentIndex: -1,
    width: 0.3,
    height: 0.3,
  });
  expect(c.selectedColumnId).toBe('new-column');
  c.selectedColumnId = null;
  c.selectedWallId = 'bottom';
  c.insertionMark = markFromClick(c, { x: 200, y: 1004 });
  await c.addElement('column');
  const added = c.controller.createColumn.mock.calls[1][1];
  expect(added.centerU).toBeCloseTo(0.2, 9);
  expect(added.centerV).toBeCloseTo(0.985, 9);
  expect(added.wallSegmentIndex).toBe(0);
});

it('the commands waiting for a selection, with their hints', () => {
  expect(waitingCommands(null)).toEqual({
    door: 'plan.add.doorNeedsWall',
    window: 'plan.add.windowNeedsWall',
  });
  expect(waitingCommands('walls')).toEqual({});
});

it('a dragged opening rounded past a column goes back by whole steps', () => {
  const binding = { interval: [0, 10] };
  const moved = keepInStretch({ startRatio: 0.0996, endRatio: 0.1896 }, [0.1, 0.5], binding, true);
  expect(moved.startRatio).toBeCloseTo(0.1006, 9);
  expect(moved.endRatio).toBeCloseTo(0.1906, 9);
  const resized = keepInStretch({ startRatio: 0.2, endRatio: 0.5004 }, [0.1, 0.5], binding, false);
  expect(resized).toMatchObject({ startRatio: 0.2 });
  expect(resized.endRatio).toBeCloseTo(0.4994, 9);
});
