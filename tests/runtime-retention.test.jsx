// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, act, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { FormRenderer } from '../dist/index.js';
import { field, repeatable } from './fixtures/diagnostic-conformance.js';

afterEach(cleanup);

it('keeps a valid sectionless form compact after successful submission', async () => {
  const saved = vi.fn();
  render(
    <FormRenderer
      schema={{ form: { name: 'Valid form', elements: [field('TextField', 'answer')] } }}
      initialValues={{ answer: 'Valid' }}
      engineOptions={{ events: { lifecycle: false } }}
      onSubmit={saved}
    />
  );
  expect(screen.queryByRole('navigation', { name: 'Form sidebar' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Submit', exact: true }));
  await waitFor(() => expect(saved).toHaveBeenCalledOnce());
  expect(screen.queryByRole('navigation', { name: 'Form sidebar' })).toBeNull();
});

for (const hidden of [false, true]) {
  it(`keeps Validation visible after resolving the last finding without sections; hidden=${hidden}`, async () => {
    const saved = vi.fn();
    render(
      <FormRenderer
        schema={{
          form: {
            name: 'Flat form',
            elements: [
              field('TextField', 'answer', hidden ? { visible: false } : { required: true }),
            ],
          },
        }}
        initialValues={{ answer: hidden ? 42 : null }}
        engineOptions={{ events: { lifecycle: false } }}
        submissionOptions={{ validateHiddenValues: true }}
        onResolveHiddenValue={async () => ({ value: null })}
        onSubmit={saved}
      />
    );
    expect(screen.queryByRole('navigation', { name: 'Form sidebar' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Submit', exact: true }));
    if (hidden) {
      fireEvent.click(await screen.findByRole('button', { name: 'Resolve hidden value' }));
    } else {
      await screen.findAllByText('This field is required');
      fireEvent.change(screen.getByLabelText(/^answer/), { target: { value: 'fixed' } });
    }
    expect(await screen.findByText('No validation issues.')).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Form sidebar' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Submit', exact: true }));
    await waitFor(() => expect(saved).toHaveBeenCalledOnce());
    expect(saved.mock.calls[0][0].form_values.answer).toBe(hidden ? null : 'fixed');
  });
}

it('keeps the row Validation panel after correcting its last required answer', async () => {
  render(
    <FormRenderer
      schema={{
        form: {
          name: 'Order',
          elements: [repeatable('items', [field('TextField', 'product', { required: true })])],
        },
      }}
      engineOptions={{ events: { lifecycle: false } }}
    />
  );
  fireEvent.click(await screen.findByRole('button', { name: 'View', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: 'Add', exact: true }));
  const editor = within(await screen.findByRole('dialog'));
  expect(editor.queryByRole('navigation', { name: 'Form sidebar' })).toBeNull();
  fireEvent.click(editor.getByRole('button', { name: 'Save', exact: true }));
  await editor.findByText('This field is required');
  fireEvent.change(editor.getByLabelText(/^product/), { target: { value: 'Apples' } });
  expect(await editor.findByText('No validation issues.')).toBeTruthy();
  expect(editor.getByRole('navigation', { name: 'Form sidebar' })).toBeTruthy();
  fireEvent.click(editor.getByRole('button', { name: 'Save', exact: true }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  fireEvent.click(screen.getByRole('button', { name: 'Add', exact: true }));
  expect(
    within(await screen.findByRole('dialog')).queryByRole('navigation', {
      name: 'Form sidebar',
    })
  ).toBeNull();
});

for (const recovery of [false, true]) {
  it(`keeps a new empty row after Add, Save and Submit; recovery=${recovery}`, async () => {
    const save = vi.fn();
    const resolve = vi.fn();
    render(
      <FormRenderer
        schema={{
          form: {
            name: 'Order',
            elements: [
              repeatable('items', [
                field('TextField', 'product'),
                field('NumericField', 'quantity'),
              ]),
            ],
          },
        }}
        engineOptions={{ events: { lifecycle: false } }}
        onResolveHiddenValue={recovery ? resolve : undefined}
        onSubmit={save}
      />
    );
    fireEvent.click(await screen.findByRole('button', { name: 'View', exact: true }));
    fireEvent.click(await screen.findByRole('button', { name: 'Add', exact: true }));
    const editor = within(await screen.findByRole('dialog'));
    fireEvent.click(editor.getByRole('button', { name: 'Save', exact: true }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'Back', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit', exact: true }));
    await waitFor(() => expect(save).toHaveBeenCalledOnce());
    const rows = save.mock.calls[0][0].form_values.items;
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toEqual(expect.any(String));
    expect(rows[0].form_values).toEqual({ product: null, quantity: null });
    expect(save.mock.calls[0][1].repeatable.items[0].id).toBe(rows[0].id);
    expect(resolve).not.toHaveBeenCalled();
  });
}

it('blocks an empty required row and keeps a cancelled new row out of submission', async () => {
  const save = vi.fn();
  render(
    <FormRenderer
      schema={{
        form: {
          name: 'Order',
          elements: [repeatable('items', [field('TextField', 'product', { required: true })])],
        },
      }}
      engineOptions={{ events: { lifecycle: false } }}
      onSubmit={save}
    />
  );
  fireEvent.click(await screen.findByRole('button', { name: 'View', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: 'Add', exact: true }));
  const editor = within(await screen.findByRole('dialog'));
  fireEvent.click(editor.getByRole('button', { name: 'Save', exact: true }));
  expect(await editor.findByText('This field is required')).toBeTruthy();
  expect(save).not.toHaveBeenCalled();
  fireEvent.click(editor.getByRole('button', { name: 'Cancel', exact: true }));
  fireEvent.click(await screen.findByRole('button', { name: 'Yes, discard', exact: true }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  fireEvent.click(screen.getByRole('button', { name: 'Back', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: 'Submit', exact: true }));
  await waitFor(() => expect(save).toHaveBeenCalledOnce());
  expect(save.mock.calls[0][0].form_values.items).toEqual([]);
});

it('explains a hidden error and lets the application repair root and closed-row values', async () => {
  const saved = vi.fn();
  const snapshots = vi.fn();
  const resolve = vi.fn(async () => ({ value: null }));
  render(
    <FormRenderer
      schema={{
        form: {
          name: 'Recovery',
          elements: [
            field('TextField', 'hidden', { visible: false }),
            repeatable('rows', [field('TextField', 'nested', { visible: false })]),
          ],
        },
      }}
      initialSnapshot={{
        raw_values: { hidden: 9 },
        repeatable: { rows: [{ id: 0, values: { nested: 8 } }] },
      }}
      submissionOptions={{ validateHiddenValues: true }}
      engineOptions={{ events: { lifecycle: false } }}
      onResolveHiddenValue={resolve}
      onSubmit={saved}
      onSnapshotChange={snapshots}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
  fireEvent.click(await screen.findByRole('button', { name: /Validation/ }));
  const buttons = await screen.findAllByRole('button', { name: 'Resolve hidden value' });
  expect(buttons).toHaveLength(2);
  fireEvent.click(buttons[0]);
  await waitFor(() => expect(resolve).toHaveBeenCalledTimes(1));
  expect(resolve.mock.calls[0][0]).toMatchObject({ fieldName: 'hidden', value: 9, hidden: true });
  await waitFor(() => expect(snapshots.mock.calls.at(-1)[0].raw_values.hidden).toBeNull());
  fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
  await waitFor(() =>
    expect(screen.getAllByRole('button', { name: 'Resolve hidden value' })).toHaveLength(1)
  );
  fireEvent.click(screen.getByRole('button', { name: 'Resolve hidden value' }));
  await waitFor(() => expect(resolve).toHaveBeenCalledTimes(2));
  expect(resolve.mock.calls[1][0].instancePath[0].instanceId).toBe(0);
  await waitFor(() =>
    expect(snapshots.mock.calls.at(-1)[0].repeatable.rows[0].values.nested).toBeNull()
  );
  fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
  await waitFor(() => expect(saved).toHaveBeenCalledOnce());
  expect(saved.mock.calls[0][0].form_values.hidden).toBeNull();
  expect(saved.mock.calls[0][0].form_values.rows[0].form_values.nested).toBeNull();
});

it('shows hidden findings as explanations without dead navigation when no recovery handler exists', async () => {
  render(
    <FormRenderer
      schema={{
        form: { name: 'Hidden', elements: [field('TextField', 'hidden', { visible: false })] },
      }}
      initialValues={{ hidden: 9 }}
      submissionOptions={{ validateHiddenValues: true }}
      engineOptions={{ events: { lifecycle: false } }}
      onSubmit={() => {}}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
  await screen.findByText(/This value is hidden/);
  expect(screen.queryByRole('button', { name: /hidden.*must be a string/ })).toBeNull();
});

it('keeps stale recovery feedback visible after editing resets the validation findings', async () => {
  let finish;
  const snapshots = vi.fn();
  const resolve = vi.fn(
    () =>
      new Promise((done) => {
        finish = done;
      })
  );
  render(
    <FormRenderer
      schema={{
        form: {
          name: 'Recovery',
          elements: [field('TextField', 'shown'), field('TextField', 'hidden', { visible: false })],
        },
      }}
      initialValues={{ shown: 'keep', hidden: 9 }}
      submissionOptions={{ validateHiddenValues: true }}
      engineOptions={{ events: { lifecycle: false } }}
      onResolveHiddenValue={resolve}
      onSnapshotChange={snapshots}
      onSubmit={() => {}}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Resolve hidden value' }));
  await waitFor(() => expect(resolve).toHaveBeenCalledOnce());
  fireEvent.change(screen.getByLabelText('shown'), { target: { value: 'changed' } });
  await waitFor(() => expect(snapshots.mock.calls.at(-1)[0].raw_values.shown).toBe('changed'));
  await act(async () => finish({ value: null }));
  expect((await screen.findByRole('alert')).textContent).toMatch(/record changed/i);
  expect(snapshots.mock.calls.at(-1)[0].raw_values.hidden).toBe(9);
});
for (const security of [undefined, { mode: 'safe' }]) {
  it(`clears closed rows immediately without collection calculations (${security?.mode || 'trusted'})`, async () => {
    let controller;
    const snapshots = vi.fn();
    const schema = {
      form: {
        name: 'Retention',
        elements: [
          field('NumericField', 'show_rows'),
          {
            ...repeatable('rows', [
              field('TextField', 'secret', { visible_preserve_value: false }),
              field('TextField', 'keep'),
            ]),
            visible: false,
            visible_conditions: { field_id: 'show_rows', operator: 'equal_to', value: 1 },
          },
        ],
      },
    };
    render(
      <FormRenderer
        schema={schema}
        initialSnapshot={{
          raw_values: { show_rows: 1 },
          repeatable: { rows: [{ id: 0, values: { secret: 'secret', keep: 'keep' } }] },
        }}
        engineOptions={{
          security,
          events: { lifecycle: false },
          onEventController: (value) => {
            controller = value;
          },
        }}
        onSnapshotChange={snapshots}
      />
    );
    const input = await screen.findByDisplayValue('1');
    await waitFor(() => expect(controller).toBeTruthy());
    fireEvent.change(input, { target: { value: '0' } });
    await waitFor(() =>
      expect(snapshots.mock.calls.at(-1)[0].repeatable.rows[0].values.secret).toBeNull()
    );
    expect(snapshots.mock.calls.at(-1)[0].repeatable.rows[0].values.keep).toBe('keep');
    fireEvent.change(input, { target: { value: '1' } });
    await waitFor(() => expect(snapshots.mock.calls.at(-1)[0].raw_values.show_rows).toBe(1));
    expect(snapshots.mock.calls.at(-1)[0].repeatable.rows[0].values.secret).toBeNull();
    let result;
    await act(async () => {
      result = await controller.prepareSave({ intent: 'submit' });
    });
    expect(result.eligible).toBe(true);
    expect(result.payload.form_values.rows[0].form_values.secret).toBeNull();
  });
  it(`strict hidden-value submission keeps draft eligibility (${security?.mode || 'trusted'})`, async () => {
    let controller;
    render(
      <FormRenderer
        schema={{
          form: { name: 'Strict', elements: [field('TextField', 'hidden', { visible: false })] },
        }}
        initialValues={{ hidden: 9 }}
        submissionOptions={{ validateHiddenValues: true }}
        engineOptions={{
          security,
          events: { lifecycle: false },
          onEventController: (value) => {
            controller = value;
          },
        }}
      />
    );
    await waitFor(() => expect(controller).toBeTruthy());
    let result;
    await act(async () => {
      result = await controller.prepareSave({ intent: 'submit' });
    });
    expect(result.eligible).toBe(false);
    expect(result.validationSummary.generalErrors[0].fieldName).toBe('hidden');
    await act(async () => {
      result = await controller.prepareSave({ intent: 'draft' });
    });
    expect(result.eligible).toBe(true);
  });
}
