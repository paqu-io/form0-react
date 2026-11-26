import { useBuildingPlanPresentation } from './presentation.jsx';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BuildingPlanToolbar } from './toolbar/building-plan-toolbar.jsx';
import { TOOL_MODES } from './toolbar/toolbar-config.js';
import { PlanTooltip } from './plan-tooltip.jsx';
import { FloorTabs } from './floor-tabs.jsx';
import { NO_STATUS } from './plan-status.jsx';
import { PlanIssueList } from './plan-issue-list.jsx';
import { usePlanIssues } from './use-plan-issues.js';
import { usePlanHistory } from './use-plan-history.js';
import { usePlanKeyboard } from './plan-keyboard.js';
import { usePlanTools } from './use-plan-tools.js';
import { usePlanScope } from './use-plan-scope.js';
import { useEntryIssues } from './use-entry-issues.js';
import { usePlanLayers } from './plan-layers.jsx';
import { mountPlanCanvas } from './canvas-host-mount.js';
import { waitingCommands } from './add-elements.js';
import { resolvePlanTheme } from './draw/plan-theme.js';
import { planTokens, planVars } from './plan-tokens.css.js';
import { planText } from './plan-text.js';
import { PlanStage } from './plan-stage.jsx';
import { useFrontView } from './front/use-front-view.js';
import { ViewSwitch } from './front/view-switch.jsx';
import { useThemeClass } from '../theme-context.jsx';
import './canvas-host.css.js';

export function BuildingPlanCanvasHost({
  section,
  buildingPlanMeta = [],
  repeatableState = {},
  repeatableApi = {},
  mode = 'parent',
  scope = { floorId: null, roomId: null },
  toolbarState = {},
  readOnly = false,
  // Geometry engine: the derived core when true (redesign step 3, under test until the switch).
  derivedCommands = false,
  // A view-only canvas (an entry about one element): no tools, no undo; pan, zoom and
  // double-click to open still work.
  viewOnly = false,
  // An element to mark, { collection, id } (the entry's own, or a hovered list row's).
  highlight = null,
  // The entry's own element, { collection, id }: drawn in full, the rest of its room at half
  // strength, the rest faded (scope levels, 1e V1).
  focus = null,
  // Told the element selected on the canvas, { collection, entry } or null (to mark its row).
  onSelectElement,
  // An element to select, an index path (a dialog opened on the way to a row, 2026-11-22).
  select = null,
  // The rows whose validation findings this canvas shows (an id path: an entry's floor or room);
  // without it, the floor shown.
  findingScope = null,
  // Refusals of values typed in the entry's form, shown in the status line (wall beams, 2026-11-24).
  issues = null,
  // True: a click selects on a locked canvas (`canvas-selection.js`; an option, off by default).
  lockedSelection = false,
}) {
  const onSelectRef = useRef(onSelectElement);
  onSelectRef.current = onSelectElement;
  const locked = readOnly || viewOnly;
  const highlightRef = useRef(highlight);
  highlightRef.current = highlight;
  const focusRef = useRef(focus);
  focusRef.current = focus;
  const presentation = useBuildingPlanPresentation();
  const presentationRef = useRef(presentation);
  presentationRef.current = presentation;
  useEffect(() => {
    canvasRef.current?.setPresentation(presentation);
  }, [presentation]);
  const hostRef = useRef(null);
  usePlanKeyboard(hostRef); // the top dialog's plan takes the plan shortcuts
  // The canvas draws with the form theme's colours, resolved again when the theme changes.
  const themeClass = useThemeClass();
  useEffect(() => {
    canvasRef.current?.setTheme?.(resolvePlanTheme(hostRef.current, planVars));
  }, [themeClass]);
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const controllerRef = useRef(null);
  const repeatableRef = useRef(repeatableState);
  const repeatableApiRef = useRef(repeatableApi);

  // Track active tool mode for the new toolbar
  const [activeToolMode, setActiveToolMode] = useState(TOOL_MODES.SELECT);

  // Track zoom level for the zoom controls
  const [zoomLevel, setZoomLevel] = useState(1);
  // The status line: the tool's hint, and an edit core refused (reported by the canvas).
  const [status, setStatus] = useState(NO_STATUS);
  // The floors the canvas shows, reported by the canvas for the tab row.
  const [floorTabs, setFloorTabs] = useState({ tabs: [], below: null });
  // The selected element, { collection, id }: the commands that need one (3b: a door needs a
  // wall) read its collection; the front view marks it (A2).
  const [selected, setSelected] = useState(null);
  const waiting = useMemo(
    () => waitingCommands(selected?.collection || null),
    [selected?.collection]
  );
  const waitingRef = useRef(waiting);
  waitingRef.current = waiting;

  // The plan's problems (bands 4a) and validation findings (1e, M2): listed from the floor row,
  // marked on their elements.
  const planIssues = usePlanIssues({
    findingScope,
    buildingPlanMeta,
    section,
    floorTabs,
    repeatable: repeatableState,
    draft: Boolean(repeatableApi.editor),
  });
  const { reportProblems } = planIssues;
  const findingMarkersRef = useRef(planIssues.markers);
  findingMarkersRef.current = planIssues.markers;

  const tools = usePlanTools({ canvasRef, setActiveToolMode, waitingRef });
  const { layers, setLayer, layersRef } = usePlanLayers({ canvasRef, controllerRef }); // step 2
  const front = useFrontView({ controllerRef, focus, buildingPlanMeta, section }); // A2

  useEffect(() => {
    repeatableApiRef.current = repeatableApi;
  }, [repeatableApi]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const container = containerRef.current;
    if (!section || !container) return undefined;

    const { controller, canvas } = mountPlanCanvas({
      container,
      host: hostRef.current,
      section,
      buildingPlanMeta,
      repeatableState,
      scope,
      mode,
      toolbarState,
      derivedCommands,
      locked,
      lockedSelection,
      refs: {
        repeatableRef,
        repeatableApiRef,
        canvasRef,
        presentationRef,
        highlightRef,
        focusRef,
        findingMarkersRef,
        onSelectRef,
        layersRef,
      },
      on: { setFloorTabs, setStatus, setActiveToolMode, setZoomLevel, setSelected, reportProblems },
    });

    controllerRef.current = controller;
    canvasRef.current = canvas;

    // Initial sync to reflect the current repeatable state
    controller.syncFromState();

    return () => {
      canvas?.destroy?.();
      controller?.dispose?.();
      setStatus(NO_STATUS);
    };
    // A controller keeps the engine it started with: a new engine needs a new controller.
  }, [section, buildingPlanMeta, derivedCommands]);

  // When repeatable state changes, refresh the controller snapshot without full re-init
  useEffect(() => {
    const controller = controllerRef.current;
    if (controller) {
      repeatableRef.current = repeatableState;
      controller.syncFromState();
      controller.emitUpdate?.();
    }
  }, [repeatableState]);

  // Reflect toolbar gating (lightweight): disable toolbar buttons when editing is off
  useEffect(() => {
    const canvas = canvasRef.current;
    const controller = controllerRef.current;
    if (controller) {
      controller.toolbarState = toolbarState;
    }
    if (canvas && typeof canvas.updateButtonStates === 'function') {
      canvas.updateButtonStates();
    }
  }, [toolbarState]);

  usePlanScope({ scope, select, controllerRef, canvasRef });
  useEntryIssues({ canvasRef, issues });

  // Undo / Redo of the entry's plan edits (floor and room entries carry an editor).
  const { history } = usePlanHistory({
    repeatableApi,
    repeatableApiRef,
    canvasRef,
    readOnly,
    viewOnly,
  });

  useEffect(() => {
    canvasRef.current?.setFindingMarkers(planIssues.markers);
  }, [planIssues.markers]);

  // The marked element follows the prop (and survives the canvas's data refreshes).
  useEffect(() => {
    canvasRef.current?.setHighlight?.(highlight || null);
  }, [highlight?.collection, highlight?.id]);

  useEffect(() => {
    canvasRef.current?.setFocus?.(focus || null);
  }, [focus?.collection, focus?.id]);

  // Sync readOnly state to canvas when it changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.readOnly = locked;
    }
  }, [locked]);

  return (
    <div
      ref={hostRef}
      className={`building-plan-canvas-host ${viewOnly ? 'building-plan-canvas-host--view' : ''} ${planTokens}`}
    >
      {!viewOnly && (
        <BuildingPlanToolbar
          canvasMode={mode}
          activeToolMode={activeToolMode}
          onModeChange={tools.handleModeChange}
          onClearSelection={tools.handleClearSelection}
          onCommand={tools.handleCommand}
          unavailable={waiting}
          disabled={locked}
        />
      )}
      <div className="building-plan-canvas-panel-wrapper">
        <FloorTabs
          tabs={floorTabs.tabs}
          below={floorTabs.below}
          onSelect={(index) => canvasRef.current?.handleFloorTabClick(index)}
          onAdd={
            mode === 'parent' && !readOnly && typeof repeatableApi.addFloor === 'function'
              ? repeatableApi.addFloor
              : null
          }
          layers={layers}
          onLayer={setLayer}
          inEntry={Boolean(scope.roomId)}
          viewSwitch={
            <ViewSwitch available={front.available} front={front.on} onChange={front.setOn} />
          }
          showHint={front.view ? planText('plan.show.front') : null}
          issues={
            planIssues.items.length > 0 ? (
              <PlanIssueList
                items={planIssues.items}
                onSelect={(item) => {
                  canvasRef.current?.selectRow(item.indexPath);
                  // Selected in Front too; one it doesn't show, on the plan.
                  if (front.view && !front.shows(item.indexPath)) front.setOn(false);
                }}
                onOpen={(item) =>
                  repeatableApiRef.current.focusRow?.(item.indexPath, {
                    validationFocus: item.fieldName ? { fieldName: item.fieldName } : null,
                  })
                }
              />
            ) : null
          }
          history={history}
        />
        <PlanStage
          containerRef={containerRef}
          canvasRef={canvasRef}
          controllerRef={controllerRef}
          front={front}
          status={status}
          zoomLevel={zoomLevel}
          tools={tools}
          presentation={presentation}
          selection={selected}
          markers={planIssues.markers}
          access={readOnly ? 'read' : viewOnly ? 'view' : null}
        />
      </div>
      <PlanTooltip hostRef={hostRef} />
    </div>
  );
}
