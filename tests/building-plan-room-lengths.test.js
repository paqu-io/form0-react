import { describe, expect, it } from 'vitest';
import {
  BuildingPlanCanvasController,
  createBuildingPlanSession,
  expandBuildingPlanSchema,
  writeBuildingPlanRecord,
} from 'form0-core';
import {
  ROOM_MIN_PIXELS,
  SIDE_OFFSET,
  roomLengths,
  roomTooSmall,
} from '../src/building-plan/room-lengths.js';

// Step 2, 2c (2026-11-23): a room's lengths from the sides core gives it (decision A): each side
// corner to corner inside the room (S9); the selected wall row's or opening's side with its chain,
// the whole side further in; hidden when the room is small on screen (S12).

/**
 * A 5 × 3.6 m room, its top wall split at 3 m with a door 1 m from the left, 0.9 m wide; with
 * `beam`, a wall beam over it from 0.8 to 2.2 m (D1c).
 */
function room({ beam = false } = {}) {
  const schema = {
    form: {
      name: 'B',
      elements: [
        {
          type: 'BuildingPlanSection',
          key: 'plan',
          data_name: 'plan',
          label: 'Plan',
          description: null,
          description_mode: null,
          visible: true,
          visible_conditions: null,
          read_only: false,
          read_only_conditions: null,
          node_overrides: null,
        },
      ],
    },
  };
  const meta = expandBuildingPlanSchema(schema).buildingPlanMeta[0];
  const session = createBuildingPlanSession({ derivedCommands: true });
  const floorId = session.apply({
    type: 'create_floor',
    values: {
      floor_name: { choice: [{ value: 'ground_floor', label: 'Ground floor' }], other: [] },
      floor_elevation: 0,
      floor_height: 3,
      floor_interior_wall_thickness: 0.2,
      floor_exterior_wall_thickness: 0.2,
    },
    defaults: { wall_height: 3 },
  }).created.id;
  session.apply({ type: 'create_room', floorId, rectangle: { x: 0, y: 0, width: 5, height: 3.6 } });
  const floor = () => session.getSnapshot().floors[0];
  const top = floor().walls.find((wall) =>
    wall.segments.every((s) => s.start.y < 0 && s.end.y < 0)
  );
  const door = session.apply({
    type: 'create_opening',
    floorId,
    wallId: top.id,
    kind: 'door',
    offset: top.segments[0].start.x < top.segments[0].end.x ? 1 : 3.1,
    width: 0.9,
    height: 2.1,
  });
  expect(door.status).toBe('applied');
  if (beam) {
    const forward = top.segments[0].start.x < top.segments[0].end.x;
    const created = session.apply({
      type: 'create_opening',
      floorId,
      wallId: top.id,
      kind: 'beam',
      offset: forward ? 0.8 : 2.8,
      length: 1.4,
      depth: 0.25,
      underside: 2.1,
    });
    expect(created.status).toBe('applied');
  }
  const face = floor().rooms[0].faces.find((entry) => entry.wallId === top.id);
  expect(session.apply({ type: 'split_face', floorId, faceId: face.id, offset: 3 }).status).toBe(
    'applied'
  );
  let record = writeBuildingPlanRecord({ meta, plan: session.getSnapshot() });
  const controller = new BuildingPlanCanvasController({
    meta,
    derivedCommands: true,
    readRecord: () => record,
    writeRecord: (next) => ((record = next), true),
  });
  controller.setGridSize?.(100);
  const snapshot = controller.getSnapshot();
  return { snapshot, room: snapshot.rooms[0] };
}

const lengthOf = (d) => Math.round(Math.hypot(d.to.x - d.from.x, d.to.y - d.from.y));
// Lengths along the top (y 0), left to right.
const topChain = (dims, offset) =>
  dims
    .filter((d) => d.from.y === 0 && d.to.y === 0 && d.offset === offset)
    .sort((a, b) => Math.min(a.from.x, a.to.x) - Math.min(b.from.x, b.to.x))
    .map(lengthOf);

describe('a room’s lengths (S9)', () => {
  it('shows each side corner to corner, inside the room, nothing selected', () => {
    const { room: r } = room();
    const { dimensions, reach } = roomLengths(r, { minLength: 0.5 });
    expect(dimensions.map(lengthOf).sort()).toEqual([360, 360, 500, 500]);
    expect(dimensions.every((d) => d.offset === SIDE_OFFSET && !d.changing)).toBe(true);
    // Into the room: the top side's normal points down.
    expect(dimensions.find((d) => d.from.y === 0 && d.to.y === 0).normal).toEqual({ x: 0, y: 1 });
    expect(reach).toBe(0);
  });

  it('adds the selected wall’s chain: its rows and openings, the whole side further in', () => {
    const { snapshot, room: r } = room();
    const left = snapshot.walls.find(
      (wall) => wall.roomId === r.id && wall.points.every((p) => p.y === 0 && p.x <= 300)
    );
    const { dimensions, reach } = roomLengths(r, { faceId: left.id, minLength: 0.5 });
    // Corner, door, gap to the split, the other row.
    expect(topChain(dimensions, SIDE_OFFSET)).toEqual([100, 90, 110, 200]);
    expect(topChain(dimensions, SIDE_OFFSET + 30)).toEqual([500]);
    // The other sides, one length each.
    expect(dimensions.length).toBe(4 + 1 + 3);
    expect(reach).toBe(SIDE_OFFSET + 30 + 9);
  });

  it('adds the selected door’s chain, from either face', () => {
    const { snapshot, room: r } = room();
    const door = snapshot.doors.find((entry) => entry.roomId === r.id);
    const { dimensions } = roomLengths(r, { openingId: door.subjectId, minLength: 0.5 });
    expect(topChain(dimensions, SIDE_OFFSET)).toEqual([100, 90, 110, 200]);
  });

  it('a selected wall beam’s chain: its rows and its own ends, not the openings’ (D1c)', () => {
    const { snapshot, room: r } = room({ beam: true });
    const beam = snapshot.wallBeams.find((entry) => entry.roomId === r.id);
    const { dimensions } = roomLengths(r, { beamId: beam.subjectId, minLength: 0.5 });
    // Corner to the beam, the beam, on to the split, the other row.
    expect(topChain(dimensions, SIDE_OFFSET)).toEqual([80, 140, 80, 200]);
    expect(topChain(dimensions, SIDE_OFFSET + 30)).toEqual([500]);
  });

  it('a selected wall alone on its side: one length, the name past it', () => {
    const { snapshot, room: r } = room();
    const right = snapshot.walls.find(
      (wall) => wall.roomId === r.id && wall.points.every((p) => p.x === 500)
    );
    const { dimensions, reach } = roomLengths(r, { faceId: right.id, minLength: 0.5 });
    expect(dimensions.length).toBe(4);
    expect(reach).toBe(SIDE_OFFSET + 9);
  });
});

describe('a room too small on screen (S12)', () => {
  it('hides its lengths under the smallest size, either way', () => {
    const { room: r } = room();
    // 500 × 360 canvas units.
    expect(roomTooSmall(r.vertices, ROOM_MIN_PIXELS / 360 + 0.001)).toBe(false);
    expect(roomTooSmall(r.vertices, ROOM_MIN_PIXELS / 360 - 0.001)).toBe(true);
    expect(roomTooSmall([], 1)).toBe(true);
  });
});
