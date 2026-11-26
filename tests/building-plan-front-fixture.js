import { screen, within } from '@testing-library/react';
import { vi } from 'vitest';
import {
  createBuildingPlanSession,
  expandBuildingPlanSchema,
  writeBuildingPlanRecord,
} from 'form0-core';

// The front view's form fixture (A2, A3): moved out of `building-plan-front-view.test.jsx` so
// the room entry's test (`building-plan-front-room.test.jsx`) shares it.

/** jsdom has no 2D canvas: a context that draws nothing. */
export function mockCanvas() {
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
}

export async function listRows(label) {
  const lists = await screen.findAllByRole('list', { name: label });
  return within(lists.at(-1))
    .getAllByRole('button')
    .filter((button) => !/^Remove /.test(button.getAttribute('aria-label') || ''));
}
export const answer = (value) => ({ choice: [{ value, label: value }], other: [] });

/**
 * A Bedroom with the floor's lintel band at 1.9 m, a window up to 2.1 m on W1 and a column against
 * W1.
 */
export function fixture() {
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
