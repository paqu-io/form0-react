// The front view (A2) on the plan tokens (the host's `planTokens`), so it follows the form theme
// as the plan canvas does; two colours of its own, mixed from them: the wall's face and a beam.
import { createVar, style } from '@vanilla-extract/css';
import { vars } from '../../theme.css.js';
import { control, derived } from '../../theme-derived.css.js';
import { planVars } from '../plan-tokens.css.js';

const mix = (color, percent, base) => `color-mix(in srgb, ${color} ${percent}%, ${base})`;
const face = createVar();
const beamFill = createVar();
const columnFill = createVar();
const line = createVar();
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

// Over the plan canvas, its size and frame, so switching views moves nothing.
export const root = style({
  vars: {
    [face]: mix(planVars.symbol, 10, planVars.room),
    [beamFill]: mix(planVars.symbol, 24, planVars.room),
    [columnFill]: mix(planVars.symbol, 18, planVars.room),
    [line]: mix(planVars.symbol, 30, planVars.room),
  },
  position: 'absolute',
  inset: 0,
  boxSizing: 'border-box',
  border: `1px solid ${vars.color.border}`,
  borderRadius: '8px',
  overflow: 'hidden',
  background: planVars.ground,
  touchAction: 'none',
  userSelect: 'none',
});

export const svg = style({ display: 'block', width: '100%', height: '100%' });
export const panning = style({ cursor: 'grabbing' });

export const faded = style({ opacity: 0.32 });
export const wallFace = style({ fill: face, stroke: planVars.symbol, strokeWidth: 1.25 });
export const wallEdge = style({ fill: 'none', stroke: planVars.symbol, strokeWidth: 1.25 });
export const unknownTop = style({
  stroke: planVars.symbol,
  strokeWidth: 1.25,
  strokeDasharray: '6 4',
});
export const beam = style({ fill: beamFill, stroke: planVars.symbol, strokeWidth: 1 });
// A column against the wall (2026-11-26): its outline in a tone of its own, as elevations draw
// what stands in front of a wall; no cross (in an elevation it reads as an opening) and no
// hatching (cut material), from the hand test.
export const column = style({ fill: columnFill, stroke: planVars.symbol, strokeWidth: 1.5 });
export const cross = style({
  fill: 'none',
  stroke: planVars.symbol,
  strokeWidth: 0.75,
  pointerEvents: 'none',
});
export const opening = style({ fill: planVars.room, stroke: planVars.symbol, strokeWidth: 1.25 });
// A part that opens by double-click.
export const openable = style({ cursor: 'pointer' });
export const selected = style({
  fill: mix(planVars.accent, 22, 'transparent'),
  stroke: planVars.accent,
  strokeWidth: 2,
  pointerEvents: 'none',
});
export const problem = style({
  fill: mix(planVars.error, 30, 'transparent'),
  stroke: planVars.error,
  strokeWidth: 1.5,
  pointerEvents: 'none',
});
export const floorLine = style({ stroke: planVars.symbol, strokeWidth: 2 });
export const fold = style({ stroke: planVars.symbol, strokeWidth: 1, strokeDasharray: '2 3' });
export const ext = style({ stroke: line, strokeWidth: 1, fill: 'none' });
export const pill = style({ fill: planVars.room, stroke: line, strokeWidth: 1 });
export const pillText = style({ fill: planVars.symbol, font: `600 11px ${MONO}` });
export const name = style({
  fill: planVars.symbol,
  font: `600 10px ${vars.fontFamily.base}`,
  pointerEvents: 'none',
});
export const openingName = style({
  fill: planVars.labelMuted,
  font: `600 11px ${vars.fontFamily.base}`,
  pointerEvents: 'none',
});
export const note = style({ fill: planVars.labelMuted, font: `600 11px ${vars.fontFamily.base}` });
export const marker = style({ fill: planVars.error, stroke: planVars.ground, strokeWidth: 1.5 });
export const markerText = style({
  fill: planVars.ground,
  font: `700 13px ${vars.fontFamily.base}`,
});

// The wall line, "‹ W1 · 1 of 1 ›", over the view's top left (the fit leaves room for it).
export const wallLine = style({
  position: 'absolute',
  top: '8px',
  left: '8px',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '2px',
  borderRadius: '8px',
  border: `1px solid ${vars.color.border}`,
  background: vars.color.background,
  boxShadow: '0 1px 2px rgb(0 0 0 / 0.08)',
  fontFamily: vars.fontFamily.base,
  fontSize: '12px',
  color: derived.muted,
  whiteSpace: 'nowrap',
});
export const wallName = style({ color: vars.color.foreground, fontWeight: 700 });

// The mini-map's card (2026-11-26), bottom left above the status line (its place from
// `FRONT_MAP`), framed as the wall line; the fit keeps the wall clear of it.
export const map = style({
  position: 'absolute',
  borderRadius: '8px',
  border: `1px solid ${vars.color.border}`,
  background: vars.color.background,
  boxShadow: '0 1px 2px rgb(0 0 0 / 0.08)',
  overflow: 'hidden',
});
export const mapSvg = style({ display: 'block' });
export const mapFloor = style({ fill: planVars.room });
// The walls lighter than the plan's, as in the mockup, so the shown row stands out.
export const mapWalls = style({ fill: planVars.wallFaint });
export const mapLine = style({ stroke: planVars.wallHalf, strokeWidth: 1.5 });
export const mapOther = style({
  stroke: planVars.labelMuted,
  strokeWidth: 2,
  strokeLinecap: 'round',
});
export const mapShown = style({
  stroke: planVars.accent,
  strokeWidth: 3.5,
  strokeLinecap: 'round',
});
export const mapCone = style({
  fill: planVars.accent,
  fillOpacity: 0.16,
  stroke: planVars.accent,
  strokeOpacity: 0.5,
  strokeWidth: 1,
});
// What Front shows beside the row (the side's other rows), lighter, under the row's cone.
export const mapSideCone = style({ fill: planVars.accent, fillOpacity: 0.07 });
export const mapEye = style({ fill: planVars.accent });
export const mapZero = style({
  fill: vars.color.background,
  stroke: planVars.accent,
  strokeWidth: 1.5,
});
export const step = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '24px',
  height: '24px',
  padding: 0,
  border: 'none',
  borderRadius: '6px',
  background: 'transparent',
  color: vars.color.foreground,
  cursor: 'pointer',
  selectors: {
    '&:hover:not(:disabled)': { background: derived.fillHover },
    '&:disabled': { color: derived.disabledFg, cursor: 'not-allowed' },
    '&:focus-visible': { outline: control.focusOutline, outlineOffset: '1px' },
  },
});

// The Plan | Front switch: a segmented pair, as the floor tabs.
export const viewSwitch = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '2px',
  padding: '3px',
  borderRadius: '10px',
  background: derived.fillHover,
});
export const viewButton = style({
  height: '24px',
  padding: '0 10px',
  border: 'none',
  borderRadius: '7px',
  background: 'transparent',
  color: derived.muted,
  cursor: 'pointer',
  fontFamily: vars.fontFamily.base,
  fontSize: '12px',
  fontWeight: 600,
  whiteSpace: 'nowrap',
  selectors: {
    '&:hover:not(:disabled)': { color: vars.color.foreground },
    '&[aria-pressed="true"]': {
      background: vars.color.background,
      color: vars.color.foreground,
      boxShadow: '0 1px 2px rgb(0 0 0 / 0.16)',
    },
    // Disabled: its group shows the tooltip.
    '&:disabled': { color: derived.disabledFg, cursor: 'not-allowed', pointerEvents: 'none' },
    '&:focus-visible': { outline: control.focusOutline, outlineOffset: '1px' },
  },
});
