import { describe, expect, it } from 'vitest';
import { COLUMN_GRIP_RADIUS, WALL_GRIP_RADIUS } from '../src/building-plan/draw/handles.js';
import { drawGuides, ringRadius } from '../src/building-plan/draw/guides.js';

// U6 (2026-11-23, option 1): a pull that places the whole element over the floor below rings the
// grip it goes around, just outside it; any other pull below, a small ring on the point it took.

/** A context that records each ring's radius. */
function rings() {
  const radii = [];
  const noop = () => {};
  const ctx = {
    save: noop,
    restore: noop,
    beginPath: noop,
    moveTo: noop,
    lineTo: noop,
    stroke: noop,
    setLineDash: noop,
    arc: (x, y, radius) => radii.push({ x, y, radius }),
  };
  return { ctx, radii };
}

describe('the pulls’ rings', () => {
  it('stand just outside the grip a whole-element pull names, else 5 px', () => {
    expect(ringRadius({ below: true })).toBe(5);
    expect(ringRadius({ below: true, grip: 'column' })).toBe(COLUMN_GRIP_RADIUS + 4);
    expect(ringRadius({ below: true, grip: 'wall' })).toBe(WALL_GRIP_RADIUS + 4);
  });

  it('ring only the floor below’s points, sized on screen at any zoom', () => {
    const { ctx, radii } = rings();
    const at = { x: 30, y: 30 };
    drawGuides(
      ctx,
      [
        { from: at, to: { x: 30, y: 90 } },
        { from: at, to: at, below: true },
        { from: at, to: at, below: true, grip: 'column' },
      ],
      { theme: { accent: '#00f' }, pixel: 0.5 }
    );
    expect(radii.map((ring) => ring.radius)).toEqual([2.5, (COLUMN_GRIP_RADIUS + 4) / 2]);
  });
});
