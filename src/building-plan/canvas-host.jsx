import React, { useEffect, useRef } from 'react';
import { BuildingPlanController as LegacyBuildingPlanController } from './legacy/building-plan-controller.js';
import { BuildingPlanCanvas as LegacyBuildingPlanCanvas } from './legacy/building-plan-canvas.js';
import './canvas.css';

const NODE_KEYS = {
  floors: 'floors',
  rooms: 'rooms',
  walls: 'walls',
  columns: 'columns',
  beams: 'beams',
  doors: 'doors',
  windows: 'windows',
};

function pickMetaEntry(buildingPlanMeta, dataName) {
  if (!Array.isArray(buildingPlanMeta)) return null;
  if (dataName) {
    const match = buildingPlanMeta.find((entry) => entry?.dataName === dataName);
    if (match) return match;
  }
  return buildingPlanMeta[0] || null;
}

function createRepeatableKeyLookup(meta) {
  const get = (nodeKey) =>
    meta?.repeatablesByNodeKey?.[nodeKey]?.preferredKey ||
    meta?.repeatablesByNodeKey?.[nodeKey]?.key ||
    (meta?.repeatables || []).find((r) => r?.nodeKey === nodeKey)?.preferredKey ||
    (meta?.repeatables || []).find((r) => r?.nodeKey === nodeKey)?.key ||
    null;

  return {
    floors: get(NODE_KEYS.floors),
    rooms: get(NODE_KEYS.rooms),
    walls: get(NODE_KEYS.walls),
    columns: get(NODE_KEYS.columns),
    beams: get(NODE_KEYS.beams),
    doors: get(NODE_KEYS.doors),
    windows: get(NODE_KEYS.windows),
  };
}

function resolveContainer(rootRepeatableState, path = []) {
  let cursor = { repeatable: rootRepeatableState };
  for (const segment of path) {
    const { key, index } = segment || {};
    if (!key || index == null) return null;
    const arr = (cursor.repeatable || {})[key];
    if (!Array.isArray(arr)) return null;
    cursor = arr[index];
    if (!cursor) return null;
  }
  return cursor;
}

function makeAdapters({ repeatableRef, keyLookup, repeatableApi }) {
  const getKeyForSection = (section) => {
    const dataName = section?.data_name || section?.dataName || section?.key || null;
    // Try matching against known node keys by data name heuristics
    if (dataName && dataName.includes('floor')) return keyLookup.floors || dataName;
    if (dataName && dataName.includes('room')) return keyLookup.rooms || dataName;
    if (dataName && dataName.includes('wall')) return keyLookup.walls || dataName;
    if (dataName && dataName.includes('column')) return keyLookup.columns || dataName;
    if (dataName && dataName.includes('beam')) return keyLookup.beams || dataName;
    if (dataName && dataName.includes('door')) return keyLookup.doors || dataName;
    if (dataName && dataName.includes('window')) return keyLookup.windows || dataName;
    return (
      section?.preferred_key ||
      section?.preferredKey ||
      section?.key ||
      section?.data_name ||
      section?.dataName ||
      null
    );
  };

  const getRepeatableInstancesByIndexPath = (sectionOrKey, path = []) => {
    const key = typeof sectionOrKey === 'string' ? sectionOrKey : getKeyForSection(sectionOrKey);
    if (!key) return [];
    const parent = resolveContainer(repeatableRef.current, path);
    if (!parent) return [];
    const source = path.length === 0 ? repeatableRef.current : parent.repeatable || {};
    const instances = source[key];
    return Array.isArray(instances) ? instances : [];
  };

  const mutateLocalRepeatable = (mutator) => {
    const base = repeatableRef.current && typeof repeatableRef.current === 'object'
      ? repeatableRef.current
      : {};
    const draft = typeof structuredClone === 'function' ? structuredClone(base) : JSON.parse(JSON.stringify(base));
    mutator(draft);
    repeatableRef.current = draft;
  };

  const indexPathToIdPath = (indexPath = []) => {
    const idPath = [];
    let container = repeatableRef.current;
    for (const segment of indexPath) {
      if (!segment || typeof segment.key !== 'string') return null;
      const list = container?.[segment.key];
      if (!Array.isArray(list)) return null;
      const instance = list[segment.index];
      if (!instance || !instance.id) return null;
      idPath.push({ key: segment.key, id: instance.id });
      container = instance.repeatable || {};
    }
    return idPath;
  };

  const addRepeatableInstanceShim = (section, path = [], options = {}) => {
    const key = getKeyForSection(section);
    if (!key || typeof repeatableApi.addInstance !== 'function') return null;
    const parentIdPath = indexPathToIdPath(path) || [];
    const created = repeatableApi.addInstance(key, {
      parentPath: parentIdPath,
      seedValues: options.seedValues,
      instanceId: options.instanceId,
    });
    if (created) {
      mutateLocalRepeatable((draft) => {
        let container = draft;
        for (const segment of path) {
          if (!segment || typeof segment.key !== 'string') return;
          if (!Array.isArray(container[segment.key])) return;
          const instance = container[segment.key][segment.index];
          if (!instance) return;
          if (!instance.repeatable || typeof instance.repeatable !== 'object') {
            instance.repeatable = {};
          }
          container = instance.repeatable;
        }
        if (!Array.isArray(container[key])) {
          container[key] = [];
        }
        container[key].push(created);
      });
    }
    return created;
  };

  const removeRepeatableInstanceShim = (section, parentPath = [], index = null) => {
    const key = getKeyForSection(section);
    if (!key || typeof repeatableApi.removeInstance !== 'function') return;
    const list = getRepeatableInstancesByIndexPath(key, parentPath);
    if (!Array.isArray(list)) return;
    const target = index != null ? list[index] : null;
    if (!target) return;
    const parentIdPath = indexPathToIdPath(parentPath) || [];
    repeatableApi.removeInstance(key, target.id, parentIdPath);
    mutateLocalRepeatable((draft) => {
      let container = draft;
      for (const segment of parentPath) {
        if (!segment || typeof segment.key !== 'string') return;
        if (!Array.isArray(container[segment.key])) return;
        const instance = container[segment.key][segment.index];
        if (!instance) return;
        if (!instance.repeatable || typeof instance.repeatable !== 'object') {
          instance.repeatable = {};
        }
        container = instance.repeatable;
      }
      if (Array.isArray(container[key])) {
        container[key] = container[key].filter((inst) => inst && inst.id !== target.id);
      }
    });
  };

  const setFieldValueAtContextShim = (fieldName, path = [], value) => {
    if (!fieldName) return;
    const parentPath = path.slice(0, -1);
    const segment = path[path.length - 1];
    if (!segment || typeof segment.key !== 'string') return;
    const list = getRepeatableInstancesByIndexPath(segment.key, parentPath);
    if (!Array.isArray(list)) return;
    const instance = list[segment.index];
    if (!instance) return;
    const parentIdPath = indexPathToIdPath(parentPath) || [];
    if (typeof repeatableApi.updateInstance === 'function') {
      repeatableApi.updateInstance(segment.key, instance.id, (current) => {
        const next = { ...current, values: { ...(current?.values || {}) } };
        next.values[fieldName] = value;
        return next;
      }, parentIdPath);
    }
    mutateLocalRepeatable((draft) => {
      let container = draft;
      for (const seg of parentPath) {
        if (!seg || typeof seg.key !== 'string') return;
        if (!Array.isArray(container[seg.key])) return;
        const inst = container[seg.key][seg.index];
        if (!inst) return;
        if (!inst.repeatable || typeof inst.repeatable !== 'object') {
          inst.repeatable = {};
        }
        container = inst.repeatable;
      }
      const listRef = container[segment.key];
      if (!Array.isArray(listRef)) return;
      const localInstance = listRef[segment.index];
      if (!localInstance) return;
      localInstance.values = { ...(localInstance.values || {}), [fieldName]: value };
    });
  };

  const formatContextPath = (path = []) =>
    path
      .map((segment) => `${segment?.key || 'unknown'}[${segment?.index ?? '?'}]`)
      .join('/');

  return {
    formRenderer: {
      getPreferredKey(section) {
        return (
          section?.preferred_key || section?.preferredKey || section?.key || section?.data_name || null
        );
      },
      getRepeatableInstances: getRepeatableInstancesByIndexPath,
      formatContextPath,
      addRepeatableInstance: addRepeatableInstanceShim,
      removeRepeatableInstance: removeRepeatableInstanceShim,
      getRepeatableInstanceContainer(path = []) {
        return resolveContainer(repeatableRef.current, path);
      },
      ensureRepeatablePathExpanded() {},
      rebuildRepeatableSection() {},
      getRepeatableStateContainer(path = []) {
        return resolveContainer(repeatableRef.current, path);
      },
    },
    formStateManager: {
      setFieldValueAtContext: setFieldValueAtContextShim,
      updateFormState() {},
      suspendEngineUpdates() {},
      resumeEngineUpdates() {},
      registerPendingFieldCallback() {},
      clearPendingValuesUnderPath() {},
    },
  };
}

export function BuildingPlanCanvasHost({
  section,
  buildingPlanMeta = [],
  repeatableState = {},
  repeatableApi = {},
  mode = 'parent',
  scope = { floorId: null, roomId: null },
  toolbarState = {},
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const controllerRef = useRef(null);
  const repeatableRef = useRef(repeatableState);
  const repeatableApiRef = useRef(repeatableApi);

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
      repeatableApi: repeatableApiRef.current,
    });

    const controller = new LegacyBuildingPlanController(
      formRenderer,
      formStateManager,
      section,
      [],
      metaEntry
    );

    // We handle repeatable sync manually; avoid listening to DOM events the React stack never emits
    document.removeEventListener('form0:repeatable-change', controller.handleRepeatableChange);

    const canvas = new LegacyBuildingPlanCanvas({
      container,
      controller,
      labelSettings: {},
    });

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

    controllerRef.current = controller;
    canvasRef.current = canvas;

    // Initial sync to reflect the current repeatable state
    controller.syncFromState();

    return () => {
      canvas?.destroy?.();
      controller?.dispose?.();
    };
  }, [section, buildingPlanMeta]);

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

  // Scope is not yet forwarded into the legacy canvas; placeholder for dimming support
  useEffect(() => {
    void scope; // reserved for future dimming support
    void mode;
  }, [scope, mode]);

  return <div ref={containerRef} className="building-plan-canvas-panel" />;
}
