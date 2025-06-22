// src/form-renderer.css.js
import { style } from '@vanilla-extract/css';
import { vars } from './theme.css.js';

export const form = style({
  background: vars.color.background,
  color: vars.color.foreground,
  borderRadius: vars.borderRadius,
  padding: vars.spacing.lg,
  fontSize: vars.fontSize.base,
  border: `1px solid ${vars.color.border}`,
  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
});

export const section = style({
  background: vars.color.section,
  border: `1px solid ${vars.color.sectionBorder}`,
  borderRadius: vars.borderRadius,
  padding: vars.spacing.md,
  marginBottom: vars.spacing.md,
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
});

export const drilldownActive = style({
  background: vars.color.section,
  border: `1px solid ${vars.color.sectionBorder}`,
  borderRadius: vars.borderRadius,
  padding: vars.spacing.md,
  marginBottom: vars.spacing.md,
});