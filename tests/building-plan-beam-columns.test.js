import { expect, it } from 'vitest';
import { BuildingPlanCanvas } from '../src/building-plan/legacy/building-plan-canvas.js';

// A 10 m room at 100 canvas units a metre; column C (30 cm) at (500, 500) under the end of beam B,
// which runs from (200, 500) to (500, 500). Positions as the canvas last drew them.
function canvas() {
  const room = {
    id: 'a',
    vertices: [
      { x: 0, y: 0 },
      { x: 1000, y: 0 },
      { x: 1000, y: 1000 },
      { x: 0, y: 1000 },
    ],
    rect: { x: 0, y: 0, width: 1000, height: 1000 },
  };
  return Object.assign(Object.create(BuildingPlanCanvas.prototype), {
    rooms: [room],
    walls: [],
    wallFootprints: [],
    columns: [
      {
        id: 'c',
        roomId: 'a',
        centerU: 0.5,
        centerV: 0.5,
        width: 0.3,
        height: 0.3,
        _renderRect: { x: 485, y: 485, width: 30, height: 30 },
      },
    ],
    beams: [
      {
        id: 'b',
        roomId: 'a',
        width: 0.15,
        _renderStart: { x: 200, y: 500 },
        _renderEnd: { x: 500, y: 500 },
      },
    ],
    doors: [],
    windows: [],
    mode: 'select',
    zoomLevel: 1,
    gridSize: 100,
    controller: { canEdit: () => true },
  });
}

it("a press on a beam's end resting on a column: the column, unless the beam is selected", () => {
  const c = canvas();
  expect(c.hoverAt({ x: 500, y: 500 })).toMatchObject({ type: 'column', columnId: 'c' });
  c.selectedBeamId = 'b';
  expect(c.hoverAt({ x: 500, y: 500 })).toMatchObject({
    type: 'beam-handle',
    beamId: 'b',
    handle: 'end',
  });
  // Off its end, the column as before.
  expect(c.hoverAt({ x: 510, y: 512 })).toMatchObject({ type: 'column', columnId: 'c' });
});
