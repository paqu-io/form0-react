// src/navigation-tree.css.js
import { style } from '@vanilla-extract/css';
import { vars } from './theme.css.js';

export const navigationContainer = style({
  position: 'sticky',
  top: 0,
  width: '220px',
  maxHeight: '100vh',
  overflowY: 'auto',
  borderRight: `1px solid ${vars.color.border}`,
  background: vars.color.background,
  padding: vars.spacing.sm,
  '@media': {
    '(max-width: 768px)': {
      display: 'none',
    },
  },
});

export const navigationTitle = style({
  fontSize: vars.fontSize.label,
  fontWeight: 700,
  lineHeight: vars.lineHeight.tight,
  marginBottom: vars.spacing.sm,
  padding: `${vars.spacing.xs} 0`,
  color: vars.color.foreground,
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
  fontSize: vars.fontSize.base,
  lineHeight: vars.lineHeight.normal,
  color: vars.color.foreground,
  textDecoration: 'none',
  cursor: 'pointer',
  borderRadius: vars.borderRadius,
  transition: 'background 0.15s ease',
  selectors: {
    '&:hover': {
      background: vars.color.section,
    },
  },
});

export const navigationLinkActive = style({
  fontWeight: 700,
  background: vars.color.section,
  borderLeft: `2px solid ${vars.color.primary}`,
});

export const navigationNested = style({
  listStyle: 'none',
  padding: 0,
  paddingLeft: vars.spacing.md,
  margin: 0,
  marginTop: vars.spacing.xs,
});

export const navigationToggle = style({
  appearance: 'none',
  background: vars.color.section,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.borderRadius,
  padding: `${vars.spacing.xs}`,
  marginRight: vars.spacing.xs,
  cursor: 'pointer',
  fontSize: '0.625rem',
  color: vars.color.foreground,
  lineHeight: 1,
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

