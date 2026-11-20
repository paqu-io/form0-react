import { describe, expect, it } from 'vitest';
import { groupPlanMessages, planIssueTargets } from '../src/building-plan/plan-messages.js';
import {
  drawRefusalMarks,
  refusalArrowStart,
  refusalGhost,
  refusalOutlines,
} from '../src/building-plan/draw/refusal-marks.js';
import { BuildingPlanCanvas } from '../src/building-plan/legacy/building-plan-canvas.js';

const square = (x, y, size) => [
  { x, y },
  { x: x + size, y },
  { x: x + size, y: y + size },
  { x, y: y + size },
];

describe('messages', () => {
  it('groups twin issues under one message, in the order they came', () => {
    const groups = groupPlanMessages([
      {
        code: 'a',
        message: 'Two openings overlap on this wall.',
        subject: { type: 'door', id: 'd1' },
      },
      { code: 'b', message: 'The proposed rooms overlap.' },
      {
        code: 'a',
        message: 'Two openings overlap on this wall.',
        subject: { type: 'door', id: 'd2' },
      },
      { code: 'empty' },
    ]);
    expect(groups.map((group) => group.message)).toEqual([
      'Two openings overlap on this wall.',
      'The proposed rooms overlap.',
      'empty',
    ]);
    expect(groups[0].issues).toHaveLength(2);
    expect(groupPlanMessages(null)).toEqual([]);
  });

  it('names the elements in the way: the subject, roomIds and openingIds', () => {
    const targets = planIssueTargets([
      { subject: { type: 'room', id: 'r1' }, roomIds: ['r1', 'r2', null] },
      { subject: { type: 'room_face', id: 'f1' } },
      { subject: { type: 'wall', id: 'w1' } },
      { subject: { type: 'window', id: 'o1' }, openingIds: ['o2'] },
      { subject: { type: 'editing_cut', id: 'c1' } },
      { subject: { type: 'floor', id: 'fl' } },
      { subject: null },
    ]);
    expect([...targets.rooms]).toEqual(['r1', 'r2']);
    expect([...targets.faces]).toEqual(['f1']);
    expect([...targets.walls]).toEqual(['w1']);
    expect([...targets.openings]).toEqual(['o1', 'o2']);
    expect(targets.columns.size + targets.beams.size).toBe(0);
  });

  it('names the columns a column runs into (4a-1): its subject, columnIds and openingIds', () => {
    const targets = planIssueTargets([
      { subject: { type: 'columns', id: 'c2' }, columnIds: ['c1'] },
      { subject: { type: 'columns', id: 'c3' }, openingIds: ['d1'] },
    ]);
    expect([...targets.columns]).toEqual(['c2', 'c1', 'c3']);
    expect([...targets.openings]).toEqual(['d1']);
  });
});

describe('ghost', () => {
  it('moves a room by its refused rectangle, with an arrow from where it was', () => {
    const ghost = refusalGhost({
      dragState: { type: 'move', roomId: 'r', moved: true },
      rooms: [{ id: 'r', previewRect: { x: 50, y: 0, width: 100, height: 100 } }],
      gestureRooms: new Map([
        ['r', { rect: { x: 0, y: 0, width: 100, height: 100 }, vertices: square(0, 0, 100) }],
      ]),
    });
    expect(ghost.closed).toBe(true);
    expect(ghost.points[0]).toEqual({ x: 50, y: 0 });
    expect(ghost.from).toEqual({ x: 50, y: 50 });
    expect(ghost.to).toEqual({ x: 100, y: 50 });
  });

  it('draws a dragged corner between its two neighbours', () => {
    const ghost = refusalGhost({
      cornerDragState: {
        roomId: 'r',
        moved: true,
        point: { x: 100, y: 0 },
        previewPoint: { x: 140, y: -20 },
      },
      gestureRooms: new Map([['r', { vertices: square(0, 0, 100) }]]),
    });
    expect(ghost).toMatchObject({
      closed: false,
      points: [
        { x: 0, y: 0 },
        { x: 140, y: -20 },
        { x: 100, y: 100 },
      ],
      from: { x: 100, y: 0 },
      to: { x: 140, y: -20 },
    });
  });

  it('draws a dragged wall where the pointer put it', () => {
    const ghost = refusalGhost({
      wallDragState: {
        moved: true,
        originalPoints: [
          { x: 0, y: 0 },
          { x: 0, y: 100 },
        ],
        previewPoints: [
          { x: 60, y: 0 },
          { x: 60, y: 100 },
        ],
      },
    });
    expect(ghost.points).toEqual([
      { x: 60, y: 0 },
      { x: 60, y: 100 },
    ]);
    expect(ghost.from).toEqual({ x: 0, y: 50 });
    expect(ghost.to).toEqual({ x: 60, y: 50 });
  });

  it('draws a dragged opening as a box across its wall', () => {
    const opening = { physical: { thickness: 0.2 } };
    const ghost = refusalGhost({
      gridSize: 100,
      openingDragState: {
        moved: true,
        type: 'window',
        openingId: 'o',
        preview: { startRatio: 0.5 },
      },
      getOpeningById: () => opening,
      getOpeningGeometry: () => ({ startPoint: { x: 50, y: 0 }, endPoint: { x: 150, y: 0 } }),
    });
    expect(ghost.closed).toBe(true);
    expect(ghost.points.map((point) => Math.abs(point.y))).toEqual([10, 10, 10, 10]);
  });

  it('has none when nothing is dragged, or for columns and beams', () => {
    expect(refusalGhost({})).toBeNull();
    expect(refusalGhost({ columnDragState: { moved: true } })).toBeNull();
  });
});

describe('outlines', () => {
  const plan = {
    zoomLevel: 1,
    rooms: [{ id: 'r1', vertices: square(0, 0, 100) }],
    walls: [{ id: 'f1', physicalWallId: 'w1', points: [] }],
    wallFootprints: [{ id: 'w1', polygons: [square(100, 0, 10)] }],
    windows: [
      { id: 'f1:o1', subjectId: 'o1', physical: { polygon: square(20, -5, 10) } },
      { id: 'f2:o1', subjectId: 'o1', physical: { polygon: square(20, -5, 10) } },
    ],
  };

  it('outlines a room, a face by its physical wall, and an opening once', () => {
    const shapes = refusalOutlines(plan, [
      { subject: { type: 'room', id: 'r1' } },
      { subject: { type: 'room_face', id: 'f1' } },
      { subject: { type: 'window', id: 'o1' } },
    ]);
    expect(shapes).toHaveLength(3);
    expect(shapes[1].points).toEqual(square(100, 0, 10));
    // The opening's box clears it by 4 screen pixels.
    expect(shapes[2].points[0].x).toBeLessThan(20);
  });

  it('outlines nothing for an issue that names nothing drawn', () => {
    expect(refusalOutlines(plan, [{ subject: { type: 'floor', id: 'x' } }])).toEqual([]);
  });

  it('draws the outline solid and the ghost dashed, in the colour given', () => {
    const dashes = [];
    const strokes = [];
    const ctx = new Proxy(
      {},
      {
        get: (target, name) =>
          name in target
            ? target[name]
            : name === 'setLineDash'
              ? (dash) => dashes.push(dash.length)
              : name === 'stroke'
                ? () => strokes.push(target.strokeStyle)
                : () => {},
        set: (target, name, value) => ((target[name] = value), true),
      }
    );
    drawRefusalMarks(ctx, {
      ghost: { points: square(0, 0, 10), closed: true, from: { x: 0, y: 0 }, to: { x: 80, y: 0 } },
      outlines: [{ points: square(50, 50, 10), closed: true }],
      color: 'red',
      zoom: 2,
    });
    expect(strokes.length).toBeGreaterThanOrEqual(3);
    expect(new Set(strokes)).toEqual(new Set(['red']));
    expect(dashes).toContain(2);
  });
});

describe('canvas', () => {
  /** A canvas without DOM: only what the messages use. */
  function canvas() {
    const reports = [];
    let renders = 0;
    const c = Object.assign(Object.create(BuildingPlanCanvas.prototype), {
      messages: [],
      messageIndex: 0,
      gestureGhost: null,
      messageGhost: null,
      onMessages: (report) => reports.push(report),
      render: () => (renders += 1),
    });
    return { c, reports, renders: () => renders };
  }
  const refusal = (message, code = 'x') => ({ code, message, subject: null });

  it('keeps the gesture ghost with a refusal and drops both together', () => {
    const { c, reports } = canvas();
    c.gestureGhost = { points: square(0, 0, 10), closed: true };
    c.receiveIssues([refusal('A'), refusal('A'), refusal('B', 'y')]);
    expect(reports.at(-1)).toEqual({ messages: ['A', 'B'], index: 0, codes: ['x'] });
    expect(c.messageGhost).toBe(c.gestureGhost);
    c.gestureGhost = null;
    c.dismissMessages();
    expect(reports.at(-1).messages).toEqual([]);
    expect(c.messageGhost).toBeNull();
  });

  it('reports again only when the messages change, and keeps the one shown', () => {
    const { c, reports, renders } = canvas();
    c.receiveIssues([refusal('A'), refusal('B')]);
    c.showMessage(1);
    c.receiveIssues([refusal('A'), refusal('B')]);
    expect(reports).toHaveLength(2);
    expect(c.messageIndex).toBe(1);
    c.showMessage(2);
    expect(c.messageIndex).toBe(0);
    // Clearing nothing draws nothing.
    c.dismissMessages();
    const before = renders();
    c.receiveIssues([]);
    expect(renders()).toBe(before);
  });

  it('shows a refusal that came without a gesture with no ghost', () => {
    const { c } = canvas();
    c.receiveIssues([refusal('Undo refused.')]);
    expect(c.messageGhost).toBeNull();
  });
});

describe('arrow', () => {
  const ghost = {
    points: square(200, 0, 100),
    closed: true,
    from: { x: 50, y: 50 },
    to: { x: 250, y: 50 },
    anchor: { kind: 'room', id: 'r' },
  };

  it('starts where the room is shown now: where it stopped, then where it went back', () => {
    const stopped = { rooms: [{ id: 'r', rect: { x: 80, y: 0, width: 100, height: 100 } }] };
    expect(refusalArrowStart(stopped, ghost)).toEqual({ x: 130, y: 50 });
    const back = { rooms: [{ id: 'r', rect: { x: 0, y: 0, width: 100, height: 100 } }] };
    expect(refusalArrowStart(back, ghost)).toEqual({ x: 50, y: 50 });
  });

  it('starts at the corner and the wall as they are shown now', () => {
    const plan = {
      rooms: [{ id: 'r', vertices: square(0, 0, 120) }],
      walls: [
        {
          id: 'f2',
          physicalWallId: 'w',
          roomId: 'r',
          points: [
            { x: 30, y: 0 },
            { x: 30, y: 100 },
          ],
        },
      ],
    };
    expect(refusalArrowStart(plan, { anchor: { kind: 'corner', roomId: 'r', index: 1 } })).toEqual({
      x: 120,
      y: 0,
    });
    // A preview can give the dragged face a new id: the same wall of the same room is used.
    expect(
      refusalArrowStart(plan, {
        anchor: { kind: 'wall', id: 'f1', physicalWallId: 'w', roomId: 'r' },
      })
    ).toEqual({ x: 30, y: 50 });
  });

  it('falls back to where the drag began when the element is gone', () => {
    expect(refusalArrowStart({ rooms: [] }, ghost)).toEqual({ x: 50, y: 50 });
  });

  it('gives a dragged opening an arrow along its wall', () => {
    const opening = { physical: { thickness: 0.2 } };
    const ghostOf = refusalGhost({
      gridSize: 100,
      openingDragState: { moved: true, type: 'door', openingId: 'o', preview: { startRatio: 0.5 } },
      getOpeningById: () => opening,
      getOpeningGeometry: (_opening, overrides) =>
        overrides
          ? {
              startPoint: { x: 50, y: 0 },
              endPoint: { x: 150, y: 0 },
              centerPoint: { x: 100, y: 0 },
            }
          : { startPoint: { x: 0, y: 0 }, endPoint: { x: 40, y: 0 }, centerPoint: { x: 20, y: 0 } },
    });
    expect(ghostOf.from).toEqual({ x: 20, y: 0 });
    expect(ghostOf.to).toEqual({ x: 100, y: 0 });
    expect(ghostOf.anchor).toEqual({ kind: 'opening', type: 'door', id: 'o' });
  });
});
