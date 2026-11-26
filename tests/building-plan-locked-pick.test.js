import assert from 'node:assert/strict';
import { it } from 'vitest';
import { BuildingPlanCanvas } from '../src/building-plan/legacy/building-plan-canvas.js';

// A click selects on a locked canvas (decided 2026-11-26): a view-only entry (a wall's, a door's…)
// and a read-only record's floor and room entries select what a click hits, as a room's entry
// does, nothing moving. A click on nothing goes back to the entry's own element; data refreshes
// keep the pick; a hovered list row replaces it. A read-only floor canvas picks rooms.

const FIELDS = [
  'selectedRoomId',
  'selectedWallId',
  'selectedDoorId',
  'selectedWindowId',
  'selectedColumnId',
  'selectedBeamId',
  'selectedWallBeamId',
];

/** A locked canvas over the Bedroom (R1): W1 with door D1 and band B1, W2, column C1. */
function lockedCanvas({ roomId = 'R1', highlight = { collection: 'walls', id: 'W1' } } = {}) {
  const canvas = Object.assign(Object.create(BuildingPlanCanvas.prototype), {
    readOnly: true,
    // The option on (`FormRenderer`'s `buildingPlanLockedSelection`; off by default).
    lockedSelection: true,
    zoomLevel: 1,
    hits: {},
    rooms: [{ id: 'R1' }, { id: 'R2' }],
    walls: [
      { id: 'W1', roomId: 'R1' },
      { id: 'W2', roomId: 'R1' },
      { id: 'W9', roomId: 'R2' },
    ],
    doors: [{ id: 'W1:D1', roomId: 'R1' }],
    windows: [],
    columns: [{ id: 'C1', roomId: 'R1' }],
    beams: [],
    wallBeams: [{ id: 'W1:B1', roomId: 'R1' }],
    controller: { scope: { floorId: 'F1', roomId } },
    getCanvasPoint: (event) => ({ x: event.x, y: event.y }),
    findOpeningNearPoint() {
      return this.hits.door ? { type: 'door', openingId: this.hits.door } : null;
    },
    findColumnHit() {
      return this.hits.column ? { column: { id: this.hits.column, roomId: 'R1' } } : null;
    },
    findBeamHit: () => null,
    findWallNearPoint() {
      const id = this.hits.wall;
      return id ? { wall: this.walls.find((wall) => wall.id === id) } : null;
    },
    findRoomAtPoint() {
      return this.hits.room ? { id: this.hits.room } : null;
    },
    isFadedAt() {
      return Boolean(this.hits.faded);
    },
    updateButtonStates() {},
    render() {},
  });
  canvas.setHighlight(highlight);
  return canvas;
}

async function click(canvas, hits, { to = null } = {}) {
  canvas.hits = hits;
  const at = { x: 10, y: 10, button: 0 };
  canvas.pressPoint = at;
  await canvas.handleMouseDown(at);
  await canvas.handleMouseUp(to || at);
}
const selected = (canvas) =>
  Object.fromEntries(
    FIELDS.filter((field) => canvas[field]).map((field) => [field, canvas[field]])
  );

it("a click picks the door it hits; the entry's own wall goes", async () => {
  const canvas = lockedCanvas();
  assert.deepEqual(selected(canvas), { selectedWallId: 'W1' });
  await click(canvas, { door: 'W1:D1', wall: 'W1' });
  assert.deepEqual(selected(canvas), { selectedDoorId: 'W1:D1' });
  await click(canvas, { column: 'C1' });
  assert.deepEqual(selected(canvas), { selectedColumnId: 'C1' });
  await click(canvas, { wall: 'W2' });
  assert.deepEqual(selected(canvas), { selectedWallId: 'W2' });
});

it('the pick stays through data refreshes', async () => {
  const canvas = lockedCanvas();
  await click(canvas, { door: 'W1:D1' });
  canvas.applyHighlight();
  canvas.applyHighlight();
  assert.deepEqual(selected(canvas), { selectedDoorId: 'W1:D1' });
});

it("a click on nothing, or in a faded room, goes back to the entry's own element", async () => {
  const canvas = lockedCanvas();
  await click(canvas, { door: 'W1:D1' });
  await click(canvas, {});
  assert.deepEqual(selected(canvas), { selectedWallId: 'W1' });
  await click(canvas, { wall: 'W9', room: 'R2', faded: true });
  assert.deepEqual(selected(canvas), { selectedWallId: 'W1' });
});

it('a drag picks nothing', async () => {
  const canvas = lockedCanvas();
  await click(canvas, { door: 'W1:D1' }, { to: { x: 30, y: 10 } });
  assert.deepEqual(selected(canvas), { selectedWallId: 'W1' });
});

it("a hovered list row replaces the pick; when it ends, the entry's own element", async () => {
  const canvas = lockedCanvas();
  await click(canvas, { column: 'C1' });
  canvas.setHighlight({ collection: 'walls', id: 'W2' });
  assert.deepEqual(selected(canvas), { selectedWallId: 'W2' });
  canvas.setHighlight({ collection: 'walls', id: 'W1' });
  assert.deepEqual(selected(canvas), { selectedWallId: 'W1' });
});

it('an issue or the front view picks: a band stays through refreshes; none is the own element', () => {
  const canvas = lockedCanvas();
  assert.equal(canvas.selectElement({ collection: 'wallBeams', id: 'W1:B1' }), true);
  canvas.applyHighlight();
  assert.deepEqual(selected(canvas), { selectedWallBeamId: 'W1:B1' });
  assert.equal(canvas.pickElement(null), false);
  assert.deepEqual(selected(canvas), { selectedWallId: 'W1' });
  assert.equal(canvas.pickElement({ collection: 'doors', id: 'gone' }), false);
  assert.deepEqual(selected(canvas), { selectedWallId: 'W1' });
});

it("a read-only floor's canvas picks the room of what a click hits, or nothing", async () => {
  const canvas = lockedCanvas({ roomId: null, highlight: null });
  await click(canvas, { wall: 'W2', room: 'R1' });
  assert.deepEqual(selected(canvas), { selectedRoomId: 'R1' });
  await click(canvas, { room: 'R2' });
  assert.deepEqual(selected(canvas), { selectedRoomId: 'R2' });
  await click(canvas, {});
  assert.deepEqual(selected(canvas), {});
});

it('the double-click still opens what the press hit', async () => {
  const opened = [];
  const canvas = lockedCanvas();
  canvas.controller.focusColumn = (id) => opened.push(['column', id]);
  canvas.controller.focusWall = (id) => opened.push(['wall', id]);
  canvas.hits = { column: 'C1' };
  await canvas.handleMouseDown({ x: 10, y: 10, button: 0 });
  canvas.pendingFocus?.();
  canvas.hits = { wall: 'W9', faded: true };
  await canvas.handleMouseDown({ x: 10, y: 10, button: 0 });
  canvas.pendingFocus?.();
  assert.deepEqual(opened, [
    ['column', 'C1'],
    ['wall', 'W9'],
  ]);
});

// The option off, its default (decided 2026-11-26): `FormRenderer`'s `buildingPlanLockedSelection`
// false gives the old behaviour: a click selects nothing, an issue's selection isn't kept, the
// double-click still opens.
it('with picks off, a click selects nothing and an issue is selected as before', async () => {
  const opened = [];
  const canvas = lockedCanvas();
  canvas.lockedSelection = false;
  canvas.controller.focusDoor = (id) => opened.push(['door', id]);
  await click(canvas, { door: 'W1:D1' });
  assert.deepEqual(selected(canvas), { selectedWallId: 'W1' });
  canvas.pendingFocus?.();
  assert.deepEqual(opened, [['door', 'W1:D1']]);
  assert.equal(canvas.pickElement({ collection: 'doors', id: 'W1:D1' }), false);
  assert.deepEqual(selected(canvas), { selectedWallId: 'W1' });
  canvas.selectElement({ collection: 'wallBeams', id: 'W1:B1' });
  assert.deepEqual(selected(canvas), { selectedRoomId: 'R1', selectedWallBeamId: 'W1:B1' });
  canvas.applyHighlight();
  assert.deepEqual(selected(canvas), { selectedRoomId: 'R1', selectedWallId: 'W1' });
});

// The cursor on a locked canvas (C1, decided 2026-11-26): the pointing hand where a double-click
// opens or says where it opens, the arrow where it does nothing.
it('shows the pointing hand over what a double-click opens, the arrow elsewhere', () => {
  const canvas = lockedCanvas();
  canvas.focus = { collection: 'walls', id: 'W1' };
  canvas.canvas = { style: {} };
  canvas.mode = 'select';
  const over = (hits) => {
    canvas.hits = hits;
    canvas.handleMouseMove({ x: 10, y: 10 });
    return canvas.canvas.style.cursor;
  };
  assert.equal(over({ door: 'W1:D1' }), 'pointer', 'its door opens');
  assert.equal(over({ column: 'C1' }), 'pointer', 'says where it opens');
  assert.equal(over({ wall: 'W2' }), 'pointer');
  assert.equal(over({ wall: 'W1' }), 'default', 'the entry’s own wall');
  assert.equal(over({ room: 'R1' }), 'default', 'its room’s floor');
  assert.equal(over({ faded: true, wall: 'W9' }), 'default');
  assert.equal(over({}), 'default', 'the ground');
  // A read-only record's floor opens the room under the pointer.
  const floor = lockedCanvas({ roomId: null, highlight: null });
  floor.canvas = { style: {} };
  floor.mode = 'select';
  floor.hits = { room: 'R1' };
  floor.handleMouseMove({ x: 10, y: 10 });
  assert.equal(floor.canvas.style.cursor, 'pointer');
});
