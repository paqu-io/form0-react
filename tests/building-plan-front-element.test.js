import { describe, expect, it } from 'vitest';
import { frontTransform } from '../src/building-plan/front/front-camera.js';
import { frontShapes } from '../src/building-plan/front/front-shapes.js';
import { frontChains } from '../src/building-plan/front/front-chains.js';

// A4 (decided 2026-11-26): Front in an element's entry (a door's, a window's, a wall beam's or a
// band's). The element in the accent colour; the wall's other elements at half strength, the wall
// itself in full, the side's other row faded as before; a clash area at half strength unless the
// element is in it. Its own lengths only: up the side the floor, its bottom and top and the wall's
// top; along the bottom the row's ends and its own; drawn over the rest. One Front can't draw (its
// height unknown) is said just above the wall. W1, 5 × 3 m, and W1.2, 2 m, the rest of its side: a panel of 1060 × 484 px less
// its margins is 700 × 300 px, the side's 7 × 3 m at 100 px/m, W1 at x 160..660, the floor at
// y 348, its top at 48.

const BOX = { width: 1060, height: 484 };
const format = (metres) => metres.toFixed(2);
const ref = (collection, id) => ({ collection, id, path: [] });
const band = (name, bottom, top, faceId = 'f1') => ({
  subjectId: name,
  faceId,
  band: name,
  name,
  from: faceId === 'f1' ? 0 : 5,
  to: faceId === 'f1' ? 5 : 7,
  bottom,
  top,
  ref: ref('wallBeams', `${faceId}:${name}`),
});

function w1(overrides = {}) {
  return {
    roomId: 'bedroom',
    faceId: 'f1',
    length: 7,
    folds: [],
    pieces: [
      { faceId: 'f1', label: 'W1', from: 0, to: 5, height: 3, drawnHeight: 3, shown: true },
      { faceId: 'f2', label: 'W1.2', from: 5, to: 7, height: 3, drawnHeight: 3, shown: false },
    ],
    openings: [
      {
        subjectId: 'win',
        faceId: 'f1',
        kind: 'window',
        name: 'W#1',
        from: 1.9,
        to: 3.1,
        bottom: 0.9,
        top: 2.1,
        ref: ref('windows', 'f1:win'),
      },
    ],
    beams: [band('lintel', 2.1, 2.4), band('ring', 2.7, 3), band('ring', 2.7, 3, 'f2')],
    columns: [
      {
        subjectId: 'c1',
        faceId: 'f1',
        name: 'C#1',
        from: 4.4,
        to: 4.7,
        bottom: 0,
        top: 3,
        height: 3,
        ref: ref('columns', 'c1'),
      },
    ],
    roomBeams: [],
    freeWalls: [],
    problems: [
      { id: 'p1', elementIds: ['win', 'lintel'], from: 1.9, to: 3.1, bottom: 2.1, top: 2.1 },
      { id: 'p2', elementIds: ['ring'], from: 0, to: 5, bottom: 3, top: 3.1 },
    ],
    levels: [0, 0.9, 2.1, 2.4, 2.7, 3],
    fit: { length: 7, height: 3 },
    ...overrides,
  };
}

const WINDOW = { collection: 'windows', id: 'f1:win', name: 'W#1' };
const LINTEL = { collection: 'wallBeams', id: 'f1:lintel', name: 'lintel' };
const shapesOf = (view, subject) => frontShapes(view, frontTransform(view, BOX), { subject });
const chainsOf = (view, subject) => frontChains(view, frontTransform(view, BOX), format, subject);

describe("the element's entry", () => {
  it('draws the element in the accent colour, the rest of the wall at half strength', () => {
    const s = shapesOf(w1(), WINDOW);
    const [window] = s.openings;
    expect([window.subject, window.dimmed]).toEqual([true, false]);
    // The wall's bands and column at half strength; the side's other row faded, not halved again.
    expect(s.beams.map((beam) => [beam.subject, beam.dimmed, beam.faded])).toEqual([
      [false, true, false],
      [false, true, false],
      [false, false, true],
    ]);
    expect(s.columns[0].dimmed).toBe(true);
    // The wall itself in full.
    expect(s.pieces.map((piece) => piece.dimmed)).toEqual([undefined, undefined]);
    // The window's clash with the lintel band in full, the ring beam's at half strength.
    expect(s.problems.map((problem) => problem.dimmed)).toEqual([false, true]);
    expect(s.missing).toBeNull();
  });

  it('dims nothing outside an element entry', () => {
    const s = shapesOf(w1(), null);
    expect([...s.openings, ...s.beams, ...s.columns].some((shape) => shape.dimmed)).toBe(false);
    expect([...s.openings, ...s.beams].some((shape) => shape.subject)).toBe(false);
    expect(s.problems.map((problem) => problem.dimmed)).toEqual([false, false]);
  });

  it("chains a window's own lengths: its sill, its head, the wall's top; its ends along", () => {
    const c = chainsOf(w1(), WINDOW);
    expect(c.levels.map((level) => level.text)).toEqual(['0.90', '2.10', '3.00']);
    expect(c.height.pills.map((pill) => pill.text)).toEqual(['0.90', '1.20', '0.90']);
    expect(c.whole.pill.text).toBe('3.00');
    expect(c.bottom.pills.map((pill) => pill.text)).toEqual(['1.90', '1.20', '1.90']);
    expect(c.side.pill.text).toBe('7.00');
  });

  it("chains a band's: its underside, its top, the wall's top; the row's length along", () => {
    const c = chainsOf(w1(), LINTEL);
    expect(c.levels.map((level) => level.text)).toEqual(['2.10', '2.40', '3.00']);
    expect(c.height.pills.map((pill) => pill.text)).toEqual(['2.10', '0.30', '0.60']);
    expect(c.bottom.pills.map((pill) => pill.text)).toEqual(['5.00']);
    // A door from the floor: no sill level, its head and the top.
    const door = w1({
      openings: [{ ...w1().openings[0], kind: 'door', bottom: 0, top: 2 }],
    });
    expect(chainsOf(door, WINDOW).levels.map((level) => level.text)).toEqual(['2.00', '3.00']);
  });

  it("says when Front can't draw the element; the wall's own lengths", () => {
    const beam = { collection: 'wallBeams', id: 'f1:b9', name: 'B#9' };
    const s = shapesOf(w1(), beam);
    expect(s.missing).toEqual({ x: 160, y: 38, name: 'B#9' });
    expect(s.beams[0].dimmed).toBe(true);
    const c = chainsOf(w1(), beam);
    expect(c.levels.map((level) => level.text)).toEqual(['3.00']);
    expect(c.bottom.pills.map((pill) => pill.text)).toEqual(['5.00']);
    // Above the wall, clear of "Height unknown" on a wall of unknown height.
    const unknown = w1({
      pieces: [{ ...w1().pieces[0], height: null }, w1().pieces[1]],
    });
    const both = shapesOf(unknown, beam);
    expect(both.unknown).toEqual({ x: 168, y: 64 });
    expect(both.missing).toEqual({ x: 160, y: 38, name: 'B#9' });
  });
});
