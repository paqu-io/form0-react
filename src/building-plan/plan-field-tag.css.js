// A shared wall's whole-wall field: its tag as a button and the note it opens (2026-11-23).
import { style } from '@vanilla-extract/css';
import { vars } from '../theme.css.js';
import { control, derived } from '../theme-derived.css.js';

export const root = style({ position: 'relative', display: 'inline-flex', flexShrink: 0 });

// Over the field's tag style: tinted, with its icon, as a button.
export const shared = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  border: '1px solid transparent',
  background: derived.primarySoft,
  color: vars.color.primary,
  fontFamily: vars.fontFamily.base,
  cursor: 'pointer',
  selectors: {
    '&[aria-expanded="true"]': { borderColor: vars.color.primary },
    '&:focus-visible': { outline: control.focusOutline, outlineOffset: '2px' },
  },
});

export const note = style({
  position: 'absolute',
  top: 'calc(100% + 6px)',
  right: 0,
  zIndex: 3,
  boxSizing: 'border-box',
  width: 'min(290px, calc(100vw - 32px))',
  display: 'grid',
  gap: '4px',
  padding: '10px 12px',
  border: `1px solid ${vars.color.border}`,
  borderRadius: '8px',
  background: vars.color.background,
  boxShadow: '0 8px 24px rgb(0 0 0 / 0.16)',
  color: vars.color.foreground,
  fontFamily: vars.fontFamily.base,
  fontSize: '13px',
  lineHeight: 1.45,
  textAlign: 'left',
  textTransform: 'none',
  letterSpacing: 'normal',
  whiteSpace: 'normal',
  selectors: { '&[hidden]': { display: 'none' } },
});

export const noteTitle = style({ fontWeight: 600 });

export const noteBody = style({ color: derived.muted });
