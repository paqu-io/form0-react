/**
 * Adapters between the canvas host and the form's repeatable state: the key lookup for a plan's
 * repeatables, the form renderer and form state shims the legacy controller expects, and the
 * floor tabs an entry shows.
 */
const NODE_KEYS = {
  floors: 'floors',
  rooms: 'rooms',
  walls: 'walls',
  columns: 'columns',
  beams: 'beams',
  doors: 'doors',
  windows: 'windows',
};

export function pickMetaEntry(buildingPlanMeta, dataName) {
  if (!Array.isArray(buildingPlanMeta)) return null;
  if (dataName) {
    const match = buildingPlanMeta.find((entry) => entry?.dataName === dataName);
    if (match) return match;
  }
  return buildingPlanMeta[0] || null;
}

export function createRepeatableKeyLookup(meta) {
  const get = (nodeKey) =>
    meta?.repeatablesByNodeKey?.[nodeKey]?.preferredKey ||
    meta?.repeatablesByNodeKey?.[nodeKey]?.key ||
    (meta?.repeatables || []).find((r) => r?.nodeKey === nodeKey)?.preferredKey ||
    (meta?.repeatables || []).find((r) => r?.nodeKey === nodeKey)?.key ||
    null;

  const getDataName = (nodeKey) =>
    meta?.repeatablesByNodeKey?.[nodeKey]?.dataName ||
    meta?.repeatablesByNodeKey?.[nodeKey]?.data_name ||
    (meta?.repeatables || []).find((r) => r?.nodeKey === nodeKey)?.dataName ||
    (meta?.repeatables || []).find((r) => r?.nodeKey === nodeKey)?.data_name ||
    null;

  // Build a map from data_name to preferred key for exact matching
  const dataNameToKey = {};
  for (const nodeKey of Object.values(NODE_KEYS)) {
    const dataName = getDataName(nodeKey);
    const key = get(nodeKey);
    if (dataName && key) {
      dataNameToKey[dataName] = key;
    }
  }

  return {
    floors: get(NODE_KEYS.floors),
    rooms: get(NODE_KEYS.rooms),
    walls: get(NODE_KEYS.walls),
    columns: get(NODE_KEYS.columns),
    beams: get(NODE_KEYS.beams),
    doors: get(NODE_KEYS.doors),
    windows: get(NODE_KEYS.windows),
    // Expose the dataName-to-key map for exact matching
    byDataName: dataNameToKey,
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

export function makeAdapters({ repeatableRef, keyLookup, repeatableApiRef }) {
  // Resolve the repeatable key for a section.
  // Uses exact data_name matching against meta configuration to ensure
  // keys used for storing/looking up instances match the repeatableState keys.
  const getKeyForSection = (section) => {
    const dataName = section?.data_name || section?.dataName || null;

    // First, try exact match against meta's dataName-to-key mapping.
    // This ensures we use the same keys as repeatableState.
    if (dataName && keyLookup.byDataName?.[dataName]) {
      return keyLookup.byDataName[dataName];
    }

    // Fall back to section's own preferred_key/key/data_name.
    // This handles cases where the section isn't in the meta.
    return section?.preferred_key || section?.preferredKey || section?.key || dataName || null;
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
    const base =
      repeatableRef.current && typeof repeatableRef.current === 'object'
        ? repeatableRef.current
        : {};
    const draft =
      typeof structuredClone === 'function'
        ? structuredClone(base)
        : JSON.parse(JSON.stringify(base));
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
    if (!key || typeof repeatableApiRef.current?.addInstance !== 'function') return null;
    const parentIdPath = indexPathToIdPath(path) || [];
    const created = repeatableApiRef.current.addInstance(key, {
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
    if (!key || typeof repeatableApiRef.current?.removeInstance !== 'function') return;
    const list = getRepeatableInstancesByIndexPath(key, parentPath);
    if (!Array.isArray(list)) return;
    const target = index != null ? list[index] : null;
    if (!target) return;
    const parentIdPath = indexPathToIdPath(parentPath) || [];
    repeatableApiRef.current.removeInstance(key, target.id, parentIdPath);
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
    if (!fieldName) return false;
    const parentPath = path.slice(0, -1);
    const segment = path[path.length - 1];
    if (!segment || typeof segment.key !== 'string') return false;
    const list = getRepeatableInstancesByIndexPath(segment.key, parentPath);
    if (!Array.isArray(list)) return false;
    const instance = list[segment.index];
    if (!instance) return false;
    const parentIdPath = indexPathToIdPath(parentPath) || [];
    if (typeof repeatableApiRef.current?.updateInstance === 'function') {
      repeatableApiRef.current.updateInstance(
        segment.key,
        instance.id,
        (current) => {
          const next = { ...current, values: { ...(current?.values || {}) } };
          next.values[fieldName] = value;
          return next;
        },
        parentIdPath
      );
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
    return true;
  };

  const formatContextPath = (path = []) =>
    path.map((segment) => `${segment?.key || 'unknown'}[${segment?.index ?? '?'}]`).join('/');

  return {
    formRenderer: {
      getPreferredKey(section) {
        // Use the same key resolution as getKeyForSection for consistency.
        // This ensures walls (and other repeatables) are stored and looked up
        // under the same key, preventing coordinate update failures.
        return getKeyForSection(section);
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

/**
 * The tabs a canvas shows: in an entry only its own floor's (decided 2026-11-22), on the plan page
 * (no floor) all of them; all too if none is the entry's (a tab row is never empty by mistake).
 * @param {Array<{ id?: string | null }>} tabs
 * @param {string | null | undefined} floorId the entry's floor
 */
export function entryFloorTabs(tabs, floorId) {
  const own = floorId ? tabs.filter((tab) => tab.id === floorId) : [];
  return own.length ? own : tabs;
}
