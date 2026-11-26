// Layout and chrome of the plan canvas on the theme tokens: the panel, the legacy rows the canvas
// builds itself (floor tabs, Pin / unpin and its hint, split distance, Undo / Redo) and the canvas
// element. The class names are the ones the legacy canvas creates, so they stay (globalStyle).
import { globalStyle, keyframes } from '@vanilla-extract/css';
import { vars } from '../theme.css.js';
import { control, derived } from '../theme-derived.css.js';

globalStyle('.building-plan-layout', { display: 'flex', flexDirection: 'row', gap: '16px' });

globalStyle('.building-plan-canvas-host', {
  position: 'relative',
  display: 'grid',
  gridTemplateColumns: 'max-content minmax(0, 1fr)',
  alignItems: 'start',
  gap: '8px',
  flex: '1 1 50%',
  minWidth: 0,
  minHeight: '360px',
});

// A view-only canvas has no tool rail.
globalStyle('.building-plan-canvas-host--view', { gridTemplateColumns: 'minmax(0, 1fr)' });

globalStyle('.building-plan-canvas-host > .building-plan-toolbar', {
  gridColumn: '1 / -1',
  minWidth: 0,
  overflowWrap: 'anywhere',
});

// The card around the floor tab row and the canvas.
globalStyle('.building-plan-canvas-panel-wrapper', {
  position: 'relative',
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  boxSizing: 'border-box',
  background: vars.color.background,
  border: `1px solid ${vars.color.border}`,
  borderRadius: '12px',
  padding: '10px',
  // Isolate the stacking context so the zoom pill doesn't rise above overlay dialogs.
  isolation: 'isolate',
});

// The zoom pill sits inside the canvas's corner, past the card's padding.
globalStyle('.building-plan-canvas-panel-wrapper > .building-plan-zoom-controls', {
  right: '19px',
  bottom: '19px',
});

// The canvas's panel and, in Front (A2), the front view over it; the canvas stays, hidden, so the
// plan keeps its zoom and nothing moves. It sizes as the panel did before it: an entry's layout
// stretches both (plan-entry-layout.css.js).
globalStyle('.building-plan-canvas-stage', {
  position: 'relative',
  flex: '0 0 auto',
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
});
globalStyle('.building-plan-canvas-stage[data-view="front"] > .building-plan-canvas-panel', {
  visibility: 'hidden',
});

globalStyle('.building-plan-canvas-panel', {
  vars: { '--building-plan-canvas-aspect-ratio': '16 / 9' },
  flex: '0 0 auto',
  width: '100%',
  boxSizing: 'border-box',
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
});

globalStyle('.building-plan-detail-panel', {
  flex: '1 1 50%',
  maxHeight: '520px',
  overflowY: 'auto',
});

globalStyle('.building-plan-canvas-wrapper', {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
});

// Rows of controls the canvas adds above itself, and the host's Undo / Redo row.
globalStyle('.building-plan-toolbar', {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '8px',
  fontSize: '13px',
  lineHeight: 1.35,
  color: derived.muted,
});

const smallButton = {
  display: 'inline-flex',
  alignItems: 'center',
  height: '30px',
  padding: '0 10px',
  border: `1px solid ${derived.borderStrong}`,
  borderRadius: '8px',
  background: vars.color.background,
  color: vars.color.foreground,
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
};

globalStyle('.building-plan-toolbar-button, .building-plan-toolbar > button', smallButton);

globalStyle(
  '.building-plan-toolbar-button:hover:not(:disabled), .building-plan-toolbar > button:hover:not(:disabled)',
  { background: derived.fillHover }
);

globalStyle(
  '.building-plan-toolbar-button.active, .building-plan-toolbar-button[aria-pressed="true"]',
  { background: derived.primarySoft, borderColor: vars.color.primary, color: vars.color.primary }
);

globalStyle('.building-plan-toolbar-button:disabled, .building-plan-toolbar > button:disabled', {
  color: derived.disabledFg,
  borderColor: vars.color.border,
  cursor: 'not-allowed',
});

globalStyle(
  '.building-plan-toolbar-button:focus-visible, .building-plan-toolbar > button:focus-visible, .building-plan-floor-tab:focus-visible',
  { outline: control.focusOutline, outlineOffset: '2px' }
);

globalStyle('.building-plan-toolbar input', {
  height: '30px',
  padding: '0 8px',
  border: `1px solid ${derived.borderStrong}`,
  borderRadius: '8px',
  background: vars.color.background,
  color: vars.color.foreground,
  fontSize: '13px',
});

globalStyle('.building-plan-toolbar input:focus', {
  outline: 'none',
  borderColor: vars.color.primary,
  boxShadow: control.focusRing,
});

globalStyle('.building-plan-canvas-container', {
  position: 'relative',
  width: '100%',
  height: 'auto',
  aspectRatio: 'var(--building-plan-canvas-aspect-ratio, 16 / 9)',
  minHeight: '320px',
  maxHeight: '70vh',
  border: `1px solid ${vars.color.border}`,
  borderRadius: '8px',
  overflow: 'hidden',
});

globalStyle('.building-plan-canvas', {
  width: '100%',
  height: '100%',
  display: 'block',
  // The canvas clears to transparent; the theme's section tint shows through as its ground.
  background: vars.color.section,
  cursor: 'crosshair',
});

const focusFlash = keyframes({
  '0%': { backgroundColor: derived.primarySoft },
  '100%': { backgroundColor: 'transparent' },
});

globalStyle('.building-plan-focus', {
  animation: `${focusFlash} 1.5s ease`,
  outline: `2px solid ${vars.color.primary}`,
});

// Floor tabs: one segmented row.
globalStyle('.building-plan-floor-tabs', {
  display: 'inline-flex',
  alignSelf: 'flex-start',
  maxWidth: '100%',
  overflowX: 'auto',
  gap: '2px',
  padding: '3px',
  marginBottom: '8px',
  borderRadius: '10px',
  background: derived.fillHover,
});

globalStyle('.building-plan-floor-tab', {
  height: '28px',
  padding: '0 12px',
  border: 'none',
  borderRadius: '7px',
  background: 'transparent',
  color: derived.muted,
  fontSize: '13px',
  fontWeight: 600,
  whiteSpace: 'nowrap',
  cursor: 'pointer',
});

globalStyle('.building-plan-floor-tab:hover', { color: vars.color.foreground });

globalStyle('.building-plan-floor-tab.active', {
  background: vars.color.background,
  color: vars.color.foreground,
  boxShadow: '0 1px 2px rgb(0 0 0 / 0.16)',
});

globalStyle('.building-plan-floor-placeholder', {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  height: '28px',
  padding: '0 10px',
  color: derived.muted,
  fontSize: '13px',
  cursor: 'default',
});

globalStyle('.building-plan-floor-placeholder::before', { content: '"+"', fontWeight: 600 });

// The split distance while Split is the tool, floating over the canvas's top-left corner.
globalStyle('.building-plan-cut-bar', {
  position: 'absolute',
  left: '8px',
  top: '8px',
  zIndex: 2,
  alignItems: 'center',
  gap: '8px',
  padding: '6px 8px',
  border: `1px solid ${vars.color.border}`,
  borderRadius: '10px',
  background: vars.color.background,
  boxShadow: '0 4px 14px rgb(0 0 0 / 0.1)',
  color: derived.muted,
  fontSize: '12.5px',
});

globalStyle('.building-plan-cut-bar label', {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
});

globalStyle('.building-plan-cut-bar input', {
  width: '90px',
  height: '28px',
  padding: '0 8px',
  border: `1px solid ${derived.borderStrong}`,
  borderRadius: '7px',
  background: vars.color.background,
  color: vars.color.foreground,
  fontSize: '13px',
});

globalStyle('.building-plan-cut-bar input:focus', {
  outline: 'none',
  borderColor: vars.color.primary,
  boxShadow: control.focusRing,
});

globalStyle('.building-plan-cut-bar button', smallButton);
globalStyle('.building-plan-cut-bar button:disabled', {
  color: derived.disabledFg,
  borderColor: vars.color.border,
  cursor: 'not-allowed',
});
