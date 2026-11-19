/**
 * Colours the plan canvas draws with. A canvas can't read CSS, so the host resolves the plan
 * tokens (`plan-tokens.css.js`, derived from the form theme) to concrete colours and hands them
 * to the canvas; these defaults are the light theme's, used until then and in tests.
 */
export const DEFAULT_PLAN_THEME = Object.freeze({
  wall: '#33373e', // walls and columns: the cut, solid
  room: '#ffffff', // room surface and the gap of an opening
  symbol: '#14171c', // door and window lines, beams, drafts
  accent: '#2356d8', // every selection, handles, guides
  handle: '#ffffff', // handle fill
  cross: '#b9bfc8', // grid crosses (every metre)
  dot: '#b9bfc8', // grid dots
  label: '#14171c', // room names
  labelMuted: '#596373', // wall, opening, column and beam names
  overlay: 'rgba(246, 247, 249, 0.82)', // the "no floors" veil
  error: '#c4291c', // a refused edit: its ghost and the element in the way
});

/**
 * Resolves CSS colour expressions (custom properties, color-mix) to computed colours, as
 * `element` sees them, through one hidden probe.
 * @param {Element | null} element
 * @param {Record<string, string>} tokens key → CSS colour expression, for example `var(--x)`
 * @returns {Readonly<typeof DEFAULT_PLAN_THEME>}
 */
export function resolvePlanTheme(element, tokens) {
  const view = element?.ownerDocument?.defaultView;
  if (!element || !view || typeof view.getComputedStyle !== 'function') return DEFAULT_PLAN_THEME;
  const probe = element.ownerDocument.createElement('span');
  probe.style.display = 'none';
  element.appendChild(probe);
  const theme = { ...DEFAULT_PLAN_THEME };
  try {
    for (const [key, value] of Object.entries(tokens || {})) {
      probe.style.color = '';
      probe.style.color = value;
      const computed = view.getComputedStyle(probe).color;
      // An environment that doesn't resolve custom properties returns the expression itself.
      if (computed && !/var\(/.test(computed)) theme[key] = computed;
    }
  } finally {
    probe.remove();
  }
  return Object.freeze(theme);
}
