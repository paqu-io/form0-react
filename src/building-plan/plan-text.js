/**
 * New building plan texts in one place, keyed the way the localization phase will key its
 * catalog (analyses/localization.md). English only for now; texts that existed before this
 * work are still where they were. `{alt}` and `{shift}` mark keys, shown as key caps.
 */
const TEXT = {
  'plan.zoom.panHint': 'Pan: Shift-drag or the middle mouse button',
  'plan.floor.add': 'Add floor',
  'plan.floor.none': 'No floors yet',
  'plan.floor.tabs': 'Floors',
  'plan.history.undo': 'Undo',
  'plan.history.redo': 'Redo',
  'plan.status.select': 'Drag a corner to reshape · {alt} moves it freely · {shift}-drag pans',
  'plan.status.view': 'Double-click an element to open it · {shift}-drag pans',
  'plan.status.split': 'Point at a wall and click, or type a distance from its 0 end',
  'plan.status.rejoin': 'Click an editing node to rejoin aligned portions',
  'plan.status.pin': 'Click a wall to pin or unpin it, then go back to Select',
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

/**
 * A text split around its `{placeholders}`, for texts that show keys as key caps:
 * [{ text: 'Drag a corner to reshape · ' }, { key: 'alt' }, { text: ' moves it freely' }, …].
 * @param {keyof typeof TEXT} key
 * @returns {Array<{ text: string } | { key: string }>}
 */
export function planTextParts(key) {
  return String(TEXT[key] ?? key)
    .split(/(\{\w+\})/)
    .filter(Boolean)
    .map((part) => {
      const match = /^\{(\w+)\}$/.exec(part);
      return match ? { key: match[1] } : { text: part };
    });
}
