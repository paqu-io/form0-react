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

  // What a room canvas, a Floor canvas and the plan page let you drag (controller.js).
  const ROOM = { canMove: true, canMoveStructural: true, canResize: true, canMoveRoom: false };
  const FLOOR = { canMove: true, canMoveStructural: false, canResize: false, canMoveRoom: true };
  const PAGE = {};

  it('moves corners, ends and four-way grips; grabs bodies and opening grips', () => {
    expect(hoverCursor({ type: 'corner' }, ROOM)).toBe('move');
    expect(hoverCursor({ type: 'wall-handle' }, ROOM)).toBe('move');
    expect(hoverCursor({ type: 'column' }, ROOM)).toBe('move');
    const down = { x: 0, y: 1 };
    expect(hoverCursor({ type: 'wall-grip', free: true, direction: down }, ROOM)).toBe('move');
    expect(hoverCursor({ type: 'wall-grip', direction: down }, ROOM)).toBe('ns-resize');
    const vertical = { x: 0, y: 50 };
    const start = { type: 'opening-handle', handle: 'start', direction: vertical };
    const centre = { type: 'opening-handle', handle: 'center', direction: vertical };
    expect(hoverCursor(start, ROOM)).toBe('ns-resize');
    expect(hoverCursor(centre, ROOM)).toBe('grab');
    expect(hoverCursor({ type: 'beam-handle', direction: { x: 1, y: -1 } }, ROOM)).toBe(
      'nesw-resize'
    );
    for (const type of ['opening', 'beam', 'wall', 'pin'])
      expect(hoverCursor({ type }, ROOM)).toBe('grab');
    expect(hoverCursor({ type: 'room' }, ROOM)).toBe('default'); // a click marks a place there
    expect(hoverCursor({ type: 'faded' }, ROOM)).toBe('default');
    expect(hoverCursor(null, ROOM)).toBe('default');
  });

  it('promises only what the canvas lets a press drag', () => {
    // A Floor canvas moves rooms and slides openings; walls, columns and beams stay.
    expect(hoverCursor({ type: 'room' }, FLOOR)).toBe('grab');
    expect(hoverCursor({ type: 'opening' }, FLOOR)).toBe('grab');
    for (const type of ['column', 'wall-handle', 'beam-handle'])
      expect(hoverCursor({ type }, FLOOR)).toBe('default');
    for (const type of ['beam', 'wall', 'pin'])
      expect(hoverCursor({ type }, FLOOR)).toBe('default');
    // An opening's end that can't resize it moves it, as its body does.
    const end = { type: 'opening-handle', handle: 'end', direction: { x: 1, y: 0 } };
    expect(hoverCursor(end, FLOOR)).toBe('grab');
    // The plan page drags nothing.
    for (const type of ['room', 'opening', 'wall', 'column'])
      expect(hoverCursor({ type }, PAGE)).toBe('default');
    expect(hoverCursor(end, PAGE)).toBe('default');
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
