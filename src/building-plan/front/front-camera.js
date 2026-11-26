/**
 * Where the front view (A2, decided 2026-11-26) draws: one scale per room, fitted so the room's
 * longest row and tallest wall fit the panel with room around for the lengths, refitted only when
 * the panel changes size; zoom (relative to that fit, 1 at the fit) and pan on top, the Front's
 * own, so the plan keeps its zoom. Screen pixels throughout, so text stays one size.
 */

/** Room around the wall, in px: levels on the left, the height chains on the right, the wall
 * line overlay above, the lengths along the bottom. */
export const FRONT_MARGIN = Object.freeze({ left: 64, right: 200, top: 48, bottom: 100 });
/** Zoom relative to the fit. */
export const FRONT_ZOOM = Object.freeze({ min: 0.5, max: 8, step: 1.25 });
export const FRONT_FIT = Object.freeze({ zoom: 1, pan: Object.freeze({ x: 0, y: 0 }) });

const LEAST_SCALE = 4; // px per metre, for a panel too small for its margins
const clamp = (value) => Math.min(FRONT_ZOOM.max, Math.max(FRONT_ZOOM.min, value));

/** The middle of the drawing area (the box less its margins). */
export function frontCentre(box) {
  return {
    x: FRONT_MARGIN.left + (box.width - FRONT_MARGIN.left - FRONT_MARGIN.right) / 2,
    y: FRONT_MARGIN.top + (box.height - FRONT_MARGIN.top - FRONT_MARGIN.bottom) / 2,
  };
}

/**
 * The px per metre at which the room's fit fills the drawing area.
 * @param {{ length: number, height: number }} fit the view's (the room's)
 * @param {{ width: number, height: number }} box the panel, px
 */
export function frontFitScale(fit, box) {
  const across = (box.width - FRONT_MARGIN.left - FRONT_MARGIN.right) / Math.max(fit.length, 1e-6);
  const up = (box.height - FRONT_MARGIN.top - FRONT_MARGIN.bottom) / Math.max(fit.height, 1e-6);
  return Math.max(LEAST_SCALE, Math.min(across, up));
}

/**
 * Metres to px: along the view from its left end (`x`), up from the floor (`y`). At the fit the
 * shown view is centred across and the room's fitted height up the drawing area, so every wall
 * of a room stands on the same floor line.
 * @param {{ length: number, fit: { length: number, height: number } }} view
 * @param {{ width: number, height: number }} box
 * @param {{ zoom: number, pan: { x: number, y: number } }} camera
 * @returns {{ scale: number, x: (metres: number) => number, y: (metres: number) => number }}
 */
export function frontTransform(view, box, camera = FRONT_FIT) {
  const scale = frontFitScale(view.fit, box) * camera.zoom;
  const centre = frontCentre(box);
  return {
    scale,
    x: (metres) => centre.x + (metres - view.length / 2) * scale + camera.pan.x,
    y: (metres) => centre.y - (metres - view.fit.height / 2) * scale + camera.pan.y,
  };
}

/**
 * The camera zoomed by `factor` about a point, `offset` px from the drawing area's middle (the
 * zoom pill zooms about the middle: no offset), keeping what lies under it there; within limits.
 * @param {{ zoom: number, pan: { x: number, y: number } }} camera
 * @param {number} factor
 * @param {{ x: number, y: number }} [offset]
 */
export function frontZoomed(camera, factor, offset = { x: 0, y: 0 }) {
  const zoom = clamp(camera.zoom * factor);
  const k = zoom / camera.zoom;
  return {
    zoom,
    pan: {
      x: offset.x - (offset.x - camera.pan.x) * k,
      y: offset.y - (offset.y - camera.pan.y) * k,
    },
  };
}
