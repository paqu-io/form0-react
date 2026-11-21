import { useCallback, useEffect } from 'react';
import { isPlanShortcutEvent, planShortcutKey } from './plan-shortcuts.js';
import { ownsPlanKeyboard } from './plan-keyboard.js';

/**
 * Undo / Redo of an entry's plan edits (floor and room entries carry an editor), with their
 * Alt+Shift+Z and Alt+Shift+Y shortcuts (moved out of `canvas-host.jsx`). A refused one shows its
 * message on the canvas.
 * @param {{ repeatableApi: object, repeatableApiRef: { current: object },
 *   canvasRef: { current: object }, locked: boolean }} options
 * @returns {{ editor: object | null, undo: () => void, redo: () => void }}
 */
export function usePlanHistory({ repeatableApi, repeatableApiRef, canvasRef, locked }) {
  const editor = repeatableApi.editor || null;
  const undo = useCallback(() => {
    const api = repeatableApiRef.current;
    const result = api?.editor?.undo({ scopeId: api.scopeId });
    if (result) canvasRef.current?.receiveIssues(result.issues);
  }, []);
  const redo = useCallback(() => {
    const api = repeatableApiRef.current;
    const result = api?.editor?.redo({ scopeId: api.scopeId });
    if (result) canvasRef.current?.receiveIssues(result.issues);
  }, []);
  useEffect(() => {
    if (!editor || locked || typeof window === 'undefined') return undefined;
    const onKeyDown = (event) => {
      if (!isPlanShortcutEvent(event)) return;
      const key = planShortcutKey(event);
      if (key !== 'Z' && key !== 'Y') return;
      // Only the top dialog's plan: a Floor entry under a Rooms entry keeps its history.
      if (!ownsPlanKeyboard(canvasRef.current?.canvas)) return;
      event.preventDefault();
      event.stopPropagation();
      (key === 'Z' ? undo : redo)();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [editor, locked, undo, redo]);
  return { editor, undo, redo };
}
