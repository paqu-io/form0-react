import { describe, expect, it } from 'vitest';
import {
  clearances,
  columnClearances,
  freeWallClearances,
  freeWallHalfWidth,
  runLength,
  splitPointLengths,
} from '../src/building-plan/content-lengths.js';

// A 5 × 3.6 m room (100 canvas units a metre).
const room = [
  { x: 0, y: 0 },
  { x: 500, y: 0 },
  { x: 500, y: 360 },
  { x: 0, y: 360 },
];
const limits = { minLength: 0.5 };
const length = (d) => Math.round(Math.hypot(d.to.x - d.from.x, d.to.y - d.from.y) * 100) / 100;
const round = (p) => ({ x: Math.round(p.x * 100) / 100 + 0, y: Math.round(p.y * 100) / 100 + 0 });

describe('a free wall’s runs (3c-4)', () => {
  it('half its width from its centreline and its row’s face', () => {
    const wall = {
      points: [
        { x: 100, y: 200 },
        { x: 300, y: 200 },
      ],
      sidePoints: [
        { x: 100, y: 195 },
        { x: 300, y: 195 },
      ],
    };
    expect(freeWallHalfWidth(wall)).toBe(5);
    expect(freeWallHalfWidth({ points: wall.points })).toBe(0);
  });

  it('an end dragged: the run along its centreline, above it or left of it, clear of its face', () => {
    const options = { halfWidth: 5, pixel: 0.5, minLength: 0.5 };
    const across = runLength(
      [
        { x: 300, y: 200 },
        { x: 100, y: 200 },
      ],
      options
    );
    expect(length(across)).toBe(200);
    expect(round(across.normal)).toEqual({ x: 0, y: -1 });
    expect(across.offset).toBe(5 / 0.5 + 12);
    expect(across.changing).toBe(true);
    const upright = runLength(
      [
        { x: 100, y: 50 },
        { x: 100, y: 250 },
      ],
      options
    );
    expect(round(upright.normal)).toEqual({ x: -1, y: 0 });
    expect(
      runLength(
        [
          { x: 1, y: 1 },
          { x: 1.2, y: 1 },
        ],
        options
      )
    ).toBeNull();
  });

  it('a split point dragged: both runs, each on the outside of the bend', () => {
    const point = { x: 250, y: 100 };
    const [first, second] = splitPointLengths(
      [
        [
          { x: 100, y: 200 },
          { x: 250, y: 100 },
        ],
        [
          { x: 250, y: 100 },
          { x: 400, y: 200 },
        ],
      ],
      point,
      { halfWidth: 5, pixel: 1, minLength: 0.5 }
    );
    expect(length(first)).toBe(180.28);
    expect(length(second)).toBe(180.28);
    // Away from the other run's far end: up and to the left, up and to the right.
    expect(first.normal.x < 0 && first.normal.y < 0).toBe(true);
    expect(second.normal.x > 0 && second.normal.y < 0).toBe(true);
  });

  it('a straight split point keeps the default side', () => {
    const [first, second] = splitPointLengths(
      [
        [
          { x: 100, y: 200 },
          { x: 250, y: 200 },
        ],
        [
          { x: 250, y: 200 },
          { x: 400, y: 200 },
        ],
      ],
      { x: 250, y: 200 },
      { halfWidth: 5, pixel: 1, minLength: 0.5 }
    );
    expect(round(first.normal)).toEqual({ x: 0, y: -1 });
    expect(round(second.normal)).toEqual({ x: 0, y: -1 });
  });
});

describe('clearances while moving (3c-4)', () => {
  it('a column: one per axis, the nearer side, along the gap from the middle of its side', () => {
    const dims = columnClearances(room, { x: 80, y: 250, width: 30, height: 30 }, limits);
    expect(dims.map(length)).toEqual([80, 80]);
    expect(round(dims[0].from)).toEqual({ x: 80, y: 265 });
    expect(round(dims[0].to)).toEqual({ x: 0, y: 265 });
    expect(round(dims[1].from)).toEqual({ x: 95, y: 280 });
    expect(round(dims[1].to)).toEqual({ x: 95, y: 360 });
    expect(dims.every((d) => d.changing && d.offset === 0)).toBe(true);
  });

  it('a side on a wall: 0, so that axis shows nothing', () => {
    const dims = columnClearances(room, { x: 0, y: 100, width: 30, height: 30 }, limits);
    expect(dims).toHaveLength(1);
    expect(round(dims[0].to)).toEqual({ x: 15, y: 0 });
  });

  it('meets the nearest face the way it looks, in a room with a notch', () => {
    // An L: the top right corner cut away to x 300, y 150.
    const notched = [
      { x: 0, y: 0 },
      { x: 300, y: 0 },
      { x: 300, y: 150 },
      { x: 500, y: 150 },
      { x: 500, y: 360 },
      { x: 0, y: 360 },
    ];
    const dims = columnClearances(notched, { x: 400, y: 300, width: 20, height: 20 }, limits);
    // Right 80 to x 500 (left 400); down 40 to y 360 (up 150 to the notch's side at y 150).
    expect(dims.map(length)).toEqual([80, 40]);
    const high = columnClearances(notched, { x: 400, y: 170, width: 20, height: 20 }, limits);
    expect(round(high[1].to)).toEqual({ x: 410, y: 150 });
  });

  it('a free wall: across from its faces and along from its ends', () => {
    const dims = freeWallClearances(
      room,
      [
        { x: 100, y: 200 },
        { x: 300, y: 200 },
      ],
      5,
      limits
    );
    // Across: 195 up from its top face, 155 down from its bottom face; along: 200 right, 100 left.
    expect(dims.map(length)).toEqual([155, 100]);
    expect(round(dims[0].from)).toEqual({ x: 200, y: 205 });
    expect(round(dims[1].from)).toEqual({ x: 100, y: 200 });
    expect(round(dims[1].to)).toEqual({ x: 0, y: 200 });
  });

  it('a slanted free wall is measured the way it runs', () => {
    const dims = freeWallClearances(
      room,
      [
        { x: 200, y: 200 },
        { x: 300, y: 100 },
      ],
      0,
      limits
    );
    const along = dims[1];
    const direction = { x: along.to.x - along.from.x, y: along.to.y - along.from.y };
    // Along its own line, from an end, not along x or y.
    expect(Math.abs(Math.abs(direction.x) - Math.abs(direction.y))).toBeLessThan(1e-9);
  });

  it('nothing outside a room, or with no face that way', () => {
    expect(
      clearances([], [[{ origin: { x: 0, y: 0 }, direction: { x: 1, y: 0 } }]], limits)
    ).toEqual([]);
    const outside = [[{ origin: { x: 600, y: 100 }, direction: { x: 1, y: 0 } }]];
    expect(clearances(room, outside, limits)).toEqual([]);
  });
});
