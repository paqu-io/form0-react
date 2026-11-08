import assert from 'node:assert/strict';
import { expect, it } from 'vitest';
import { BuildingPlanCanvas } from '../src/building-plan/legacy/building-plan-canvas.js';

for (const type of ['move', 'resize'])
  it(`continues a ${type} after the preview replaces its facing row without mutating accepted geometry`, async () => {
    const accepted = {
      id: 'original',
      roomId: 'room',
      isBoundary: true,
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
    };
    let submitted;
    const c = Object.assign(Object.create(BuildingPlanCanvas.prototype), {
      mode: 'select',
      gridSize: 20,
      zoomLevel: 1,
      walls: [structuredClone(accepted)],
      rooms: [{ id: 'room', rect: { x: 0, y: 0, width: 200, height: 200 } }],
      controller: {
        walls: new Map([[accepted.id, accepted]]),
        canEdit: () => true,
        interaction: {
          snapWallTranslation: (points) => points,
          snapTranslation: (points) => points,
        },
        updateWall: async (_id, points) => {
          submitted = points;
          return null;
        },
      },
      getCanvasPoint: (point) => point,
      render() {},
      updateCursor() {},
      updateButtonStates() {},
      lastPointerEvent: { altKey: true },
      wallDragState: {
        type,
        wallId: accepted.id,
        originalPoints: structuredClone(accepted.points),
        pointerStart: { x: 100, y: 0 },
        handleIndex: 1,
        moved: false,
      },
    });
    c.handleMouseMove({ x: 100, y: 20 });
    c.walls = [{ ...structuredClone(accepted), id: 'replacement-facing-row' }];
    c.handleMouseMove({ x: 100, y: 40 });
    assert.equal(c.wallDragState.previewPoints[0].y, 40);
    assert.equal(accepted.previewPoints, undefined);
    assert.deepEqual(accepted.points, [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ]);
    await c.handleMouseUp({ x: 100, y: 40 });
    assert.equal(submitted[0].y, 40);
    assert.equal(c.wallDragState, null);
  });

function canvas() {
  return Object.assign(Object.create(BuildingPlanCanvas.prototype), {
    rooms: [],
    selectedRoomId: 'b',
    zoomLevel: 1,
    gridSize: 20,
    walls: [
      {
        id: 'wa',
        roomId: 'a',
        isDimmed: true,
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
        ],
      },
      {
        id: 'wb',
        roomId: 'b',
        isDimmed: false,
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
        ],
        axisPoints: [
          { x: 0, y: 2 },
          { x: 100, y: 2 },
        ],
      },
    ],
  });
}
it('room-scoped selection excludes the other side of a coincident wall', () => {
  expect(canvas().findWallNearPoint({ x: 50, y: 0 }).wall.id).toBe('wb');
});
it('shared opening rendering uses one active projection and the physical axis', () => {
  const c = canvas();
  c.doors = [
    { id: 'da', subjectId: 'shared', roomId: 'a', wallId: 'wa', isDimmed: true },
    {
      id: 'db',
      subjectId: 'shared',
      roomId: 'b',
      wallId: 'wb',
      physical: { thickness: 0.2 },
      startRatio: 0.2,
      endRatio: 0.4,
    },
  ];
  c.windows = [];
  const drawn = [];
  c.drawOpening = (opening) => drawn.push(opening.id);
  c.drawOpenings();
  expect(drawn).toEqual(['db']);
  expect(c.getOpeningGeometry(c.doors[1]).startPoint).toEqual({ x: 20, y: 2 });
});
it('thick wall material remains selectable away from its thin facing line', () => {
  const c = canvas();
  c.walls[1].physicalWallId = 'physical';
  c.wallFootprints = [
    {
      id: 'physical',
      polygons: [
        [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 20 },
          { x: 0, y: 20 },
        ],
      ],
    },
  ];
  expect(c.findWallNearPoint({ x: 50, y: 10 }).wall.id).toBe('wb');
});

it('wall previews stay in the view and pointer release ends the gesture before a managed decision', async () => {
  const c = Object.create(BuildingPlanCanvas.prototype);
  c.walls = [
    {
      id: 'a',
      roomId: 'room-a',
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
    },
  ];
  c.controller = {};
  c.mode = 'select';
  c.gridSize = 20;
  c.rooms = [{ id: 'room-a', rect: { x: 0, y: 0, width: 200, height: 100 } }];
  const accepted = structuredClone(c.walls[0]);
  c.controller.walls = new Map([['a', accepted]]);
  c.controller.canEdit = () => true;
  c.controller.interaction = { snapWallTranslation: (points) => points };
  c.wallDragState = {
    type: 'move',
    wallId: 'a',
    pointerStart: { x: 0, y: 0 },
    originalPoints: structuredClone(accepted.points),
    moved: false,
  };
  c.getCanvasPoint = (point) => point;
  c.render = c.updateButtonStates = c.updateCursor = () => {};
  c.handleMouseMove({ x: 40, y: 0 });
  assert.equal(
    accepted.previewPoints,
    undefined,
    'The controller scene is immutable to UI gestures'
  );
  let finish;
  c.controller.updateWall = () =>
    new Promise((resolve) => {
      finish = resolve;
    });
  const completed = c.handleMouseUp({ x: 40, y: 0 });
  assert.equal(c.wallDragState, null, 'A pending question must not keep a released gesture alive');
  c.walls = [structuredClone(accepted)]; // A managed reply replaces the projected objects.
  finish(null);
  await completed;
  assert.equal(c.walls[0].previewPoints, undefined);
  assert.deepEqual(accepted.points, [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
  ]);
});
