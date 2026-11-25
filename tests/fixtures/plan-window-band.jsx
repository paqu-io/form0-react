import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { FormRenderer } from '../../dist/index.js';
import {
  createBuildingPlanSession,
  expandBuildingPlanSchema,
  writeBuildingPlanRecord,
} from 'form0-core';

// A Bedroom with Window 1 on W1 (its head at 2.4 m) and every wall's lintel band, for the bands
// 4a and 4b tests (moved from building-plan-plan-problems.test.jsx).

export async function listRows(label) {
  const lists = await screen.findAllByRole('list', { name: label });
  return within(lists.at(-1))
    .getAllByRole('button')
    .filter((button) => !/^Remove /.test(button.getAttribute('aria-label') || ''));
}
const answer = (value) => ({ choice: [{ value, label: value }], other: [] });

/** A Bedroom with Window 1 on W1 (its head at 2.4 m) and every wall's lintel band at `lintel`. */
export function fixture(lintel) {
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
  const lintelBand = session.apply({
    type: 'set_provider',
    floorId,
    nodeKey: 'floors',
    fieldName: 'floor_lintel_band',
    property: 'wall_lintel_band',
    value: answer('yes'),
  });
  // A band below Window 1's head asks first (4b): kept, as a plan with problems to fix.
  if (lintelBand.status === 'pending')
    session.resolveUIRequest(lintelBand.uiOperations[0].params.requestId, { value: 'keep' });
  const record = writeBuildingPlanRecord({ meta, plan: session.getSnapshot() });
  return { schema, snapshot: { raw_values: {}, repeatable: record.repeatable } };
}

export async function openFloor(lintel) {
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
