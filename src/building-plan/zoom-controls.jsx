import React from 'react';
import { ZoomIn, ZoomOut, Maximize2, Move } from 'lucide-react';
import { BUILDING_PLAN_ZOOM_LIMITS } from 'form0-core';
import './zoom-controls.css';

const { min: MIN_ZOOM, max: MAX_ZOOM } = BUILDING_PLAN_ZOOM_LIMITS;

/**
 * Format zoom level for display (e.g., 1 -> "100%", 0.5 -> "50%")
 */
function formatZoomLevel(zoom) {
  return `${Math.round(zoom * 100)}%`;
}

/**
 * ZoomControls - Floating zoom controls for the BuildingPlan canvas.
 *
 * @param {Object} props
 * @param {number} props.zoomLevel - Current zoom level (1 = 100%)
 * @param {Function} props.onZoomIn - Callback to zoom in
 * @param {Function} props.onZoomOut - Callback to zoom out
 * @param {Function} props.onReset - Callback to reset zoom to 100%
 * @param {boolean} props.disabled - Whether controls are disabled
 */
export function ZoomControls({ zoomLevel = 1, onZoomIn, onZoomOut, onReset, disabled = false }) {
  const canZoomIn = !disabled && zoomLevel < MAX_ZOOM;
  const canZoomOut = !disabled && zoomLevel > MIN_ZOOM;
  const canReset = !disabled && zoomLevel !== 1;

  return (
    <div className="building-plan-zoom-controls">
      <button
        type="button"
        className="building-plan-zoom-btn"
        onClick={onZoomIn}
        disabled={!canZoomIn}
        data-tooltip="Zoom in"
        aria-label="Zoom in"
      >
        <ZoomIn />
      </button>

      <div
        className="building-plan-zoom-level"
        data-tooltip={`Current zoom: ${formatZoomLevel(zoomLevel)}`}
      >
        {formatZoomLevel(zoomLevel)}
      </div>

      <button
        type="button"
        className="building-plan-zoom-btn"
        onClick={onZoomOut}
        disabled={!canZoomOut}
        data-tooltip="Zoom out"
        aria-label="Zoom out"
      >
        <ZoomOut />
      </button>

      <div className="building-plan-zoom-separator" role="separator" />

      <button
        type="button"
        className="building-plan-zoom-btn"
        onClick={onReset}
        disabled={!canReset}
        data-tooltip="Reset zoom"
        aria-label="Reset zoom to 100%"
      >
        <Maximize2 />
      </button>

      <div className="building-plan-zoom-separator" role="separator" />

      <div className="building-plan-zoom-hint">
        <div
          className="building-plan-zoom-btn building-plan-zoom-btn-static"
          data-tooltip="Pan: shift+drag or middle mouse"
          aria-label="Pan hint"
        >
          <Move />
        </div>
        <span className="building-plan-zoom-hint-text">
          shift
          <br />
          +
          <br />
          drag
        </span>
      </div>
    </div>
  );
}

export default ZoomControls;
