/**
 * Opening entries by double-click (decided 2026-11-22, `analyses/building-plan-ui.md`): a
 * double-click is a shortcut for clicks made by hand, so every level between the dialog and the
 * row opens as an ordinary dialog, one at a time.
 */

/** A room's depth in an index path from the floor: [floor, room]. Core's canvas builds them so. */
const ROOM_DEPTH = 2;

/**
 * The row a double-click on a plan canvas opens. A Floor canvas and the plan page open rooms
 * only: anything in a room (a wall, a door, a column…) opens that room. A Room canvas, and the
 * view of an entry below a room, open the element itself.
 * @param {Array<{ key: string, index: number }>} path the element's index path, from the floor
 * @param {string} mode the canvas's mode: 'parent' (the plan page), 'floor-modal' or 'room-modal'
 * @returns {Array<{ key: string, index: number }>}
 */
export function doubleClickTarget(path, mode) {
  return mode === 'parent' || mode === 'floor-modal' ? path.slice(0, ROOM_DEPTH) : path;
}

const partKey = (part) => part.key || part.repeatableKey;
const partId = (part) => part.id || part.instanceId;

/**
 * The next row to open on the way from an entry to a row below it: the row one level below the
 * entry, and whether more levels follow it. Paths are id paths from the floor; the entry's parts
 * may name their list `repeatableKey` and their row `instanceId`, as a dialog's path does.
 * @param {Array<object>} entryPath
 * @param {Array<{ key: string, id: string }>} targetPath
 * @returns {{ next: { key: string, id: string }, depth: number, more: boolean } | null} null when
 *   the row isn't below the entry (another room's wall) or is the entry itself
 */
export function nextEntryStep(entryPath, targetPath) {
  const below = entryPath.every(
    (part, index) =>
      targetPath[index] &&
      targetPath[index].key === partKey(part) &&
      targetPath[index].id === partId(part)
  );
  if (!below || targetPath.length <= entryPath.length) return null;
  const depth = entryPath.length;
  return { next: targetPath[depth], depth, more: targetPath.length > depth + 1 };
}

/**
 * Whether a row double-clicked on an entry's canvas lies outside the entry's reach: not the entry,
 * not one of its parents, not below it (a column of the room from a wall's entry, a door of
 * another wall). Its status line then says where it opens (decided 2026-11-26). Paths as for
 * `nextEntryStep`.
 * @param {Array<object>} entryPath
 * @param {Array<{ key: string, id: string }>} targetPath
 */
export function isElsewhere(entryPath, targetPath) {
  const shared = Math.min(entryPath.length, targetPath.length);
  for (let index = 0; index < shared; index += 1)
    if (
      targetPath[index].key !== partKey(entryPath[index]) ||
      targetPath[index].id !== partId(entryPath[index])
    )
      return true;
  return false;
}
