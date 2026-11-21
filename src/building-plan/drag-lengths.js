/**
 * Which lengths a gesture shows (step 3, 3-L1): the ones it changes, in the room in scope, as
 * dimensions for `draw/dimensions.js` (canvas units). Pure geometry, no canvas.
 */

// A side's edges are one straight run when they turn by less than this (sine of the angle).
const COLLINEAR = 1e-3;
// An edge is the opening's side when it runs within this of the opening's direction (~1°).
const PARALLEL = 0.02;

/** @typedef {{ x: number, y: number }} Point */
/** @typedef {{ from: Point, to: Point, normal: Point, changing: boolean }} Dimension */

const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const dot = (a, b) => a.x * b.x + a.y * b.y;
const cross = (a, b) => a.x * b.y - a.y * b.x;
const unit = (v) => {
  const length = Math.hypot(v.x, v.y);
  return length ? { x: v.x / length, y: v.y / length } : null;
};

function inside(point, vertices) {
  let result = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i, i += 1) {
    const a = vertices[i];
    const b = vertices[j];
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    )
      result = !result;
  }
  return result;
}

/**
 * The straight run of a room's inside face that an opening sits on, corner to corner: the
 * polygon edge running with the opening and nearest to it, extended over edges in line with it
 * (where another room's wall meets this side, the room has a vertex but no corner).
 * @param {Point[]} vertices the room's inside polygon
 * @param {Point} start the opening's ends, on its wall
 * @param {Point} end
 * @param {number} reach how far the side may be from the opening (half a thick wall and more)
 * @returns {{ start: Point, end: Point, normal: Point } | null} `normal` points into the room
 */
export function insideRun(vertices, start, end, reach) {
  const count = vertices?.length || 0;
  const direction = unit(sub(end, start));
  if (count < 3 || !direction) return null;
  const middle = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  const edge = (index) => [vertices[index % count], vertices[(index + 1) % count]];
  let best = null;
  for (let index = 0; index < count; index += 1) {
    const [p, q] = edge(index);
    const along = unit(sub(q, p));
    if (!along || Math.abs(cross(along, direction)) > PARALLEL) continue;
    const length = dot(sub(q, p), along);
    const t = dot(sub(middle, p), along);
    const away = Math.abs(cross(along, sub(middle, p)));
    if (t < 0 || t > length || away > reach) continue;
    if (!best || away < best.away) best = { index, along, away };
  }
  if (!best) return null;
  const inLine = (index) => {
    const [p, q] = edge(index);
    const along = unit(sub(q, p));
    return (
      Boolean(along) && Math.abs(cross(along, best.along)) < COLLINEAR && dot(along, best.along) > 0
    );
  };
  let first = best.index;
  let last = best.index;
  for (let step = 1; step < count && inLine(first - 1 + count); step += 1)
    first = (first - 1 + count) % count;
  for (let step = 1; step < count && inLine(last + 1); step += 1) last = (last + 1) % count;
  const runStart = vertices[first];
  const runEnd = vertices[(last + 1) % count];
  // Into the room: test a point just off the side itself (the opening lies in the wall).
  let normal = { x: -best.along.y, y: best.along.x };
  const onSide = edge(best.index)[0];
  const t = dot(sub(middle, onSide), best.along);
  const foot = { x: onSide.x + best.along.x * t, y: onSide.y + best.along.y * t };
  if (!inside({ x: foot.x + normal.x * 0.5, y: foot.y + normal.y * 0.5 }, vertices))
    normal = { x: -normal.x, y: -normal.y };
  return { start: runStart, end: runEnd, normal };
}

/**
 * The chain along the inside face while a door or window is dragged: corner to opening, its
 * width, opening to corner. The values the drag changes are marked `changing`: dragging an end
 * changes the width and the side next to that end; sliding it, the two sides.
 * @param {Point[]} vertices the room's inside polygon
 * @param {{ start: Point, end: Point }} opening its ends, as drawn
 * @param {'start' | 'end' | 'move'} handle what is dragged
 * @param {{ reach: number, minLength: number }} limits in canvas units: how far the side may be
 *   from the opening, and the shortest length worth drawing
 * @returns {Dimension[]}
 */
export function openingChain(vertices, opening, handle, { reach, minLength }) {
  const run = insideRun(vertices, opening.start, opening.end, reach);
  if (!run) return [];
  const along = unit(sub(run.end, run.start));
  const length = dot(sub(run.end, run.start), along);
  const clamp = (value) => Math.min(Math.max(value, 0), length);
  const s = clamp(dot(sub(opening.start, run.start), along));
  const e = clamp(dot(sub(opening.end, run.start), along));
  const [low, high] = s <= e ? [s, e] : [e, s];
  const startIsLow = s <= e;
  const changing =
    {
      start: startIsLow ? ['before', 'width'] : ['width', 'after'],
      end: startIsLow ? ['width', 'after'] : ['before', 'width'],
      move: ['before', 'after'],
    }[handle] || [];
  const at = (value) => ({ x: run.start.x + along.x * value, y: run.start.y + along.y * value });
  return [
    ['before', 0, low],
    ['width', low, high],
    ['after', high, length],
  ]
    .filter(([, from, to]) => to - from >= minLength)
    .map(([id, from, to]) => ({
      from: at(from),
      to: at(to),
      normal: run.normal,
      changing: changing.includes(id),
    }));
}

/**
 * A room being drawn: its width along the top and its depth along the left, both changing.
 * @param {{ x: number, y: number, width: number, height: number }} rect normalised
 * @returns {Dimension[]}
 */
export function draftRoomLengths(rect) {
  if (!rect) return [];
  const { x, y, width, height } = rect;
  return [
    { from: { x, y }, to: { x: x + width, y }, normal: { x: 0, y: -1 }, changing: true },
    { from: { x, y }, to: { x, y: y + height }, normal: { x: -1, y: 0 }, changing: true },
  ].filter((entry) => Math.hypot(entry.to.x - entry.from.x, entry.to.y - entry.from.y) > 0);
}
