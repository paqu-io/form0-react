import { expect, it } from 'vitest';
import { createBuildingPlanInteraction } from 'form0-core';
import { BuildingPlanCanvas } from '../src/building-plan/legacy/building-plan-canvas.js';

// A 10 m square room at 100 canvas units a metre, with a free wall W drawn in it.
const square = (x, y, size) => [
  { x, y },
  { x: x + size, y },
  { x: x + size, y: y + size },
  { x, y: y + size },
];
const room = {
  id: 'a',
  vertices: square(0, 0, 1000),
  rect: { x: 0, y: 0, width: 1000, height: 1000 },
};
const wall = {
  id: 'w',
  roomId: 'a',
  isBoundary: false,
  physicalWallId: 'pw',
  points: [
    { x: 100, y: 500 },
    { x: 300, y: 500 },
  ],
};

function canvas() {
  const view = { gridSize: 100, rooms: [room], walls: [wall], wallFootprints: [], columns: [] };
  const interaction = createBuildingPlanInteraction({
    scene: () => view,
    policy: () => ({ snapping: true }),
  });
  return Object.assign(Object.create(BuildingPlanCanvas.prototype), {
    rooms: [room],
    walls: [structuredClone(wall)],
    mode: 'select',
    zoomLevel: 1,
    gridSize: 100,
    controller: { interaction, walls: new Map([['w', wall]]), canEdit: () => true },
    getCanvasPoint: (point) => point,
    render() {},
    updateButtonStates() {},
    updateCursor() {},
  });
}

it("draws a free wall's end through core's snapping: locked, and inside its room", () => {
  const c = canvas();
  const from = { x: 100, y: 500 };
  expect(c.snapFreeWallPoint({ x: 600.4, y: 506 }, room, { from })).toEqual({ x: 600, y: 500 });
  expect(c.snapFreeWallPoint({ x: 1400, y: 500 }, room, { from })).toEqual({ x: 1000, y: 500 });
  // Alt: no lock, still the 1 cm step and the room.
  c.lastPointerEvent = { altKey: true };
  expect(c.snapFreeWallPoint({ x: 600.4, y: 506 }, room, { from })).toEqual({ x: 600, y: 506 });
});

it('moves a whole free wall through the same snapping: it meets the face, it stays in', () => {
  const c = canvas();
  const drag = (to) => {
    c.wallDragState = {
      type: 'move',
      wallId: 'w',
      pointerStart: { x: 200, y: 500 },
      originalPoints: structuredClone(wall.points),
      moved: false,
    };
    c.handleMouseMove(to);
    return c.wallDragState.previewPoints;
  };
  // Its right end 4 short of the room's right face: it meets it.
  expect(drag({ x: 896, y: 500 })).toEqual([
    { x: 800, y: 500 },
    { x: 1000, y: 500 },
  ]);
  // Past it: it stops at the face.
  const out = drag({ x: 1200, y: 500 });
  expect(out[1].x).toBeCloseTo(1000, 3);
  expect(out[1].x - out[0].x).toBeCloseTo(200, 6);
});
