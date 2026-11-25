import { expect, it, vi } from 'vitest';
import { BuildingPlanCanvas } from '../src/building-plan/legacy/building-plan-canvas.js';
import { FULL, OUT } from '../src/building-plan/draw/scope-levels.js';
import {
  drawWallBeams,
  shownWallBeams,
  wallBeamLines,
  wallBeamNameAt,
} from '../src/building-plan/draw/wall-beams.js';

// D1b (decided 2026-11-25, mockup round 2, R2): beams added by hand drawn at rest while Show ›
// Beams is on, bands while Show › Bands is on, the selected wall's own always; each stretch
// once; dashed in the room colour over the wall, the symbol colour over an opening's gap; a beam
// added by hand named outside its room; the selected wall's bands and beams listed under its name,
// top to bottom by height. A room (0..500 × 0..300, 100 units a metre): W1 along its top (axis at
// y -10, 20 cm), W3 along its bottom, shared with a room below.

const rect = (x0, y0, x1, y1) => [
  { x: x0, y: y0 },
  { x: x1, y: y0 },
  { x: x1, y: y1 },
  { x: x0, y: y1 },
];
const room = {
  id: 'bedroom',
  vertices: rect(0, 0, 500, 300),
  rect: { x: 0, y: 0, width: 500, height: 300 },
};
const beam = (id, face, wall, band, name, underside, x0, x1, y) => ({
  id: `${face}:${id}`,
  subjectId: id,
  wallId: face,
  physicalWallId: wall,
  band,
  displayLabel: name,
  underside,
  points: [
    { x: x0, y: y - 10 },
    { x: x1, y: y - 10 },
    { x: x1, y: y + 10 },
    { x: x0, y: y + 10 },
  ],
  axisPoints: [
    { x: x0, y },
    { x: x1, y },
  ],
});
const walls = [
  {
    id: 'w1',
    roomId: 'bedroom',
    physicalWallId: 'p1',
    wallBeams: ['w1:ring', 'w1:lintel', 'w1:sill'],
  },
  { id: 'w3', roomId: 'bedroom', physicalWallId: 'p3', wallBeams: ['w3:b5'] },
  { id: 'w3b', roomId: 'below', physicalWallId: 'p3', wallBeams: ['w3b:b5'] },
];
const wallBeams = [
  beam('ring', 'w1', 'p1', 'ring', 'Ring beam', 2.7, 0, 500, -10),
  beam('lintel', 'w1', 'p1', 'lintel', 'Lintel band', 2.45, 0, 500, -10),
  beam('sill', 'w1', 'p1', 'sill', 'Sill band', 0.8, 0, 500, -10),
  beam('b5', 'w3', 'p3', null, 'B#5', 2, 345, 465, 310),
  beam('b5', 'w3b', 'p3', null, 'B#5', 2, 345, 465, 310),
];
const levelOf = (collection, face) => (face.roomId === 'bedroom' ? FULL : OUT);
const shown = (layers, selectedWallId = null) =>
  shownWallBeams({ wallBeams, walls, layers, selectedWallId, levelOf }).map(
    ({ entry, level }) => `${entry.id} ${level}`
  );

it('bands only with Show › Bands or their wall selected; beams by hand while Beams is on', () => {
  // At rest: B#5 once (both rooms list it), for the room in scope.
  expect(shown({ beams: true, bands: false })).toEqual(['w3:b5 full']);
  expect(shown({ beams: true, bands: true })).toEqual([
    'w1:ring full',
    'w1:lintel full',
    'w1:sill full',
    'w3:b5 full',
  ]);
  expect(shown({ beams: false, bands: false })).toEqual([]);
  // W1 selected: its bands whatever the switches say.
  expect(shown({ beams: false, bands: false }, 'w1')).toEqual([
    'w1:ring full',
    'w1:lintel full',
    'w1:sill full',
  ]);
});

it("the selected wall's list: top to bottom by height, unknown heights last", () => {
  const format = (metres) => metres.toFixed(2);
  expect(wallBeamLines(walls[0], wallBeams, format)).toEqual([
    'Ring beam 2.70',
    'Lintel band 2.45',
    'Sill band 0.80',
  ]);
  const unknown = [
    ...wallBeams,
    { ...wallBeams[3], id: 'w3:b6', displayLabel: 'B#6', underside: null },
  ];
  expect(wallBeamLines({ wallBeams: ['w3:b6', 'w3:b5'] }, unknown, format)).toEqual([
    'B#5 2.00',
    'B#6',
  ]);
});

function recorder() {
  const calls = [];
  const ctx = new Proxy(
    {},
    {
      get: (target, name) =>
        name in target ? target[name] : (...args) => calls.push([name, ...args]),
      set: (target, name, value) => {
        calls.push([`=${String(name)}`, value]);
        return true;
      },
    }
  );
  return { ctx, calls };
}
const theme = {
  room: '#fff',
  symbol: '#111',
  accent: '#00f',
  wallHalf: '#999',
  symbolHalf: '#888',
};

it('dashed in the room colour over the wall, again in the symbol colour inside a gap', () => {
  const { ctx, calls } = recorder();
  const items = shownWallBeams({ wallBeams, walls, layers: { beams: true }, levelOf });
  drawWallBeams(ctx, items, {
    theme,
    pixel: 1,
    gapsOf: (wallId) => (wallId === 'p3' ? [rect(360, 300, 450, 320)] : []),
  });
  const strokes = calls.filter(([name]) => name === 'stroke').length;
  const colours = calls.filter(([name]) => name === '=strokeStyle').map(([, value]) => value);
  expect(strokes).toBe(2);
  expect(colours).toEqual(['#fff', '#111']);
  expect(calls.some(([name]) => name === 'clip')).toBe(true);
  expect(calls.find(([name]) => name === 'setLineDash')[1]).toEqual([5, 3]);
});

it("a beam's name stands outside the room it is drawn for", () => {
  const centre = wallBeamNameAt(wallBeams[3], {
    size: { width: 30, height: 14 },
    pixel: 1,
    inRoom: (point) => point.x >= 0 && point.x <= 500 && point.y >= 0 && point.y <= 300,
  });
  expect(centre.x).toBe(405);
  expect(centre.y).toBeGreaterThan(320);
});

function canvas(layers) {
  const { ctx, calls } = recorder();
  const labels = [];
  const plan = Object.assign(Object.create(BuildingPlanCanvas.prototype), {
    ctx,
    rooms: [room],
    walls,
    wallBeams,
    physicalOpenings: [],
    beams: [{ id: 'room-beam' }],
    layers,
    zoomLevel: 1,
    gridSize: 100,
    theme,
    labelSettings: { beams: true },
    selectedWallId: null,
    selectedBeamId: null,
  });
  plan.levelOf = levelOf;
  plan.computeLabelRect = (text) => ({ x: 0, y: 0, width: text.length * 6, height: 14 });
  plan.drawLabelBadge = (text, anchor, options) => {
    labels.push({ text, anchor, color: options?.color || null });
    return { x: anchor.x, y: anchor.y, width: 10, height: 14 };
  };
  return { plan, calls, labels };
}

it('the canvas draws them, names B#5 at rest, and hides room beams with Show › Beams off', () => {
  const on = canvas({ beams: true, bands: false });
  on.plan.drawWallBeams();
  expect(on.calls.filter(([name]) => name === 'stroke').length).toBe(1);
  expect(on.labels.map((label) => label.text)).toEqual(['B#5']);
  expect(on.plan.roomBeamShown({ id: 'room-beam' })).toBe(true);
  const off = canvas({ beams: false, bands: false });
  off.plan.drawWallBeams();
  expect(off.calls.filter(([name]) => name === 'stroke').length).toBe(0);
  expect(off.plan.roomBeamShown({ id: 'room-beam' })).toBe(false);
  off.plan.selectedBeamId = 'room-beam';
  expect(off.plan.roomBeamShown({ id: 'room-beam' })).toBe(true);
});

it("a selected wall's name has its bands and beams under it, in one block", () => {
  const { plan, labels } = canvas({ beams: true, bands: false });
  plan.nameReach = null;
  const lines = wallBeamLines(walls[0], wallBeams, (metres) => metres.toFixed(2));
  plan.drawSelectedName('W1', { x: 0, y: 0 }, { x: 500, y: 0 }, 'bedroom', 0, null, lines);
  expect(labels.map((label) => label.text)).toEqual([
    'W1',
    'Ring beam 2.70',
    'Lintel band 2.45',
    'Sill band 0.80',
  ]);
  expect(labels[0].color).toBe('#00f');
  // Inside the room, one under the other.
  const ys = labels.map((label) => label.anchor.y);
  expect(ys[0]).toBeGreaterThan(0);
  expect(ys).toEqual([...ys].sort((a, b) => a - b));
  expect(new Set(labels.map((label) => label.anchor.x)).size).toBe(1);
});
