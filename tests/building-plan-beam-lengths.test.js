import { expect, it } from 'vitest';
import { beamDragLengths } from '../src/building-plan/beam-placement.js';

// A 10 m square room at 100 canvas units a metre; beam B, 25 cm wide (half 12.5 units).
const room = {
  id: 'a',
  vertices: [
    { x: 0, y: 0 },
    { x: 1000, y: 0 },
    { x: 1000, y: 1000 },
    { x: 0, y: 1000 },
  ],
};
const limits = { minLength: 0.5, pixel: 1, newWidth: 0.25 };
const plan = (extra) => ({ gridSize: 100, rooms: [room], beams: [], ...extra });
const round = (point) => ({
  x: Math.round(point.x * 1000) / 1000,
  y: Math.round(point.y * 1000) / 1000,
});

it('no beam gesture: none; a beam being drawn: its length beside it, clear of its side', () => {
  expect(beamDragLengths(plan({}), limits)).toBeNull();
  const drawing = plan({
    beamDraft: {
      roomId: 'a',
      preview: { startPoint: { x: 0, y: 300 }, endPoint: { x: 600, y: 300 } },
    },
  });
  const [length] = beamDragLengths(drawing, limits);
  expect(length).toMatchObject({ from: { x: 0, y: 300 }, to: { x: 600, y: 300 }, changing: true });
  // Above it (as a free wall's run), half its width and 12 px clear.
  expect(length.normal.y).toBe(-1);
  expect(length.offset).toBe(12.5 + 12);
  // Just pressed (a point): none.
  const pressed = plan({
    beamDraft: { roomId: 'a', preview: { startPoint: { x: 5, y: 5 }, endPoint: { x: 5, y: 5 } } },
  });
  expect(beamDragLengths(pressed, limits)).toEqual([]);
});

it('an end dragged: its length; moved whole: its clearances across and along', () => {
  const beam = {
    id: 'b',
    roomId: 'a',
    width: 0.25,
    preview: { startPoint: { x: 200, y: 300 }, endPoint: { x: 700, y: 300 } },
  };
  const dragging = (mode, moved = true) =>
    plan({ beams: [beam], beamDragState: { beamId: 'b', mode, moved } });
  expect(beamDragLengths(dragging('resize-end', false), limits)).toEqual([]);
  const [run] = beamDragLengths(dragging('resize-end'), limits);
  expect(run).toMatchObject({ from: { x: 200, y: 300 }, to: { x: 700, y: 300 } });
  const clear = beamDragLengths(dragging('move'), limits).map((d) => [round(d.from), round(d.to)]);
  // Across from its top side (287.5) up to the face; along from its start back to the left face.
  expect(clear).toEqual([
    [
      { x: 450, y: 287.5 },
      { x: 450, y: 0 },
    ],
    [
      { x: 200, y: 300 },
      { x: 0, y: 300 },
    ],
  ]);
});
