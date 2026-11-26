import { describe, expect, it } from 'vitest';
import { FRONT_MARGIN, frontTransform } from '../src/building-plan/front/front-camera.js';
import { FRONT_MAP, frontMapLayout } from '../src/building-plan/front/front-map.js';

// The mini-map in Front (decided 2026-11-26, mockup round 4): core's map of the room (plan metres,
// as the plan draws it) laid out in its card, bottom left. The Bedroom as core gives it: its floor
// 0..5 × 0..3 m, walls 0.2 m outside, so the map's bounds are 5.4 × 3.4 m. In the card's 120 × 68
// px drawing (136 × 84 less 8 px around) that is 20 px/m, the floor's corner at (18, 12).

const p = (x, y) => ({ x, y });
function bedroom(overrides = {}) {
  return {
    outline: [p(0, 0), p(5, 0), p(5, 3), p(3, 3), p(0, 3)],
    walls: [[p(0, -0.2), p(5, -0.2), p(5, 0), p(0, 0)]],
    lines: [],
    shown: [[p(0, 0), p(5, 0)]],
    others: [],
    zero: p(0, 0),
    eye: p(2.5, 2.4),
    cone: [p(2.5, 2.4), p(0, 0), p(5, 0)],
    bounds: { x: -0.2, y: -0.2, width: 5.4, height: 3.4 },
    ...overrides,
  };
}

describe('the mini-map', () => {
  it('fits the room in its card, centred, as the plan draws it', () => {
    const m = frontMapLayout(bedroom());
    expect(m.scale).toBe(20);
    expect(m.floor).toBe('M18 12L118 12L118 72L78 72L18 72Z');
    expect(m.walls).toBe('M18 8L118 8L118 12L18 12Z');
    expect(m.shown).toEqual([{ x1: 18, y1: 12, x2: 118, y2: 12 }]);
    expect(m.zero).toEqual({ x: 18, y: 12 });
    expect(m.eye).toEqual({ x: 68, y: 60 });
    expect(m.cone).toBe('M68 60L18 12L118 12Z');
  });

  it("draws the side's other rows and their cone, walls of unknown thickness as lines", () => {
    const m = frontMapLayout(
      bedroom({
        walls: [],
        lines: [[p(0, 0), p(5, 0)]],
        shown: [[p(5, 3), p(3, 3)]],
        others: [[p(3, 3), p(0, 3)]],
        zero: p(5, 3),
        cone: [],
        sideCone: [p(4, 2), p(5, 3), p(0, 3)],
      })
    );
    expect(m.shown).toEqual([{ x1: 118, y1: 72, x2: 78, y2: 72 }]);
    expect(m.others).toEqual([{ x1: 78, y1: 72, x2: 18, y2: 72 }]);
    expect(m.lines).toEqual([{ x1: 18, y1: 12, x2: 118, y2: 12 }]);
    expect([m.walls, m.cone]).toEqual(['', '']);
    // The side cone, to the side's ends (W3.2 is in Front beside W3).
    expect(m.sideCone).toBe('M98 52L118 72L18 72Z');
    expect(frontMapLayout(bedroom()).sideCone).toBe('');
  });

  it('keeps the card clear of the wall: left of it, under the floor line, above the status', () => {
    // The status line: 28 px tall, 8 px up from the panel's bottom (measured on the page).
    expect(FRONT_MAP.bottom - (8 + 28)).toBeGreaterThanOrEqual(8);
    const right = FRONT_MAP.left + FRONT_MAP.width + 2;
    const top = (box) => box.height - FRONT_MAP.bottom - FRONT_MAP.height - 2;
    expect(FRONT_MARGIN.left - right).toBeGreaterThanOrEqual(12);
    // A long wall fits across: its left end at the margin.
    const long = { length: 20, fit: { length: 20, height: 3 } };
    const box = { width: 960, height: 484 };
    expect(frontTransform(long, box).x(0)).toBe(FRONT_MARGIN.left);
    // A tall one fits up: its floor line (2 px) above the card.
    const tall = { length: 3, fit: { length: 3, height: 3 } };
    expect(frontTransform(tall, box).y(0)).toBe(box.height - FRONT_MARGIN.bottom);
    expect(top(box) - frontTransform(tall, box).y(0)).toBeGreaterThanOrEqual(4);
  });
});
