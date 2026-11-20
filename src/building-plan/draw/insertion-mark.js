import { currentMark, inPolygon } from '../insertion-mark.js';

/**
 * Draws the insertion mark (3b) in the accent: on a wall, a short tick across it, through its
 * thickness and a little into the room; in the room, a small cross. A fixed size on screen.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} plan the legacy canvas
 */
export function drawInsertionMark(ctx, plan) {
  const mark = currentMark(plan);
  if (!mark) return;
  const pixel = 1 / (plan.zoomLevel || 1);
  const { x, y } = mark.point;
  ctx.save();
  ctx.strokeStyle = plan.planTheme.accent;
  ctx.lineCap = 'round';
  ctx.lineWidth = 2 * pixel;
  ctx.beginPath();
  if (mark.kind === 'wall') {
    const wall = plan.walls.find((entry) => entry.id === mark.wallId);
    const points = plan.getRenderedWallPoints(wall) || [];
    const [a, b] = [points[0], points.at(-1)];
    const length = a && b ? Math.hypot(b.x - a.x, b.y - a.y) : 0;
    if (!length) {
      ctx.restore();
      return;
    }
    let normal = { x: -(b.y - a.y) / length, y: (b.x - a.x) / length };
    const thickness = (wall.thickness ?? 0.2) * plan.gridSize;
    // Turned towards the wall's body, which lies on one side of the line it is drawn along.
    const body = plan.wallFootprints?.find((entry) => entry.id === wall.physicalWallId);
    const probe = { x: x + (normal.x * thickness) / 2, y: y + (normal.y * thickness) / 2 };
    if (body && !body.polygons?.some((polygon) => inPolygon(probe, polygon)))
      normal = { x: -normal.x, y: -normal.y };
    const into = 6 * pixel;
    // A free wall comes by its centreline (4a-3): the tick crosses its body from side to side.
    const [back, through] = wall.sidePoints
      ? [thickness / 2 + into, thickness / 2 + into]
      : [into, thickness + 4 * pixel];
    ctx.moveTo(x - normal.x * back, y - normal.y * back);
    ctx.lineTo(x + normal.x * through, y + normal.y * through);
  } else {
    const arm = 6 * pixel;
    ctx.moveTo(x - arm, y);
    ctx.lineTo(x + arm, y);
    ctx.moveTo(x, y - arm);
    ctx.lineTo(x, y + arm);
  }
  ctx.stroke();
  ctx.restore();
}
