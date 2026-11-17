// src/field-renderer.css.js
import { style, globalStyle } from '@vanilla-extract/css';
import { vars } from './theme.css.js';
import { derived, control } from './theme-derived.css.js';

export const fieldWrapper = style({
  // The error row below each control is always reserved, so it also spaces the fields.
  paddingTop: '0.125rem',
  paddingBottom: '0.125rem',
  width: '100%',
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  gap: '0.375rem',
});

export const label = style({
  display: 'block',
  fontWeight: 500,
  fontSize: vars.fontSize.label,
  lineHeight: vars.lineHeight.tight,
  color: vars.color.foreground,
});

export const labelSideFixed = style({
  width: 'var(--label-width, 30%)',
  textAlign: 'left',
  flexShrink: 0,
  display: 'block',
});

export const input = style({
  boxSizing: 'border-box',
  border: `1px solid ${derived.borderStrong}`,
  borderRadius: vars.borderRadius,
  // minHeight, not height: media and signature fields put this class on a container.
  minHeight: control.height,
  padding: `0 ${control.paddingX}`,
  width: '100%',
  fontFamily: vars.fontFamily.base,
  fontSize: vars.fontSize.base,
  lineHeight: vars.lineHeight.tight,
  color: vars.color.foreground,
  background: vars.color.background,
  outline: 'none',
  transition: 'border-color 0.12s ease, box-shadow 0.12s ease',
  selectors: {
    '&::placeholder': {
      color: derived.placeholder,
    },
    '&:is(input, select, textarea):hover:not(:disabled):not(:focus)': {
      borderColor: derived.borderHover,
    },
    '&:focus': {
      borderColor: vars.color.primary,
      boxShadow: control.focusRing,
    },
    '&[aria-invalid="true"]': {
      borderColor: vars.color.error,
    },
    '&[aria-invalid="true"]:focus': {
      boxShadow: control.errorRing,
    },
    // Calculated values: a result, not an input.
    '&[readonly]:not(:disabled)': {
      background: derived.fillHover,
      borderColor: 'transparent',
      fontWeight: 600,
      cursor: 'default',
    },
    '&[readonly]:not(:disabled):focus': {
      borderColor: vars.color.primary,
    },
    // Read-only by attribute or logic: keeps the input outline.
    '&:disabled': {
      background: derived.fill,
      color: derived.muted,
      borderColor: vars.color.border,
      cursor: 'not-allowed',
      opacity: 1,
    },
    '&:not(input):not(select):not(textarea)': {
      padding: `0.625rem ${control.paddingX}`,
    },
    'textarea&': {
      minHeight: '5rem',
      padding: `0.5rem ${control.paddingX}`,
    },
    'select&:not([multiple])': {
      appearance: 'none',
      paddingRight: '2.25rem',
      cursor: 'pointer',
      // A chevron image: gradient-drawn triangles turned into a thin line under browser zoom.
      // A mid grey reads on light and dark backgrounds.
      backgroundImage:
        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%237d8795' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
      backgroundPosition: 'right 0.75rem center',
      backgroundSize: '1rem 1rem',
      backgroundRepeat: 'no-repeat',
    },
    'select&:not([multiple]):disabled': {
      cursor: 'not-allowed',
    },
    'select&[multiple]': {
      padding: '0.25rem',
    },
  },
});

export const error = style({
  color: vars.color.error,
  fontSize: '0.78rem',
  fontWeight: 500,
  lineHeight: vars.lineHeight.tight,
  // Reserved even when empty, so showing an error never shifts the layout.
  minHeight: '1.25em',
  display: 'block',
});

// Label above the control: the wrapper stays a flex column (so the label, control and error
// keep their gap) and gets more room above and below than the side layout needs.
export const labelTop = style({
  paddingTop: '0.375rem',
  paddingBottom: '0.375rem',
});

export const labelSide = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing.xs,
});

export const labelOnly = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing.xs,
});

export const labelInputRow = style({
  display: 'flex',
  alignItems: 'flex-start',
  gap: '0.75rem',
  width: '100%',
});

export const inputWrapper = style({
  flex: 1,
  width: '100%',
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '0.375rem',
});

export const labelRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing.sm,
});

export const labelColumn = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing.xs,
  justifyContent: 'center',
  // Centres a one-line label on the first control row; taller content flows from the top.
  minHeight: control.height,
  width: 'var(--label-width, 30%)',
  flexShrink: 0,
});

export const labelText = style({
  flex: '1 1 auto',
});

export const fieldsetReset = style({
  border: 'none',
  marginLeft: 0,
  marginRight: 0,
  paddingLeft: 0,
  paddingRight: 0,
  minWidth: 0,
});

export const legendSrOnly = style({
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

export const labelFieldLabel = style({
  display: 'block',
  fontWeight: 400,
  fontStyle: 'italic',
  fontSize: vars.fontSize.base,
  lineHeight: 1.5,
  color: vars.color.foreground,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
});

export const statusField = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing.sm,
});

export const statusSelect = style({
  width: '100%',
});

export const statusPill = style({
  width: '0.75rem',
  height: '0.75rem',
  borderRadius: '999px',
  background: 'var(--status-color, #9ca3af)',
  border: '1px solid rgba(0, 0, 0, 0.1)',
  flexShrink: 0,
});

export const statusReadOnly = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing.sm,
  minHeight: '2.25rem',
});

export const statusText = style({
  fontWeight: 500,
  color: vars.color.foreground,
});

export const photoField = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.625rem',
});

// Signature field. The signed preview is "paper": white in every theme, because it shows the
// saved image (dark ink). The pad follows the theme; its ink is recoloured when saved.
const SIGNATURE_PAPER = '#fff';
const SIGNATURE_PAPER_LINE = '#b4bcc8';
const SIGNATURE_PAPER_MUTED = '#596373';

export const signatureField = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  width: '100%',
  minWidth: 0,
});

export const signatureAgreement = style({
  margin: 0,
  fontSize: '0.8125rem',
  lineHeight: vars.lineHeight.normal,
  color: derived.muted,
});

// The empty field: one add area that opens the pad, like the photo and video add area.
export const signatureAdd = style({
  appearance: 'none',
  display: 'grid',
  justifyItems: 'center',
  gap: '0.25rem',
  width: '100%',
  padding: '1.125rem 1rem',
  border: `1.5px dashed ${derived.borderStrong}`,
  borderRadius: vars.borderRadius,
  background: vars.color.background,
  color: vars.color.foreground,
  fontFamily: vars.fontFamily.base,
  fontSize: vars.fontSize.base,
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'background 0.12s ease, border-color 0.12s ease',
  selectors: {
    '&:hover:not(:disabled)': { background: derived.fillHover },
    '&:active:not(:disabled)': { background: derived.fillPress },
    '&:focus-visible': { outline: control.focusOutline, outlineOffset: '2px' },
    '&:disabled': { cursor: 'not-allowed', opacity: 0.55 },
  },
});

export const signatureAddTitle = style({ fontWeight: 600 });

export const signatureAddHint = style({ fontSize: '0.8125rem', color: derived.muted });

// A saved signature: paper with the signature on a line, then its status and actions.
export const signatureCard = style({
  border: `1px solid ${vars.color.border}`,
  borderRadius: `calc(${vars.borderRadius} + 4px)`,
  overflow: 'hidden',
  background: vars.color.background,
});

export const signaturePaper = style({
  background: SIGNATURE_PAPER,
  padding: '0.625rem 0.875rem 0',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: '0.25rem',
});

export const signatureImage = style({
  display: 'block',
  maxWidth: '100%',
  maxHeight: '7.5rem',
  height: 'auto',
});

export const signaturePaperLine = style({
  alignSelf: 'stretch',
  height: '1px',
  background: SIGNATURE_PAPER_LINE,
  marginBottom: '0.5rem',
});

export const signaturePaperEmpty = style({
  minHeight: '3.5rem',
  display: 'flex',
  alignItems: 'center',
  fontSize: '0.8125rem',
  color: SIGNATURE_PAPER_MUTED,
});

export const signatureCardFooter = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: '0.5rem',
  padding: '0.5rem 0.875rem',
  borderTop: `1px solid ${vars.color.border}`,
});

export const signatureStatus = style({
  fontSize: '0.8125rem',
  color: derived.muted,
});

export const signatureActions = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem',
});

// Read-only with nothing saved.
export const signatureEmpty = style({
  display: 'flex',
  alignItems: 'center',
  minHeight: control.height,
  padding: `0 ${control.paddingX}`,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.borderRadius,
  background: derived.fill,
  color: derived.muted,
  fontSize: vars.fontSize.base,
});

// Buttons of the field and its pad: secondary by default, `data-variant` primary, danger, ghost.
export const signatureButton = style({
  appearance: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.375rem',
  minHeight: control.height,
  padding: '0 0.875rem',
  borderRadius: vars.borderRadius,
  border: `1px solid ${derived.borderStrong}`,
  background: vars.color.background,
  color: vars.color.foreground,
  fontFamily: vars.fontFamily.base,
  fontSize: vars.fontSize.button,
  fontWeight: 600,
  lineHeight: 1.2,
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  transition: 'background 0.12s ease, color 0.12s ease, border-color 0.12s ease',
  selectors: {
    '&:hover:not(:disabled)': { background: derived.fillHover },
    '&:active:not(:disabled)': { background: derived.fillPress },
    '&:focus-visible': { outline: control.focusOutline, outlineOffset: '2px' },
    '&:disabled': { opacity: 0.45, cursor: 'not-allowed' },
    '&[data-variant="primary"]': {
      background: vars.color.buttonBg,
      color: vars.color.buttonFg,
      borderColor: vars.color.buttonBorder,
    },
    '&[data-variant="primary"]:hover:not(:disabled)': {
      background: vars.color.buttonHoverBg,
      color: vars.color.buttonHoverFg,
      borderColor: vars.color.buttonHoverBorder,
    },
    '&[data-variant="primary"]:active:not(:disabled)': {
      background: derived.buttonPress,
      borderColor: derived.buttonPress,
    },
    '&[data-variant="danger"]': {
      borderColor: 'transparent',
      background: 'transparent',
      color: vars.color.error,
    },
    '&[data-variant="danger"]:hover:not(:disabled)': { background: derived.errorSoft },
    '&[data-variant="ghost"]': { borderColor: 'transparent', background: 'transparent' },
  },
});

export const signatureModalOverlay = style({
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: vars.spacing.lg,
  zIndex: 999,
});

export const signatureModalCard = style({
  width: 'min(720px, 100%)',
  maxHeight: '100%',
  overflow: 'auto',
  borderRadius: `calc(${vars.borderRadius} + 4px)`,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.background,
  color: vars.color.foreground,
  boxShadow: '0 24px 60px rgba(0, 0, 0, 0.3)',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
  padding: '1.25rem',
  fontFamily: vars.fontFamily.base,
  fontSize: vars.fontSize.base,
});

export const signatureModalHeader = style({
  display: 'grid',
  gridTemplateColumns: '1fr auto 1fr',
  alignItems: 'center',
  justifyItems: 'start',
  gap: vars.spacing.sm,
});

export const signatureModalTitle = style({
  fontSize: vars.fontSize.base,
  fontWeight: 700,
  color: vars.color.foreground,
  margin: 0,
  textAlign: 'center',
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const signatureModalSave = style({ justifySelf: 'end' });

export const signatureModalHint = style({
  margin: 0,
  fontSize: '0.8125rem',
  color: derived.muted,
  lineHeight: vars.lineHeight.normal,
});

// The pad follows the theme. The sign line, the cross and the placeholder sit under the
// transparent canvas, so they are never part of the saved image.
export const signaturePadArea = style({
  position: 'relative',
  height: '260px',
  border: `1px solid ${derived.borderStrong}`,
  borderRadius: vars.borderRadius,
  background: vars.color.background,
  overflow: 'hidden',
  touchAction: 'none',
});

export const signaturePadLine = style({
  position: 'absolute',
  left: '2.25rem',
  right: '1.25rem',
  bottom: '3rem',
  height: '1px',
  background: derived.borderStrong,
  pointerEvents: 'none',
});

export const signaturePadMark = style({
  position: 'absolute',
  left: '0.875rem',
  bottom: '2.875rem',
  fontSize: '1.125rem',
  lineHeight: 1,
  color: derived.placeholder,
  pointerEvents: 'none',
});

export const signaturePadPlaceholder = style({
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: '1.125rem',
  textAlign: 'center',
  fontSize: '0.8125rem',
  color: derived.placeholder,
  pointerEvents: 'none',
});

export const signatureModalCanvas = style({
  position: 'relative',
  zIndex: 1,
  display: 'block',
  width: '100%',
  height: '100%',
  color: vars.color.foreground,
  cursor: 'crosshair',
  touchAction: 'none',
  userSelect: 'none',
  outline: 'none',
  selectors: {
    '&:focus-visible': { boxShadow: `inset 0 0 0 2px ${vars.color.primary}` },
  },
});

export const signatureModalFooter = style({
  display: 'flex',
  alignItems: 'center',
});

export const photoFieldControls = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: vars.spacing.xs,
});

export const photoFieldInfo = style({
  fontSize: '0.85rem',
  color: vars.color.foreground,
  opacity: 0.7,
});

export const photoPreviewList = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
  gap: '0.625rem',
});

export const photoPreview = style({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing.xs,
});

export const photoThumbWrapper = style({
  position: 'relative',
  width: '100%',
  paddingBottom: '75%',
  background: derived.fill,
  borderRadius: vars.borderRadius,
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

export const photoThumb = style({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
});

export const photoThumbPlaceholder = style({
  fontSize: '2rem',
  opacity: 0.6,
});

export const photoCaptionInput = style([
  input,
  {
    fontSize: '0.9rem',
  },
]);

export const photoCaptionStatic = style({
  fontSize: '0.85rem',
  color: vars.color.foreground,
  opacity: 0.8,
  textAlign: 'center',
});

export const photoRemoveButton = style({
  alignSelf: 'flex-end',
  appearance: 'none',
  border: 'none',
  background: '#1f2937',
  color: '#fff',
  borderRadius: '999px',
  width: '1.5rem',
  height: '1.5rem',
  lineHeight: 1,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '1rem',
  position: 'absolute',
  top: '0.25rem',
  right: '0.25rem',
  selectors: {
    '&:hover': {
      background: '#111827',
    },
    '&:focus-visible': {
      outline: `2px solid ${vars.color.primary}`,
      outlineOffset: '2px',
    },
  },
});

export const photoPlaceholder = style({
  padding: vars.spacing.sm,
  border: `1px dashed ${vars.color.border}`,
  borderRadius: vars.borderRadius,
  color: vars.color.foreground,
  opacity: 0.7,
  fontSize: '0.9rem',
});

export const photoFieldReadOnlyEmpty = style({
  fontSize: '0.9rem',
  color: vars.color.foreground,
  opacity: 0.7,
});

export const videoField = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.625rem',
});

export const videoFieldControls = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: vars.spacing.xs,
});

export const videoFieldInfo = style({
  fontSize: '0.85rem',
  color: vars.color.foreground,
  opacity: 0.7,
});

export const videoPreviewList = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
  gap: '0.625rem',
});

export const videoPreview = style({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing.xs,
});

export const videoThumbWrapper = style({
  position: 'relative',
  width: '100%',
  paddingBottom: '56.25%',
  background: derived.fill,
  borderRadius: vars.borderRadius,
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

export const videoThumb = style({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  backgroundColor: '#000',
});

export const videoThumbPlaceholder = style({
  fontSize: '2rem',
  opacity: 0.6,
});

export const videoMeta = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.125rem',
  fontSize: '0.85rem',
  color: vars.color.foreground,
});

export const videoFilename = style({
  fontSize: '0.9rem',
  fontWeight: 500,
  color: vars.color.foreground,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const videoDuration = style({
  fontSize: '0.8rem',
  color: vars.color.foreground,
  opacity: 0.75,
});

export const videoCaptionInput = photoCaptionInput;

export const videoCaptionStatic = photoCaptionStatic;

export const videoPlaceholder = style({
  padding: vars.spacing.sm,
  border: `1px dashed ${vars.color.border}`,
  borderRadius: vars.borderRadius,
  color: vars.color.foreground,
  opacity: 0.7,
  fontSize: '0.9rem',
});

export const videoFieldReadOnlyEmpty = style({
  fontSize: '0.9rem',
  color: vars.color.foreground,
  opacity: 0.7,
});

export const formLinkField = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing.xs,
});

export const formLinkActions = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: vars.spacing.xs,
  alignItems: 'center',
});

const formLinkActionButtonBase = {
  appearance: 'none',
  borderRadius: vars.borderRadius,
  fontSize: '0.9rem',
  cursor: 'pointer',
  transition: 'background 0.2s ease, border 0.2s ease, color 0.2s ease',
  selectors: {
    '&:focus-visible': {
      outline: `2px solid ${vars.color.primary}`,
      outlineOffset: '2px',
    },
    '&:disabled': {
      cursor: 'not-allowed',
      opacity: 0.6,
    },
  },
};

export const formLinkActionButton = style([
  formLinkActionButtonBase,
  {
    background: vars.color.background,
    color: vars.color.foreground,
    border: `1px solid ${vars.color.border}`,
    padding: `${vars.spacing.xs} ${vars.spacing.sm}`,
    selectors: {
      ...formLinkActionButtonBase.selectors,
      '&:hover:not(:disabled)': {
        background: derived.fillHover,
      },
    },
  },
]);

export const formLinkActionButtonPrimary = style([
  formLinkActionButtonBase,
  {
    background: vars.color.primary,
    color: vars.color.buttonFg,
    border: `1px solid ${vars.color.primary}`,
    padding: `${vars.spacing.xs} ${vars.spacing.sm}`,
    selectors: {
      ...formLinkActionButtonBase.selectors,
      '&:hover:not(:disabled)': {
        background: derived.primaryHover,
        borderColor: derived.primaryHover,
      },
    },
  },
]);

export const formLinkBanner = style({
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.borderRadius,
  background: derived.primarySoft,
  color: vars.color.foreground,
  padding: `${vars.spacing.sm} ${vars.spacing.md}`,
  fontSize: '0.9rem',
  lineHeight: 1.45,
});

export const formLinkInfoIcon = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '24px',
  height: '24px',
  borderRadius: '999px',
  border: `1px solid ${vars.color.border}`,
  background: vars.color.background,
  color: vars.color.foreground,
  cursor: 'default',
  transition: 'background 0.15s ease, color 0.15s ease, border-color 0.15s ease',
  selectors: {
    '&:hover': {
      background: derived.muted,
      color: vars.color.background,
      borderColor: derived.muted,
    },
  },
});

export const formLinkTooltip = style({
  position: 'absolute',
  zIndex: 10,
  minWidth: '260px',
  maxWidth: '360px',
  padding: vars.spacing.sm,
  background: '#111827',
  color: '#f9fafb',
  borderRadius: vars.borderRadius,
  boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
  fontSize: '0.9rem',
  lineHeight: vars.lineHeight.tight,
});

export const formLinkTooltipLink = style({
  color: '#93c5fd',
  textDecoration: 'underline',
});

export const formLinkDocsLink = style({
  color: vars.color.primary,
  textDecoration: 'underline',
  selectors: {
    '&:hover': {
      textDecoration: 'none',
    },
    '&:focus-visible': {
      outline: `2px solid ${vars.color.primary}`,
      outlineOffset: '2px',
    },
  },
});

export const formLinkInfoWrapper = style({
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
});

export const dialogTitleIcon = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: vars.spacing.md,
  verticalAlign: 'middle',
});

export const formLinkHiddenInput = style({
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

export const formLinkModalOverlay = style({
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.35)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 8000,
  padding: vars.spacing.md,
  pointerEvents: 'auto',
});

export const formLinkModal = style({
  background: vars.color.background,
  color: vars.color.foreground,
  borderRadius: vars.borderRadius,
  border: `1px solid ${vars.color.border}`,
  width: 'min(460px, 90vw)',
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing.sm,
  padding: vars.spacing.md,
});

export const formLinkModalHeader = style({
  fontSize: '1.05rem',
  fontWeight: 600,
});

export const formLinkModalBody = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing.sm,
});

export const formLinkModalFooter = style({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: vars.spacing.xs,
});

export const formLinkModalNote = style({
  fontSize: '0.9rem',
  lineHeight: 1.5,
  color: vars.color.foreground,
  opacity: 0.9,
  margin: 0,
});

export const formLinkModalPlaceholderList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing.xs,
});

export const formLinkModalPlaceholderItem = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing.sm,
  fontSize: '0.9rem',
});

export const formLinkModalPlaceholderLabel = style({
  flex: '1 1 auto',
});

export const infoIconButton = style({
  appearance: 'none',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: '1rem',
  color: vars.color.icon,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '1.5rem',
  height: '1.5rem',
  padding: 0,
  borderRadius: '0.375rem',
  outline: 'none',
  flexShrink: 0,
  transition: 'color 0.12s ease, background 0.12s ease',
  selectors: {
    '&:hover': {
      color: vars.color.iconHover,
      background: derived.fillPress,
    },
    '&:focus': {
      outline: 'none',
    },
    '&:focus-visible': {
      outline: control.focusOutline,
      outlineOffset: '1px',
    },
  },
});

export const subtext = style({
  fontSize: '0.78rem',
  color: derived.muted,
  lineHeight: 1.35,
});

export const supportingImage = style({
  display: 'block',
  marginLeft: 'auto',
  marginRight: 'auto',
  marginTop: vars.spacing.sm,
  marginBottom: vars.spacing.sm,
  maxWidth: '100%',
  height: '250px',
  objectFit: 'contain',
});

const dialogBase = style({
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  margin: 0,
  border: `1px solid ${vars.color.border}`,
  borderRadius: `calc(${vars.borderRadius} + 2px)`,
  boxShadow: '0 24px 60px rgba(0, 0, 0, 0.3)',
  padding: '1.25rem',
  background: vars.color.background,
  color: vars.color.foreground,
  fontFamily: vars.fontFamily.base,
  fontSize: vars.fontSize.base,
  lineHeight: vars.lineHeight.normal,
  maxWidth: 'min(480px, 90vw)',
  width: '100%',
  selectors: {
    '&::backdrop': {
      background: 'rgba(0,0,0,0.45)',
    },
  },
});

export const descriptionDialog = style([dialogBase]);

export const descriptionDialogContent = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing.sm,
});

export const supportingImageDialog = style([dialogBase]);

export const supportingImageDialogContent = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing.sm,
});

export const dialogHeader = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: vars.spacing.md,
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
  fontSize: '1.25rem',
  cursor: 'pointer',
  lineHeight: 1,
  padding: 0,
  outline: 'none',
  flexShrink: 0,
  selectors: {
    '&:hover': {
      background: derived.fillPress,
      color: vars.color.foreground,
    },
    '&:focus': {
      outline: 'none',
    },
    '&:focus-visible': {
      outline: control.focusOutline,
      outlineOffset: '1px',
    },
  },
});

export const dialogTitle = style({
  fontWeight: 700,
  fontSize: vars.fontSize.base,
  lineHeight: vars.lineHeight.normal,
  margin: 0,
  color: vars.color.foreground,
  display: 'flex',
  alignItems: 'center',
});

export const choiceGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.125rem',
});

export const choiceOption = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.625rem',
  minHeight: '2rem',
  padding: '0 0.5rem',
  marginLeft: '-0.5rem',
  borderRadius: vars.borderRadius,
  fontSize: vars.fontSize.base,
  lineHeight: vars.lineHeight.tight,
  cursor: 'pointer',
  selectors: {
    '&:hover': {
      background: derived.fillHover,
    },
    '&:has(input:disabled)': {
      cursor: 'not-allowed',
      background: 'transparent',
    },
  },
});

export const choiceOtherInput = style({
  flex: 1,
  minWidth: 0,
});

export const multiChoiceGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.125rem',
});

export const multiChoiceOption = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.625rem',
  minHeight: '2rem',
  padding: '0 0.5rem',
  marginLeft: '-0.5rem',
  borderRadius: vars.borderRadius,
  fontSize: vars.fontSize.base,
  lineHeight: vars.lineHeight.tight,
  cursor: 'pointer',
  selectors: {
    '&:hover': {
      background: derived.fillHover,
    },
    '&:has(input:disabled)': {
      cursor: 'not-allowed',
      background: 'transparent',
    },
  },
});

export const multiChoiceOtherInput = style({
  flex: 1,
  minWidth: 0,
});

// Radio and checkbox marks, drawn from theme tokens so they follow the host theme.
const choiceMark = `${choiceOption} input[type="radio"], ${multiChoiceOption} input[type="checkbox"]`;
const each = (suffix) =>
  choiceMark
    .split(', ')
    .map((selector) => `${selector}${suffix}`)
    .join(', ');

globalStyle(choiceMark, {
  appearance: 'none',
  boxSizing: 'border-box',
  width: '1.125rem',
  height: '1.125rem',
  margin: 0,
  flexShrink: 0,
  border: `1.5px solid ${derived.borderStrong}`,
  background: vars.color.background,
  display: 'grid',
  placeContent: 'center',
  cursor: 'pointer',
  transition: 'border-color 0.12s ease, background 0.12s ease',
});
globalStyle(`${choiceOption} input[type="radio"]`, { borderRadius: '50%' });
globalStyle(`${multiChoiceOption} input[type="checkbox"]`, { borderRadius: '0.3rem' });
globalStyle(each(':checked'), {
  borderColor: vars.color.primary,
  background: vars.color.primary,
});
globalStyle(`${choiceOption} input[type="radio"]:checked::after`, {
  content: '""',
  width: '0.4375rem',
  height: '0.4375rem',
  borderRadius: '50%',
  background: vars.color.background,
});
globalStyle(`${multiChoiceOption} input[type="checkbox"]:checked::after`, {
  content: '""',
  width: '0.5625rem',
  height: '0.3125rem',
  borderLeft: `2px solid ${vars.color.background}`,
  borderBottom: `2px solid ${vars.color.background}`,
  transform: 'translateY(-1px) rotate(-45deg)',
});
globalStyle(each(':focus-visible'), {
  outline: control.focusOutline,
  outlineOffset: '2px',
});
globalStyle(each(':disabled'), {
  opacity: 0.55,
  cursor: 'not-allowed',
});

export const booleanSegmented = style({
  display: 'inline-flex',
  alignSelf: 'flex-start',
  maxWidth: '100%',
  minHeight: control.height,
  borderRadius: vars.borderRadius,
  border: `1px solid ${derived.borderStrong}`,
  overflow: 'hidden',
});

export const booleanOption = style({
  appearance: 'none',
  boxSizing: 'border-box',
  background: vars.color.background,
  border: 'none',
  borderRight: `1px solid ${derived.borderStrong}`,
  // Two or three options share the row; long labels wrap inside their option.
  flex: '0 1 auto',
  minWidth: '3.25rem',
  padding: '0.25rem 0.875rem',
  cursor: 'pointer',
  fontFamily: vars.fontFamily.base,
  fontSize: vars.fontSize.base,
  fontWeight: 500,
  lineHeight: vars.lineHeight.tight,
  color: vars.color.foreground,
  transition: 'background 0.12s ease, color 0.12s ease',
  selectors: {
    '&:hover:not(:disabled)': {
      background: derived.fillHover,
    },
    '&:focus-visible': {
      outline: control.focusOutline,
      outlineOffset: '-3px',
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
  background: vars.color.foreground,
  color: vars.color.background,
  selectors: {
    '&:hover:not(:disabled)': {
      background: vars.color.foreground,
    },
  },
});

// Overlays rendered outside the form root still need their own box model.
globalStyle(
  [signatureModalOverlay, formLinkModalOverlay, dialogBase]
    .flatMap((root) => [root, `${root} *`, `${root} *::before`, `${root} *::after`])
    .join(', '),
  { boxSizing: 'border-box' }
);

// A control with a mark at its right edge: "Calculated", or a lock on a field that is
// read-only by its own attribute or logic.
export const inputAdorned = style({
  position: 'relative',
  width: '100%',
});

export const inputAdornment = style({
  position: 'absolute',
  right: control.paddingX,
  top: '50%',
  transform: 'translateY(-50%)',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.25rem',
  pointerEvents: 'none',
  color: derived.muted,
  fontSize: '0.66rem',
  fontWeight: 600,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  lineHeight: 1,
});

globalStyle(`${inputAdorned}[data-adornment="calculated"] > ${input}`, {
  paddingLeft: '2rem',
  paddingRight: '6.5rem',
});

// The "ƒ" before a calculated value.
export const inputAdornmentLead = style({
  position: 'absolute',
  left: control.paddingX,
  top: '50%',
  transform: 'translateY(calc(-50% - 2px))',
  pointerEvents: 'none',
  color: derived.muted,
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontStyle: 'italic',
  fontWeight: 600,
  fontSize: '0.95rem',
  lineHeight: 1,
});
globalStyle(`${inputAdorned}[data-adornment="locked"] > ${input}`, { paddingRight: '2.25rem' });

// Building plan fields: where the field sits ("Room side") and where its value comes from.
export const labelTag = style({
  flexShrink: 0,
  padding: '0.0625rem 0.375rem',
  borderRadius: '0.3rem',
  background: derived.fillPress,
  color: derived.muted,
  fontSize: '0.66rem',
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
});

// Inside the control, at its right edge.
export const sourceSlot = style({
  position: 'absolute',
  right: '0.3125rem',
  top: '50%',
  transform: 'translateY(-50%)',
  display: 'inline-flex',
});

// Under the control, for controls that have no room inside (dropdowns, choices).
export const sourceRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
});

const sourceChipBase = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.3rem',
  height: '1.5rem',
  maxWidth: '9rem',
  padding: '0 0.5rem',
  borderRadius: '0.3rem',
  fontFamily: vars.fontFamily.base,
  fontSize: '0.72rem',
  fontWeight: 600,
  lineHeight: 1,
  whiteSpace: 'nowrap',
};

// The value is inherited: says from where.
export const sourceChip = style({
  ...sourceChipBase,
  background: derived.fillPress,
  color: derived.muted,
});

// The value was set here: returns it to the inherited one.
export const sourceResetButton = style({
  ...sourceChipBase,
  appearance: 'none',
  border: `1px solid ${derived.borderStrong}`,
  background: vars.color.background,
  color: vars.color.foreground,
  cursor: 'pointer',
  selectors: {
    '&:hover': {
      background: derived.fillHover,
    },
    '&:active': {
      background: derived.fillPress,
    },
    '&:focus-visible': {
      outline: control.focusOutline,
      outlineOffset: '1px',
    },
  },
});

globalStyle(`${inputAdorned}[data-adornment="source"] > ${input}`, { paddingRight: '9.75rem' });
// An inherited value reads as linked, not typed: dashed outline, muted text, until edited.
globalStyle(`${inputAdorned}[data-source="inherit"] > ${input}:not(:focus):not(:disabled)`, {
  borderStyle: 'dashed',
  background: derived.fill,
  color: derived.muted,
});

// A text control with a button at its right edge that opens the browser's picker.
export const pickerControl = style({
  position: 'relative',
  width: '100%',
});

export const pickerButton = style({
  position: 'absolute',
  right: '0.375rem',
  top: '50%',
  transform: 'translateY(-50%)',
  width: '1.75rem',
  height: '1.75rem',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 'none',
  borderRadius: '0.375rem',
  background: 'transparent',
  color: derived.muted,
  cursor: 'pointer',
  selectors: {
    '&:hover': { background: derived.fillPress, color: vars.color.foreground },
    '&:focus-visible': { outline: control.focusOutline, outlineOffset: '1px' },
  },
});

// The native picker input: invisible, anchored at the control's bottom left, so the
// browser opens its picker where the date field's picker opens.
export const pickerNative = style({
  position: 'absolute',
  left: 0,
  bottom: 0,
  width: '1px',
  height: '1px',
  padding: 0,
  border: 0,
  opacity: 0,
  pointerEvents: 'none',
});

globalStyle(`${pickerControl} > ${input}`, { paddingRight: '2.5rem' });

// Photo and video fields: the add area wraps the field's file input.
export const mediaDrop = style({
  position: 'relative',
  display: 'grid',
  justifyItems: 'center',
  gap: '0.25rem',
  width: '100%',
  padding: '1.125rem 1rem',
  border: `1.5px dashed ${derived.borderStrong}`,
  borderRadius: vars.borderRadius,
  background: vars.color.background,
  color: vars.color.foreground,
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'background 0.12s ease, border-color 0.12s ease',
  selectors: {
    '&:hover': { background: derived.fillHover },
    '&[data-dragging="true"]': { borderColor: vars.color.primary, background: derived.primarySoft },
    '&:has(input:focus-visible)': { outline: control.focusOutline, outlineOffset: '2px' },
    '&[aria-disabled="true"]': { cursor: 'not-allowed', opacity: 0.55, background: 'transparent' },
  },
});

export const mediaDropTitle = style({ fontWeight: 600 });

export const mediaDropHint = style({ fontSize: '0.8125rem', color: derived.muted });

// The real file input stays in the page (tests and assistive tech use it) but is not drawn.
export const mediaDropInput = style({
  position: 'absolute',
  width: '1px',
  height: '1px',
  opacity: 0,
  overflow: 'hidden',
  pointerEvents: 'none',
});

// The field container also receives the input class from the renderer; here it is a plain
// block, not a bordered box.
for (const field of [photoField, videoField, signatureField]) {
  globalStyle(`${field}${input}`, {
    border: 'none',
    padding: 0,
    minHeight: 0,
    background: 'transparent',
    boxShadow: 'none',
  });
}
