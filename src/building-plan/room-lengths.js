import { PILL_HEIGHT } from './draw/dimension-layout.js';

/**
 * A room's lengths (step 2, 2c: S7 to S12), from the sides core gives each room in the canvas
 * snapshot (`sides`: corner to corner along the bare wall face, with the rows and openings on
 * them). Each side is one length inside the room (S9); the selected wall's side, or the side of
 * the selected door or window, adds its chain (each row's stretch, each opening, the gaps
 * between) and the whole side steps further in. Pure geometry: canvas units, offsets in screen
 * pixels.
 */

/** How far a side's length stands into the room, as a drag's lengths do (so S10 keeps them in place). */
export const SIDE_OFFSET = 26;
// How much further in the whole side stands when its chain shows.
const WHOLE_STEP = 30;
/** A room narrower than this on screen, either way, shows no lengths (S12). */
export const ROOM_MIN_PIXELS = 100;

/** @typedef {{ x: number, y: number }} Point */
/**
 * @typedef {{ start: Point, end: Point, normal: Point,
 *   pieces: Array<{ from: Point, to: Point, faceId: string | null }>,
 *   openings: Array<{ subjectId: string, from: Point, to: Point }> }} RoomSide
 */
/** @typedef {{ from: Point, to: Point, normal: Point, offset: number, changing: boolean }} Dimension */

const gap = (p, q) => Math.hypot(q.x - p.x, q.y - p.y);

/**
 * @param {{ sides?: RoomSide[] } | null | undefined} room
 * @param {{ faceId?: string | null, openingId?: string | null, minLength: number }} options the
 *   selected wall row (its id) or door or window (its subject id), whose side shows its chain;
 *   the shortest length worth drawing, in canvas units
 * @returns {{ dimensions: Dimension[], reach: number }} `reach`: how far into the room, in screen
 *   pixels, the selected element's side has lengths (0 when none), for its name to stand past them
 */
export function roomLengths(room, { faceId = null, openingId = null, minLength }) {
  const dimensions = [];
  let reach = 0;
  for (const side of room?.sides || []) {
    const length = gap(side.start, side.end);
    if (length < minLength) continue;
    const u = { x: (side.end.x - side.start.x) / length, y: (side.end.y - side.start.y) / length };
    const along = (point) => (point.x - side.start.x) * u.x + (point.y - side.start.y) * u.y;
    const at = (value) => ({ x: side.start.x + u.x * value, y: side.start.y + u.y * value });
    const base = { normal: side.normal, changing: false };
    const selected =
      (faceId != null && side.pieces.some((piece) => piece.faceId === faceId)) ||
      (openingId != null && side.openings.some((opening) => opening.subjectId === openingId));
    const stations = selected ? chainStations(side, along, length, minLength) : [0, length];
    if (stations.length > 2) {
      for (let index = 1; index < stations.length; index += 1)
        dimensions.push({
          ...base,
          from: at(stations[index - 1]),
          to: at(stations[index]),
          offset: SIDE_OFFSET,
        });
      dimensions.push({
        ...base,
        from: side.start,
        to: side.end,
        offset: SIDE_OFFSET + WHOLE_STEP,
      });
    } else dimensions.push({ ...base, from: side.start, to: side.end, offset: SIDE_OFFSET });
    if (selected)
      reach = Math.max(
        reach,
        (stations.length > 2 ? SIDE_OFFSET + WHOLE_STEP : SIDE_OFFSET) + PILL_HEIGHT / 2
      );
  }
  return { dimensions, reach };
}

// Where the chain breaks along a side: its ends, where one row's stretch meets the next, and each
// opening's ends; two closer than `minLength` count once.
function chainStations(side, along, length, minLength) {
  const values = [0, length];
  for (const piece of side.pieces) values.push(along(piece.from), along(piece.to));
  for (const opening of side.openings) values.push(along(opening.from), along(opening.to));
  const stations = [];
  for (const value of values
    .map((entry) => Math.min(Math.max(entry, 0), length))
    .sort((a, b) => a - b))
    if (!stations.length || value - stations.at(-1) >= minLength) stations.push(value);
  // The side's far end closes the chain, even when a station just before it was kept.
  if (length - stations.at(-1) < minLength) stations[stations.length - 1] = length;
  return stations;
}

/**
 * Whether a room is too small on screen to hold its lengths (S12): its inside narrower than
 * `ROOM_MIN_PIXELS` either way.
 * @param {Point[] | null | undefined} vertices canvas units
 * @param {number} zoom screen pixels per canvas unit
 */
export function roomTooSmall(vertices, zoom) {
  if (!vertices?.length) return true;
  const xs = vertices.map((point) => point.x);
  const ys = vertices.map((point) => point.y);
  const width = (Math.max(...xs) - Math.min(...xs)) * zoom;
  const height = (Math.max(...ys) - Math.min(...ys)) * zoom;
  return width < ROOM_MIN_PIXELS || height < ROOM_MIN_PIXELS;
}
