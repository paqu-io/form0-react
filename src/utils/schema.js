import { ensureKeys } from './ensure-keys.js';

export function cloneDeep(value) {
  if (value == null) return value;
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function hasMissingKeys(elements = []) {
  const stack = Array.isArray(elements) ? [...elements] : [];
  while (stack.length > 0) {
    const element = stack.pop();
    if (!element) continue;
    if (!element.key && element.data_name) {
      return true;
    }
    if (element.elements && element.elements.length > 0) {
      stack.push(...element.elements);
    }
  }
  return false;
}

export function ensureSchemaKeys(elements = []) {
  if (!Array.isArray(elements)) {
    return false;
  }
  const needsKeys = hasMissingKeys(elements);
  if (needsKeys) {
    ensureKeys(elements);
  }
  return needsKeys;
}

export function cloneSchema(schema) {
  return cloneDeep(schema);
}

export function prepareSchema(schema) {
  const cloned = cloneSchema(schema);
  const form = cloned?.form;
  if (form && Array.isArray(form.elements)) {
    ensureSchemaKeys(form.elements);
  }
  return cloned;
}
