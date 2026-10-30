// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { FormRenderer } from '../dist/index.js';
import { field, repeatable } from './fixtures/diagnostic-conformance.js';

let errorLog;
let validationLog;
beforeEach(() => {
  errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
  validationLog = vi.spyOn(console, 'info').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const schema = () => ({
  form: {
    name: 'Submission reporting',
    elements: [
      field('NumericField', 'quantity', { required: true }),
      repeatable('rows', [field('TextField', 'name', { required: true })]),
    ],
  },
});

async function mount(extra = {}, { lifecycle = true, security } = {}) {
  let controller;
  const props = {
    schema: schema(),
    initialValues: { quantity: 2 },
    engineOptions: {
      events: { lifecycle, recordKind: 'new' },
      security,
      diagnostics: { console: false },
      onEventController: (next) => (controller = next),
    },
    ...extra,
  };
  const consumerController = extra.engineOptions?.onEventController;
  props.engineOptions = {
    ...props.engineOptions,
    onEventController: (next) => {
      controller = next;
      consumerController?.(next);
    },
  };
  const view = render(<FormRenderer {...props} />);
  await waitFor(() => expect(controller).toBeTruthy());
  return { view, props };
}

const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Submit', exact: true }));

for (const security of [undefined, { mode: 'safe' }]) {
  for (const lifecycle of [true, false]) {
    for (const asynchronous of [true, false]) {
      it(`reports the original ${asynchronous ? 'rejected promise' : 'throw'} once and preserves retry (${security?.mode || 'trusted'}, lifecycle=${lifecycle})`, async () => {
        const error = new TypeError('Synthetic save failure');
        const onSubmit = vi
          .fn()
          .mockImplementationOnce(() => {
            if (asynchronous) return Promise.reject(error);
            throw error;
          })
          .mockResolvedValueOnce();
        const onRequestClose = vi.fn();
        await mount(
          {
            onSubmit,
            onRequestClose,
            formPlacement: 'form-modal',
            autoCloseOverlayOnSubmit: true,
          },
          { security, lifecycle }
        );
        fireEvent.change(screen.getByLabelText(/^quantity/), { target: { value: '3' } });
        await act(async () => submit());
        await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
        expect(errorLog.mock.calls).toEqual([
          ['[form0-react] Submit failed during onSubmit.', error],
        ]);
        expect(onRequestClose).not.toHaveBeenCalled();
        expect(screen.getByLabelText(/^quantity/).value).toBe('3');
        await act(async () => submit());
        await waitFor(() => expect(onRequestClose).toHaveBeenCalledTimes(1));
        expect(onSubmit).toHaveBeenCalledTimes(2);
        expect(errorLog).toHaveBeenCalledTimes(1);
        expect(validationLog).not.toHaveBeenCalled();
      });
    }
  }
}

it('suppresses save failures explicitly and uses the current setting for pending saves', async () => {
  let reject;
  const pending = new Promise((_resolve, fail) => (reject = fail));
  const onSubmit = vi.fn().mockReturnValueOnce(pending).mockRejectedValueOnce('second failure');
  const { view, props } = await mount({ onSubmit });
  await act(async () => submit());
  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  view.rerender(<FormRenderer {...props} submissionDiagnostics={{ saveFailures: false }} />);
  await act(async () => reject(new Error('first failure')));
  await act(async () => submit());
  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
  expect(errorLog).not.toHaveBeenCalled();
});

for (const lifecycle of [true, false]) {
  for (const validationBlocks of [undefined, true]) {
    it(`validation feedback stays visible with optional console output (${validationBlocks}, lifecycle=${lifecycle})`, async () => {
      const onSubmit = vi.fn();
      await mount(
        { onSubmit, initialValues: {}, submissionDiagnostics: { validationBlocks } },
        { lifecycle }
      );
      await act(async () => submit());
      expect(onSubmit).not.toHaveBeenCalled();
      expect(await screen.findByText(/required/i)).toBeTruthy();
      expect(errorLog).not.toHaveBeenCalled();
      expect(validationLog.mock.calls).toEqual(
        validationBlocks ? [['[form0-react] Submit blocked by validation.']] : []
      );
      fireEvent.change(screen.getByLabelText(/^quantity/), { target: { value: '4' } });
      await act(async () => {});
      expect(validationLog).toHaveBeenCalledTimes(validationBlocks ? 1 : 0);
    });
  }
}

it('applies the validation preference to nested row Save buttons', async () => {
  await mount({ submissionDiagnostics: { validationBlocks: true } });
  fireEvent.click(screen.getByRole('button', { name: 'rows', exact: true }));
  fireEvent.click(await screen.findByRole('button', { name: /Add/i }));
  const dialog = within(await screen.findByRole('dialog'));
  await act(async () => fireEvent.click(dialog.getByRole('button', { name: 'Save', exact: true })));
  await waitFor(() =>
    expect(validationLog.mock.calls).toEqual([['[form0-react] Row save blocked by validation.']])
  );
  expect(errorLog).not.toHaveBeenCalled();
  expect(await dialog.findByText(/required/i)).toBeTruthy();
});

it('a throwing console reporter cannot prevent another save attempt', async () => {
  errorLog.mockImplementation(() => {
    throw new Error('Console unavailable');
  });
  const onSubmit = vi.fn().mockRejectedValueOnce(new Error('Save failed')).mockResolvedValueOnce();
  await mount({ onSubmit });
  await act(async () => submit());
  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  await act(async () => submit());
  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
});

it('reports preparation failure without blaming or calling onSubmit', async () => {
  const form = schema();
  form.form.events = {
    code: "ON('save-record', function() { throw new Error('Save hook failed'); });",
  };
  const onSubmit = vi.fn();
  await mount({ schema: form, onSubmit });
  await act(async () => submit());
  await waitFor(() => expect(errorLog).toHaveBeenCalledTimes(1));
  expect(errorLog.mock.calls[0][0]).toBe('[form0-react] Submit failed during preparation.');
  expect(errorLog.mock.calls[0][1][0]).toEqual({
    code: expect.any(String),
    message: expect.stringContaining('Save hook failed'),
  });
  expect(onSubmit).not.toHaveBeenCalled();
  expect(validationLog).not.toHaveBeenCalled();
});

it('identifies a close callback failure separately from successful persistence', async () => {
  const error = new Error('Close failed');
  const onSubmit = vi.fn().mockResolvedValue();
  const snapshots = vi.fn();
  await mount({
    onSubmit,
    onSnapshotChange: snapshots,
    onRequestClose: () => {
      throw error;
    },
    formPlacement: 'form-modal',
    autoCloseOverlayOnSubmit: true,
  });
  fireEvent.change(screen.getByLabelText(/^quantity/), { target: { value: '3' } });
  await act(async () => submit());
  await waitFor(() => expect(errorLog).toHaveBeenCalledTimes(1));
  expect(onSubmit).toHaveBeenCalledTimes(1);
  expect(errorLog.mock.calls).toEqual([['[form0-react] Submit failed during close.', error]]);
  expect(snapshots.mock.calls.at(-1)[1].dirty).toBe(false);
});

it('changing reporting preferences does not evaluate or replay lifecycle events', async () => {
  const onDiagnostics = vi.fn();
  const { props, view } = await mount({
    engineOptions: {
      events: { recordKind: 'new' },
      diagnostics: { console: false },
      onDiagnostics,
    },
  });
  const previous = onDiagnostics.mock.calls.length;
  view.rerender(
    <FormRenderer
      {...props}
      submissionDiagnostics={{ saveFailures: false, validationBlocks: true }}
    />
  );
  await act(async () => {});
  expect(onDiagnostics).toHaveBeenCalledTimes(previous);
});

it('cancelling a child-calculation review does not report a save failure or validation block', async () => {
  const onSubmit = vi.fn();
  await mount({
    schema: {
      form: {
        name: 'Review cancellation',
        repeatable_recalculation: 'confirm',
        elements: [
          field('NumericField', 'tax', { format: 'float' }),
          field('CalculatedField', 'total', { calculate: "REPEATABLESUM($lines, 'amount')" }),
          repeatable('lines', [
            field('NumericField', 'quantity'),
            field('CalculatedField', 'amount', { calculate: '$quantity * (1 + $tax)' }),
          ]),
        ],
      },
    },
    initialSnapshot: {
      raw_values: { tax: 0.2, total: 110 },
      repeatable: { lines: [{ id: 0, values: { quantity: 100, amount: 110 } }] },
    },
    onSubmit,
    submissionDiagnostics: { validationBlocks: true },
  });
  await act(async () => submit());
  const review = within(await screen.findByRole('dialog'));
  await act(async () =>
    fireEvent.click(review.getByRole('button', { name: 'Cancel', exact: true }))
  );
  expect(onSubmit).not.toHaveBeenCalled();
  expect(errorLog).not.toHaveBeenCalled();
  expect(validationLog).not.toHaveBeenCalled();
});
