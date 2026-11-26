// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { FormRenderer } from '../dist/index.js';
import {
  createBuildingPlanSession,
  expandBuildingPlanSchema,
  writeBuildingPlanRecord,
} from 'form0-core';

// A2 (decided 2026-11-26): the read-only front view. Plan | Front in every canvas's floor row,
// working in a wall's entry (disabled elsewhere, saying where it works). In Front: the wall seen
// from inside its room with its lengths, the wall line "1 of 1", Show disabled, the status line
// on lengths, a zoom of its own (the plan keeps its zoom), double-click to open as on the plan,
// and an issue selected there when Front shows it; a click selects a part (2026-11-26).

afterEach(cleanup);
beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () =>
      new Proxy(
        { measureText: () => ({ width: 30 }) },
        {
          get: (target, name) => target[name] || (() => {}),
          set: (target, name, value) => {
            target[name] = value;
            return true;
          },
        }
      )
  );
  HTMLElement.prototype.scrollIntoView = () => {};
});

async function listRows(label) {
  const lists = await screen.findAllByRole('list', { name: label });
  return within(lists.at(-1))
    .getAllByRole('button')
    .filter((button) => !/^Remove /.test(button.getAttribute('aria-label') || ''));
}
const answer = (value) => ({ choice: [{ value, label: value }], other: [] });

/**
 * A Bedroom with the floor's lintel band at 1.9 m, a window up to 2.1 m on W1 and a column against
 * W1.
 */
function fixture() {
  const schema = {
    form: {
      name: 'Building',
      elements: [
        {
          type: 'BuildingPlanSection',
          key: 'plan',
          data_name: 'plan',
          label: 'Plan',
          description: null,
          description_mode: null,
          visible: true,
          visible_conditions: null,
          read_only: false,
          read_only_conditions: null,
          node_overrides: null,
        },
      ],
    },
  };
  const meta = expandBuildingPlanSchema(schema).buildingPlanMeta[0];
  const session = createBuildingPlanSession({ properties: meta.properties, derivedCommands: true });
  const floorId = session.apply({
    type: 'create_floor',
    values: {
      floor_name: answer('ground_floor'),
      floor_elevation: 0,
      floor_height: 3,
      floor_interior_wall_thickness: 0.2,
      floor_exterior_wall_thickness: 0.2,
      floor_lintel_band_distance_from_floor: 1.9,
    },
  }).created.id;
  session.apply({
    type: 'create_room',
    floorId,
    rectangle: { x: 0, y: 0, width: 5, height: 4 },
    values: { room_name: { choice: [], other: [{ label: 'Bedroom' }] } },
  });
  session.apply({
    type: 'set_provider',
    floorId,
    nodeKey: 'floors',
    fieldName: 'floor_lintel_band',
    property: 'wall_lintel_band',
    value: answer('yes'),
  });
  session.apply({
    type: 'create_opening',
    floorId,
    kind: 'window',
    wallId: session.getSnapshot().floors[0].walls.find((wall) => wall.autoLabel === 'W1').id,
    offset: 1,
    width: 1,
    height: 1.2,
    sillHeight: 0.9,
    values: { window_label: 'Window A' },
  });
  // A column of the room against W1, right of the window.
  session.apply({
    type: 'create_element',
    floorId,
    roomId: session.getSnapshot().floors[0].rooms[0].id,
    collection: 'columns',
    element: { position: { x: 4.4, y: 0.15 }, width: 0.3, height: 0.3 },
  });
  const record = writeBuildingPlanRecord({ meta, plan: session.getSnapshot() });
  return { schema, snapshot: { raw_values: {}, repeatable: record.repeatable } };
}

const views = (scope) => within(scope.getByRole('group', { name: 'View' }));
const isOff = (scope) =>
  views(scope)
    .getAllByRole('button')
    .every((button) => button.disabled);

it('Front in a wall entry: its lengths, its own zoom, Show off, double-click and issues as on the plan', async () => {
  const f = fixture();
  render(
    <FormRenderer
      schema={f.schema}
      initialSnapshot={f.snapshot}
      mode="edit"
      repeatableEntryMode="edit"
      buildingPlanDerivedCommands
      buildingPlanLockedSelection
      engineOptions={{ events: { recordKind: 'existing' }, diagnostics: { console: false } }}
    />
  );
  fireEvent.click(await screen.findByRole('button', { name: 'View', exact: true }));
  fireEvent.click((await listRows('Floors'))[0]);
  const dialog = () => within(screen.getAllByRole('dialog').at(-1));
  await dialog().findByText(/Structural clear height/i);
  // A floor's entry: there, disabled, saying where it works.
  await waitFor(() => expect(isOff(dialog())).toBe(true));
  expect(dialog().getByRole('group', { name: 'View' }).dataset.tooltip).toBe(
    "Front: open a wall's entry"
  );
  const section = (label) =>
    screen.getAllByText(label, { exact: true }).at(-1).parentElement.parentElement;
  const open = async (label, row = () => true) => {
    await waitFor(() =>
      expect(screen.getAllByText(label, { exact: true }).length).toBeGreaterThan(0)
    );
    fireEvent.click(within(section(label)).getByRole('button', { name: 'View', exact: true }));
    fireEvent.click((await listRows(label)).find(row));
  };
  await open('Rooms');
  await waitFor(() => expect(screen.getAllByRole('dialog')).toHaveLength(2));
  expect(isOff(dialog())).toBe(true);
  await open('Walls', (button) => /^W1\b/.test(button.textContent));
  await waitFor(() => expect(screen.getAllByRole('dialog')).toHaveLength(3));

  // A wall's entry opens on Plan, Front enabled.
  const entry = dialog();
  const plan = views(entry).getByRole('button', { name: 'Plan' });
  const front = views(entry).getByRole('button', { name: 'Front' });
  await waitFor(() => expect(front.disabled).toBe(false));
  expect(plan.getAttribute('aria-pressed')).toBe('true');
  const level = () => entry.getByText(/^\d+%$/).textContent;
  const planZoom = level();
  const show = () => entry.getByRole('button', { name: /^Show on the plan/ });
  expect(show().disabled).toBe(false);

  fireEvent.click(front);
  const svg = await entry.findByRole('img', { name: 'Front view of W1' });
  expect(front.getAttribute('aria-pressed')).toBe('true');
  expect(entry.getByText('W1', { selector: 'span' }).parentElement.textContent).toBe('W1 · 1 of 1');
  expect(entry.getByRole('button', { name: 'Previous wall' }).disabled).toBe(true);
  expect(entry.getByRole('button', { name: 'Next wall' }).disabled).toBe(true);
  // The mini-map (2026-11-26): the Bedroom's walls, W1 from its 0 end (its left, the plan's
  // left), the ring there, the cone it is seen from.
  const map = entry.getByRole('img', { name: 'Where W1 is seen from' });
  const shown = map.querySelector('[data-map="shown"]');
  const zero = map.querySelector('[data-map="zero"]');
  expect(Number(shown.getAttribute('x1'))).toBeLessThan(Number(shown.getAttribute('x2')));
  expect([zero.getAttribute('cx'), zero.getAttribute('cy')]).toEqual([
    shown.getAttribute('x1'),
    shown.getAttribute('y1'),
  ]);
  expect(map.querySelector('[data-map="cone"]').getAttribute('d')).toMatch(/^M.+Z$/);
  expect(map.querySelector('[data-map="walls"]').getAttribute('d')).toMatch(/^M.+Z$/);
  // Its bands, its window and its lengths: the wall's 3.00 m, the window's 1.00 m along it.
  const texts = () => [...svg.querySelectorAll('text')].map((text) => text.textContent);
  expect(texts()).toEqual(expect.arrayContaining(['Lintel band', 'Window A', '3.00', '1.00']));
  // A click selects a part, as on the plan (2026-11-26); one on nothing, the entry's own wall.
  fireEvent.click(svg.querySelector('[data-name="Window A"] rect'));
  await waitFor(() => expect(svg.querySelector('[data-selected]')?.dataset.name).toBe('Window A'));
  fireEvent.click(svg);
  await waitFor(() => expect(svg.querySelector('[data-selected]')).toBeNull());
  // Show doesn't apply; the status line names the lengths' unit; the pill fits the view.
  expect(show().disabled).toBe(true);
  expect(show().parentElement.dataset.tooltip).toBe('Front always shows bands, beams and lengths');
  expect(entry.getByText(/lengths in metres/)).toBeTruthy();
  expect(entry.getByRole('button', { name: 'Fit view' })).toBeTruthy();
  expect(level()).toBe('100%');
  fireEvent.click(entry.getByRole('button', { name: 'Zoom in' }));
  expect(level()).toBe('125%');

  // The issue, the window running into the lintel band: selected here, as Front shows it.
  fireEvent.click(entry.getByRole('button', { name: /1 issue/ }));
  fireEvent.click(entry.getByText(/^Window A and Lintel band/).closest('button'));
  await waitFor(() =>
    expect(svg.querySelector('[data-selected]')?.dataset.name).toBe('Lintel band')
  );
  expect(entry.getByRole('img', { name: /^Front view/ })).toBe(svg);

  // Each view keeps its zoom.
  fireEvent.click(plan);
  await waitFor(() => expect(entry.queryByRole('img', { name: /^Front view/ })).toBeNull());
  expect(level()).toBe(planZoom);
  expect(show().disabled).toBe(false);
  fireEvent.click(front);
  const again = await entry.findByRole('img', { name: /^Front view/ });
  expect(level()).toBe('125%');

  // A double-click opens the band's entry, as on the plan.
  fireEvent.doubleClick(again.querySelector('[data-name="Lintel band"] rect'));
  await waitFor(() => expect(screen.getAllByRole('dialog')).toHaveLength(4));
  await dialog().findByLabelText(/Underside from floor/);
});

/** W1's entry, through the floor's and the Bedroom's, Front shown. */
async function frontOfW1(props = {}) {
  const f = fixture();
  render(
    <FormRenderer
      schema={f.schema}
      initialSnapshot={f.snapshot}
      mode="edit"
      repeatableEntryMode="edit"
      buildingPlanDerivedCommands
      engineOptions={{ events: { recordKind: 'existing' }, diagnostics: { console: false } }}
      {...props}
    />
  );
  fireEvent.click(await screen.findByRole('button', { name: 'View', exact: true }));
  fireEvent.click((await listRows('Floors'))[0]);
  const section = (label) =>
    screen.getAllByText(label, { exact: true }).at(-1).parentElement.parentElement;
  const open = async (label, row = () => true) => {
    await waitFor(() =>
      expect(screen.getAllByText(label, { exact: true }).length).toBeGreaterThan(0)
    );
    fireEvent.click(within(section(label)).getByRole('button', { name: 'View', exact: true }));
    fireEvent.click((await listRows(label)).find(row));
  };
  await open('Rooms');
  await waitFor(() => expect(screen.getAllByRole('dialog')).toHaveLength(2));
  await open('Walls', (button) => /^W1\b/.test(button.textContent));
  await waitFor(() => expect(screen.getAllByRole('dialog')).toHaveLength(3));
  const entry = within(screen.getAllByRole('dialog').at(-1));
  const front = views(entry).getByRole('button', { name: 'Front' });
  await waitFor(() => expect(front.disabled).toBe(false));
  fireEvent.click(front);
  const svg = await entry.findByRole('img', { name: 'Front view of W1' });
  return { entry, svg };
}

// A double-click on what the entry can't open says where it opens (decided 2026-11-26): a column
// is the room's row, so W1's entry opens nothing and its status line names the room.
it("a double-click on the room's column in a wall's entry says where it opens", async () => {
  const { entry, svg } = await frontOfW1();
  fireEvent.doubleClick(svg.querySelector('[data-name="C#1"] rect'));
  const lines = () => entry.getAllByRole('status').map((line) => line.textContent);
  await waitFor(() =>
    expect(lines()).toContain("C#1 belongs to Bedroom: open it from Bedroom's entry")
  );
  expect(screen.getAllByRole('dialog')).toHaveLength(3);
});

// The option, off by default (decided 2026-11-26): without `buildingPlanLockedSelection` a click
// selects nothing on a locked canvas, Front's included; the double-click opens as before.
it('by default (the option off) a click in Front selects nothing; a double-click opens', async () => {
  const { svg } = await frontOfW1();
  fireEvent.click(svg.querySelector('[data-name="Window A"] rect'));
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(svg.querySelector('[data-selected]')).toBeNull();
  fireEvent.doubleClick(svg.querySelector('[data-name="Lintel band"] rect'));
  await waitFor(() => expect(screen.getAllByRole('dialog')).toHaveLength(4));
});
