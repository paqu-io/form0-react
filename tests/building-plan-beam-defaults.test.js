import { expect, it } from 'vitest';
import { BuildingPlanCanvas } from '../src/building-plan/legacy/building-plan-canvas.js';

it('a beam drawn on the canvas is created 15 cm wide and 30 cm deep', async () => {
  const created = [];
  const c = Object.assign(Object.create(BuildingPlanCanvas.prototype), {
    rooms: [],
    walls: [],
    columns: [],
    beams: [],
    doors: [],
    windows: [],
    mode: 'draw-beam',
    zoomLevel: 1,
    gridSize: 100,
    controller: {
      canEdit: () => true,
      createBeam: async (roomId, values) => {
        created.push({ roomId, values });
        return { id: 'new' };
      },
    },
    getCanvasPoint: (point) => point,
    render() {},
    updateButtonStates() {},
    updateCursor() {},
    beamDraft: {
      roomId: 'a',
      preview: {
        startU: 0,
        startV: 0.5,
        endU: 1,
        endV: 0.5,
        wallSegmentIndex: -1,
        startRatio: 0,
        endRatio: 1,
        startPoint: { x: 0, y: 500 },
        endPoint: { x: 1000, y: 500 },
      },
    },
  });
  await c.handleMouseUp({ x: 1000, y: 500 });
  expect(created).toHaveLength(1);
  expect(created[0].values).toMatchObject({ width: 0.15, height: 0.3 });
});
