import { expect, it } from 'vitest';
import { isEmptyValue, sameEntryData } from '../src/utils/entry-data.js';

// What Cancel asks about (2026-11-22): data only.
const row = (values, extra = {}) => ({ id: 'r1', values, repeatable: {}, ...extra });

it('empty values are empty however they are written', () => {
  for (const value of [
    null,
    undefined,
    '',
    [],
    { choice: [], other: [] },
    { choices: [], other: [] },
  ])
    expect(isEmptyValue(value)).toBe(true);
  for (const value of [0, false, 'a', [1], { choice: [{ value: 'a' }], other: [] }, {}])
    expect(isEmptyValue(value)).toBe(false);
});

it("a row's display state and the spelling of empty values are not changes", () => {
  const initial = {
    values: { plaster: null, name: 'Ground floor' },
    repeatable: { rooms: [row({ note: '' })] },
  };
  const current = {
    values: { plaster: { choice: [], other: [] }, name: 'Ground floor' },
    repeatable: {
      rooms: [
        row(
          { note: null },
          { visible: { note: true }, required: { note: false }, errors: {}, read_only: {} }
        ),
      ],
    },
  };
  expect(sameEntryData(current, initial)).toBe(true);
});

it('edits to values, nested rows or the rows themselves are changes', () => {
  const initial = {
    values: { name: 'Ground floor' },
    repeatable: { rooms: [row({ note: 'a' }, { repeatable: { walls: [row({ w: 1 })] } })] },
  };
  const edit = (change) => sameEntryData(change(structuredClone(initial)), initial);
  expect(edit((data) => ((data.values.name = 'First floor'), data))).toBe(false);
  expect(edit((data) => ((data.repeatable.rooms[0].values.note = 'b'), data))).toBe(false);
  expect(edit((data) => ((data.repeatable.rooms[0].repeatable.walls[0].values.w = 2), data))).toBe(
    false
  );
  expect(edit((data) => (data.repeatable.rooms.push(row({})), data))).toBe(false);
  expect(edit((data) => ((data.values.kind = { choice: [{ value: 'a' }], other: [] }), data))).toBe(
    false
  );
});
