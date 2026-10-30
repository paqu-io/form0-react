// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { FormRenderer } from '../dist/index.js';
import { field, repeatable } from './fixtures/diagnostic-conformance.js';

afterEach(cleanup);
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
