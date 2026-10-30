// @vitest-environment jsdom
import React from 'react';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { Worker as NodeWorker } from 'node:worker_threads';
import { Blob as NodeBlob } from 'node:buffer';
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { field, schema, nestedSchema } from './fixtures/diagnostic-conformance.js';
import { buildRepeatableInfo } from '../src/utils/repeatable-manager.js';
import { attachRecordWorker } from '../src/record-context.jsx';
import { createRecordCoordinator } from '../src/utils/record-coordinator.js';

const workers = new Set();
class ThreadWorker {
  constructor(url) {
    this.handlers = new Set();
    this.sent = [];
    this.held = [];
    this.hold = false;
    this.worker = new NodeWorker(
      pathToFileURL(resolve(process.cwd(), 'tests/fixtures/worker-thread-adapter.js')),
      { workerData: { moduleUrl: url.href } }
    );
    this.worker.on('message', (data) => {
      if (this.hold) this.held.push(data);
      else this.handlers.forEach((handler) => handler({ data }));
    });
    workers.add(this);
  }
  addEventListener(_kind, handler) {
    this.handlers.add(handler);
  }
  removeEventListener(_kind, handler) {
    this.handlers.delete(handler);
  }
  postMessage(message) {
    this.sent.push(message);
    this.worker.postMessage(message);
  }
  terminate() {
    workers.delete(this);
    return this.worker.terminate();
  }
}
vi.stubGlobal('Worker', ThreadWorker);
const { EngineWorkerClient } = await import('../src/engine-worker-client.js');
const { useFormEngine } = await import('../src/use-form-engine.js');
const { useRepeatableInstanceEngine } = await import('../src/use-repeatable-instance.js');
afterEach(() => {
  cleanup();
  for (const worker of workers) worker.terminate();
  vi.restoreAllMocks();
});
const createWorker = () =>
  new ThreadWorker(pathToFileURL(resolve(process.cwd(), 'src/engine-worker.js')));
const values = { input: 4 };

it('worker view preserves accepted scalar results and exposes authoritative event modes', async () => {
  const client = new EngineWorkerClient({ createWorker });
  const fixture = {
    form: {
      name: 'Worker view',
      elements: [
        field('NumericField', 'input'),
        field('CalculatedField', 'result', { calculate: '$input * 2' }),
      ],
      events: {
        code: "ON('load-record', function(e) { ALERT('Mode', e.mode); if (e.mode === 'edit') SETVALUE('input', 9); }); ON('edit-record', function(e) { ALERT('Mode', e.mode); });",
      },
    },
  };
  await client.init({ schema: fixture, initialValues: { input: 2, result: 99 }, mode: 'readonly' });
  expect(client.getState().values.result).toBe(99);
  const load = await client.triggerDetailed('load-record', undefined, { mode: 'edit' });
  expect(load.issues).toEqual([]);
  expect(load.operations).toHaveLength(1);
  expect(load.operations[0].params.message).toBe('readonly');
  await client.setMode('edit');
  expect((await client.readState()).values.result).toBe(4);
  expect((await client.triggerDetailed('edit-record')).operations[0].params.message).toBe('edit');
  await client.setMode('readonly');
  await client.eval();
  expect(client.getState().values.result).toBe(4);
  client.terminate();
});

it('real worker initialization/updates/eval/reset and events deliver each evaluation once', async () => {
  const reports = [];
  const warnings = [];
  const client = new EngineWorkerClient({
    createWorker,
    onDiagnostics: (d) => reports.push(d),
    onWarning: (w) => warnings.push(w),
  });
  const fixture = {
    form: { ...schema.form, events: { code: "ON('load-record', () => SETVALUE('input', 0));" } },
  };
  await client.init({ schema: fixture, initialValues: values, scopeId: 'scope-a' });
  expect(reports).toHaveLength(1);
  expect(reports[0].diagnostics).toEqual([]);
  await client.setValues({ input: 0 });
  await client.eval();
  expect(reports).toHaveLength(3);
  expect(client.getDiagnostics()[0].code).toBe('runtime_exception');
  const snapshot = client.getDiagnostics();
  snapshot[0].code = 'wrong';
  expect(client.getDiagnostics()[0].code).toBe('runtime_exception');
  await client.setValues({ input: 4 });
  expect(reports.at(-1).diagnostics).toEqual([]);
  const count = reports.length;
  const event = await client.triggerEvent('load-record');
  expect(event.operations).toHaveLength(1);
  expect(reports).toHaveLength(count);
  await client.reset({ input: 0 }, { scopeId: 'scope-b' });
  expect(client.getState().values.input).toBe(0);
  expect(reports.at(-1).scopeId).toBe('scope-b');
  expect(reports.at(-1).evaluationId).toBe(1);
  const length = reports.length;
  client.handleMessage({
    data: {
      kind: 'diagnostics',
      payload: { scopeId: 'scope-a', evaluationId: 99, diagnostics: [] },
    },
  });
  client.handleMessage({
    data: {
      kind: 'diagnostics',
      payload: { scopeId: 'scope-b', evaluationId: 1, diagnostics: [] },
    },
  });
  expect(reports).toHaveLength(length);
  expect(client.getDiagnostics()).toHaveLength(1);
  client.terminate();
});
it('worker helpers/security fail clearly before any request is posted', async () => {
  const client = new EngineWorkerClient({ createWorker });
  await expect(client.init({ schema, helpers: { DOUBLE: (n) => n * 2 } })).rejects.toThrow(
    'Function-valued helpers'
  );
  await expect(client.init({ schema, security: { custom: () => true } })).rejects.toThrow(
    'structured-cloneable'
  );
  expect(client.worker.sent).toHaveLength(0);
  expect(client.pending.size).toBe(0);
  client.terminate();
});
it('root worker hook observes recovery, refreshes callbacks, rejects old generations and retires on reset', async () => {
  const first = vi.fn(),
    second = vi.fn();
  const options = {
    engineMode: 'worker',
    createWorker,
    diagnostics: { console: false },
    onDiagnostics: first,
  };
  const { result, rerender, unmount } = renderHook(
    ({ opts }) => useFormEngine(schema, values, undefined, opts),
    { initialProps: { opts: options } }
  );
  await waitFor(() => expect(first).toHaveBeenCalled());
  const oldScope = first.mock.calls[0][1].scopeId;
  rerender({ opts: { ...options, onDiagnostics: second } });
  expect(second).not.toHaveBeenCalled();
  act(() => result.current.setValue('input', 0));
  await waitFor(() => expect(second.mock.calls.at(-1)[0]).toHaveLength(1));
  act(() => result.current.setValue('input', 4));
  await waitFor(() => expect(second.mock.calls.at(-1)[0]).toEqual([]));
  act(() => result.current.reset(values));
  await waitFor(() =>
    expect(
      second.mock.calls.some((c) => c[1].kind === 'scope-ended' && c[1].scopeId === oldScope)
    ).toBe(true)
  );
  await waitFor(() => expect(second.mock.calls.at(-1)[1].scopeId).not.toBe(oldScope));
  unmount();
  expect(second.mock.calls.at(-1)[1].kind).toBe('scope-ended');
});
it('nested worker hook filters root/sibling findings and captures initial legacy warnings', async () => {
  const repInfo = buildRepeatableInfo(nestedSchema.form.elements).repeatableSectionTree.get('rows');
  const seed = { id: 'row-b', values: { amount: 0 }, repeatable: {} };
  const path = [{ repeatableKey: 'rows', instanceId: 'row-b', index: 1, identity: 'id' }];
  const reports = [];
  const opts = {
    engineMode: 'worker',
    createWorker,
    diagnostics: { console: false },
    onDiagnostics: (d, m) => reports.push({ d, m }),
  };
  const { result, unmount } = renderHook(() =>
    useRepeatableInstanceEngine({
      schema: nestedSchema,
      repInfo,
      baseValues: values,
      initialInstance: seed,
      diagnosticInstancePath: path,
      engineOptions: opts,
    })
  );
  await waitFor(() => expect(reports.length).toBeGreaterThan(0));
  expect(reports.at(-1).d.map((d) => d.fieldName)).toEqual(['row_total']);
  expect(reports.at(-1).m.instancePath[0].instanceId).toBe('row-b');
  act(() => result.current.setValue('amount', 4));
  await waitFor(() => expect(reports.at(-1).d).toEqual([]));
  unmount();
  expect(reports.at(-1).m.kind).toBe('scope-ended');
  const warnings = [];
  const client = new EngineWorkerClient({ createWorker, onWarning: (w) => warnings.push(w) });
  await client.init({
    schema: {
      form: {
        name: 'Warning',
        elements: [field('CalculatedField', 'result', { calculate: 'return $missing;' })],
      },
    },
    scopeId: 'warnings',
  });
  expect(warnings[0].reason).toBe('not_found');
  client.terminate();
});
it('ready row worker reset retires the old scope and restarts evaluation IDs without extra passes', async () => {
  const repInfo = buildRepeatableInfo(nestedSchema.form.elements).repeatableSectionTree.get('rows');
  const seed = { id: 'row-b', values: { amount: 0 }, repeatable: {} };
  const path = [{ repeatableKey: 'rows', instanceId: 'row-b', index: 1, identity: 'id' }];
  const reports = [];
  let worker;
  const opts = {
    engineMode: 'worker',
    createWorker: () => (worker = createWorker()),
    diagnostics: { console: false },
    onDiagnostics: (snapshot, meta) => reports.push({ snapshot, meta }),
  };
  const { result, unmount } = renderHook(() =>
    useRepeatableInstanceEngine({
      schema: nestedSchema,
      repInfo,
      baseValues: values,
      initialInstance: seed,
      diagnosticInstancePath: path,
      engineOptions: opts,
    })
  );
  await waitFor(() => expect(result.current.values.row_total).toBe(null));
  await waitFor(() => expect(reports.length).toBe(1));
  const oldScope = reports[0].meta.scopeId;
  expect(reports[0].snapshot.map((diagnostic) => diagnostic.fieldName)).toEqual(['row_total']);
  const sentBefore = worker.sent.length;
  act(() => result.current.reset({ amount: 4 }));
  await waitFor(() => expect(result.current.values.row_total).toBe(8));
  expect(reports).toHaveLength(3);
  expect(reports[1]).toEqual({
    snapshot: [],
    meta: { scopeId: oldScope, instancePath: path, evaluationId: 1, kind: 'scope-ended' },
  });
  expect(reports[2].snapshot).toEqual([]);
  expect(reports[2].meta.scopeId).not.toBe(oldScope);
  expect(reports[2].meta).toMatchObject({
    instancePath: path,
    evaluationId: 1,
    kind: 'evaluation',
  });
  expect(worker.sent.slice(sentBefore).map((message) => message.action)).toEqual(['RESET']);
  unmount();
  expect(reports.at(-1).meta.kind).toBe('scope-ended');
  expect(
    reports.filter(({ meta }) => meta.scopeId === oldScope && meta.kind === 'scope-ended')
  ).toHaveLength(1);
});
it('throwing/rejected worker observers cannot interrupt state or operations', async () => {
  for (const onDiagnostics of [
    () => {
      throw Error('observer');
    },
    () => Promise.reject(Error('observer')),
  ]) {
    const client = new EngineWorkerClient({ createWorker, onDiagnostics });
    await client.init({ schema, initialValues: values });
    expect(client.getState().values.result).toBe(3);
    await client.setValues({ input: 0 });
    expect(client.getDiagnostics()).toHaveLength(1);
    client.terminate();
  }
});

it('retires pending schema generations without replaying old diagnostics or scheduling extra evaluation', async () => {
  const onDiagnostics = vi.fn();
  let worker;
  let shouldHold = true;
  const options = {
    engineMode: 'worker',
    diagnostics: { console: false },
    onDiagnostics,
    createWorker: () => {
      worker = createWorker();
      worker.hold = shouldHold;
      return worker;
    },
  };
  const { result, rerender } = renderHook(
    ({ definition }) => useFormEngine(definition, values, undefined, options),
    { initialProps: { definition: schema } }
  );
  await waitFor(() => expect(worker.held.length).toBeGreaterThan(0));
  const replacement = structuredClone(schema);
  replacement.form.elements[1].key = 'active_result';
  replacement.form.elements[1].data_name = 'active_result';
  rerender({ definition: replacement });
  expect(onDiagnostics.mock.calls.at(-1)[1].kind).toBe('scope-ended');
  worker.hold = false;
  await act(async () => {
    for (const data of worker.held.splice(0))
      worker.handlers.forEach((handler) => handler({ data }));
    await Promise.resolve();
  });
  expect(onDiagnostics.mock.calls.every((c) => c[1].kind === 'scope-ended')).toBe(true);
  await waitFor(() => expect(result.current.engineReadyVersion).toBeGreaterThan(0));
  shouldHold = false;
  act(() => result.current.reset({ input: 0 }));
  await waitFor(() =>
    expect(onDiagnostics.mock.calls.at(-1)[0][0]?.fieldName).toBe('active_result')
  );
});

it('managed detailed worker execution validates without evaluating and rejects duplicate/stale replies', async () => {
  const { eventSchema } = await import('./fixtures/event-conformance.js');
  const client = new EngineWorkerClient({ createWorker });
  const fixture = eventSchema(
    "ON('validate-record', function(e) { if ($input < 6) INVALID('Reach six.'); });"
  );
  await client.init({
    schema: fixture,
    initialValues: { input: 4 },
    scopeId: 'managed-worker',
    eventScope: { scopeId: 'managed-worker', instancePath: [] },
  });
  const before = client.diagnosticSequence;
  const detail = await client.triggerDetailed('validate-record', undefined, {
    isDraft: false,
    isValid: true,
  });
  expect(detail.validationIssues[0].message).toBe('Reach six.');
  expect(client.diagnosticSequence).toBe(before);
  const current = client.getState();
  client.handleMessage({
    data: {
      id: 1,
      payload: { scopeId: 'managed-worker', stateVersion: 999, state: { values: { input: 99 } } },
    },
  });
  expect(client.getState()).toBe(current);
  await expect(client.triggerDetailed('change', 'input', { callback: () => {} })).rejects.toThrow(
    'structured-cloneable'
  );
  client.terminate();
});

it('public worker controller settles rapid updates and awaited defaults before save serialization', async () => {
  const { FormRenderer } = await import('../dist/index.js');
  const { eventSchema } = await import('./fixtures/event-conformance.js');
  const { render, fireEvent, screen } = await import('@testing-library/react');
  const fixture = eventSchema(
    "ON('load-record', function() { SETVALUE('trace', 'loaded'); });\nON('new-record', function() { SETVALUE('trace', $trace + ':new'); });\nON('validate-record', function() { if ($input < 4) INVALID('Four.'); });\nON('save-record', function() { SETVALUE('input', $input + 1); });"
  );
  let controller;
  const onSubmit = vi.fn();
  const delegated = vi.fn(async (ops, meta, fallback) => {
    await Promise.resolve();
    fallback(ops);
  });
  const onUpdate = vi.fn();
  render(
    React.createElement(FormRenderer, {
      schema: fixture,
      engineMode: 'worker',
      onSubmit,
      engineOptions: {
        createWorker,
        diagnostics: { console: false },
        onUpdate,
        onOperations: delegated,
        events: { lifecycle: true, recordKind: 'new' },
        onEventController: (value) => (controller = value),
      },
    })
  );
  await waitFor(() => expect(controller).toBeTruthy());
  expect(onUpdate.mock.calls.at(-1)[0].values.trace).toBe('loaded:new');
  fireEvent.change(screen.getByLabelText('input'), { target: { value: '0' } });
  fireEvent.change(screen.getByLabelText('input'), { target: { value: '8' } });
  fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  expect(onSubmit.mock.calls[0][0].form_values.input).toBe(9);
  expect(onSubmit.mock.calls[0][0].form_values.result).toBe(18);
  expect(onSubmit.mock.calls[0][1].validationSummary.hasErrors).toBe(false);
});

it('worker media survives unchanged validation/preparation reads without extra evaluations', async () => {
  const previousBlob = globalThis.Blob;
  globalThis.Blob = NodeBlob;
  try {
    const { FormRenderer } = await import('../dist/index.js');
    const { eventSchema } = await import('./fixtures/event-conformance.js');
    const { render } = await import('@testing-library/react');
    const photo = field('PhotoField', 'photo', { min_length: null, max_length: null });
    for (const key of ['supporting_image', 'supporting_image_path', 'supporting_image_display'])
      delete photo[key];
    const fixture = eventSchema(
      "ON('validate-record', function() { if ($photo[0].file.size !== 5) INVALID('Wrong size.'); });"
    );
    fixture.form.elements.push(photo);
    let controller;
    const diagnostics = vi.fn();
    const blob = new Blob(['image'], { type: 'image/jpeg' });
    const initialValues = {
      input: 4,
      photo: [{ photo_id: 'media-A', media_id: 'media-A', url: 'blob:image', file: blob }],
    };
    render(
      React.createElement(FormRenderer, {
        schema: fixture,
        initialValues,
        engineMode: 'worker',
        engineOptions: {
          createWorker,
          diagnostics: { console: false },
          onDiagnostics: diagnostics,
          events: { lifecycle: true, recordKind: 'existing' },
          onEventController: (value) => (controller = value),
        },
      })
    );
    await waitFor(() => expect(controller).toBeTruthy());
    const count = diagnostics.mock.calls.length;
    for (let attempt = 0; attempt < 2; attempt++) {
      let prepared;
      await act(async () => {
        prepared = await controller.prepareSave({ intent: 'submit' });
      });
      expect(prepared.eligible).toBe(true);
      expect(prepared.meta.rawValues.photo[0].media_id).toBe('media-A');
      expect(prepared.meta.rawValues.photo[0].file.size).toBe(5);
      expect(await prepared.meta.rawValues.photo[0].file.text()).toBe('image');
    }
    expect(diagnostics).toHaveBeenCalledTimes(count);
  } finally {
    cleanup();
    globalThis.Blob = previousBlob;
  }
});

it('exposed worker setters reject batches before record coordination or transport', async () => {
  const client = new EngineWorkerClient({ createWorker });
  await client.init({ schema: nestedSchema, initialValues: { input: 4 } });
  const coordinator = createRecordCoordinator({
    schema: nestedSchema,
    seed: { values: { input: 4 }, repeatable: {} },
  });
  attachRecordWorker(client, coordinator, [], { repeatable: () => ({}) });
  const changed = vi.spyOn(coordinator, 'changed');
  const sent = client.worker.sent.length;
  const before = structuredClone(client.getState());
  for (const updates of [undefined, null, [], { input: 9, typo: 1 }, { result: 999 }])
    await expect(client.setValues(updates)).rejects.toThrow(TypeError);
  expect(changed).not.toHaveBeenCalled();
  expect(client.worker.sent.length).toBe(sent);
  expect(client.getState()).toEqual(before);
  await client.setValues({});
  expect(changed).not.toHaveBeenCalled();
  expect(client.worker.sent.at(-1).action).toBe('SET_VALUES');
  client.terminate();
});
