// Separators added while digits are typed in date and time text fields ("1430" shows "14:30").
// Copied from form0-react-native (src/utils/masked-entry.js); the web template's date and time
// overrides use the same rule. Keep the copies in step.

const PATTERNS = {
  date: { groups: [4, 2, 2], separator: '-' }, // YYYY-MM-DD
  time: { groups: [2, 2, 2], separator: ':' }, // HH:MM[:SS]
};

const escapeForClass = (text) => text.replace(/[\\\]^-]/g, '\\$&');

/**
 * The text to show after an edit.
 * - Typing (the text got longer) with only digits and separators: digits are regrouped with
 *   separators, so "202611" becomes "2026-11" and "1430" becomes "14:30".
 * - A separator typed after one digit of a two-digit group pads it, so "9:" becomes "09:" and
 *   "9:30" becomes "09:30" (a keyboard with ":" or "/", where people type it themselves).
 * - A separator typed right after a complete group is kept ("11" then ":" gives "11:").
 * - Deleting, or any other text (a value loaded in another format, a paste with letters): the
 *   text is kept as is, so nothing the user or the record holds is hidden or rewritten.
 * @param {string} previous text before the edit
 * @param {string} next text after the edit
 * @param {'date' | 'time' | {groups: number[], separator: string}} kind a named pattern, or
 *   the groups and separator of another order (for example a locale's MM/DD/YYYY)
 * @returns {string}
 */
export function formatMaskedEntry(previous, next, kind) {
  const pattern = typeof kind === 'string' ? PATTERNS[kind] : kind;
  if (!pattern || typeof next !== 'string') return next;
  const { groups, separator } = pattern;
  const before = typeof previous === 'string' ? previous : '';
  if (next.length <= before.length) return next;
  if (!new RegExp(`^[0-9${escapeForClass(separator)}]*$`).test(next)) return next;

  // Segments the user closed with a separator: a single digit in a two-digit group is padded.
  const segments = next.split(separator);
  const padded = segments
    .map((segment, index) =>
      index < segments.length - 1 && segment.length === 1 && groups[index] === 2
        ? `0${segment}`
        : segment
    )
    .join(separator);

  const total = groups.reduce((sum, size) => sum + size, 0);
  const digits = padded.replace(/\D/g, '').slice(0, total);
  const parts = [];
  let offset = 0;
  for (const size of groups) {
    if (offset >= digits.length) break;
    parts.push(digits.slice(offset, offset + size));
    offset += size;
  }
  const formatted = parts.join(separator);
  // A separator typed right after a complete group (from a keyboard that has it) is kept.
  let boundary = 0;
  const atGroupEnd = groups.slice(0, -1).some((size) => (boundary += size) === digits.length);
  return next.endsWith(separator) && atGroupEnd ? formatted + separator : formatted;
}
