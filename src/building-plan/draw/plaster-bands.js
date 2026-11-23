import { FULL, HALF, OUT } from './scope-levels.js';

/**
 * Plaster on the plan (step 2, 2b; S5, S6, D1): core's plaster surfaces (`plasterSurfaces` in the
 * canvas snapshot: every visible wall face, a room's side or outside, with its owner side's
 * plaster) drawn as sand bands on the open side, the real thickness to scale like the walls and at
 * least 2 screen pixels. Where two bands meet round an outside corner, the corner is filled.
 * Previews carry their own surfaces, so the bands follow a drag. Canvas units (`unitsPerMetre`,
 * `pixel`: one screen pixel).
 */

/** @typedef {{ x: number, y: number }} Point */
/**
 * @typedef {{ from: Point, to: Point, normal: Point, wallId: string, roomId: string | null,
 *   thickness: number | null }} PlasterSurface
 */

const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
const mul = (a, k) => ({ x: a.x * k, y: a.y * k });
const dot = (a, b) => a.x * b.x + a.y * b.y;
const len = (a) => Math.hypot(a.x, a.y);

/**
 * The bands of the plastered surfaces.
 * @param {PlasterSurface[]} surfaces
 * @param {{ unitsPerMetre: number, pixel: number }} scale
 * @returns {Array<{ surface: PlasterSurface, polygon: Point[] }>}
 */
export function plasterBands(surfaces, { unitsPerMetre, pixel }) {
  const width = (metres) => Math.max(2 * pixel, metres * unitsPerMetre);
  const shown = (surfaces || []).filter((surface) => surface.thickness > 0);
  const bands = shown.map((surface) => {
    const out = mul(surface.normal, width(surface.thickness));
    const { from, to } = surface;
    return { surface, polygon: [from, to, add(to, out), add(from, out)] };
  });
  // An outside corner: two surfaces meet end to end, each one's open side ahead of the other.
  const near = (a, b) => len(sub(a, b)) <= pixel;
  const ends = (surface) => [
    { at: surface.to, ahead: sub(surface.to, surface.from) },
    { at: surface.from, ahead: sub(surface.from, surface.to) },
  ];
  shown.forEach((a, i) =>
    shown.slice(i + 1).forEach((b) => {
      if (Math.abs(dot(a.normal, b.normal)) > 0.01) return;
      for (const ea of ends(a))
        for (const eb of ends(b)) {
          if (!near(ea.at, eb.at)) continue;
          if (dot(b.normal, ea.ahead) <= 0 || dot(a.normal, eb.ahead) <= 0) continue;
          const [wa, wb] = [width(a.thickness), width(b.thickness)];
          const c = ea.at;
          bands.push({
            surface: a,
            polygon: [
              c,
              add(c, mul(a.normal, wa)),
              add(add(c, mul(a.normal, wa)), mul(b.normal, wb)),
              add(c, mul(b.normal, wb)),
            ],
          });
        }
    })
  );
  return bands;
}

/**
 * Clips what follows to outside a room: a selection stroke drawn twice as wide then lies only on
 * the walls' side of the room's faces, and the plaster in the room shows (2b hand test).
 * @param {CanvasRenderingContext2D} ctx
 * @param {Point[]} vertices the room's outline
 */
export function clipOutside(ctx, vertices) {
  if (!vertices?.length) return;
  ctx.beginPath();
  ctx.rect(-1e7, -1e7, 2e7, 2e7);
  ctx.moveTo(vertices[0].x, vertices[0].y);
  for (const point of vertices.slice(1)) ctx.lineTo(point.x, point.y);
  ctx.closePath();
  ctx.clip('evenodd');
}

/**
 * Draws the bands, faded with their wall's scope level (1e, V1).
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{ surface: PlasterSurface, polygon: Point[] }>} bands
 * @param {{ theme: Record<string, string>, levelOf?: (surface: PlasterSurface) => string }} options
 */
export function drawPlasterBands(ctx, bands, { theme, levelOf }) {
  if (!bands?.length) return;
  ctx.save();
  for (const level of [OUT, HALF, FULL]) {
    const shown = bands.filter((band) => (levelOf?.(band.surface) ?? FULL) === level);
    if (!shown.length) continue;
    ctx.fillStyle = level === OUT ? theme.plasterFaint : theme.plaster;
    ctx.beginPath();
    for (const { polygon } of shown) {
      ctx.moveTo(polygon[0].x, polygon[0].y);
      for (const point of polygon.slice(1)) ctx.lineTo(point.x, point.y);
      ctx.closePath();
    }
    ctx.fill();
  }
  ctx.restore();
}
