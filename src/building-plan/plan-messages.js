/**
 * What the canvas says when core refuses an edit (1e, M1): the issues grouped by message, and the
 * plan elements an issue names, so the canvas can outline the element in the way.
 *
 * Core issues are `{ code, message, subject: { type, id } | null, ...details }`. Twin faces of
 * one wall report the same refusal, so one message can carry several issues.
 */

/** @typedef {{ code?: string, message?: string, subject?: { type?: string, id?: string } | null, roomIds?: Array<string | null>, openingIds?: string[], columnIds?: string[] }} PlanIssue */

/**
 * The issues grouped by their text, in the order they came.
 * @param {PlanIssue[]} issues
 * @returns {Array<{ message: string, issues: PlanIssue[] }>}
 */
export function groupPlanMessages(issues) {
  const groups = new Map();
  for (const issue of Array.isArray(issues) ? issues : []) {
    const message = String(issue?.message || issue?.code || '').trim();
    if (!message) continue;
    if (!groups.has(message)) groups.set(message, { message, issues: [] });
    groups.get(message).issues.push(issue);
  }
  return [...groups.values()];
}

// Subject types by the canvas collection they point at. Property issues use a node key.
const SUBJECT_KINDS = {
  room: 'rooms',
  rooms: 'rooms',
  room_face: 'faces',
  wall_face: 'faces',
  wall: 'walls',
  walls: 'walls',
  door: 'openings',
  window: 'openings',
  doors: 'openings',
  windows: 'openings',
  face_doors: 'openings',
  face_windows: 'openings',
  column: 'columns',
  columns: 'columns',
  beam: 'beams',
  beams: 'beams',
};

/**
 * The elements the issues name: rooms, room faces (canvas wall entries), physical walls
 * (footprints), openings by subject id, columns and beams. Besides the subject, `roomIds` (rooms
 * that overlap, or stand in the way of a resize), `openingIds` (openings a cut would remove, or a
 * column would overlap) and `columnIds` (a column another would overlap, 4a-1) are elements in the
 * way too. Floors, editing cuts, edges and vertices name nothing drawn.
 * @param {PlanIssue[]} issues
 */
export function planIssueTargets(issues) {
  const targets = {
    rooms: new Set(),
    faces: new Set(),
    walls: new Set(),
    openings: new Set(),
    columns: new Set(),
    beams: new Set(),
  };
  for (const issue of Array.isArray(issues) ? issues : []) {
    const kind = SUBJECT_KINDS[issue?.subject?.type];
    if (kind && typeof issue.subject.id === 'string') targets[kind].add(issue.subject.id);
    for (const id of issue?.roomIds || []) if (typeof id === 'string') targets.rooms.add(id);
    for (const id of issue?.openingIds || []) if (typeof id === 'string') targets.openings.add(id);
    for (const id of issue?.columnIds || []) if (typeof id === 'string') targets.columns.add(id);
  }
  return targets;
}
