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

export const modeBanner = style({
  width: '100%',
  textAlign: 'center',
  fontSize: '0.75rem',
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  padding: `${vars.spacing.xs} ${vars.spacing.md}`,
  borderTopLeftRadius: vars.borderRadius,
  borderTopRightRadius: vars.borderRadius,
  borderBottomLeftRadius: '0px',
  borderBottomRightRadius: '0px',
  marginBottom: `calc(-1 * ${vars.spacing.xs})`,
  position: 'relative',
  zIndex: 21,
});

export const modeBannerEdit = style({
  background: vars.color.bannerEditBg,
  color: vars.color.bannerEditFg,
  border: `1px solid ${vars.color.bannerEditBorder}`,
  borderBottom: 'none',
});

export const modeBannerView = style({
  background: vars.color.bannerViewBg,
  color: vars.color.bannerViewFg,
  border: `1px solid ${vars.color.bannerViewBorder}`,
  borderBottom: 'none',
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
  borderRadius: vars.borderRadius,
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
    '&[data-variant="edit"]': {
      background: 'transparent',
      color: vars.color.primary,
      borderColor: vars.color.primary,
    },
    '&[data-variant="edit"]:hover': {
      background: vars.color.section,
      color: vars.color.primary,
      borderColor: vars.color.primary,
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

export const formNameActionLabel = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.spacing.md,
});

export const shortcutBadge = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0 0.4rem',
  borderRadius: '4px',
  background: vars.color.section,
  color: vars.color.foreground,
  fontSize: '0.65rem',
  fontWeight: 500,
  lineHeight: 1.2,
  border: `1px solid ${vars.color.border}`,
  textTransform: 'lowercase',
  letterSpacing: '0.05em',
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
      top: 0,
      height: 0,
      background: vars.color.background,
      pointerEvents: 'none',
    },
  },
});

export const headerAccessory = style({
  width: '100%',
  flexShrink: 0,
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
  background: vars.color.background,
  border: `1px solid ${vars.color.sectionBorder}`,
  borderRadius: vars.borderRadius,
  padding: vars.spacing.sm,
  marginBottom: vars.spacing.sm,
  width: '100%',
});

export const recordMetadataSection = style([
  section,
  {
    background: vars.color.section,
  },
]);

export const sectionHeader = style({
  color: vars.color.sectionHeader,
  fontSize: vars.fontSize.section,
  fontWeight: 700,
  lineHeight: vars.lineHeight.tight,
  display: 'flex',
  alignItems: 'center',
  minHeight: '2.75rem',
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
  borderLeft: `5px solid ${vars.color.primary}`,
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

export const drilldownInfo = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing.sm,
  flex: 1,
  minWidth: 0,
});

const repeatableCountPillBase = {
  padding: '2px 10px',
  borderRadius: '0.375rem',
  fontSize: '0.7rem',
  fontWeight: 600,
  color: '#fff',
  lineHeight: 1.4,
  flexShrink: 0,
  marginRight: vars.spacing.lg,
};

export const repeatableCountPill = style({
  ...repeatableCountPillBase,
});

export const repeatableCountPillEmpty = style({
  background: '#6b7280',
});

export const repeatableCountPillFilled = style({
  background: vars.color.primary,
});

export const drilldownActive = style({
  background: vars.color.section,
  border: `1px solid ${vars.color.sectionBorder}`,
  borderLeft: `5px solid ${vars.color.primary}`,
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
  padding: '4px 8px',
  cursor: 'pointer',
  fontSize: vars.fontSize.button,
  fontWeight: 600,
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

// Repeatable section styles
export const repeatableList = style({
  background: vars.color.section,
  border: `1px solid ${vars.color.sectionBorder}`,
  borderRadius: vars.borderRadius,
  padding: vars.spacing.md,
  marginBottom: vars.spacing.md,
  transition: 'transform 0.2s ease, opacity 0.2s ease',
});

export const repeatableListBlurred = style({
  opacity: 0.6,
});

export const repeatableListHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  gap: vars.spacing.sm,
  alignItems: 'center',
  marginBottom: vars.spacing.sm,
});

export const repeatableListHeaderText = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing.xs,
  minWidth: 0,
});

export const repeatableListTitle = style({
  margin: 0,
  fontSize: '1.1rem',
  fontWeight: 600,
  color: vars.color.sectionHeader,
});

export const repeatableListDescription = style({
  margin: 0,
  fontSize: vars.fontSize.base,
  color: vars.color.foreground,
  opacity: 0.75,
});

export const repeatableAddButton = style([
  formNameActionButton,
  {
    display: 'inline-flex',
    alignItems: 'center',
    gap: vars.spacing.xs,
    background: vars.color.buttonBg,
    color: vars.color.buttonFg,
    borderColor: vars.color.buttonBorder,
  },
]);

export const repeatableBackButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.spacing.xs,
  fontSize: vars.fontSize.base,
  color: vars.color.foreground,
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  padding: 0,
});

export const repeatableEntryList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing.sm,
});

export const repeatableEntryRow = style({
  display: 'flex',
  justifyContent: 'space-between',
  gap: vars.spacing.sm,
  alignItems: 'center',
  padding: vars.spacing.sm,
  borderRadius: vars.borderRadius,
  border: `1px solid ${vars.color.sectionBorder}`,
  background: vars.color.background,
});

export const repeatableEntryInfo = style({
  flex: 1,
  minWidth: 0,
});

export const repeatableEntryTitle = style({
  fontWeight: 600,
  fontSize: '0.95rem',
  color: vars.color.foreground,
  wordBreak: 'break-word',
});

export const repeatableEntryActions = style({
  display: 'flex',
  gap: vars.spacing.xs,
});

export const repeatableActionButton = style([formNameActionButton]);

export const repeatableDangerButton = style({
  background: 'transparent',
  color: vars.color.error,
  borderColor: vars.color.error,
  selectors: {
    '&:hover': {
      color: vars.color.primary,
      borderColor: vars.color.primary,
    },
  },
});

export const repeatableEmptyState = style({
  border: `1px dashed ${vars.color.sectionBorder}`,
  borderRadius: vars.borderRadius,
  padding: vars.spacing.lg,
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing.sm,
  color: vars.color.foreground,
  opacity: 0.8,
  fontSize: vars.fontSize.base,
});

export const repeatableModalOverlay = style({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.35)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '1.5vh 2vw',
  zIndex: 11000,
  fontFamily: vars.fontFamily.base,
});

export const repeatableModal = style({
  width: 'min(880px, 100%)',
  height: '97vh',
  maxHeight: '97vh',
  background: vars.color.background,
  color: vars.color.foreground,
  borderRadius: vars.borderRadius,
  border: `1px solid ${vars.color.border}`,
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
  display: 'flex',
  flexDirection: 'column',
  fontFamily: vars.fontFamily.base,
});

export const repeatableModalHeader = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 'none',
  width: '100%',
});

export const repeatableModalHeaderTopRow = style({
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

export const repeatableModalHeaderSlot = style({
  display: 'flex',
  alignItems: 'center',
  minHeight: '32px',
  gap: vars.spacing.sm,
});

export const repeatableModalHeaderSlotRight = style({
  justifyContent: 'flex-end',
});

export const repeatableModalTitle = style({
  flex: 1,
  textAlign: 'center',
  fontSize: '1.1rem',
  fontWeight: 600,
  color: vars.color.sectionHeader,
});

export const repeatableModalBody = style({
  padding: vars.spacing.md,
  overflowY: 'auto',
  flex: 1,
  minHeight: 0,
  maxHeight: 'calc(97vh - 120px)',
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing.md,
});

export const repeatableModalSummaryRow = style({
  width: '100%',
  display: 'flex',
});

export const repeatableModalSummaryCard = style({
  width: '100%',
  margin: 0,
});

export const repeatableModalContent = style({
  display: 'flex',
  gap: vars.spacing.md,
  flex: 1,
  minHeight: 0,
  width: '100%',
  alignItems: 'flex-start',
});

export const repeatableModalNavigation = style({
  width: '220px',
  flexShrink: 0,
  '@media': {
    '(max-width: 768px)': {
      display: 'none',
    },
  },
});

export const repeatableModalFormColumn = style({
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing.md,
});

export const repeatableModalSection = style({
  border: `1px solid ${vars.color.sectionBorder}`,
  borderRadius: vars.borderRadius,
  padding: vars.spacing.sm,
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing.sm,
});

export const repeatableModalSectionHighlighted = style({
  borderColor: vars.color.primary,
  boxShadow: `0 0 0 1px ${vars.color.primary}`,
});

export const repeatableModalSectionTitle = style({
  margin: 0,
  fontSize: '0.95rem',
  fontWeight: 600,
  color: vars.color.sectionHeader,
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
  zIndex: 12000,
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
  fontSize: vars.fontSize.base,
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

export const confirmDialogActions = style({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: vars.spacing.sm,
  marginTop: vars.spacing.md,
});

export const confirmSecondaryButton = style([
  button,
  {
    display: 'inline-flex',
    alignItems: 'center',
    gap: vars.spacing.md,
    background: vars.color.section,
    color: vars.color.foreground,
    borderColor: vars.color.border,
  },
]);

export const confirmPrimaryButton = style([
  button,
  {
    display: 'inline-flex',
    alignItems: 'center',
    gap: vars.spacing.md,
    minWidth: '120px',
  },
]);
