import React from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { BUILDING_PLAN_ZOOM_LIMITS } from 'form0-core';
import { planText } from './plan-text.js';
import './zoom-controls.css.js';

const { min: MIN_ZOOM, max: MAX_ZOOM } = BUILDING_PLAN_ZOOM_LIMITS;

/**
 * Format zoom level for display (e.g., 1 -> "100%", 0.5 -> "50%")
 */
function formatZoomLevel(zoom) {
  return `${Math.round(zoom * 100)}%`;
}

/**
 * ZoomControls - one horizontal pill over the canvas: zoom out, level, zoom in, fit. Names
 * show in the plan tooltip; the level's tooltip says how to pan.
 *
 * @param {Object} props
 * @param {number} props.zoomLevel - Current zoom level (1 = 100%)
 * @param {Function} props.onZoomIn - Callback to zoom in
 * @param {Function} props.onZoomOut - Callback to zoom out
 * @param {Function} props.onReset - Callback that fits the plan in the view
 * @param {boolean} props.disabled - Whether controls are disabled
 */
export function ZoomControls({ zoomLevel = 1, onZoomIn, onZoomOut, onReset, disabled = false }) {
  const canZoomIn = !disabled && zoomLevel < MAX_ZOOM;
  const canZoomOut = !disabled && zoomLevel > MIN_ZOOM;
  const canFit = !disabled;

  return (
    <div className="building-plan-zoom-controls">
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

      <div
        className="building-plan-zoom-level"
        data-tooltip={planText('plan.zoom.panHint')}
        aria-live="polite"
      >
        {formatZoomLevel(zoomLevel)}
      </div>

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

      <div className="building-plan-zoom-separator" role="separator" />

      <button
        type="button"
        className="building-plan-zoom-btn"
        onClick={onReset}
        disabled={!canFit}
        data-tooltip={planText('plan.zoom.fit')}
        aria-label={planText('plan.zoom.fit')}
      >
        <Maximize2 />
      </button>
    </div>
  );
}

export default ZoomControls;
