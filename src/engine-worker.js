import { createFormEngine } from 'form0-core';

let engine = null;
let cachedSchema = null;
let cachedHelpers = undefined;
let cachedSecurity = undefined;
let warningCleanup = null;
let stateVersion = 0;
let lastUpdateVersion = 0;
// const log = (...args) => {
//   if (typeof console !== 'undefined') {
//     console.log('[form0-worker]', ...args);
//   }
// };

const serializeError = (error) => ({
  message: error?.message || String(error || 'Unknown error'),
});

const attachWarningForwarder = () => {
  if (warningCleanup) {
    warningCleanup();
    warningCleanup = null;
  }

  if (!engine || typeof engine.getWarningSystem !== 'function') {
    return;
  }

  const warningSystem = engine.getWarningSystem();
  if (!warningSystem || typeof warningSystem.addWarningHandler !== 'function') {
    return;
  }

  const handler = (warning) => {
    self.postMessage({
      kind: 'warning',
      payload: warning,
    });
  };
  warningSystem.addWarningHandler(handler);
  warningCleanup = () => warningSystem.removeWarningHandler(handler);
};

const buildEngine = ({ schema, initialValues = {}, helpers, security }) => {
  if (!schema || !schema.form) {
    throw new Error('form0-react: engine worker requires a valid schema');
  }

  stateVersion = 0;
  lastUpdateVersion = 0;
  cachedSchema = schema;
  cachedHelpers = helpers;
  cachedSecurity = security;
  engine = createFormEngine({
    schema,
    initialValues,
    helpers,
    security,
  });
  engine.eval();
  attachWarningForwarder();
  //log('engine initialized');
  return engine.getState();
};

const resetEngine = (initialValues = {}) => {
  if (!cachedSchema) {
    throw new Error('form0-react: engine worker cannot reset before initialization');
  }
  return buildEngine({
    schema: cachedSchema,
    initialValues,
    helpers: cachedHelpers,
    security: cachedSecurity,
  });
};

const applyValueUpdates = (updates = {}) => {
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
    engine.eval();
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
  INIT(payload = {}) {
    //log('INIT');
    lastUpdateVersion = Number(payload.updateVersion || 0);
    const state = buildEngine(payload);
    return withState(state, { updateVersion: lastUpdateVersion });
  },
  RESET(payload = {}) {
   //log('RESET');
    lastUpdateVersion = Number(payload.updateVersion || 0);
    const state = resetEngine(payload.initialValues || {});
    return withState(state, { updateVersion: lastUpdateVersion });
  },
  SET_VALUES(payload = {}) {
    //log('SET_VALUES');
    const updateVersion = Number(payload.updateVersion || 0);
    if (updateVersion > lastUpdateVersion) {
      lastUpdateVersion = updateVersion;
    }
    const state = applyValueUpdates(payload.updates || {});
    return withState(state, { updateVersion: lastUpdateVersion });
  },
  EVAL() {
    //log('EVAL');
    if (!engine) {
      throw new Error('form0-react: engine worker not initialized');
    }
    engine.eval();
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
};

self.onmessage = (event) => {
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
    const result = ACTIONS[action](payload);
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
