import { useCallback, useEffect } from 'react';
import { isPlanShortcutEvent, planShortcutKey } from './plan-shortcuts.js';
import { ownsPlanKeyboard } from './plan-keyboard.js';

/**
 * Whether the entry with `scopeId` owns the next undo or redo: core takes them only from the
 * editor that made the edit, so an entry with nothing of its own to undo has Undo off.
 * @param {{ getState: () => { undoScopeId?: string | null, redoScopeId?: string | null,
 *   canUndo: boolean, canRedo: boolean } }} editor
 * @param {string | null} scopeId
 * @param {'undo' | 'redo'} direction
 */
export function ownsHistory(editor, scopeId, direction) {
  const state = editor.getState();
  const owner = direction === 'undo' ? state.undoScopeId : state.redoScopeId;
  if (owner === undefined) return direction === 'undo' ? state.canUndo : state.canRedo;
  return (direction === 'undo' ? state.canUndo : state.canRedo) && owner === (scopeId ?? null);
}

/**
 * Undo / Redo of an entry's plan edits (floor and room entries carry an editor), with their
 * Alt+Shift+Z and Alt+Shift+Y shortcuts (moved out of `canvas-host.jsx`). A refused one shows its
 * message on the canvas.
 * @param {{ repeatableApi: object, repeatableApiRef: { current: object },
 *   canvasRef: { current: object }, readOnly: boolean, viewOnly: boolean }} options
 * @returns {{ history: { canUndo: boolean, canRedo: boolean, onUndo: () => void,
 *   onRedo: () => void } | null }} the floor row's Undo / Redo, null where the canvas doesn't edit
 */
export function usePlanHistory({ repeatableApi, repeatableApiRef, canvasRef, readOnly, viewOnly }) {
  const locked = readOnly || viewOnly;
  const editor = repeatableApi.editor || null;
  const step = useCallback((direction) => {
    const api = repeatableApiRef.current;
    // Nothing of this entry's own to undo (the next step is the entry's under it): nothing to do.
    if (!api?.editor || !ownsHistory(api.editor, api.scopeId, direction)) return;
    const result = api.editor[direction]({ scopeId: api.scopeId });
    if (result) canvasRef.current?.receiveIssues(result.issues);
  }, []);
  const undo = useCallback(() => step('undo'), [step]);
  const redo = useCallback(() => step('redo'), [step]);
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
  const history =
    editor && !viewOnly
      ? {
          canUndo: !readOnly && ownsHistory(editor, repeatableApi.scopeId, 'undo'),
          canRedo: !readOnly && ownsHistory(editor, repeatableApi.scopeId, 'redo'),
          onUndo: undo,
          onRedo: redo,
        }
      : null;
  return { history };
}
