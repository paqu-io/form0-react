import { expect, it } from 'vitest';
import { freeWallSide } from '../src/building-plan/free-wall-side.js';
import { drawInsertionMark } from '../src/building-plan/draw/insertion-mark.js';

// 4a-3 (2026-11-20): core gives a free wall by its centreline (`points`) and its row's face
// (`sidePoints`). At 100 canvas units a metre, a 20 cm free wall along y 300, its face at y 310.
const freeWall = {
  id: 'free',
  roomId: 'a',
  isBoundary: false,
  isCutPortion: false,
  physicalWallId: 'p-free',
  thickness: 0.2,
  points: [
    { x: 100, y: 300 },
    { x: 400, y: 300 },
  ],
  sidePoints: [
    { x: 100, y: 310 },
    { x: 400, y: 310 },
  ],
};
const round = (points) =>
  points.map(({ x, y }) => [Math.round(x * 1e6) / 1e6, Math.round(y * 1e6) / 1e6]);

it('a free wall’s own side follows its centreline as drawn now; a room wall is its line', () => {
  // Moved down 50 and turned: the face stays on the same side, 10 away.
  expect(
    round(
      freeWallSide(freeWall, [
        { x: 100, y: 350 },
        { x: 100, y: 650 },
      ])
    )
  ).toEqual([
    [90, 350],
    [90, 650],
  ]);
  const roomWall = { ...freeWall, isBoundary: true, sidePoints: undefined };
  expect(freeWallSide(roomWall, roomWall.points)).toBe(roomWall.points);
});

it('the insertion mark on a free wall crosses its body from side to side', () => {
  const calls = [];
  const ctx = new Proxy(
    {},
    {
      get: (_, name) =>
        ['moveTo', 'lineTo'].includes(name)
          ? (x, y) => calls.push([name, Math.round(x * 1e6) / 1e6, Math.round(y * 1e6) / 1e6])
          : () => {},
      set: () => true,
    }
  );
  const plan = {
    zoomLevel: 1,
    gridSize: 100,
    planTheme: { accent: '#00f' },
    selectedWallId: 'free',
    walls: [freeWall],
    rooms: [{ id: 'a' }],
    wallFootprints: [
      {
        id: 'p-free',
        polygons: [
          [
            { x: 100, y: 290 },
            { x: 400, y: 290 },
            { x: 400, y: 310 },
            { x: 100, y: 310 },
          ],
        ],
      },
    ],
    getRenderedWallPoints: (wall) => wall.points,
    insertionMark: { kind: 'wall', wallId: 'free', roomId: 'a', point: { x: 200, y: 300 } },
  };
  drawInsertionMark(ctx, plan);
  // Half the thickness (10) and 6 px past each face, whichever way it is drawn.
  expect(calls.map(([, x, y]) => [x, y]).sort((a, b) => a[1] - b[1])).toEqual([
    [200, 284],
    [200, 316],
  ]);
});
