import { useEffect, useRef } from 'react';

/**
 * The canvas's scope and an element to select from outside (moved out of `canvas-host.jsx`
 * with the second, 2026-11-22). The selection is applied after a change of scope has cleared
 * the old one.
 * @param {{
 *   scope: { floorId: string | null, roomId: string | null } | null,
 *   select: Array<{ key: string, index: number }> | null,
 *   controllerRef: { current: object | null },
 *   canvasRef: { current: object | null },
 * }} options `select` is an index path: a dialog opened on the way to a row selects that row's
 *   element, as a click on it does, so the dialog's list marks it.
 */
export function usePlanScope({ scope, select, controllerRef, canvasRef }) {
  // Forward scope (active floor/room) to the legacy controller for dimming rules.
  // Only clear selection when the scope actually changes to avoid flicker.
  const prevScopeRef = useRef({ floorId: null, roomId: null });
  useEffect(() => {
    const controller = controllerRef.current;
    const nextScope = scope || { floorId: null, roomId: null };
    const prevScope = prevScopeRef.current;
    const changed =
      prevScope.floorId !== nextScope.floorId || prevScope.roomId !== nextScope.roomId;
    if (controller && typeof controller.setScope === 'function') {
      controller.setScope(nextScope);
    }
    if (changed && canvasRef.current && typeof canvasRef.current.clearSelection === 'function') {
      canvasRef.current.clearSelection();
    }
    if (changed) {
      prevScopeRef.current = nextScope;
    }
  }, [scope]);

  useEffect(() => {
    if (select) canvasRef.current?.selectRow?.(select);
  }, [select]);
}
