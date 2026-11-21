import { describe, expect, it } from 'vitest';
import { dragCursor, hoverCursor, resizeCursor } from '../src/building-plan/canvas-cursors.js';
import { quarterAlong } from '../src/building-plan/draw/handles.js';

describe('plan canvas cursors (step 3, 3-H3)', () => {
  it('picks the resize arrow nearest to the element’s direction', () => {
    expect(resizeCursor({ x: 1, y: 0 })).toBe('ew-resize');
    expect(resizeCursor({ x: -3, y: 0 })).toBe('ew-resize');
    expect(resizeCursor({ x: 0, y: 2 })).toBe('ns-resize'); // a door on a vertical wall
    expect(resizeCursor({ x: 1, y: 1 })).toBe('nwse-resize');
    // A beam rising at about 25° on screen (y down): nearest to 45°.
    expect(resizeCursor({ x: 144, y: -66 })).toBe('nesw-resize');
    expect(resizeCursor({ x: 1, y: 0.3 })).toBe('ew-resize');
    expect(resizeCursor(null)).toBe('ew-resize');
  });

  it('moves corners, ends and four-way grips; grabs bodies and opening grips', () => {
    expect(hoverCursor({ type: 'corner' })).toBe('move');
    expect(hoverCursor({ type: 'wall-handle' })).toBe('move');
    expect(hoverCursor({ type: 'column' })).toBe('move');
    expect(hoverCursor({ type: 'wall-grip', free: true, direction: { x: 0, y: 1 } })).toBe('move');
    expect(hoverCursor({ type: 'wall-grip', direction: { x: 0, y: 1 } })).toBe('ns-resize');
    const vertical = { x: 0, y: 50 };
    expect(hoverCursor({ type: 'opening-handle', handle: 'start', direction: vertical })).toBe(
      'ns-resize'
    );
    expect(hoverCursor({ type: 'opening-handle', handle: 'center', direction: vertical })).toBe(
      'grab'
    );
    expect(hoverCursor({ type: 'beam-handle', direction: { x: 1, y: -1 } })).toBe('nesw-resize');
    expect(hoverCursor({ type: 'opening' })).toBe('grab');
    expect(hoverCursor({ type: 'pin' })).toBe('grab');
    expect(hoverCursor({ type: 'faded' })).toBe('default');
    expect(hoverCursor(null)).toBe('grab');
  });

  it('keeps the cursor a gesture started on, a grab turned into grabbing', () => {
    expect(dragCursor('grab')).toBe('grabbing');
    expect(dragCursor(undefined)).toBe('grabbing');
    expect(dragCursor('move')).toBe('move');
    expect(dragCursor('ns-resize')).toBe('ns-resize');
  });
});

describe('a pinned wall’s badge (3-P)', () => {
  it('sits a quarter along the wall, across its segments', () => {
    expect(
      quarterAlong([
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ])
    ).toEqual({ x: 25, y: 0 });
    // A 20 + 80 wall: a quarter (25) falls 5 into the second segment.
    expect(
      quarterAlong([
        { x: 0, y: 0 },
        { x: 20, y: 0 },
        { x: 20, y: 80 },
      ])
    ).toEqual({ x: 20, y: 5 });
    expect(quarterAlong([{ x: 0, y: 0 }])).toBe(null);
  });
});
