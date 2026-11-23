import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

/**
 * What the plan canvases show (step 2): the Show menu's switches, all on by default (S2).
 * `floorBelow` also turns the floor below's pulls on and off (S4).
 */
export const DEFAULT_PLAN_LAYERS = Object.freeze({ floorBelow: true });

const PlanLayersContext = createContext(null);

function useLayersState() {
  const [layers, setLayers] = useState(DEFAULT_PLAN_LAYERS);
  return useMemo(
    () => ({
      layers,
      setLayer: (key, on) =>
        setLayers((current) => (current[key] === on ? current : { ...current, [key]: on })),
    }),
    [layers]
  );
}

/**
 * One setting for every plan canvas of a form (S3): the plan page's and every entry dialog's,
 * kept for the form's life and not stored. Mounted once by the form renderer, so two forms on
 * one page keep their own.
 * @param {{ children: React.ReactNode }} props
 */
export function PlanLayersProvider({ children }) {
  const value = useLayersState();
  return <PlanLayersContext.Provider value={value}>{children}</PlanLayersContext.Provider>;
}

/**
 * Hands the layers to a canvas and its controller: the canvas draws what is on, the controller
 * pulls to the floor below only while it shows. Also used when a canvas is mounted.
 * @param {typeof DEFAULT_PLAN_LAYERS} layers
 * @param {{ setLayers?: Function } | null | undefined} canvas
 * @param {{ setFloorBelowPulls?: Function } | null | undefined} controller
 */
export function applyPlanLayers(layers, canvas, controller) {
  canvas?.setLayers?.(layers);
  controller?.setFloorBelowPulls?.(layers.floorBelow !== false);
}

/**
 * The layers a plan canvas shows, the setter the Show menu calls, and a ref for mounting. A
 * canvas outside a provider (tests, a host without the form renderer) keeps its own. Changes
 * reach the canvas and its controller.
 * @param {{ canvasRef: { current: any }, controllerRef: { current: any } }} refs
 */
export function usePlanLayers({ canvasRef, controllerRef }) {
  const shared = useContext(PlanLayersContext);
  const own = useLayersState();
  const { layers, setLayer } = shared || own;
  const layersRef = useRef(layers);
  layersRef.current = layers;
  useEffect(() => {
    applyPlanLayers(layers, canvasRef.current, controllerRef.current);
  }, [layers]);
  return { layers, setLayer, layersRef };
}
