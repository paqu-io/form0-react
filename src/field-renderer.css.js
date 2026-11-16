// src/field-renderer.css.js
import { style, globalStyle } from '@vanilla-extract/css';
import { vars } from './theme.css.js';
import { derived, control } from './theme-derived.css.js';

export const fieldWrapper = style({
  // The error row below each control is always reserved, so it also spaces the fields.
  paddingTop: '0.375rem',
  paddingBottom: '0.375rem',
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
      backgroundImage:
        'linear-gradient(45deg, transparent 50%, currentColor 50%), linear-gradient(135deg, currentColor 50%, transparent 50%)',
      backgroundPosition: 'calc(100% - 1.05rem) 50%, calc(100% - 0.75rem) 50%',
      backgroundSize: '0.3rem 0.3rem',
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

export const labelTop = style({
  // Default: label above input
  display: 'block',
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
  gap: vars.spacing.xs,
});

export const signatureField = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing.xs,
  alignItems: 'flex-start',
  touchAction: 'none',
});

export const signatureAgreement = style({
  fontSize: '0.8rem',
  color: vars.color.foreground,
  opacity: 0.85,
  lineHeight: vars.lineHeight.tight,
});

export const signatureCanvas = style({
  border: `1.5px solid ${vars.color.border}`,
  borderRadius: vars.borderRadius,
  backgroundColor: '#fff',
  cursor: 'crosshair',
  display: 'block',
  touchAction: 'none',
  userSelect: 'none',
  width: '100%',
  maxWidth: '400px',
});

export const signaturePreviewSurface = style({
  border: `1.5px solid ${vars.color.border}`,
  borderRadius: vars.borderRadius,
  backgroundColor: '#fff',
  padding: vars.spacing.xs,
  width: '100%',
  maxWidth: '400px',
  minHeight: `${150}px`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

export const signatureControls = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing.xs,
  flexWrap: 'wrap',
});

export const signaturePrimaryButton = style({
  appearance: 'none',
  border: `1px solid ${vars.color.primary}`,
  background: vars.color.buttonBg,
  color: vars.color.buttonFg,
  borderRadius: vars.borderRadius,
  padding: `${vars.spacing.xs} ${vars.spacing.sm}`,
  fontSize: '0.9rem',
  cursor: 'pointer',
  transition: 'background 0.2s ease, border 0.2s ease',
  selectors: {
    '&:hover:not(:disabled)': {
      background: vars.color.buttonHoverBg,
      borderColor: vars.color.buttonHoverBorder,
    },
    '&:focus-visible': {
      outline: `2px solid ${vars.color.primary}`,
      outlineOffset: '2px',
    },
    '&:disabled': {
      cursor: 'not-allowed',
      opacity: 0.6,
    },
  },
});

export const signatureClearButton = style({
  appearance: 'none',
  border: `1px solid ${vars.color.border}`,
  background: derived.fill,
  color: vars.color.foreground,
  borderRadius: vars.borderRadius,
  padding: `${vars.spacing.xs} ${vars.spacing.sm}`,
  fontSize: '0.9rem',
  cursor: 'pointer',
  transition: 'background 0.2s ease, border 0.2s ease',
  selectors: {
    '&:hover:not(:disabled)': {
      background: derived.fillPress,
      borderColor: derived.borderStrong,
    },
    '&:focus-visible': {
      outline: `2px solid ${vars.color.primary}`,
      outlineOffset: '2px',
    },
    '&:disabled': {
      cursor: 'not-allowed',
      opacity: 0.6,
    },
  },
});

export const signatureReadOnly = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing.xs,
});

export const signatureImageWrapper = style({
  border: `1.5px solid ${vars.color.border}`,
  borderRadius: vars.borderRadius,
  backgroundColor: '#fff',
  padding: vars.spacing.xs,
  width: `${400}px`,
  maxWidth: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

export const signatureImage = style({
  maxWidth: '100%',
  height: 'auto',
});

export const signaturePlaceholder = style({
  fontSize: '0.9rem',
  color: vars.color.foreground,
  opacity: 0.7,
});

export const signatureModalOverlay = style({
  position: 'fixed',
  inset: 0,
  background: 'rgba(15, 23, 42, 0.58)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: vars.spacing.lg,
  zIndex: 999,
});

export const signatureModalCard = style({
  width: 'min(960px, 100%)',
  maxHeight: '100%',
  overflow: 'auto',
  borderRadius: '20px',
  border: `1px solid ${vars.color.border}`,
  background: vars.color.background,
  boxShadow: '0 22px 70px rgba(15, 23, 42, 0.22)',
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing.md,
  padding: vars.spacing.lg,
});

export const signatureModalHeader = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: vars.spacing.sm,
});

export const signatureModalTitle = style({
  fontSize: '1rem',
  fontWeight: 600,
  color: vars.color.foreground,
  margin: 0,
});

export const signatureModalHint = style({
  fontSize: '0.9rem',
  color: vars.color.foreground,
  opacity: 0.78,
  lineHeight: vars.lineHeight.normal,
});

export const signatureModalCanvas = style({
  border: `1.5px solid ${vars.color.border}`,
  borderRadius: '16px',
  backgroundColor: '#fff',
  cursor: 'crosshair',
  display: 'block',
  touchAction: 'none',
  userSelect: 'none',
  width: '100%',
  minHeight: `${260}px`,
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
  gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
  gap: vars.spacing.xs,
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
  gap: vars.spacing.xs,
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
  gap: vars.spacing.xs,
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
  borderRadius: vars.borderRadius,
  padding: vars.spacing.md,
  background: vars.color.background,
  color: vars.color.foreground,
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
  fontSize: '1.5rem',
  cursor: 'pointer',
  lineHeight: 1,
  padding: 0,
  outline: 'none',
  flexShrink: 0,
  selectors: {
    '&:focus': {
      outline: 'none',
    },
    '&:focus-visible': {
      outline: `2px solid ${vars.color.primary}`,
      outlineOffset: '2px',
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
