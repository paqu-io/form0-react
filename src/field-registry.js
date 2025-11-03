import { defaultFieldComponents } from './field-components/index.js';
import { FIELD_SPECS } from 'form0-core';

const NON_RENDERED_TYPES = new Set(['Section', 'RepeatableSection', 'BuildingPlanSection']);
const ENGINE_FIELD_TYPES = Object.keys(FIELD_SPECS);
const SUPPORTED_FIELD_TYPES = ENGINE_FIELD_TYPES.filter((type) => !NON_RENDERED_TYPES.has(type));
const KNOWN_FIELD_TYPES = Object.freeze([...SUPPORTED_FIELD_TYPES]);
const KNOWN_FIELD_TYPES_SET = new Set(KNOWN_FIELD_TYPES);
const IS_DEV =
  typeof process !== 'undefined' && process?.env && process.env.NODE_ENV !== 'production';

function assertValidRegistration(type, component) {
  if (typeof type !== 'string' || type.length === 0) {
    throw new Error('form0-react: registerFieldComponent requires a non-empty field type string.');
  }
  if (!KNOWN_FIELD_TYPES_SET.has(type)) {
    throw new Error(
      [
        `form0-react: registerFieldComponent received unknown field type "${type}".`,
        'Only field types defined in form0-core FIELD_SPECS are supported.',
        'Add new field types at the engine layer instead of the React renderer.',
      ].join(' ')
    );
  }
  if (typeof component !== 'function') {
    throw new Error(
      `form0-react: registerFieldComponent for "${type}" requires a component/function.`
    );
  }
}

function createInternalRegistryState({
  includeDefaults = true,
  trackMissingTypes = includeDefaults,
  warnOnUnregisteredTypes = true,
} = {}) {
  const state = {
    includeDefaults,
    trackMissingTypes,
    warnOnUnregisteredTypes,
    registry: new Map(),
    warnedFieldTypes: new Set(),
    missingDefaultFieldTypes: new Set(),
    lastMissingWarningKey: null,
  };

  if (includeDefaults) {
    registerDefaultFieldComponentsInState(state);
  }

  recomputeMissingFieldTypes(state);
  return state;
}

function registerFieldComponentInState(state, type, component) {
  assertValidRegistration(type, component);
  state.registry.set(type, component);
  state.warnedFieldTypes.delete(type);
  recomputeMissingFieldTypes(state);
}

function unregisterFieldComponentInState(state, type) {
  state.registry.delete(type);
  recomputeMissingFieldTypes(state);
}

function getFieldComponentFromState(state, type) {
  const component = state.registry.get(type);
  if (!component && type && state.warnOnUnregisteredTypes && !state.warnedFieldTypes.has(type)) {
    if (IS_DEV) {
      console.warn(`form0-react: no renderer registered for field type "${type}".`);
    }
    state.warnedFieldTypes.add(type);
  }
  return component;
}

function resetFieldComponentsInState(state) {
  state.registry.clear();
  state.warnedFieldTypes.clear();
  if (state.includeDefaults) {
    registerDefaultFieldComponentsInState(state);
  }
  recomputeMissingFieldTypes(state);
}

function listRegisteredFieldTypesFromState(state) {
  return Array.from(state.registry.keys());
}

function getMissingFieldComponentTypesFromState(state) {
  if (!state.trackMissingTypes) {
    return KNOWN_FIELD_TYPES.filter((type) => !state.registry.has(type));
  }
  return Array.from(state.missingDefaultFieldTypes);
}

function registerDefaultFieldComponentsInState(state) {
  Object.entries(defaultFieldComponents).forEach(([type, component]) => {
    assertValidRegistration(type, component);
    state.registry.set(type, component);
  });
}

function recomputeMissingFieldTypes(state) {
  if (!state.trackMissingTypes) {
    state.missingDefaultFieldTypes.clear();
    state.lastMissingWarningKey = null;
    return;
  }

  state.missingDefaultFieldTypes.clear();
  KNOWN_FIELD_TYPES.forEach((type) => {
    if (!state.registry.has(type)) {
      state.missingDefaultFieldTypes.add(type);
    }
  });
  warnAboutMissingDefaultFieldTypes(state);
}

function warnAboutMissingDefaultFieldTypes(state) {
  if (!state.trackMissingTypes || state.missingDefaultFieldTypes.size === 0) {
    state.lastMissingWarningKey = null;
    return;
  }
  if (!IS_DEV) {
    state.lastMissingWarningKey = null;
    return;
  }

  const missing = Array.from(state.missingDefaultFieldTypes).sort();
  const warningKey = missing.join(',');

  if (warningKey === state.lastMissingWarningKey) {
    return;
  }

  state.lastMissingWarningKey = warningKey;

  console.warn(
    [
      'form0-react:',
      'no built-in renderer registered for field type(s) defined in form0-core FIELD_SPECS:',
      missing.join(', '),
      '.',
      'Use registerFieldComponent(type, component) to supply custom renderers.',
    ].join(' ')
  );
}

function createRegistryAPI(state) {
  return {
    registerFieldComponent(type, component) {
      registerFieldComponentInState(state, type, component);
    },
    unregisterFieldComponent(type) {
      unregisterFieldComponentInState(state, type);
    },
    resetFieldComponents() {
      resetFieldComponentsInState(state);
    },
    getFieldComponent(type) {
      return getFieldComponentFromState(state, type);
    },
    listRegisteredFieldTypes() {
      return listRegisteredFieldTypesFromState(state);
    },
    getMissingFieldComponentTypes() {
      return getMissingFieldComponentTypesFromState(state);
    },
  };
}

export function createFieldRegistry(options = {}) {
  const {
    includeDefaults = true,
    trackMissingTypes = includeDefaults,
    warnOnUnregisteredTypes = IS_DEV,
    renderers,
  } = options;

  const state = createInternalRegistryState({
    includeDefaults,
    trackMissingTypes,
    warnOnUnregisteredTypes,
  });

  if (renderers && typeof renderers === 'object') {
    Object.entries(renderers).forEach(([type, component]) => {
      registerFieldComponentInState(state, type, component);
    });
  }

  return createRegistryAPI(state);
}

const defaultFieldRegistry = createFieldRegistry({
  includeDefaults: true,
  trackMissingTypes: IS_DEV,
  warnOnUnregisteredTypes: IS_DEV,
});

export const {
  registerFieldComponent,
  unregisterFieldComponent,
  resetFieldComponents,
  getFieldComponent,
  listRegisteredFieldTypes,
  getMissingFieldComponentTypes,
} = defaultFieldRegistry;

export { defaultFieldRegistry, KNOWN_FIELD_TYPES };
