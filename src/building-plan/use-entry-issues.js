import { useEffect } from 'react';

/**
 * An entry's refusals for values typed in its form (a beam typed past its wall's end, a door too
 * wide) shown on its canvas, in the status line with the canvas's own refusals; they showed in a
 * banner above the form (wall beams hand test, 2026-11-24).
 * @param {{ canvasRef: { current: object | null }, issues: Array<object> | null }} options
 *   `issues`: core's issues from the entry's last typed edit (empty clears them); null: none sent
 */
export function useEntryIssues({ canvasRef, issues }) {
  useEffect(() => {
    if (!issues) return;
    canvasRef.current?.receiveIssues?.(issues);
  }, [canvasRef, issues]);
}
