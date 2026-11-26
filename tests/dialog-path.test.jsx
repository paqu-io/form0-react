// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { FormRenderer } from '../dist/index.js';
import { collapsedPathParts, dialogPathParts, pathTitle } from '../src/dialog-path-parts.js';
import { field, repeatable } from './fixtures/diagnostic-conformance.js';

afterEach(cleanup);

// The header path of RepeatableSection dialogs (decided 2026-11-22). It ends where the dialog is
// (2026-11-26): on a row's page "this entry" after its list (the row's name is the title under the
// header), on one of its lists that list; lists and rows told apart by `kind`.
it('a dialog path lists the dialogs under it, then its own list and "this entry", or the list it shows', () => {
  const labels = (parts) => parts.map((part) => part.label);
  const targets = (parts) => parts.map((part) => part.target);
  const kinds = (parts) => parts.map((part) => part.kind);
  const floor = dialogPathParts({ list: 'Floors', listKey: 'floors', row: 'Ground floor' });
  expect(labels(floor)).toEqual(['Floors', 'this entry']);
  expect(kinds(floor)).toEqual(['list', 'entry']);
  // Its list's part closes the dialog; the full path, as the tooltip reads it, names the row.
  expect(targets(floor)).toEqual([{ to: -1, list: null }, null]);
  expect(pathTitle(floor)).toBe('Floors › Ground floor');
  const floorOnRooms = dialogPathParts({
    list: 'Floors',
    listKey: 'floors',
    row: 'Ground floor',
    nestedList: 'Rooms',
  });
  expect(labels(floorOnRooms)).toEqual(['Floors', 'Ground floor', 'Rooms']);
  expect(kinds(floorOnRooms)).toEqual(['list', 'row', 'list']);
  // The first part closes every dialog; a row's part lands on its dialog's page.
  expect(targets(floorOnRooms)).toEqual([{ to: -1, list: null }, { to: 0, list: null }, null]);
  const above = [
    { list: 'Floors', row: 'Ground floor', key: 'floors' },
    { list: 'Rooms', row: 'Bedroom', key: 'rooms' },
  ];
  const wall = dialogPathParts({ above, list: 'Walls', listKey: 'walls', row: 'W3' });
  expect(labels(wall)).toEqual([
    'Floors',
    'Ground floor',
    'Rooms',
    'Bedroom',
    'Walls',
    'this entry',
  ]);
  // A list's part lands on the dialog that holds the list, showing it.
  expect(targets(wall)).toEqual([
    { to: -1, list: null },
    { to: 0, list: null },
    { to: 0, list: 'rooms' },
    { to: 1, list: null },
    { to: 1, list: 'walls' },
    null,
  ]);
  expect(pathTitle(wall)).toBe('Floors › Ground floor › Rooms › Bedroom › Walls › W3');
  // Collapsed: the first part and the last two, then the last two (the list and where it is).
  const path = ['Floors', 'Ground floor', 'Rooms', 'Bedroom', 'Walls', 'this entry'];
  expect(collapsedPathParts(path)).toEqual(['Floors', null, 'Walls', 'this entry']);
  expect(collapsedPathParts(path, 2)).toEqual([null, 'Walls', 'this entry']);
  expect(collapsedPathParts(['Floors', 'Ground floor', 'Rooms'])).toEqual([
    'Floors',
    'Ground floor',
    'Rooms',
  ]);
  expect(collapsedPathParts(['Floors', 'Ground floor', 'Rooms'], 2)).toEqual([
    null,
    'Ground floor',
    'Rooms',
  ]);
  expect(collapsedPathParts(['Floors', 'this entry'], 2)).toEqual(['Floors', 'this entry']);
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
  await waitFor(() => expect(within(dialogs()[0]).getByTitle('rows › rows 1')).toBeTruthy());
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

it('a RepeatableSection dialog names the path to it, "this entry" last on its page', async () => {
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
  // A first-level dialog on its page: its list, then "this entry", set apart from the names.
  expect(row.getByTitle('rows › rows 1').textContent).toBe('rows›this entry');
  expect(row.getByText('this entry').dataset.kind).toBe('entry');
  expect(row.getByRole('button', { name: 'rows' }).dataset.kind).toBe('list');
  fireEvent.click(row.getByRole('button', { name: 'View', exact: true }));
  // On its own list: its row and that list.
  expect(await row.findByTitle('rows › rows 1 › children')).toBeTruthy();
  fireEvent.click(row.getByRole('button', { name: 'children 1', exact: true }));
  await waitFor(() => expect(screen.getAllByRole('dialog')).toHaveLength(2));
  const child = within(screen.getAllByRole('dialog').at(-1));
  expect(child.getByTitle('rows › rows 1 › children › children 1').textContent).toBe(
    'rows›rows 1›children›this entry'
  );
  expect(child.getByRole('button', { name: 'rows 1' }).dataset.kind).toBe('row');
  // The row's own title stays in the bar under the header.
  expect(child.getByText('children 1')).toBeTruthy();
});
