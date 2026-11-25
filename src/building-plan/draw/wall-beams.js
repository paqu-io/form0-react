import { FULL, HALF, OUT, levelTheme } from './scope-levels.js';
import { nameBeside } from './selection-name.js';

/**
 * Wall beams and bands on the plan (D1b, decided 2026-11-25 with the mockup's round 2, R2): drawn
 * over their wall at their width, dashed, as drawings show a lintel over an opening: in the room
 * colour over the wall, in the symbol colour over an opening's gap. Beams added by hand show while
 * Show › Beams is on; bands (ring beam, lintel and sill bands) while Show › Bands is on; the
 * selected wall's own always. Core gives each one per room face (`wallBeams` in the canvas
 * snapshot, D1a); both faces of a wall give the same outline, so each stretch is drawn once, at
 * the strongest level of its faces. The plan doesn't pick or drag them (WB10).
 *
 * D1c: the one whose entry is open (or selected from a problem) is drawn on top in the accent
 * colour, the others faded; a band with a problem in the error colour; both whatever the switches.
 */

const RANK = { [OUT]: 0, [HALF]: 1, [FULL]: 2 };
const TONE_ORDER = { faint: 0, plain: 1, error: 2, accent: 3 };
/** Screen px: the dashes, their width, and how far inside the beam's outline they run. */
const DASH = [5, 3];
const LINE = 1.4;
const INSET = 2.5;
/** The other beams' strength while one is selected. */
const FAINT = 0.35;

const placeKey = (entry) =>
  `${entry.subjectId}|${entry.points.map((p) => `${Math.round(p.x * 100)},${Math.round(p.y * 100)}`).join(';')}`;

/**
 * The wall beams the plan draws, each with the face it is drawn for, its level and its tone
 * (`accent` the selected one, `error` a band with a problem, `faint` the others while one is
 * selected, else `plain`), the accent one last.
 * @param {{
 *   wallBeams: object[],
 *   walls: object[],
 *   layers: { beams?: boolean, bands?: boolean } | null,
 *   selectedWallId: string | null,
 *   selectedWallBeamId?: string | null,
 *   problemIds?: Set<string>,
 *   levelOf: (collection: string, entry: object) => string,
 * }} plan `selectedWallBeamId`: a `wallBeams` entry's id; `problemIds`: beams with a problem
 * @returns {Array<{ entry: object, face: object, level: string, tone: string }>}
 */
export function shownWallBeams({
  wallBeams,
  walls,
  layers,
  selectedWallId,
  selectedWallBeamId = null,
  problemIds = new Set(),
  levelOf,
}) {
  const faces = new Map((walls || []).map((wall) => [wall.id, wall]));
  const own = faces.get(selectedWallId)?.physicalWallId || null;
  const selected = (wallBeams || []).find((entry) => entry.id === selectedWallBeamId) || null;
  const kept = new Map();
  for (const entry of wallBeams || []) {
    const tone =
      selected && entry.subjectId === selected.subjectId
        ? 'accent'
        : problemIds.has(entry.subjectId)
          ? 'error'
          : selected
            ? 'faint'
            : 'plain';
    const on = entry.band ? layers?.bands === true : layers?.beams !== false;
    if (!on && entry.physicalWallId !== own && (tone === 'plain' || tone === 'faint')) continue;
    const face = faces.get(entry.wallId);
    if (!face) continue;
    // The selected one is drawn for its own face (its room's lengths and name).
    const level = entry.id === selected?.id ? FULL : levelOf('walls', face);
    const key = placeKey(entry);
    const previous = kept.get(key);
    if (!previous || RANK[level] > RANK[previous.level])
      kept.set(key, { entry, face, level, tone });
  }
  return [...kept.values()].sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone]);
}

/** The beam's outline drawn `inset` inside its own, so the dashes lie on the wall. */
function insetOutline(entry, inset) {
  const [a, b] = entry.axisPoints || [];
  const length = a && b ? Math.hypot(b.x - a.x, b.y - a.y) : 0;
  if (!(length > 0)) return null;
  const t = { x: (b.x - a.x) / length, y: (b.y - a.y) / length };
  const n = { x: -t.y, y: t.x };
  const [p0, , , p3] = entry.points;
  const width = Math.hypot(p0.x - p3.x, p0.y - p3.y);
  const half = Math.max(width / 2 - inset, width / 4);
  const along = Math.min(inset, length / 4);
  const from = { x: a.x + t.x * along, y: a.y + t.y * along };
  const to = { x: b.x - t.x * along, y: b.y - t.y * along };
  const off = (point, side) => ({ x: point.x + n.x * half * side, y: point.y + n.y * half * side });
  return [off(from, 1), off(to, 1), off(to, -1), off(from, -1)];
}

function trace(ctx, points) {
  ctx.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) ctx.lineTo(point.x, point.y);
  ctx.closePath();
}

/**
 * Draws the beams `shownWallBeams` chose.
 * @param {CanvasRenderingContext2D} ctx
 * @param {ReturnType<typeof shownWallBeams>} items
 * @param {{
 *   theme: Readonly<Record<string, string>>,
 *   pixel: number,
 *   gapsOf: (physicalWallId: string) => Array<Array<{ x: number, y: number }>>,
 * }} style `pixel`: canvas units per screen pixel; `gapsOf`: the gaps of a wall's openings
 */
export function drawWallBeams(ctx, items, { theme, pixel, gapsOf }) {
  for (const { entry, level, tone } of items) {
    const outline = insetOutline(entry, INSET * pixel);
    if (!outline) continue;
    const tones = levelTheme(theme, level);
    ctx.save();
    if (tone === 'accent' || tone === 'error') {
      // On a halo of the room colour, in the selection's or the problem's colour (D1c).
      ctx.lineJoin = 'miter';
      ctx.beginPath();
      trace(ctx, outline);
      ctx.lineWidth = 4 * pixel;
      ctx.strokeStyle = tones.room;
      ctx.stroke();
      ctx.setLineDash(DASH.map((value) => value * pixel));
      ctx.lineWidth = 2 * pixel;
      ctx.strokeStyle = tone === 'accent' ? theme.accent : theme.error;
      ctx.stroke();
      ctx.restore();
      continue;
    }
    if (tone === 'faint') ctx.globalAlpha = FAINT;
    ctx.setLineDash(DASH.map((value) => value * pixel));
    ctx.lineWidth = LINE * pixel;
    ctx.lineJoin = 'miter';
    ctx.beginPath();
    trace(ctx, outline);
    ctx.strokeStyle = tones.room;
    ctx.stroke();
    const gaps = gapsOf(entry.physicalWallId).filter((gap) => gap.length > 2);
    if (gaps.length) {
      ctx.save();
      ctx.beginPath();
      for (const gap of gaps) trace(ctx, gap);
      ctx.clip();
      ctx.beginPath();
      trace(ctx, outline);
      ctx.strokeStyle = tones.symbol;
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
}

/**
 * Where a beam's name goes (names at rest, D1b: beams added by hand, not bands): beside its middle,
 * past half its width and 6 px, on the side away from the room it is drawn for.
 * @param {object} entry a `wallBeams` entry
 * @param {{
 *   size: { width: number, height: number },
 *   pixel: number,
 *   inRoom: (point: { x: number, y: number }) => boolean,
 * }} options
 */
export function wallBeamNameAt(entry, { size, pixel, inRoom }) {
  const [a, b] = entry.axisPoints;
  const [p0, , , p3] = entry.points;
  const half = Math.hypot(p0.x - p3.x, p0.y - p3.y) / 2;
  return nameBeside(a, b, {
    size,
    clearance: half + 6 * pixel,
    isInside: (point) => !inRoom(point),
  });
}

/**
 * A selected wall's bands and beams, top to bottom by height (D1b): "Ring beam 2.70" and so on,
 * the heights undersides from the floor. Those of unknown height go last, unnamed heights left out.
 * @param {object} face the selected wall (a snapshot wall)
 * @param {object[]} wallBeams the snapshot's
 * @param {(metres: number) => string} format a length as the plan shows it
 * @returns {string[]}
 */
export function wallBeamLines(face, wallBeams, format) {
  const byId = new Map((wallBeams || []).map((entry) => [entry.id, entry]));
  const height = (entry) => (Number.isFinite(entry.underside) ? entry.underside : -Infinity);
  return (face?.wallBeams || [])
    .map((id) => byId.get(id))
    .filter(Boolean)
    .sort((a, b) => height(b) - height(a))
    .map((entry) =>
      Number.isFinite(entry.underside)
        ? `${entry.displayLabel} ${format(entry.underside)}`
        : entry.displayLabel
    );
}
