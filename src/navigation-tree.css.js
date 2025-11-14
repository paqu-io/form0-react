// src/navigation-tree.css.js
import { style } from '@vanilla-extract/css';
import { vars } from './theme.css.js';

export const navigationContainer = style({
  position: 'sticky',
  top: 'var(--form0-sticky-top-offset, 0px)',
  width: '220px',
  maxHeight: 'calc(100vh - var(--form0-sticky-top-offset, 0px))',
  overflowY: 'auto',
  borderRight: 'none',
  background: vars.color.background,
  padding: vars.spacing.sm,
  fontFamily: vars.fontFamily.base,
  '@media': {
    '(max-width: 768px)': {
      display: 'none',
    },
  },
});

export const navigationTitle = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing.sm,
  fontSize: vars.fontSize.section,
  fontWeight: 700,
  lineHeight: vars.lineHeight.tight,
  marginBottom: vars.spacing.md,
  padding: `${vars.spacing.xs} 0 ${vars.spacing.sm} 0`,
  color: vars.color.foreground,
  borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
});

export const navigationTree = style({
  listStyle: 'none',
  padding: 0,
  margin: 0,
});

export const navigationItem = style({
  marginBottom: vars.spacing.xs,
});

export const navigationLink = style({
  display: 'block',
  padding: `${vars.spacing.xs} ${vars.spacing.sm}`,
  fontSize: '0.875rem',
  fontWeight: 500,
  lineHeight: vars.lineHeight.tight,
  color: '#4b5563',
  textDecoration: 'none',
  cursor: 'pointer',
  borderRadius: vars.borderRadius,
  transition: 'background 0.15s ease',
  selectors: {
    '&:hover': {
      background: vars.color.section,
      color: vars.color.foreground,
    },
  },
});

export const navigationLinkActive = style({
  background: vars.color.section,
  borderLeft: `4px solid ${vars.color.primary}`,
  color: vars.color.primary,
});

export const navigationNested = style({
  listStyle: 'none',
  padding: 0,
  margin: 0,
  marginTop: vars.spacing.xs,
});

export const navigationToggle = style({
  appearance: 'none',
  background: 'none',
  border: 'none',
  borderRadius: 'none',
  padding: `${vars.spacing.xs}`,
  marginRight: vars.spacing.xs,
  cursor: 'pointer',
  color: vars.color.foreground,
  width: '1.25rem',
  height: '1.25rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.15s ease',
  outline: 'none',
  selectors: {
    '&:focus': {
      outline: 'none',
    },
    '&:hover': {
      background: vars.color.primary,
      color: vars.color.buttonFg,
      borderColor: vars.color.primary,
    },
    '&:focus-visible': {
      outline: `2px solid ${vars.color.primary}`,
      outlineOffset: '2px',
    },
  },
});

export const navigationItemWithChildren = style({
  display: 'flex',
  alignItems: 'center',
});

export const navigationToggleSpacer = style({
  width: '1.25rem',
  height: '1.25rem',
  marginRight: vars.spacing.xs,
  flexShrink: 0,
});

export const navigationToggleIcon = style({
  width: '0.45rem',
  height: '0.45rem',
  borderRight: `2px solid currentColor`,
  borderBottom: `2px solid currentColor`,
  transform: 'rotate(-45deg)',
  transition: 'transform 0.2s ease, border-color 0.2s ease',
  selectors: {
    '&[data-expanded="true"]': {
      transform: 'rotate(45deg)',
    },
  },
});

export const visuallyHidden = style({
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
});
