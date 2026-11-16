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
      floor_elevation: 0,
      floor_height: 3,
      floor_interior_wall_thickness: 0.2,
      floor_exterior_wall_thickness: 0.2,
    },
    defaults: { wall_height: 3 },
  }).created.id;
  session.apply({
    type: 'create_room',
    floorId,
    rectangle: { x: 0, y: 0, width: 5, height: 4 },
    values: { room_name: { choice: [{ value: 'bedroom', label: 'Bedroom' }], other: [] } },
  });
  const record = writeBuildingPlanRecord({ meta, plan: session.getSnapshot() });
  return { schema, meta, snapshot: { raw_values: {}, repeatable: record.repeatable } };
}

/** A floor row's container keys, each null, as a record prepared before 2026-11-13 saved them. */
function floorContainerNulls(schema) {
  const plan = expandBuildingPlanSchema(schema).schema.form.elements[0];
  const floors = plan.elements.find((element) => element.type === 'RepeatableSection');
  const names = {};
  const walk = (elements) => {
    for (const element of elements) {
      if (!['Section', 'RepeatableSection'].includes(element.type)) continue;
      names[element.data_name] = null;
      if (element.type === 'Section') walk(element.elements);
    }
  };
  walk(floors.elements);
  return names;
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
  expect(await dialog.findByText(/Structural clear height/i)).toBeTruthy();
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

it('updates system labels and choices from a dynamic locale without losing an open floor draft', async () => {
  const f = fixture();
  const props = {
    schema: f.schema,
    initialSnapshot: f.snapshot,
    mode: 'edit',
    repeatableEntryMode: 'edit',
    engineOptions: { events: { recordKind: 'existing' }, diagnostics: { console: false } },
  };
  const view = render(<FormRenderer {...props} locale="en" />);
  fireEvent.click(await screen.findByRole('button', { name: 'View', exact: true }));
  await screen.findByText('Ground Floor');
  fireEvent.click(screen.getAllByRole('button', { name: 'View', exact: true }).at(-1));
  const input = await screen.findByLabelText(/Structural clear height/);
  fireEvent.change(input, { target: { value: '3.75' } });
  fireEvent.blur(input);
  await waitFor(() => expect(input.value).toBe('3.75'));
  view.rerender(<FormRenderer {...props} locale="fr-FR" />);
  const translated = await screen.findByLabelText(/Hauteur libre sous structure/);
  expect(translated).toBe(input);
  expect(translated.value).toBe('3.75');
  expect(screen.getByRole('option', { name: 'Rez-de-chaussée' }).value).toBe('ground_floor');
  const thickness = screen.getByLabelText(/Épaisseur prédominante des murs extérieurs/);
  expect(thickness.value).toBe('200');
  view.rerender(<FormRenderer {...props} locale="it" />);
  expect(await screen.findByLabelText(/Altezza libera strutturale/)).toBe(input);
  expect(input.value).toBe('3.75');
});

// Mobile round 2026-11-13, issue 2: the BuildingPlanSection page is a drill-down page; only the
// root submits the record.
it('the BuildingPlanSection page goes Back and adds floors, and never submits', async () => {
  const f = fixture();
  const onSubmit = vi.fn(async () => ({}));
  render(
    <FormRenderer
      schema={f.schema}
      initialSnapshot={f.snapshot}
      mode="edit"
      onSubmit={onSubmit}
      engineOptions={{ events: { recordKind: 'existing' }, diagnostics: { console: false } }}
    />
  );
  expect(await screen.findByRole('button', { name: /^Submit/ })).toBeTruthy();
  fireEvent.click(await screen.findByRole('button', { name: 'View', exact: true }));
  await screen.findByText('Ground Floor');
  expect(screen.getByRole('button', { name: /^Back/ })).toBeTruthy();
  expect(screen.getByRole('button', { name: /^Add Floor/ })).toBeTruthy();
  expect(screen.queryByRole('button', { name: /^(Save|Submit|Cancel)/ })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /^Back/ }));
  expect(await screen.findByRole('button', { name: /^Submit/ })).toBeTruthy();
  expect(onSubmit).not.toHaveBeenCalled();
});

// Mobile round 2026-11-13, issue 2: the floor dialog copied the whole saved row into its engine and
// the opening room's publish threw, leaving the room's editor scope open.
it('opens a room from an editable floor whose saved row carries container keys', async () => {
  const f = fixture();
  const floor = f.snapshot.repeatable[f.meta.repeatablesByNodeKey.floors.preferredKey][0];
  Object.assign(floor.values, floorContainerNulls(f.schema));
  const errors = [];
  vi.spyOn(console, 'error').mockImplementation((...args) =>
    errors.push(args.map(String).join(' '))
  );
  render(
    <FormRenderer
      schema={f.schema}
      initialSnapshot={f.snapshot}
      mode="edit"
      repeatableEntryMode="edit"
      engineOptions={{ events: { recordKind: 'existing' }, diagnostics: { console: false } }}
    />
  );
  fireEvent.click(await screen.findByRole('button', { name: 'View', exact: true }));
  await screen.findByText('Ground Floor');
  fireEvent.click(screen.getAllByRole('button', { name: 'View', exact: true }).at(-1));
  const dialog = within(await screen.findByRole('dialog'));
  await dialog.findByText(/Structural clear height/i);
  const rooms = dialog.getAllByText('Rooms', { exact: true }).at(-1).parentElement.parentElement;
  fireEvent.click(within(rooms).getByRole('button', { name: 'View', exact: true }));
  await screen.findByText('Rooms 1');
  fireEvent.click(screen.getAllByRole('button', { name: 'View', exact: true }).at(-1));
  await waitFor(() =>
    expect(screen.getAllByText('Walls', { exact: true }).length).toBeGreaterThan(0)
  );
  expect(screen.queryByText(/value-update field/)).toBeNull();
  expect(errors.filter((error) => /value-update field|child editor/.test(error))).toEqual([]);
});
