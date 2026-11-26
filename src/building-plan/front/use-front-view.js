import { useCallback, useEffect, useMemo, useState } from 'react';
import { pickMetaEntry } from '../canvas-adapters.js';
import { FRONT_FIT, FRONT_ZOOM, frontZoomed } from './front-camera.js';
import { isAtPath } from './front-shapes.js';

/**
 * The Plan | Front switch's state for one canvas (A2, decided 2026-11-26). Front shows the wall
 * row of a wall's entry (its `focus`); elsewhere the switch stays on Plan, disabled. Per dialog:
 * every entry opens on Plan. While on, the view follows every canvas update (the entry's unsaved
 * values included), from core (`controller.frontView`). Its zoom and pan are its own and kept
 * while the dialog is open, so the plan keeps its zoom too.
 * @param {{
 *   controllerRef: { current: object | null },
 *   focus: { collection: string, id: string } | null,
 *   buildingPlanMeta: object[],
 *   section: object,
 * }} options
 */
export function useFrontView({ controllerRef, focus, buildingPlanMeta, section }) {
  const derived = useMemo(
    () => pickMetaEntry(buildingPlanMeta, section?.data_name)?.version === 2,
    [buildingPlanMeta, section]
  );
  const faceId = derived && focus?.collection === 'walls' ? focus.id : null;
  const [chosen, setChosen] = useState(false);
  const on = chosen && Boolean(faceId);
  const [view, setView] = useState(null);
  const [camera, setCamera] = useState(FRONT_FIT);

  useEffect(() => {
    const controller = controllerRef.current;
    if (!on || typeof controller?.frontView !== 'function') {
      setView(null);
      return undefined;
    }
    return controller.subscribe(() => setView(controller.frontView(faceId)));
  }, [on, faceId]);

  const zoomBy = useCallback((factor) => setCamera((current) => frontZoomed(current, factor)), []);
  const shown = on ? view : null;
  return {
    available: Boolean(faceId),
    on,
    setOn: setChosen,
    view: shown,
    camera,
    setCamera,
    zoomIn: () => zoomBy(FRONT_ZOOM.step),
    zoomOut: () => zoomBy(1 / FRONT_ZOOM.step),
    fit: () => setCamera(FRONT_FIT),
    /** Whether the view shows the element at an index path (an issue's). */
    shows: (path) =>
      Boolean(
        shown &&
        [
          ...shown.pieces,
          ...shown.openings,
          ...shown.beams,
          ...(shown.columns || []),
          ...(shown.roomBeams || []),
        ].some((part) => isAtPath(part, path))
      ),
  };
}
