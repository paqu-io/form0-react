/**
 * The mini-map in Front (decided 2026-11-26, mockup round 4): core's map of the shown row's room
 * (`view.map`, plan metres, as the plan draws it: O1) laid out in its card at the view's bottom
 * left, in px, so strokes and marks keep one screen size. Display only.
 */

/** The card: its drawing (`width` × `height`, inside a 1 px border), `padding` around the room;
 * `left` and `bottom` from the panel's corner, above the status line (which sits in that corner,
 * 28 px tall, 8 px up). The fit's margins keep the wall clear of it: it stays under the
 * floor line and left of the wall, so the levels never meet it. */
export const FRONT_MAP = Object.freeze({ width: 136, height: 84, left: 8, bottom: 46, padding: 8 });

const round = (value) => Math.round(value * 100) / 100;

/**
 * @param {{
 *   outline: Array<{x: number, y: number}>, walls: Array<Array<{x: number, y: number}>>,
 *   lines: Array<Array<{x: number, y: number}>>, shown: Array<Array<{x: number, y: number}>>,
 *   others: Array<Array<{x: number, y: number}>>, zero: {x: number, y: number},
 *   eye: {x: number, y: number}, cone: Array<{x: number, y: number}>,
 *   sideCone?: Array<{x: number, y: number}>,
 *   bounds: { x: number, y: number, width: number, height: number },
 * }} map core's
 * @param {{ width: number, height: number, padding: number }} [card]
 * @returns {object} paths (`floor`, `walls`, `cone`, `sideCone`: '' when empty), segments (`lines`, `others`,
 *   `shown`: { x1, y1, x2, y2 }) and points (`zero`, `eye`), px in the card
 */
export function frontMapLayout(map, card = FRONT_MAP) {
  const room = { width: card.width - 2 * card.padding, height: card.height - 2 * card.padding };
  const { bounds } = map;
  const scale = Math.min(
    room.width / Math.max(bounds.width, 1e-6),
    room.height / Math.max(bounds.height, 1e-6)
  );
  const left = card.padding + (room.width - bounds.width * scale) / 2 - bounds.x * scale;
  const top = card.padding + (room.height - bounds.height * scale) / 2 - bounds.y * scale;
  const at = (point) => ({ x: round(left + point.x * scale), y: round(top + point.y * scale) });
  const path = (polygons) =>
    polygons
      .filter((points) => points.length >= 3)
      .map((points) => `M${points.map((point) => `${at(point).x} ${at(point).y}`).join('L')}Z`)
      .join('');
  const segment = ([a, b]) => {
    const [p, q] = [at(a), at(b)];
    return { x1: p.x, y1: p.y, x2: q.x, y2: q.y };
  };
  return {
    scale: round(scale),
    floor: path([map.outline]),
    walls: path(map.walls),
    lines: map.lines.map(segment),
    cone: path([map.cone]),
    sideCone: path([map.sideCone || []]),
    others: map.others.map(segment),
    shown: map.shown.map(segment),
    zero: at(map.zero),
    eye: at(map.eye),
  };
}
