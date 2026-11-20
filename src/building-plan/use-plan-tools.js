import { useCallback } from 'react';

/**
 * The toolbar's and the zoom pill's handlers for a plan canvas (moved out of
 * `canvas-host.jsx`).
 * @param {{ canvasRef: { current: object }, setActiveToolMode: (mode: string) => void }} options
 */
export function usePlanTools({ canvasRef, setActiveToolMode }) {
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

  return { handleModeChange, handleClearSelection, handleZoomIn, handleZoomOut, handleZoomReset };
}
