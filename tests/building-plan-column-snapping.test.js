import { expect, it } from 'vitest';
import { createBuildingPlanInteraction } from 'form0-core';
import { BuildingPlanCanvas } from '../src/building-plan/legacy/building-plan-canvas.js';

// A 10 m square room at 100 canvas units a metre, its right wall 20 cm thick (body x 1000..1020,
// midline 1010), and a 30 × 30 cm column C at (500, 500).
const square = (x0, y0, x1, y1) => [
  { x: x0, y: y0 },
  { x: x1, y: y0 },
  { x: x1, y: y1 },
  { x: x0, y: y1 },
];
const room = {
  id: 'a',
  vertices: square(0, 0, 1000, 1000),
  rect: { x: 0, y: 0, width: 1000, height: 1000 },
};
const right = {
  id: 'right',
  roomId: 'a',
  isBoundary: true,
  physicalWallId: 'p-right',
  points: [
    { x: 1000, y: 0 },
    { x: 1000, y: 1000 },
  ],
  axisPoints: [
    { x: 1010, y: 0 },
    { x: 1010, y: 1000 },
  ],
};
const footprints = [{ id: 'p-right', roomIds: ['a'], polygons: [square(1000, 0, 1020, 1000)] }];
const column = { id: 'c', roomId: 'a', centerU: 0.5, centerV: 0.5, width: 0.3, height: 0.3 };

function canvas({ withCore = true } = {}) {
  const view = {
    gridSize: 100,
    rooms: [room],
    walls: [right],
    wallFootprints: footprints,
    columns: [column],
  };
  const interaction = createBuildingPlanInteraction({
    scene: () => view,
    policy: () => ({ snapping: true }),
  });
  return Object.assign(Object.create(BuildingPlanCanvas.prototype), {
    rooms: [room],
    walls: [structuredClone(right)],
    wallFootprints: footprints,
    columns: [structuredClone(column)],
    beams: [],
    doors: [],
    windows: [],
    mode: 'select',
    zoomLevel: 1,
    gridSize: 100,
    controller: withCore ? { interaction, canEdit: () => true } : { canEdit: () => true },
    getCanvasPoint: (point) => point,
    render() {},
    updateButtonStates() {},
    updateCursor() {},
  });
}

const size = { roomId: 'a', columnId: 'c', width: 0.3, height: 0.3 };

it("places a column through core's snapping, flush inside, with the legacy wall fields", () => {
  const c = canvas();
  expect(c.snapColumnPoint({ x: 980, y: 250.4 }, size)).toEqual({
    point: { x: 985, y: 250 },
    wallSegmentIndex: 0,
    wallRatio: 0.25,
  });
  // Standing free: no wall.
  expect(c.snapColumnPoint({ x: 500.4, y: 500 }, size)).toEqual({
    point: { x: 500, y: 500 },
    wallSegmentIndex: -1,
    wallRatio: 0,
  });
});

it('drags a column: a click does not move it, a drag past the wall stops', () => {
  const c = canvas();
  const drag = (to) => {
    c.columnDragState = {
      columnId: 'c',
      pointerStart: { x: 500, y: 500 },
      offsetX: 0,
      offsetY: 0,
      lastCenter: { x: 500, y: 500 },
      moved: false,
    };
    delete c.columns[0].preview;
    c.handleMouseMove(to);
    return c.columns[0].preview;
  };
  expect(drag({ x: 501.5, y: 500 })).toBeUndefined();
  // Its centre may reach the face (core's rule until 4a), not past it.
  expect(drag({ x: 1300, y: 500 })).toEqual({
    centerU: 1,
    centerV: 0.5,
    wallSegmentIndex: 0,
    wallRatio: 0.5,
  });
  expect(drag({ x: 978, y: 500 })).toMatchObject({ centerU: 0.985 });
});

it('without core column snapping, as before: inside the box, the centre onto a near wall', () => {
  const c = canvas({ withCore: false });
  const placed = c.snapColumnPoint({ x: 1200, y: 400 }, size);
  expect(placed.point).toEqual({ x: 1000, y: 400 });
  expect(placed.wallSegmentIndex).toBe(0);
});
