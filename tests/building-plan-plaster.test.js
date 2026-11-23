import { describe, expect, it } from 'vitest';
import {
  BuildingPlanCanvasController,
  createBuildingPlanSession,
  expandBuildingPlanSchema,
  writeBuildingPlanRecord,
} from 'form0-core';
import { formatThickness, plasterLabel } from '../src/building-plan/plaster-values.js';
import { plasterBands } from '../src/building-plan/draw/plaster-bands.js';

// Step 2, 2b (2026-11-23): plaster on wall faces from core's plaster surfaces (D1), the real
// thickness to scale and at least 2 px, outside corners filled; the selected wall's name from its
// row's plaster (S5, S6).

const plastered = { choice: [{ value: 'plastered', label: 'Plastered' }], other: [] };

/** Two rooms side by side, room sides 15 mm and outside faces 20 mm by the floor's defaults. */
async function twoRooms() {
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
  const session = createBuildingPlanSession();
  const floorId = session.apply({
    type: 'create_floor',
    values: {
      floor_name: { choice: [{ value: 'ground_floor', label: 'Ground floor' }], other: [] },
      floor_elevation: 0,
      floor_height: 3,
      floor_interior_wall_thickness: 0.2,
      floor_exterior_wall_thickness: 0.2,
      floor_interior_wall_plaster: plastered,
      floor_interior_wall_plaster_thickness: 0.015,
      floor_exterior_wall_plaster: plastered,
      floor_exterior_wall_plaster_thickness: 0.02,
    },
    defaults: { wall_height: 3 },
  }).created.id;
  session.apply({ type: 'create_room', floorId, rectangle: { x: 0, y: 0, width: 5, height: 3.6 } });
  let record = writeBuildingPlanRecord({ meta, plan: session.getSnapshot() });
  const controller = new BuildingPlanCanvasController({
    meta,
    derivedCommands: true,
    readRecord: () => record,
    writeRecord: (next) => {
      record = next;
      return true;
    },
  });
  controller.setGridSize?.(100);
  const g = controller.gridSize;
  await controller.createRoom({ x: 5.2 * g, y: 0, width: 2.4 * g, height: 3.6 * g });
  return { meta, controller, snapshot: controller.getSnapshot(), g };
}

const inside = (point, polygon) => {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [a, b] = [polygon[i], polygon[j]];
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    )
      hit = !hit;
  }
  return hit;
};
const covered = (bands, point) => bands.some(({ polygon }) => inside(point, polygon));

describe('the name', () => {
  it('formats a thickness in mm or in, with the locale’s decimal sign', () => {
    expect(formatThickness(0.015, null)).toBe('15 mm');
    expect(formatThickness(0.0125, { locale: 'it', unitFor: () => 'mm' })).toBe('12,5 mm');
    expect(formatThickness(0.015, { locale: 'en', unitFor: () => 'in' })).toBe('0.59 in');
  });

  it('reads the row’s plaster and the face across, as worded at the hand test', () => {
    expect(plasterLabel({ inside: 0.035, outside: 0.02, outsideFace: true })).toBe(
      'plaster: 35 mm (int.) · 20 mm (ext.)'
    );
    expect(plasterLabel({ inside: 0.015, outside: null, outsideFace: false })).toBe(
      'plaster: 15 mm'
    );
    expect(plasterLabel({ inside: null, outside: 0.02, outsideFace: true })).toBe(
      'plaster: none (int.) · 20 mm (ext.)'
    );
    expect(plasterLabel({ inside: null, outside: null, outsideFace: true })).toBe('plaster: none');
    expect(
      plasterLabel({ inside: 0.01, outside: null, outsideFace: true }, { freeWall: true })
    ).toBe('plaster: 10 mm (this side) · none (other side)');
    expect(plasterLabel(null)).toBeNull();
  });

  it('each row carries its plaster in the snapshot, the face across only where it is its own', async () => {
    const t = await twoRooms();
    const shared = t.snapshot.walls.filter(
      (wall) =>
        t.snapshot.wallFootprints.find((entry) => entry.id === wall.physicalWallId).roomIds
          .length === 2
    );
    expect(shared).toHaveLength(2);
    for (const wall of t.snapshot.walls)
      expect(wall.plaster).toEqual(
        shared.includes(wall)
          ? { inside: 0.015, outside: null, outsideFace: false }
          : { inside: 0.015, outside: 0.02, outsideFace: true }
      );
    t.controller.dispose();
  });
});

describe('the bands', () => {
  const bandsOf = (t, pixel) =>
    plasterBands(t.snapshot.plasterSurfaces, { unitsPerMetre: t.g, pixel });

  it('lie on each room side, at least 2 px and to scale when zoomed in', async () => {
    const t = await twoRooms();
    // Zoomed out (a pixel is 2 units): 2 px, 4 units, though 15 mm is 1.5 units.
    const out = bandsOf(t, 2);
    expect(covered(out, { x: 2.5 * t.g, y: 3.5 })).toBe(true);
    expect(covered(out, { x: 2.5 * t.g, y: 4.5 })).toBe(false);
    // Zoomed in (a pixel is 0.1 unit): the real 1.5 units.
    const near = bandsOf(t, 0.1);
    expect(covered(near, { x: 2.5 * t.g, y: 1.4 })).toBe(true);
    expect(covered(near, { x: 2.5 * t.g, y: 1.6 })).toBe(false);
    // Both sides of the shared wall have their room's band; the wall itself has none.
    expect(covered(near, { x: 5 * t.g - 1, y: 1.8 * t.g })).toBe(true);
    expect(covered(near, { x: 5.2 * t.g + 1, y: 1.8 * t.g })).toBe(true);
    expect(covered(near, { x: 5.1 * t.g, y: 1.8 * t.g })).toBe(false);
    t.controller.dispose();
  });

  it('run round the outside, the corners filled', async () => {
    const t = await twoRooms();
    const bands = bandsOf(t, 0.1);
    const outer = -0.2 * t.g; // the outside face of the walls round (0, 0)
    expect(covered(bands, { x: 2 * t.g, y: outer - 1 })).toBe(true);
    expect(covered(bands, { x: outer - 1, y: 1 * t.g })).toBe(true);
    expect(covered(bands, { x: outer - 1, y: outer - 1 })).toBe(true);
    expect(covered(bands, { x: outer - 3, y: outer - 3 })).toBe(false);
    // Along the top, past the shared wall's end: one outside face.
    expect(covered(bands, { x: 5.1 * t.g, y: outer - 1 })).toBe(true);
    t.controller.dispose();
  });

  it('leave unplastered surfaces bare, and fill no inside corner', () => {
    const surface = (from, to, normal, thickness) => ({ from, to, normal, thickness, wallId: 'w' });
    const top = surface({ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 0, y: 1 }, 0.02);
    const right = surface({ x: 100, y: 0 }, { x: 100, y: 100 }, { x: -1, y: 0 }, 0.02);
    const bare = surface({ x: 0, y: 100 }, { x: 100, y: 100 }, { x: 0, y: -1 }, null);
    const bands = plasterBands([top, right, bare], { unitsPerMetre: 100, pixel: 0.1 });
    expect(bands).toHaveLength(2);
    expect(covered(bands, { x: 50, y: 99 })).toBe(false);
  });
});
