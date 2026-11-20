import { useCallback } from 'react';

/**
 * The toolbar's and the zoom pill's handlers for a plan canvas (moved out of
 * `canvas-host.jsx`).
 * @param {{ canvasRef: { current: object }, setActiveToolMode: (mode: string) => void,
 *   waitingRef?: { current: Record<string, string> } }} options `waitingRef`: the commands
 *   waiting for a selection, with their hints
 */
export function usePlanTools({ canvasRef, setActiveToolMode, waitingRef = { current: {} } }) {
  // Handle tool mode change from the new toolbar
  const handleModeChange = useCallback((newMode) => {
    setActiveToolMode(newMode);
    const canvas = canvasRef.current;
    if (canvas && typeof canvas.setMode === 'function') {
      canvas.setMode(newMode);
    }
  }, []);

  // Handle clear selection action
  const handleClearSelection = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas && typeof canvas.clearSelection === 'function') {
      canvas.clearSelection();
    }
  }, []);

  // Zoom control handlers
  const handleZoomIn = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas && typeof canvas.zoomIn === 'function') {
      canvas.zoomIn();
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas && typeof canvas.zoomOut === 'function') {
      canvas.zoomOut();
    }
  }, []);

  // The pill's last button fits the plan (the floor, or the room in scope).
  const handleZoomReset = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!canvas.fitToContent?.()) canvas.resetZoom?.();
  }, []);

  // "Add door", "Add window", "Add column" (3b): adds, or says what to select first.
  const handleCommand = useCallback((button) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const hint = waitingRef.current?.[button.id];
    if (hint) canvas.showHint?.(hint);
    else canvas.addElement?.(button.command);
  }, []);

  return {
    handleModeChange,
    handleClearSelection,
    handleCommand,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
  };
}
