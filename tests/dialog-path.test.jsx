// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { FormRenderer } from '../dist/index.js';
import { collapsedPathParts, dialogPathParts } from '../src/dialog-path-parts.js';
import { field, repeatable } from './fixtures/diagnostic-conformance.js';

afterEach(cleanup);

// The header path of nested RepeatableSection dialogs (decided 2026-11-22).
it('a dialog path lists the dialogs under it, then its own list or the list it shows', () => {
  expect(dialogPathParts({ list: 'Floors', row: 'Ground floor' })).toEqual(['Floors']);
  expect(dialogPathParts({ list: 'Floors', row: 'Ground floor', nestedList: 'Rooms' })).toEqual([
    'Floors',
    'Ground floor',
    'Rooms',
  ]);
  const above = [
    { list: 'Floors', row: 'Ground floor' },
    { list: 'Rooms', row: 'Bedroom' },
  ];
  expect(dialogPathParts({ above, list: 'Walls', row: 'W3' })).toEqual([
    'Floors',
    'Ground floor',
    'Rooms',
    'Bedroom',
    'Walls',
  ]);
  expect(collapsedPathParts(['Floors', 'Ground floor', 'Rooms', 'Bedroom', 'Walls'])).toEqual([
    'Floors',
    null,
    'Bedroom',
    'Walls',
  ]);
  expect(collapsedPathParts(['Floors', 'Ground floor', 'Rooms', 'Bedroom', 'Walls'], 2)).toEqual([
    null,
    'Walls',
  ]);
  expect(collapsedPathParts(['Floors', 'Ground floor', 'Rooms'])).toEqual([
    'Floors',
    'Ground floor',
    'Rooms',
  ]);
});

it('a nested RepeatableSection dialog names the path to it; a first-level one reads as before', async () => {
  render(
    <FormRenderer
      schema={{
        form: {
          name: 'Survey',
          elements: [
            repeatable('rows', [
              field('TextField', 'name'),
              repeatable('children', [field('TextField', 'detail')]),
            ]),
          ],
        },
      }}
      initialSnapshot={{
        raw_values: {},
        repeatable: {
          rows: [
            {
              id: 0,
              values: { name: 'Existing' },
              repeatable: { children: [{ id: 0, values: { detail: 'Nested' } }] },
            },
          ],
        },
      }}
      mode="edit"
      engineOptions={{ diagnostics: { console: false }, events: { recordKind: 'existing' } }}
    />
  );
  fireEvent.click(await screen.findByRole('button', { name: 'View', exact: true }));
  fireEvent.click(await screen.findByRole('button', { name: 'rows 1', exact: true }));
  const row = within(await screen.findByRole('dialog'));
  // A first-level dialog on its page: the list's label alone, as before.
  expect(row.queryByTitle(/›/)).toBeNull();
  fireEvent.click(row.getByRole('button', { name: 'View', exact: true }));
  // On its own list: its row and that list.
  expect(await row.findByTitle('rows › rows 1 › children')).toBeTruthy();
  fireEvent.click(row.getByRole('button', { name: 'children 1', exact: true }));
  await waitFor(() => expect(screen.getAllByRole('dialog')).toHaveLength(2));
  const child = within(screen.getAllByRole('dialog').at(-1));
  expect(child.getByTitle('rows › rows 1 › children').textContent).toBe('rows›rows 1›children');
  // The row's own title stays in the bar under the header.
  expect(child.getByText('children 1')).toBeTruthy();
});
