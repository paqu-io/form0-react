import { Worker } from 'node:worker_threads';
import { it, expect } from 'vitest';
import {
  createBuildingPlanSession,
  expandBuildingPlanSchema,
  writeBuildingPlanRecord,
  readBuildingPlanRecord,
} from 'form0-core';
import { createRecordBackend } from '../src/utils/record-coordinator.js';
import { field, repeatable } from './fixtures/diagnostic-conformance.js';

const cleanPrototypes = {
  arrayValuesUnchanged: true,
  arrayConstructorValuesAbsent: true,
  objectValuesAbsent: true,
};

it('actual worker inspects and corrects a hidden malformed value without revealing it', async () => {
  const worker = recordWorker();
  try {
    const schema = {
      form: {
        name: 'Hidden recovery',
        elements: [field('TextField', 'hidden', { visible: false })],
      },
    };
    await worker.call('INIT', { schema, initialValues: { hidden: 9 } });
    const snapshot = { values: { hidden: 9 } };
    const options = { fieldName: 'hidden', instancePath: [] };
    const inspected = await worker.call('RECORD_INSPECT_HIDDEN', { snapshot, options });
    expect(inspected.finding.hidden).toBe(true);
    expect(inspected.value).toBe(9);
    const corrected = await worker.call('RECORD_CORRECT_HIDDEN', {
      snapshot,
      options: { ...options, value: null },
    });
    expect(corrected.snapshot.values.hidden).toBeNull();
    expect(corrected.snapshot.visible.hidden).toBe(false);
    expect(snapshot.values.hidden).toBe(9);
  } finally {
    await worker.terminate();
  }
});

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

it('actual worker transports closed-row clearing without collection calculations', async () => {
  const worker = recordWorker();
  const schema = {
    form: {
      name: 'Worker retention',
      elements: [
        field('NumericField', 'show_rows'),
        {
          ...repeatable('rows', [field('TextField', 'secret', { visible_preserve_value: false })]),
          visible: false,
          visible_conditions: { field_id: 'show_rows', operator: 'equal_to', value: 1 },
        },
      ],
    },
  };
  const snapshot = {
    values: { show_rows: 1 },
    repeatable: { rows: [{ id: 0, values: { secret: 'secret' } }] },
  };
  try {
    await worker.call('INIT', {
      schema,
      initialValues: snapshot.values,
      recordSnapshot: snapshot,
      recordPath: [],
      eventScope: { instancePath: [] },
    });
    const result = await worker.call('SET_VALUES', { updates: { show_rows: 0 } });
    expect(result.state.values.show_rows).toBe(0);
    expect(result.clearedFields).toHaveLength(1);
    expect(result.clearedFields[0].instancePath[0].instanceId).toBe(0);
    expect((await worker.call('READ_STATE')).clearedFields).toEqual([]);
    const strict = await worker.call('RECORD_PREPARE', {
      token: 'strict',
      snapshot: { values: { show_rows: 'bad' } },
      options: { validateHiddenValues: true },
    });
    expect(strict.eligible).toBe(false);
  } finally {
    await worker.terminate();
  }
});

for (const mode of ['trusted', 'safe'])
  it(`actual worker matches main-thread BuildingPlan effective calculations and semantic output (${mode})`, async () => {
    const authored = {
      form: {
        name: 'BuildingPlan worker',
        elements: [
          {
            type: 'BuildingPlanSection',
            key: 'plan',
            data_name: 'plan',
            label: 'Plan',
            description: null,
            description_mode: null,
            visible: true,
            visible_conditions: null,
            read_only: false,
            read_only_conditions: null,
            node_overrides: {
              walls: {
                extra_elements: [
                  field('CalculatedField', 'cost', {
                    calculate: 'SETRESULT($wall_thickness_m * 1000)',
                  }),
                  field('CalculatedField', 'face_cost', { calculate: 'SETRESULT($cost + 1)' }),
                ],
                field_bindings: { cost: { scope: 'physical_wall' } },
              },
            },
          },
        ],
      },
    };
    const expanded = expandBuildingPlanSchema(authored);
    const meta = expanded.buildingPlanMeta[0],
      nodes = meta.repeatablesByNodeKey;
    const domain = createBuildingPlanSession({ properties: meta.properties });
    const floorId = domain.apply({
      type: 'create_floor',
      defaults: { wall_thickness_m: 0.3, wall_height_m: 3 },
    }).created.id;
    for (const [x, y] of [
      [0, 0],
      [3, 3.3],
    ])
      domain.apply({ type: 'create_room', floorId, rectangle: { x, y, width: 5, height: 3 } });
    const floor = domain.getSnapshot().floors[0];
    expect(
      domain.apply({
        type: 'bind_faces',
        floorId,
        referenceFaceId: floor.rooms[0].faces[2].id,
        faceId: floor.rooms[1].faces[0].id,
      }).status
    ).toBe('applied');
    const snapshot = writeBuildingPlanRecord({ meta, plan: domain.getSnapshot() });
    const security = { mode };
    const main = await createRecordBackend({
      schema: authored,
      security,
      diagnostics: { console: false },
    }).prepare(snapshot);
    const worker = recordWorker();
    try {
      await worker.call('INIT', {
        schema: expanded.schema,
        security,
        initialValues: {},
        recordSnapshot: snapshot,
      });
      const result = await worker.call('RECORD_PREPARE', { token: 'plan', snapshot });
      expect(result.status).toBe(main.status);
      const faceCost = nodes.walls.fieldsByOriginalDataName.face_cost.dataName;
      for (const room of result.snapshot.repeatable[nodes.floors.preferredKey][0].repeatable[
        nodes.rooms.preferredKey
      ])
        for (const face of room.repeatable[nodes.walls.preferredKey])
          expect(face.values[faceCost]).toBe(301);
      expect(readBuildingPlanRecord({ meta, record: result.snapshot })).toEqual(
        readBuildingPlanRecord({ meta, record: main.snapshot })
      );
      expect(
        readBuildingPlanRecord({ meta, record: result.snapshot }).floors[0].walls
      ).toHaveLength(7);
    } finally {
      await worker.terminate();
    }
  });
