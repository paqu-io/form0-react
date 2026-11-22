/**
 * The parts of a RepeatableSection dialog's header (decided 2026-11-22): the list and row of
 * each dialog under it, then its own list; on one of its own lists, its row and that list too
 * ("Floors › Ground floor › Rooms"). A single part is the header as before: a first-level dialog
 * on its own page. The row's title itself stays in the bar under the header.
 * @param {{
 *   above?: Array<{ list: string, row: string }>,
 *   list: string,
 *   row?: string,
 *   nestedList?: string | null,
 * }} options
 * @returns {string[]}
 */
export function dialogPathParts({ above = [], list, row = '', nestedList = null }) {
  const parts = above.flatMap((level) => [level.list, level.row]);
  parts.push(list);
  if (nestedList) parts.push(row, nestedList);
  return parts.filter((part) => typeof part === 'string' && part !== '');
}

/**
 * The parts shown when the whole path doesn't fit: first the first and the last two, the middle
 * as an ellipsis (null); then only the ellipsis and the last.
 * @param {string[]} parts
 * @param {number} [level] 1, then 2 if the first still doesn't fit
 * @returns {Array<string | null>}
 */
export function collapsedPathParts(parts, level = 1) {
  if (level >= 2 && parts.length > 1) return [null, parts.at(-1)];
  return parts.length > 3 ? [parts[0], null, ...parts.slice(-2)] : parts;
}
