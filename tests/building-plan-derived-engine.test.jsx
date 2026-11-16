// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { FormRenderer } from '../dist/index.js';
import {
  createBuildingPlanSession,
  expandBuildingPlanSchema,
  writeBuildingPlanRecord,
} from 'form0-core';

// Every canvas controller and record editor the renderer creates, with the options given.
const controllers = vi.hoisted(() => []);
const editors = vi.hoisted(() => []);
vi.mock('form0-core', async (importOriginal) => {
  const actual = await importOriginal();
  class RecordedController extends actual.BuildingPlanCanvasController {
    constructor(options) {
      super(options);
      controllers.push(options);
    }
  }
  const createBuildingPlanEditor = (options) => {
    editors.push(options);
    return actual.createBuildingPlanEditor(options);
  };
  return { ...actual, BuildingPlanCanvasController: RecordedController, createBuildingPlanEditor };
});

afterEach(cleanup);
beforeEach(() => {
  controllers.length = 0;
  editors.length = 0;
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
  return { schema, snapshot: { raw_values: {}, repeatable: record.repeatable } };
}

for (const derived of [false, true])
  it(`the BuildingPlan canvas and editor run on the ${derived ? 'derived core' : 'current engine'} the host asks for`, async () => {
    const f = fixture();
    render(
      <FormRenderer
        schema={f.schema}
        initialSnapshot={f.snapshot}
        mode="edit"
        buildingPlanDerivedCommands={derived}
        engineOptions={{ events: { recordKind: 'existing' }, diagnostics: { console: false } }}
      />
    );
    // Opening the floor shows its canvas.
    fireEvent.click(await screen.findByRole('button', { name: 'View', exact: true }));
    await screen.findByText('Ground Floor');
    await waitFor(() => expect(controllers.length).toBeGreaterThan(0));
    expect(controllers.every((options) => options.derivedCommands === derived)).toBe(true);
    // Opening the floor row's dialog opens its record editor.
    fireEvent.click(screen.getAllByRole('button', { name: 'View', exact: true }).at(-1));
    await screen.findByRole('dialog');
    expect(editors.length).toBeGreaterThan(0);
    expect(editors.every((options) => options.derivedCommands === derived)).toBe(true);
  });
