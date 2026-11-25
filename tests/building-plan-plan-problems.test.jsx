// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { FormRenderer } from '../dist/index.js';
import {
  createBuildingPlanSession,
  expandBuildingPlanSchema,
  writeBuildingPlanRecord,
} from 'form0-core';

// Bands 4a (decided 2026-11-25): problems to fix in the plan before saving its floor. A canvas
// lists them first in its "n issues", live; the floor entry lists them first in its Validation
// panel with a "Plan" tag, and its Save waits until none is left; a room entry saves.

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
const LABEL = 'Window 1 and Lintel band · Plan';
const MESSAGE = 'Window 1 runs into Lintel band.';

/** A Bedroom with Window 1 on W1 (its head at 2.4 m) and every wall's lintel band at `lintel`. */
function fixture(lintel) {
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
      floor_lintel_band_distance_from_floor: lintel,
      floor_lintel_band_depth: 0.25,
    },
  }).created.id;
  session.apply({
    type: 'create_room',
    floorId,
    rectangle: { x: 0, y: 0, width: 5, height: 4 },
    values: { room_name: { choice: [], other: [{ label: 'Bedroom' }] } },
  });
  const w1 = session.getSnapshot().floors[0].walls.find((wall) => wall.autoLabel === 'W1');
  session.apply({
    type: 'create_opening',
    floorId,
    kind: 'window',
    wallId: w1.id,
    offset: 1,
    width: 1.2,
    height: 1.5,
    sillHeight: 0.9,
    values: { window_label: 'Window 1' },
  });
  session.apply({
    type: 'set_provider',
    floorId,
    nodeKey: 'floors',
    fieldName: 'floor_lintel_band',
    property: 'wall_lintel_band',
    value: answer('yes'),
  });
  const record = writeBuildingPlanRecord({ meta, plan: session.getSnapshot() });
  return { schema, snapshot: { raw_values: {}, repeatable: record.repeatable } };
}

async function openFloor(lintel) {
  const f = fixture(lintel);
  render(
    <FormRenderer
      schema={f.schema}
      initialSnapshot={f.snapshot}
      mode="edit"
      repeatableEntryMode="edit"
      buildingPlanDerivedCommands
      engineOptions={{ events: { recordKind: 'existing' }, diagnostics: { console: false } }}
    />
  );
  fireEvent.click(await screen.findByRole('button', { name: 'View', exact: true }));
  fireEvent.click((await listRows('Floors'))[0]);
  return within(await screen.findByRole('dialog'));
}

it("a floor entry's Save waits for its problems, listed first with a Plan tag", async () => {
  const dialog = await openFloor(2.4);
  const underside = await dialog.findByLabelText(/Lintel band underside/);
  expect(dialog.queryByRole('button', { name: /^\d+ issues?$/ })).toBeNull();
  // Typed, then saved at once: Save reads the problem the typed value makes.
  fireEvent.change(underside, { target: { value: '2.2' } });
  fireEvent.blur(underside);
  fireEvent.click(dialog.getByRole('button', { name: /^Save/ }));
  const validation = () => dialog.getByRole('button', { name: /^Validation/ });
  await waitFor(() => expect(validation().textContent).toMatch(/Validation\s*1$/));
  expect(screen.getAllByRole('dialog')).toHaveLength(1);
  fireEvent.click(validation());
  const finding = await dialog.findByText(LABEL);
  expect(finding.closest('button').textContent).toContain('W1');
  expect(finding.closest('button').textContent).toContain(MESSAGE);

  // The canvas lists it too, live.
  fireEvent.click(await dialog.findByRole('button', { name: '1 issue' }));
  const [item] = within(dialog.getByRole('list', { name: 'Issues' })).getAllByRole('button');
  expect(item.textContent).toContain(LABEL);
  expect(item.textContent).toContain(`W1: ${MESSAGE}`);

  fireEvent.change(underside, { target: { value: '2.4' } });
  fireEvent.blur(underside);
  fireEvent.click(dialog.getByRole('button', { name: /^Save/ }));
  await waitFor(() => expect(screen.queryAllByRole('dialog')).toHaveLength(0));
});

it('a room entry lists the problems of its walls and saves', async () => {
  const dialog = await openFloor(2.2);
  expect(await dialog.findByRole('button', { name: '1 issue' })).toBeTruthy();
  const rooms = dialog.getAllByText('Rooms', { exact: true }).at(-1).parentElement.parentElement;
  fireEvent.click(within(rooms).getByRole('button', { name: 'View', exact: true }));
  fireEvent.click((await listRows('Rooms'))[0]);
  await waitFor(() => expect(screen.getAllByRole('dialog')).toHaveLength(2));
  const room = within(screen.getAllByRole('dialog').at(-1));
  expect(await room.findByRole('button', { name: '1 issue' })).toBeTruthy();
  fireEvent.click(room.getByRole('button', { name: /^Save/ }));
  await waitFor(() => expect(screen.getAllByRole('dialog')).toHaveLength(1));
});
