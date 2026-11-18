import { style, globalStyle } from '@vanilla-extract/css';
import { vars } from '../theme.css.js';

export const bubble = style({
  position: 'absolute',
  zIndex: 30,
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '6px 9px',
  borderRadius: '7px',
  background: vars.color.foreground,
  color: vars.color.background,
  fontSize: '12px',
  fontWeight: 600,
  lineHeight: 1.2,
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
  boxShadow: '0 6px 18px rgb(0 0 0 / 0.18)',
});

export const keys = style({ display: 'inline-flex', gap: '3px' });

globalStyle(`${keys} kbd`, {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  fontSize: '10.5px',
  lineHeight: 1,
  padding: '3px 5px',
  borderRadius: '5px',
  border: `1px solid color-mix(in srgb, ${vars.color.background} 40%, transparent)`,
  background: `color-mix(in srgb, ${vars.color.background} 14%, transparent)`,
});
