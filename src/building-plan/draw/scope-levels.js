/**
 * Scope levels (1e, V1): how strongly the plan draws each element in an entry. In a room entry
 * the room is drawn in full and everything outside it faded; in an element entry (a wall, door,
 * window, column or beam) the element is drawn in full, the rest of its room at half strength,
 * and everything outside the room faded. The plan page and floor entries have no room in scope:
 * everything is drawn in full.
 */

/** @typedef {'full' | 'half' | 'out'} ScopeLevel */

export const FULL = 'full';
export const HALF = 'half';
export const OUT = 'out';

/** No room in scope: everything in full. */
export const NO_SCOPE = Object.freeze({ of: () => FULL });

const OPENINGS = new Set(['doors', 'windows']);

/**
 * @param {{
 *   roomId: string | null,
 *   focus: { collection: string, id: string } | null,
 *   plan: Record<string, object[]>,
 * }} input `roomId`: the room in scope; `focus`: the entry's own element, as the canvas knows it
 *   (`plan[focus.collection]`); without it, or before the canvas has it, the room is the focus
 * @returns {{ of: (collection: string, entry: object) => ScopeLevel }} `collection`: rooms,
 *   footprints (a physical wall's, with the `roomIds` it bounds), walls, doors, windows, columns
 *   or beams
 */
export function scopeLevels({ roomId, focus, plan }) {
  if (!roomId) return NO_SCOPE;
  const target = focus && (plan[focus.collection] || []).find((entry) => entry.id === focus.id);
  if (!target)
    return { of: (collection, entry) => (inScope(collection, entry, roomId) ? FULL : OUT) };
  // A wall in focus is shown whole (its physical wall, past this room's side of it), and the
  // openings in it with it. An opening is matched by its subject (the canvas has one per face).
  const wallId = focus.collection === 'walls' ? target.physicalWallId || target.id : null;
  const subjectId = OPENINGS.has(focus.collection) ? target.subjectId || target.id : null;
  const focused = (collection, entry) => {
    if (collection === 'footprints') return entry.id === wallId;
    if (collection === 'walls')
      return wallId !== null && (entry.physicalWallId || entry.id) === wallId;
    if (OPENINGS.has(collection))
      return (
        (collection === focus.collection && (entry.subjectId || entry.id) === subjectId) ||
        (wallId !== null && entry.physicalWallId === wallId)
      );
    return collection === focus.collection && entry.id === focus.id;
  };
  return {
    of(collection, entry) {
      if (!inScope(collection, entry, roomId)) return OUT;
      // The room itself keeps its surface and name; its outline goes with its walls.
      if (collection === 'rooms') return HALF;
      return focused(collection, entry) ? FULL : HALF;
    },
  };
}

function inScope(collection, entry, roomId) {
  if (collection === 'rooms') return entry.id === roomId;
  if (collection === 'footprints') return Boolean(entry.roomIds?.includes(roomId));
  return entry.roomId === roomId;
}

const TONES = new WeakMap();

/**
 * The theme an element is drawn with at its level. Half: walls and lines at half strength.
 * Out: faint walls and lines, no room surface (the gap of an opening shows the ground), grey
 * names. Full: the theme itself.
 * @param {Readonly<Record<string, string>>} theme a plan theme (`draw/plan-theme.js`)
 * @param {ScopeLevel} level
 */
export function levelTheme(theme, level) {
  if (level !== HALF && level !== OUT) return theme;
  let tones = TONES.get(theme);
  if (!tones) {
    tones = {
      [HALF]: Object.freeze({
        ...theme,
        wall: theme.wallHalf ?? theme.wall,
        symbol: theme.symbolHalf ?? theme.symbol,
      }),
      [OUT]: Object.freeze({
        ...theme,
        wall: theme.wallFaint ?? theme.wall,
        symbol: theme.symbolFaint ?? theme.symbol,
        room: theme.ground ?? theme.room,
        label: theme.labelFaint ?? theme.labelMuted,
        labelMuted: theme.labelFaint ?? theme.labelMuted,
      }),
    };
    TONES.set(theme, tones);
  }
  return tones[level];
}
