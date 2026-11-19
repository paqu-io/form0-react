// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { FormRenderer } from '../dist/index.js';
import { field, repeatable } from './fixtures/diagnostic-conformance.js';

afterEach(cleanup);

const schema = {
  form: {
    name: 'Remove confirmation',
    elements: [field('TextField', 'note'), repeatable('rows', [field('TextField', 'name')])],
  },
};
const snapshot = {
  raw_values: {},
  repeatable: { rows: [{ id: 'row-a', values: { name: 'First' } }] },
};

async function openList(props = {}) {
  const snapshots = vi.fn();
  render(
    <FormRenderer
      schema={schema}
      initialSnapshot={snapshot}
      onSnapshotChange={snapshots}
      engineOptions={{ events: { recordKind: 'existing' }, diagnostics: { console: false } }}
      {...props}
    />
  );
  fireEvent.click(await screen.findByRole('button', { name: 'View', exact: true }));
  await screen.findByRole('button', { name: 'rows 1', exact: true });
  return snapshots;
}

it('asks before removing an entry; Cancel and Escape keep it', async () => {
  await openList();
  const trash = screen.getByRole('button', { name: 'Remove rows 1' });
  fireEvent.click(trash);
  const dialog = within(screen.getByRole('alertdialog', { name: 'Remove this entry?' }));
  expect(dialog.getByText('rows 1')).toBeTruthy();
  expect(document.activeElement).toBe(dialog.getByRole('button', { name: 'Cancel' }));
  fireEvent.click(dialog.getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByRole('alertdialog')).toBeNull();
  expect(screen.getByRole('button', { name: 'rows 1', exact: true })).toBeTruthy();
  expect(document.activeElement).toBe(trash);

  fireEvent.click(trash);
  fireEvent.keyDown(screen.getByRole('button', { name: 'Cancel' }), { key: 'Escape' });
  expect(screen.queryByRole('alertdialog')).toBeNull();
  expect(screen.getByRole('button', { name: 'rows 1', exact: true })).toBeTruthy();
});

it('removes the entry once confirmed', async () => {
  const snapshots = await openList();
  fireEvent.click(screen.getByRole('button', { name: 'Remove rows 1' }));
  const dialog = within(screen.getByRole('alertdialog'));
  fireEvent.click(dialog.getByRole('button', { name: 'Remove', exact: true }));
  expect(screen.queryByRole('alertdialog')).toBeNull();
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'rows 1', exact: true })).toBeNull()
  );
  await waitFor(() => expect(snapshots.mock.calls.at(-1)[0].repeatable.rows).toEqual([]));
});

it('takes its shortcuts wherever focus is while it is open', async () => {
  const snapshots = await openList();
  const trash = screen.getByRole('button', { name: 'Remove rows 1' });
  fireEvent.click(trash);
  // Focus left on the page behind (a click there): Alt+Q still cancels, Alt+Y still removes.
  document.body.focus();
  fireEvent.keyDown(document.body, { key: 'q', code: 'KeyQ', altKey: true });
  expect(screen.queryByRole('alertdialog')).toBeNull();
  expect(screen.getByRole('button', { name: 'rows 1', exact: true })).toBeTruthy();
  fireEvent.click(trash);
  const backdrop = screen.getByRole('alertdialog');
  expect(fireEvent.mouseDown(backdrop)).toBe(false); // the press keeps focus in the dialog
  document.body.focus();
  fireEvent.keyDown(document.body, { key: 'y', code: 'KeyY', altKey: true });
  expect(screen.queryByRole('alertdialog')).toBeNull();
  await waitFor(() => expect(snapshots.mock.calls.at(-1)[0].repeatable.rows).toEqual([]));
});

it('offers no removal on a read-only record', async () => {
  await openList({ mode: 'readonly' });
  expect(screen.queryByRole('button', { name: /^Remove/ })).toBeNull();
});
