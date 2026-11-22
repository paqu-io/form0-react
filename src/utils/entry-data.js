/**
 * Whether an entry's data is the same as when it opened: what a dialog's Cancel asks about
 * (2026-11-22). Data only:
 * - a row's display state isn't data (`visible`, `required`, `errors`, `read_only`: a plan
 *   editor's draft rows carry its evaluation, the snapshot an entry opened with doesn't);
 * - an empty value is empty however it is written (`null`, `''`, `[]`, an empty choice: a plan
 *   row saved by core has `null` where the dialog holds `{ choice: [], other: [] }`).
 * Rows of other RepeatableSections carry no display state, so only real edits count for them,
 * as before.
 */

const DISPLAY_STATE = new Set(['visible', 'required', 'errors', 'read_only']);
const CHOICE_PARTS = new Set(['choice', 'choices', 'other']);

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

/** `null`, `undefined`, `''`, `[]`, or a choice with nothing chosen. */
export function isEmptyValue(value) {
  if (value == null || value === '') return true;
  if (Array.isArray(value)) return value.length === 0;
  if (!isObject(value)) return false;
  const keys = Object.keys(value);
  return (
    keys.length > 0 &&
    keys.every((key) => CHOICE_PARTS.has(key) && Array.isArray(value[key]) && !value[key].length)
  );
}

function same(a, b) {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b))
    return a.length === b.length && a.every((entry, index) => same(entry, b[index]));
  if (isObject(a) && isObject(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of keys) if (!same(a[key], b[key])) return false;
    return true;
  }
  return false;
}

function sameValues(a = {}, b = {}) {
  for (const key of new Set([...Object.keys(a || {}), ...Object.keys(b || {})])) {
    const left = a?.[key];
    const right = b?.[key];
    if (!(isEmptyValue(left) && isEmptyValue(right)) && !same(left, right)) return false;
  }
  return true;
}

function sameRow(a, b) {
  if (!isObject(a) || !isObject(b)) return same(a, b);
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (DISPLAY_STATE.has(key)) continue;
    const equal =
      key === 'values'
        ? sameValues(a.values, b.values)
        : key === 'repeatable'
          ? sameRepeatable(a.repeatable, b.repeatable)
          : same(a[key], b[key]);
    if (!equal) return false;
  }
  return true;
}

function sameRepeatable(a = {}, b = {}) {
  for (const key of new Set([...Object.keys(a || {}), ...Object.keys(b || {})])) {
    const left = a?.[key] || [];
    const right = b?.[key] || [];
    if (left.length !== right.length) return false;
    if (!left.every((row, index) => sameRow(row, right[index]))) return false;
  }
  return true;
}

/**
 * @param {{ values?: object, repeatable?: object }} current
 * @param {{ values?: object, repeatable?: object }} initial
 * @returns {boolean} true when nothing but display state or the spelling of empty values differs
 */
export function sameEntryData(current, initial) {
  return (
    sameValues(current?.values, initial?.values) &&
    sameRepeatable(current?.repeatable, initial?.repeatable)
  );
}
