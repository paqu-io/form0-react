// The canvas tool rail on the theme tokens. The class names stay as they were (globalStyle), so
// anything that selects them keeps working; names and shortcuts show in the plan tooltip.
import { globalStyle } from '@vanilla-extract/css';
import { vars } from '../../theme.css.js';
import { control, derived } from '../../theme-derived.css.js';

const disabledTool = `color-mix(in srgb, ${vars.color.foreground} 28%, ${vars.color.background})`;

globalStyle('.building-plan-toolbar-float', {
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
  gap: '2px',
  padding: '4px',
  background: vars.color.background,
  border: `1px solid ${vars.color.border}`,
  borderRadius: '12px',
});

globalStyle('.building-plan-toolbar-group', {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
});

globalStyle('.building-plan-toolbar-separator', {
  height: '1px',
  margin: '3px 4px',
  background: vars.color.border,
});

globalStyle('.building-plan-toolbar-item', {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
});

globalStyle('.building-plan-toolbar-btn', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '36px',
  height: '36px',
  padding: 0,
  border: 'none',
  borderRadius: '8px',
  background: 'transparent',
  color: vars.color.foreground,
  cursor: 'pointer',
  transition: 'background-color 0.12s ease, color 0.12s ease',
});

// A rail disabled with a reason (Front, A3): its buttons let the pointer through, so the rail's
// tooltip says why.
globalStyle('.building-plan-toolbar-float.is-hinted .building-plan-toolbar-btn:disabled', {
  pointerEvents: 'none',
});

globalStyle('.building-plan-toolbar-btn:hover:not(:disabled)', {
  background: derived.fillHover,
});

globalStyle('.building-plan-toolbar-btn:active:not(:disabled)', {
  background: derived.fillPress,
});

globalStyle('.building-plan-toolbar-btn.active', {
  background: vars.color.primary,
  color: vars.color.background,
});

globalStyle('.building-plan-toolbar-btn.active:hover:not(:disabled)', {
  background: derived.primaryHover,
  color: vars.color.background,
});

globalStyle('.building-plan-toolbar-btn:disabled', {
  color: disabledTool,
  cursor: 'not-allowed',
});

// A command waiting for a selection (3b): looks disabled, keeps its tooltip and says why.
globalStyle('.building-plan-toolbar-btn.is-unavailable', {
  color: disabledTool,
  cursor: 'default',
});

globalStyle('.building-plan-toolbar-btn:focus-visible', {
  outline: control.focusOutline,
  outlineOffset: '2px',
});

globalStyle('.building-plan-toolbar-btn svg', {
  width: '18px',
  height: '18px',
  strokeWidth: 1.75,
});
