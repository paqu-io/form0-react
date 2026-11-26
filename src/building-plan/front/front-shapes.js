/**
 * What the front view (A2, decided 2026-11-26) draws for a wall row's side, in px: its walls
 * (the shown row's in full, the side's other rows faded), their doors, windows, wall beams and
 * bands, the room's columns, beams and free walls against them (named at a column's or a free
 * wall's top; a beam inside, or above it when it doesn't fit, as one seen end on), the problems'
 * clash areas, folds, the floor line, the selected element and the "!"
 * markers of rows with issues. Core's front view gives the facts (`frontView`), in metres.
 */

const MARKER_OFFSET = 11; // px up and to the right of an element's top right corner, as on the plan
const BAND_LABEL_LEAST = 12; // px: a band or beam this tall names itself inside
const OPENING_LABEL_LEAST = 16;

/** About how wide a text is at a font size (no DOM to measure in a layout). */
export const textWidth = (text, size) => String(text).length * size * 0.6;

const samePath = (a, b) =>
  Array.isArray(a) &&
  Array.isArray(b) &&
  a.length === b.length &&
  a.every((part, i) => part.key === b[i].key && part.index === b[i].index);

/** Whether a part of the view is the element at `path` (its canvas element's index path). */
export const isAtPath = (part, path) => samePath(part.ref?.path, path);

const isSelected = (part, selection) =>
  Boolean(
    selection && part.ref?.collection === selection.collection && part.ref.id === selection.id
  );

/**
 * @param {object} view core's front view, with each part's `ref`
 * @param {{ scale: number, x: (m: number) => number, y: (m: number) => number }} t
 * @param {{ selection?: { collection: string, id: string } | null,
 *   markers?: Array<Array<{ key: string, index: number }>> }} [marks] the plan's selected element
 *   (the shown wall's isn't drawn: in a wall's entry it is the entry's own) and the rows with
 *   issues
 */
export function frontShapes(view, t, { selection = null, markers = [] } = {}) {
  const rect = (from, to, bottom, top) => ({
    x: t.x(from),
    y: t.y(top),
    w: (to - from) * t.scale,
    h: (top - bottom) * t.scale,
  });
  const faded = (part) => part.faceId !== view.faceId;

  const pieces = view.pieces.map((piece, index) => ({
    key: `piece:${index}`,
    ...rect(piece.from, piece.to, 0, piece.drawnHeight),
    label: piece.label,
    shown: piece.shown,
    unknown: piece.height === null,
    // The side's other wall, picked (a click in Front, 2026-11-26).
    selected: !piece.shown && isSelected(piece, selection),
    ref: piece.ref,
  }));
  const beams = view.beams.map((beam) => {
    const box = rect(beam.from, beam.to, beam.bottom, beam.top);
    const fits = box.h >= BAND_LABEL_LEAST && box.w >= textWidth(beam.name, 10) + 12;
    return {
      key: `beam:${beam.subjectId}:${beam.faceId}`,
      ...box,
      name: beam.name,
      band: beam.band,
      faded: faded(beam),
      selected: isSelected(beam, selection),
      // A band names itself at its right end, a beam added by hand in its middle.
      label: !fits
        ? null
        : beam.band
          ? { x: box.x + box.w - 6, y: box.y + box.h / 2 + 3.5, anchor: 'end' }
          : { x: box.x + box.w / 2, y: box.y + box.h / 2 + 3.5, anchor: 'middle' },
      ref: beam.ref,
    };
  });
  const openings = view.openings.map((opening) => {
    const box = rect(opening.from, opening.to, opening.bottom, opening.top);
    const fits = box.h >= OPENING_LABEL_LEAST && box.w >= textWidth(opening.name, 11) + 8;
    return {
      key: `opening:${opening.subjectId}`,
      ...box,
      kind: opening.kind,
      name: opening.name,
      faded: faded(opening),
      selected: isSelected(opening, selection),
      label: fits ? { x: box.x + box.w / 2, y: box.y + box.h / 2 + 4, anchor: 'middle' } : null,
      ref: opening.ref,
    };
  });
  // A column, or a free wall meeting the wall (2026-11-26): floor to top, named at its top.
  const upright = (kind) => (column) => {
    const box = rect(column.from, column.to, column.bottom, column.top);
    const fits = box.w >= textWidth(column.name, 10) + 6 && box.h >= 24;
    return {
      key: `${kind}:${column.rowId || column.subjectId}`,
      ...box,
      name: column.name,
      faded: faded(column),
      selected: isSelected(column, selection),
      unknown: column.height === null,
      label: fits ? { x: box.x + box.w / 2, y: box.y + 14, anchor: 'middle' } : null,
      ref: column.ref,
    };
  };
  const columns = (view.columns || []).map(upright('column'));
  const freeWalls = (view.freeWalls || []).map(upright('free-wall'));
  const roomBeams = (view.roomBeams || []).map((beam) => {
    const box = rect(beam.from, beam.to, beam.bottom, beam.top);
    const inside = box.h >= BAND_LABEL_LEAST && box.w >= textWidth(beam.name, 10) + 12;
    return {
      key: `room-beam:${beam.subjectId}`,
      ...box,
      name: beam.name,
      endOn: beam.endOn,
      faded: faded(beam),
      selected: isSelected(beam, selection),
      label: {
        x: box.x + box.w / 2,
        y: inside ? box.y + box.h / 2 + 3.5 : box.y - 4,
        anchor: 'middle',
      },
      ref: beam.ref,
    };
  });
  const problems = view.problems.map((problem) => ({
    key: `problem:${problem.id}`,
    id: problem.id,
    ...rect(problem.from, problem.to, problem.bottom, problem.top),
  }));
  const top = Math.max(...view.pieces.map((piece) => piece.drawnHeight));
  const folds = view.folds.map((at) => ({
    key: `fold:${at}`,
    x: t.x(at),
    y0: t.y(0),
    y1: t.y(top),
  }));
  const shown = pieces.find((piece) => piece.shown);
  return {
    pieces,
    beams,
    openings,
    columns,
    roomBeams,
    freeWalls,
    problems,
    folds,
    floor: { x0: t.x(0) - 24, x1: t.x(view.length) + 24, y: t.y(0) },
    unknown: shown?.unknown && shown.w >= 110 ? { x: shown.x + 8, y: shown.y + 16 } : null,
    markers: markersOf(
      [...pieces, ...openings, ...beams, ...columns, ...roomBeams, ...freeWalls],
      markers
    ),
  };
}

/** A "!" for each element with an issue (a wall on several pieces: its last), at its top right. */
function markersOf(parts, paths) {
  const marked = new Map();
  for (const part of parts)
    if (paths.some((path) => isAtPath(part, path)))
      marked.set(`${part.ref.collection}:${part.ref.id}`, part);
  return [...marked].map(([key, part]) => ({
    key: `marker:${key}`,
    x: part.x + part.w + MARKER_OFFSET,
    y: part.y - MARKER_OFFSET,
  }));
}
