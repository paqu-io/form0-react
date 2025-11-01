// src/field-renderer.css.js
import { style } from '@vanilla-extract/css';
import { vars } from './theme.css.js';

export const fieldWrapper = style({
  marginBottom: vars.spacing.md,
  width: '100%',
});

export const label = style({
  display: 'block',
  fontWeight: 500,
  marginBottom: vars.spacing.sm,
  fontSize: vars.fontSize.label,
});

export const labelSideFixed = style({
  width: 'var(--label-width, 30%)',
  textAlign: 'left',
  flexShrink: 0,
  display: 'block',
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

export const labelTop = style({
  // Default: label above input
  display: 'block',
});

export const labelSide = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing.xs,
});

export const labelInputRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing.md,
  width: '100%',
});

export const inputWrapper = style({
  flex: 1,
  width: '100%',
});

export const choiceGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing.sm,
});

export const choiceOption = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing.xs,
});

export const choiceOtherInput = style({
  marginTop: vars.spacing.xs,
  width: '100%',
});

export const booleanSegmented = style({
  display: 'inline-flex',
  borderRadius: vars.borderRadius,
  border: `1px solid ${vars.color.border}`,
  overflow: 'hidden',
});

export const booleanOption = style({
  appearance: 'none',
  background: vars.color.background,
  border: 'none',
  borderRight: `1px solid ${vars.color.border}`,
  padding: `${vars.spacing.xs} ${vars.spacing.md}`,
  cursor: 'pointer',
  fontSize: vars.fontSize.base,
  color: vars.color.foreground,
  selectors: {
    '&:hover': {
      background: vars.color.section,
    },
    '&:disabled': {
      cursor: 'not-allowed',
      opacity: 0.6,
    },
    '&:last-child': {
      borderRight: 'none',
    },
  },
});

export const booleanOptionSelected = style({
  background: vars.color.primary,
  color: vars.color.buttonFg,
});
