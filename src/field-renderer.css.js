// src/field-renderer.css.js
import { style } from '@vanilla-extract/css';
import { vars } from './theme.css.js';

export const fieldWrapper = style({
  marginBottom: vars.spacing.xs,
  paddingTop: vars.spacing.sm,
  paddingBottom: vars.spacing.sm,
  borderBottom: `1px solid ${vars.color.border}`,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  selectors: {
    '&:last-child': {
      borderBottom: 'none',
    },
  },
});

export const label = style({
  display: 'block',
  fontWeight: 500,
  marginBottom: vars.spacing.xs,
  fontSize: vars.fontSize.label,
  lineHeight: vars.lineHeight.tight,
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
  padding: '6px 8px',
  width: '100%',
  fontSize: vars.fontSize.base,
  lineHeight: vars.lineHeight.tight,
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
  fontSize: '0.75rem',
  lineHeight: vars.lineHeight.tight,
  marginTop: vars.spacing.xs,
  minHeight: '1em',
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

export const labelInputRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing.sm,
  width: '100%',
});

export const inputWrapper = style({
  flex: 1,
  width: '100%',
});

export const labelRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing.xs,
});

export const labelColumn = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing.xs,
  justifyContent: 'center',
  minHeight: '100%',
  width: 'var(--label-width, 30%)',
  flexShrink: 0,
});

export const labelText = style({
  flex: '1 1 auto',
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

export const signatureControls = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing.xs,
});

export const signatureClearButton = style({
  appearance: 'none',
  border: `1px solid ${vars.color.border}`,
  background: '#f3f4f6',
  color: vars.color.foreground,
  borderRadius: vars.borderRadius,
  padding: `${vars.spacing.xs} ${vars.spacing.sm}`,
  fontSize: '0.9rem',
  cursor: 'pointer',
  transition: 'background 0.2s ease, border 0.2s ease',
  selectors: {
    '&:hover:not(:disabled)': {
      background: '#e5e7eb',
      borderColor: '#9ca3af',
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
  background: '#f3f4f6',
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
  background: '#1118270d',
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
        background: '#f3f4f6',
      },
    },
  },
]);

export const formLinkActionButtonPrimary = style([
  formLinkActionButtonBase,
  {
    background: vars.color.primary,
    color: '#fff',
    border: `1px solid ${vars.color.primary}`,
    padding: `${vars.spacing.xs} ${vars.spacing.sm}`,
    selectors: {
      ...formLinkActionButtonBase.selectors,
      '&:hover:not(:disabled)': {
        background: '#0b60b0',
        borderColor: '#0b60b0',
      },
    },
  },
]);

export const formLinkBanner = style({
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.borderRadius,
  background: '#eff6ff',
  color: vars.color.foreground,
  padding: `${vars.spacing.sm} ${vars.spacing.md}`,
  fontSize: '0.9rem',
  lineHeight: 1.45,
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
  color: vars.color.foreground,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  outline: 'none',
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

export const subtext = style({
  fontSize: '0.75rem',
  color: vars.color.foreground,
  opacity: 0.65,
  marginTop: vars.spacing.xs,
  lineHeight: vars.lineHeight.tight,
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
});

export const choiceGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing.xs,
});

export const choiceOption = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing.xs,
  lineHeight: vars.lineHeight.tight,
});

export const choiceOtherInput = style({
  marginTop: vars.spacing.xs,
  width: '100%',
});

export const multiChoiceGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing.xs,
});

export const multiChoiceOption = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing.xs,
  lineHeight: vars.lineHeight.tight,
});

export const multiChoiceOtherInput = style({
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
  padding: `${vars.spacing.xs} ${vars.spacing.sm}`,
  cursor: 'pointer',
  fontSize: vars.fontSize.base,
  lineHeight: vars.lineHeight.tight,
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
