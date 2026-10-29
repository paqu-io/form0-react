import { Worker } from 'node:worker_threads';
import { expect, it } from 'vitest';
import { FIELD_SPECS } from 'form0-core';
import { auditField } from './fixtures/consumer-compatibility.js';

function startWorker() {
  const worker = new Worker(new URL('./fixtures/worker-thread-adapter.js', import.meta.url), {
    workerData: { moduleUrl: new URL('../src/engine-worker.js', import.meta.url).href },
  });

  let id = 0;
  return {
    terminate: () => worker.terminate(),
    call(action, payload = {}) {
      const request = ++id;
      return new Promise((resolve, reject) => {
        const receive = (message) => {
          if (message.id !== request) return;
          worker.off('message', receive);
          worker.off('error', fail);
          if (message.error) reject(new Error(message.error.message));
          else resolve(message.payload);
        };
        const fail = (error) => {
          worker.off('message', receive);
          reject(error);
        };
        worker.on('message', receive);
        worker.once('error', fail);
        worker.postMessage({ id: request, action, payload });
      });
    },
  };
}
const choices = [
  { value: 'it', label: 'Italy' },
  { value: 'fr', label: 'France' },
];
const field = (type, name, extra = {}) => auditField(FIELD_SPECS, type, name, extra);
const schema = {
  form: {
    name: 'Worker updates',
    elements: [
      field('NumericField', 'width'),
      field('NumericField', 'height'),
      field('CalculatedField', 'area', { calculate: '$width * $height' }),
      field('SingleChoiceField', 'country', { choices }),
      field('MultiChoiceField', 'countries', { choices }),
    ],
  },
};

for (const security of [undefined, { mode: 'safe' }])
  it(`actual worker applies strict atomic updates and keeps readonly host replacement separate (${security?.mode || 'trusted'})`, async () => {
    const worker = startWorker();
    try {
      await worker.call('INIT', {
        schema,
        security,
        initialValues: { width: 3, height: 10, country: 'it' },
      });
      const result = await worker.call('SET_VALUES', {
        updates: { width: 4, height: 5, countries: ['fr'] },
        updateVersion: 1,
      });
      expect(result.state.values.area).toBe(20);
      expect(result.state.values.countries.choices[0].label).toBe('France');
      for (const updates of [
        null,
        [],
        { width: 8, typo: 1 },
        { width: 8, country: false },
        { country: ['it'] },
        { countries: 'it' },
        { area: 999 },
      ]) {
        await expect(worker.call('SET_VALUES', { updates })).rejects.toThrow();
        const unchanged = await worker.call('READ_STATE');
        expect(unchanged.state.values).toEqual(result.state.values);
      }
      const initialValues = { width: 3, height: 10, area: 999, country: { choice: 'invalid' } };
      const readonly = await worker.call('INIT', {
        schema,
        security,
        mode: 'readonly',
        initialValues,
      });
      expect(readonly.state.values.area).toBe(999);
      expect(readonly.state.values.country).toEqual({ choice: 'invalid' });
      await expect(worker.call('SET_VALUES', { updates: { country: 'fr' } })).rejects.toThrow(
        /readonly/
      );
      const replaced = await worker.call('REPLACE_VALUES', {
        updates: { country: 'fr' },
        updateVersion: 2,
      });
      expect(replaced.state.values.country.choice[0].label).toBe('France');
      expect(replaced.state.values.area).toBe(999);
      const changed = structuredClone(schema);
      changed.form.elements[3] = field('MultiChoiceField', 'country', {
        choices: [{ value: 'it', label: 'Italia' }],
      });
      const reloaded = await worker.call('INIT', {
        schema: changed,
        security,
        initialValues: { width: 3, height: 10, country: ['it'] },
      });
      expect(reloaded.state.values.country.choices[0].label).toBe('Italia');
      await expect(worker.call('SET_VALUES', { updates: { country: 'it' } })).rejects.toThrow();
    } finally {
      await worker.terminate();
    }
  });

it('actual worker retains registered host metadata fields after reset', async () => {
  const worker = startWorker();
  try {
    await worker.call('INIT', {
      schema,
      initialValues: { width: 3, height: 10, status: 'draft' },
      metadataFields: [field('SingleChoiceField', 'status', { choices })],
    });
    await worker.call('RESET', { initialValues: { width: 4, height: 5 } });
    const result = await worker.call('SET_VALUES', { updates: { status: 'it' } });
    expect(result.state.values.status.choice[0].label).toBe('Italy');
    expect(result.state.values.area).toBe(20);
  } finally {
    await worker.terminate();
  }
});
