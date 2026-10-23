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
