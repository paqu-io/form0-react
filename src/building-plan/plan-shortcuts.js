/**
 * The plan's keyboard shortcuts are Alt+Shift+key, so they never meet the form's plain Alt
 * shortcuts. They are matched on the physical key (`event.code`), as the form does: with Option
 * held, macOS types another character (Option+Shift+D gives "Î"), and layouts differ.
 */

/** @param {KeyboardEvent} event */
export function isPlanShortcutEvent(event) {
  return Boolean(event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey);
}

/**
 * The letter or digit of a shortcut event, upper case, or null.
 * @param {{ code?: string, key?: string }} event
 * @returns {string | null}
 */
export function planShortcutKey(event) {
  const code = typeof event.code === 'string' ? event.code : '';
  const match = /^Key([A-Z])$/.exec(code) || /^Digit([0-9])$/.exec(code);
  if (match) return match[1];
  if (code) return null;
  const key = typeof event.key === 'string' ? event.key : '';
  return key.length === 1 ? key.toUpperCase() : null;
}

/** The ARIA form of a plan shortcut ("Alt+Shift+D"), also read by the plan tooltip. */
export function planShortcut(key) {
  return key ? `Alt+Shift+${String(key).toUpperCase()}` : '';
}

/** @returns {boolean} */
export function isMacPlatform() {
  if (typeof navigator === 'undefined') return false;
  const platform =
    (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
  return /mac|ip(hone|ad|od)/i.test(platform);
}

const MAC_KEYS = { Alt: '⌥', Shift: '⇧' };

/**
 * The keys of a shortcut as shown to people: ["Alt", "Shift", "D"], or ["⌥", "⇧", "D"] on a Mac,
 * matching the form's ⌥ prefix.
 * @param {string} shortcut "Alt+Shift+D"
 * @param {boolean} mac
 */
export function shortcutKeys(shortcut, mac) {
  if (!shortcut) return [];
  return shortcut.split('+').map((part) => (mac && MAC_KEYS[part]) || part);
}
