/**
 * Where each length's pill goes (step 2, S11): on its line's middle when it fits there; past one
 * end of its line, on the line extended, when it doesn't (a spot inside the room first, then one
 * past the chain's outer end); stepped further in with a short leader when both spots are taken.
 * Pills keep clear of each other only. Pure geometry: canvas units, sizes in screen pixels
 * (`pixel` is one screen pixel in canvas units).
 */

/** A pill's height, in screen pixels. */
export const PILL_HEIGHT = 18;
// A pill fits on its line with this much to spare.
const FIT_MARGIN = 8;
// How far past the line's end a pill starts.
const PAST_GAP = 6;
// How far beyond its line a stepped-out pill's middle stands.
const STEP_OUT = 22;
// Pills keep this far apart.
const CLEAR = 2;
// Lines that turn by less than this (sine) are in line.
const IN_LINE = 1e-3;

/** @typedef {{ x: number, y: number }} Point */
/**
 * @typedef {{ a: Point, b: Point, u: Point, n: Point, angle: number, width: number }} PillLine
 *   the length's line, standing off what it measures (`a` to `b`, `u` along it, `n` the way it
 *   stands off), the pill's angle and width in screen pixels
 */
/** @typedef {{ centre: Point, leader: [Point, Point] | null }} PillSpot */

const add = (p, v, k) => ({ x: p.x + v.x * k, y: p.y + v.y * k });
const gap = (p, q) => Math.hypot(q.x - p.x, q.y - p.y);

/**
 * @param {PillLine[]} lines
 * @param {{ pixel: number, isInside?: ((point: Point) => boolean) | null }} options `isInside`:
 *   whether a point is inside the room the lengths are about (no room: every spot is)
 * @returns {PillSpot[]} one per line, in order
 */
export function layoutPills(lines, { pixel, isInside = null }) {
  const placed = [];
  const spots = new Array(lines.length).fill(null);
  const boxOf = (centre, line) => {
    const cos = Math.abs(Math.cos(line.angle));
    const sin = Math.abs(Math.sin(line.angle));
    const hx = ((cos * line.width) / 2 + (sin * PILL_HEIGHT) / 2) * pixel;
    const hy = ((sin * line.width) / 2 + (cos * PILL_HEIGHT) / 2) * pixel;
    return { x0: centre.x - hx, x1: centre.x + hx, y0: centre.y - hy, y1: centre.y + hy };
  };
  const clear = (box) =>
    !placed.some(
      (other) =>
        other.x0 < box.x1 + CLEAR * pixel &&
        box.x0 < other.x1 + CLEAR * pixel &&
        other.y0 < box.y1 + CLEAR * pixel &&
        box.y0 < other.y1 + CLEAR * pixel
    );
  const place = (index, centre, leader = null) => {
    spots[index] = { centre, leader };
    placed.push(boxOf(centre, lines[index]));
  };
  // An end is the chain's inner end when another line in line with this one starts or ends there.
  const inner = (line, end) =>
    lines.some(
      (other) =>
        other !== line &&
        Math.abs(line.u.x * other.u.y - line.u.y * other.u.x) < IN_LINE &&
        (gap(other.a, end) < pixel / 2 || gap(other.b, end) < pixel / 2)
    );

  const fits = (line) => gap(line.a, line.b) / pixel >= line.width + FIT_MARGIN;
  lines.forEach((line, index) => {
    if (fits(line)) place(index, { x: (line.a.x + line.b.x) / 2, y: (line.a.y + line.b.y) / 2 });
  });
  lines.forEach((line, index) => {
    if (spots[index]) return;
    const reach = (PAST_GAP + line.width / 2) * pixel;
    const options = [
      { end: line.b, centre: add(line.b, line.u, reach) },
      { end: line.a, centre: add(line.a, line.u, -reach) },
    ].map((option, order) => ({
      ...option,
      order,
      inside: isInside ? isInside(option.centre) : true,
      outer: !inner(line, option.end),
    }));
    options.sort((p, q) => q.inside - p.inside || q.outer - p.outer || p.order - q.order);
    const spot = options.find((option) => clear(boxOf(option.centre, line)));
    if (spot) {
      place(index, spot.centre, [spot.end, spot.centre]);
      return;
    }
    const middle = { x: (line.a.x + line.b.x) / 2, y: (line.a.y + line.b.y) / 2 };
    place(index, add(middle, line.n, STEP_OUT * pixel), [
      middle,
      add(middle, line.n, (STEP_OUT - PILL_HEIGHT / 2) * pixel),
    ]);
  });
  return spots;
}
