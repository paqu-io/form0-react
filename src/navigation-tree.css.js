// src/navigation-tree.css.js
import { style } from '@vanilla-extract/css';
import { vars } from './theme.css.js';
import { derived } from './theme-derived.css.js';

export const navigationContainer = style({
  position: 'sticky',
  // Below the sticky form header (its height is measured into --form0-sticky-header-height),
  // so the panel stays visible while the form scrolls.
  top: 'calc(var(--form0-sticky-top-offset, 0px) + var(--form0-sticky-header-height, 0px) + 0.75rem)',
  width: '200px',
  flexShrink: 0,
  maxHeight:
    'calc(100vh - var(--form0-sticky-top-offset, 0px) - var(--form0-sticky-header-height, 0px) - 1.5rem)',
  overflowY: 'auto',
  overflowX: 'hidden',
  boxSizing: 'border-box',
  minWidth: 0,
  // No box of its own: it sits on the body's tinted surface.
  background: 'transparent',
  padding: 0,
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
  borderBottom: `1px solid ${vars.color.border}`,
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
  flex: 1,
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  gap: '0.375rem',
  position: 'relative',
  padding: '0.375rem 0.5rem 0.375rem 0.875rem',
  fontSize: '0.875rem',
  fontWeight: 500,
  lineHeight: vars.lineHeight.tight,
  color: derived.muted,
  textDecoration: 'none',
  cursor: 'pointer',
  borderRadius: vars.borderRadius,
  transition: 'background 0.12s ease, color 0.12s ease',
  selectors: {
    '&:hover': {
      background: derived.fillPress,
      color: vars.color.foreground,
    },
    '&:focus-visible': {
      outline: `2px solid ${vars.color.primary}`,
      outlineOffset: '1px',
    },
    // Inset accent bar, shown on the current section and its parents.
    '&::before': {
      content: '""',
      position: 'absolute',
      left: '0.25rem',
      top: '0.375rem',
      bottom: '0.375rem',
      width: '3px',
      borderRadius: '2px',
      background: 'transparent',
    },
  },
});

export const navigationLinkLabel = style({
  flex: 1,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

// Marks a section that opens separately: drill-down, repeatable or building plan.
export const navigationLinkKind = style({
  flexShrink: 0,
  display: 'inline-flex',
  color: derived.muted,
});

// On the path to the current section.
// On the path to the current section.
// On the path to the current section.
export const navigationLinkHighlight = style({
  color: vars.color.foreground,
  selectors: {
    '&::before': {
      background: vars.color.primary,
    },
  },
});

// The current section.
// The current section.
// The current section.
export const navigationLinkActive = style({
  background: vars.color.background,
  color: vars.color.foreground,
  fontWeight: 650,
  selectors: {
    '&:hover': {
      background: vars.color.background,
    },
    '&::before': {
      background: vars.color.primary,
    },
  },
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
      background: derived.fillPress,
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
  gap: '1rem',
  marginBottom: '0.75rem',
  borderBottom: `1px solid ${vars.color.border}`,
});

export const navigationTabButton = style({
  appearance: 'none',
  background: 'none',
  border: 'none',
  padding: '0.375rem 0',
  fontFamily: vars.fontFamily.base,
  fontWeight: 600,
  fontSize: '0.875rem',
  color: derived.muted,
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
      outline: `2px solid ${vars.color.primary}`,
      outlineOffset: '2px',
    },
    '&:hover:not(:disabled)': {
      color: vars.color.foreground,
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
  },
});

export const navigationTabBadge = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginLeft: vars.spacing.xs,
  fontSize: '0.7rem',
  minWidth: '1.25rem',
  padding: '0.0625rem 0.3rem',
  borderRadius: '999px',
  background: derived.primarySoft,
  color: vars.color.primary,
  selectors: {
    // Findings left after a Save or Submit, in the plan's "n issues" colours (4a hand test).
    '&[data-tone="error"]': { background: derived.errorSoft, color: vars.color.error },
  },
});

export const navigationTabPanel = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing.sm,
});

export const validationList = style({
  minWidth: 0,
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
  boxSizing: 'border-box',
  minWidth: 0,
  maxWidth: '100%',
  overflowWrap: 'anywhere',
  width: '100%',
  textAlign: 'left',
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.borderRadius,
  padding: vars.spacing.sm,
  background: vars.color.section,
  // A button's own text colour is the browser's black: unreadable in dark mode (seen 2026-11-25).
  color: vars.color.foreground,
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
  flexWrap: 'wrap',
  gap: vars.spacing.xs,
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  fontWeight: 600,
  fontSize: '0.85rem',
});

export const validationField = style({
  fontSize: '0.75rem',
  color: derived.muted,
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
  color: derived.muted,
  padding: vars.spacing.sm,
});

export const validationPager = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: vars.spacing.xs,
  paddingTop: vars.spacing.xs,
});

export const validationPageCount = style({
  fontSize: '0.75rem',
  color: vars.color.foreground,
  overflowWrap: 'anywhere',
});

export const validationPageButton = style({
  appearance: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: '2rem',
  height: '2rem',
  padding: 0,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.borderRadius,
  background: vars.color.section,
  color: vars.color.foreground,
  fontFamily: 'inherit',
  fontSize: '1.2rem',
  lineHeight: 1,
  cursor: 'pointer',
  selectors: {
    '&:hover:not(:disabled)': { borderColor: vars.color.primary },
    '&:focus-visible': { outline: `2px solid ${vars.color.primary}`, outlineOffset: '2px' },
    '&:disabled': { opacity: 0.4, cursor: 'default' },
  },
});
