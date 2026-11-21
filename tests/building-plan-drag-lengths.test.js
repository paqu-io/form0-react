import { describe, expect, it } from 'vitest';
import { draftRoomLengths, insideRun, openingChain } from '../src/building-plan/drag-lengths.js';
import { formatLength } from '../src/building-plan/draw/dimensions.js';

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
