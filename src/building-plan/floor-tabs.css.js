import { style } from '@vanilla-extract/css';
import { vars } from '../theme.css.js';
import { control, derived } from '../theme-derived.css.js';

export const row = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '8px',
  flexWrap: 'wrap',
  marginBottom: '8px',
});

export const tabs = style({
  display: 'inline-flex',
  alignItems: 'center',
  maxWidth: '100%',
  overflowX: 'auto',
  gap: '2px',
  padding: '3px',
  borderRadius: '10px',
  background: derived.fillHover,
});

const reset = {
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  fontFamily: vars.fontFamily.base,
};

export const tab = style({
  ...reset,
  height: '28px',
  padding: '0 12px',
  borderRadius: '7px',
  color: derived.muted,
  fontSize: '13px',
  fontWeight: 600,
  whiteSpace: 'nowrap',
  selectors: {
    '&:hover': { color: vars.color.foreground },
    '&[aria-selected="true"]': {
      background: vars.color.background,
      color: vars.color.foreground,
      boxShadow: '0 1px 2px rgb(0 0 0 / 0.16)',
    },
    '&:focus-visible': { outline: control.focusOutline, outlineOffset: '1px' },
  },
});

export const empty = style({
  padding: '0 8px',
  color: derived.muted,
  fontSize: '13px',
  fontWeight: 600,
  whiteSpace: 'nowrap',
});

export const iconButton = style({
  ...reset,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '28px',
  height: '28px',
  padding: 0,
  borderRadius: '7px',
  color: vars.color.foreground,
  selectors: {
    '&:hover:not(:disabled)': { background: derived.fillPress },
    '&:disabled': { color: derived.disabledFg, cursor: 'not-allowed' },
    '&:focus-visible': { outline: control.focusOutline, outlineOffset: '1px' },
  },
});

export const history = style({ display: 'inline-flex', gap: '2px' });

export const viewOnly = style({
  padding: '3px 9px',
  borderRadius: '999px',
  border: `1px solid ${vars.color.border}`,
  color: derived.muted,
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
});
