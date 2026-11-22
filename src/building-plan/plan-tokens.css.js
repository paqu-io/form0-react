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
  ground: createVar(),
  wallHalf: createVar(),
  wallFaint: createVar(),
  symbolHalf: createVar(),
  symbolFaint: createVar(),
  labelFaint: createVar(),
  below: createVar(),
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
    // Scope levels (1e, V1): half strength over the room surface, faint over the ground.
    [planVars.ground]: section,
    [planVars.wallHalf]: mix(planVars.wall, 50, background),
    [planVars.wallFaint]: mix(planVars.wall, 24, section),
    [planVars.symbolHalf]: mix(foreground, 50, background),
    [planVars.symbolFaint]: mix(foreground, 24, section),
    [planVars.labelFaint]: mix(foreground, 30, section),
    // The floor below's outlines (F2): quiet, between the muted text and the ground.
    [planVars.below]: mix(derived.muted, 70, background),
  },
});
