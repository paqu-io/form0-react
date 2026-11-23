import { describe, expect, it } from 'vitest';
import { PILL_HEIGHT, layoutPills } from '../src/building-plan/draw/dimension-layout.js';

// Step 2, S11: where a length's pill goes. Canvas units at zoom 1 (`pixel` 1); lines along the
// top of a room 0..500 × 0..300, standing 26 px into it (y = 26), pills 40 px wide.
const pixel = 1;
const room = (point) => point.x > 0 && point.x < 500 && point.y > 0 && point.y < 300;
const along = (x0, x1, y = 26) => ({
  a: { x: x0, y },
  b: { x: x1, y },
  u: { x: 1, y: 0 },
  n: { x: 0, y: 1 },
  angle: 0,
  width: 40,
});
const round = (spot) => ({
  centre: { x: Math.round(spot.centre.x), y: Math.round(spot.centre.y) },
  leader: spot.leader?.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) })) ?? null,
});

describe('a pill that fits (S11)', () => {
  it('sits on its line’s middle, without a leader', () => {
    const [spot] = layoutPills([along(100, 300)], { pixel });
    expect(round(spot)).toEqual({ centre: { x: 200, y: 26 }, leader: null });
  });

  it('needs its width and 8 px to spare', () => {
    const [fits, tight] = layoutPills([along(0, 48), along(100, 147)], { pixel, isInside: room });
    expect(fits.leader).toBeNull();
    expect(tight.leader).not.toBeNull();
  });
});

describe('a pill that doesn’t fit', () => {
  it('goes past its line’s end, on the line extended, with the line run on to it', () => {
    const [spot] = layoutPills([along(200, 210)], { pixel, isInside: room });
    // 6 px past the end, then half its width.
    expect(round(spot)).toEqual({
      centre: { x: 236, y: 26 },
      leader: [
        { x: 210, y: 26 },
        { x: 236, y: 26 },
      ],
    });
  });

  it('takes a spot inside the room first', () => {
    // Near the room's right side: past the end would be outside, so past the start.
    const [spot] = layoutPills([along(480, 495)], { pixel, isInside: room });
    expect(round(spot).centre).toEqual({ x: 454, y: 26 });
  });

  it('goes past the chain’s outer end: the first piece past the corner', () => {
    // A chain from the corner at x 30: 4 units, then the rest of the side.
    const [first, rest] = layoutPills([along(30, 34), along(34, 400)], { pixel, isInside: room });
    expect(round(first).centre.x).toBe(30 - 6 - 20);
    expect(rest.leader).toBeNull();
  });

  it('steps out with a short leader when both spots are taken', () => {
    // Two short pieces side by side between two long ones: past either end is a long one's pill.
    const lines = [along(100, 160), along(160, 164), along(164, 168), along(168, 228)];
    const spots = layoutPills(lines, { pixel, isInside: room });
    expect(round(spots[1]).centre).toEqual({ x: 162, y: 26 + 22 });
    const stepped = round(spots[2]);
    expect(stepped.centre).toEqual({ x: 166, y: 48 });
    expect(stepped.leader).toEqual([
      { x: 166, y: 26 },
      { x: 166, y: 26 + 22 - PILL_HEIGHT / 2 },
    ]);
  });

  it('measures a vertical pill’s room by its turned size', () => {
    // A vertical line 10 long at x 26: its pill is 18 wide and 40 tall on screen.
    const vertical = {
      a: { x: 26, y: 200 },
      b: { x: 26, y: 190 },
      u: { x: 0, y: -1 },
      n: { x: 1, y: 0 },
      angle: -Math.PI / 2,
      width: 40,
    };
    // Past its end it stands 17..35 across: clear of a pill from x 40 (40 wide, it wouldn't be).
    const [, spot] = layoutPills([along(20, 100, 150), vertical], { pixel, isInside: room });
    expect(round(spot).centre).toEqual({ x: 26, y: 164 });
  });
});
