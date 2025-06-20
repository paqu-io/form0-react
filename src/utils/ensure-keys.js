import { generateKey } from './generate-keys';

export function ensureKeys(elements) {
  elements.forEach((field) => {
    if (!field.key && field.data_name) {
      field.key = generateKey(field.data_name);
      //console.warn(`Generated key "${field.key}" for field "${field.data_name}"`);
    }
    if (field.type === 'Section') {
      ensureKeys(field.elements || []);
    }
  });
}
