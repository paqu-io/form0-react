import { describe, expect, it } from 'vitest';
import { entryFloorTabs } from '../src/building-plan/canvas-adapters.js';
import { drawFloorBelow } from '../src/building-plan/draw/floor-below.js';

// F2 (2026-11-22): the floor below drawn under the floor shown and named after the tabs; an
// entry shows only its own floor's tab.

const tabs = [
  { index: 0, label: 'Ground floor', active: false, id: 'ground' },
  { index: 1, label: 'Upper floor 1', active: true, id: 'upper' },
];

describe('the tabs a canvas shows', () => {
  it('in an entry only its own floor’s, on the plan page all', () => {
    expect(entryFloorTabs(tabs, 'upper').map((tab) => tab.id)).toEqual(['upper']);
    expect(entryFloorTabs(tabs, null)).toBe(tabs);
  });

  it('all when none is the entry’s floor, so the row is never empty by mistake', () => {
    expect(entryFloorTabs(tabs, 'elsewhere')).toBe(tabs);
  });
});

describe('the floor below', () => {
  it('is drawn as hairline outlines in its own colour: wall bands and columns, no fills', () => {
    const calls = [];
    const ctx = new Proxy(
      {},
      {
        get: (target, name) =>
          name in target ? target[name] : (...args) => calls.push([name, ...args]),
        set: (target, name, value) => {
          target[name] = value;
          calls.push([`set ${String(name)}`, value]);
          return true;
        },
      }
    );
    const square = (x) => [
      { x, y: 0 },
      { x: x + 10, y: 0 },
      { x: x + 10, y: 10 },
      { x, y: 10 },
    ];
    drawFloorBelow(
      ctx,
      { walls: [square(0)], columns: [square(50)] },
      { theme: { below: '#8b929d' }, pixel: 0.5 }
    );
    expect(calls).toContainEqual(['set strokeStyle', '#8b929d']);
    expect(calls).toContainEqual(['set lineWidth', 0.5]);
    expect(calls.filter(([name]) => name === 'moveTo')).toHaveLength(2);
    expect(calls.filter(([name]) => name === 'closePath')).toHaveLength(2);
    expect(calls.some(([name]) => name === 'fill')).toBe(false);
    calls.length = 0;
    drawFloorBelow(ctx, null, { theme: {}, pixel: 1 });
    expect(calls).toEqual([]);
  });
});
