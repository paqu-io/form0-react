import { expect, it } from 'vitest';
import {
  createBuildingPlanEditor,
  createBuildingPlanSession,
  expandBuildingPlanSchema,
  writeBuildingPlanRecord,
} from 'form0-core';
import { openBuildingPlanEditorRow } from '../src/building-plan/open-editor-row.js';
import { pickOwnedValues } from '../src/utils/value-updates.js';

function floorEditor() {
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
  session.apply({
    type: 'create_floor',
    values: { floor_elevation: 0, floor_height: 3 },
    defaults: { wall_height_m: 3 },
  });
  const record = writeBuildingPlanRecord({ meta, plan: session.getSnapshot() });
  const key = meta.repeatablesByNodeKey.floors.preferredKey;
  const editor = createBuildingPlanEditor({ meta, record });
  return {
    editor,
    path: [{ key, id: record.repeatable[key][0].id }],
    row: record.repeatable[key][0],
  };
}

// Mobile round 2026-11-13, issue 2: a subscriber that threw while a row opened left its scope open.
it('a row whose opening throws in a subscriber leaves no editor scope open', () => {
  const { editor, path, row } = floorEditor();
  editor.subscribe(() => {
    throw new TypeError('subscriber failed');
  });
  expect(() =>
    openBuildingPlanEditorRow(editor, { path, scopeId: 'floor', parentScopeId: null, row })
  ).toThrow(/subscriber failed/);
  expect(editor.hasEditor('floor')).toBe(false);
});

it('a row opens through the helper as through the editor', () => {
  const { editor, path, row } = floorEditor();
  const opened = openBuildingPlanEditorRow(editor, {
    path,
    scopeId: 'floor',
    parentScopeId: null,
    row,
  });
  expect(opened.status).toBe('opened');
  expect(editor.hasEditor('floor')).toBe(true);
});

it('pickOwnedValues keeps only the fields the scope owns', () => {
  const fields = new Map([
    ['name', {}],
    ['height', {}],
  ]);
  expect(pickOwnedValues(fields, { name: 'A', height: 3, system_section: null })).toEqual({
    name: 'A',
    height: 3,
  });
  expect(pickOwnedValues(undefined, { name: 'A' })).toEqual({});
});
