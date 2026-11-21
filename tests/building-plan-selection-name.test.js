import { describe, expect, it } from 'vitest';
import { nameBeside } from '../src/building-plan/draw/selection-name.js';
import { BuildingPlanCanvas } from '../src/building-plan/legacy/building-plan-canvas.js';
import { DEFAULT_PLAN_THEME } from '../src/building-plan/draw/plan-theme.js';

describe('the name of a selected wall or opening', () => {
  const room = (point) => point.y > 0; // the room lies below the line y = 0
  const size = { width: 40, height: 10 };

  it('goes beside the middle of the line, on the room side, clear of it', () => {
    const left = { x: 0, y: 0 };
    const right = { x: 100, y: 0 };
    expect(nameBeside(left, right, { size, clearance: 6, isInside: room })).toEqual({
      x: 50,
      y: 11,
    });
    // Drawn the other way round, it still finds the room.
    expect(nameBeside(right, left, { size, clearance: 6, isInside: room })).toEqual({
      x: 50,
      y: 11,
    });
  });

  it("keeps a vertical line's name clear by half its width", () => {
    const inside = (point) => point.x > 0;
    const centre = nameBeside(
      { x: 0, y: 0 },
      { x: 0, y: 100 },
      { size, clearance: 6, isInside: inside }
    );
    expect(centre).toEqual({ x: 26, y: 50 });
  });
});

it('names a selected wall in the selection colour, while wall names are off', () => {
  const texts = [];
  const ctx = new Proxy(
    {},
    {
      get: (target, name) => {
        if (name in target) return target[name];
        if (name === 'measureText')
          return () => ({ width: 20, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 3 });
        if (name === 'fillText') return (text) => texts.push({ text, color: target.fillStyle });
        return () => {};
      },
      set: (target, name, value) => ((target[name] = value), true),
    }
  );
  const c = Object.assign(Object.create(BuildingPlanCanvas.prototype), {
    ctx,
    zoomLevel: 1,
    labelSettings: { rooms: true, walls: false },
    rooms: [
      {
        id: 'r',
        vertices: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 80 },
          { x: 0, y: 80 },
        ],
      },
    ],
    walls: [],
    selectedWallId: 'w',
  });
  const wall = {
    id: 'w',
    roomId: 'r',
    displayLabel: 'W1',
    points: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ],
  };
  c.walls = [wall];
  c.drawWall(wall);
  expect(texts).toEqual([{ text: 'W1', color: DEFAULT_PLAN_THEME.accent }]);
  expect(wall._labelRect.y).toBeGreaterThan(0); // inside the room
  texts.length = 0;
  c.selectedWallId = null;
  c.drawWall(wall);
  expect(texts).toEqual([]);
});

/** A canvas with one free wall (4a-3: by its centreline, y 90; its row's face, y 100). */
function freeWallCanvas(extra = {}) {
  const strokes = [];
  const texts = [];
  const ctx = new Proxy(
    {},
    {
      get: (target, name) => {
        if (name in target) return target[name];
        if (name === 'measureText')
          return () => ({ width: 20, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 3 });
        if (name === 'fillText') return (text, x, y) => texts.push({ text, y });
        if (name === 'stroke')
          return () => strokes.push({ color: target.strokeStyle, width: target.lineWidth });
        return () => {};
      },
      set: (target, name, value) => ((target[name] = value), true),
    }
  );
  const room = {
    id: 'r',
    vertices: [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      { x: 200, y: 200 },
      { x: 0, y: 200 },
    ],
  };
  // Its body (20 thick, 0.2 m at 100 a metre) from y 80 to 100, its row's face at y 100.
  const wall = {
    id: 'w',
    roomId: 'r',
    physicalWallId: 'p',
    isBoundary: false,
    displayLabel: 'W9',
    thickness: 0.2,
    points: [
      { x: 50, y: 90 },
      { x: 150, y: 90 },
    ],
    sidePoints: [
      { x: 50, y: 100 },
      { x: 150, y: 100 },
    ],
  };
  const c = Object.assign(Object.create(BuildingPlanCanvas.prototype), {
    ctx,
    zoomLevel: 1,
    gridSize: 100,
    labelSettings: { rooms: true, walls: false },
    rooms: [room],
    walls: [wall],
    wallFootprints: [
      {
        id: 'p',
        roomIds: [],
        polygons: [
          [
            { x: 50, y: 80 },
            { x: 150, y: 80 },
            { x: 150, y: 100 },
            { x: 50, y: 100 },
          ],
        ],
      },
    ],
    selectedWallId: 'w',
    ...extra,
  });
  c.drawWall(wall);
  const accent = DEFAULT_PLAN_THEME.accent;
  return { widths: strokes.filter((s) => s.color === accent).map((s) => s.width), texts };
}

it('shows a selected free wall as a whole, named beside its body (4a-3c)', () => {
  const { widths, texts } = freeWallCanvas();
  // Its body outlined as heavy as a selected room wall's line, then the end handles; no side line.
  expect(widths[0]).toBe(6);
  expect(widths).not.toContain(4);
  expect(texts.map((entry) => entry.text)).toEqual(['W9']);
  expect(texts[0].y > 100 || texts[0].y < 80).toBe(true); // clear of its body
});

it('in its own entry, a free wall shows its row’s side as "This side", its name across', () => {
  const { widths, texts } = freeWallCanvas({ focus: { collection: 'walls', id: 'w' } });
  expect(widths[0]).toBe(4);
  const side = texts.find((entry) => entry.text === 'This side');
  const name = texts.find((entry) => entry.text === 'W9');
  expect(side.y).toBeGreaterThan(100); // beyond its row's face
  expect(name.y).toBeLessThan(80); // across its body
});

it('draws a selected room wall up to its room’s corner, over the caps next to it', () => {
  // A face stopping short of the room's inner corner (the rest is a cap of its wall): core gives
  // its line to the corner as `extentPoints`; the highlight and its end marks follow it.
  const strokes = [];
  const marks = [];
  let path = [];
  const ctx = new Proxy(
    {},
    {
      get: (target, name) => {
        if (name in target) return target[name];
        if (name === 'measureText')
          return () => ({ width: 20, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 3 });
        if (name === 'beginPath') return () => (path = []);
        if (name === 'moveTo' || name === 'lineTo') return (x, y) => path.push([x, y]);
        if (name === 'rect') return (x, y, w, h) => marks.push([x + w / 2, y + h / 2]);
        if (name === 'stroke')
          return () => strokes.push({ path, color: target.strokeStyle, width: target.lineWidth });
        return () => {};
      },
      set: (target, name, value) => ((target[name] = value), true),
    }
  );
  const room = {
    id: 'r',
    vertices: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 80 },
      { x: 0, y: 80 },
    ],
  };
  const c = Object.assign(Object.create(BuildingPlanCanvas.prototype), {
    ctx,
    zoomLevel: 1,
    labelSettings: { rooms: true, walls: false },
    rooms: [room],
    walls: [],
    selectedWallId: 'w',
  });
  const wall = {
    id: 'w',
    roomId: 'r',
    displayLabel: 'W1.1',
    points: [
      { x: 100, y: 0 },
      { x: 20, y: 0 },
    ],
    extentPoints: [
      { x: 100, y: 0 },
      { x: 0, y: 0 },
    ],
  };
  c.walls = [wall];
  c.drawWall(wall);
  const heavy = strokes.find((stroke) => stroke.color === DEFAULT_PLAN_THEME.accent);
  expect(heavy.path).toEqual([
    [100, 0],
    [0, 0],
  ]);
  expect(marks).toEqual([
    [100, 0],
    [0, 0],
  ]);
  // Not selected: its line as it is.
  strokes.length = 0;
  c.selectedWallId = null;
  c.drawWall(wall);
  expect(strokes.every((stroke) => stroke.color !== DEFAULT_PLAN_THEME.accent)).toBe(true);
});
