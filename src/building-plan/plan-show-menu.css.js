// "Show" in the floor row and its switches (step 2, S1), on the theme tokens.
import { style } from '@vanilla-extract/css';
import { vars } from '../theme.css.js';
import { control, derived } from '../theme-derived.css.js';

export const root = style({ position: 'relative', display: 'inline-flex' });

export const button = style({
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
  height: '28px',
  padding: '0 7px 0 8px',
  border: `1px solid ${vars.color.border}`,
  borderRadius: '8px',
  background: vars.color.background,
  color: vars.color.foreground,
  fontFamily: vars.fontFamily.base,
  fontSize: '12.5px',
  fontWeight: 600,
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  selectors: {
    '&:hover:not(:disabled)': { background: derived.fillHover },
    '&:disabled': { color: derived.disabledFg, cursor: 'not-allowed' },
    '&[aria-expanded="true"]': {
      background: derived.primarySoft,
      borderColor: vars.color.primary,
      color: vars.color.primary,
    },
    '&:focus-visible': { outline: control.focusOutline, outlineOffset: '2px' },
  },
});

// A layer is off: a dot on the button's corner (larger after the 2a hand test).
export const dot = style({
  position: 'absolute',
  top: '-5px',
  right: '-5px',
  width: '12px',
  height: '12px',
  boxSizing: 'border-box',
  borderRadius: '50%',
  border: `2px solid ${vars.color.background}`,
  background: vars.color.primary,
});

export const menu = style({
  position: 'absolute',
  top: 'calc(100% + 6px)',
  right: 0,
  zIndex: 3,
  boxSizing: 'border-box',
  width: 'min(260px, calc(100vw - 32px))',
  display: 'grid',
  gap: '2px',
  padding: '4px',
  border: `1px solid ${vars.color.border}`,
  borderRadius: '10px',
  background: vars.color.background,
  boxShadow: '0 8px 24px rgb(0 0 0 / 0.16)',
});

export const item = style({
  display: 'grid',
  gridTemplateColumns: 'auto minmax(0, 1fr)',
  gap: '9px',
  alignItems: 'start',
  padding: '7px 8px',
  borderRadius: '7px',
  color: vars.color.foreground,
  fontFamily: vars.fontFamily.base,
  cursor: 'pointer',
  selectors: {
    '&:hover:not([data-disabled])': { background: derived.fillHover },
    '&:focus-within': { outline: control.focusOutline, outlineOffset: '-2px' },
    '&[data-disabled]': { cursor: 'not-allowed', color: derived.disabledFg },
  },
});

export const check = style({ margin: '2px 0 0', accentColor: vars.color.primary });

export const text = style({ display: 'grid', gap: '1px', minWidth: 0 });

export const label = style({ fontSize: '13px', fontWeight: 600, lineHeight: 1.35 });

export const hint = style({ fontSize: '12px', lineHeight: 1.35, color: derived.muted });
