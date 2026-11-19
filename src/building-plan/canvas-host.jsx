import { useBuildingPlanPresentation } from './presentation.jsx';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BuildingPlanCanvasController } from 'form0-core';
import { BuildingPlanController as LegacyBuildingPlanController } from './legacy/building-plan-controller.js';
import { BuildingPlanCanvas as LegacyBuildingPlanCanvas } from './legacy/building-plan-canvas.js';
import { BuildingPlanToolbar } from './toolbar/building-plan-toolbar.jsx';
import { ZoomControls } from './zoom-controls.jsx';
import { TOOL_MODES, getCapabilitiesForMode } from './toolbar/toolbar-config.js';
import { PlanTooltip } from './plan-tooltip.jsx';
import { FloorTabs } from './floor-tabs.jsx';
import { PlanStatus } from './plan-status.jsx';
import { isPlanShortcutEvent, planShortcutKey } from './plan-shortcuts.js';
import { resolvePlanTheme } from './draw/plan-theme.js';
import { planTokens, planVars } from './plan-tokens.css.js';
import { useThemeClass } from '../theme-context.jsx';
import { createRepeatableKeyLookup, makeAdapters, pickMetaEntry } from './canvas-adapters.js';
import './canvas-host.css.js';

// Magnetic alignment and edge auto-pan are always on (no toggle until the UI revamp).
const EDITING_POLICY = Object.freeze({
  snapping: true,
  edgeAutoPan: true,
  copyCustomAnswersAutomatically: true,
});
// The status line before the canvas reports anything.
const NO_STATUS = Object.freeze({ hintKey: null, messages: [], index: 0, codes: [] });
// The canvas shows room names only.
const LABEL_SETTINGS = Object.freeze({
  rooms: true,
  walls: false,
  doors: false,
  windows: false,
  columns: false,
  beams: false,
});

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
  // Told the element selected on the canvas, { collection, entry } or null (to mark its row).
  onSelectElement,
}) {
  const onSelectRef = useRef(onSelectElement);
  onSelectRef.current = onSelectElement;
  const locked = readOnly || viewOnly;
  const highlightRef = useRef(highlight);
  highlightRef.current = highlight;
  const presentation = useBuildingPlanPresentation();
  const presentationRef = useRef(presentation);
  presentationRef.current = presentation;
  useEffect(() => {
    canvasRef.current?.setPresentation(presentation);
  }, [presentation]);
  const hostRef = useRef(null);
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
  const [floorTabs, setFloorTabs] = useState([]);

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

  useEffect(() => {
    repeatableApiRef.current = repeatableApi;
  }, [repeatableApi]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const container = containerRef.current;
    if (!section || !container) return undefined;

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
      onFloorTabs: ({ tabs }) => setFloorTabs(tabs),
      onStatus: (hintKey) => setStatus((current) => ({ ...current, hintKey })),
      onMessages: ({ messages, index, codes }) =>
        setStatus((current) => ({ ...current, messages, index, codes })),
    });
    if (earlyIssues) canvas.receiveIssues(earlyIssues);
    canvas.setTheme(resolvePlanTheme(hostRef.current, planVars));
    canvas.setHighlight(highlightRef.current || null);
    canvas.onSelect = (selection) => onSelectRef.current?.(selection);
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

  // Forward scope (active floor/room) to the legacy controller for dimming rules.
  // Only clear selection when the scope actually changes to avoid flicker.
  const prevScopeRef = useRef({ floorId: null, roomId: null });
  useEffect(() => {
    const controller = controllerRef.current;
    const nextScope = scope || { floorId: null, roomId: null };
    const prevScope = prevScopeRef.current;
    const changed =
      prevScope.floorId !== nextScope.floorId || prevScope.roomId !== nextScope.roomId;
    if (controller && typeof controller.setScope === 'function') {
      controller.setScope(nextScope);
    }
    if (changed && canvasRef.current && typeof canvasRef.current.clearSelection === 'function') {
      canvasRef.current.clearSelection();
    }
    if (changed) {
      prevScopeRef.current = nextScope;
    }
  }, [scope]);

  // Undo / Redo of the entry's plan edits (floor and room entries carry an editor).
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
      event.preventDefault();
      event.stopPropagation();
      (key === 'Z' ? undo : redo)();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [editor, locked, undo, redo]);

  // The marked element follows the prop (and survives the canvas's data refreshes).
  useEffect(() => {
    canvasRef.current?.setHighlight?.(highlight || null);
  }, [highlight?.collection, highlight?.id]);

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
          onModeChange={handleModeChange}
          onClearSelection={handleClearSelection}
          disabled={locked}
        />
      )}
      <div className="building-plan-canvas-panel-wrapper">
        <FloorTabs
          tabs={floorTabs}
          onSelect={(index) => canvasRef.current?.handleFloorTabClick(index)}
          onAdd={
            mode === 'parent' && !readOnly && typeof repeatableApi.addFloor === 'function'
              ? repeatableApi.addFloor
              : null
          }
          viewOnly={viewOnly}
          history={
            editor && !viewOnly
              ? {
                  canUndo: !readOnly && editor.getState().canUndo,
                  canRedo: !readOnly && editor.getState().canRedo,
                  onUndo: undo,
                  onRedo: redo,
                }
              : null
          }
        />
        <div ref={containerRef} className="building-plan-canvas-panel" />
        <PlanStatus
          hintKey={status.hintKey}
          messages={status.messages}
          index={status.index}
          codes={status.codes}
          onStep={() => canvasRef.current?.showMessage(status.index + 1)}
          onDismiss={() => canvasRef.current?.dismissMessages()}
        />
        <ZoomControls
          zoomLevel={zoomLevel}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onReset={handleZoomReset}
        />
      </div>
      <PlanTooltip hostRef={hostRef} />
    </div>
  );
}
