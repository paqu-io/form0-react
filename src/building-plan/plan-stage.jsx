import React, { useCallback } from 'react';
import { PlanStatus } from './plan-status.jsx';
import { ZoomControls } from './zoom-controls.jsx';
import { formatLength } from './draw/dimensions.js';
import { planText } from './plan-text.js';
import { FrontView } from './front/front-view.jsx';
import { FRONT_ZOOM } from './front/front-camera.js';

/**
 * The plan canvas's panel with what lies over it (moved out of `canvas-host.jsx`): the front view
 * in Front (A2), the canvas kept under it, hidden, so the plan keeps its zoom; the status line;
 * the zoom pill, the Front's own zoom while it shows.
 * @param {{
 *   containerRef: { current: HTMLElement | null },
 *   canvasRef: { current: object | null },
 *   controllerRef: { current: object | null },
 *   front: ReturnType<typeof import('./front/use-front-view.js').useFrontView>,
 *   status: object,
 *   zoomLevel: number,
 *   tools: ReturnType<typeof import('./use-plan-tools.js').usePlanTools>,
 *   presentation: object,
 *   selection: { collection: string, id: string } | null,
 *   markers: Array<Array<{ key: string, index: number }>>,
 *   access?: 'view' | 'read' | null,
 * }} props `zoomLevel`, `tools`: the plan's zoom and the zoom pill's handlers for it; `access`:
 *   a canvas that edits nothing, said first in the status line
 */
export function PlanStage({
  containerRef,
  canvasRef,
  controllerRef,
  front,
  status,
  zoomLevel,
  tools,
  presentation,
  selection,
  markers,
  access = null,
}) {
  const format = useCallback((metres) => formatLength(metres, presentation), [presentation]);
  const view = front.view;
  // Front always shows lengths: the status line says their unit.
  const lengthsNote =
    presentation?.unitFor?.() === 'ft' ? 'plan.status.lengthsNote.ft' : 'plan.status.lengthsNote.m';
  return (
    <>
      <div className="building-plan-canvas-stage" data-view={view ? 'front' : 'plan'}>
        <div ref={containerRef} className="building-plan-canvas-panel" />
        {view && (
          <FrontView
            view={view}
            camera={front.camera}
            onCamera={front.setCamera}
            selection={selection}
            markers={markers}
            format={format}
            // A double-click opens a part's entry as on the plan; a click selects it.
            onOpen={(ref) => controllerRef.current?.focus?.(ref.collection, ref.id)}
            onPick={(ref) =>
              canvasRef.current?.pickElement?.(ref && { collection: ref.collection, id: ref.id })
            }
          />
        )}
      </div>
      <PlanStatus
        access={access}
        hintKey={status.hintKey}
        hintParams={status.hintParams}
        // A hint naming elements stands alone, as the canvas drops its note under a hint.
        noteKey={view && !status.hintParams ? lengthsNote : status.noteKey}
        messages={status.messages}
        index={status.index}
        codes={status.codes}
        onStep={() => canvasRef.current?.showMessage(status.index + 1)}
        onDismiss={() => canvasRef.current?.dismissMessages()}
      />
      {view ? (
        <ZoomControls
          zoomLevel={front.camera.zoom}
          onZoomIn={front.zoomIn}
          onZoomOut={front.zoomOut}
          onReset={front.fit}
          limits={FRONT_ZOOM}
          fitLabel={planText('plan.zoom.fitFront')}
        />
      ) : (
        <ZoomControls
          zoomLevel={zoomLevel}
          onZoomIn={tools.handleZoomIn}
          onZoomOut={tools.handleZoomOut}
          onReset={tools.handleZoomReset}
        />
      )}
    </>
  );
}
