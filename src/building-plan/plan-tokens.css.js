// The plan canvas's colours as CSS custom properties on the canvas host, derived from the form
// theme with color-mix (no new keys in `vars`). The host resolves them to concrete colours for
// the canvas (`draw/plan-theme.js`), again whenever the theme class changes.
import { createVar, style } from '@vanilla-extract/css';
import { vars } from '../theme.css.js';
import { derived } from '../theme-derived.css.js';

const mix = (color, percent, base) => `color-mix(in srgb, ${color} ${percent}%, ${base})`;
const { foreground, background, primary, section } = vars.color;

/** Keys match `DEFAULT_PLAN_THEME`. */
export const planVars = {
  wall: createVar(),
  room: createVar(),
  symbol: createVar(),
  accent: createVar(),
  handle: createVar(),
  cross: createVar(),
  dot: createVar(),
  label: createVar(),
  labelMuted: createVar(),
  overlay: createVar(),
  error: createVar(),
};

export const planTokens = style({
  vars: {
    [planVars.wall]: mix(foreground, 84, background),
    [planVars.room]: background,
    [planVars.symbol]: foreground,
    [planVars.accent]: primary,
    [planVars.handle]: background,
    [planVars.cross]: mix(foreground, 30, section),
    [planVars.dot]: mix(foreground, 30, section),
    [planVars.label]: foreground,
    [planVars.labelMuted]: derived.muted,
    [planVars.overlay]: mix(section, 82, 'transparent'),
    [planVars.error]: vars.color.error,
  },
});
