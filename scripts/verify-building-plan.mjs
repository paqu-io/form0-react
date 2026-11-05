// Optional real-pointer gate. Reuses a supplied browser; installs no consumer dependencies.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { build } from 'esbuild';
const root = fileURLToPath(new URL('../', import.meta.url));
const core = process.env.FORM0_CORE_ENTRY || path.resolve(root, '../form0-core/src/index.js');
const bundle = await build({
  stdin: {
    loader: 'jsx',
    resolveDir: root,
    contents: `
    import React from 'react';
    import {createRoot} from 'react-dom/client';
    import {FormRenderer} from './dist/index.js';
    import './dist/index.css';
    import {createBuildingPlanSession, expandBuildingPlanSchema, writeBuildingPlanRecord} from 'form0-core';
    const schema = {form:{name:'BuildingPlan pointer verification',elements:[{type:'BuildingPlanSection',key:'plan',data_name:'plan',label:'Plan',description:null,description_mode:null,visible:true,visible_conditions:null,read_only:false,read_only_conditions:null,node_overrides:null}]}};
    const expanded = expandBuildingPlanSchema(schema);
    const meta = expanded.buildingPlanMeta[0];
    const session = createBuildingPlanSession();
    session.apply({type:'create_floor', values:{floor_name:{choice:[{value:'ground_floor',label:'Ground Floor'}],other:[]},floor_elevation_m:0,floor_height_m:3}, defaults:{wall_height_m:3}});
    const record = writeBuildingPlanRecord({meta,plan:session.getSnapshot()});
    window.fixture = {meta};
    const options={events:{recordKind:'existing',lifecycle:true},diagnostics:{console:false}};
    createRoot(document.getElementById('root')).render(<FormRenderer schema={schema} initialSnapshot={JSON.parse(localStorage.getItem('building-plan-record') || 'null') || {raw_values:{},repeatable:record.repeatable}} mode='edit' repeatableEntryMode='edit' engineOptions={options} onSnapshotChange={(snapshot)=>{window.snapshot=snapshot;localStorage.setItem('building-plan-record',JSON.stringify(snapshot));}} />);
  `,
  },
  bundle: true,
  format: 'esm',
  write: false,
  outfile: '/preview/app.js',
  alias: { 'form0-core': core },
  loader: { '.woff2': 'file' },
  define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'warning',
});
const assets = new Map(
  bundle.outputFiles.map((file) => [file.path.replace('/preview', ''), file.contents])
);
const server = createServer((req, res) => {
  if (req.url === '/') {
    res.setHeader('Content-Type', 'text/html');
    res.end(
      '<html><head><link rel="stylesheet" href="/app.css"></head><body style="margin:0"><div id="root"></div><script type="module" src="/app.js"></script></body></html>'
    );
    return;
  }
  const asset = assets.get(req.url);
  if (!asset) {
    res.statusCode = 404;
    res.end();
    return;
  }
  res.setHeader(
    'Content-Type',
    req.url.endsWith('.css')
      ? 'text/css'
      : req.url.endsWith('.js')
        ? 'text/javascript'
        : 'font/woff2'
  );
  res.end(asset);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { chromium } = await import(process.env.FORM0_PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({
  headless: true,
  ...(process.env.FORM0_CHROMIUM_EXECUTABLE
    ? { executablePath: process.env.FORM0_CHROMIUM_EXECUTABLE }
    : {}),
});
const { createBuildingPlanSession, writeBuildingPlanRecord, readBuildingPlanRecord } = await import(
  core
);
async function canvasBox(canvas) {
  const box = await canvas.boundingBox();
  const offset = await canvas.evaluate((element) => {
    const ctx = element.getContext('2d');
    const matrix = ctx.buildingPlanView || ctx.getTransform();
    return { x: matrix.e, y: matrix.f };
  });
  return { ...box, x: box.x + offset.x, y: box.y + offset.y };
}
const evidence = [];
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.setDefaultTimeout(10000);
  // This renderer restores the context transform after painting. Capture the scene transform
  // immediately after its clear so real pointer coordinates and pixel samples use that view.
  await page.addInitScript(() => {
    const prototype = CanvasRenderingContext2D.prototype;
    const clear = prototype.clearRect,
      transform = prototype.setTransform;
    prototype.clearRect = function (...args) {
      this.captureBuildingPlanView = true;
      return clear.apply(this, args);
    };
    prototype.setTransform = function (a, b, c, d, e, f) {
      if (this.captureBuildingPlanView) {
        this.buildingPlanView = { a, b, c, d, e, f };
        this.captureBuildingPlanView = false;
      }
      return transform.call(this, a, b, c, d, e, f);
    };
  });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.stack));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.getByRole('button', { name: 'View', exact: true }).click();
  await page.getByRole('button', { name: 'View', exact: true }).last().click();
  const floor = page.getByRole('dialog', { name: 'Floors', exact: true });
  await floor.waitFor();
  await floor.getByRole('button', { name: 'Draw Room', exact: true }).click();
  const canvas = floor.locator('canvas');
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvasBox(canvas);
  assert.ok(box.width > 300, `Styled floor canvas must remain usable; width ${box.width}`);
  const baseline = await page.evaluate(() => JSON.stringify(window.snapshot.repeatable));
  await page.mouse.move(box.x + 80, box.y + 80);
  await page.mouse.wheel(0, -160);
  await page.keyboard.down('Shift');
  await page.mouse.down();
  await page.mouse.move(box.x + 180, box.y + 130, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.up('Shift');
  assert.equal(await page.evaluate(() => JSON.stringify(window.snapshot.repeatable)), baseline);
  await floor.getByRole('button', { name: 'Reset zoom to 100%', exact: true }).click();
  evidence.push({
    scenario: 'wheel zoom and shift pan preserve accepted form answers',
    passed: true,
  });
  await page.mouse.move(box.x + 60, box.y + 60);
  await page.mouse.down();
  await page.mouse.move(box.x + 220, box.y + 180, { steps: 8 });
  await page.keyboard.press('Escape');
  await page.mouse.up();
  assert.equal(await page.getByRole('dialog', { name: 'Rooms', exact: true }).count(), 0);
  assert.equal(await page.evaluate(() => JSON.stringify(window.snapshot.repeatable)), baseline);
  evidence.push({
    scenario: 'Escape discards a live drawing gesture without opening a row',
    passed: true,
  });

  await page.mouse.move(box.x + 60, box.y + 60);
  await page.mouse.down();
  await page.mouse.move(box.x + 220, box.y + 180, { steps: 12 });
  await page.mouse.up();
  const room = page.getByRole('dialog', { name: 'Rooms', exact: true });
  await room.waitFor();
  await room.locator('select').first().selectOption('bedroom');
  await room.getByRole('button', { name: 'Save', exact: true }).click();
  await room.waitFor({ state: 'detached' });
  await floor.getByRole('button', { name: 'Save', exact: true }).click();
  await floor.waitFor({ state: 'detached' });
  const saved = await page.evaluate(() => ({
    snapshot: window.snapshot,
    meta: window.fixture.meta,
  }));
  const nodes = saved.meta.repeatablesByNodeKey;
  const floorRecord = saved.snapshot.repeatable[nodes.floors.preferredKey][0];
  assert.equal(floorRecord.repeatable[nodes.rooms.preferredKey].length, 1);
  assert.equal(floorRecord.repeatable[nodes.physical_walls.preferredKey].length, 4);
  assert.deepEqual(errors, []);
  evidence.push({
    scenario:
      'actual rectangle pointer input opens its standard room row and saves one canonical floor',
    passed: true,
  });
  const rootCanvas = page.locator('canvas');
  await rootCanvas.scrollIntoViewIfNeeded();
  const rootBox = await canvasBox(rootCanvas);
  await page.mouse.click(rootBox.x + 120, rootBox.y + 120);
  await page.getByRole('dialog', { name: 'Rooms', exact: true }).waitFor();
  assert.equal(
    await page
      .getByRole('dialog', { name: 'Rooms', exact: true })
      .locator('select')
      .first()
      .inputValue(),
    'bedroom'
  );
  await page
    .getByRole('dialog', { name: 'Rooms', exact: true })
    .getByRole('button', { name: 'Cancel', exact: true })
    .click();
  await page
    .getByRole('dialog', { name: 'Floors', exact: true })
    .getByRole('button', { name: 'Cancel', exact: true })
    .click();
  evidence.push({
    scenario: 'root canvas selection reaches the associated standard room editor',
    passed: true,
  });
  await page.reload();
  await page.waitForFunction(() => window.snapshot);
  const restored = await page.evaluate(() => window.snapshot.repeatable);
  assert.deepEqual(restored, saved.snapshot.repeatable);
  evidence.push({
    scenario: 'saved canonical layout reloads without changing row or subject identities',
    passed: true,
  });
  // Repeat the shared-face regressions through the actual React pointer adapter.
  const fixture = await page.evaluate(() => window.fixture);
  const shared = createBuildingPlanSession();
  const floorId = shared.apply({
    type: 'create_floor',
    values: {
      floor_name: { choice: [{ value: 'ground_floor', label: 'Ground Floor' }], other: [] },
      floor_elevation_m: 0,
      floor_height_m: 3,
    },
    defaults: { wall_height_m: 3 },
  }).created.id;
  for (const rectangle of [
    { x: 0, y: 0, width: 5, height: 3 },
    { x: 3, y: 3.2, width: 5, height: 3 },
  ])
    shared.apply({
      type: 'create_room',
      floorId,
      rectangle,
      values: { room_name: { choice: [{ value: 'bedroom', label: 'Bedroom' }], other: [] } },
    });
  const sharedFloor = shared.getSnapshot().floors[0];
  assert.equal(
    shared.apply({
      type: 'bind_faces',
      floorId,
      referenceFaceId: sharedFloor.rooms[0].faces[2].id,
      faceId: sharedFloor.rooms[1].faces[0].id,
    }).status,
    'applied'
  );
  const sharedDoor = shared.apply({
    type: 'create_opening',
    floorId,
    wallId: sharedFloor.rooms[0].faces[2].wallId,
    kind: 'door',
    offset: 3.5,
    width: 0.9,
    height: 2,
    values: { door_label: 'Shared door' },
  });
  assert.equal(sharedDoor.status, 'applied');
  const sharedRecord = writeBuildingPlanRecord({ meta: fixture.meta, plan: shared.getSnapshot() });
  await page.evaluate(
    (record) =>
      localStorage.setItem(
        'building-plan-record',
        JSON.stringify({ raw_values: {}, repeatable: record.repeatable })
      ),
    sharedRecord
  );
  await page.reload();
  await page.getByRole('button', { name: 'View', exact: true }).click();
  await page.getByRole('button', { name: 'View', exact: true }).last().click();
  const sharedDialog = page.getByRole('dialog', { name: 'Floors', exact: true });
  const sharedCanvas = sharedDialog.locator('canvas');
  await sharedCanvas.scrollIntoViewIfNeeded();
  let sharedBox = await canvasBox(sharedCanvas);
  async function openSharedRoom(position = [40, 25]) {
    await sharedCanvas.scrollIntoViewIfNeeded();
    const currentBox = await canvasBox(sharedCanvas);
    await page.mouse.click(currentBox.x + position[0], currentBox.y + position[1]);
    const roomDialog = page.getByRole('dialog', { name: 'Rooms', exact: true });
    await roomDialog.waitFor();
    await roomDialog.locator('canvas').scrollIntoViewIfNeeded();
    sharedBox = await canvasBox(roomDialog.locator('canvas'));
    return roomDialog;
  }
  let activeRoom = await openSharedRoom();
  // Inspect physical corner material without the new vertex-selection handle overlay.
  await activeRoom.getByRole('button', { name: 'Pin / unpin', exact: true }).click();
  const colors = await activeRoom.locator('canvas').evaluate((element) => {
    const ctx = element.getContext('2d');
    const m = ctx.buildingPlanView || ctx.getTransform();
    const pixel = (x, y) =>
      [...ctx.getImageData(Math.round(x * m.a + m.e), Math.round(y * m.d + m.f), 1, 1).data].slice(
        0,
        3
      );
    return {
      frame: { x: m.e, y: m.f, scale: m.a },
      exterior: pixel(-2, -2),
      material: pixel(30, 62),
      door: pixel(81, 62),
      above: pixel(81, 57),
      below: pixel(81, 67),
    };
  });
  assert.deepEqual(colors.exterior, [68, 68, 68], JSON.stringify(colors));
  assert.deepEqual(colors.material, [68, 68, 68]);
  assert.deepEqual(colors.door, [43, 138, 62]);
  assert.notDeepEqual(colors.above, colors.door);
  assert.notDeepEqual(colors.below, colors.door);
  await activeRoom.getByRole('button', { name: 'Select', exact: true }).click();
  evidence.push({
    scenario: 'shared wall material and one canonical opening occupy the actual thickness',
    passed: true,
  });
  // Capture actual black/blue strokes, checking both the compound jog and the old extra edge.
  await page.evaluate(() => {
    window.wallStrokes = [];
    const p = CanvasRenderingContext2D.prototype;
    const begin = p.beginPath,
      move = p.moveTo,
      line = p.lineTo,
      stroke = p.stroke;
    p.beginPath = function (...args) {
      this.wallPath = [];
      return begin.apply(this, args);
    };
    p.moveTo = function (x, y) {
      this.wallPath?.push({ x, y, move: true });
      return move.call(this, x, y);
    };
    p.lineTo = function (x, y) {
      this.wallPath?.push({ x, y });
      return line.call(this, x, y);
    };
    p.stroke = function (...args) {
      if (this.canvas === document.querySelector('[role="dialog"][aria-label="Rooms"] canvas'))
        window.wallStrokes.push({ style: this.strokeStyle, points: [...(this.wallPath || [])] });
      return stroke.apply(this, args);
    };
  });
  const wallState = () =>
    page.evaluate(() => ({ snapshot: window.snapshot, strokes: window.wallStrokes }));
  for (const [from, to, bypass] of [
    [60, 64, true],
    [64, 56, true],
    [56, 62, false],
  ]) {
    if (bypass) await page.keyboard.down('Alt');
    await page.mouse.move(sharedBox.x + 40, sharedBox.y + from);
    await page.mouse.down();
    await page.mouse.move(sharedBox.x + 40, sharedBox.y + to, { steps: 8 });
    await page.mouse.up();
    if (bypass) await page.keyboard.up('Alt');
    await page.waitForTimeout(150);
    assert.equal(
      await page.getByRole('dialog', { name: 'Walls', exact: true }).count(),
      0,
      'Dragging must not navigate'
    );
    // Save to observe the canonical accepted output, then reopen the ordinary floor editor.
    await activeRoom.getByRole('button', { name: 'Save', exact: true }).click();
    await activeRoom.waitFor({ state: 'detached' });
    await sharedDialog.getByRole('button', { name: 'Save', exact: true }).click();
    await sharedDialog.waitFor({ state: 'detached' });
    const accepted = await wallState();
    const plan = readBuildingPlanRecord({
      meta: fixture.meta,
      record: { values: {}, repeatable: accepted.snapshot.repeatable },
    });
    assert.equal(plan.floors[0].rooms[1].faces.length, bypass ? 6 : 4);
    assert.equal(plan.floors[0].walls.length, bypass ? 9 : 7);
    for (const stroke of accepted.strokes)
      for (let i = 1; i < stroke.points.length; i++) {
        const a = stroke.points[i - 1],
          b = stroke.points[i];
        if (!b.move && ['#343a40', '#3a6fb0', '#1b4b91'].includes(stroke.style))
          assert.ok(
            Math.abs(a.x - b.x) < 1e-6 || Math.abs(a.y - b.y) < 1e-6,
            'No diagonal wall or room stroke'
          );
      }
    await page.getByRole('button', { name: 'View', exact: true }).last().click();
    await sharedDialog.waitFor();
    activeRoom = await openSharedRoom();
  }
  const magnet = activeRoom.getByRole('button', { name: 'Magnetic alignment', exact: true });
  await magnet.click();
  assert.equal(await magnet.getAttribute('aria-pressed'), 'false');
  await magnet.click();
  assert.equal(await magnet.getAttribute('aria-pressed'), 'true');
  evidence.push({
    scenario:
      'shared jogs expose six rows, draw orthogonal paths, realign magnetically and preserve standard Save controls',
    passed: true,
  });
  await activeRoom.getByRole('button', { name: 'Cancel', exact: true }).click();
  await activeRoom.waitFor({ state: 'detached' });
  await sharedCanvas.scrollIntoViewIfNeeded();
  const floorBox = await canvasBox(sharedCanvas);
  await page.mouse.click(floorBox.x + 130, floorBox.y + 100);
  const secondRoom = page.getByRole('dialog', { name: 'Rooms', exact: true });
  await secondRoom.waitFor();
  await secondRoom.locator('canvas').scrollIntoViewIfNeeded();
  let secondBox = await canvasBox(secondRoom.locator('canvas'));
  let remove = false,
    prompts = 0;
  page.on('dialog', (dialog) => {
    prompts++;
    assert.match(dialog.message(), /Shared door/);
    return remove ? dialog.accept() : dialog.dismiss();
  });
  async function cutOpening() {
    await secondRoom.locator('canvas').scrollIntoViewIfNeeded();
    secondBox = await canvasBox(secondRoom.locator('canvas'));
    await page.keyboard.down('Alt');
    await page.mouse.move(secondBox.x + 60, secondBox.y + 100);
    await page.mouse.down();
    await page.mouse.move(secondBox.x + 80, secondBox.y + 100, { steps: 8 });
    await page.mouse.up();
    await page.keyboard.up('Alt');
    await page.waitForTimeout(150);
  }
  const surfaceBefore = await canvasBox(secondRoom.locator('canvas'));
  await cutOpening();
  assert.equal(prompts, 1);
  const surfaceAfter = await canvasBox(secondRoom.locator('canvas'));
  assert.equal(
    surfaceAfter.y,
    surfaceBefore.y,
    'Conflict feedback must not move the drawing surface'
  );
  remove = true;
  await cutOpening();
  assert.equal(prompts, 2);
  await secondRoom.getByRole('button', { name: 'Save', exact: true }).click();
  await secondRoom.waitFor({ state: 'detached' });
  await sharedDialog.getByRole('button', { name: 'Save', exact: true }).click();
  await sharedDialog.waitFor({ state: 'detached' });
  const removed = await page.evaluate(() => window.snapshot.repeatable);
  const removedPlan = readBuildingPlanRecord({
    meta: fixture.meta,
    record: { values: {}, repeatable: removed },
  });
  assert.equal(removedPlan.floors[0].walls.flatMap((wall) => wall.doors).length, 0);
  assert.equal(removedPlan.floors[0].rooms[1].vertices[0].x, 4);
  evidence.push({
    scenario:
      'a partial opening cut offers cancel or explicit removal through the existing nested editor workflow',
    passed: true,
  });
  await page.evaluate(
    (record) =>
      localStorage.setItem(
        'building-plan-record',
        JSON.stringify({ raw_values: {}, repeatable: record.repeatable })
      ),
    sharedRecord
  );
  await page.reload();
  await page.getByRole('button', { name: 'View', exact: true }).click();
  await page.getByRole('button', { name: 'View', exact: true }).last().click();
  await sharedDialog.waitFor();
  activeRoom = await openSharedRoom();
  for (const [from, to, bypass] of [
    [[40, 60], [40, 72], true],
    [[100, 30], [92, 30], true],
    [[92, 30], [96, 30], true],
    [[40, 72], [40, 56], true],
  ]) {
    await activeRoom.locator('canvas').scrollIntoViewIfNeeded();
    const box = await canvasBox(activeRoom.locator('canvas'));
    if (bypass) await page.keyboard.down('Alt');
    await page.mouse.move(box.x + from[0], box.y + from[1]);
    await page.mouse.down();
    await page.mouse.move(box.x + to[0], box.y + to[1], { steps: 8 });
    await page.mouse.up();
    if (bypass) await page.keyboard.up('Alt');
    await page.waitForTimeout(150);
  }
  assert.equal(await page.getByRole('dialog', { name: 'Walls', exact: true }).count(), 0);
  await activeRoom.getByRole('button', { name: 'Save', exact: true }).click();
  await activeRoom.waitFor({ state: 'detached' });
  await sharedDialog.getByRole('button', { name: 'Save', exact: true }).click();
  await sharedDialog.waitFor({ state: 'detached' });
  const junctionPlan = readBuildingPlanRecord({
    meta: fixture.meta,
    record: { values: {}, repeatable: await page.evaluate(() => window.snapshot.repeatable) },
  });
  assert.equal(junctionPlan.floors[0].rooms[0].vertices[1].x, 4.8);
  assert.equal(junctionPlan.floors[0].rooms[1].vertices.length, 6);
  evidence.push({
    scenario:
      'the supplied W3/W2 shared-corner sequence stays linked and saves without the narrow dent',
    passed: true,
  });
  async function reloadShared() {
    await page.evaluate(
      (record) =>
        localStorage.setItem(
          'building-plan-record',
          JSON.stringify({ raw_values: {}, repeatable: record.repeatable })
        ),
      sharedRecord
    );
    await page.reload();
    await page.getByRole('button', { name: 'View', exact: true }).click();
    await page.getByRole('button', { name: 'View', exact: true }).last().click();
    await sharedDialog.waitFor();
  }
  await reloadShared();
  activeRoom = await openSharedRoom();
  let current = await canvasBox(activeRoom.locator('canvas'));
  await page.keyboard.down('Alt');
  await page.mouse.move(current.x + 40, current.y + 60);
  await page.mouse.down();
  await page.mouse.move(current.x + 40, current.y + 72, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.up('Alt');
  await page.waitForTimeout(150);
  // Clear the resize handle before sampling the short return's material.
  await page.mouse.click(current.x + 250, current.y + 200);
  await activeRoom.getByRole('button', { name: 'Pin / unpin', exact: true }).click();
  await page.waitForTimeout(150);
  const returnColors = await activeRoom.locator('canvas').evaluate((element) => {
    const ctx = element.getContext('2d'),
      m = ctx.buildingPlanView || ctx.getTransform();
    const pixel = (x, y) =>
      [...ctx.getImageData(Math.round(x * m.a + m.e), Math.round(y * m.d + m.f), 1, 1).data].slice(
        0,
        3
      );
    // Sample below the label, with corner-selection overlays hidden by the pin tool.
    return { band: pixel(102, 70), interior: pixel(98, 70) };
  });
  await activeRoom.getByRole('button', { name: 'Save', exact: true }).click();
  await activeRoom.waitFor({ state: 'detached' });
  await sharedDialog.getByRole('button', { name: 'Save', exact: true }).click();
  await sharedDialog.waitFor({ state: 'detached' });
  const bandPlan = readBuildingPlanRecord({
    meta: fixture.meta,
    record: { values: {}, repeatable: await page.evaluate(() => window.snapshot.repeatable) },
  });
  const stableRight = sharedFloor.rooms[0].faces[1].wallId;
  assert.ok(bandPlan.floors[0].rooms[1].vertices.some((v) => v.x === 5.2));
  assert.ok(bandPlan.floors[0].rooms[1].faces.some((f) => f.wallId === stableRight));
  assert.deepEqual(returnColors.band, [68, 68, 68]);
  assert.notDeepEqual(returnColors.interior, [68, 68, 68]);
  evidence.push({
    scenario: 'a jog return shares the existing construction and draws one 0.20 m band',
    passed: true,
  });
  await reloadShared();
  await sharedCanvas.scrollIntoViewIfNeeded();
  current = await canvasBox(sharedCanvas);
  await page.keyboard.down('Alt');
  await page.mouse.move(current.x + 40, current.y + 25);
  await page.mouse.down();
  await page.mouse.move(current.x - 160, current.y + 25, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.up('Alt');
  await page.waitForTimeout(150);
  await sharedDialog.getByRole('button', { name: 'Save', exact: true }).click();
  await sharedDialog.waitFor({ state: 'detached' });
  const detached = readBuildingPlanRecord({
    meta: fixture.meta,
    record: { values: {}, repeatable: await page.evaluate(() => window.snapshot.repeatable) },
  });
  const stableShared = shared.getSnapshot().floors[0].walls.find((w) => w.doors.length);
  const stationary = detached.floors[0].walls.find((w) => w.id === stableShared.id);
  assert.deepEqual([stationary.segments[0].start.x, stationary.segments[0].end.x], [8, 3]);
  assert.equal(stationary.doors[0].id, stableShared.doors[0].id);
  assert.equal(stationary.doors[0].width, 0.9);
  evidence.push({
    scenario: 'room detachment saves trimmed stationary extents while retaining the shared door',
    passed: true,
  });
  await reloadShared();
  assert.equal(
    await sharedDialog.getByRole('button', { name: 'Split', exact: true }).isDisabled(),
    true
  );
  activeRoom = await openSharedRoom();
  await activeRoom.getByRole('button', { name: 'Split', exact: true }).click();
  let cutCanvas = activeRoom.locator('canvas');
  await cutCanvas.scrollIntoViewIfNeeded();
  current = await canvasBox(cutCanvas);
  await page.keyboard.down('Alt');
  await page.mouse.move(current.x + 70, current.y + 60);
  await page.mouse.down();
  await page.mouse.up();
  await page.keyboard.up('Alt');
  await page.waitForTimeout(150);
  await activeRoom.getByRole('button', { name: 'Save', exact: true }).click();
  await activeRoom.waitFor({ state: 'detached' });
  await sharedDialog.getByRole('button', { name: 'Save', exact: true }).click();
  await sharedDialog.waitFor({ state: 'detached' });
  const cutPlan = readBuildingPlanRecord({
    meta: fixture.meta,
    record: { values: {}, repeatable: await page.evaluate(() => window.snapshot.repeatable) },
  });
  assert.ok(cutPlan.floors[0].rooms.every((room) => room.faces.length === 5));
  assert.equal(cutPlan.floors[0].walls.length, 7);
  await page.reload();
  await page.getByRole('button', { name: 'View', exact: true }).click();
  await page.getByRole('button', { name: 'View', exact: true }).last().click();
  activeRoom = await openSharedRoom();
  await activeRoom.getByRole('button', { name: 'Rejoin', exact: true }).click();
  cutCanvas = activeRoom.locator('canvas');
  await cutCanvas.scrollIntoViewIfNeeded();
  current = await canvasBox(cutCanvas);
  await page.mouse.move(current.x + 70, current.y + 60);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(150);
  await activeRoom.getByRole('button', { name: 'Save', exact: true }).click();
  await activeRoom.waitFor({ state: 'detached' });
  await sharedDialog.getByRole('button', { name: 'Save', exact: true }).click();
  await sharedDialog.waitFor({ state: 'detached' });
  const rejoined = readBuildingPlanRecord({
    meta: fixture.meta,
    record: { values: {}, repeatable: await page.evaluate(() => window.snapshot.repeatable) },
  });
  assert.ok(rejoined.floors[0].rooms.every((room) => room.faces.length === 4));
  evidence.push({
    scenario:
      'room-scoped Split saves shared portions and Rejoin survives reload through normal Save controls',
    passed: true,
  });
  const partitionDomain = createBuildingPlanSession({ snapshot: shared.getSnapshot() });
  partitionDomain.apply({
    type: 'create_wall',
    floorId,
    roomId: sharedFloor.rooms[0].id,
    vertices: [
      { x: 1, y: 1 },
      { x: 4, y: 1 },
    ],
  });
  const partitionRecord = writeBuildingPlanRecord({
    meta: fixture.meta,
    plan: partitionDomain.getSnapshot(),
  });
  await page.evaluate(
    (record) =>
      localStorage.setItem(
        'building-plan-record',
        JSON.stringify({ raw_values: {}, repeatable: record.repeatable })
      ),
    partitionRecord
  );
  await page.reload();
  await page.getByRole('button', { name: 'View', exact: true }).click();
  await page.getByRole('button', { name: 'View', exact: true }).last().click();
  activeRoom = await openSharedRoom([10, 30]);
  await activeRoom.getByRole('button', { name: 'Split', exact: true }).click();
  let partitionCanvas = activeRoom.locator('canvas');
  await partitionCanvas.scrollIntoViewIfNeeded();
  current = await canvasBox(partitionCanvas);
  await page.mouse.move(current.x + 40, current.y + 20);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(150);
  await activeRoom.getByRole('button', { name: 'Select', exact: true }).click();
  const dragActiveWall = async (from, to, bypass = false) => {
    partitionCanvas = activeRoom.locator('canvas');
    await partitionCanvas.scrollIntoViewIfNeeded();
    current = await canvasBox(partitionCanvas);
    if (bypass) await page.keyboard.down('Alt');
    await page.mouse.move(current.x + from[0], current.y + from[1]);
    await page.mouse.down();
    await page.mouse.move(current.x + to[0], current.y + to[1], { steps: 8 });
    await page.mouse.up();
    if (bypass) await page.keyboard.up('Alt');
    await page.waitForTimeout(150);
  };
  const saveActiveRoom = async () => {
    await activeRoom.getByRole('button', { name: 'Save', exact: true }).click();
    await activeRoom.waitFor({ state: 'detached' });
    await sharedDialog.getByRole('button', { name: 'Save', exact: true }).click();
    await sharedDialog.waitFor({ state: 'detached' });
    return readBuildingPlanRecord({
      meta: fixture.meta,
      record: { values: {}, repeatable: await page.evaluate(() => window.snapshot.repeatable) },
    });
  };
  await dragActiveWall([60, 20], [66, 32], true);
  let partitionPlan = await saveActiveRoom();
  assert.equal(partitionPlan.floors[0].rooms[0].faces.filter((face) => face.freePath).length, 3);
  await page.getByRole('button', { name: 'View', exact: true }).last().click();
  activeRoom = await openSharedRoom([10, 30]);
  await dragActiveWall([60, 32], [60, 21]);
  await activeRoom.getByRole('button', { name: 'Rejoin', exact: true }).click();
  current = await canvasBox(activeRoom.locator('canvas'));
  await page.mouse.move(current.x + 40, current.y + 20);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(150);
  partitionPlan = await saveActiveRoom();
  assert.equal(partitionPlan.floors[0].rooms[0].faces.filter((face) => face.freePath).length, 1);
  evidence.push({
    scenario: 'a cut partition moves locally and saves, then magnetically straightens and Rejoins',
    passed: true,
  });
  for (const axis of ['x', 'y']) {
    const domain = createBuildingPlanSession({ snapshot: shared.getSnapshot() });
    assert.equal(
      domain.apply({
        type: 'split_face',
        floorId,
        faceId: sharedFloor.rooms[0].faces[axis === 'x' ? 3 : 0].id,
        offset: axis === 'x' ? 1.5 : 2,
      }).status,
      'applied'
    );
    const before = domain.getSnapshot();
    const seed = writeBuildingPlanRecord({ meta: fixture.meta, plan: before });
    await page.evaluate(
      (record) =>
        localStorage.setItem(
          'building-plan-record',
          JSON.stringify({ raw_values: {}, repeatable: record.repeatable })
        ),
      seed
    );
    await page.reload();
    await page.getByRole('button', { name: 'View', exact: true }).click();
    await page.getByRole('button', { name: 'View', exact: true }).last().click();
    activeRoom = await openSharedRoom([20, 30]);
    await dragActiveWall(
      axis === 'x' ? [0, 45] : [20, 0],
      axis === 'x' ? [12, 45] : [20, 12],
      true
    );
    await dragActiveWall(axis === 'x' ? [12, 45] : [20, 12], axis === 'x' ? [2, 45] : [20, 2]);
    const aligned = await saveActiveRoom();
    assert.deepEqual(
      aligned.floors[0].rooms[0].vertices.map(({ x, y }) => [x, y]),
      before.floors[0].rooms[0].vertices.map(({ x, y }) => [x, y])
    );
    assert.equal(aligned.floors[0].rooms[0].faces.length, 5);
    await page.getByRole('button', { name: 'View', exact: true }).last().click();
    activeRoom = await openSharedRoom([20, 30]);
    await activeRoom.getByRole('button', { name: 'Rejoin', exact: true }).click();
    const box = await canvasBox(activeRoom.locator('canvas')),
      point = axis === 'x' ? [0, 30] : [40, 0];
    await page.mouse.click(box.x + point[0], box.y + point[1]);
    await page.waitForTimeout(150);
    assert.equal((await saveActiveRoom()).floors[0].rooms[0].faces.length, 4);
    evidence.push({
      scenario: `stationary extension realignment and Rejoin (${axis})`,
      passed: true,
    });
  }
  const thicknessDomain = createBuildingPlanSession({ snapshot: shared.getSnapshot() });
  assert.equal(
    thicknessDomain.apply({
      type: 'split_face',
      floorId,
      faceId: sharedFloor.rooms[1].faces[0].id,
      offset: 2,
    }).status,
    'applied'
  );
  const thicknessSeed = writeBuildingPlanRecord({
    meta: fixture.meta,
    plan: thicknessDomain.getSnapshot(),
  });
  await page.evaluate(
    (record) =>
      localStorage.setItem(
        'building-plan-record',
        JSON.stringify({ raw_values: {}, repeatable: record.repeatable })
      ),
    thicknessSeed
  );
  await page.reload();
  await page.getByRole('button', { name: 'View', exact: true }).click();
  await page.getByRole('button', { name: 'View', exact: true }).last().click();
  activeRoom = await openSharedRoom([130, 90]);
  const openThickness = async () => {
    await activeRoom.locator('canvas').scrollIntoViewIfNeeded();
    const box = await canvasBox(activeRoom.locator('canvas'));
    await page.mouse.click(box.x + 130, box.y + 64);
    const dialog = page.getByRole('dialog', { name: 'Walls', exact: true });
    await dialog.waitFor();
    return dialog;
  };
  let wallDialog = await openThickness();
  const thicknessSelector = `input[name="${fixture.meta.repeatablesByNodeKey.walls.fieldsByOriginalDataName.wall_thickness_m.dataName}"]`;
  let thicknessInput = wallDialog.locator(thicknessSelector);
  assert.equal(await thicknessInput.count(), 1);
  await thicknessInput.fill('0.4');
  await thicknessInput.press('Tab');
  await wallDialog.getByText(/this wall portion/).waitFor();
  await wallDialog.getByRole('button', { name: 'Save', exact: true }).click();
  await wallDialog.waitFor({ state: 'detached' });
  const thicknessCanvas = activeRoom.locator('canvas');
  await thicknessCanvas.scrollIntoViewIfNeeded();
  current = await canvasBox(thicknessCanvas);
  await page.mouse.click(current.x + 250, current.y + 200);
  await page.waitForTimeout(150);
  const profilePixels = await thicknessCanvas.evaluate((element) => {
    const context = element.getContext('2d'),
      matrix = context.buildingPlanView || context.getTransform();
    const pixel = (x, y) =>
      [
        ...context.getImageData(
          Math.round(x * matrix.a + matrix.e),
          Math.round(y * matrix.d + matrix.f),
          1,
          1
        ).data,
      ].slice(0, 3);
    return {
      thick: pixel(150, 57),
      beyondThick: pixel(150, 54),
      shared: pixel(66, 62),
      aboveShared: pixel(66, 58),
    };
  });
  assert.deepEqual(profilePixels.thick, [68, 68, 68]);
  assert.notDeepEqual(profilePixels.beyondThick, [68, 68, 68]);
  assert.deepEqual(profilePixels.shared, [68, 68, 68]);
  assert.notDeepEqual(profilePixels.aboveShared, [68, 68, 68]);
  const thickPlan = await saveActiveRoom();
  assert.equal(thickPlan.floors[0].walls.length, 7);
  assert.deepEqual(thickPlan.floors[0].rooms[0].vertices, sharedFloor.rooms[0].vertices);
  const physical = thickPlan.floors[0].walls.find(
    (wall) => wall.id === sharedFloor.rooms[0].faces[2].wallId
  );
  assert.equal(physical.properties.wall_thickness_m, 0.2);
  assert.ok(physical.segments.some((segment) => segment.overrides?.wall_thickness_m === 0.4));
  await page.reload();
  await page.getByRole('button', { name: 'View', exact: true }).click();
  await page.getByRole('button', { name: 'View', exact: true }).last().click();
  activeRoom = await openSharedRoom([130, 90]);
  wallDialog = await openThickness();
  thicknessInput = wallDialog.locator(thicknessSelector);
  assert.equal(Number(await thicknessInput.inputValue()), 0.4);
  await wallDialog.getByRole('button', { name: 'Reset to inheritance', exact: true }).click();
  await page.waitForTimeout(150);
  assert.equal(Number(await thicknessInput.inputValue()), 0.2);
  await wallDialog.getByRole('button', { name: 'Save', exact: true }).click();
  await wallDialog.waitFor({ state: 'detached' });
  const inheritedPlan = await saveActiveRoom();
  assert.ok(
    inheritedPlan.floors[0].walls
      .flatMap((wall) => wall.segments)
      .every((segment) => !Object.hasOwn(segment.overrides || {}, 'wall_thickness_m'))
  );
  evidence.push({
    scenario:
      'one thickness field saves only its split span, survives reload and resets to inheritance',
    passed: true,
  });
  async function resetCornerFixture() {
    await page.evaluate(
      (record) =>
        localStorage.setItem(
          'building-plan-record',
          JSON.stringify({ raw_values: {}, repeatable: record.repeatable })
        ),
      sharedRecord
    );
    await page.reload();
    await page.getByRole('button', { name: 'View', exact: true }).click();
    await page.getByRole('button', { name: 'View', exact: true }).last().click();
    activeRoom = await openSharedRoom([130, 90]);
  }
  await resetCornerFixture();
  await dragActiveWall([140, 64], [140, 76], true);
  await dragActiveWall([140, 76], [140, 52], true);
  const reversedCornerPlan = await saveActiveRoom();
  assert.ok(reversedCornerPlan.floors[0].rooms[0].vertices.some((v) => v.x === 2.8 && v.y === 2.4));
  evidence.push({
    scenario: 'shared-face reversal saves one-thickness return geometry through the room editor',
    passed: true,
  });
  await resetCornerFixture();
  await dragActiveWall([140, 64], [140, 52], true);
  await dragActiveWall([140, 52], [140, 76], true);
  await saveActiveRoom();
  await page.getByRole('button', { name: 'View', exact: true }).last().click();
  activeRoom = await openSharedRoom([10, 30]);
  await dragActiveWall([20, 60], [20, 76]);
  const realignedCornerPlan = await saveActiveRoom();
  assert.equal(realignedCornerPlan.floors[0].rooms[0].vertices.length, 4);
  assert.ok(realignedCornerPlan.floors[0].rooms[0].vertices.some((v) => v.y === 3.6));
  evidence.push({
    scenario: 'W3.2 release commits after a shared reversal even when its preview row coalesces',
    passed: true,
  });
  await resetCornerFixture();
  await activeRoom.getByRole('button', { name: 'Pin / unpin', exact: true }).click();
  current = await canvasBox(activeRoom.locator('canvas'));
  await page.mouse.click(current.x + 140, current.y + 64);
  await activeRoom.getByRole('button', { name: 'Select', exact: true }).click();
  await dragActiveWall([160, 124], [180, 125]);
  const cornerPlan = await saveActiveRoom();
  const southEast = cornerPlan.floors[0].rooms[1].vertices[2];
  assert.equal(southEast.x, 9);
  assert.equal(southEast.y, 6.2);
  assert.deepEqual(cornerPlan.floors[0].rooms[0].vertices, sharedFloor.rooms[0].vertices);
  await page.reload();
  assert.deepEqual(
    readBuildingPlanRecord({
      meta: fixture.meta,
      record: { values: {}, repeatable: await page.evaluate(() => window.snapshot.repeatable) },
    }).floors[0].rooms[1].vertices,
    cornerPlan.floors[0].rooms[1].vertices
  );
  evidence.push({
    scenario:
      'optional canvas pin and axis-guided corner reshape use ordinary room/floor Save and reload',
    passed: true,
  });
  await resetCornerFixture();
  await dragActiveWall([160, 80], [100, 80], true);
  await dragActiveWall([80, 64], [80, 44], true);
  const joggedBefore = await saveActiveRoom();
  await page.getByRole('button', { name: 'View', exact: true }).last().click();
  activeRoom = await openSharedRoom([80, 90]);
  await dragActiveWall([60, 44], [60, 28]);
  const cornerColors = await activeRoom.locator('canvas').evaluate((element) => {
    const ctx = element.getContext('2d'),
      m = ctx.buildingPlanView || ctx.getTransform();
    const pixel = (x, y) =>
      [...ctx.getImageData(Math.round(x * m.a + m.e), Math.round(y * m.d + m.f), 1, 1).data].slice(
        0,
        3
      );
    return { band: pixel(102, 54), outside: pixel(106, 40) };
  });
  assert.deepEqual(cornerColors.band, [68, 68, 68]);
  assert.notDeepEqual(cornerColors.outside, [68, 68, 68]);
  const joggedAfter = await saveActiveRoom();
  for (const old of joggedBefore.floors[0].rooms[0].vertices.filter((v) => v.y === 3))
    assert.deepEqual(
      joggedAfter.floors[0].rooms[0].vertices.find((v) => v.id === old.id),
      old
    );
  for (const room of joggedAfter.floors[0].rooms)
    for (const vertex of room.vertices.filter((v) => v.x > 4.9)) assert.equal(vertex.x, 5);
  await page.getByRole('button', { name: 'View', exact: true }).last().click();
  activeRoom = await openSharedRoom([80, 90]);
  await dragActiveWall([60, 28], [60, 43.6]);
  const joggedRestored = await saveActiveRoom();
  assert.deepEqual(
    joggedRestored.floors[0].rooms.map((r) => r.vertices),
    joggedBefore.floors[0].rooms.map((r) => r.vertices)
  );
  evidence.push({
    scenario:
      'a jogged shared corner preserves stationary wall lines, has no outer spike, and returns after Save',
    passed: true,
  });
  await resetCornerFixture();
  await dragActiveWall([160, 64], [160, 52], true);
  await dragActiveWall([120, 56.8], [140, 57.2]);
  const sharedDiagonal = await saveActiveRoom();
  assert.ok(Math.abs(sharedDiagonal.floors[0].rooms[1].vertices[1].y - 2.72) < 1e-5);
  assert.ok(Math.abs(sharedDiagonal.floors[0].rooms[1].vertices[0].x - 3) < 1e-6);
  assert.ok(Math.abs(sharedDiagonal.floors[0].rooms[1].vertices[1].x - 8) < 1e-6);
  assert.deepEqual(createBuildingPlanSession({ snapshot: sharedDiagonal }).validate(), []);
  await resetCornerFixture();
  await dragActiveWall([60, 64], [60, 76], true);
  const sharedDown = await saveActiveRoom();
  assert.deepEqual(createBuildingPlanSession({ snapshot: sharedDown }).validate(), []);
  const alignedReturns = sharedDown.floors[0].rooms[0].faces
    .flatMap((face) =>
      sharedDown.floors[0].walls.filter((w) => w.id === face.wallId).flatMap((w) => w.segments)
    )
    .filter(
      (segment) => Math.abs(segment.start.x - 2.9) < 1e-6 && Math.abs(segment.end.x - 2.9) < 1e-6
    );
  assert.equal(alignedReturns.length, 1);
  evidence.push({
    scenario:
      'shared diagonal junctions preserve physical alignment and guided wall movement through Save',
    passed: true,
  });
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ scenarios: evidence, passed: evidence.length }, null, 2));
} finally {
  await browser.close();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
