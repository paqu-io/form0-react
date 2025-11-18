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

export const navigationLinkHighlight = style({
  background: vars.color.section,
  borderLeft: `4px solid ${vars.color.primary}`,
  color: '#4b5563',
});

export const navigationLinkActive = style({
  color: '#ff007a',
  borderLeft: `4px solid #ff007a`,
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

export const navigationTabs = style({
  display: 'flex',
  gap: vars.spacing.xl,
  marginBottom: vars.spacing.md,
  borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
  justifyContent: 'center',
});

export const navigationTabButton = style({
  appearance: 'none',
  background: 'none',
  border: 'none',
  padding: `${vars.spacing.xs} 0`,
  fontWeight: 600,
  fontSize: '0.9rem',
  color: '#6b7280',
  cursor: 'pointer',
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.spacing.xs,
  borderRadius: vars.borderRadius,
  transition: 'color 0.15s ease, background 0.15s ease',
  selectors: {
    '&:focus': {
      outline: 'none',
    },
    '&:focus-visible': {
      outline: 'none',
    },
    '&:hover:not(:disabled)': {
      color: '#4b5563',
      background: 'rgba(15, 23, 42, 0.04)',
    },
    '&:hover:not(:disabled)[data-active="true"]': {
      color: vars.color.primary,
      background: 'rgba(255, 0, 122, 0.08)',
    },
    '&:disabled': {
      cursor: 'not-allowed',
      opacity: 0.5,
    },
  },
});

export const navigationTabButtonActive = style({
  color: vars.color.foreground,
  selectors: {
    '&::after': {
      content: '""',
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: '-1px',
      height: '2px',
      background: vars.color.primary,
    },
    '&:hover:not(:disabled)': {
      color: vars.color.primary,
    },
  },
});

export const navigationTabBadge = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginLeft: vars.spacing.xs,
  fontSize: '0.7rem',
  minWidth: '1.5rem',
  padding: '0 0.3rem',
  borderRadius: vars.borderRadius,
  background: 'rgba(255, 0, 122, 0.12)',
  color: '#ff007a',
});

export const navigationTabPanel = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing.sm,
});

export const validationList = style({
  listStyle: 'none',
  padding: 0,
  margin: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing.sm,
});

export const validationItem = style({
  margin: 0,
});

export const validationButton = style({
  width: '100%',
  textAlign: 'left',
  border: `1px solid rgba(0, 0, 0, 0.08)`,
  borderRadius: vars.borderRadius,
  padding: vars.spacing.sm,
  background: vars.color.section,
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing.xs,
  transition: 'border 0.15s ease, box-shadow 0.15s ease',
  selectors: {
    '&:hover': {
      borderColor: vars.color.primary,
      boxShadow: '0 1px 4px rgba(0, 0, 0, 0.08)',
    },
    '&:focus-visible': {
      outline: `2px solid ${vars.color.primary}`,
      outlineOffset: '2px',
    },
  },
});

export const validationHeader = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  fontWeight: 600,
  fontSize: '0.85rem',
});

export const validationField = style({
  fontSize: '0.75rem',
  color: '#6b7280',
});

export const validationMessage = style({
  fontSize: '0.75rem',
  color: vars.color.error,
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
});

export const validationEmptyState = style({
  fontSize: '0.85rem',
  color: '#6b7280',
  padding: vars.spacing.sm,
});
