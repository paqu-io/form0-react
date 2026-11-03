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

afterEach(cleanup);
beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () =>
      new Proxy(
        { measureText: () => ({ width: 30 }) },
        {
          get(target, name) {
            return target[name] || (() => {});
          },
          set(target, name, value) {
            target[name] = value;
            return true;
          },
        }
      )
  );
  HTMLElement.prototype.scrollIntoView = () => {};
});
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
  const expanded = expandBuildingPlanSchema(schema);
  const meta = expanded.buildingPlanMeta[0];
  const session = createBuildingPlanSession();
  const floorId = session.apply({
    type: 'create_floor',
    values: {
      floor_name: { choice: [{ value: 'ground_floor', label: 'Ground Floor' }], other: [] },
      floor_elevation_m: 0,
      floor_height_m: 3,
    },
    defaults: { wall_height_m: 3 },
  }).created.id;
  session.apply({
    type: 'create_room',
    floorId,
    rectangle: { x: 0, y: 0, width: 5, height: 4 },
    values: { room_name: { choice: [{ value: 'bedroom', label: 'Bedroom' }], other: [] } },
  });
  const record = writeBuildingPlanRecord({ meta, plan: session.getSnapshot() });
  return { schema, snapshot: { raw_values: {}, repeatable: record.repeatable } };
}
it('opens a BuildingPlan floor through its existing repeatable view and keeps standard controls', async () => {
  const f = fixture();
  render(
    <FormRenderer
      schema={f.schema}
      initialSnapshot={f.snapshot}
      mode="edit"
      engineOptions={{ events: { recordKind: 'existing' }, diagnostics: { console: false } }}
    />
  );
  fireEvent.click(await screen.findByRole('button', { name: 'View', exact: true }));
  const floorView = await screen.findByText('Ground Floor');
  const floorRow = floorView.closest('[class]')?.parentElement;
  const views = screen.getAllByRole('button', { name: 'View', exact: true });
  fireEvent.click(views.at(-1));
  const dialog = within(await screen.findByRole('dialog'));
  expect(dialog.getByRole('button', { name: /Cancel/ })).toBeTruthy();
  expect(dialog.queryByRole('button', { name: 'Apply', exact: true })).toBeNull();
  expect(await dialog.findByText(/Default height/i)).toBeTruthy();
  expect(dialog.queryByText('Building plan model')).toBeNull();
  expect(dialog.queryByText('Physical walls', { exact: true })).toBeNull();
  expect(dialog.queryByText('Observations', { exact: true })).toBeNull();
  const rooms = dialog.getAllByText('Rooms', { exact: true }).at(-1).parentElement.parentElement;
  fireEvent.click(within(rooms).getByRole('button', { name: 'View', exact: true }));
  await screen.findByText('Rooms 1');
  fireEvent.click(screen.getAllByRole('button', { name: 'View', exact: true }).at(-1));
  await waitFor(() =>
    expect(screen.getAllByText('Walls', { exact: true }).length).toBeGreaterThan(0)
  );
  expect(screen.queryByText('Physical walls', { exact: true })).toBeNull();
  expect(screen.queryByText('Observations', { exact: true })).toBeNull();
  const wallCollection = screen.getAllByText('Walls', { exact: true }).at(-1)
    .parentElement.parentElement;
  fireEvent.click(within(wallCollection).getByRole('button', { name: 'View', exact: true }));
  await screen.findByText('Walls 1');
  fireEvent.click(screen.getAllByRole('button', { name: 'View', exact: true }).at(-1));
  await waitFor(() =>
    expect(screen.getAllByText('Doors', { exact: true }).length).toBeGreaterThan(0)
  );
  expect(screen.getAllByText('Windows', { exact: true }).length).toBeGreaterThan(0);
  expect(screen.queryByText('Observations', { exact: true })).toBeNull();
  expect(floorRow).toBeTruthy();
});
