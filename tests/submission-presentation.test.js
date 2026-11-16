import { expect, it } from 'vitest';
import { createInstancePathLabeler } from '../src/utils/submission-presentation.js';

const schema = {
  form: {
    name: 'Survey',
    elements: [
      {
        type: 'RepeatableSection',
        key: 'rooms',
        data_name: 'rooms',
        label: 'Rooms',
        elements: [{ type: 'TextField', key: 'name', data_name: 'name', label: 'Name' }],
      },
    ],
  },
};
const snapshot = { repeatable: { rooms: [{ id: 'a', values: { name: 'Kitchen' } }] } };
const path = [{ repeatableKey: 'rooms', instanceId: 'a', index: 0, identity: 'id' }];

it('a row title names a path segment before the generic "<label> N"', () => {
  expect(createInstancePathLabeler(schema, snapshot)(path)).toBe('Rooms 1');
  const titled = createInstancePathLabeler(schema, snapshot, {
    rowTitle: (key, row) => (key === 'rooms' ? row.values.name : null),
  });
  expect(titled(path)).toBe('Kitchen');
});
