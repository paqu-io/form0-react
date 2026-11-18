// src/field-help.css.js
// The help a field gives: the framed inline image, and the description and image dialogs.
import { style } from '@vanilla-extract/css';
import { vars } from './theme.css.js';
import { derived, control } from './theme-derived.css.js';

const INLINE_IMAGE_MAX_HEIGHT = '200px';

// A frame at the field's width. The image keeps its shape inside it, never enlarged past its
// own size, at most 200px tall; the frame's fill shows around a narrower image.
export const figure = style({
  margin: `${vars.spacing.sm} 0`,
  padding: 0,
  minWidth: 0,
});

export const figureButton = style({
  appearance: 'none',
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  padding: 0,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.borderRadius,
  background: derived.fill,
  overflow: 'hidden',
  cursor: 'zoom-in',
  outline: 'none',
  transition: 'border-color 0.12s ease',
  selectors: {
    '&:hover': {
      borderColor: derived.borderHover,
    },
    '&:focus-visible': {
      outline: control.focusOutline,
      outlineOffset: '2px',
    },
  },
});

export const figureImage = style({
  display: 'block',
  maxWidth: '100%',
  maxHeight: INLINE_IMAGE_MAX_HEIGHT,
});

// The corner mark that says the image opens larger.
export const figureExpand = style({
  position: 'absolute',
  right: '0.375rem',
  bottom: '0.375rem',
  width: '1.5rem',
  height: '1.5rem',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '0.375rem',
  border: `1px solid ${vars.color.border}`,
  background: vars.color.background,
  color: vars.color.icon,
  pointerEvents: 'none',
  selectors: {
    [`${figureButton}:hover &`]: {
      color: vars.color.iconHover,
    },
  },
});

// Dialogs. The dialog itself has no padding, so a click whose target is the dialog element
// landed on the backdrop.
const dialogBase = style({
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  margin: 0,
  padding: 0,
  border: `1px solid ${vars.color.border}`,
  borderRadius: `calc(${vars.borderRadius} + 2px)`,
  boxShadow: '0 24px 60px rgba(0, 0, 0, 0.3)',
  background: vars.color.background,
  color: vars.color.foreground,
  fontFamily: vars.fontFamily.base,
  fontSize: vars.fontSize.base,
  lineHeight: vars.lineHeight.normal,
  width: '100%',
  maxHeight: '90vh',
  overflow: 'hidden',
  selectors: {
    '&::backdrop': {
      background: 'rgba(0, 0, 0, 0.45)',
    },
  },
});

export const descriptionDialog = style([dialogBase, { maxWidth: 'min(480px, 90vw)' }]);

export const imageDialog = style([dialogBase, { maxWidth: 'min(960px, 92vw)' }]);

export const dialogContent = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing.lg,
  maxHeight: '90vh',
  padding: '1.25rem',
  boxSizing: 'border-box',
});

export const dialogHeader = style({
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: vars.spacing.lg,
});

export const dialogTitle = style({
  margin: 0,
  fontWeight: 700,
  fontSize: vars.fontSize.base,
  lineHeight: vars.lineHeight.tight,
  color: vars.color.foreground,
  // Aligns the first line with the close button's centre.
  paddingTop: '0.25rem',
  minWidth: 0,
  overflowWrap: 'anywhere',
});

export const dialogCloseButton = style({
  appearance: 'none',
  border: 'none',
  background: 'transparent',
  color: derived.muted,
  width: '1.75rem',
  height: '1.75rem',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '0.375rem',
  cursor: 'pointer',
  padding: 0,
  outline: 'none',
  flexShrink: 0,
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

export const descriptionText = style({
  margin: 0,
  // Line breaks typed in the schema's description are kept, as on mobile.
  whiteSpace: 'pre-line',
  overflowY: 'auto',
  color: vars.color.foreground,
});

export const imageFrame = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 0,
  borderRadius: vars.borderRadius,
  background: derived.fill,
  overflow: 'hidden',
});

export const viewerImage = style({
  display: 'block',
  maxWidth: '100%',
  // The dialog's 90vh less its padding and header.
  maxHeight: 'calc(90vh - 6rem)',
});
