const cloneDiagnostics = (value) => JSON.parse(JSON.stringify(value));
let nextClientScope = 0;
function assertWorkerConfiguration(params) {
  try {
    if (typeof structuredClone === 'function') structuredClone(params);
    else {
      const seen = new Set();
      const visit = (value) => {
        if (typeof value === 'function' || typeof value === 'symbol')
          throw new Error('non-cloneable value');
        if (!value || typeof value !== 'object' || seen.has(value)) return;
        seen.add(value);
        if (value instanceof WeakMap || value instanceof WeakSet)
          throw new Error('non-cloneable value');
        if (value instanceof Map)
          for (const [key, entry] of value) {
            visit(key);
            visit(entry);
          }
        else if (value instanceof Set) for (const entry of value) visit(entry);
        else for (const entry of Object.values(value)) visit(entry);
      };
      visit(params);
    }
  } catch {
    throw new Error(
      'form0-react: Worker configuration must be structured-cloneable. Function-valued helpers require engineMode="main-thread".'
    );
  }
}

const resolveLegacyWorkerUrl = () => {
  if (typeof window !== 'undefined') {
    const base = document?.currentScript?.src || window.location.href;
    try {
      return new URL('./engine-worker.js', base);
    } catch (_err) {
      return './engine-worker.js';
    }
  }

  return './engine-worker.js';
};

const createDefaultWorker = () =>
  new Worker(new URL('./engine-worker.js', import.meta.url), { type: 'module' });

const createWorkerFromUrl = (workerUrl) => new Worker(workerUrl, { type: 'module' });

export class EngineWorkerClient {
  constructor({ onState, onWarning, onDiagnostics, createWorker, workerUrl } = {}) {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      throw new Error('form0-react: Web Workers are not available in this environment');
    }

    try {
      if (typeof createWorker === 'function') {
        this.worker = createWorker();
      } else if (workerUrl) {
        this.worker = createWorkerFromUrl(workerUrl);
      } else {
        this.worker = createDefaultWorker();
      }
    } catch (error) {
      if (typeof createWorker === 'function' || workerUrl) {
        throw error;
      }
      this.worker = createWorkerFromUrl(resolveLegacyWorkerUrl());
    }

    this.pending = new Map();
    this.nextId = 1;
    this.onState = onState || null;
    this.onDiagnostics = onDiagnostics || null;
    this.diagnostics = [];
    this.diagnosticSequence = 0;
    this.scopeId = null;
    this.warningHandlers = new Set();
    if (typeof onWarning === 'function') {
      this.warningHandlers.add(onWarning);
    }
    this.state = null;
    this.stateVersion = 0;
    this.handleMessage = this.handleMessage.bind(this);
    this.worker.addEventListener('message', this.handleMessage);
  }

  handleMessage(event) {
    const data = event?.data || {};
    const { id, payload, error, kind } = data;

    if (kind === 'diagnostics') {
      if (
        payload?.scopeId !== this.scopeId ||
        !Number.isInteger(payload.evaluationId) ||
        payload.evaluationId <= this.diagnosticSequence
      )
        return;
      this.diagnosticSequence = payload.evaluationId;
      this.diagnostics = cloneDiagnostics(payload.diagnostics || []);
      try {
        const result = this.onDiagnostics?.({ ...payload, diagnostics: this.getDiagnostics() });
        if (result && typeof result.then === 'function') Promise.resolve(result).catch(() => {});
      } catch {
        /* Diagnostics cannot interrupt worker state/operations. */
      }
      return;
    }

    if (kind === 'warning') {
      if (data.scopeId && data.scopeId !== this.scopeId) return;
      //console.log('[form0-worker-client] warning', data.payload);
      this.warningHandlers.forEach((handler) => {
        try {
          const result = handler(data.payload);
          if (result && typeof result.then === 'function')
            Promise.resolve(result).catch(() =>
              console.warn('form0-react: warning handler rejected.')
            );
        } catch (err) {
          console.warn('form0-react: warning handler threw an error', err);
        }
      });
      return;
    }

    const pending = id ? this.pending.get(id) : null;
    if (pending) {
      this.pending.delete(id);
    }

    if (error) {
      if (pending) {
        pending.reject(new Error(error.message || 'Engine worker error'));
      }
      return;
    }

    if (!pending) return;
    if (payload?.scopeId && payload.scopeId !== this.scopeId) {
      pending.reject(new Error('Event worker reply belongs to an obsolete scope.'));
      return;
    }

    if (payload?.state && (!payload.scopeId || payload.scopeId === this.scopeId)) {
      //console.log('[form0-worker-client] state received');
      const incomingVersion = Number(payload.stateVersion || 0);
      const isStale =
        Number.isFinite(incomingVersion) &&
        incomingVersion > 0 &&
        incomingVersion < Number(this.stateVersion || 0);
      if (!isStale) {
        if (incomingVersion > 0) {
          this.stateVersion = incomingVersion;
        }
        this.state = payload.state;
        if (typeof this.onState === 'function') {
          this.onState(this.state, payload);
        }
      }
    }

    if (pending) {
      pending.resolve(payload);
    }
  }

  call(action, data = {}) {
    if (!this.worker) {
      return Promise.reject(new Error('Engine worker is not available'));
    }
    const id = this.nextId++;
    //console.log('[form0-worker-client] call', action, data);
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      try {
        this.worker.postMessage({ id, action, payload: data });
      } catch (error) {
        this.pending.delete(id);
        reject(error);
      }
    });
  }

  init(params) {
    try {
      assertWorkerConfiguration(params);
    } catch (error) {
      return Promise.reject(error);
    }
    const scopeId = params.scopeId || `form0-worker-${++nextClientScope}`;
    this.scopeId = scopeId;
    this.mode = params.mode || 'edit';
    this.stateVersion = 0;
    this.diagnostics = [];
    this.diagnosticSequence = 0;
    return this.call('INIT', { ...params, scopeId });
  }

  getDiagnostics() {
    return cloneDiagnostics(this.diagnostics);
  }

  reset(initialValues = {}, meta = {}) {
    const updateVersion = meta?.updateVersion;
    const scopeId = meta.scopeId || this.scopeId;
    if (scopeId !== this.scopeId) {
      this.scopeId = scopeId;
      this.stateVersion = 0;
      this.diagnostics = [];
      this.diagnosticSequence = 0;
    }
    return this.call('RESET', { initialValues, updateVersion, scopeId });
  }

  setValues(updates = {}, meta = {}) {
    const updateVersion = meta?.updateVersion;
    return this.call('SET_VALUES', {
      updates,
      updateVersion,
    });
  }

  eval() {
    return this.call('EVAL');
  }

  getMode() {
    return this.mode || 'edit';
  }

  setMode(mode) {
    this.mode = mode;
    this.modeUpdate = this.call('SET_MODE', { mode });
    this.modeUpdate.catch(() => {});
    return this.modeUpdate;
  }

  triggerEvent(eventType, fieldKey, metadata = {}) {
    return this.call('TRIGGER_EVENT', { eventType, fieldKey, metadata });
  }

  syncEventReads(values) {
    return this.call('SYNC_EVENT_READS', { values, scopeId: this.scopeId });
  }

  syncRecordContext(snapshot, instancePath = []) {
    return this.call('SYNC_RECORD_CONTEXT', { snapshot, instancePath });
  }
  applyRecordState(state) {
    return this.call('APPLY_RECORD_STATE', { state });
  }
  evaluateRecordScope(snapshot, options) {
    return this.call('RECORD_EVALUATE_SCOPE', { snapshot, options });
  }
  async prepareRecord(snapshot, options = {}) {
    const { signal, ...portable } = options;
    const token = `record-${this.nextId}`;
    if (signal?.aborted)
      return { status: 'cancelled', eligible: false, snapshot: null, issues: [], diagnostics: [] };
    const cancel = () => {
      this.call('CANCEL_RECORD', { token }).catch(() => {});
    };
    signal?.addEventListener('abort', cancel, { once: true });
    try {
      return await this.call('RECORD_PREPARE', { snapshot, options: portable, token });
    } finally {
      signal?.removeEventListener('abort', cancel);
    }
  }
  recordChanges(page) {
    return this.call('RECORD_CHANGES', page);
  }
  releaseRecord() {
    return this.call('RECORD_RELEASE').catch(() => {});
  }

  async readState() {
    await this.modeUpdate;
    const result = await this.call('READ_STATE');
    return result.state;
  }

  triggerDetailed(eventType, fieldKey, metadata = {}) {
    try {
      assertWorkerConfiguration(metadata);
    } catch (error) {
      return Promise.reject(error);
    }
    return this.call('TRIGGER_DETAILED', { eventType, fieldKey, metadata, scopeId: this.scopeId });
  }

  submit() {
    return this.call('SUBMIT');
  }

  terminate() {
    if (this.worker) {
      this.worker.removeEventListener('message', this.handleMessage);
      this.worker.terminate();
      this.worker = null;
    }
    this.pending.forEach(({ reject }) => {
      reject(new Error('Engine worker terminated'));
    });
    this.pending.clear();
    this.warningHandlers.clear();
    this.scopeId = null;
    this.diagnostics = [];
    this.onDiagnostics = null;
    this.state = null;
    this.stateVersion = 0;
  }

  getState() {
    return this.state;
  }

  setStateHandler(handler) {
    this.onState = typeof handler === 'function' ? handler : null;
  }

  addWarningHandler(handler) {
    if (typeof handler === 'function') {
      this.warningHandlers.add(handler);
    }
  }

  removeWarningHandler(handler) {
    if (handler) {
      this.warningHandlers.delete(handler);
    }
  }
}
