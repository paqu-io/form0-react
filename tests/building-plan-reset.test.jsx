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

// Web retest 2026-11-16: "Reset to inheritance" on a wall shared by rooms of different heights
// did nothing. The reset asks which room's value applies; the host showed no question.

afterEach(cleanup);

/** The rows of the last list named `label` (on the dialog on top), without their trash buttons. */
async function listRows(label) {
  const lists = await screen.findAllByRole('list', { name: label });
  return within(lists.at(-1))
    .getAllByRole('button')
    .filter((button) => !/^Remove /.test(button.getAttribute('aria-label') || ''));
}
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

const name = (label) => ({ choice: [{ value: label.toLowerCase(), label }], other: [] });

/**
 * Bedroom (3 m) and Kitchen (2.5 m) sharing Bedroom's east wall W2, whose height is the wall's
 * own 3 m (chosen by the shared-value question).
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
      floor_name: name('Ground Floor'),
      floor_elevation: 0,
      floor_height: 3,
      floor_interior_wall_thickness: 0.2,
      floor_exterior_wall_thickness: 0.2,
    },
  }).created.id;
  for (const [label, x] of [
    ['Bedroom', 0],
    ['Kitchen', 5.2],
  ])
    session.apply({
      type: 'create_room',
      floorId,
      rectangle: { x, y: 0, width: 5, height: 4 },
      values: { room_name: name(label) },
    });
  // Kitchen's height as its room screen sends it; the shared wall asks and keeps Bedroom's 3 m.
  const kitchen = session.getSnapshot().floors[0].rooms[1];
  const asked = session.apply({
    type: 'set_provider',
    floorId,
    nodeKey: 'rooms',
    roomId: kitchen.id,
    property: 'wall_height',
    fieldName: 'room_structural_clear_height',
    value: 2.5,
  });
  const { requestId } = asked.uiOperations[0].params;
  const applied = session.resolveUIRequest(requestId, { value: 'candidate:0' });
  if (applied.status !== 'applied') throw new Error(JSON.stringify(applied.issues));
  const record = writeBuildingPlanRecord({ meta, plan: session.getSnapshot() });
  return { schema, snapshot: { raw_values: {}, repeatable: record.repeatable } };
}

/** Opens Bedroom's shared east wall (its second wall row) in edit mode. */
async function openSharedWall() {
  const f = fixture();
  render(
    <FormRenderer
      schema={f.schema}
      initialSnapshot={f.snapshot}
      mode="edit"
      repeatableEntryMode="edit"
      buildingPlanDerivedCommands
      engineOptions={{
        events: { recordKind: 'existing' },
        diagnostics: { console: false },
      }}
    />
  );
  fireEvent.click(await screen.findByRole('button', { name: 'View', exact: true }));
  fireEvent.click((await listRows('Floors'))[0]);
  const floor = within(await screen.findByRole('dialog'));
  await floor.findByText(/Structural clear height/i);
  const section = (label) =>
    screen.getAllByText(label, { exact: true }).at(-1).parentElement.parentElement;
  // A section's View lists its rows; each row opens by its title.
  fireEvent.click(within(section('Rooms')).getByRole('button', { name: 'View', exact: true }));
  fireEvent.click((await listRows('Rooms'))[0]);
  await waitFor(() =>
    expect(screen.getAllByText('Walls', { exact: true }).length).toBeGreaterThan(0)
  );
  fireEvent.click(within(section('Walls')).getByRole('button', { name: 'View', exact: true }));
  fireEvent.click((await listRows('Walls'))[1]);
  return screen.findByRole('button', { name: 'Reset to inheritance' });
}

it('Reset to inheritance on a shared wall asks which room applies and applies the answer', async () => {
  fireEvent.click(await openSharedWall());
  // FormRenderer presents plan questions in its managed dialog.
  expect(
    await screen.findByText(
      /is shared by Bedroom and Kitchen, which give different values for Height/
    )
  ).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Bedroom: 3 m' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Kitchen: 2.5 m' }));
  await waitFor(() => expect(screen.getByDisplayValue('2.5')).toBeTruthy());
});

it('cancelling the question leaves the wall as it was and shows no error', async () => {
  const errors = [];
  vi.spyOn(console, 'error').mockImplementation((...args) =>
    errors.push(args.map(String).join(' '))
  );
  fireEvent.click(await openSharedWall());
  fireEvent.click(await screen.findByRole('button', { name: 'Cancel edit' }));
  await waitFor(() => expect(screen.queryByText(/is shared by Bedroom and Kitchen/)).toBeNull());
  expect(screen.getByRole('button', { name: 'Reset to inheritance' })).toBeTruthy();
  expect(screen.getByDisplayValue('3')).toBeTruthy();
  expect(errors).toEqual([]);
});
