import { describe, expect, it } from 'vitest';
import {
  FULL,
  HALF,
  OUT,
  levelTheme,
  scopeLevels,
} from '../src/building-plan/draw/scope-levels.js';
import { drawWallFootprints } from '../src/building-plan/draw/walls.js';
import { DEFAULT_PLAN_THEME } from '../src/building-plan/draw/plan-theme.js';
import { BuildingPlanCanvas } from '../src/building-plan/legacy/building-plan-canvas.js';

const square = (x, y, size) => [
  { x, y },
  { x: x + size, y },
  { x: x + size, y: y + size },
  { x, y: y + size },
];

// Kitchen (k) and Hall (h) share the physical wall "shared"; "long" bounds the kitchen only.
const plan = {
  rooms: [{ id: 'k' }, { id: 'h' }],
  walls: [
    { id: 'k1', roomId: 'k', physicalWallId: 'shared' },
    { id: 'k2', roomId: 'k', physicalWallId: 'long' },
    { id: 'k3', roomId: 'k', physicalWallId: 'long' },
    { id: 'h1', roomId: 'h', physicalWallId: 'shared' },
  ],
  doors: [
    { id: 'k1:d', subjectId: 'd', roomId: 'k', physicalWallId: 'shared' },
    { id: 'h1:d', subjectId: 'd', roomId: 'h', physicalWallId: 'shared' },
  ],
  windows: [{ id: 'k2:w', subjectId: 'w', roomId: 'k', physicalWallId: 'long' }],
  columns: [{ id: 'c', roomId: 'k' }],
  beams: [],
};
const footprints = {
  shared: { id: 'shared', roomIds: ['k', 'h'] },
  long: { id: 'long', roomIds: ['k'] },
  hall: { id: 'hall', roomIds: ['h'] },
};

describe('scope levels', () => {
  it('draws everything in full without a room in scope (plan page, floor entry)', () => {
    const levels = scopeLevels({ roomId: null, focus: { collection: 'walls', id: 'k1' }, plan });
    expect(levels.of('rooms', plan.rooms[1])).toBe(FULL);
    expect(levels.of('footprints', footprints.hall)).toBe(FULL);
  });

  it('draws the room of a room entry in full and fades the rest', () => {
    const levels = scopeLevels({ roomId: 'k', focus: null, plan });
    expect(levels.of('rooms', plan.rooms[0])).toBe(FULL);
    expect(levels.of('rooms', plan.rooms[1])).toBe(OUT);
    expect(levels.of('walls', plan.walls[1])).toBe(FULL);
    expect(levels.of('walls', plan.walls[3])).toBe(OUT);
    // A wall shared with a faded room takes the level of the room in scope.
    expect(levels.of('footprints', footprints.shared)).toBe(FULL);
    expect(levels.of('footprints', footprints.hall)).toBe(OUT);
  });

  it('draws the wall of a wall entry whole and in full, with its openings', () => {
    const levels = scopeLevels({ roomId: 'k', focus: { collection: 'walls', id: 'k2' }, plan });
    expect(levels.of('walls', plan.walls[1])).toBe(FULL);
    // The same physical wall, past this side of it.
    expect(levels.of('walls', plan.walls[2])).toBe(FULL);
    expect(levels.of('footprints', footprints.long)).toBe(FULL);
    expect(levels.of('windows', plan.windows[0])).toBe(FULL);
    // The rest of the room at half strength (its outline too), the rest faded.
    expect(levels.of('rooms', plan.rooms[0])).toBe(HALF);
    expect(levels.of('walls', plan.walls[0])).toBe(HALF);
    expect(levels.of('footprints', footprints.shared)).toBe(HALF);
    expect(levels.of('doors', plan.doors[0])).toBe(HALF);
    expect(levels.of('columns', plan.columns[0])).toBe(HALF);
    expect(levels.of('doors', plan.doors[1])).toBe(OUT);
    expect(levels.of('footprints', footprints.hall)).toBe(OUT);
  });

  it('draws the opening of an opening entry in full, its wall at half strength', () => {
    const levels = scopeLevels({ roomId: 'k', focus: { collection: 'doors', id: 'k1:d' }, plan });
    expect(levels.of('doors', plan.doors[0])).toBe(FULL);
    expect(levels.of('footprints', footprints.shared)).toBe(HALF);
    expect(levels.of('windows', plan.windows[0])).toBe(HALF);
    // The face across belongs to the hall.
    expect(levels.of('doors', plan.doors[1])).toBe(OUT);
  });

  it('keeps a free wall with its room: its footprint bounds no room', () => {
    const free = { id: 'free', roomIds: [] };
    const withFree = {
      ...plan,
      walls: [...plan.walls, { id: 'k9', roomId: 'k', physicalWallId: 'free' }],
    };
    expect(scopeLevels({ roomId: 'k', focus: null, plan: withFree }).of('footprints', free)).toBe(
      FULL
    );
    const entry = scopeLevels({
      roomId: 'k',
      focus: { collection: 'walls', id: 'k9' },
      plan: withFree,
    });
    expect(entry.of('footprints', free)).toBe(FULL);
    expect(entry.of('footprints', footprints.long)).toBe(HALF);
    expect(scopeLevels({ roomId: 'h', focus: null, plan: withFree }).of('footprints', free)).toBe(
      OUT
    );
  });

  it("reads as a room entry while the entry's element isn't on the canvas", () => {
    const levels = scopeLevels({ roomId: 'k', focus: { collection: 'columns', id: 'new' }, plan });
    expect(levels.of('columns', plan.columns[0])).toBe(FULL);
    expect(levels.of('rooms', plan.rooms[0])).toBe(FULL);
  });
});

describe('tones', () => {
  const theme = DEFAULT_PLAN_THEME;

  it('keeps the theme in full, halves walls and lines, fades the rest onto the ground', () => {
    expect(levelTheme(theme, FULL)).toBe(theme);
    expect(levelTheme(theme, HALF)).toMatchObject({
      wall: theme.wallHalf,
      symbol: theme.symbolHalf,
      room: theme.room,
      label: theme.label,
    });
    expect(levelTheme(theme, OUT)).toMatchObject({
      wall: theme.wallFaint,
      symbol: theme.symbolFaint,
      room: theme.ground,
      label: theme.labelFaint,
      labelMuted: theme.labelFaint,
    });
    expect(levelTheme(theme, OUT)).toBe(levelTheme(theme, OUT));
  });
});

function recordingContext() {
  const calls = [];
  const ctx = new Proxy(
    {},
    {
      get: (target, name) =>
        name in target
          ? target[name]
          : (...args) => {
              calls.push({
                name,
                fillStyle: target.fillStyle,
                strokeStyle: target.strokeStyle,
                args,
              });
              if (name === 'setLineDash') target.lineDash = args[0];
            },
      set: (target, name, value) => ((target[name] = value), true),
    }
  );
  return { ctx, calls };
}

it('draws faded footprints first, then half, then full, in their tones', () => {
  const { ctx, calls } = recordingContext();
  const walls = [
    { id: 'a', level: FULL, polygons: [square(0, 0, 10)] },
    { id: 'b', level: OUT, polygons: [square(20, 0, 10)] },
    {
      id: 'c',
      level: HALF,
      polygons: [],
      schematicSegments: [
        {
          points: [
            { x: 0, y: 40 },
            { x: 10, y: 40 },
          ],
        },
      ],
    },
  ];
  drawWallFootprints(ctx, walls, { theme: DEFAULT_PLAN_THEME, levelOf: (wall) => wall.level });
  const theme = DEFAULT_PLAN_THEME;
  expect(calls.filter((call) => call.name === 'fill').map((call) => call.fillStyle)).toEqual([
    theme.wallFaint,
    theme.wallHalf,
    theme.wall,
  ]);
  expect(calls.filter((call) => call.name === 'stroke').map((call) => call.strokeStyle)).toEqual([
    theme.wallHalf,
  ]);
});

describe('canvas', () => {
  const canvas = (extra = {}) =>
    Object.assign(Object.create(BuildingPlanCanvas.prototype), {
      rooms: [
        { id: 'k', vertices: square(0, 0, 100) },
        { id: 'h', vertices: square(100, 0, 100) },
      ],
      walls: [],
      doors: [],
      windows: [],
      columns: [],
      beams: [],
      wallFootprints: [{ id: 'far', roomIds: ['h'], polygons: [square(300, 0, 20)] }],
      controller: { scope: { roomId: 'k' } },
      focus: null,
      mode: 'select',
      canvas: { style: {} },
      ...extra,
    });

  it('knows where the faded rooms and walls are', () => {
    const c = canvas();
    expect(c.isFadedAt({ x: 150, y: 50 })).toBe(false); // not rendered yet
    c.levels = scopeLevels({ roomId: 'k', focus: null, plan: c });
    expect(c.isFadedAt({ x: 50, y: 50 })).toBe(false);
    expect(c.isFadedAt({ x: 150, y: 50 })).toBe(true);
    expect(c.isFadedAt({ x: 310, y: 10 })).toBe(true);
    expect(c.isFadedAt({ x: 250, y: 50 })).toBe(false);
  });

  // A view-only canvas only opens: the pointing hand where a double-click does something, the
  // arrow elsewhere (C1, 2026-11-26; V1's grab hand before, the cases in the locked-pick test).
  it('shows a plain arrow over faded elements, also on a view-only canvas', () => {
    const c = canvas({ readOnly: true, getCanvasPoint: (point) => point });
    c.levels = scopeLevels({ roomId: 'k', focus: null, plan: c });
    c.handleMouseMove({ x: 150, y: 50 });
    expect(c.canvas.style.cursor).toBe('default');
    // Its own room's floor: a double-click opens nothing there.
    c.handleMouseMove({ x: 50, y: 50 });
    expect(c.canvas.style.cursor).toBe('default');
  });

  it('draws a faded room without its surface, its outline faint', () => {
    const c = canvas({ shouldShowLabel: () => false });
    c.levels = scopeLevels({ roomId: 'k', focus: null, plan: c });
    for (const [room, surface, outline] of [
      [c.rooms[0], [DEFAULT_PLAN_THEME.room], DEFAULT_PLAN_THEME.wall],
      [c.rooms[1], [], DEFAULT_PLAN_THEME.wallFaint],
    ]) {
      const { ctx, calls } = recordingContext();
      c.ctx = ctx;
      c.drawRoom({ ...room, rect: { x: 0, y: 0, width: 100, height: 100 } });
      expect(calls.filter((call) => call.name === 'fill').map((call) => call.fillStyle)).toEqual(
        surface
      );
      expect(calls.find((call) => call.name === 'stroke').strokeStyle).toBe(outline);
    }
  });
});
