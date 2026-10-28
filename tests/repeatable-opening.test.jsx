// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { FormRenderer } from '../dist/index.js';
import { field, repeatable } from './fixtures/diagnostic-conformance.js';

afterEach(cleanup);
const fixture = () => ({
  schema: {
    form: {
      name: 'Opening controls',
      elements: [
        field('TextField', 'root_note'),
        repeatable('rows', [
          field('TextField', 'name'),
          field('TextField', 'row_trace'),
          repeatable('children', [field('TextField', 'detail')]),
        ]),
      ],
      events: {
        code: [
          "ON('load-repeatable', 'rows', function (event) { if (event.mode === 'edit') SETVALUE('row_trace', 'load'); });",
          "ON('edit-repeatable', 'rows', function () { SETVALUE('row_trace', $row_trace + ':edit'); });",
          "ON('new-repeatable', 'rows', function () { SETVALUE('row_trace', $row_trace + ':new'); });",
        ].join('\n'),
      },
    },
  },
  snapshot: {
    raw_values: {},
    repeatable: {
      rows: [
        {
          id: 0,
          values: { name: 'Existing', row_trace: 'accepted' },
          repeatable: {
            children: [{ id: 0, values: { detail: 'Nested' } }],
          },
        },
      ],
    },
  },
});
const options = (security) => ({
  security,
  diagnostics: { console: false },
  events: { lifecycle: true, recordKind: 'existing' },
});
const openRow = async () => {
  fireEvent.click(await screen.findByRole('button', { name: 'View', exact: true }));
  fireEvent.click(await screen.findByRole('button', { name: 'View', exact: true }));
  return within(await screen.findByRole('dialog'));
};
const locked = (input) => input.readOnly || input.disabled;

for (const security of [undefined, { mode: 'safe' }]) {
  it(`web existing rows open in view mode and dispatch edit once on transition (${security?.mode || 'trusted'})`, async () => {
    const { schema, snapshot } = fixture();
    render(
      <FormRenderer schema={schema} initialSnapshot={snapshot} engineOptions={options(security)} />
    );
    const row = await openRow();
    expect(locked(row.getByLabelText('name'))).toBe(true);
    await waitFor(() => expect(row.getByLabelText('row_trace').value).toBe('accepted'));
    fireEvent.click(row.getByRole('button', { name: 'Edit', exact: true }));
    await waitFor(() => expect(row.getByLabelText('row_trace').value).toBe('accepted:edit'));
    expect(locked(row.getByLabelText('name'))).toBe(false);
  });
  it(`web direct editing is explicit and new rows always start editing (${security?.mode || 'trusted'})`, async () => {
    for (const create of [false, true]) {
      const { schema, snapshot } = fixture();
      render(
        <FormRenderer
          schema={schema}
          initialSnapshot={snapshot}
          repeatableEntryMode={create ? 'readonly' : 'edit'}
          engineOptions={options(security)}
        />
      );
      fireEvent.click(await screen.findByRole('button', { name: 'View', exact: true }));
      fireEvent.click(
        screen.getByRole('button', { name: create ? /Add/ : 'View', exact: !create })
      );
      const row = within(await screen.findByRole('dialog'));
      await waitFor(() =>
        expect(row.getByLabelText('row_trace').value).toBe(create ? 'load:new' : 'load:edit')
      );
      expect(locked(row.getByLabelText('name'))).toBe(false);
      expect(row.queryByRole('button', { name: 'Edit', exact: true })).toBeNull();
      cleanup();
    }
  });
  it(`web read-only roots and rows permit nested browsing without edit overrides (${security?.mode || 'trusted'})`, async () => {
    for (const rootReadOnly of [true, false]) {
      const { schema, snapshot } = fixture();
      render(
        <FormRenderer
          schema={schema}
          initialSnapshot={snapshot}
          mode={rootReadOnly ? 'readonly' : 'edit'}
          repeatableEntryMode={rootReadOnly ? 'edit' : 'readonly'}
          engineOptions={options(security)}
        />
      );
      let row = await openRow();
      expect(locked(row.getByLabelText('name'))).toBe(true);
      expect(Boolean(row.queryByRole('button', { name: 'Edit', exact: true }))).toBe(!rootReadOnly);
      fireEvent.click(row.getByRole('button', { name: 'View', exact: true }));
      row = within(screen.getByRole('dialog'));
      expect(row.queryByRole('button', { name: /Remove/ })).toBeNull();
      fireEvent.click(row.getByRole('button', { name: 'View', exact: true }));
      await waitFor(() => expect(screen.getAllByRole('dialog')).toHaveLength(2));
      const child = within(screen.getAllByRole('dialog').at(-1));
      expect(locked(child.getByLabelText('detail'))).toBe(true);
      expect(child.queryByRole('button', { name: 'Edit', exact: true })).toBeNull();
      cleanup();
    }
  });
}
