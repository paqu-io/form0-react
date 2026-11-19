// src/choice-dropdown.css.js
// The field of the choice dropdown, like the form's inputs; the panel under it is in
// choice-dropdown-panel.css.js.
import { style, globalStyle } from '@vanilla-extract/css';
import { vars } from './theme.css.js';
import { derived, control } from './theme-derived.css.js';

// The dropdown and, under it, the "Other" input when "Other" is chosen (8px apart, as on mobile).
export const stack = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  minWidth: 0,
});

export const root = style({
  position: 'relative',
  width: '100%',
  minWidth: 0,
});

// The visible field: one frame around the trigger, the clear button and the chevron.
export const field = style({
  display: 'flex',
  alignItems: 'center',
  minHeight: control.height,
  border: `1px solid ${derived.borderStrong}`,
  borderRadius: vars.borderRadius,
  background: vars.color.background,
  color: vars.color.foreground,
  transition: 'border-color 0.12s ease, box-shadow 0.12s ease',
  selectors: {
    '&:hover:not([data-disabled="true"]):not(:focus-within)': {
      borderColor: derived.borderHover,
    },
    '&:focus-within, &[data-open="true"]': {
      borderColor: vars.color.primary,
      boxShadow: control.focusRing,
    },
    '&[data-invalid="true"]': {
      borderColor: vars.color.error,
    },
    '&[data-invalid="true"]:focus-within': {
      boxShadow: control.errorRing,
    },
    '&[data-disabled="true"]': {
      background: derived.fill,
      color: derived.muted,
      borderColor: vars.color.border,
      cursor: 'not-allowed',
    },
  },
});

export const trigger = style({
  appearance: 'none',
  flex: 1,
  minWidth: 0,
  alignSelf: 'stretch',
  display: 'flex',
  alignItems: 'center',
  gap: '0.375rem',
  padding: `0 0.25rem 0 ${control.paddingX}`,
  border: 'none',
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  fontFamily: vars.fontFamily.base,
  fontSize: vars.fontSize.base,
  lineHeight: vars.lineHeight.tight,
  textAlign: 'left',
  cursor: 'pointer',
  outline: 'none',
  selectors: {
    '&:disabled': {
      cursor: 'not-allowed',
      color: 'inherit',
    },
  },
});

// The chosen labels, cut with an ellipsis; "+n" sits after them for multiple choice.
export const valueArea = style({
  flex: 1,
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  gap: '0.375rem',
});

export const value = style({
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const placeholder = style([value, { color: derived.placeholder }]);

export const more = style({
  flex: 'none',
  fontSize: '0.75rem',
  fontWeight: 600,
  padding: '0.0625rem 0.4375rem',
  borderRadius: '999px',
  background: derived.fillPress,
  color: vars.color.foreground,
  fontVariantNumeric: 'tabular-nums',
});

// Measures label widths for the "+n" summary; never shown.
export const measure = style({
  position: 'absolute',
  visibility: 'hidden',
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
  left: 0,
  top: 0,
});

export const srOnly = style({
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

// A mark inside the frame before the clear button, such as where a building plan value comes from.
export const adornment = style({
  flex: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  marginRight: '0.25rem',
});

export const clear = style({
  appearance: 'none',
  flex: 'none',
  width: '1.5rem',
  height: '1.5rem',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  border: 'none',
  borderRadius: '0.375rem',
  background: 'transparent',
  color: derived.muted,
  cursor: 'pointer',
  outline: 'none',
  selectors: {
    '&:hover': {
      background: derived.fillPress,
      color: vars.color.foreground,
    },
    '&:focus-visible': {
      outline: control.focusOutline,
      outlineOffset: '1px',
    },
  },
});

export const chevron = style({
  flex: 'none',
  width: '1.75rem',
  alignSelf: 'stretch',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  paddingRight: '0.25rem',
  color: derived.muted,
  cursor: 'pointer',
  selectors: {
    [`${field}[data-disabled="true"] &`]: {
      cursor: 'not-allowed',
    },
  },
});

globalStyle(`${trigger}:disabled ${placeholder}`, { color: derived.muted });
