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
