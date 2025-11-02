// src/form-renderer.css.js
import { style } from '@vanilla-extract/css';
import { vars } from './theme.css.js';

export const form = style({
  boxSizing: 'border-box',
  background: vars.color.background,
  color: vars.color.foreground,
  borderRadius: vars.borderRadius,
  padding: vars.spacing.lg,
  fontSize: vars.fontSize.base,
  border: `1px solid ${vars.color.border}`,
  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  width: '100%',
});

export const section = style({
  background: vars.color.section,
  border: `1px solid ${vars.color.sectionBorder}`,
  borderRadius: vars.borderRadius,
  padding: vars.spacing.md,
  marginBottom: vars.spacing.md,
  width: '100%',
});

export const sectionHeader = style({
  color: vars.color.sectionHeader,
  fontSize: vars.fontSize.section,
  fontWeight: 600,
  marginBottom: vars.spacing.sm,
});

export const drilldownInactive = style({
  background: vars.color.section,
  border: `1px solid ${vars.color.sectionBorder}`,
  borderRadius: vars.borderRadius,
  padding: vars.spacing.md,
  marginBottom: vars.spacing.md,
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
});

export const drilldownActive = style({
  background: vars.color.section,
  border: `1px solid ${vars.color.sectionBorder}`,
  borderRadius: vars.borderRadius,
  padding: vars.spacing.md,
  marginBottom: vars.spacing.md,
  width: '100%',
});

export const button = style({
  background: vars.color.buttonBg,
  color: vars.color.buttonFg,
  border: `1px solid ${vars.color.buttonBorder}`,
  borderRadius: vars.borderRadius,
  padding: '8px 16px',
  cursor: 'pointer',
  fontWeight: 'bold',
  transition: 'background 0.2s',
  ':hover': {
    background: vars.color.buttonHoverBg,
    color: vars.color.buttonHoverFg,
    border: `1px solid ${vars.color.buttonHoverBorder}`,
  },
});

export const drilldownButton = style([
  button,
  {
    background: vars.color.drilldownButtonBg,
    color: vars.color.drilldownButtonFg,
  },
]);

export const backButton = style([
  button,
  {
    background: vars.color.backButtonBg,
    color: vars.color.backButtonFg,
  },
]);

// Simplified mode styles
export const simplifiedProgress = style({
  marginBottom: '2rem',
  textAlign: 'center',
  fontSize: '0.875rem',
  color: vars.color.foreground,
  opacity: 0.8,
});

export const simplifiedNavigation = style({
  display: 'flex',
  justifyContent: 'space-between',
  marginTop: '2rem',
  gap: '1rem',
});

export const simplifiedButton = style([
  button,
  {
    minWidth: '100px',
    transition: 'all 0.2s ease',
  },
]);

export const simplifiedButtonDisabled = style({
  opacity: 0.5,
  cursor: 'not-allowed',
  ':hover': {
    background: vars.color.buttonBg,
    color: vars.color.buttonFg,
    border: `1px solid ${vars.color.buttonBorder}`,
  },
});

export const debugPanel = style({
  marginTop: vars.spacing.lg,
  padding: vars.spacing.md,
  background: 'rgba(148, 163, 184, 0.1)',
  borderRadius: vars.borderRadius,
  fontSize: '0.8rem',
  lineHeight: 1.4,
  maxWidth: '100%',
  width: '100%',
  maxHeight: '240px',
  overflowY: 'auto',
  overflowX: 'hidden',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-all',
  overflowWrap: 'anywhere',
});
