import { buildRepeatableMetadata } from 'form0-core';
import { createDiagnosticEngine } from './utils/engine-diagnostics.js';
import {
  createRecordBackend,
  hasRecordCollections,
  applyRecordState,
} from './utils/record-coordinator.js';

let engine = null;
let cachedSchema = null;
let cachedHelpers = undefined;
let cachedSecurity = undefined;
let cachedScopeId = null;
let cachedEventScope = { instancePath: [] };
let diagnosticSequence = 0;
let stateVersion = 0;
let lastUpdateVersion = 0;
let recordBackend = null;
let recordSnapshot = null;
let recordNames = null;
let recordPath = [];
let recordEvaluationSequence = 0;
const recordAborts = new Map();
const getRecordBackend = () =>
  (recordBackend ||= createRecordBackend({
    schema: cachedSchema,
    helpers: cachedHelpers,
    security: cachedSecurity,
  }));
async function evaluateEngine() {
  const evaluation = ++recordEvaluationSequence;
  const capturedEngine = engine;
  if (!hasRecordCollections(cachedSchema)) {
    engine.eval();
    return;
  }
  const snapshot = recordSnapshot || { values: engine.getState().values, repeatable: {} };
  let selected = snapshot;
  for (const part of recordPath) {
    const rows = selected.repeatable?.[part.repeatableKey] || [];
    selected =
      part.identity === 'id'
        ? rows.find((row) => (row.id ?? row.record_id) === part.instanceId)
        : rows[part.index];
    if (!selected) throw new Error('The record worker scope no longer exists.');
  }
  selected.values = {
    ...selected.values,
    ...Object.fromEntries(
      Object.entries(engine.getState().values).filter(([name]) => recordNames.has(name))
    ),
  };
  const result = await getRecordBackend().evaluateScope(snapshot, {
    instancePath: recordPath,
    interactionMode: engine.getMode(),
  });
  if (capturedEngine !== engine || evaluation !== recordEvaluationSequence) return;
  if (result.status !== 'evaluated')
    throw new Error(result.issues?.[0]?.message || 'Record scope evaluation failed.');
  applyRecordState(engine, result.state);
  self.postMessage({
    kind: 'diagnostics',
    payload: {
      scopeId: cachedScopeId,
      evaluationId: ++diagnosticSequence,
      diagnostics: result.diagnostics,
    },
  });
}
// const log = (...args) => {
//   if (typeof console !== 'undefined') {
//     console.log('[form0-worker]', ...args);
//   }
// };

const serializeError = (error) => ({
  message: error?.message || String(error || 'Unknown error'),
});

const buildEngine = async ({
  schema,
  initialValues = {},
  helpers,
  security,
  scopeId,
  eventScope,
  recordSnapshot: snapshot,
  recordPath: path = [],
  mode = 'edit',
}) => {
  if (!schema || !schema.form) {
    throw new Error('form0-react: engine worker requires a valid schema');
  }

  stateVersion = 0;
  lastUpdateVersion = 0;
  cachedSchema = schema;
  cachedHelpers = helpers;
  cachedSecurity = security;
  if (scopeId !== cachedScopeId) diagnosticSequence = 0;
  cachedScopeId = scopeId;
  cachedEventScope = eventScope || { scopeId, instancePath: [] };
  recordBackend?.dispose();
  recordBackend = null;
  recordSnapshot = snapshot || null;
  recordPath = path;
  const metadata = buildRepeatableMetadata(schema.form?.elements || []);
  recordNames = new Set(
    [...metadata.fieldOwnership]
      .filter(
        ([, entry]) =>
          entry.parentPath.length === path.length &&
          entry.parentPath.every((key, index) => key === path[index].repeatableKey)
      )
      .map(([name]) => name)
  );
  if (!path.length && schema.form?.status_field?.data_name)
    recordNames.add(schema.form.status_field.data_name);
  engine = createDiagnosticEngine({
    mode,
    schema,
    initialValues,
    helpers,
    security,
    eventScope: cachedEventScope,
    onWarning: (warning) => self.postMessage({ kind: 'warning', scopeId, payload: warning }),
    onDiagnostics: (diagnostics) =>
      self.postMessage({
        kind: 'diagnostics',
        payload: { scopeId, evaluationId: ++diagnosticSequence, diagnostics },
      }),
  });
  await evaluateEngine();
  //log('engine initialized');
  return engine.getState();
};

const resetEngine = (initialValues = {}, scopeId = cachedScopeId) => {
  if (!cachedSchema) {
    throw new Error('form0-react: engine worker cannot reset before initialization');
  }
  return buildEngine({
    schema: cachedSchema,
    initialValues,
    helpers: cachedHelpers,
    security: cachedSecurity,
    scopeId,
    eventScope: { ...cachedEventScope, scopeId },
    recordSnapshot,
    recordPath,
    mode: engine?.getMode() || 'edit',
  });
};

const applyValueUpdates = async (updates = {}) => {
  if (!engine) {
    throw new Error('form0-react: engine worker not initialized');
  }
  //log('applyValueUpdates', updates);
  const engineState = engine.getState();
  let dirty = false;
  for (const [key, value] of Object.entries(updates)) {
    if (engineState.values[key] !== value) {
      engineState.values[key] = value;
      dirty = true;
    }
  }
  if (dirty) {
    await evaluateEngine();
  }
  return engine.getState();
};

const serializeState = (state) => {
  if (!state) {
    return {
      values: {},
      visible: {},
      required: {},
      read_only: {},
      errors: {},
    };
  }
  return {
    values: state.values,
    visible: state.visible,
    required: state.required,
    read_only: state.read_only,
    errors: state.errors,
  };
};

const withState = (state, extra = {}) => ({
  state: serializeState(state),
  scopeId: cachedScopeId,
  stateVersion: ++stateVersion,
  ...extra,
});

const deepClone = (value) => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
};

const ACTIONS = {
  async INIT(payload = {}) {
    //log('INIT');
    lastUpdateVersion = Number(payload.updateVersion || 0);
    const state = await buildEngine(payload);
    return withState(state, { updateVersion: lastUpdateVersion });
  },
  async RESET(payload = {}) {
    //log('RESET');
    lastUpdateVersion = Number(payload.updateVersion || 0);
    const state = await resetEngine(payload.initialValues || {}, payload.scopeId);
    return withState(state, { updateVersion: lastUpdateVersion });
  },
  async SET_VALUES(payload = {}) {
    //log('SET_VALUES');
    const updateVersion = Number(payload.updateVersion || 0);
    if (updateVersion > lastUpdateVersion) {
      lastUpdateVersion = updateVersion;
    }
    const state = await applyValueUpdates(payload.updates || {});
    return withState(state, { updateVersion: lastUpdateVersion });
  },
  async EVAL() {
    //log('EVAL');
    if (!engine) {
      throw new Error('form0-react: engine worker not initialized');
    }
    await evaluateEngine();
    return withState(engine.getState(), { updateVersion: lastUpdateVersion });
  },
  async SET_MODE(payload) {
    if (!engine) throw new Error('form0-react: engine worker not initialized');
    engine.setMode(payload.mode);
    await evaluateEngine();
    return withState(engine.getState(), { updateVersion: lastUpdateVersion });
  },
  TRIGGER_EVENT(payload = {}) {
    if (!engine) {
      throw new Error('form0-react: engine worker not initialized');
    }
    const { eventType, fieldKey, metadata } = payload;
    if (typeof eventType !== 'string' || eventType.length === 0) {
      return { operations: [] };
    }
    const operations = engine.trigger(eventType, fieldKey, metadata) || [];
    return { operations };
  },
  SYNC_EVENT_READS(payload = {}) {
    if (!engine || payload.scopeId !== cachedScopeId)
      throw new Error('Event worker scope has ended.');
    Object.assign(engine.getState().values, deepClone(payload.values));
    return { scopeId: cachedScopeId };
  },
  READ_STATE() {
    if (!engine) throw new Error('form0-react: engine worker not initialized');
    return withState(engine.getState(), { updateVersion: lastUpdateVersion });
  },
  TRIGGER_DETAILED(payload = {}) {
    if (!engine || payload.scopeId !== cachedScopeId)
      throw new Error('Event worker scope has ended.');
    return {
      ...engine.triggerDetailed(payload.eventType, payload.fieldKey, payload.metadata),
      scopeId: cachedScopeId,
    };
  },
  SUBMIT() {
    if (!engine) {
      return { values: {} };
    }
    const current = engine.getState();
    return {
      values: current?.values ? deepClone(current.values) : {},
      repeatable: {},
    };
  },
  SYNC_RECORD_CONTEXT(payload) {
    recordSnapshot = payload.snapshot;
    recordPath = payload.instancePath || [];
    return {};
  },
  APPLY_RECORD_STATE(payload) {
    applyRecordState(engine, payload.state);
    return withState(engine.getState(), { updateVersion: lastUpdateVersion });
  },
  RECORD_EVALUATE_SCOPE(payload) {
    return getRecordBackend().evaluateScope(payload.snapshot, payload.options);
  },
  async RECORD_PREPARE(payload) {
    const controller = new AbortController();
    recordAborts.set(payload.token, controller);
    try {
      return await getRecordBackend().prepare(payload.snapshot, {
        ...payload.options,
        signal: controller.signal,
      });
    } finally {
      recordAborts.delete(payload.token);
    }
  },
  CANCEL_RECORD(payload) {
    recordAborts.get(payload.token)?.abort();
    return {};
  },
  RECORD_CHANGES(payload) {
    return getRecordBackend().getChanges(payload);
  },
  RECORD_RELEASE() {
    recordBackend?.release();
    return {};
  },
};

self.onmessage = async (event) => {
  const data = event?.data || {};
  //log('message', data?.action || 'unknown');
  const { id, action, payload } = data;
  if (!action || typeof ACTIONS[action] !== 'function') {
    if (id) {
      self.postMessage({
        id,
        error: serializeError(new Error(`Unknown action "${action}"`)),
      });
    }
    return;
  }

  try {
    const result = await ACTIONS[action](payload);
    if (id) {
      self.postMessage({
        id,
        payload: result,
      });
    }
  } catch (error) {
    if (id) {
      self.postMessage({
        id,
        error: serializeError(error),
      });
    }
  }
};

self.addEventListener('error', (event) => {
  console.error('[form0-worker] uncaught error', event?.message, event?.error);
});
