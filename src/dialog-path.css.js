// src/dialog-path.css.js
import { style } from '@vanilla-extract/css';
import { vars } from './theme.css.js';
import { control, derived } from './theme-derived.css.js';

// The path's place in the header: shrinks with it, its width watched on the box around it.
export const root = style({ display: 'flex', minWidth: 0 });

// The header path of a nested dialog: on one line, the title last.
export const path = style({
  display: 'flex',
  alignItems: 'baseline',
  gap: '0.375rem',
  minWidth: 0,
  overflow: 'hidden',
  whiteSpace: 'nowrap',
});

// The lists and rows under the dialog: quieter and smaller than its title, and the first to give
// way when space runs out. Lists muted, rows (`row`) in the title's colour (2026-11-26).
export const ancestor = style({
  minWidth: '1ch',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  color: derived.muted,
  fontSize: '0.9375rem',
  fontWeight: 500,
});

// A part that can be pressed: steps up to its level (2026-11-22).
export const link = style({
  padding: 0,
  border: 0,
  background: 'none',
  fontFamily: 'inherit',
  fontSize: '0.9375rem',
  fontWeight: 500,
  lineHeight: 'inherit',
  cursor: 'pointer',
  borderRadius: '0.25rem',
  selectors: {
    '&:hover': { textDecoration: 'underline' },
    '&:focus-visible': { outline: control.focusOutline, outlineOffset: '2px' },
  },
});

export const separator = style({
  flexShrink: 0,
  color: derived.muted,
  fontWeight: 400,
});

// The last part, where the dialog is: the title, kept whole before the parts before it.
export const current = style({
  flexShrink: 0,
  maxWidth: '100%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

// "this entry" (2026-11-26): the row whose name is the title under the header, set apart from the
// names in the path.
export const entry = style({ fontStyle: 'italic', fontWeight: 600 });

// A collapsed path's "…" (2026-11-26): a button opening the parts it hides.
export const more = style({ flexShrink: 0, display: 'inline-flex' });

// Under the "…", fixed so the path's clipping doesn't cut it, over the dialog's body.
export const menu = style({
  position: 'fixed',
  zIndex: 20,
  boxSizing: 'border-box',
  display: 'grid',
  gap: '2px',
  minWidth: '10rem',
  maxWidth: 'min(22rem, calc(100vw - 32px))',
  padding: '4px',
  border: `1px solid ${vars.color.border}`,
  borderRadius: '10px',
  background: vars.color.background,
  boxShadow: '0 8px 24px rgb(0 0 0 / 0.16)',
  fontSize: '0.9375rem',
  fontWeight: 500,
  textAlign: 'left',
});

export const menuItem = style({
  display: 'block',
  width: '100%',
  padding: '6px 10px',
  border: 0,
  borderRadius: '6px',
  background: 'none',
  color: derived.muted,
  font: 'inherit',
  textAlign: 'left',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  cursor: 'pointer',
  selectors: {
    '&:hover': { background: derived.fillHover },
    '&:focus-visible': { outline: control.focusOutline, outlineOffset: '-2px' },
  },
});

// A row under the dialog, in the path or the "…" menu: its name in the title's colour, so the path
// reads as list and row pairs. Last, after the styles whose colour it overrides.
export const row = style({ color: vars.color.sectionHeader });
