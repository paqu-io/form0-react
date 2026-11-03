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
const evidence = [];
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.setDefaultTimeout(10000);
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
  const box = await canvas.boundingBox();
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
  const rootBox = await rootCanvas.boundingBox();
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
  let sharedBox = await sharedCanvas.boundingBox();
  async function openSharedRoom() {
    await sharedCanvas.scrollIntoViewIfNeeded();
    const currentBox = await sharedCanvas.boundingBox();
    await page.mouse.click(currentBox.x + 40, currentBox.y + 25);
    const roomDialog = page.getByRole('dialog', { name: 'Rooms', exact: true });
    await roomDialog.waitFor();
    await roomDialog.locator('canvas').scrollIntoViewIfNeeded();
    sharedBox = await roomDialog.locator('canvas').boundingBox();
    return roomDialog;
  }
  let activeRoom = await openSharedRoom();
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
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ scenarios: evidence, passed: evidence.length }, null, 2));
} finally {
  await browser.close();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
