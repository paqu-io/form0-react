import { describe, expect, it } from 'vitest';
import { drawGrid, gridLevels } from '../src/building-plan/draw/grid.js';
import { DEFAULT_PLAN_THEME, resolvePlanTheme } from '../src/building-plan/draw/plan-theme.js';
import { drawDoorSymbol, drawWindowSymbol } from '../src/building-plan/draw/symbols.js';

/** A 2D context that records what is drawn. */
function recordingContext() {
  const calls = { fillRect: 0, moveTo: 0, stroke: 0, strokeStyles: [] };
  return {
    calls,
    save() {},
    restore() {},
    beginPath() {},
    closePath() {},
    setLineDash() {},
    fillRect() {
      calls.fillRect += 1;
    },
    moveTo() {
      calls.moveTo += 1;
    },
    lineTo() {},
    stroke() {
      calls.stroke += 1;
      calls.strokeStyles.push(this.strokeStyle);
    },
  };
}

describe('grid', () => {
  it('keeps a cross on every metre and adds dots only when they are far enough apart', () => {
    // 20 px per metre (100% on web): crosses only.
    expect(gridLevels(20)).toEqual({ dotStep: null, crossAlpha: 1 });
    // 40 px per metre: dots every 50 cm (20 px).
    expect(gridLevels(40)).toEqual({ dotStep: 0.5, crossAlpha: 1 });
    // 150 px per metre: dots every 10 cm (15 px).
    expect(gridLevels(150)).toEqual({ dotStep: 0.1, crossAlpha: 1 });
    // 12 px per metre: no dots, crosses fading.
    const far = gridLevels(12);
    expect(far.dotStep).toBeNull();
    expect(far.crossAlpha).toBeGreaterThan(0);
    expect(far.crossAlpha).toBeLessThan(1);
    // 5 px per metre (25% on web): nothing.
    expect(gridLevels(5)).toEqual({ dotStep: null, crossAlpha: 0 });
  });

  it('draws one cross per metre and no dot where a cross is', () => {
    const ctx = recordingContext();
    // 200 x 120 canvas units at 40 units per metre and zoom 1: 5 x 3 metres.
    drawGrid(ctx, {
      bounds: { minX: 0, minY: 0, maxX: 200, maxY: 120 },
      metre: 40,
      zoom: 1,
      pixelRatio: 2,
      theme: DEFAULT_PLAN_THEME,
    });
    // Crosses: x from 0 to 240, y from 0 to 160 (one metre of margin): 7 x 5 crosses, 2 moves each.
    expect(ctx.calls.moveTo).toBe(7 * 5 * 2);
    // Crosses are one device pixel wide.
    expect(ctx.lineWidth).toBe(0.5);
    // Dots every 20 units (50 cm): 11 x 7 points, minus the 6 x 4 that carry a cross.
    expect(ctx.calls.fillRect).toBe(11 * 7 - 6 * 4);
  });
});

describe('symbols', () => {
  const geometry = {
    startPoint: { x: 0, y: 0 },
    endPoint: { x: 18, y: 0 },
    perpendicular: { x: 0, y: 1 },
  };

  it('cuts the wall for a door and draws it in the accent when selected', () => {
    const ctx = recordingContext();
    drawDoorSymbol(ctx, geometry, {
      thickness: 6,
      theme: DEFAULT_PLAN_THEME,
      selected: true,
      pixel: 1,
    });
    // The cut (room colour), two jambs and the threshold line.
    expect(ctx.calls.strokeStyles).toEqual([
      DEFAULT_PLAN_THEME.room,
      DEFAULT_PLAN_THEME.accent,
      DEFAULT_PLAN_THEME.accent,
      DEFAULT_PLAN_THEME.accent,
    ]);
  });

  it('draws a window as a cut with two glass lines and a middle line', () => {
    const ctx = recordingContext();
    drawWindowSymbol(ctx, geometry, { thickness: 6, theme: DEFAULT_PLAN_THEME, pixel: 1 });
    expect(ctx.calls.stroke).toBe(1 + 2 + 2 + 1);
    expect(ctx.calls.strokeStyles[0]).toBe(DEFAULT_PLAN_THEME.room);
  });
});

describe('theme', () => {
  it('falls back to the light defaults without an element', () => {
    expect(resolvePlanTheme(null, { wall: 'var(--x)' })).toBe(DEFAULT_PLAN_THEME);
  });
});
