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
  const labels = (parts) => parts.map((part) => part.label);
  const targets = (parts) => parts.map((part) => part.target);
  expect(labels(dialogPathParts({ list: 'Floors', row: 'Ground floor' }))).toEqual(['Floors']);
  const floorOnRooms = dialogPathParts({
    list: 'Floors',
    listKey: 'floors',
    row: 'Ground floor',
    nestedList: 'Rooms',
  });
  expect(labels(floorOnRooms)).toEqual(['Floors', 'Ground floor', 'Rooms']);
  // The first part closes every dialog; a row's part lands on its dialog's page.
  expect(targets(floorOnRooms)).toEqual([{ to: -1, list: null }, { to: 0, list: null }, null]);
  const above = [
    { list: 'Floors', row: 'Ground floor', key: 'floors' },
    { list: 'Rooms', row: 'Bedroom', key: 'rooms' },
  ];
  const wall = dialogPathParts({ above, list: 'Walls', listKey: 'walls', row: 'W3' });
  expect(labels(wall)).toEqual(['Floors', 'Ground floor', 'Rooms', 'Bedroom', 'Walls']);
  // A list's part lands on the dialog that holds the list, showing it.
  expect(targets(wall)).toEqual([
    { to: -1, list: null },
    { to: 0, list: null },
    { to: 0, list: 'rooms' },
    { to: 1, list: null },
    null,
  ]);
  const path = ['Floors', 'Ground floor', 'Rooms', 'Bedroom', 'Walls'];
  expect(collapsedPathParts(path)).toEqual(['Floors', null, 'Bedroom', 'Walls']);
  expect(collapsedPathParts(path, 2)).toEqual([null, 'Walls']);
  expect(collapsedPathParts(['Floors', 'Ground floor', 'Rooms'])).toEqual([
    'Floors',
    'Ground floor',
    'Rooms',
  ]);
});

const survey = () => (
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
const dialogs = () => screen.queryAllByRole('dialog');
const asking = () => screen.queryByRole('dialog', { name: 'This record has unsaved changes' });
async function openChild() {
  const row = within(dialogs()[0]);
  fireEvent.click(row.getByRole('button', { name: 'View', exact: true }));
  fireEvent.click(await row.findByRole('button', { name: 'children 1', exact: true }));
  await waitFor(() => expect(dialogs()).toHaveLength(2));
  return within(dialogs().at(-1));
}

it('a part of the path steps up as Back and Cancel would, asking where there are changes', async () => {
  render(survey());
  fireEvent.click(await screen.findByRole('button', { name: 'View', exact: true }));
  fireEvent.click(await screen.findByRole('button', { name: 'rows 1', exact: true }));
  await screen.findByRole('dialog');
  // A row's part: the dialogs above close; that row's dialog shows its own page.
  fireEvent.click((await openChild()).getByRole('button', { name: 'rows 1' }));
  await waitFor(() => expect(dialogs()).toHaveLength(1));
  await waitFor(() => expect(within(dialogs()[0]).queryByTitle(/›/)).toBeNull());
  // With a change on the way, the dialog asks as its Cancel does; keeping the change stops there.
  const child = await openChild();
  const detail = child.getByLabelText('detail');
  fireEvent.change(detail, { target: { value: 'Changed' } });
  fireEvent.blur(detail);
  await new Promise((resolve) => setTimeout(resolve, 100)); // the engine takes the value
  fireEvent.click(child.getByRole('button', { name: 'rows' }));
  fireEvent.click(
    within(await screen.findByRole('dialog', { name: /unsaved changes/ })).getByRole('button', {
      name: /^Cancel/,
    })
  );
  await waitFor(() => expect(asking()).toBeNull());
  expect(dialogs()).toHaveLength(2);
  // Discarding goes on up: the first part closes every dialog.
  fireEvent.click(child.getByRole('button', { name: 'rows' }));
  fireEvent.click(
    within(await screen.findByRole('dialog', { name: /unsaved changes/ })).getByRole('button', {
      name: /discard/,
    })
  );
  await waitFor(() => expect(dialogs()).toHaveLength(0));
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
