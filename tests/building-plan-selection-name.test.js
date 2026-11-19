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

it('shows a selected free wall as a whole, named on its own side', () => {
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
  // Drawn along y = 100; its body (20 thick) lies above the line.
  const wall = {
    id: 'w',
    roomId: 'r',
    physicalWallId: 'p',
    isBoundary: false,
    displayLabel: 'W9',
    points: [
      { x: 50, y: 100 },
      { x: 150, y: 100 },
    ],
  };
  const c = Object.assign(Object.create(BuildingPlanCanvas.prototype), {
    ctx,
    zoomLevel: 1,
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
  });
  c.drawWall(wall);
  const accent = DEFAULT_PLAN_THEME.accent;
  // Its own side, thinner than a room wall's selection, then its whole body outlined (the end
  // handles follow).
  const widths = strokes.filter((stroke) => stroke.color === accent).map((stroke) => stroke.width);
  expect(widths.slice(0, 2)).toEqual([4, 1.5]);
  expect(texts).toHaveLength(1);
  expect(texts[0].y).toBeGreaterThan(100); // below the line, away from its body
});
