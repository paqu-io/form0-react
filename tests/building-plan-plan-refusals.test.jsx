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

// Refused typed values as field errors (decided 2026-11-25): a band row's underside typed above
// its wall stayed in the field with no mark and Save did nothing visible. Now the field shows the
// refusal at once, without its source tag; Save stops, opening Validation on it; a valid value
// clears it and Save works.

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

const REFUSAL = 'Lintel band would stand above its wall.';

it("a refused typed value is its field's error, and Save stops on it", async () => {
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
  await waitFor(() => expect(screen.getAllByRole('dialog')).toHaveLength(4));
  const entry = within(screen.getAllByRole('dialog').at(-1));
  await entry.findByLabelText(/Underside from floor/);
  // Found again each time: the field's wrapper changes with its source tag.
  const underside = () => entry.getByLabelText(/Underside from floor/);
  // Its source tag: inherited, none while refused (the plan still inherits; Reset only returns
  // an inherited value), then Reset once the plan holds a value of the row's own.
  const source = () => underside().closest('[data-adornment="source"]')?.dataset.source ?? null;
  expect(source()).toBe('inherit');
  fireEvent.change(underside(), { target: { value: '3.5' } });
  fireEvent.blur(underside());
  await waitFor(() => expect(underside().getAttribute('aria-invalid')).toBe('true'));
  expect(entry.getAllByText(REFUSAL).length).toBeGreaterThan(0);
  expect(source()).toBeNull();

  const save = () => entry.getByRole('button', { name: /^Save/ });
  fireEvent.click(save());
  await waitFor(() => expect(save().dataset.failed).toBe('true'));
  expect(screen.getAllByRole('dialog')).toHaveLength(4);
  const sidebar = within(entry.getByRole('navigation', { name: 'Form sidebar' }));
  await waitFor(() =>
    expect(sidebar.getByRole('button', { name: /^Validation/ }).dataset.active).toBe('true')
  );
  const finding = sidebar.getByText(REFUSAL).closest('button');
  expect(finding.textContent).toMatch(/Underside from floor/);
  await waitFor(() => expect(document.activeElement).toBe(finding));

  fireEvent.change(underside(), { target: { value: '2.4' } });
  fireEvent.blur(underside());
  await waitFor(() => expect(underside().getAttribute('aria-invalid')).toBeNull());
  await waitFor(() => expect(source()).toBe('override'));
  fireEvent.click(save());
  await waitFor(() => expect(screen.getAllByRole('dialog')).toHaveLength(3));
});
