/**
 * Lengths while a room's contents are dragged (step 3, 3-L1, unit 3c-4), as dimensions for
 * `draw/dimensions.js` (canvas units): a free wall's runs when an end or a split point is
 * dragged, along the centreline; the clearances when a free wall or a column moves, one per axis,
 * the nearer side, to the room's inside face. Pure geometry, no canvas.
 */

/** @typedef {{ x: number, y: number }} Point */
/** @typedef {{ from: Point, to: Point, normal: Point, changing: boolean, offset?: number }} Dimension */

// A run's length stands this many screen pixels clear of the wall's face.
const RUN_GAP = 12;
// Lines this close to parallel (sine of the angle) don't meet.
const PARALLEL = 1e-9;

const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a, b, by = 1) => ({ x: a.x + b.x * by, y: a.y + b.y * by });
const dot = (a, b) => a.x * b.x + a.y * b.y;
const cross = (a, b) => a.x * b.y - a.y * b.x;
const unit = (v) => {
  const length = Math.hypot(v.x, v.y);
  return length ? { x: v.x / length, y: v.y / length } : null;
};
const perpendicular = (v) => ({ x: -v.y, y: v.x });

/**
 * How far a free wall's face stands from its centreline (half its width, canvas units), from the
 * canvas wall's centreline (`points`) and its row's face (`sidePoints`).
 * @param {{ points?: Point[], sidePoints?: Point[] }} wall
 * @returns {number}
 */
export function freeWallHalfWidth(wall) {
  const [a, b] = wall?.points || [];
  const face = wall?.sidePoints?.[0];
  const along = a && b ? unit(sub(b, a)) : null;
  return along && face ? Math.abs(cross(along, sub(face, a))) : 0;
}

/**
 * A free wall run's length along its centreline, end to end, beside the wall: clear of its face,
 * on the side `away` points to (else above it, or left of it when it runs up and down, as a room
 * being drawn shows its lengths).
 * @param {Point[]} points the run's centreline
 * @param {{ halfWidth: number, pixel: number, away?: Point | null, minLength: number }} options
 *   `pixel`: one screen pixel in canvas units
 * @returns {Dimension | null}
 */
export function runLength(points, { halfWidth, pixel, away = null, minLength }) {
  const from = points?.[0];
  const to = points?.at(-1);
  const along = from && to ? unit(sub(to, from)) : null;
  if (!along || Math.hypot(to.x - from.x, to.y - from.y) < minLength) return null;
  let normal = perpendicular(along);
  const flip = away
    ? dot(normal, away) < 0
    : normal.y > PARALLEL || (Math.abs(normal.y) <= PARALLEL && normal.x > 0);
  if (flip) normal = { x: -normal.x, y: -normal.y };
  return { from, to, normal, changing: true, offset: halfWidth / pixel + RUN_GAP };
}

/**
 * The runs a split point's drag changes: the two meeting there, each on the outside of the bend
 * (away from the other run's far end); a straight wall's on the default side.
 * @param {Point[][]} runs the runs' centrelines
 * @param {Point} point the split point, as dragged
 * @param {{ halfWidth: number, pixel: number, minLength: number }} options
 * @returns {Dimension[]}
 */
export function splitPointLengths(runs, point, options) {
  const farEnd = (run) => {
    const [first, last] = [run[0], run.at(-1)];
    return Math.hypot(first.x - point.x, first.y - point.y) >
      Math.hypot(last.x - point.x, last.y - point.y)
      ? first
      : last;
  };
  return runs
    .map((run, index) => {
      const other = runs[1 - index];
      if (!other || runs.length !== 2) return runLength(run, options);
      const along = unit(sub(run.at(-1), run[0]));
      const away = along && unit(sub(point, farEnd(other)));
      const bent = away && Math.abs(cross(along, away)) > 1e-3;
      return runLength(run, { ...options, away: bent ? away : null });
    })
    .filter(Boolean);
}

/**
 * Where a ray first meets the room's inside face, as its distance from `origin` (null: none). A
 * ray starting on the face, or just past it, meets it at 0.
 * @param {Point[]} vertices the room's inside polygon
 * @param {{ origin: Point, direction: Point }} ray `direction` a unit vector
 * @param {number} tolerance canvas units
 */
function hit(vertices, { origin, direction }, tolerance) {
  let nearest = null;
  for (let index = 0; index < vertices.length; index += 1) {
    const p = vertices[index];
    const edge = sub(vertices[(index + 1) % vertices.length], p);
    const denominator = cross(direction, edge);
    if (Math.abs(denominator) <= PARALLEL) continue;
    const toStart = sub(p, origin);
    const along = cross(toStart, edge) / denominator;
    const onEdge = cross(toStart, direction) / denominator;
    const slack = tolerance / Math.hypot(edge.x, edge.y);
    if (along < -tolerance || onEdge < -slack || onEdge > 1 + slack) continue;
    const distance = Math.max(0, along);
    if (nearest == null || distance < nearest) nearest = distance;
  }
  return nearest;
}

/**
 * One clearance per axis (3-L1): along each axis, from the element's side to the room's inside
 * face, the nearer of its two sides; none when that is under `minLength` (a side on a wall) or
 * no face lies that way. Drawn along the gap itself.
 * @param {Point[]} vertices the room's inside polygon
 * @param {Array<Array<{ origin: Point, direction: Point }>>} axes for each axis, a ray from each
 *   side of the element, outward
 * @param {{ minLength: number }} options canvas units
 * @returns {Dimension[]}
 */
export function clearances(vertices, axes, { minLength }) {
  if ((vertices?.length || 0) < 3) return [];
  const result = [];
  for (const rays of axes) {
    let nearest = null;
    for (const ray of rays) {
      const distance = hit(vertices, ray, minLength);
      if (distance != null && (!nearest || distance < nearest.distance))
        nearest = { ray, distance };
    }
    if (!nearest || nearest.distance < minLength) continue;
    const { origin, direction } = nearest.ray;
    result.push({
      from: origin,
      to: add(origin, direction, nearest.distance),
      normal: perpendicular(direction),
      changing: true,
      offset: 0,
    });
  }
  return result;
}

/**
 * A column moved: its clearances across x and y, from the middle of each side.
 * @param {Point[]} vertices the room's inside polygon
 * @param {{ x: number, y: number, width: number, height: number }} rect the column as drawn
 * @param {{ minLength: number }} options
 * @returns {Dimension[]}
 */
export function columnClearances(vertices, rect, options) {
  const middle = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  return clearances(
    vertices,
    [
      [
        { origin: { x: rect.x, y: middle.y }, direction: { x: -1, y: 0 } },
        { origin: { x: rect.x + rect.width, y: middle.y }, direction: { x: 1, y: 0 } },
      ],
      [
        { origin: { x: middle.x, y: rect.y }, direction: { x: 0, y: -1 } },
        { origin: { x: middle.x, y: rect.y + rect.height }, direction: { x: 0, y: 1 } },
      ],
    ],
    options
  );
}

/**
 * A free wall moved: its clearances along its own axes, across it from the middle of each face
 * and along it from each end (a slanted wall measured the way it runs).
 * @param {Point[]} vertices the room's inside polygon
 * @param {Point[]} points the wall's centreline, as drawn
 * @param {number} halfWidth
 * @param {{ minLength: number }} options
 * @returns {Dimension[]}
 */
export function freeWallClearances(vertices, points, halfWidth, options) {
  const start = points?.[0];
  const end = points?.at(-1);
  const along = start && end ? unit(sub(end, start)) : null;
  if (!along) return [];
  const across = perpendicular(along);
  const back = { x: -along.x, y: -along.y };
  const middle = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  return clearances(
    vertices,
    [
      [
        { origin: add(middle, across, halfWidth), direction: across },
        { origin: add(middle, across, -halfWidth), direction: { x: -across.x, y: -across.y } },
      ],
      [
        { origin: end, direction: along },
        { origin: start, direction: back },
      ],
    ],
    options
  );
}
