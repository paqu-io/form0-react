// "n issues" in the floor row and its list (1e, M2), on the theme tokens.
import { style } from '@vanilla-extract/css';
import { vars } from '../theme.css.js';
import { control, derived } from '../theme-derived.css.js';

const errorMix = (percent, base) => `color-mix(in srgb, ${vars.color.error} ${percent}%, ${base})`;

export const root = style({ position: 'relative', display: 'inline-flex' });

export const chip = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
  height: '28px',
  padding: '0 8px 0 9px',
  border: `1px solid ${errorMix(45, 'transparent')}`,
  borderRadius: '999px',
  background: errorMix(10, vars.color.background),
  color: vars.color.error,
  fontFamily: vars.fontFamily.base,
  fontSize: '12.5px',
  fontWeight: 600,
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  selectors: {
    '&:hover': { background: errorMix(16, vars.color.background) },
    '&[aria-expanded="true"]': { boxShadow: `0 0 0 2px ${errorMix(25, 'transparent')}` },
    '&:focus-visible': { outline: control.focusOutline, outlineOffset: '2px' },
  },
});

export const list = style({
  position: 'absolute',
  top: 'calc(100% + 6px)',
  right: 0,
  zIndex: 3,
  boxSizing: 'border-box',
  width: 'min(340px, calc(100vw - 32px))',
  maxHeight: '300px',
  overflowY: 'auto',
  margin: 0,
  padding: '4px',
  listStyle: 'none',
  border: `1px solid ${vars.color.border}`,
  borderRadius: '10px',
  background: vars.color.background,
  boxShadow: '0 8px 24px rgb(0 0 0 / 0.16)',
});

export const item = style({
  display: 'grid',
  gridTemplateColumns: '16px minmax(0, 1fr)',
  gap: '8px',
  alignItems: 'start',
  width: '100%',
  padding: '7px 8px',
  border: 'none',
  borderRadius: '7px',
  background: 'transparent',
  color: vars.color.foreground,
  fontFamily: vars.fontFamily.base,
  fontSize: '12.5px',
  lineHeight: 1.35,
  textAlign: 'left',
  cursor: 'pointer',
  selectors: {
    '&:hover': { background: derived.fillHover },
    '&[aria-current="true"]': {
      background: derived.primarySoft,
      boxShadow: `inset 0 0 0 1px ${vars.color.primary}`,
    },
    '&:focus-visible': { outline: control.focusOutline, outlineOffset: '-2px' },
  },
});

export const dot = style({
  width: '16px',
  height: '16px',
  marginTop: '1px',
  borderRadius: '50%',
  background: vars.color.error,
  color: vars.color.background,
  fontSize: '11px',
  fontWeight: 700,
  lineHeight: '16px',
  textAlign: 'center',
});

export const text = style({ display: 'grid', gap: '1px', minWidth: 0 });

export const title = style({ fontWeight: 600, overflowWrap: 'anywhere' });

export const detail = style({ color: derived.muted, overflowWrap: 'anywhere' });
