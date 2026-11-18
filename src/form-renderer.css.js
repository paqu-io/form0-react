// src/form-renderer.css.js
import { style, globalStyle } from '@vanilla-extract/css';
import { vars } from './theme.css.js';
import { derived, control } from './theme-derived.css.js';

export const buildingPlanConflict = style({
  padding: vars.spacing.md,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.borderRadius,
  color: vars.color.foreground,
});

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
  minHeight: control.height,
  marginBottom: vars.spacing.md,
});

export const formNameTitle = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  fontSize: '1.125rem',
  fontWeight: 650,
  lineHeight: vars.lineHeight.tight,
  color: vars.color.foreground,
  paddingLeft: `var(--form-name-title-padding-left, calc(${vars.spacing.lg} * 2))`,
  paddingRight: `var(--form-name-title-padding-right, calc(${vars.spacing.lg} * 2))`,
  width: '100%',
  minWidth: 0,
});

export const formNameTitleText = style({
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

// Edit or View mode, shown beside the title. Uses the banner colours of the theme.
export const modePill = style({
  flexShrink: 0,
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.1875rem 0.5rem',
  borderRadius: '999px',
  fontSize: '0.6875rem',
  fontWeight: 600,
  lineHeight: 1.2,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
  selectors: {
    '&[data-mode="edit"]': {
      background: vars.color.bannerEditBg,
      color: vars.color.bannerEditFg,
      boxShadow: `inset 0 0 0 1px ${vars.color.bannerEditBorder}`,
    },
    '&[data-mode="readonly"]': {
      background: vars.color.bannerViewBg,
      color: vars.color.bannerViewFg,
      boxShadow: `inset 0 0 0 1px ${vars.color.bannerViewBorder}`,
    },
  },
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

export const formNameActionSlot = style({
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  display: 'flex',
  gap: '0.5rem',
});

export const formNameActionSlotLeft = style({
  left: 0,
});

export const formNameActionSlotRight = style({
  right: 0,
  justifyContent: 'flex-end',
});

export const formNameActionButton = style({
  boxSizing: 'border-box',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
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
    '&:hover:not(:disabled)': {
      background: derived.fillHover,
    },
    '&:active:not(:disabled)': {
      background: derived.fillPress,
    },
    '&:focus-visible': {
      outline: control.focusOutline,
      outlineOffset: '2px',
    },
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
    '&[data-variant="edit"]': {
      color: vars.color.primary,
      borderColor: vars.color.primary,
    },
    '&[data-variant="edit"]:hover:not(:disabled)': {
      background: derived.primarySoft,
    },
    '&:disabled': {
      opacity: 0.45,
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
  padding: '0.15rem 0.3rem',
  borderRadius: '0.3rem',
  // Tinted from the button's own text colour, so it reads on any button variant.
  background: 'color-mix(in srgb, currentColor 9%, transparent)',
  border: '1px solid color-mix(in srgb, currentColor 28%, transparent)',
  color: 'inherit',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  fontSize: '0.66rem',
  fontWeight: 500,
  lineHeight: 1,
  // Narrow screens have no room for the hints, and usually no keyboard.
  '@media': {
    '(max-width: 640px)': {
      display: 'none',
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

// The body is one tinted surface shared by the navigation panel and the form, so the panel
// never reads as a box that stops short of the form's height.
export const bodySection = style({
  display: 'flex',
  gap: '1rem',
  width: '100%',
  alignItems: 'flex-start',
  minHeight: 0,
  padding: '1rem',
  background: derived.fill,
  border: `1px solid ${vars.color.border}`,
  borderTop: 'none',
  borderRadius: `0 0 ${vars.borderRadius} ${vars.borderRadius}`,
});

export const formColumn = style({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  minWidth: 0,
});

// The record row: a divider inside the header card, the status bar, the title and the status
// name. It runs to the card's edges; in a host dialog and the repeatable entry dialog the header
// has no side padding, so the row keeps to the content width (see the overrides below).
export const recordSummary = style({
  display: 'flex',
  alignItems: 'stretch',
  gap: '0.625rem',
  minWidth: 0,
  marginTop: vars.spacing.md,
  marginLeft: `calc(-1 * ${vars.spacing.md})`,
  marginRight: `calc(-1 * ${vars.spacing.md})`,
  padding: `${vars.spacing.md} ${vars.spacing.md} 0`,
  borderTop: `1px solid ${vars.color.border}`,
});

const recordSummaryStatusBase = {
  width: '6px',
  minHeight: '1.375rem',
  borderRadius: '3px',
  flexShrink: 0,
  alignSelf: 'stretch',
};

export const recordSummaryStatus = style({
  ...recordSummaryStatusBase,
  background: derived.borderStrong,
});

export const recordSummaryStatusDisabled = style({
  ...recordSummaryStatusBase,
  background: `repeating-linear-gradient(45deg, ${derived.borderStrong} 0 3px, transparent 3px 6px)`,
});

export const recordSummaryContent = style({
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
});

export const recordSummaryTitle = style({
  fontSize: '1rem',
  fontWeight: 600,
  lineHeight: vars.lineHeight.tight,
  color: vars.color.foreground,
  overflowWrap: 'anywhere',
});

export const recordSummaryStatusText = style({
  alignSelf: 'center',
  flexShrink: 0,
  fontSize: '0.8125rem',
  lineHeight: vars.lineHeight.tight,
  color: derived.muted,
  whiteSpace: 'nowrap',
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
  // Less at the bottom: the last field's reserved error row already leaves space there.
  padding: '1rem 1rem 0.5rem',
  marginBottom: '1rem',
  width: '100%',
});

export const recordMetadataSection = style([
  section,
  {
    background: vars.color.section,
  },
]);

// A filled band across the top of the section card.
export const sectionHeader = style({
  color: vars.color.sectionHeader,
  fontSize: vars.fontSize.section,
  fontWeight: 700,
  lineHeight: vars.lineHeight.tight,
  display: 'flex',
  alignItems: 'center',
  margin: '-1rem -1rem 0.75rem',
  padding: '0.6875rem 1rem',
  background: derived.fillHover,
  borderBottom: `1px solid ${vars.color.sectionBorder}`,
  borderRadius: `calc(${vars.borderRadius} - 1px) calc(${vars.borderRadius} - 1px) 0 0`,
});

// The accent bar marks a section that opens separately (drill-down or repeatable). It is an
// inset bar, not a border, so it stays straight instead of bending with the corners.
export const drilldownInactive = style({
  position: 'relative',
  background: vars.color.background,
  border: `1px solid ${vars.color.sectionBorder}`,
  borderRadius: vars.borderRadius,
  padding: '0.5rem 0.5rem 0.5rem 1.25rem',
  marginBottom: '1rem',
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '0.75rem',
  width: '100%',
  selectors: {
    '&::before': {
      content: '""',
      position: 'absolute',
      left: '0.375rem',
      top: '0.5rem',
      bottom: '0.5rem',
      width: '4px',
      borderRadius: '2px',
      background: vars.color.primary,
    },
  },
});

export const drilldownInfo = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing.sm,
  flex: 1,
  minWidth: 0,
});

const repeatableCountPillBase = {
  padding: '0.125rem 0.5rem',
  borderRadius: '999px',
  fontSize: '0.7rem',
  fontWeight: 600,
  lineHeight: 1.4,
  flexShrink: 0,
  marginRight: '0.25rem',
};

export const repeatableCountPill = style({
  ...repeatableCountPillBase,
});

export const repeatableCountPillEmpty = style({
  background: derived.fillPress,
  color: derived.muted,
});

export const repeatableCountPillFilled = style({
  background: derived.primarySoft,
  color: vars.color.primary,
});

export const drilldownActive = style({
  background: vars.color.background,
  border: `1px solid ${vars.color.sectionBorder}`,
  borderRadius: vars.borderRadius,
  padding: '1rem',
  marginBottom: '1rem',
  width: '100%',
});

export const button = style({
  boxSizing: 'border-box',
  minHeight: control.height,
  padding: '0 0.875rem',
  background: vars.color.buttonBg,
  color: vars.color.buttonFg,
  border: `1px solid ${vars.color.buttonBorder}`,
  borderRadius: vars.borderRadius,
  cursor: 'pointer',
  fontFamily: vars.fontFamily.base,
  fontSize: vars.fontSize.button,
  fontWeight: 600,
  transition: 'background 0.12s ease, border-color 0.12s ease',
  selectors: {
    '&:hover': {
      background: vars.color.buttonHoverBg,
      color: vars.color.buttonHoverFg,
      border: `1px solid ${vars.color.buttonHoverBorder}`,
    },
    '&:active': {
      background: derived.buttonPress,
    },
    '&:focus-visible': {
      outline: control.focusOutline,
      outlineOffset: '2px',
    },
  },
});

export const drilldownLabel = style({
  flex: 1,
  fontSize: vars.fontSize.section,
  fontWeight: 700,
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
  background: vars.color.background,
  border: `1px solid ${vars.color.sectionBorder}`,
  borderRadius: vars.borderRadius,
  padding: '1rem',
  marginBottom: '1rem',
  transition: 'transform 0.2s ease, opacity 0.2s ease',
});

export const repeatableListBlurred = style({
  opacity: 0.6,
});

export const repeatableListHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  gap: '0.75rem',
  alignItems: 'center',
  marginBottom: '0.75rem',
});

export const repeatableListHeaderText = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing.xs,
  minWidth: 0,
});

export const repeatableListTitle = style({
  margin: 0,
  fontSize: vars.fontSize.section,
  fontWeight: 700,
  color: vars.color.sectionHeader,
});

export const repeatableListDescription = style({
  margin: 0,
  fontSize: '0.8125rem',
  color: derived.muted,
});

// A secondary action: the primary colour is kept for Submit and Save.
export const repeatableAddButton = style([
  formNameActionButton,
  {
    background: vars.color.buttonBg,
    color: vars.color.buttonFg,
    borderColor: vars.color.buttonBorder,
    selectors: {
      '&:hover:not(:disabled)': {
        background: vars.color.buttonHoverBg,
        color: vars.color.buttonHoverFg,
        borderColor: vars.color.buttonHoverBorder,
      },
      '&:active:not(:disabled)': {
        background: derived.buttonPress,
        borderColor: derived.buttonPress,
      },
    },
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

// Entries as one list: each row is a button that opens the entry, with a trash button at its
// end while editing (repeatable-list-parts.jsx).
export const repeatableEntryList = style({
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  border: `1px solid ${vars.color.sectionBorder}`,
  borderRadius: vars.borderRadius,
  overflow: 'hidden',
  background: vars.color.background,
});

export const repeatableEntryRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.25rem',
  paddingRight: '0.375rem',
  selectors: {
    '&:not(:last-child)': { borderBottom: `1px solid ${vars.color.sectionBorder}` },
  },
});

export const repeatableEntryOpen = style({
  appearance: 'none',
  flex: 1,
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  minHeight: '2.75rem',
  padding: '0.5rem 0.5rem 0.5rem 0.875rem',
  border: 'none',
  background: 'transparent',
  color: vars.color.foreground,
  fontFamily: vars.fontFamily.base,
  textAlign: 'left',
  cursor: 'pointer',
  selectors: {
    '&:hover': { background: derived.fillHover },
    '&:active': { background: derived.fillPress },
    '&:focus-visible': { outline: control.focusOutline, outlineOffset: '-2px' },
  },
});

export const repeatableEntryChevron = style({
  flexShrink: 0,
  color: derived.muted,
});

export const repeatableEntryRemove = style({
  appearance: 'none',
  flexShrink: 0,
  width: control.height,
  height: control.height,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 'none',
  borderRadius: vars.borderRadius,
  background: 'transparent',
  color: vars.color.error,
  cursor: 'pointer',
  selectors: {
    '&:hover': { background: derived.errorSoft },
    '&:active': { background: derived.errorSoft },
    '&:focus-visible': { outline: control.focusOutline, outlineOffset: '1px' },
  },
});

export const repeatableEntryInfo = style({
  flex: 1,
  minWidth: 0,
});

export const repeatableEntryTitle = style({
  flex: 1,
  minWidth: 0,
  fontWeight: 600,
  fontSize: '0.9375rem',
  color: vars.color.foreground,
  wordBreak: 'break-word',
});

export const repeatableEntryActions = style({
  display: 'flex',
  gap: '0.5rem',
});

export const repeatableActionButton = style([formNameActionButton]);

export const repeatableDangerButton = style({
  color: vars.color.error,
  selectors: {
    '&:hover:not(:disabled)': {
      background: derived.errorSoft,
      borderColor: vars.color.error,
    },
    '&:active:not(:disabled)': {
      background: derived.errorSoft,
    },
  },
});

// Grows with the list once entries exist; while empty it says what goes here and, while
// editing, offers the first Add.
export const repeatableEmptyState = style({
  border: `1.5px dashed ${derived.borderStrong}`,
  borderRadius: vars.borderRadius,
  background: vars.color.background,
  padding: '1.5rem 1rem',
  minHeight: '7rem',
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.375rem',
  color: vars.color.foreground,
  fontSize: vars.fontSize.base,
});

export const repeatableEmptyIcon = style({ color: derived.muted });

export const repeatableEmptyTitle = style({ fontWeight: 600 });

export const repeatableEmptyHint = style({ fontSize: '0.8125rem', color: derived.muted });

export const repeatableEmptyAdd = style([formNameActionButton, { marginTop: '0.375rem' }]);

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
  // Same text metrics as the form: the modal is portalled outside it and would otherwise
  // inherit the host page's.
  fontSize: vars.fontSize.base,
  lineHeight: vars.lineHeight.normal,
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
  marginBottom: vars.spacing.md,
  minHeight: control.height,
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
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  fontSize: '1.125rem',
  fontWeight: 650,
  color: vars.color.sectionHeader,
});

export const repeatableModalBody = style({
  padding: '1rem',
  background: derived.fill,
  borderRadius: `0 0 ${vars.borderRadius} ${vars.borderRadius}`,
  overflowY: 'auto',
  flex: 1,
  minHeight: 0,
  maxHeight: 'calc(97vh - 120px)',
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
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
  gap: '1rem',
  flex: 1,
  minHeight: 0,
  width: '100%',
  alignItems: 'flex-start',
});

export const repeatableModalNavigation = style({
  width: '200px',
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
  // Fields are direct children here, so this gap is added to every field's own spacing.
  gap: vars.spacing.md,
});

// The entry form beside the plan canvas (a floor, a room): a column like the one above.
export const repeatableModalPlanFormColumn = style({
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
});

export const repeatableModalSection = style({
  background: vars.color.background,
  border: `1px solid ${vars.color.sectionBorder}`,
  borderRadius: vars.borderRadius,
  padding: '1rem',
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing.sm,
});

export const repeatableModalSectionHighlighted = style({
  borderColor: vars.color.primary,
  boxShadow: `0 0 0 1px ${vars.color.primary}`,
});

export const repeatableModalSectionTitle = style({
  margin: '-1rem -1rem 0.5rem',
  padding: '0.6875rem 1rem',
  background: derived.fillHover,
  borderBottom: `1px solid ${vars.color.sectionBorder}`,
  borderRadius: `calc(${vars.borderRadius} - 1px) calc(${vars.borderRadius} - 1px) 0 0`,
  fontSize: vars.fontSize.section,
  fontWeight: 700,
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
  borderRadius: `calc(${vars.borderRadius} + 2px)`,
  border: `1px solid ${vars.color.border}`,
  boxShadow: '0 24px 60px rgba(0, 0, 0, 0.3)',
  maxWidth: '420px',
  width: '100%',
  padding: '1.25rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
  fontFamily: vars.fontFamily.base,
  fontSize: vars.fontSize.base,
  lineHeight: vars.lineHeight.normal,
});

export const alertTitle = style({
  margin: 0,
  // Clear of the close button.
  paddingRight: '2rem',
  fontSize: '1rem',
  fontWeight: 700,
  lineHeight: vars.lineHeight.tight,
});

export const alertMessage = style({
  margin: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
  fontSize: vars.fontSize.base,
  lineHeight: 1.5,
  color: derived.muted,
  whiteSpace: 'pre-wrap',
});

export const alertFooter = style({
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
  gap: '0.5rem',
  marginTop: '0.25rem',
});

export const alertOkButton = style([
  button,
  {
    minWidth: '96px',
  },
]);

export const alertCloseButton = style({
  position: 'absolute',
  top: '0.75rem',
  right: '0.75rem',
  width: '1.75rem',
  height: '1.75rem',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent',
  border: 'none',
  borderRadius: '0.375rem',
  color: derived.muted,
  fontSize: '1.25rem',
  lineHeight: 1,
  padding: 0,
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

export const confirmDialogActions = style({
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
  gap: '0.5rem',
  marginTop: '0.25rem',
});

export const confirmSecondaryButton = style([
  button,
  {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: vars.color.background,
    color: vars.color.foreground,
    borderColor: derived.borderStrong,
    selectors: {
      '&:hover': {
        background: derived.fillHover,
        color: vars.color.foreground,
        border: `1px solid ${derived.borderStrong}`,
      },
      '&:active': {
        background: derived.fillPress,
      },
    },
  },
]);

// Only used to confirm discarding changes, so it is styled as a destructive action.
export const confirmPrimaryButton = style([
  button,
  {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    minWidth: '120px',
    background: vars.color.error,
    borderColor: vars.color.error,
    color: vars.color.background,
    selectors: {
      '&:hover': {
        background: derived.errorHover,
        border: `1px solid ${derived.errorHover}`,
        color: vars.color.background,
      },
      '&:active': {
        background: derived.errorHover,
      },
    },
  },
]);

// The form must not depend on a host CSS reset: without this, every element that is 100% wide
// with padding or a border overflows its parent. Covers the form and the overlays it portals.
globalStyle(
  [form, formRendererRoot, repeatableModalOverlay, alertOverlay]
    .flatMap((root) => [root, `${root} *`, `${root} *::before`, `${root} *::after`])
    .join(', '),
  { boxSizing: 'border-box' }
);

// Inside the body the form sits on the shared tinted surface; on its own (simplified mode) it
// keeps its own background and border.
globalStyle(`${bodySection} ${form}`, {
  background: 'transparent',
  border: 'none',
  borderRadius: 0,
  padding: 0,
});

// Nested sections are flat: only the outermost section is a card. Deeper levels keep a
// full-width header band and lose no width.
globalStyle(`${section} ${section}`, {
  background: 'transparent',
  border: 'none',
  borderRadius: 0,
  padding: 0,
  margin: '0.75rem 0 0',
});
globalStyle(`${section} ${section} > ${sectionHeader}`, {
  margin: '0 -1rem 0.75rem',
  padding: '0.5rem 1rem',
  background: derived.fill,
  borderTop: `1px solid ${vars.color.sectionBorder}`,
  borderRadius: 0,
  fontSize: vars.fontSize.base,
});

// The parents of a nested section, shown before its own name ("Structure › Roof").
export const sectionHeaderPath = style({
  marginRight: '0.375rem',
  fontWeight: 500,
  color: derived.muted,
  whiteSpace: 'nowrap',
});

// Nested sections inside a repeatable entry are flat too.
globalStyle(`${repeatableModalSection} ${repeatableModalSection}`, {
  background: 'transparent',
  border: 'none',
  borderRadius: 0,
  padding: 0,
  marginTop: '0.5rem',
});
globalStyle(
  `${repeatableModalSection} ${repeatableModalSection} > ${repeatableModalSectionTitle}`,
  {
    margin: '0 -1rem 0.5rem',
    padding: '0.5rem 1rem',
    background: derived.fill,
    borderTop: `1px solid ${vars.color.sectionBorder}`,
    borderRadius: 0,
    fontSize: vars.fontSize.base,
  }
);

// An expanded drill-down section carries the accent bar in its header band.
globalStyle(`${drilldownActive} > ${sectionHeader}`, {
  position: 'relative',
  paddingLeft: '1.25rem',
});
globalStyle(`${drilldownActive} > ${sectionHeader}::before`, {
  content: '""',
  position: 'absolute',
  left: '0.375rem',
  top: '0.5rem',
  bottom: '0.5rem',
  width: '4px',
  borderRadius: '2px',
  background: vars.color.primary,
});

// In a host dialog (modal, spotlight) the form draws no frame of its own: the dialog is the
// container. Header and body sit flush; section cards keep their borders.
for (const presentation of ['modal', 'spotlight']) {
  const root = `${formRendererRoot}[data-form0-presentation="${presentation}"]`;
  globalStyle(`${root} ${headerSection}`, {
    border: 'none',
    borderRadius: 0,
    padding: `0 0 ${vars.spacing.md}`,
  });
  globalStyle(`${root} ${bodySection}`, {
    border: 'none',
    borderRadius: 0,
    background: 'transparent',
    padding: `${vars.spacing.md} 0 0`,
  });
  globalStyle(`${root} ${recordSummary}`, {
    marginLeft: 0,
    marginRight: 0,
    paddingLeft: 0,
    paddingRight: 0,
  });
}

// ALERT and MESSAGEBOX: the first button is the default action and keeps the primary style;
// the others are secondary. The schema's button order is kept.
globalStyle(`${alertFooter} > ${alertOkButton}:not(:first-child)`, {
  background: vars.color.background,
  color: vars.color.foreground,
  borderColor: derived.borderStrong,
});
globalStyle(`${alertFooter} > ${alertOkButton}:not(:first-child):hover`, {
  background: derived.fillHover,
  color: vars.color.foreground,
  borderColor: derived.borderStrong,
});
globalStyle(`${alertFooter} > ${alertOkButton}:not(:first-child):active`, {
  background: derived.fillPress,
});
// The MESSAGEBOX answer input.
globalStyle(`${alertMessage} > input`, {
  minHeight: control.height,
  padding: `0 ${control.paddingX}`,
  border: `1px solid ${derived.borderStrong}`,
  borderRadius: vars.borderRadius,
  background: vars.color.background,
  color: vars.color.foreground,
  fontFamily: vars.fontFamily.base,
  fontSize: vars.fontSize.base,
  outline: 'none',
});
globalStyle(`${alertMessage} > input:focus`, {
  borderColor: vars.color.primary,
  boxShadow: control.focusRing,
});

// While content passes under the sticky header it shows a bottom edge.
globalStyle(`${stickyHeader}[data-stuck="true"]`, {
  boxShadow: '0 10px 12px -12px rgba(0, 0, 0, 0.45)',
});
for (const presentation of ['modal', 'spotlight']) {
  const root = `${formRendererRoot}[data-form0-presentation="${presentation}"]`;
  globalStyle(`${root} ${stickyHeader}[data-stuck="true"] ${headerSection}`, {
    borderBottom: `1px solid ${vars.color.border}`,
  });
  // The host dialog's top padding sits above the header: cover it while stuck, so content
  // does not show through above the header.
  globalStyle(`${root} ${stickyHeader}[data-stuck="true"]::before`, {
    top: '-1.5rem',
    height: '1.5rem',
  });
}

// Inside a repeatable entry the fields are direct children of the column: no extra gap on top
// of each field's own spacing. Sections keep their distance through their margin.
globalStyle(`${repeatableModalFormColumn}`, { gap: 0 });
// Both entry columns: the dialog's, and the one beside the plan canvas (a floor's "System fields"
// section, then "Notes").
const entryColumns = `:is(${repeatableModalFormColumn}, ${repeatableModalPlanFormColumn})`;
globalStyle(`${entryColumns} > ${repeatableModalSection}`, { marginBottom: '1rem' });
// A field right after a card (a section, or Record Metadata) starts 1.5rem below it: with only
// the card's margin, or none beside the plan, it read as squeezed against the card (review of
// step 3, 2026-11-18). Card after card keeps 1rem.
globalStyle(
  `${entryColumns} > :is(${repeatableModalSection}, ${recordMetadataSection}) + :not(${repeatableModalSection})`,
  { marginTop: '0.5rem' }
);

// The repeatable row dialog is the container, as a host dialog is for the root form: padding
// around its content, and the header without a frame of its own.
globalStyle(`${repeatableModal}`, { padding: '1.25rem' });
globalStyle(`${repeatableModal} ${headerSection}`, {
  border: 'none',
  borderRadius: 0,
  padding: `0 0 ${vars.spacing.md}`,
});
globalStyle(`${repeatableModal} ${recordSummary}`, {
  marginLeft: 0,
  marginRight: 0,
  paddingLeft: 0,
  paddingRight: 0,
});
globalStyle(`${repeatableModal} ${repeatableModalBody}`, { borderRadius: vars.borderRadius });
