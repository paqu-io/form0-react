// The zoom pill over the canvas (out, level, in, reset) on the theme tokens. Class names are kept.
import { globalStyle } from '@vanilla-extract/css';
import { vars } from '../theme.css.js';
import { control, derived } from '../theme-derived.css.js';

globalStyle('.building-plan-zoom-controls', {
  position: 'absolute',
  right: '10px',
  bottom: '10px',
  display: 'flex',
  alignItems: 'center',
  background: vars.color.background,
  border: `1px solid ${vars.color.border}`,
  borderRadius: '10px',
  boxShadow: '0 2px 8px rgb(0 0 0 / 0.08)',
  overflow: 'hidden',
  // Above the canvas only: the wrapper's stacking context keeps it below overlay dialogs.
  zIndex: 10,
});

globalStyle('.building-plan-zoom-btn', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '32px',
  height: '30px',
  padding: 0,
  border: 'none',
  background: 'transparent',
  color: vars.color.foreground,
  cursor: 'pointer',
});

globalStyle('.building-plan-zoom-btn:hover:not(:disabled)', { background: derived.fillHover });
globalStyle('.building-plan-zoom-btn:active:not(:disabled)', { background: derived.fillPress });

globalStyle('.building-plan-zoom-btn:disabled', {
  color: derived.disabledFg,
  cursor: 'not-allowed',
});

globalStyle('.building-plan-zoom-btn:focus-visible', {
  outline: control.focusOutline,
  outlineOffset: '-2px',
});

globalStyle('.building-plan-zoom-btn svg', { width: '16px', height: '16px' });

globalStyle('.building-plan-zoom-level', {
  minWidth: '44px',
  padding: '0 4px',
  textAlign: 'center',
  fontSize: '11.5px',
  fontWeight: 600,
  fontVariantNumeric: 'tabular-nums',
  color: derived.muted,
  cursor: 'default',
});

globalStyle('.building-plan-zoom-separator', {
  width: '1px',
  alignSelf: 'stretch',
  background: vars.color.border,
});
