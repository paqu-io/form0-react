// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import { SAFE_SECURITY_CONFIG } from 'form0-core';
import { FormRenderer } from '../dist/index.js';
import { useFormEngine } from '../src/use-form-engine.js';
import { useRepeatableInstanceEngine } from '../src/use-repeatable-instance.js';
import { buildRepeatableInfo } from '../src/utils/repeatable-manager.js';
import { field, schema, nestedSchema } from './fixtures/diagnostic-conformance.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const quiet = { diagnostics: { console: false } };
const healthyValues = { input: 4 };
const rowsInfo = buildRepeatableInfo(nestedSchema.form.elements).repeatableSectionTree.get('rows');
const rowSeed = { id: 'row-b', values: { amount: 0 }, repeatable: {} };
const rowPath = [{ repeatableKey: 'rows', instanceId: 'row-b', index: 1, identity: 'id' }];

describe('engine options and diagnostics', () => {
  it('observes initial errors, identical evaluations, recovery and unmount through real root hook', async () => {
    const reports = [];
    const options = {
      ...quiet,
      onDiagnostics: (snapshot, meta) => reports.push({ snapshot, meta }),
    };
    const { result, unmount } = renderHook(() =>
      useFormEngine(schema, undefined, undefined, options)
    );
    await waitFor(() => expect(reports.some((r) => r.snapshot.length)).toBe(true));
    const count = reports.length;
    act(() => result.current.engine.eval());
    expect(reports).toHaveLength(count + 1);
    act(() => result.current.setValue('input', 4));
    expect(reports.at(-1).snapshot).toEqual([]);
    expect(result.current.errors).toEqual({});
    act(() => result.current.setValue('input', 0));
    expect(reports.at(-1).snapshot[0].code).toBe('runtime_exception');
    unmount();
    expect(reports.at(-1).meta.kind).toBe('scope-ended');
    expect(reports.at(-1).snapshot).toEqual([]);
  });
  it('refreshes observers/preferences without engine replacement or evaluation', async () => {
    const first = vi.fn(),
      second = vi.fn();
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result, rerender } = renderHook(
      ({ options }) => useFormEngine(schema, undefined, undefined, options),
      { initialProps: { options: { ...quiet, onDiagnostics: first } } }
    );
    await waitFor(() => expect(first).toHaveBeenCalled());
    const engine = result.current.engine;
    const calls = first.mock.calls.length;
    rerender({ options: { onDiagnostics: second } });
    expect(result.current.engine).toBe(engine);
    expect(first).toHaveBeenCalledTimes(calls);
    expect(second).not.toHaveBeenCalled();
    act(() => engine.eval());
    expect(second).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledTimes(1);
  });
  it('reports only owned row fields, refreshes row callbacks and retires invalidated schemas', async () => {
    const first = vi.fn(),
      second = vi.fn();
    const { result, rerender } = renderHook(
      ({ options, active }) =>
        useRepeatableInstanceEngine({
          schema: nestedSchema,
          repInfo: rowsInfo,
          baseValues: healthyValues,
          initialInstance: rowSeed,
          diagnosticInstancePath: rowPath,
          diagnosticsActive: active,
          engineOptions: options,
        }),
      { initialProps: { options: { ...quiet, onDiagnostics: first }, active: true } }
    );
    await waitFor(() => expect(first).toHaveBeenCalled());
    expect(first.mock.calls.at(-1)[0].map((d) => d.fieldName)).toEqual(['row_total']);
    expect(first.mock.calls.at(-1)[1].instancePath[0].instanceId).toBe('row-b');
    rerender({ options: { ...quiet, onDiagnostics: second }, active: true });
    expect(second).not.toHaveBeenCalled();
    act(() => result.current.setValue('amount', 4));
    expect(second.mock.calls.at(-1)[0]).toEqual([]);
    rerender({ options: { ...quiet, onDiagnostics: second }, active: false });
    expect(second.mock.calls.at(-1)[1].kind).toBe('scope-ended');
    const count = second.mock.calls.length;
    act(() => result.current.setValue('amount', 0));
    expect(second).toHaveBeenCalledTimes(count);
  });
  it('forwards initial warning and update callbacks through the public renderer', async () => {
    const onWarning = vi.fn(),
      onUpdate = vi.fn();
    const warningSchema = {
      form: {
        name: 'Warnings',
        elements: [field('CalculatedField', 'result', { calculate: 'return $unknown_field;' })],
      },
    };
    render(
      <FormRenderer
        schema={warningSchema}
        engineOptions={{ events: { recordKind: 'existing' }, ...quiet, onWarning, onUpdate }}
      />
    );
    await waitFor(() => expect(onWarning).toHaveBeenCalled());
    expect(onWarning.mock.calls[0][0].reason).toBe('not_found');
    expect(onUpdate).toHaveBeenCalled();
  });
  it('supports public helpers and delegates non-alert operations while showing ALERT exactly once', async () => {
    const options = {
      ...quiet,
      helpers: { double: (n) => n * 2 },
      onOperations: vi.fn((ops, meta, applyDefault) => applyDefault(ops, meta)),
      onUpdate: vi.fn(),
    };
    const fixture = {
      form: {
        name: 'Operations',
        events: {
          code: "ON('load-record', () => { SETVALUE('input', 4); ALERT('Notice', 'once'); });",
        },
        elements: [
          field('NumericField', 'input', { default_value: 2 }),
          field('CalculatedField', 'result', { calculate: 'return double($input);' }),
        ],
      },
    };
    render(
      <FormRenderer
        schema={fixture}
        engineOptions={{ ...options, events: { recordKind: 'existing', ...options?.events } }}
      />
    );
    await waitFor(() => expect(options.onOperations).toHaveBeenCalled());
    expect(
      options.onOperations.mock.calls.flatMap((c) => c[0]).every((o) => o.operation !== 'ALERT')
    ).toBe(true);
    await waitFor(() => expect(screen.getAllByText('once')).toHaveLength(1));
    await waitFor(() => expect(options.onUpdate.mock.calls.at(-1)[0].values.result).toBe(8));
  });
  it('supports selective default delegation and forwards security configuration', async () => {
    const onUpdate = vi.fn();
    const fixture = {
      form: {
        name: 'Selective',
        events: {
          code: "ON('load-record', () => { SETVALUE('input', 4); SETVALUE('auxiliary', 9); });",
        },
        elements: [
          ...schema.form.elements,
          field('NumericField', 'auxiliary', { default_value: 5 }),
        ],
      },
    };
    const onOperations = vi.fn((ops, meta, applyDefault) =>
      applyDefault(
        ops.filter((op) => op.params?.fieldDataName === 'input'),
        meta
      )
    );
    const mounted = render(
      <FormRenderer
        schema={fixture}
        engineOptions={{ events: { recordKind: 'existing' }, ...quiet, onOperations, onUpdate }}
      />
    );
    await waitFor(() => expect(onUpdate.mock.calls.at(-1)[0].values.result).toBe(3));
    expect(onUpdate.mock.calls.at(-1)[0].values.auxiliary).toBe(5);
    mounted.unmount();
    const onDiagnostics = vi.fn();
    const restricted = {
      form: {
        name: 'Security',
        elements: [field('CalculatedField', 'result', { calculate: 'process.version' })],
      },
    };
    render(
      <FormRenderer
        schema={restricted}
        engineOptions={{
          events: { recordKind: 'existing' },
          ...quiet,
          security: SAFE_SECURITY_CONFIG,
          onDiagnostics,
        }}
      />
    );
    await waitFor(() => expect(onDiagnostics).toHaveBeenCalled());
    expect(onDiagnostics.mock.calls.at(-1)[0].map((d) => d.code)).toContain(
      'expression_validation_failed'
    );
  });
  it('forwards live public options into an open row and retires it on schema replacement', async () => {
    const first = vi.fn(),
      second = vi.fn();
    let rowEngine;
    const onUpdate = (state, engine) => {
      if ('amount' in state.values && !('input' in state.values)) rowEngine = engine;
    };
    const snapshot = {
      values: { input: 4 },
      repeatable: {
        rows: [
          { id: 'row-a', values: { amount: 4 }, repeatable: {} },
          { id: 'row-b', values: { amount: 0 }, repeatable: {} },
        ],
      },
    };
    const options = { ...quiet, onDiagnostics: first, onUpdate };
    const mounted = render(
      <FormRenderer
        schema={nestedSchema}
        initialSnapshot={snapshot}
        engineOptions={{ ...options, events: { recordKind: 'existing', ...options?.events } }}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'View' }));
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'View' })).toHaveLength(2));
    fireEvent.click(screen.getAllByRole('button', { name: 'View' })[1]);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit', exact: true }));
    await waitFor(() =>
      expect(first.mock.calls.some((c) => c[0].some((d) => d.fieldName === 'row_total'))).toBe(true)
    );
    const rowReport = first.mock.calls.find((c) => c[0].some((d) => d.fieldName === 'row_total'));
    expect(rowReport[1].instancePath[0].instanceId).toBe('row-b');
    expect(rowEngine).toBeTruthy();
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    const currentOptions = { onDiagnostics: second, onUpdate };
    mounted.rerender(
      <FormRenderer
        schema={nestedSchema}
        initialSnapshot={snapshot}
        engineOptions={{
          ...currentOptions,
          events: { recordKind: 'existing', ...currentOptions?.events },
        }}
      />
    );
    expect(second).not.toHaveBeenCalled();
    act(() => rowEngine.eval());
    expect(second.mock.calls.at(-1)[1].scopeId).toBe(rowReport[1].scopeId);
    expect(errors).toHaveBeenCalledTimes(1);
    const removedRowSnapshot = {
      ...snapshot,
      repeatable: { rows: snapshot.repeatable.rows.slice(0, 1) },
    };
    mounted.rerender(
      <FormRenderer
        schema={nestedSchema}
        initialSnapshot={removedRowSnapshot}
        engineOptions={{
          ...currentOptions,
          events: { recordKind: 'existing', ...currentOptions?.events },
        }}
      />
    );
    await waitFor(() =>
      expect(
        second.mock.calls.some(
          (c) => c[1].scopeId === rowReport[1].scopeId && c[1].kind === 'scope-ended'
        )
      ).toBe(true)
    );
    const replacement = { form: { ...nestedSchema.form, name: 'Replacement' } };
    mounted.rerender(
      <FormRenderer
        schema={replacement}
        initialSnapshot={snapshot}
        engineOptions={{
          ...currentOptions,
          events: { recordKind: 'existing', ...currentOptions?.events },
        }}
      />
    );
    await waitFor(() =>
      expect(
        second.mock.calls.some(
          (c) => c[1].scopeId === rowReport[1].scopeId && c[1].kind === 'scope-ended'
        )
      ).toBe(true)
    );
    const count = second.mock.calls.length;
    act(() => rowEngine.eval());
    expect(second).toHaveBeenCalledTimes(count);
  });
  it('keeps closed row values and identifiers outside diagnostic state', async () => {
    const snapshot = {
      values: { input: 4 },
      repeatable: {
        rows: [
          {
            id: 'row-old',
            values: { amount: 3, row_total: 6 },
            repeatable: {
              children: [
                { id: 'child-old', values: { quantity: 2, child_total: 6 }, repeatable: {} },
              ],
            },
            attachment: { media_id: 'media-a' },
          },
        ],
      },
    };
    const original = JSON.stringify(snapshot);
    const onSubmit = vi.fn();
    render(
      <FormRenderer
        schema={nestedSchema}
        initialSnapshot={snapshot}
        engineOptions={{ ...quiet, events: { recordKind: 'existing', ...quiet?.events } }}
        onSubmit={onSubmit}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(JSON.stringify(snapshot)).toBe(original);
    expect(JSON.stringify(onSubmit.mock.calls[0])).not.toContain('scopeId');
    expect(JSON.stringify(onSubmit.mock.calls[0])).not.toContain('instancePath');
    expect(onSubmit.mock.calls[0][1].repeatable.rows[0].id).toBe('row-old');
    expect(onSubmit.mock.calls[0][1].repeatable.rows[0].values.row_total).toBe(6);
  });
  it('preserves default SETVALUE processing when no consumer operation callback is supplied', async () => {
    const onUpdate = vi.fn();
    const fixture = {
      form: {
        ...schema.form,
        events: { code: "ON('load-record', () => { SETVALUE('input', 4); });" },
      },
    };
    render(
      <FormRenderer
        schema={fixture}
        engineOptions={{ events: { recordKind: 'existing' }, ...quiet, onUpdate }}
      />
    );
    await waitFor(() => expect(onUpdate.mock.calls.at(-1)[0].values.result).toBe(3));
  });
});
