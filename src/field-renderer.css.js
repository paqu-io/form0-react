// src/field-renderer.css.js
import { style } from '@vanilla-extract/css';
import { vars } from './theme.css.js';

export const fieldWrapper = style({
  marginBottom: vars.spacing.md,
});

export const label = style({
  display: 'block',
  fontWeight: 500,
  marginBottom: vars.spacing.sm,
  fontSize: vars.fontSize.label,
});

export const input = style({
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.borderRadius,
  padding: vars.spacing.sm,
  width: '100%',
  fontSize: vars.fontSize.base,
  color: vars.color.foreground,
  background: vars.color.background,
  outline: 'none',
  selectors: {
    '&:focus': {
      borderColor: vars.color.primary,
    },
    '&:disabled': {
      background: '#f3f4f6',
      color: '#9ca3af',
    },
  },
});

export const error = style({
  color: vars.color.error,
  fontSize: '0.875rem',
  marginTop: '0.25rem',
});
