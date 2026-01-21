const resolveWorkerUrl = () => {
  // ESM/browser path (bundlers rewrite import.meta.url relative paths)
  if (typeof import.meta !== 'undefined' && import.meta?.url) {
    try {
      return new URL('./engine-worker.js', import.meta.url);
    } catch (_err) {
      // fall through to next strategy
    }
  }

  // Browser fallback when import.meta.url is unavailable (e.g., CJS build)
  if (typeof window !== 'undefined') {
    const base = document?.currentScript?.src || window.location.href;
    try {
      return new URL('./engine-worker.js', base);
    } catch (_err) {
      // last resort: let Worker resolve relative to the current page
      return './engine-worker.js';
    }
  }

  // Non-browser environments should never construct the worker
  return './engine-worker.js';
};

const WORKER_URL = resolveWorkerUrl();

export class EngineWorkerClient {
  constructor({ onState, onWarning } = {}) {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      throw new Error('form0-react: Web Workers are not available in this environment');
    }
    this.worker = new Worker(WORKER_URL, { type: 'module' });
    this.pending = new Map();
    this.nextId = 1;
    this.onState = onState || null;
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

    if (kind === 'warning') {
      //console.log('[form0-worker-client] warning', data.payload);
      this.warningHandlers.forEach((handler) => {
        try {
          handler(data.payload);
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

    if (payload?.state) {
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
      this.worker.postMessage({
        id,
        action,
        payload: data,
      });
    });
  }

  init(params) {
    return this.call('INIT', params);
  }

  reset(initialValues = {}, meta = {}) {
    const updateVersion = meta?.updateVersion;
    return this.call('RESET', { initialValues, updateVersion });
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

  triggerEvent(eventType, fieldKey, metadata = {}) {
    return this.call('TRIGGER_EVENT', { eventType, fieldKey, metadata });
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
