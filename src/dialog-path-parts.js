/**
 * The parts of a RepeatableSection dialog's header (decided 2026-11-22): the list and row of
 * each dialog under it, then its own list; on one of its own lists, its row and that list too
 * ("Floors › Ground floor › Rooms"). A single part is the header as before: a first-level dialog
 * on its own page. The row's title itself stays in the bar under the header.
 *
 * Each part but the last names where pressing it lands (clickable, 2026-11-22): `to` is the
 * dialog's place in the stack (-1: none left open), `list` the list it then shows (null: its own
 * page). A list's part lands on the dialog that holds the list, showing it; a row's part on that
 * row's dialog, on its page. The dialogs above close as their Cancel would.
 * @param {{
 *   above?: Array<{ list: string, row: string, key: string }>,
 *   list: string,
 *   listKey?: string,
 *   row?: string,
 *   nestedList?: string | null,
 * }} options `key` and `listKey`: the list each dialog's row belongs to
 * @returns {Array<{ label: string, target: { to: number, list: string | null } | null }>}
 */
export function dialogPathParts({ above = [], list, listKey = null, row = '', nestedList = null }) {
  const depth = above.length;
  const listTarget = (index, key) => ({ to: index - 1, list: index > 0 ? key : null });
  const parts = above.flatMap((level, index) => [
    { label: level.list, target: listTarget(index, level.key) },
    { label: level.row, target: { to: index, list: null } },
  ]);
  if (nestedList)
    parts.push(
      { label: list, target: listTarget(depth, listKey) },
      { label: row, target: { to: depth, list: null } },
      { label: nestedList, target: null }
    );
  else parts.push({ label: list, target: null });
  return parts.filter((part) => typeof part.label === 'string' && part.label !== '');
}

/**
 * The parts shown when the whole path doesn't fit: first the first and the last two, the middle
 * as an ellipsis (null); then only the ellipsis and the last.
 * @template T
 * @param {T[]} parts
 * @param {number} [level] 1, then 2 if the first still doesn't fit
 * @returns {Array<T | null>}
 */
export function collapsedPathParts(parts, level = 1) {
  if (level >= 2 && parts.length > 1) return [null, parts.at(-1)];
  return parts.length > 3 ? [parts[0], null, ...parts.slice(-2)] : parts;
}
