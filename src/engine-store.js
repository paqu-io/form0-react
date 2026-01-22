import { useCallback, useSyncExternalStore } from 'react';

const EMPTY_STATE = {
  values: {},
  visible: {},
  required: {},
  read_only: {},
  errors: {},
};

const sliceEqual = (a, b) =>
  a === b ||
  (a &&
    b &&
    a.value === b.value &&
    a.visible === b.visible &&
    a.required === b.required &&
    a.read_only === b.read_only &&
    a.error === b.error);

export function createEngineStore(initialState = EMPTY_STATE) {
  let state = initialState || EMPTY_STATE;
  const listeners = new Set();
  const fieldListeners = new Map();
  const fieldCache = new Map();

  const getFieldSlice = (fieldName) => {
    const next = {
      value: state?.values ? state.values[fieldName] : undefined,
      visible: state?.visible ? state.visible[fieldName] : undefined,
      required: state?.required ? state.required[fieldName] : undefined,
      read_only: state?.read_only ? state.read_only[fieldName] : undefined,
      error: state?.errors ? state.errors[fieldName] : undefined,
    };
    const prev = fieldCache.get(fieldName);
    if (sliceEqual(prev, next)) {
      return prev;
    }
    fieldCache.set(fieldName, next);
    return next;
  };

  const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const subscribeField = (fieldName, listener) => {
    if (!fieldListeners.has(fieldName)) {
      fieldListeners.set(fieldName, new Set());
    }
    const set = fieldListeners.get(fieldName);
    set.add(listener);
    return () => {
      set.delete(listener);
      if (set.size === 0) {
        fieldListeners.delete(fieldName);
      }
    };
  };

  const setState = (nextState) => {
    const prevState = state;
    state = nextState || EMPTY_STATE;

    const changedFields = new Set();
    const collectChanges = (prevMap = {}, nextMap = {}) => {
      const keys = new Set([...Object.keys(prevMap), ...Object.keys(nextMap)]);
      keys.forEach((key) => {
        if (prevMap[key] !== nextMap[key]) {
          changedFields.add(key);
        }
      });
    };

    collectChanges(prevState?.values, state?.values);
    collectChanges(prevState?.visible, state?.visible);
    collectChanges(prevState?.required, state?.required);
    collectChanges(prevState?.read_only, state?.read_only);
    collectChanges(prevState?.errors, state?.errors);

    fieldCache.clear();

    listeners.forEach((listener) => {
      try {
        listener();
      } catch (error) {
        console.warn('form0-react: engine store listener failed', error);
      }
    });

    changedFields.forEach((field) => {
      const subs = fieldListeners.get(field);
      if (!subs) return;
      subs.forEach((listener) => {
        try {
          listener();
        } catch (error) {
          console.warn('form0-react: engine store field listener failed', error);
        }
      });
    });
  };

  return {
    getState: () => state,
    setState,
    subscribe,
    subscribeField,
    getFieldSlice,
  };
}

export function useEngineField(store, fieldName) {
  const subscribe = useCallback(
    (listener) => (store ? store.subscribeField(fieldName, listener) : () => {}),
    [fieldName, store]
  );

  const getSnapshot = useCallback(
    () => (store ? store.getFieldSlice(fieldName) : undefined),
    [fieldName, store]
  );

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
