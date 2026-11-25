// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { FormRenderer } from '../dist/index.js';
import { BuildingPlanCanvas } from '../src/building-plan/legacy/building-plan-canvas.js';
import {
  createBuildingPlanSession,
  expandBuildingPlanSchema,
  writeBuildingPlanRecord,
} from 'form0-core';

// Step 2, 2a (2026-11-22): "Show" in the floor row; its Floor below switch hides the floor below
// and its name and stops its pulls, one setting for every plan canvas of the form (S1 to S4).
// 2b (2026-11-23): its Plaster switch; Floor below listed disabled where there is none.
// 2c (2026-11-23): its Lengths switch, first, and the lengths' note in the status line.

const controllers = vi.hoisted(() => []);
vi.mock('form0-core', async (importOriginal) => {
  const actual = await importOriginal();
  class RecordedController extends actual.BuildingPlanCanvasController {
    constructor(options) {
      super(options);
      controllers.push(this);
    }
    setFloorBelowPulls(on) {
      (this.pullCalls ||= []).push(on);
      super.setFloorBelowPulls(on);
    }
  }
  return { ...actual, BuildingPlanCanvasController: RecordedController };
});

afterEach(cleanup);
beforeEach(() => {
  controllers.length = 0;
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
  const session = createBuildingPlanSession();
  const floor = (value, label, elevation, extra = {}) =>
    session.apply({
      type: 'create_floor',
      values: {
        floor_name: { choice: [{ value, label }], other: [] },
        floor_elevation: elevation,
        floor_height: 3,
        floor_interior_wall_thickness: 0.2,
        floor_exterior_wall_thickness: 0.2,
        ...extra,
      },
      defaults: { wall_height: 3 },
    }).created.id;
  const ground = floor('ground_floor', 'Ground Floor', 0);
  floor('upper_floor', 'Upper floor', 3, { floor_upper_number: 1 });
  session.apply({
    type: 'create_room',
    floorId: ground,
    rectangle: { x: 0, y: 0, width: 5, height: 4 },
    values: { room_name: { choice: [{ value: 'bedroom', label: 'Bedroom' }], other: [] } },
  });
  const record = writeBuildingPlanRecord({ meta, plan: session.getSnapshot() });
  return { schema, snapshot: { raw_values: {}, repeatable: record.repeatable } };
}

const showButton = (scope) => scope.queryByRole('button', { name: /^Show on the plan/ });

it('the Floor below switch hides the floor below and its pulls on every plan canvas', async () => {
  const f = fixture();
  render(
    <FormRenderer
      schema={f.schema}
      initialSnapshot={f.snapshot}
      mode="edit"
      buildingPlanDerivedCommands
      engineOptions={{ events: { recordKind: 'existing' }, diagnostics: { console: false } }}
    />
  );
  fireEvent.click(await screen.findByRole('button', { name: 'View', exact: true }));
  // The ground floor has nothing below it: Floor below is listed, disabled (2a hand test); Plaster
  // switches (2b), and turned off it puts the dot on Show.
  await screen.findByRole('tab', { name: 'Ground Floor' });
  fireEvent.click(showButton(screen));
  const none = screen.getByRole('checkbox', { name: /Floor below/ });
  expect(none.disabled).toBe(true);
  expect(none.closest('label').textContent).toContain('No floor below this one');
  const plaster = screen.getByRole('checkbox', { name: /Plaster/ });
  expect(plaster.checked).toBe(true);
  expect(showButton(screen).getAttribute('aria-label')).not.toMatch(/some hidden/);
  fireEvent.click(plaster);
  await waitFor(() => expect(showButton(screen).getAttribute('aria-label')).toMatch(/some hidden/));
  fireEvent.click(screen.getByRole('checkbox', { name: /Plaster/ }));
  fireEvent.keyDown(document, { key: 'Escape' });
  fireEvent.click(screen.getByRole('tab', { name: /Upper floor/ }));
  expect(await screen.findByText('Ground Floor below')).toBeTruthy();
  fireEvent.click(showButton(screen));
  const below = screen.getByRole('checkbox', { name: /Floor below/ });
  expect(below.checked).toBe(true);
  fireEvent.click(below);
  await waitFor(() => expect(screen.queryByText('Ground Floor below')).toBeNull());
  expect(showButton(screen).getAttribute('aria-label')).toMatch(/some hidden/);
  expect(controllers.at(-1).pullCalls.at(-1)).toBe(false);
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('checkbox', { name: /Floor below/ })).toBeNull();

  // The upper floor's entry follows the same setting, its controller pulling nothing below.
  const lists = await screen.findAllByRole('list', { name: 'Floors' });
  fireEvent.click(within(lists.at(-1)).getByRole('button', { name: /^Upper floor/ }));
  const dialog = within(await screen.findByRole('dialog'));
  await waitFor(() => expect(showButton(dialog)).toBeTruthy());
  expect(dialog.queryByText('Ground Floor below')).toBeNull();
  expect(controllers.at(-1).pullCalls).toContain(false);
  fireEvent.click(showButton(dialog));
  const again = dialog.getByRole('checkbox', { name: /Floor below/ });
  expect(again.checked).toBe(false);
  fireEvent.click(again);
  expect(await dialog.findByText('Ground Floor below')).toBeTruthy();
  expect(controllers.at(-1).pullCalls.at(-1)).toBe(true);
  // Esc in the menu closes the menu, not the dialog (the dialog keeps Esc from closing it).
  fireEvent.keyDown(dialog.getByRole('checkbox', { name: /Floor below/ }), { key: 'Escape' });
  await waitFor(() => expect(dialog.queryByRole('checkbox', { name: /Floor below/ })).toBeNull());
  expect(screen.getByRole('dialog')).toBeTruthy();
});

it('the Lengths switch: listed first, its note in the status line, off with the dot', async () => {
  const f = fixture();
  render(
    <FormRenderer
      schema={f.schema}
      initialSnapshot={f.snapshot}
      mode="edit"
      buildingPlanDerivedCommands
      engineOptions={{ events: { recordKind: 'existing' }, diagnostics: { console: false } }}
    />
  );
  fireEvent.click(await screen.findByRole('button', { name: 'View', exact: true }));
  await screen.findByRole('tab', { name: 'Ground Floor' });
  // The plan page selects its first room, so its lengths show (or wait for a zoom).
  const note = /lengths in metres|zoom in to see the lengths/;
  const status = () =>
    screen
      .getAllByRole('status')
      .map((entry) => entry.textContent)
      .join(' ');
  await waitFor(() => expect(status()).toMatch(note));
  fireEvent.click(showButton(screen));
  const lengths = screen.getAllByRole('checkbox')[0];
  expect(lengths.closest('label').textContent).toContain('Lengths');
  expect(lengths.closest('label').textContent).toContain(
    'Of the selected room, to the bare wall face'
  );
  expect(lengths.checked).toBe(true);
  fireEvent.click(lengths);
  await waitFor(() => expect(showButton(screen).getAttribute('aria-label')).toMatch(/some hidden/));
  await waitFor(() => expect(status()).not.toMatch(note));
  fireEvent.click(screen.getAllByRole('checkbox')[0]);
  await waitFor(() => expect(status()).toMatch(note));
});

it('Beams on and Bands off by default; the dot only for a switch off that is on by default', async () => {
  // D1b (2026-11-25): beams added by hand show at rest, bands with Show › Bands.
  const f = fixture();
  render(
    <FormRenderer
      schema={f.schema}
      initialSnapshot={f.snapshot}
      mode="edit"
      buildingPlanDerivedCommands
      engineOptions={{ events: { recordKind: 'existing' }, diagnostics: { console: false } }}
    />
  );
  fireEvent.click(await screen.findByRole('button', { name: 'View', exact: true }));
  await screen.findByRole('tab', { name: 'Ground Floor' });
  fireEvent.click(showButton(screen));
  const beams = screen.getByRole('checkbox', { name: /^Beams/ });
  const bands = screen.getByRole('checkbox', { name: /^Bands/ });
  expect(beams.closest('label').textContent).toContain('Room beams and beams added to walls');
  expect(bands.closest('label').textContent).toContain(
    "Every wall's ring beam, lintel and sill bands"
  );
  expect([beams.checked, bands.checked]).toEqual([true, false]);
  expect(showButton(screen).getAttribute('aria-label')).not.toMatch(/some hidden/);
  fireEvent.click(bands);
  await waitFor(() => expect(screen.getByRole('checkbox', { name: /^Bands/ }).checked).toBe(true));
  expect(showButton(screen).getAttribute('aria-label')).not.toMatch(/some hidden/);
  fireEvent.click(screen.getByRole('checkbox', { name: /^Beams/ }));
  await waitFor(() => expect(showButton(screen).getAttribute('aria-label')).toMatch(/some hidden/));
});

it('the canvas draws and fits to the floor below only while it shows', () => {
  const floorBelow = { walls: [[{ x: 0, y: 0 }]], columns: [], label: 'Ground Floor' };
  const canvas = Object.assign(Object.create(BuildingPlanCanvas.prototype), {
    floorBelow,
    render() {},
  });
  expect(canvas.shownFloorBelow()).toBe(floorBelow);
  canvas.setLayers({ floorBelow: false });
  expect(canvas.shownFloorBelow()).toBeNull();
  canvas.setLayers({ floorBelow: true });
  expect(canvas.shownFloorBelow()).toBe(floorBelow);
});
