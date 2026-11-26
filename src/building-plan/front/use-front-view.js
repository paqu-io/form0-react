import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { pickMetaEntry } from '../canvas-adapters.js';
import { isPlanShortcutEvent } from '../plan-shortcuts.js';
import { ownsPlanKeyboard } from '../plan-keyboard.js';
import { FRONT_FIT, FRONT_ZOOM, frontZoomed } from './front-camera.js';
import { isAtPath } from './front-shapes.js';

/**
 * The Plan | Front switch's state for one canvas (A2, decided 2026-11-26). Front shows the wall
 * row of a wall's entry (its `focus`), or, in a room's entry (A3), one of the room's rows at a
 * time: at first the wall selected on the plan if it is the room's, else its Walls list's first
 * row; the wall line's arrows and Alt+Shift+←/→ step through the list's rows (free walls
 * included), round from the last to the first, and a click on a wall on the mini-map shows it.
 * Showing a wall selects it on the plan, as a click there does, so its row is marked in the Walls
 * list; the zoom is kept and the view re-centred. Elsewhere the switch stays on Plan, disabled.
 * Per dialog: every entry opens on Plan. While on, the view follows every canvas update (the
 * entry's unsaved values included), from core (`controller.frontView`). Its zoom and pan are its
 * own and kept while the dialog is open, so the plan keeps its zoom too.
 * @param {{
 *   controllerRef: { current: object | null },
 *   canvasRef: { current: object | null },
 *   focus: { collection: string, id: string } | null,
 *   scope?: { roomId?: string } | null,
 *   selected?: { collection: string, id: string } | null,
 *   buildingPlanMeta: object[],
 *   section: object,
 *   onEnter?: () => void,
 * }} options `focus`: the entry's own element (none in a room's entry, which edits the plan; the
 *   room in a read-only record's); `scope`: the canvas's (a room's entry: its room);
 *   `selected`: the plan's selected element; `onEnter`: Front turned on (the tools go back to
 *   Select)
 */
export function useFrontView({
  controllerRef,
  canvasRef,
  focus,
  scope = null,
  selected = null,
  buildingPlanMeta,
  section,
  onEnter = () => {},
}) {
  const derived = useMemo(
    () => pickMetaEntry(buildingPlanMeta, section?.data_name)?.version === 2,
    [buildingPlanMeta, section]
  );
  const wallFace = derived && focus?.collection === 'walls' ? focus.id : null;
  const roomEntry = !focus || focus.collection === 'rooms';
  const roomId = derived && roomEntry ? scope?.roomId || null : null;
  const [stepped, setStepped] = useState(null);
  const faceId = wallFace || (roomId ? stepped : null);
  const [chosen, setChosen] = useState(false);
  const on = chosen && Boolean(faceId);
  const [view, setView] = useState(null);
  const [camera, setCamera] = useState(FRONT_FIT);

  /** The room's rows in its Walls list's order, from the canvas snapshot. */
  const roomRows = useCallback(() => {
    const walls = controllerRef.current?.getSnapshot?.()?.walls || [];
    return walls.filter((wall) => wall.roomId === roomId).sort((a, b) => a.index - b.index);
  }, [roomId]);

  useEffect(() => {
    const controller = controllerRef.current;
    if (!on || typeof controller?.frontView !== 'function') {
      setView(null);
      return undefined;
    }
    return controller.subscribe(() => {
      const next = controller.frontView(faceId);
      // A row gone (undone, removed): back to the list's first.
      if (!next && roomId) setStepped(roomRows()[0]?.id || null);
      else setView(next);
    });
  }, [on, faceId, roomId, roomRows]);

  const setOn = useCallback(
    (next) => {
      if (next && roomId) {
        const rows = roomRows();
        const own = selected?.collection === 'walls' && rows.some((row) => row.id === selected.id);
        setStepped(own ? selected.id : rows[0]?.id || null);
      }
      if (next) onEnter();
      setChosen(next);
    },
    [roomId, roomRows, selected, onEnter]
  );

  const shown = on ? view : null;
  const rows = roomId && shown?.rows?.length ? shown.rows : null;
  const index = rows ? rows.findIndex((row) => row.faceId === shown.faceId) : 0;
  const show = useCallback(
    (id) => {
      setStepped(id);
      setCamera((current) => ({ zoom: current.zoom, pan: { x: 0, y: 0 } }));
      canvasRef.current?.selectElement?.({ collection: 'walls', id });
    },
    [canvasRef]
  );
  const step = rows ? (by) => show(rows[(index + by + rows.length) % rows.length].faceId) : null;

  // Alt+Shift+← / → step through the rows, in the top dialog's plan only.
  const stepRef = useRef(step);
  stepRef.current = step;
  useEffect(() => {
    if (!rows || typeof window === 'undefined') return undefined;
    const onKeyDown = (event) => {
      if (!isPlanShortcutEvent(event)) return;
      const by = { ArrowLeft: -1, ArrowRight: 1 }[event.code || event.key];
      if (!by || !ownsPlanKeyboard(canvasRef.current?.canvas)) return;
      event.preventDefault();
      event.stopPropagation();
      stepRef.current?.(by);
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [Boolean(rows)]);

  const zoomBy = useCallback((factor) => setCamera((current) => frontZoomed(current, factor)), []);
  return {
    available: Boolean(wallFace || roomId),
    on,
    setOn,
    view: shown,
    camera,
    setCamera,
    zoomIn: () => zoomBy(FRONT_ZOOM.step),
    zoomOut: () => zoomBy(1 / FRONT_ZOOM.step),
    fit: () => setCamera(FRONT_FIT),
    /** The wall line's "n of N" (1 of 1 outside a room's entry). */
    position: rows ? { index: index + 1, total: rows.length } : { index: 1, total: 1 },
    /** Steps by ±1 through the room's rows; null where Front doesn't step. */
    step,
    /** Shows one of the room's rows (a click on the mini-map); null where Front doesn't step. */
    show: rows ? show : null,
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
