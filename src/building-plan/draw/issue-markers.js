/**
 * Markers on the elements that have validation findings (1e, M2): a red disc with "!", the same
 * size on screen at any zoom, up and to the right of the element's anchor (a wall face's middle,
 * an opening's, column's or beam's centre, the top right of a room's name).
 */

const OFFSET = 11; // screen px from the anchor, up and to the right
const RADIUS = 9.5;

/** The point halfway along a polyline. */
function polylineMiddle(points) {
  const lengths = points
    .slice(1)
    .map((point, index) => Math.hypot(point.x - points[index].x, point.y - points[index].y));
  let rest = lengths.reduce((sum, length) => sum + length, 0) / 2;
  for (const [index, length] of lengths.entries()) {
    if (rest <= length && length > 0) {
      const t = rest / length;
      const a = points[index];
      const b = points[index + 1];
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    rest -= length;
  }
  return points[0];
}

const COLLECTIONS = ['rooms', 'walls', 'doors', 'windows', 'columns', 'beams'];

/**
 * The element the canvas shows for a row: the entry whose index path (`path`, from the floor)
 * is `indexPath`. A floor, or a row on another floor, has none.
 * @param {object} plan the legacy canvas
 * @param {Array<{ key: string, index: number }>} indexPath
 * @returns {{ collection: string, entry: object } | null}
 */
export function elementAtPath(plan, indexPath) {
  if (!Array.isArray(indexPath)) return null;
  for (const collection of COLLECTIONS)
    for (const entry of plan[collection] || [])
      if (
        entry.path?.length === indexPath.length &&
        entry.path.every(
          (part, i) => part.key === indexPath[i].key && part.index === indexPath[i].index
        )
      )
        return { collection, entry };
  return null;
}

/**
 * Where each marked row's marker hangs, from what the canvas shows now (`plan`, the legacy
 * canvas). Rows without an element shown have none.
 * @param {object} plan
 * @param {Array<Array<{ key: string, index: number }>>} paths index paths
 * @returns {Array<{ x: number, y: number }>}
 */
export function findingMarkerAnchors(plan, paths) {
  const anchors = [];
  for (const path of paths || []) {
    const found = elementAtPath(plan, path);
    if (!found) continue;
    const { collection, entry } = found;
    let anchor = null;
    if (collection === 'rooms') {
      const label = entry._labelRect;
      const rect = entry.rect;
      anchor = label
        ? { x: label.x + label.width, y: label.y }
        : rect && { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    } else if (collection === 'walls')
      anchor = entry.points?.length > 1 ? polylineMiddle(entry.points) : null;
    else if (collection === 'doors' || collection === 'windows')
      anchor = plan.getOpeningGeometry?.(entry)?.centerPoint;
    else if (collection === 'columns') anchor = plan.getColumnRenderInfo?.(entry)?.center;
    else if (collection === 'beams') anchor = plan.getBeamRenderInfo?.(entry)?.centerPoint;
    if (anchor) anchors.push(anchor);
  }
  return anchors;
}

/**
 * Draws a marker per anchor: a disc in `color`, ringed and lettered in `ground` (the room colour,
 * so the "!" reads in both themes).
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{ x: number, y: number }>} anchors
 * @param {{ color: string, ground: string, zoom?: number }} style
 */
export function drawFindingMarkers(ctx, anchors, { color, ground, zoom = 1 }) {
  if (!anchors.length) return;
  const px = 1 / zoom;
  ctx.save();
  ctx.setLineDash([]);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${13 * px}px Inter, system-ui, sans-serif`;
  for (const anchor of anchors) {
    const x = anchor.x + OFFSET * px;
    const y = anchor.y - OFFSET * px;
    ctx.beginPath();
    ctx.arc(x, y, RADIUS * px, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 1.5 * px;
    ctx.strokeStyle = ground;
    ctx.stroke();
    ctx.fillStyle = ground;
    ctx.fillText('!', x, y + 0.5 * px);
  }
  ctx.restore();
}
