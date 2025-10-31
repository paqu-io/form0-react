import { defaultFieldComponents } from './field-components/index.js';

const registry = new Map();

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
}

export function unregisterFieldComponent(type) {
  registry.delete(type);
}

export function getFieldComponent(type) {
  return registry.get(type);
}

export function resetFieldComponents() {
  registry.clear();
  registerDefaultFieldComponents();
}

export function listRegisteredFieldTypes() {
  return Array.from(registry.keys());
}

function registerDefaultFieldComponents() {
  Object.entries(defaultFieldComponents).forEach(([type, component]) => {
    registry.set(type, component);
  });
}

registerDefaultFieldComponents();
