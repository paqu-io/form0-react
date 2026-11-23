import { expect, it } from 'vitest';
import { beamOutlineAt } from '../src/building-plan/beam-placement.js';
import { refusalOutlines } from '../src/building-plan/draw/refusal-marks.js';

// A 10 m room at 100 canvas units a metre; beam B, 15 cm wide (15 units).
const room = {
  id: 'a',
  vertices: [
    { x: 0, y: 0 },
    { x: 1000, y: 0 },
    { x: 1000, y: 1000 },
    { x: 0, y: 1000 },
  ],
};
const stored = [
  { x: 0, y: 0 },
  { x: 1, y: 1 },
  { x: 2, y: 0 },
];

it("a beam's outline: core's at rest, cut along a face while dragged, none while its room moves", () => {
  const plan = { gridSize: 100, rooms: [room] };
  const beam = { id: 'b', roomId: 'a', outline: stored };
  const at = { start: { x: 0, y: 200 }, end: { x: 600, y: 800 }, widthPx: 15 };
  expect(beamOutlineAt(plan, beam, { ...at, moving: false })).toBe(stored);
  // Dragged: through core, slanted onto the left face, its end cut along it (nothing past x 0).
  const dragged = beamOutlineAt(plan, beam, { ...at, moving: true });
  expect(Math.min(...dragged.map((p) => p.x))).toBeCloseTo(0, 9);
  expect(dragged.length).toBeGreaterThanOrEqual(4);
  // Its room being moved: a plain band (none).
  const moving = { gridSize: 100, rooms: [{ ...room, previewRect: { x: 0, y: 0 } }] };
  expect(beamOutlineAt(moving, beam, { ...at, moving: false })).toBeNull();
});

it("a refused beam's mark is as wide as the beam, 4 px clear, not its depth", () => {
  const plan = {
    zoomLevel: 1,
    beams: [{ id: 'b' }],
    getBeamRenderInfo: () => ({
      startPoint: { x: 100, y: 500 },
      endPoint: { x: 700, y: 500 },
      widthPx: 15,
      lineWidth: 30,
    }),
  };
  const [shape] = refusalOutlines(plan, [{ subject: { type: 'beams', id: 'b' } }]);
  const ys = shape.points.map((p) => p.y);
  // Half its width (7.5) and 4 px, pushed out a little more at the ends: well under its depth's.
  expect(Math.min(...ys)).toBeLessThan(500 - 11.5 + 0.01);
  expect(Math.min(...ys)).toBeGreaterThan(500 - 12);
  expect(Math.max(...ys)).toBeGreaterThan(511.49);
  expect(Math.max(...ys)).toBeLessThan(512);
});
