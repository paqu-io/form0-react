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

// Bands 3b (asked at the unit 3 hand test, 2026-11-24): a band row's read-only values say why in
// their description, as other fields' notes do; a beam added by hand keeps the field's own.

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
  const record = writeBuildingPlanRecord({ meta, plan: session.getSnapshot() });
  return { schema, snapshot: { raw_values: {}, repeatable: record.repeatable } };
}

it("a band row's distance and length say why they're read-only", async () => {
  const f = fixture();
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
  await within(await screen.findByRole('dialog')).findByText(/Structural clear height/i);
  const section = (label) =>
    screen.getAllByText(label, { exact: true }).at(-1).parentElement.parentElement;
  const open = async (label, index = 0) => {
    await waitFor(() =>
      expect(screen.getAllByText(label, { exact: true }).length).toBeGreaterThan(0)
    );
    fireEvent.click(within(section(label)).getByRole('button', { name: 'View', exact: true }));
    fireEvent.click((await listRows(label))[index]);
  };
  await open('Rooms');
  await open('Walls');
  await open('Beams');
  const why =
    'Spans the whole wall. For part of it, set it to No on the wall and add the beam yourself.';
  await waitFor(() => expect(screen.getAllByText(why).length).toBe(2));
  expect(screen.queryByText("From the wall's left end, seen from this room.")).toBeNull();
});
