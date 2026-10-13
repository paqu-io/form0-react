// @vitest-environment jsdom
import React from 'react';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { Worker as NodeWorker } from 'node:worker_threads';
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { field, schema, nestedSchema } from './fixtures/diagnostic-conformance.js';
import { buildRepeatableInfo } from '../src/utils/repeatable-manager.js';

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
