// src/dialog-path.css.js
import { style } from '@vanilla-extract/css';
import { control, derived } from './theme-derived.css.js';

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
// way when space runs out.
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

// The last part, the dialog's own list: the title, kept whole before the parts before it.
export const current = style({
  flexShrink: 0,
  maxWidth: '100%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});
