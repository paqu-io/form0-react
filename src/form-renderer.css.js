// src/form-renderer.css.js
import { style } from '@vanilla-extract/css';
import { vars } from './theme.css.js';

export const form = style({
  position: 'relative',
  boxSizing: 'border-box',
  background: vars.color.background,
  color: vars.color.foreground,
  borderRadius: vars.borderRadius,
  padding: vars.spacing.md,
  fontFamily: vars.fontFamily.base,
  fontSize: vars.fontSize.base,
  lineHeight: vars.lineHeight.normal,
  borderLeft: `1px solid ${vars.color.border}`,
  borderRight: `1px solid ${vars.color.border}`,
  borderBottom: `1px solid ${vars.color.border}`,
  width: '100%',
});

export const formRendererRoot = style({
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: 'none',
  fontFamily: vars.fontFamily.base,
});

export const formNameContainer = style({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: vars.spacing.sm,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.borderRadius,
  background: vars.color.section,
  marginBottom: vars.spacing.md,
  minHeight: '3rem',
});

export const formNameTitle = style({
  fontSize: '1.3rem',
  fontWeight: 600,
  lineHeight: vars.lineHeight.tight,
  color: vars.color.foreground,
  wordWrap: 'break-word',
  textAlign: 'center',
  paddingLeft: `var(--form-name-title-padding-left, calc(${vars.spacing.lg} * 2))`,
  paddingRight: `var(--form-name-title-padding-right, calc(${vars.spacing.lg} * 2))`,
  width: '100%',
  boxSizing: 'border-box',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const formNameActionSlot = style({
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  display: 'flex',
  gap: vars.spacing.xs,
});

export const formNameActionSlotLeft = style({
  left: vars.spacing.md,
});

export const formNameActionSlotRight = style({
  right: vars.spacing.md,
  justifyContent: 'flex-end',
});

export const formNameActionButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.35rem',
  padding: '0.35rem 0.75rem',
  borderRadius: '6px',
  border: `1px solid ${vars.color.border}`,
  background: 'transparent',
  color: vars.color.foreground,
  fontSize: '0.85rem',
  fontWeight: 600,
  lineHeight: 1.2,
  cursor: 'pointer',
  transition: 'background 0.2s ease, color 0.2s ease, border-color 0.2s ease, opacity 0.2s ease',
  selectors: {
    '&[data-variant="primary"]': {
      background: vars.color.buttonBg,
      color: vars.color.buttonFg,
      borderColor: vars.color.buttonBorder,
    },
    '&[data-variant="primary"]:hover': {
      background: vars.color.buttonHoverBg,
      color: vars.color.buttonHoverFg,
      borderColor: vars.color.buttonHoverBorder,
    },
    '&:not(:disabled):hover': {
      borderColor: vars.color.iconHover,
      color: vars.color.iconHover,
    },
    '&:disabled': {
      opacity: 0.4,
      cursor: 'not-allowed',
    },
  },
});

export const formNameActionIcon = style({
  display: 'inline-flex',
  alignItems: 'center',
});

export const headerSection = style({
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  background: vars.color.background,
  color: vars.color.foreground,
  borderRadius: vars.borderRadius,
  padding: vars.spacing.md,
  border: `1px solid ${vars.color.border}`,
  marginBottom: 'none',
});

export const stickyHeader = style({
  position: 'sticky',
  top: 'var(--form0-sticky-top-offset, 0px)',
  zIndex: 20,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing.sm,
  background: vars.color.background,
  paddingBottom: 'none',
  marginBottom: 'none',
  borderBottom: 'none',
  boxShadow: 'none',
  isolation: 'isolate',
  selectors: {
    '&::before': {
      content: '',
      position: 'absolute',
      left: 0,
      right: 0,
      top: `calc(-1 * ${vars.spacing.md})`,
      height: vars.spacing.md,
      background: vars.color.background,
      pointerEvents: 'none',
    },
  },
});

export const bodySection = style({
  display: 'flex',
  gap: 'none',
  width: '100%',
  alignItems: 'flex-start',
  minHeight: 0,
});

export const formColumn = style({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing.md,
  minWidth: 0,
});

export const recordSummary = style({
  display: 'flex',
  alignItems: 'stretch',
  gap: vars.spacing.sm,
  padding: vars.spacing.sm,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.borderRadius,
  background: vars.color.section,
  marginBottom: 'none',
});

const recordSummaryStatusBase = {
  width: '0.5rem',
  borderRadius: vars.borderRadius,
  flexShrink: 0,
  alignSelf: 'stretch',
};

export const recordSummaryStatus = style({
  ...recordSummaryStatusBase,
  background: '#d4d4d8',
});

export const recordSummaryStatusDisabled = style({
  ...recordSummaryStatusBase,
  backgroundColor: 'transparent',
  backgroundImage: `repeating-linear-gradient(45deg, ${vars.color.border}, ${vars.color.border} 4px, transparent 4px, transparent 8px)`,
  border: `1px solid ${vars.color.border}`,
});

export const recordSummaryContent = style({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
});

export const recordSummaryTitle = style({
  fontSize: '1.1rem',
  fontWeight: 600,
  lineHeight: vars.lineHeight.tight,
  color: vars.color.foreground,
  wordWrap: 'break-word',
});

export const recordMetadata = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing.sm,
  marginBottom: vars.spacing.md,
});

export const recordMetadataFields = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing.sm,
});

export const section = style({
  background: vars.color.section,
  border: `1px solid ${vars.color.sectionBorder}`,
  borderRadius: vars.borderRadius,
  padding: vars.spacing.sm,
  marginBottom: vars.spacing.sm,
  width: '100%',
});

export const sectionHeader = style({
  color: vars.color.sectionHeader,
  fontSize: vars.fontSize.section,
  fontWeight: 700,
  lineHeight: vars.lineHeight.tight,
  marginBottom: vars.spacing.sm,
  padding: vars.spacing.sm,
  background: 'rgba(0, 0, 0, 0.02)',
  marginLeft: `calc(-1 * ${vars.spacing.sm})`,
  marginRight: `calc(-1 * ${vars.spacing.sm})`,
  marginTop: `calc(-1 * ${vars.spacing.sm})`,
});

export const drilldownInactive = style({
  background: vars.color.section,
  border: `1px solid ${vars.color.sectionBorder}`,
  borderLeft: `3px solid ${vars.color.primary}`,
  borderRadius: vars.borderRadius,
  padding: vars.spacing.sm,
  marginBottom: vars.spacing.sm,
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: vars.spacing.sm,
  width: '100%',
});

export const drilldownActive = style({
  background: vars.color.section,
  border: `1px solid ${vars.color.sectionBorder}`,
  borderLeft: `3px solid ${vars.color.primary}`,
  borderRadius: vars.borderRadius,
  padding: vars.spacing.sm,
  marginBottom: vars.spacing.sm,
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

export const drilldownLabel = style({
  flex: 1,
  fontSize: '1rem',
  fontWeight: 600,
  color: vars.color.sectionHeader,
  minWidth: 0,
  wordBreak: 'break-word',
});

export const drilldownActionButton = style([
  formNameActionButton,
  {
    whiteSpace: 'nowrap',
  },
]);

// Simplified mode styles
export const simplifiedProgress = style({
  marginBottom: vars.spacing.lg,
  textAlign: 'center',
  fontSize: '0.75rem',
  lineHeight: vars.lineHeight.tight,
  color: vars.color.foreground,
  opacity: 0.8,
});

export const simplifiedNavigation = style({
  display: 'flex',
  justifyContent: 'space-between',
  marginTop: vars.spacing.lg,
  gap: vars.spacing.sm,
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
  marginTop: vars.spacing.md,
  padding: vars.spacing.sm,
  background: 'rgba(148, 163, 184, 0.1)',
  borderRadius: vars.borderRadius,
  fontSize: '0.75rem',
  lineHeight: vars.lineHeight.tight,
  maxWidth: '100%',
  width: '100%',
  maxHeight: '200px',
  overflowY: 'auto',
  overflowX: 'hidden',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-all',
  overflowWrap: 'anywhere',
});

export const alertOverlay = style({
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  padding: '1.5rem',
  pointerEvents: 'auto',
});

export const alertDialog = style({
  position: 'relative',
  background: vars.color.background,
  color: vars.color.foreground,
  borderRadius: vars.borderRadius,
  border: `1px solid ${vars.color.border}`,
  maxWidth: '420px',
  width: '100%',
  padding: vars.spacing.md,
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing.sm,
});

export const alertTitle = style({
  margin: 0,
  fontSize: '1.1rem',
  fontWeight: 600,
});

export const alertMessage = style({
  fontSize: '0.95rem',
  lineHeight: 1.5,
  whiteSpace: 'pre-wrap',
});

export const alertFooter = style({
  display: 'flex',
  justifyContent: 'flex-end',
  marginTop: vars.spacing.md,
});

export const alertOkButton = style([
  button,
  {
    minWidth: '96px',
  },
]);

export const alertCloseButton = style({
  position: 'absolute',
  top: '12px',
  right: '12px',
  background: 'transparent',
  border: 'none',
  color: vars.color.foreground,
  fontSize: '1.25rem',
  lineHeight: 1,
  padding: 0,
  cursor: 'pointer',
  outline: 'none',
  selectors: {
    '&:focus': {
      outline: 'none',
    },
    '&:hover': {
      color: vars.color.primary,
    },
    '&:focus-visible': {
      outline: `2px solid ${vars.color.primary}`,
      outlineOffset: '2px',
    },
  },
});
