/** The last part on a row's own page (2026-11-26): its name is the title under the header. */
export const THIS_ENTRY = 'this entry';

/**
 * The parts of a RepeatableSection dialog's header (decided 2026-11-22): the list and row of
 * each dialog under it, then its own list; then where the dialog is (2026-11-26): on its row's
 * page "this entry" ("Floors › this entry", "… › Walls › this entry"), on one of its own lists its
 * row and that list ("Floors › Ground floor › Rooms"), so a row's page and its parent's list
 * never read the same. The row's title itself stays in the bar under the header. Each part's
 * `kind` ('list', 'row' or 'entry') tells lists and rows apart; "this entry" keeps the row's
 * name as `name`, for the full path (`pathTitle`).
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
 * @returns {Array<{ label: string, kind: 'list' | 'row' | 'entry', name?: string,
 *   target: { to: number, list: string | null } | null }>}
 */
export function dialogPathParts({ above = [], list, listKey = null, row = '', nestedList = null }) {
  const depth = above.length;
  const listTarget = (index, key) => ({ to: index - 1, list: index > 0 ? key : null });
  const parts = above.flatMap((level, index) => [
    { label: level.list, kind: 'list', target: listTarget(index, level.key) },
    { label: level.row, kind: 'row', target: { to: index, list: null } },
  ]);
  parts.push({ label: list, kind: 'list', target: listTarget(depth, listKey) });
  if (nestedList)
    parts.push(
      { label: row, kind: 'row', target: { to: depth, list: null } },
      { label: nestedList, kind: 'list', target: null }
    );
  else parts.push({ label: THIS_ENTRY, kind: 'entry', name: row, target: null });
  return parts.filter((part) => typeof part.label === 'string' && part.label !== '');
}

/** The full path as words, the row's name in place of "this entry" (the path's tooltip). */
export const pathTitle = (parts) => parts.map((part) => part.name || part.label).join(' › ');

/**
 * The parts shown when the whole path doesn't fit: first the first and the last two, the middle
 * as an ellipsis (null); then the ellipsis and the last two (a list and where it is, 2026-11-26).
 * @template T
 * @param {T[]} parts
 * @param {number} [level] 1, then 2 if the first still doesn't fit
 * @returns {Array<T | null>}
 */
export function collapsedPathParts(parts, level = 1) {
  if (level >= 2) return parts.length > 2 ? [null, ...parts.slice(-2)] : parts;
  return parts.length > 3 ? [parts[0], null, ...parts.slice(-2)] : parts;
}
