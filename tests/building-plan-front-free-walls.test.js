import { describe, expect, it } from 'vitest';
import { frontTransform } from '../src/building-plan/front/front-camera.js';
import { frontShapes } from '../src/building-plan/front/front-shapes.js';
import { frontChains } from '../src/building-plan/front/front-chains.js';

// Free walls in Front (asked in A3's hand test, 2026-11-26): a free wall meeting the shown wall is
// drawn as a column is, floor to top in the walls' tone, named at its top when it fits, its edges
// in the bottom chain. W1 as core gives it, 5 × 3 m, in a 960 × 484 panel: 100 px/m, x 210..710,
// the floor at y 348; W9 meets it 0.9..1.1 m along.

const BOX = { width: 960, height: 484 };
const ref = (id) => ({ collection: 'walls', id, path: [] });
function w1(freeWall = {}) {
  return {
    roomId: 'bedroom',
    faceId: 'f1',
    length: 5,
    folds: [],
    pieces: [{ faceId: 'f1', label: 'W1', from: 0, to: 5, height: 3, drawnHeight: 3, shown: true }],
    openings: [],
    beams: [],
    columns: [],
    roomBeams: [],
    freeWalls: [
      {
        subjectId: 'w9',
        rowId: 'f9',
        faceId: 'f1',
        name: 'W9',
        from: 0.9,
        to: 1.1,
        bottom: 0,
        top: 3,
        height: 3,
        endOn: true,
        ref: ref('f9'),
        ...freeWall,
      },
    ],
    problems: [],
    levels: [0, 3],
    fit: { length: 5, height: 3 },
  };
}

describe('a free wall meeting the shown wall', () => {
  it('stands floor to top at its stretch, openable, named when it fits', () => {
    const view = w1();
    const s = frontShapes(view, frontTransform(view, BOX), {
      selection: { collection: 'walls', id: 'f9' },
    });
    const [wall] = s.freeWalls;
    expect([wall.x, wall.y, wall.w, wall.h].map(Math.round)).toEqual([300, 48, 20, 300]);
    expect([wall.name, wall.selected, wall.unknown, wall.faded]).toEqual([
      'W9',
      true,
      false,
      false,
    ]);
    expect(wall.label).toEqual({ x: 310, y: 62, anchor: 'middle' });
    // 10 px: too narrow for its name.
    const thin = w1({ from: 0.95, to: 1.05 });
    expect(frontShapes(thin, frontTransform(thin, BOX)).freeWalls[0].label).toBeNull();
  });

  it("fades one against the side's other row; adds its edges to the bottom chain", () => {
    const other = w1({ faceId: 'f2' });
    expect(frontShapes(other, frontTransform(other, BOX)).freeWalls[0].faded).toBe(true);
    const view = w1();
    const pills = frontChains(view, frontTransform(view, BOX), (m) => m.toFixed(2)).bottom.pills;
    expect(pills.map((pill) => pill.text)).toEqual(['0.90', '0.20', '3.90']);
  });
});
