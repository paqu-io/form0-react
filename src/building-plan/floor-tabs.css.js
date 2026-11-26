import { style } from '@vanilla-extract/css';
import { vars } from '../theme.css.js';
import { control, derived } from '../theme-derived.css.js';

export const row = style({
  display: 'flex',
  alignItems: 'center',
  // The floor below's name follows the tabs; the end keeps to the right (`end`).
  justifyContent: 'flex-start',
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

// The floor drawn under the one shown (F2), named after the tabs: quiet text.
export const below = style({
  color: derived.muted,
  fontSize: '12px',
  whiteSpace: 'nowrap',
});

// The row's end: "View only", the plan's issues, Undo / Redo.
export const end = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  marginLeft: 'auto',
});

export const history = style({ display: 'inline-flex', gap: '2px' });
