import { describe, expect, it } from 'vitest';
import {
  changedSides,
  draftRoomLengths,
  insideRun,
  openingChain,
} from '../src/building-plan/drag-lengths.js';
import { formatLength } from '../src/building-plan/draw/dimensions.js';
import { BuildingPlanCanvas } from '../src/building-plan/legacy/building-plan-canvas.js';

// A 5 × 3.6 m room (100 canvas units a metre) with a vertex at x = 160 on its top side, where
// another room's wall meets it: a vertex, not a corner.
const room = [
  { x: 0, y: 0 },
  { x: 160, y: 0 },
  { x: 500, y: 0 },
  { x: 500, y: 360 },
  { x: 0, y: 360 },
];
const limits = { reach: 100, minLength: 0.5 };
// A door on the top wall's axis, 12.5 units out (a 25 cm wall), 120 to 210 from the left.
const door = { start: { x: 120, y: -12.5 }, end: { x: 210, y: -12.5 } };
const lengths = (dims) =>
  dims.map((d) => Math.round(Math.hypot(d.to.x - d.from.x, d.to.y - d.from.y)));

describe('the side an opening sits on (3-L2)', () => {
  it('runs corner to corner across vertices in line, its normal into the room', () => {
    const run = insideRun(room, door.start, door.end, 100);
    expect(run.start).toEqual({ x: 0, y: 0 });
    expect(run.end).toEqual({ x: 500, y: 0 });
    expect(run.normal.y).toBeCloseTo(1);
  });

  it('finds the side from either face of a shared wall, or none when it is too far', () => {
    // The same door seen from the room below its wall: its ends listed the other way.
    const run = insideRun(room, door.end, door.start, 100);
    expect(run.normal.y).toBeCloseTo(1);
    expect(insideRun(room, { x: 120, y: -200 }, { x: 210, y: -200 }, 100)).toBe(null);
  });
});

describe('a dragged opening’s chain (3-L1)', () => {
  it('measures corner to opening, its width, opening to corner', () => {
    expect(lengths(openingChain(room, door, 'move', limits))).toEqual([120, 90, 290]);
  });

  it('marks what the drag changes', () => {
    const changing = (handle) => openingChain(room, door, handle, limits).map((d) => d.changing);
    expect(changing('move')).toEqual([true, false, true]);
    expect(changing('start')).toEqual([true, true, false]);
    expect(changing('end')).toEqual([false, true, true]);
    // An opening whose ends run the other way along the side: its start is on the right.
    const reversed = { start: door.end, end: door.start };
    expect(openingChain(room, reversed, 'start', limits).map((d) => d.changing)).toEqual([
      false,
      true,
      true,
    ]);
  });

  it('breaks at every other opening on the side, skipping other sides and twin faces', () => {
    const others = [
      { start: { x: 300, y: -12.5 }, end: { x: 420, y: -12.5 } }, // a window on this side
      { start: { x: 100, y: 372.5 }, end: { x: 200, y: 372.5 } }, // a door on the far side
      { start: { x: 210, y: -12.5 }, end: { x: 120, y: -12.5 } }, // the dragged door's twin face
    ];
    const chain = (handle) => openingChain(room, door, handle, { ...limits, others });
    expect(lengths(chain('move'))).toEqual([120, 90, 90, 120, 80]);
    expect(chain('move').map((d) => d.changing)).toEqual([true, false, true, false, false]);
    expect(chain('end').map((d) => d.changing)).toEqual([false, true, true, false, false]);
    expect(chain('start').map((d) => d.changing)).toEqual([true, true, false, false, false]);
  });

  it('leaves out a side the opening closes up to', () => {
    const atCorner = { start: { x: 0, y: -12.5 }, end: { x: 90, y: -12.5 } };
    expect(lengths(openingChain(room, atCorner, 'move', limits))).toEqual([90, 410]);
  });
});

describe('a room being drawn', () => {
  it('shows its width along the top and its depth along the left, both changing', () => {
    const dims = draftRoomLengths({ x: 100, y: 50, width: 400, height: 300 });
    expect(lengths(dims)).toEqual([400, 300]);
    expect(dims.every((d) => d.changing)).toBe(true);
    expect(dims[0].normal).toEqual({ x: 0, y: -1 });
    expect(draftRoomLengths({ x: 0, y: 0, width: 0, height: 0 })).toEqual([]);
  });
});

describe('a length’s text (3-L4)', () => {
  const metres = { locale: 'en', toDisplayLength: (m) => m };
  it('has two decimals, the locale’s decimal sign and no unit', () => {
    expect(formatLength(3.6, metres)).toBe('3.60');
    expect(formatLength(3.6, { ...metres, locale: 'it' })).toBe('3,60');
    expect(formatLength(1234.5, metres)).toBe('1234.50');
    expect(formatLength(3.048, { locale: 'en', toDisplayLength: (m) => m / 0.3048 })).toBe('10.00');
  });
});

describe('a room being drawn snaps (3c-2b)', () => {
  const canvas = (pull) =>
    Object.assign(Object.create(BuildingPlanCanvas.prototype), {
      gridSize: 100,
      zoomLevel: 1,
      lastPointerEvent: { altKey: false },
      controller: { interaction: { snapPoint: pull } },
    });

  it('keeps a pull into line with another room, else whole centimetres', () => {
    // Pulled on x to another room's corner at 123.4; y free.
    const c = canvas((point) => ({ ...point, x: 123.4 }));
    expect(c.snapDraftCorner({ x: 120.2, y: 56.7 })).toEqual({ x: 123.4, y: 57 });
    const free = canvas((point) => ({ ...point }));
    expect(free.snapDraftCorner({ x: 120.2, y: 56.49 })).toEqual({ x: 120, y: 56 });
  });

  it('asks for no pull with Alt', () => {
    let asked;
    const c = canvas((point, options) => ((asked = options), { ...point }));
    c.lastPointerEvent = { altKey: true };
    c.snapDraftCorner({ x: 1, y: 1 });
    expect(asked.bypass).toBe(true);
  });
});

describe('the sides a wall or corner drag changes (3c-3)', () => {
  const limits = { minChange: 0.1, minLength: 0.5 };
  const sorted = (dims) => lengths(dims).sort((a, b) => a - b);

  it('a wall moved straight: the two sides next to it, measured corner to corner', () => {
    // The top wall moves up 50; the vertex at x = 160 on it stays in line.
    const after = [
      { x: 0, y: -50 },
      { x: 160, y: -50 },
      { x: 500, y: -50 },
      { x: 500, y: 360 },
      { x: 0, y: 360 },
    ];
    const dims = changedSides(room, after, limits);
    expect(sorted(dims)).toEqual([410, 410]);
    expect(dims.every((d) => d.changing)).toBe(true);
    // Each stands inside the room: the right side's normal points left.
    const right = dims.find((d) => d.from.x === 500);
    expect(right.normal.x).toBeCloseTo(-1);
  });

  it('a side split by a vertex in line is one length (3-L2)', () => {
    const after = [
      { x: 0, y: 0 },
      { x: 160, y: 0 },
      { x: 550, y: 0 },
      { x: 550, y: 360 },
      { x: 0, y: 360 },
    ];
    expect(sorted(changedSides(room, after, limits))).toEqual([550, 550]);
  });

  it('a corner dragged: the two sides that meet there', () => {
    const after = [
      { x: 0, y: 0 },
      { x: 500, y: 0 },
      { x: 500, y: 360 },
      { x: 40, y: 400 },
    ];
    expect(sorted(changedSides(room, after, limits))).toEqual([402, 462]);
  });

  it('a jog the drag made shows, as do the sides it changed', () => {
    // The lower half of the right side moved out 60: a jog of 60, and the bottom longer.
    const after = [
      { x: 0, y: 0 },
      { x: 500, y: 0 },
      { x: 500, y: 180 },
      { x: 560, y: 180 },
      { x: 560, y: 360 },
      { x: 0, y: 360 },
    ];
    expect(sorted(changedSides(room, after, limits))).toEqual([60, 180, 180, 560]);
  });

  it('nothing before the drag, or nothing changed: no lengths', () => {
    expect(changedSides(null, room, limits)).toEqual([]);
    expect(changedSides(room, room, limits)).toEqual([]);
  });
});
