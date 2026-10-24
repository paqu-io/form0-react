// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { FormRenderer } from '../dist/index.js';
import { field, repeatable } from './fixtures/diagnostic-conformance.js';

afterEach(cleanup);
const schema = (extra = {}) => ({
  form: {
    name: 'Invoice',
    ...extra,
    elements: [
      field('NumericField', 'tax', { format: 'float' }),
      field('CalculatedField', 'grand', { calculate: "REPEATABLESUM($lines, 'total')" }),
      repeatable('lines', [
        field('NumericField', 'amount'),
        field('CalculatedField', 'total', { calculate: '$amount * (1 + $tax)' }),
      ]),
    ],
  },
});
const initial = () => ({
  raw_values: { tax: 0.2, grand: 330 },
  repeatable: {
    lines: [
      { id: 0, values: { amount: 100, total: 110 }, attachment: { media_id: 'retained' } },
      { id: 'B', values: { amount: 200, total: 220 } },
    ],
  },
});

for (const security of [undefined, { mode: 'safe' }]) {
  it(`schema replacement refreshes calculations, collections and event registrations (${security?.mode || 'trusted'})`, async () => {
    const form = schema();
    form.form.elements.splice(
      1,
      0,
      field('TextField', 'event_marker'),
      field('CalculatedField', 'tax_percent', { calculate: '$tax * 100' })
    );
    form.form.events = {
      code: "ON('change', 'tax', function() { SETVALUE('event_marker', ($event_marker || '') + 'A'); });",
    };
    const seed = initial(),
      snapshots = vi.fn();
    const engineOptions = {
      security,
      diagnostics: { console: false },
      events: { lifecycle: true, recordKind: 'existing' },
    };
    const props = { initialSnapshot: seed, onSnapshotChange: snapshots, engineOptions };
    const mounted = render(<FormRenderer {...props} schema={form} />);
    await screen.findByDisplayValue('20');
    fireEvent.change(screen.getByLabelText('tax'), { target: { value: '0.3' } });
    await screen.findByDisplayValue('30');
    await waitFor(() => expect(snapshots.mock.calls.at(-1)[0].raw_values.event_marker).toBe('A'));

    const updated = structuredClone(form);
    updated.form.elements.find((entry) => entry.data_name === 'tax_percent').calculate =
      '$tax * 1000';
    updated.form.elements.find((entry) => entry.data_name === 'grand').calculate =
      "REPEATABLESUM($lines, 'amount')";
    updated.form.elements.push(
      field('CalculatedField', 'added', { calculate: '$tax_percent + 1' })
    );
    updated.form.events.code = form.form.events.code.replace("+ 'A'", "+ 'B'");
    mounted.rerender(<FormRenderer {...props} schema={updated} />);
    await screen.findByLabelText('added');
    await waitFor(() => expect(snapshots.mock.calls.at(-1)[0].raw_values.grand).toBe(300));
    const before = snapshots.mock.calls.at(-1)[0].raw_values.event_marker || '';
    fireEvent.change(screen.getByLabelText('tax'), { target: { value: '0.4' } });
    await screen.findByDisplayValue('400');
    await screen.findByDisplayValue('401');
    await waitFor(() =>
      expect(snapshots.mock.calls.at(-1)[0].raw_values.event_marker).toBe(`${before}B`)
    );
    expect(form.form.elements.find((entry) => entry.data_name === 'tax_percent').calculate).toBe(
      '$tax * 100'
    );
  });

  it(`cached calculations follow repeated and rapid live input edits (${security?.mode || 'trusted'})`, async () => {
    const form = schema();
    form.form.elements.splice(
      2,
      0,
      field('CalculatedField', 'tax_percent', { calculate: '$tax * 100' })
    );
    const seed = initial(),
      original = structuredClone(seed),
      snapshots = vi.fn();
    render(
      <FormRenderer
        schema={form}
        initialSnapshot={seed}
        onSnapshotChange={snapshots}
        engineOptions={{ security, diagnostics: { console: false } }}
      />
    );
    await screen.findByDisplayValue('20');
    const tax = screen.getByLabelText('tax');
    fireEvent.change(tax, { target: { value: '0.3' } });
    await screen.findByDisplayValue('30');
    fireEvent.change(tax, { target: { value: '0.4' } });
    await screen.findByDisplayValue('40');
    fireEvent.change(tax, { target: { value: '0.5' } });
    fireEvent.change(tax, { target: { value: '0.6' } });
    await screen.findByDisplayValue('60');
    expect(snapshots.mock.calls.at(-1)[0].raw_values.grand).toBe(330);
    fireEvent.click(screen.getByRole('button', { name: 'View', exact: true }));
    fireEvent.click(screen.getAllByRole('button', { name: 'View', exact: true })[0]);
    const row = within(await screen.findByRole('dialog'));
    await row.findByDisplayValue('110');
    fireEvent.click(row.getByRole('button', { name: 'Edit', exact: true }));
    await row.findByDisplayValue('160');
    const amount = row.getByLabelText('amount');
    fireEvent.change(amount, { target: { value: '150' } });
    await row.findByDisplayValue('240');
    fireEvent.change(amount, { target: { value: '200' } });
    fireEvent.change(amount, { target: { value: '300' } });
    await row.findByDisplayValue('480');
    expect(snapshots.mock.calls.at(-1)[0].repeatable.lines.map((row) => row.values.total)).toEqual([
      110, 220,
    ]);
    fireEvent.click(row.getByRole('button', { name: 'Save', exact: true }));
    await waitFor(() => {
      expect(snapshots.mock.calls.at(-1)[0].raw_values.grand).toBe(700);
      expect(
        snapshots.mock.calls.at(-1)[0].repeatable.lines.map((row) => row.values.total)
      ).toEqual([480, 220]);
    });
    expect(seed).toEqual(original);
  });
}

it('automatic legacy-opt-out submission refreshes closed children and serializes selected metadata', async () => {
  const onSubmit = vi.fn();
  let controller;
  const source = initial(),
    original = structuredClone(source);
  render(
    <FormRenderer
      schema={schema()}
      initialSnapshot={source}
      onSubmit={onSubmit}
      engineOptions={{
        diagnostics: { console: false },
        onEventController: (value) => (controller = value),
      }}
    />
  );
  await waitFor(() => expect(controller).toBeTruthy());
  fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  const [record, meta] = onSubmit.mock.calls[0];
  expect(record.form_values.grand).toBe(360);
  expect(meta.repeatable.lines.map((row) => row.values.total)).toEqual([120, 240]);
  expect(meta.repeatable.lines[0].id).toBe(0);
  expect(meta.repeatable.lines[0].attachment.media_id).toBe('retained');
  expect(meta.freshness.status).toBe('current');
  expect(source).toEqual(original);
});

it('built-in confirmation can retain all children and restores the saved pending indicator', async () => {
  const onSubmit = vi.fn();
  render(
    <FormRenderer
      schema={schema({ repeatable_recalculation: 'confirm' })}
      initialSnapshot={initial()}
      submissionOptions={{ allowRetain: true }}
      onSubmit={onSubmit}
      engineOptions={{ diagnostics: { console: false } }}
    />
  );
  await screen.findByLabelText('tax');
  fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
  expect(await screen.findByRole('dialog', { name: 'Update child calculations?' })).toBeTruthy();
  expect(onSubmit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Keep existing values and continue' }));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  expect(onSubmit.mock.calls[0][0].form_values.grand).toBe(330);
  const freshness = onSubmit.mock.calls[0][1].freshness;
  expect(freshness.status).toBe('pending');
  expect(
    await screen.findByText('Some saved child calculations still need updating.')
  ).toBeTruthy();
  cleanup();
  render(
    <FormRenderer
      schema={schema()}
      initialSnapshot={initial()}
      initialFreshness={freshness}
      engineOptions={{ diagnostics: { console: false } }}
    />
  );
  expect(
    await screen.findByText('Some saved child calculations still need updating.')
  ).toBeTruthy();
});

it('cancelled review does not submit and a custom preparation never opens a dialog', async () => {
  let controller;
  const onSubmit = vi.fn();
  render(
    <FormRenderer
      schema={schema({ repeatable_recalculation: 'confirm' })}
      initialSnapshot={initial()}
      onSubmit={onSubmit}
      engineOptions={{
        diagnostics: { console: false },
        onEventController: (value) => (controller = value),
      }}
    />
  );
  await waitFor(() => expect(controller).toBeTruthy());
  let prepared;
  await act(async () => {
    prepared = await controller.prepareSave({ intent: 'submit' });
  });
  expect(prepared.status).toBe('requires_decision');
  expect(screen.queryByRole('dialog')).toBeNull();
  await act(async () => {
    await controller.prepareSave({
      intent: 'submit',
      decision: { reviewId: prepared.reviewId, action: 'cancel' },
    });
  });
  fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
  await screen.findByRole('dialog');
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel', exact: true })
  );
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(onSubmit).not.toHaveBeenCalled();
});

it('refresh selection stays dirty after persistence failure and only success acknowledges it', async () => {
  const onSnapshotChange = vi.fn();
  let controller;
  const onSubmit = vi.fn().mockRejectedValueOnce(new Error('Write failed')).mockResolvedValueOnce();
  render(
    <FormRenderer
      schema={schema({ repeatable_recalculation: 'confirm' })}
      initialSnapshot={initial()}
      onSubmit={onSubmit}
      onSnapshotChange={onSnapshotChange}
      engineOptions={{
        diagnostics: { console: false },
        onEventController: (value) => (controller = value),
      }}
    />
  );
  await waitFor(() => expect(controller).toBeTruthy());
  fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
  await screen.findByRole('dialog');
  fireEvent.click(screen.getByRole('button', { name: 'Update all and continue' }));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(onSnapshotChange.mock.calls.at(-1)[1].dirty).toBe(true));
  expect(
    onSnapshotChange.mock.calls.at(-1)[0].repeatable.lines.map((row) => row.values.total)
  ).toEqual([120, 240]);
  fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
  expect(screen.queryByRole('dialog')).toBeNull();
  await waitFor(() => expect(onSnapshotChange.mock.calls.at(-1)[1].dirty).toBe(false));
  expect(onSubmit.mock.calls[1][0].form_values.grand).toBe(360);
});

it('switching records with the same schema submits and acknowledges the current session', async () => {
  const form = schema();
  const onSubmit = vi.fn(),
    onSnapshotChange = vi.fn();
  let controller;
  const engineOptions = {
    diagnostics: { console: false },
    onEventController: (value) => {
      controller = value;
    },
  };
  const props = { schema: form, onSubmit, onSnapshotChange, engineOptions };
  const view = render(<FormRenderer {...props} initialSnapshot={initial()} />);
  await waitFor(() => expect(controller).toBeTruthy());
  fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  const prior = controller;
  const reopened = initial();
  reopened.raw_values.tax = 0.3;
  view.rerender(<FormRenderer {...props} initialSnapshot={reopened} />);
  await waitFor(() => {
    expect(controller).toBeTruthy();
    expect(controller).not.toBe(prior);
  });
  await waitFor(() => expect(screen.getByLabelText('tax').value).toBe('0.3'));
  fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
  expect(onSubmit.mock.calls[1][0].form_values.grand).toBe(390);
  await waitFor(() => expect(onSnapshotChange.mock.calls.at(-1)[1].dirty).toBe(false));
  const ended = await controller.getSaveChanges({
    preparationId: onSubmit.mock.calls[1][1].preparationId,
  });
  expect(ended.status).toBe('failed');
});
