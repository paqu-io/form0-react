import { Worker } from 'node:worker_threads';
import { it, expect } from 'vitest';
import { field, repeatable } from './fixtures/diagnostic-conformance.js';

const cleanPrototypes = {
  arrayValuesUnchanged: true,
  arrayConstructorValuesAbsent: true,
  objectValuesAbsent: true,
};

function recordWorker() {
  const worker = new Worker(new URL('./fixtures/worker-thread-adapter.js', import.meta.url), {
    workerData: { moduleUrl: new URL('../src/engine-worker.js', import.meta.url).href },
  });
  let nextId = 0;
  return {
    terminate: () => worker.terminate(),
    call(action, payload = {}) {
      const id = ++nextId;
      return new Promise((resolve, reject) => {
        const onError = (error) => {
          worker.off('message', onMessage);
          reject(error);
        };
        const onMessage = (message) => {
          if (message.id !== id) return;
          worker.off('error', onError);
          worker.off('message', onMessage);
          if (message.error) reject(new Error(message.error.message));
          else resolve(message.payload);
        };
        worker.once('error', onError);
        worker.on('message', onMessage);
        worker.postMessage({ id, action, payload });
      });
    },
  };
}

const schema = {
  form: {
    name: 'Worker record paths',
    elements: [
      field('NumericField', 'factor'),
      field('CalculatedField', 'grand', { calculate: "REPEATABLESUM($projects, 'total')" }),
      repeatable('projects', [
        field('NumericField', 'surcharge'),
        field('CalculatedField', 'total', {
          calculate: "REPEATABLESUM($tasks, 'cost') + $surcharge * $factor",
        }),
        repeatable('tasks', [field('NumericField', 'cost')]),
      ]),
    ],
  },
};
const snapshot = {
  values: { factor: 2, grand: 60 },
  repeatable: {
    projects: [
      {
        id: 'other',
        values: { surcharge: 0, total: 20 },
        repeatable: { tasks: [{ values: { cost: 20 } }] },
      },
      {
        id: 0,
        values: { surcharge: 5, total: 40 },
        repeatable: { tasks: [{ values: { cost: 10 } }, { values: { cost: 20 } }] },
      },
    ],
  },
};

for (const security of [undefined, { mode: 'safe' }]) {
  const mode = security?.mode || 'trusted';
  it.each(['id', 'position'])(
    `worker resolves %s paths and nested live collections (${mode})`,
    async (identity) => {
      const worker = recordWorker();
      try {
        const captured = structuredClone(snapshot);
        if (identity === 'position') delete captured.repeatable.projects[1].id;
        const original = structuredClone(captured);
        const path = [
          {
            repeatableKey: 'projects',
            identity,
            instanceId: identity === 'id' ? 0 : null,
            index: identity === 'id' ? 0 : 1,
          },
        ];
        const initialized = await worker.call('INIT', {
          schema,
          security,
          initialValues: { factor: 2, surcharge: 5, total: 40 },
          recordSnapshot: captured,
          recordPath: path,
          eventScope: { instancePath: path },
        });
        expect(initialized.state.values.total).toBe(40);
        const updated = await worker.call('SET_VALUES', { updates: { surcharge: 10 } });
        expect(updated.state.values.total).toBe(50);
        expect(captured).toEqual(original);
        expect(await worker.call('TEST_PROTOTYPES')).toEqual(cleanPrototypes);
      } finally {
        await worker.terminate();
      }
    }
  );

  it.each([
    ['prototype index', { repeatableKey: 'projects', identity: 'position', index: '__proto__' }],
    [
      'constructor index',
      { repeatableKey: 'projects', identity: 'position', index: 'constructor' },
    ],
    ['numeric string index', { repeatableKey: 'projects', identity: 'position', index: '0' }],
    ['negative index', { repeatableKey: 'projects', identity: 'position', index: -1 }],
    ['inherited collection', { repeatableKey: '__proto__', identity: 'position', index: 0 }],
    ['missing row', { repeatableKey: 'projects', identity: 'position', index: 9 }],
  ])(`worker rejects %s before mutating a record or prototype (${mode})`, async (_name, part) => {
    const worker = recordWorker();
    try {
      await worker.call('INIT', {
        schema,
        security,
        initialValues: snapshot.values,
        recordSnapshot: snapshot,
      });
      await worker.call('SYNC_RECORD_CONTEXT', { snapshot, instancePath: [part] });
      await expect(worker.call('EVAL')).rejects.toThrow();
      expect(await worker.call('TEST_PROTOTYPES')).toEqual(cleanPrototypes);
    } finally {
      await worker.terminate();
    }
  });

  it(`worker rejects a prototype index during initialization (${mode})`, async () => {
    const worker = recordWorker();
    try {
      await expect(
        worker.call('INIT', {
          schema,
          security,
          initialValues: snapshot.values,
          recordSnapshot: snapshot,
          recordPath: [
            {
              repeatableKey: 'projects',
              identity: 'position',
              instanceId: null,
              index: '__proto__',
            },
          ],
        })
      ).rejects.toThrow('scope path is invalid');
      expect(await worker.call('TEST_PROTOTYPES')).toEqual(cleanPrototypes);
    } finally {
      await worker.terminate();
    }
  });
}
