// src/choice-dropdown-panel.css.js
// The panel of the choice dropdown: under the field (above it when there is no room below),
// with the search box when searchable, the options, "Other" and a footer with the keys.
import { style } from '@vanilla-extract/css';
import { vars } from './theme.css.js';
import { derived, control } from './theme-derived.css.js';

export const panel = style({
  position: 'absolute',
  left: 0,
  right: 0,
  top: 'calc(100% + 4px)',
  zIndex: 30,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  border: `1px solid ${vars.color.border}`,
  borderRadius: `calc(${vars.borderRadius} + 4px)`,
  background: vars.color.background,
  color: vars.color.foreground,
  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.18)',
  fontFamily: vars.fontFamily.base,
  fontSize: vars.fontSize.base,
  selectors: {
    '&[data-placement="top"]': {
      top: 'auto',
      bottom: 'calc(100% + 4px)',
    },
  },
});

export const search = style({
  position: 'relative',
  padding: vars.spacing.md,
  borderBottom: `1px solid ${vars.color.border}`,
});

export const searchIcon = style({
  position: 'absolute',
  left: '1.1875rem',
  top: '50%',
  transform: 'translateY(-50%)',
  color: derived.muted,
  pointerEvents: 'none',
});

export const searchInput = style({
  boxSizing: 'border-box',
  width: '100%',
  height: '2rem',
  padding: '0 0.75rem 0 2.125rem',
  border: `1px solid ${derived.borderStrong}`,
  borderRadius: vars.borderRadius,
  background: vars.color.background,
  color: vars.color.foreground,
  fontFamily: vars.fontFamily.base,
  fontSize: vars.fontSize.base,
  outline: 'none',
  selectors: {
    '&::placeholder': { color: derived.placeholder },
    '&:focus': {
      borderColor: vars.color.primary,
      boxShadow: control.focusRing,
    },
  },
});

export const list = style({
  listStyle: 'none',
  margin: 0,
  padding: vars.spacing.sm,
  maxHeight: '15rem',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '1px',
  outline: 'none',
});

export const option = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.625rem',
  minHeight: '2rem',
  padding: '0.25rem 0.625rem',
  borderRadius: `calc(${vars.borderRadius} - 2px)`,
  cursor: 'pointer',
  userSelect: 'none',
  selectors: {
    '&[data-active="true"]': {
      background: derived.fillPress,
    },
    '&[aria-selected="true"]': {
      fontWeight: 600,
    },
  },
});

export const optionLabel = style({
  flex: 1,
  minWidth: 0,
  overflowWrap: 'anywhere',
});

export const otherLabel = style([optionLabel, { color: derived.muted }]);

export const check = style({
  flex: 'none',
  width: '1rem',
  display: 'flex',
  color: vars.color.primary,
});

export const box = style({
  flex: 'none',
  width: '1rem',
  height: '1rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: `1.5px solid ${derived.borderStrong}`,
  borderRadius: '0.25rem',
  color: vars.color.background,
  selectors: {
    [`${option}[aria-selected="true"] &`]: {
      background: vars.color.primary,
      borderColor: vars.color.primary,
    },
  },
});

export const separator = style({
  height: '1px',
  margin: `${vars.spacing.sm} 0.375rem`,
  background: vars.color.border,
  flex: 'none',
});

export const empty = style({
  padding: '0.5rem 0.625rem 0.375rem',
  color: derived.muted,
});

export const footer = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: vars.spacing.md,
  padding: '0.375rem 0.625rem',
  borderTop: `1px solid ${vars.color.border}`,
  background: derived.fill,
  color: derived.muted,
  fontSize: '0.75rem',
});

export const key = style({
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  fontSize: '0.6875rem',
  lineHeight: 1,
  padding: '0.125rem 0.25rem',
  borderRadius: '0.25rem',
  border: `1px solid ${derived.borderStrong}`,
  background: vars.color.background,
  color: vars.color.foreground,
});
