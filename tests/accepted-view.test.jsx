// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { FormRenderer } from '../dist/index.js';
import { field, repeatable } from './fixtures/diagnostic-conformance.js';

afterEach(cleanup);
const fixture = () => ({
  form: {
    name: 'Accepted view',
    elements: [
      field('NumericField', 'tax', { format: 'float' }),
      field('TextField', 'trace'),
      field('CalculatedField', 'grand', { calculate: "REPEATABLESUM($lines, 'total')" }),
      repeatable('lines', [
        field('NumericField', 'amount'),
        field('CalculatedField', 'total', { calculate: '$amount * (1 + $tax)' }),
      ]),
    ],
  },
});
const seed = () => ({
  raw_values: { tax: 0.2, grand: 333, trace: 'accepted' },
  repeatable: {
    lines: [
      { id: 0, values: { amount: 100, total: 110 }, attachment: { media_id: 'kept' } },
      { id: 'B', values: { amount: 200, total: 220 } },
    ],
  },
});

for (const security of [undefined, { mode: 'safe' }]) {
  it(`switching to View after persistence fails preserves the selected unsaved snapshot (${security?.mode || 'trusted'})`, async () => {
    const schema = fixture(),
      source = seed(),
      original = structuredClone(source);
    const save = vi.fn().mockRejectedValue(new Error('Storage unavailable'));
    const snapshots = vi.fn();
    const props = {
      schema,
      initialSnapshot: source,
      onSubmit: save,
      onSnapshotChange: snapshots,
      engineOptions: { security, diagnostics: { console: false } },
    };
    const mounted = render(<FormRenderer {...props} mode="edit" />);
    await screen.findByDisplayValue('330');
    fireEvent.click(screen.getByRole('button', { name: 'Submit', exact: true }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    await screen.findByDisplayValue('360');
    mounted.rerender(<FormRenderer {...props} mode="readonly" />);
    await screen.findByText('You are in View mode');
    expect(screen.getByDisplayValue('360')).toBeTruthy();
    expect(snapshots.mock.calls.at(-1)[0].repeatable.lines.map((row) => row.values.total)).toEqual([
      120, 240,
    ]);
    expect(snapshots.mock.calls.at(-1)[1].dirty).toBe(true);
    expect(source).toEqual(original);
  });
  it(`root and child view preserve accepted calculations; Edit evaluates once (${security?.mode || 'trusted'})`, async () => {
    const schema = fixture();
    const seen = vi.fn();
    schema.form.events = {
      code: "ON('load-record', function(e) { seen(e.type, e.mode); }); ON('edit-record', function(e) { seen(e.type, e.mode); }); ON('load-repeatable', 'lines', function(e) { seen(e.type, e.mode); }); ON('edit-repeatable', 'lines', function(e) { seen(e.type, e.mode); });",
    };
    const source = seed(),
      original = structuredClone(source);
    const snapshots = vi.fn();
    render(
      <FormRenderer
        schema={schema}
        initialSnapshot={source}
        mode="readonly"
        onSnapshotChange={snapshots}
        engineOptions={{
          security,
          helpers: { seen },
          diagnostics: { console: false },
          events: { lifecycle: true, recordKind: 'existing' },
        }}
      />
    );
    await waitFor(() => expect(seen.mock.calls).toEqual([['load-record', 'readonly']]));
    expect(screen.getByDisplayValue('333')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Edit', exact: true }));
    await screen.findByDisplayValue('330');
    await waitFor(() =>
      expect(seen.mock.calls).toEqual([
        ['load-record', 'readonly'],
        ['edit-record', 'edit'],
      ])
    );
    fireEvent.click(screen.getByRole('button', { name: 'View', exact: true }));
    fireEvent.click(screen.getAllByRole('button', { name: 'View', exact: true })[0]);
    const row = within(await screen.findByRole('dialog'));
    expect(await row.findByDisplayValue('110')).toBeTruthy();
    expect(row.getByLabelText('amount').readOnly).toBe(true);
    fireEvent.click(row.getByRole('button', { name: 'Edit', exact: true }));
    expect(await row.findByDisplayValue('120')).toBeTruthy();
    await waitFor(() =>
      expect(seen.mock.calls.slice(-2)).toEqual([
        ['load-repeatable', 'readonly'],
        ['edit-repeatable', 'edit'],
      ])
    );
    expect(
      snapshots.mock.calls.at(-1)[0].repeatable.lines.map((record) => record.values.total)
    ).toEqual([110, 220]);
    fireEvent.click(row.getByRole('button', { name: 'Save', exact: true }));
    await waitFor(() => expect(snapshots.mock.calls.at(-1)[0].raw_values.grand).toBe(340));
    expect(source).toEqual(original);
  });

  for (const lifecycle of [true, false])
    it(`view load rejects a complete write/UI batch before host delegation (${security?.mode || 'trusted'}, lifecycle=${lifecycle})`, async () => {
      const schema = fixture();
      schema.form.events = {
        code: "ON('load-record', function(e) { e.mode = 'edit'; ALERT('Forbidden alert'); SETVALUE('tax', 9); }); ON('edit-record', function(e) { SETVALUE('trace', e.mode); });",
      };
      const delegate = vi.fn(),
        warning = vi.fn();
      let controller;
      render(
        <FormRenderer
          schema={schema}
          initialSnapshot={seed()}
          mode="readonly"
          engineOptions={{
            security,
            diagnostics: { console: false },
            events: { lifecycle, ...(lifecycle ? { recordKind: 'existing' } : {}) },
            onOperations: delegate,
            onWarning: warning,
            onEventController: (value) => (controller = value),
          }}
        />
      );
      await waitFor(() => expect(warning).toHaveBeenCalled());
      expect(screen.getByLabelText('tax').value).toBe('0.2');
      expect(screen.getByDisplayValue('333')).toBeTruthy();
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(delegate).not.toHaveBeenCalled();
      await waitFor(() => expect(controller).toBeTruthy());
      let rejected;
      await act(async () => {
        rejected = await controller.dispatch({ type: 'load-record', metadata: { mode: 'edit' } });
      });
      expect(rejected.issues[0].code).toBe('readonly_operation_not_allowed');
      expect(delegate).not.toHaveBeenCalled();
    });
}
