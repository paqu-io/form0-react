// The plan page (a BuildingPlanSection): the canvas as the wide column, sized to the screen's
// height, and the Floors list beside it, as in the plan entry dialogs. Two columns while the
// section is at least 820 px wide (a container query: the page width depends on the host);
// stacked below.
import { globalStyle, style } from '@vanilla-extract/css';

export const frame = style({ containerType: 'inline-size' });

export const layout = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  gap: '16px',
  alignItems: 'start',
  '@container': {
    '(min-width: 820px)': {
      gridTemplateColumns: 'minmax(420px, 1fr) clamp(320px, 30%, 520px)',
    },
  },
});

// The canvas uses the screen's height (less the form header and margins) instead of 16:9.
globalStyle(`${layout} .building-plan-canvas-container`, {
  aspectRatio: 'auto',
  height: 'clamp(360px, calc(100vh - 300px), 1400px)',
  maxHeight: 'none',
});
