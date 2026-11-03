import { expect, it } from 'vitest';
import { BuildingPlanCanvas } from '../src/building-plan/legacy/building-plan-canvas.js';

function canvas() {
  return Object.assign(Object.create(BuildingPlanCanvas.prototype), {
    rooms: [],
    selectedRoomId: 'b',
    zoomLevel: 1,
    gridSize: 20,
    walls: [
      {
        id: 'wa',
        roomId: 'a',
        isDimmed: true,
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
        ],
      },
      {
        id: 'wb',
        roomId: 'b',
        isDimmed: false,
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
        ],
        axisPoints: [
          { x: 0, y: 2 },
          { x: 100, y: 2 },
        ],
      },
    ],
  });
}
it('room-scoped selection excludes the other side of a coincident wall', () => {
  expect(canvas().findWallNearPoint({ x: 50, y: 0 }).wall.id).toBe('wb');
});
it('shared opening rendering uses one active projection and the physical axis', () => {
  const c = canvas();
  c.doors = [
    { id: 'da', subjectId: 'shared', roomId: 'a', wallId: 'wa', isDimmed: true },
    {
      id: 'db',
      subjectId: 'shared',
      roomId: 'b',
      wallId: 'wb',
      physical: { thickness: 0.2 },
      startRatio: 0.2,
      endRatio: 0.4,
    },
  ];
  c.windows = [];
  const drawn = [];
  c.drawOpening = (opening) => drawn.push(opening.id);
  c.drawOpenings();
  expect(drawn).toEqual(['db']);
  expect(c.getOpeningGeometry(c.doors[1]).startPoint).toEqual({ x: 20, y: 2 });
});
it('thick wall material remains selectable away from its thin facing line', () => {
  const c = canvas();
  c.walls[1].physicalWallId = 'physical';
  c.wallFootprints = [
    {
      id: 'physical',
      polygons: [
        [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 20 },
          { x: 0, y: 20 },
        ],
      ],
    },
  ];
  expect(c.findWallNearPoint({ x: 50, y: 10 }).wall.id).toBe('wb');
});
