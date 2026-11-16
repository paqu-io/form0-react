// src/theme-derived.css.js
// State colours computed from the theme contract with color-mix, so a host theme only has to
// supply the keys in `vars`. Adding keys to `vars` would break every existing createTheme call.
import { vars } from './theme.css.js';

const mix = (color, percent, base) => `color-mix(in srgb, ${color} ${percent}%, ${base})`;
const { foreground, background, primary } = vars.color;

export const derived = {
  fill: mix(foreground, 4, background), // quiet surface: disabled inputs, thumbnails
  fillHover: mix(foreground, 7, background),
  fillPress: mix(foreground, 12, background),
  muted: mix(foreground, 62, background), // secondary text
  disabledFg: mix(foreground, 45, background),
  borderStrong: mix(foreground, 30, background),
  primarySoft: mix(primary, 12, background),
  primaryHover: mix(primary, 86, foreground),
};
