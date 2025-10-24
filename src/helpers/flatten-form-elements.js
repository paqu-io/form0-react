// Helper to flatten form elements (excluding sections)
export function flattenFormElements(elements, result = []) {
  for (const element of elements) {
    if (element.type === 'Section') {
      // Recursively flatten section elements
      flattenFormElements(element.elements || [], result);
    } else {
      // Add non-section elements to result
      result.push(element);
    }
  }
  return result;
} 