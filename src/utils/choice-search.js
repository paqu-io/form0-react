// Text matching for choice dropdowns: search and type-to-jump.

/**
 * Lower case without accents, so "forli" matches "Forlì".
 * @param {unknown} text
 * @returns {string}
 */
export function foldText(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * The options whose label contains the query, ignoring case and accents. An empty query keeps
 * them all.
 * @template {{ label: string }} T
 * @param {T[]} options
 * @param {string} query
 * @returns {T[]}
 */
export function filterOptions(options, query) {
  const needle = foldText(query).trim();
  if (!needle) return options;
  return options.filter((option) => foldText(option.label).includes(needle));
}

/**
 * Type-to-jump: the first option whose label starts with what was typed, ignoring case and
 * accents; -1 when none does.
 * @param {{ label: string }[]} options
 * @param {string} typed
 * @returns {number}
 */
export function typeAheadIndex(options, typed) {
  const needle = foldText(typed);
  if (!needle) return -1;
  return options.findIndex((option) => foldText(option.label).startsWith(needle));
}
