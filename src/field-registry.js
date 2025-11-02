import { defaultFieldComponents } from './field-components/index.js';
import { FIELD_SPECS } from 'form0-core';

const registry = new Map();
const warnedFieldTypes = new Set();
const missingDefaultFieldTypes = new Set();
let lastMissingWarningKey = null;
const NON_RENDERED_TYPES = new Set(['Section', 'RepeatableSection', 'BuildingPlanSection']);
const ALL_KNOWN_FIELD_TYPES = Object.keys(FIELD_SPECS).filter(
  (type) => !NON_RENDERED_TYPES.has(type)
);

function assertValidRegistration(type, component) {
  if (typeof type !== 'string' || type.length === 0) {
    throw new Error('form0-react: registerFieldComponent requires a non-empty field type string.');
  }
  if (typeof component !== 'function') {
    throw new Error(
      `form0-react: registerFieldComponent for "${type}" requires a component/function.`
    );
  }
}

export function registerFieldComponent(type, component) {
  assertValidRegistration(type, component);
  registry.set(type, component);
  recomputeMissingFieldTypes();
}

export function unregisterFieldComponent(type) {
  registry.delete(type);
  recomputeMissingFieldTypes();
}

export function getFieldComponent(type) {
  const component = registry.get(type);
  if (!component && type && !warnedFieldTypes.has(type)) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`form0-react: no renderer registered for field type "${type}".`);
    }
    warnedFieldTypes.add(type);
  }
  return component;
}

export function resetFieldComponents() {
  registry.clear();
  warnedFieldTypes.clear();
  registerDefaultFieldComponents();
}

export function listRegisteredFieldTypes() {
  return Array.from(registry.keys());
}

export function getMissingFieldComponentTypes() {
  return ALL_KNOWN_FIELD_TYPES.filter((type) => !registry.has(type));
}

function registerDefaultFieldComponents() {
  Object.entries(defaultFieldComponents).forEach(([type, component]) => {
    registry.set(type, component);
  });
  recomputeMissingFieldTypes();
}

function recomputeMissingFieldTypes() {
  missingDefaultFieldTypes.clear();
  ALL_KNOWN_FIELD_TYPES.forEach((type) => {
    if (!registry.has(type)) {
      missingDefaultFieldTypes.add(type);
    }
  });
  warnAboutMissingDefaultFieldTypes();
}

function warnAboutMissingDefaultFieldTypes() {
  if (process.env.NODE_ENV === 'production' || missingDefaultFieldTypes.size === 0) {
    lastMissingWarningKey = null;
    return;
  }

  const missing = Array.from(missingDefaultFieldTypes).sort();
  const warningKey = missing.join(',');

  if (warningKey === lastMissingWarningKey) {
    return;
  }

  lastMissingWarningKey = warningKey;

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

registerDefaultFieldComponents();
