import { BuildingPlanCanvasController } from 'form0-core';
import { BuildingPlanController as LegacyBuildingPlanController } from './legacy/building-plan-controller.js';
import { BuildingPlanCanvas as LegacyBuildingPlanCanvas } from './legacy/building-plan-canvas.js';
import { resolvePlanTheme } from './draw/plan-theme.js';
import { planVars } from './plan-tokens.css.js';
import {
  createRepeatableKeyLookup,
  entryFloorTabs,
  makeAdapters,
  pickMetaEntry,
} from './canvas-adapters.js';

/**
 * Creating a plan canvas for `BuildingPlanCanvasHost` (moved out of `canvas-host.jsx`): its
 * controller (core's for a version 2 plan, else the legacy one) and the legacy canvas, wired to
 * the host's state.
 */

// Magnetic alignment and edge auto-pan are always on (no toggle until the UI revamp).
const EDITING_POLICY = Object.freeze({
  snapping: true,
  edgeAutoPan: true,
  copyCustomAnswersAutomatically: true,
});
// The canvas shows room names only.
const LABEL_SETTINGS = Object.freeze({
  rooms: true,
  walls: false,
  doors: false,
  windows: false,
  columns: false,
  beams: false,
});

/**
 * Test pages only: a page that sets `globalThis.__FORM0_PLAN_CAPTURE__` to an object gets a
 * reader per open plan canvas in its `readers` (the last one opened last), each returning the
 * plan that canvas shows, unsaved entry work included, so a "Save state" button can keep it.
 * Nothing happens when the page doesn't ask.
 */
function capturePlan(controller, read) {
  const capture = globalThis.__FORM0_PLAN_CAPTURE__;
  if (!capture || typeof capture !== 'object') return;
  capture.readers = [...(capture.readers || []), read];
  const dispose = controller.dispose?.bind(controller);
  controller.dispose = () => {
    capture.readers = (capture.readers || []).filter((entry) => entry !== read);
    dispose?.();
  };
}

/**
 * @param {object} options
 * @param {HTMLElement} options.container the canvas's panel
 * @param {HTMLElement | null} options.host the host element, whose tokens theme the canvas
 * @param {object} options.section the BuildingPlanSection
 * @param {object[]} options.buildingPlanMeta
 * @param {object} options.repeatableState
 * @param {{ floorId: string | null, roomId: string | null }} options.scope
 * @param {string} options.mode
 * @param {object} options.toolbarState
 * @param {boolean} options.derivedCommands
 * @param {boolean} options.locked
 * @param {Record<string, { current: any }>} options.refs repeatableRef, repeatableApiRef,
 *   canvasRef, presentationRef, highlightRef, focusRef, findingMarkersRef, onSelectRef
 * @param {Record<string, Function>} options.on setFloorTabs, setStatus, setActiveToolMode,
 *   setZoomLevel, setSelected (the selected element's collection)
 * @returns {{ controller: object, canvas: object }}
 */
export function mountPlanCanvas({
  container,
  host,
  section,
  buildingPlanMeta,
  repeatableState,
  scope,
  mode,
  toolbarState,
  derivedCommands,
  locked,
  refs,
  on,
}) {
  const {
    repeatableRef,
    repeatableApiRef,
    canvasRef,
    presentationRef,
    highlightRef,
    focusRef,
    findingMarkersRef,
    onSelectRef,
  } = refs;
  const { setFloorTabs, setStatus, setActiveToolMode, setZoomLevel, setSelected } = on;
  const metaEntry = pickMetaEntry(buildingPlanMeta, section.data_name);
  const keyLookup = createRepeatableKeyLookup(metaEntry);
  repeatableRef.current = repeatableState;
  const { formRenderer, formStateManager } = makeAdapters({
    repeatableRef,
    keyLookup,
    repeatableApiRef,
  });

  // Issues go to the canvas, which keeps them with the gesture that caused them; any reported
  // before the canvas exists are handed over once it does.
  let canvas = null;
  let earlyIssues = null;
  const controller =
    metaEntry?.version === 2
      ? new BuildingPlanCanvasController({
          meta: metaEntry,
          managedTransactions: true,
          editingPolicy: EDITING_POLICY,
          derivedCommands,
          // An entry shows its own floor (F1), a new floor's included.
          floorId: scope?.floorId || null,
          confirmOpeningRemoval: (issue) =>
            globalThis.confirm?.(
              `${issue.message}\n\nKeep this position and remove the opening(s)?`
            ) === true,
          readRecord: () => ({ values: {}, repeatable: repeatableRef.current }),
          writeRecord: (record, command) =>
            repeatableApiRef.current.writeBuildingPlan?.(record, command) ?? false,
          focusRow: (path) => repeatableApiRef.current.focusRow?.(path),
          reportIssues: (issues) => {
            if (canvas) canvas.receiveIssues(issues);
            else earlyIssues = issues;
          },
          readOnly: () => canvasRef.current?.readOnly || mode === 'parent',
        })
      : new LegacyBuildingPlanController(
          formRenderer,
          formStateManager,
          section,
          [],
          metaEntry,
          scope
        );

  // We handle repeatable sync manually; avoid listening to DOM events the React stack never emits
  document.removeEventListener('form0:repeatable-change', controller.handleRepeatableChange);
  if (metaEntry?.version === 2) {
    capturePlan(controller, () => ({ values: {}, repeatable: repeatableRef.current }));
    const snapshot = controller.getSnapshot.bind(controller);
    controller.getSnapshot = () => {
      const view = snapshot();
      for (const collection of ['rooms', 'walls', 'columns', 'beams', 'doors', 'windows'])
        for (const item of view[collection])
          item.isDimmed = Boolean(
            controller.scope?.roomId &&
            (collection === 'rooms' ? item.id : item.roomId) !== controller.scope.roomId
          );
      return view;
    };
    controller.setScope = (next) => {
      controller.scope = next;
      if (next?.floorId && typeof controller.showFloor === 'function')
        controller.showFloor(next.floorId);
      controller.emitUpdate();
    };
    controller.scope = scope;
  }

  canvas = new LegacyBuildingPlanCanvas({
    presentation: presentationRef.current,
    container,
    controller,
    labelSettings: LABEL_SETTINGS,
    externalToolbar: true, // Use new React toolbar instead of legacy DOM toolbar
    readOnly: locked, // Disable canvas interactions in view mode and in view-only entries
    // An entry shows only its own floor's tab; the floor below is named after the tabs (F2).
    onFloorTabs: ({ tabs, below }) =>
      setFloorTabs({
        tabs: entryFloorTabs(tabs, (controller.scope || scope)?.floorId),
        below: below || null,
      }),
    onStatus: (hintKey) => setStatus((current) => ({ ...current, hintKey })),
    onMessages: ({ messages, index, codes }) =>
      setStatus((current) => ({ ...current, messages, index, codes })),
  });
  if (earlyIssues) canvas.receiveIssues(earlyIssues);
  canvas.setTheme(resolvePlanTheme(host, planVars));
  canvas.setHighlight(highlightRef.current || null);
  canvas.setFocus(focusRef.current || null);
  canvas.setFindingMarkers(findingMarkersRef.current);
  canvas.onSelect = (selection) => {
    onSelectRef.current?.(selection);
    setSelected?.(selection?.collection || null);
  };
  const changeMode = canvas.setMode.bind(canvas);
  canvas.setMode = (nextMode) => {
    changeMode(nextMode);
    setActiveToolMode(canvas.mode);
  };

  // Persistently gate tools per toolbarState (legacy updateButtonStates may flip them)
  const applyToolbarGating = (state) => {
    const nextState = state || controller?.toolbarState || toolbarState;
    if (!nextState || !canvas) return;
    const {
      canDrawFloor,
      canDrawRoom,
      canDrawWall,
      canDrawColumn,
      canDrawBeam,
      canDrawDoor,
      canDrawWindow,
    } = nextState;

    const forceDisable = (button, allowed) => {
      if (!button) return;
      button.disabled = !allowed;
      button.style.pointerEvents = allowed ? '' : 'none';
      if (!allowed && button.classList.contains('active')) {
        button.classList.remove('active');
      }
    };

    // Floor drawing is not supported in parent view; hide when disallowed
    if (canvas.floorButton) {
      const allowed = Boolean(canDrawFloor);
      canvas.floorButton.style.display = allowed ? '' : 'none';
      forceDisable(canvas.floorButton, allowed);
    }
    forceDisable(canvas.roomButton, Boolean(canDrawRoom));
    forceDisable(canvas.wallButton, Boolean(canDrawWall));
    forceDisable(canvas.columnButton, Boolean(canDrawColumn));
    forceDisable(canvas.beamButton, Boolean(canDrawBeam));
    forceDisable(canvas.doorButton, Boolean(canDrawDoor));
    forceDisable(canvas.windowButton, Boolean(canDrawWindow));
  };

  const originalUpdateButtons = canvas.updateButtonStates.bind(canvas);
  canvas.updateButtonStates = () => {
    originalUpdateButtons();
    applyToolbarGating(controller.toolbarState || toolbarState);
  };

  // Apply once on mount
  applyToolbarGating(toolbarState);

  // Wire up zoom change callback
  canvas.onZoomChange = (level) => {
    setZoomLevel(level);
  };
  // The view may have been fitted before this listener existed.
  setZoomLevel(canvas.getZoom());

  return { controller, canvas };
}
