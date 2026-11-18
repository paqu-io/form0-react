/**
 * New building plan texts in one place, keyed the way the localization phase will key its
 * catalog (analyses/localization.md). English only for now; texts that existed before this
 * work are still where they were.
 */
const TEXT = {
  'plan.zoom.panHint': 'Pan: Shift-drag or the middle mouse button',
};

/**
 * @param {keyof typeof TEXT} key
 * @param {Record<string, string | number>} [params]
 */
export function planText(key, params = {}) {
  return String(TEXT[key] ?? key).replace(/\{(\w+)\}/g, (match, name) =>
    name in params ? String(params[name]) : match
  );
}
