// The status line over the canvas's bottom-left corner (it was the legacy canvas's own DOM row,
// `.building-plan-status`, until 1e). It sits past the card's padding, level with the zoom pill.
import { style } from '@vanilla-extract/css';
import { vars } from '../theme.css.js';
import { control, derived } from '../theme-derived.css.js';

export const line = style({
  position: 'absolute',
  left: '19px',
  bottom: '19px',
  zIndex: 1,
  boxSizing: 'border-box',
  maxWidth: 'calc(100% - 220px)',
  padding: '5px 9px',
  border: `1px solid ${vars.color.border}`,
  borderRadius: '8px',
  background: `color-mix(in srgb, ${vars.color.background} 88%, transparent)`,
  color: derived.muted,
  fontSize: '12px',
  lineHeight: 1.35,
  // A hint never takes the canvas's pointer; a refusal has buttons.
  pointerEvents: 'none',
  selectors: { '&[hidden]': { display: 'none' } },
});

export const refusal = style({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '4px 4px 4px 8px',
  borderColor: vars.color.error,
  background: `color-mix(in srgb, ${vars.color.error} 9%, ${vars.color.background})`,
  color: vars.color.error,
  fontWeight: 600,
  pointerEvents: 'auto',
});

export const icon = style({ flex: 'none' });

export const text = style({ minWidth: 0, overflowWrap: 'anywhere' });

// "View only" / "Read only" first in the line: a chip in the text colour, so it isn't lost in
// the muted hint.
export const access = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  marginRight: '7px',
  padding: '1px 6px',
  borderRadius: '5px',
  background: derived.fillHover,
  color: vars.color.foreground,
  fontWeight: 600,
  whiteSpace: 'nowrap',
  verticalAlign: 'bottom',
});

const button = {
  flex: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '22px',
  border: 'none',
  borderRadius: '6px',
  background: 'transparent',
  color: 'inherit',
  fontFamily: vars.fontFamily.base,
  cursor: 'pointer',
};

export const step = style({
  ...button,
  padding: '0 6px',
  boxShadow: 'inset 0 0 0 1px currentColor',
  fontSize: '11px',
  fontWeight: 600,
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
  selectors: {
    '&:hover': { background: `color-mix(in srgb, ${vars.color.error} 14%, transparent)` },
    '&:focus-visible': { outline: control.focusOutline, outlineOffset: '1px' },
  },
});

export const dismiss = style({
  ...button,
  width: '22px',
  padding: 0,
  selectors: {
    '&:hover': { background: `color-mix(in srgb, ${vars.color.error} 14%, transparent)` },
    '&:focus-visible': { outline: control.focusOutline, outlineOffset: '1px' },
  },
});

export const kbd = style({
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  fontSize: '10.5px',
  padding: '1px 4px',
  borderRadius: '4px',
  border: `1px solid ${derived.borderStrong}`,
  background: derived.fill,
  color: vars.color.foreground,
});
