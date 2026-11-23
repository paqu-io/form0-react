import { expect, it } from 'vitest';
import { createBuildingPlanInteraction } from 'form0-core';
import { BuildingPlanCanvas } from '../src/building-plan/legacy/building-plan-canvas.js';
import { beamWallValues } from '../src/building-plan/beam-placement.js';

// A 10 m square room at 100 canvas units a metre (faces drawn clockwise from the top-left), a
// 30 × 30 cm column C at (500, 500) and beam B from (200, 300) to (500, 300), 25 cm wide.
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
const corners = square(0, 0, 1000, 1000);
const faces = corners.map((point, index) => ({
  id: `face-${index}`,
  roomId: 'a',
  isBoundary: true,
  physicalWallId: `p-${index}`,
  points: [point, corners[(index + 1) % 4]],
}));
const column = { id: 'c', roomId: 'a', centerU: 0.5, centerV: 0.5, width: 0.3, height: 0.3 };
const beam = {
  id: 'b',
  roomId: 'a',
  startU: 0.2,
  startV: 0.3,
  endU: 0.5,
  endV: 0.3,
  width: 0.25,
  height: 0.4,
};

function canvas({ withCore = true } = {}) {
  const view = { gridSize: 100, rooms: [room], walls: faces, columns: [column], beams: [beam] };
  const interaction = createBuildingPlanInteraction({
    scene: () => view,
    policy: () => ({ snapping: true }),
  });
  return Object.assign(Object.create(BuildingPlanCanvas.prototype), {
    rooms: [room],
    walls: structuredClone(faces),
    wallFootprints: [],
    columns: [structuredClone(column)],
    beams: [structuredClone(beam)],
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

const draft = (c, start, to) => {
  c.beamDraft = { roomId: 'a', start, current: start };
  c.updateBeamDraft(to);
  return c.beamDraft.preview;
};

it("draws a beam through core's snapping: level, onto the face, with the legacy wall fields", () => {
  const c = canvas();
  const preview = draft(c, { x: 0, y: 700 }, { x: 996, y: 704 });
  expect(preview.endPoint).toEqual({ x: 1000, y: 700 });
  expect(preview).toMatchObject({ startU: 0, startV: 0.7, endU: 1, endV: 0.7 });
  // Face to face: no one wall holds it.
  expect(preview).toMatchObject({ wallSegmentIndex: -1, startRatio: 0, endRatio: 1 });
  // Onto the column's centre (a beam resting on it), whole centimetres near nothing.
  expect(draft(c, { x: 200, y: 200 }, { x: 497, y: 503 }).endPoint).toEqual({ x: 500, y: 500 });
  expect(draft(c, { x: 200, y: 200 }, { x: 640.4, y: 777.7 }).endPoint).toEqual({
    x: 640,
    y: 778,
  });
});

it('the legacy wall fields: both ends on one face, that face and where they fall along it', () => {
  const c = canvas();
  expect(beamWallValues(c, 'a', { x: 250, y: 0 }, { x: 750, y: 0.0004 })).toEqual({
    wallSegmentIndex: 0,
    startRatio: 0.25,
    endRatio: 0.75,
  });
  expect(beamWallValues(c, 'a', { x: 250, y: 0 }, { x: 750, y: 10 })).toEqual({
    wallSegmentIndex: -1,
    startRatio: 0,
    endRatio: 1,
  });
});

it('drags a beam: a click does not move it, its end onto a face, the whole beam flush', () => {
  const c = canvas();
  const original = {
    startPoint: { x: 200, y: 300 },
    endPoint: { x: 500, y: 300 },
    ...beam,
  };
  const drag = (mode, pointerStart, to) => {
    c.beamDragState = { beamId: 'b', mode, pointerStart, roomId: 'a', original, moved: false };
    delete c.beams[0].preview;
    c.handleMouseMove(to);
    return c.beams[0].preview;
  };
  expect(drag('move', { x: 350, y: 300 }, { x: 351.5, y: 300 })).toBeUndefined();
  // Its end dragged near the left face, nearly level: onto the face, level.
  expect(drag('resize-start', { x: 200, y: 300 }, { x: 5, y: 304 }).startPoint).toEqual({
    x: 0,
    y: 300,
  });
  // The whole beam pushed up into the top face: flush, its side on the face.
  const pushed = drag('move', { x: 350, y: 300 }, { x: 353, y: 5 });
  expect(pushed.startPoint).toEqual({ x: 203, y: 12.5 });
  expect(pushed.endPoint).toEqual({ x: 503, y: 12.5 });
});

it('without core beam snapping, as before: inside the box, onto a near face', () => {
  const c = canvas({ withCore: false });
  expect(draft(c, { x: 200, y: 200 }, { x: 1200, y: 400 }).endPoint).toEqual({ x: 1000, y: 400 });
  expect(draft(c, { x: 200, y: 200 }, { x: 640.4, y: 777.7 }).endPoint).toEqual({
    x: 640.4,
    y: 777.7,
  });
});
