// Entry dialogs of a building plan (a floor, a room): wide, with the canvas between navigation
// and the entry form. Three columns while the dialog (96vw) is at least 1,060 px, i.e. from a
// 1,105 px viewport: navigation 200 px, the canvas taking the rest (at least 420 px), the form
// 380 to 560 px; the canvas fills its column and each column scrolls on its own. Below that the
// body scrolls as one column, canvas on top at a fixed height; under 768 px navigation hides, as
// in every entry dialog.
import { globalStyle, style } from '@vanilla-extract/css';
import { vars } from './theme.css.js';
import { derived } from './theme-derived.css.js';

const THREE_COLUMNS = '(min-width: 1105px)';
const NO_NAVIGATION = '(max-width: 768px)';

/** Up to 2,460 px: a 2,560 px screen is used too. */
export const dialog = style({ width: 'min(96vw, 2460px)' });

export const body = style({
  '@media': { [THREE_COLUMNS]: { overflowY: 'hidden' } },
});

export const content = style({
  display: 'grid',
  gridTemplateColumns: '200px minmax(0, 1fr)',
  gridTemplateAreas: '"nav canvas" "nav form"',
  gridTemplateRows: 'auto auto',
  alignItems: 'start',
  gap: '1rem',
  '@media': {
    [THREE_COLUMNS]: {
      gridTemplateColumns: '200px minmax(420px, 1fr) clamp(380px, 26%, 560px)',
      gridTemplateAreas: '"nav canvas form"',
      gridTemplateRows: 'minmax(0, 1fr)',
      alignItems: 'stretch',
      height: '100%',
      minHeight: 0,
      // Each column scrolls on its own: the navigation's sticky offset (sized for the page
      // header) doesn't apply inside it.
      vars: { '--form0-sticky-header-height': '0px', '--form0-sticky-top-offset': '0px' },
    },
    [NO_NAVIGATION]: {
      gridTemplateColumns: 'minmax(0, 1fr)',
      gridTemplateAreas: '"canvas" "form"',
    },
  },
});

export const canvasColumn = style({
  gridArea: 'canvas',
  minWidth: 0,
  '@media': { [THREE_COLUMNS]: { minHeight: 0 } },
});

// Navigation first, the form last (the form column keeps its own class).
globalStyle(`${content} > :first-child:not(${canvasColumn})`, {
  gridArea: 'nav',
  '@media': { [THREE_COLUMNS]: { minHeight: 0, overflowY: 'auto' } },
});

globalStyle(`${content} > :last-child`, {
  gridArea: 'form',
  minWidth: 0,
  '@media': { [THREE_COLUMNS]: { minHeight: 0, overflowY: 'auto', paddingRight: '2px' } },
});

// Three columns: the canvas fills its column instead of keeping its 16:9 box, and the rail
// scrolls if the column is shorter than it. Stacked: the canvas is 360 px high, the column as tall
// as its content (the rail included).
globalStyle(`${canvasColumn} .building-plan-canvas-container`, {
  height: '360px',
  aspectRatio: 'auto',
  maxHeight: 'none',
  '@media': { [THREE_COLUMNS]: { flex: '1 1 auto', height: 'auto', minHeight: '240px' } },
});

globalStyle(`${canvasColumn} .building-plan-canvas-host`, {
  '@media': {
    [THREE_COLUMNS]: {
      height: '100%',
      minHeight: 0,
      gridTemplateRows: 'minmax(0, 1fr)',
      alignItems: 'stretch',
    },
  },
});

globalStyle(`${canvasColumn} .building-plan-toolbar-float`, {
  alignSelf: 'start',
  '@media': { [THREE_COLUMNS]: { maxHeight: '100%', overflowY: 'auto' } },
});

globalStyle(`${canvasColumn} .building-plan-canvas-panel-wrapper`, {
  '@media': { [THREE_COLUMNS]: { minHeight: 0 } },
});

globalStyle(`${canvasColumn} .building-plan-canvas-panel`, {
  '@media': { [THREE_COLUMNS]: { flex: '1 1 auto', minHeight: 0 } },
});

// A list row whose element is selected on the plan (repeatable-list-parts, data-plan-marked).
globalStyle('[data-plan-marked="true"]', {
  background: derived.primarySoft,
  boxShadow: `inset 3px 0 0 ${vars.color.primary}`,
});
