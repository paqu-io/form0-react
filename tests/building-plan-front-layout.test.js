import { describe, expect, it } from 'vitest';
import { FRONT_FIT, frontTransform, frontZoomed } from '../src/building-plan/front/front-camera.js';
import { frontShapes } from '../src/building-plan/front/front-shapes.js';
import { frontChains } from '../src/building-plan/front/front-chains.js';

// A2 (decided 2026-11-26): the front view's layout in px, from core's front view in metres. W1
// from the Bedroom as core gives it with the floor's bands (sill 0.6–0.9, lintel 2.1–2.4, ring
// 2.7–3) and a window 1.9–3.1 m along it, 0.9–2.1 m up. A panel of 960 × 484 px less its margins
// (160 left and 136 bottom with the mini-map's card, 200 right, 48 top) is 600 × 300 px: the room's
// 5 × 3 m fit at 100 px/m, its middle at (460, 198), so W1 runs x 210..710 and the floor is at
// y 348, its top at 48.

const BOX = { width: 960, height: 484 };
const format = (metres) => metres.toFixed(2);
const path = (...indexes) =>
  indexes.map((index, i) => ({ key: ['floors', 'rooms', 'walls', 'face_windows'][i], index }));
const ref = (collection, id, at) => ({ collection, id, path: at });

function w1(overrides = {}) {
  const band = (band, bottom, top, name) => ({
    subjectId: band,
    faceId: 'f1',
    band,
    name,
    from: 0,
    to: 5,
    bottom,
    top,
    ref: ref('wallBeams', `f1:${band}`, [...path(0, 0, 0), { key: 'face_beams', index: 0 }]),
  });
  return {
    roomId: 'bedroom',
    faceId: 'f1',
    freeWall: false,
    length: 5,
    folds: [],
    pieces: [
      {
        faceId: 'f1',
        label: 'W1',
        from: 0,
        to: 5,
        height: 3,
        drawnHeight: 3,
        shown: true,
        ref: ref('walls', 'f1', path(0, 0, 0)),
      },
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
        ref: ref('windows', 'f1:win', path(0, 0, 0, 0)),
      },
    ],
    beams: [
      band('sill', 0.6, 0.9, 'Sill band'),
      band('lintel', 2.1, 2.4, 'Lintel band'),
      band('ring', 2.7, 3, 'Ring beam'),
    ],
    problems: [],
    levels: [0, 0.6, 0.9, 2.1, 2.4, 2.7, 3],
    fit: { length: 5, height: 3 },
    ...overrides,
  };
}
const round = (value) => Math.round(value * 100) / 100;
const box = ({ x, y, w, h }) => [x, y, w, h].map(round);

describe('the camera: one scale per room, zoom and pan of its own', () => {
  it('fits the room in the panel less its margins, the view centred', () => {
    const t = frontTransform(w1(), BOX);
    expect(t.scale).toBe(100);
    expect([t.x(0), t.x(5), t.y(0), t.y(3)]).toEqual([210, 710, 348, 48]);
  });

  it('keeps the room scale for a shorter wall of the room, on the same floor line', () => {
    const t = frontTransform(w1({ length: 3 }), BOX);
    expect(t.scale).toBe(100);
    expect([t.x(0), t.x(3), t.y(0)]).toEqual([310, 610, 348]);
  });

  it('zooms about a point, keeping what is under it, within its limits', () => {
    const view = w1();
    // The window's top right corner, 3.1 m along and 2.1 m up: (520, 138), (60, -60) from the middle.
    const camera = frontZoomed(FRONT_FIT, 2, { x: 60, y: -60 });
    const t = frontTransform(view, BOX, camera);
    expect([round(t.x(3.1)), round(t.y(2.1))]).toEqual([520, 138]);
    expect(t.scale).toBe(200);
    expect(frontZoomed(camera, 100).zoom).toBe(8);
    expect(frontZoomed(FRONT_FIT, 0.01).zoom).toBe(0.5);
    // The pill zooms about the middle.
    expect(frontZoomed({ zoom: 1, pan: { x: 10, y: -4 } }, 2).pan).toEqual({ x: 20, y: -8 });
  });
});

describe('the shapes', () => {
  it('draws the wall, its bands and its window to scale, bands named inside', () => {
    const s = frontShapes(w1(), frontTransform(w1(), BOX));
    expect(s.pieces.map(box)).toEqual([[210, 48, 500, 300]]);
    expect(s.pieces[0].shown).toBe(true);
    expect(s.beams.map(box)).toEqual([
      [210, 258, 500, 30],
      [210, 108, 500, 30],
      [210, 48, 500, 30],
    ]);
    expect(s.beams.map((beam) => beam.label && [beam.label.x, beam.label.anchor])).toEqual([
      [704, 'end'],
      [704, 'end'],
      [704, 'end'],
    ]);
    expect(s.openings.map(box)).toEqual([[400, 138, 120, 120]]);
    expect(s.openings[0].label).toEqual({ x: 460, y: 202, anchor: 'middle' });
    expect(s.floor).toEqual({ x0: 186, x1: 734, y: 348 });
    expect(s.unknown).toBeNull();
  });

  it("names a band only when it's tall enough, and a beam added by hand in its middle", () => {
    const thin = w1({
      beams: [
        { ...w1().beams[0], top: 0.7 },
        { ...w1().beams[1], band: null, name: 'B#5', from: 1, to: 2.2 },
      ],
    });
    const s = frontShapes(thin, frontTransform(thin, BOX));
    expect(s.beams[0].label).toBeNull();
    expect(s.beams[1].label).toEqual({ x: 370, y: 126.5, anchor: 'middle' });
  });

  it("fades the side's other rows and their elements", () => {
    const view = w1({
      pieces: [
        { ...w1().pieces[0], to: 2 },
        { ...w1().pieces[0], faceId: 'f2', label: 'W3.2', from: 2, shown: false },
      ],
      openings: [{ ...w1().openings[0], faceId: 'f2' }],
    });
    const s = frontShapes(view, frontTransform(view, BOX));
    expect(s.pieces.map((piece) => piece.shown)).toEqual([true, false]);
    expect(s.openings[0].faded).toBe(true);
    expect(s.beams[0].faded).toBe(false);
  });

  it("marks the plan's selected element, and a '!' on each element with an issue", () => {
    const view = w1();
    const s = frontShapes(view, frontTransform(view, BOX), {
      selection: { collection: 'windows', id: 'f1:win' },
      markers: [path(0, 0, 0, 0), path(0, 0, 0), path(0, 0, 9)],
    });
    expect(s.openings[0].selected).toBe(true);
    expect(s.beams.some((beam) => beam.selected)).toBe(false);
    // The window's top right (520, 138) and the wall's (710, 48), 11 px up and right.
    expect(s.markers.map((marker) => [marker.x, marker.y])).toEqual([
      [721, 37],
      [531, 127],
    ]);
  });

  it('draws a wall of unknown height to its drawn height, saying so', () => {
    const view = w1({
      pieces: [{ ...w1().pieces[0], height: null, drawnHeight: 2.9 }],
      levels: [0, 0.6, 0.9, 2.1, 2.4],
    });
    const s = frontShapes(view, frontTransform(view, BOX));
    expect(s.pieces[0].unknown).toBe(true);
    expect(box(s.pieces[0])).toEqual([210, 58, 500, 290]);
    expect(s.unknown).toEqual({ x: 218, y: 74 });
  });

  it('marks folds and clash areas', () => {
    const view = w1({
      folds: [2],
      problems: [
        {
          id: 'p1',
          code: 'opening_into_band',
          elementIds: [],
          from: 1.9,
          to: 3.1,
          bottom: 1.9,
          top: 2.1,
        },
      ],
    });
    const s = frontShapes(view, frontTransform(view, BOX));
    expect(s.folds.map((fold) => [fold.x, fold.y0, fold.y1])).toEqual([[410, 348, 48]]);
    expect(s.problems.map(box)).toEqual([[400, 138, 120, 20]]);
  });
});

describe('the lengths (H1)', () => {
  it('labels the levels left of the side, the floor left out', () => {
    const c = frontChains(w1(), frontTransform(w1(), BOX), format);
    expect(c.levels.map((level) => [level.text, round(level.y), round(level.ty)])).toEqual([
      ['0.60', 288, 292],
      ['0.90', 258, 262],
      ['2.10', 138, 142],
      ['2.40', 108, 112],
      ['2.70', 78, 82],
      ['3.00', 48, 52],
    ]);
    expect(c.levels[0].x).toBe(192);
  });

  it("chains the partial lengths right of the side, and the wall's height outside", () => {
    const c = frontChains(w1(), frontTransform(w1(), BOX), format);
    expect(c.height.x).toBe(738);
    expect(c.height.pills.map((pill) => [pill.text, round(pill.y), pill.leader])).toEqual([
      ['0.60', 318, null],
      ['0.30', 273, null],
      ['1.20', 198, null],
      ['0.30', 123, null],
      ['0.30', 93, null],
      ['0.30', 63, null],
    ]);
    expect(c.whole.pill.text).toBe('3.00');
    expect([c.whole.y0, c.whole.y1]).toEqual([348, 48]);
    expect(c.whole.x).toBeGreaterThan(c.height.x + 27 + 2 * 39);
  });

  it('steps short partial lengths aside, alternating, with a leader', () => {
    const view = w1({ levels: [0, 2.1, 2.25, 2.35, 2.5, 3] });
    const c = frontChains(view, frontTransform(view, BOX), format);
    const aside = c.height.pills.filter((pill) => pill.leader);
    expect(aside.map((pill) => pill.text)).toEqual(['0.15', '0.10', '0.15']);
    const edges = aside.map((pill) => pill.leader.x1);
    expect(edges[0]).toBe(765);
    expect(edges[1]).toBeGreaterThan(edges[0] + 30);
    expect(edges[2]).toBe(edges[0]);
    expect(aside.every((pill) => pill.leader.x0 === 738)).toBe(true);
  });

  it('has no whole height for a wall of unknown height', () => {
    const view = w1({ pieces: [{ ...w1().pieces[0], height: null, drawnHeight: 2.9 }] });
    expect(frontChains(view, frontTransform(view, BOX), format).whole).toBeNull();
  });

  it("chains the row's ends and its openings' along the bottom, the whole side under", () => {
    const c = frontChains(w1(), frontTransform(w1(), BOX), format);
    expect(c.bottom.y).toBe(382);
    expect(c.bottom.pills.map((pill) => [pill.text, pill.x, pill.y])).toEqual([
      ['1.90', 305, 382],
      ['1.20', 460, 382],
      ['1.90', 615, 382],
    ]);
    expect(c.side.pill).toMatchObject({ text: '5.00', x: 460, y: 426 });
  });

  it("leaves out the whole side when the row's ends are all there is", () => {
    const view = w1({ openings: [] });
    const c = frontChains(view, frontTransform(view, BOX), format);
    expect(c.bottom.pills.map((pill) => pill.text)).toEqual(['5.00']);
    expect(c.side).toBeNull();
  });

  it("chains only the shown row's stretch of a side of two rows, the side under", () => {
    const view = w1({
      pieces: [
        { ...w1().pieces[0], to: 2 },
        { ...w1().pieces[0], faceId: 'f2', label: 'W3.2', from: 2, shown: false },
      ],
      openings: [{ ...w1().openings[0], faceId: 'f2' }],
    });
    const c = frontChains(view, frontTransform(view, BOX), format);
    expect(c.bottom.pills.map((pill) => pill.text)).toEqual(['2.00']);
    expect(c.side.pill.text).toBe('5.00');
  });

  it('steps a short length along the bottom up, then down', () => {
    const view = w1({
      openings: [
        { ...w1().openings[0], from: 0.1, to: 1 },
        { ...w1().openings[0], subjectId: 'w2', from: 1.2, to: 4.8 },
      ],
    });
    const c = frontChains(view, frontTransform(view, BOX), format);
    expect(c.bottom.pills.map((pill) => [pill.text, pill.y])).toEqual([
      ['0.10', 362],
      ['0.90', 382],
      ['0.20', 402],
      ['3.60', 382],
      ['0.20', 362],
    ]);
  });
});

// Columns and room beams against the wall (decided 2026-11-26): core gives those touching the
// side's face; a column from the floor to its top (unknown: its wall's drawn height), a room beam at
// its underside and depth, `endOn` when it meets the wall across.
describe('columns and room beams against the wall', () => {
  const at = (key, index) => [...path(0, 0), { key, index }];
  const withStructure = () =>
    w1({
      columns: [
        {
          subjectId: 'c1',
          faceId: 'f1',
          name: 'C#1',
          from: 0.85,
          to: 1.15,
          bottom: 0,
          top: 3,
          height: 3,
          ref: ref('columns', 'c1', at('columns', 0)),
        },
        {
          subjectId: 'c2',
          faceId: 'f2',
          name: 'C#2',
          from: 4.6,
          to: 5,
          bottom: 0,
          top: 3,
          height: null,
          ref: ref('columns', 'c2', at('columns', 1)),
        },
      ],
      roomBeams: [
        {
          subjectId: 'b1',
          faceId: 'f1',
          name: 'B#1',
          from: 2.4,
          to: 2.6,
          bottom: 2.7,
          top: 3,
          endOn: true,
          ref: ref('beams', 'b1', at('beams', 0)),
        },
        {
          subjectId: 'b2',
          faceId: 'f1',
          name: 'B#2',
          from: 0.2,
          to: 1.6,
          bottom: 1.5,
          top: 1.75,
          endOn: false,
          ref: ref('beams', 'b2', at('beams', 1)),
        },
      ],
    });

  it('draws columns floor to top, named at the top, the side’s other row faded', () => {
    const view = withStructure();
    const s = frontShapes(view, frontTransform(view, BOX), {
      selection: { collection: 'columns', id: 'c1' },
    });
    expect(s.columns.map(box)).toEqual([
      [295, 48, 30, 300],
      [670, 48, 40, 300],
    ]);
    expect(s.columns.map((c) => [c.faded, c.selected, c.unknown])).toEqual([
      [false, true, false],
      [true, false, true],
    ]);
    expect(s.columns[0].label).toEqual({ x: 310, y: 62, anchor: 'middle' });
  });

  it('draws room beams at their height: one end on named above it, one along named inside', () => {
    const view = withStructure();
    const s = frontShapes(view, frontTransform(view, BOX), {
      markers: [at('beams', 0)],
    });
    expect(s.roomBeams.map((b) => [...box(b), b.endOn])).toEqual([
      [450, 48, 20, 30, true],
      [230, 173, 140, 25, false],
    ]);
    expect(s.roomBeams[0].label).toEqual({ x: 460, y: 44, anchor: 'middle' });
    const label = s.roomBeams[1].label;
    expect([round(label.x), round(label.y), label.anchor]).toEqual([300, 189, 'middle']);
    // The end-on beam's "!" at its top right.
    expect(s.markers.map((m) => [m.x, m.y])).toEqual([[481, 37]]);
  });

  it("adds the shown row's columns' edges to the bottom chain, no levels", () => {
    const view = withStructure();
    const c = frontChains(view, frontTransform(view, BOX), format);
    expect(c.bottom.pills.map((pill) => pill.text)).toEqual([
      '0.85',
      '0.30',
      '0.75',
      '1.20',
      '1.90',
    ]);
    expect(c.levels.map((level) => level.text)).toEqual([
      '0.60',
      '0.90',
      '2.10',
      '2.40',
      '2.70',
      '3.00',
    ]);
  });
});
