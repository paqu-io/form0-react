import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useFormEngine } from './use-form-engine';
import { FieldRenderer } from './field-renderer';
import { NavigationTree } from './navigation-tree';
import { ThemeProvider } from './theme-context';
import * as styles from './form-renderer.css.js';
import { BuildingPlanSectionView } from './building-plan/section-view.jsx';
import { BuildingPlanCanvasHost } from './building-plan/canvas-host.jsx';
import { useBuildingPlanController } from './building-plan/controller.js';
import {
  standardThemeLight,
  standardThemeDark,
  modalThemeLight,
  modalThemeDark,
  simplifiedThemeLight,
  simplifiedThemeDark,
  spotlightThemeLight,
  spotlightThemeDark,
} from './theme.css.js';
import { flattenFormElements } from './helpers/flatten-form-elements';
import { isFieldValueEmpty } from './helpers/is-field-value-empty.js';
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Save,
  SendHorizontal,
  Trash2,
  XCircle,
} from 'lucide-react';
import { uuidv7 } from './utils/uuid.js';
import { useRepeatableInstanceEngine } from './use-repeatable-instance.js';
import { createStructuredRecord, flattenFields } from 'form0-core';

const SECTION_LIKE_TYPES = new Set(['Section', 'RepeatableSection', 'BuildingPlanSection']);
const SPECIAL_SECTION_TYPES = new Set(['RepeatableSection', 'BuildingPlanSection']);
const EXIT_CAPABLE_PLACEMENTS = new Set(['form-modal', 'form-spotlight']);
const MIN_TITLE_PADDING_PX = 32;
const ROOT_NAV_NODE_ID = '__form_root';
const MODAL_ROOT_NAV_NODE_ID = '__modal_form_root';
const ROOT_NAV_LABEL = 'Root';
const BODY_SCROLL_LOCK_ATTR = 'data-form0-scroll-lock';

const ModeBanner = ({ mode }) => {
  const isViewMode = mode === 'readonly';
  const className = isViewMode
    ? `${styles.modeBanner} ${styles.modeBannerView}`
    : `${styles.modeBanner} ${styles.modeBannerEdit}`;
  const label = isViewMode ? 'You are in View mode' : 'You are in Edit mode';
  return (
    <div className={className} role="status" aria-live="polite">
      {label}
    </div>
  );
};

const cloneDeepSafe = (value) => {
  if (value == null) return value;
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
};

const isObjectLike = (value) => value !== null && typeof value === 'object';

function deepEqual(a, b) {
  if (a === b) {
    return true;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i += 1) {
      if (!deepEqual(a[i], b[i])) {
        return false;
      }
    }
    return true;
  }
  if (isObjectLike(a) && isObjectLike(b)) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) {
      return false;
    }
    for (const key of aKeys) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) {
        return false;
      }
      if (!deepEqual(a[key], b[key])) {
        return false;
      }
    }
    return true;
  }
  return false;
}

// ---- Building Plan helpers ----
const BP_NODE_KEYS = {
  floors: 'floors',
  rooms: 'rooms',
  walls: 'walls',
  columns: 'columns',
  beams: 'beams',
  doors: 'doors',
  windows: 'windows',
};

function getBuildingPlanMetaEntry(metaList, dataName) {
  if (!Array.isArray(metaList) || metaList.length === 0) return null;
  if (dataName) {
    const match = metaList.find((entry) => entry?.dataName === dataName);
    if (match) return match;
  }
  return metaList[0] || null;
}

function getBuildingPlanRepeatableKey(metaEntry, nodeKey) {
  if (!metaEntry) return null;
  const byKey = metaEntry.repeatablesByNodeKey?.[nodeKey];
  if (byKey?.preferredKey || byKey?.key) {
    return byKey.preferredKey || byKey.key;
  }
  const fromList = Array.isArray(metaEntry.repeatables)
    ? metaEntry.repeatables.find((entry) => entry?.nodeKey === nodeKey)
    : null;
  if (fromList?.preferredKey || fromList?.key) {
    return fromList.preferredKey || fromList.key;
  }
  return null;
}

function getBuildingPlanFieldDataName(metaEntry, nodeKey, originalDataName, fallback) {
  const nodeMeta = metaEntry?.repeatablesByNodeKey?.[nodeKey];
  if (!nodeMeta) return fallback;
  if (nodeMeta.fieldsByOriginalDataName?.[originalDataName]?.dataName) {
    return nodeMeta.fieldsByOriginalDataName[originalDataName].dataName;
  }
  const match = Array.isArray(nodeMeta.fields)
    ? nodeMeta.fields.find((f) => f?.originalDataName === originalDataName && f?.dataName)
    : null;
  return match?.dataName || fallback;
}

function findMetaByRepeatableKey(buildingPlanMeta, repeatableKey) {
  if (!Array.isArray(buildingPlanMeta) || !repeatableKey) return null;
  for (const entry of buildingPlanMeta) {
    if (!entry) continue;
    const list = Array.isArray(entry.repeatables) ? entry.repeatables : [];
    const match = list.find(
      (r) => r?.preferredKey === repeatableKey || r?.key === repeatableKey
    );
    if (match) return entry;
  }
  return buildingPlanMeta[0] || null;
}

function buildDefaultRoomInstance(buildingPlanMeta, repeatableKey) {
  const metaEntry = findMetaByRepeatableKey(buildingPlanMeta, repeatableKey);
  if (!metaEntry) return null;

  const roomsKey = getBuildingPlanRepeatableKey(metaEntry, BP_NODE_KEYS.rooms);
  if (!roomsKey || roomsKey !== repeatableKey) return null;

  const wallsKey = getBuildingPlanRepeatableKey(metaEntry, BP_NODE_KEYS.walls);
  const roomVerticesField = getBuildingPlanFieldDataName(
    metaEntry,
    BP_NODE_KEYS.rooms,
    'room_vertices',
    'room_vertices'
  );
  const wallGeometryField = wallsKey
    ? getBuildingPlanFieldDataName(metaEntry, BP_NODE_KEYS.walls, 'wall_geometry', 'wall_geometry')
    : null;
  const wallLabelField = wallsKey
    ? getBuildingPlanFieldDataName(metaEntry, BP_NODE_KEYS.walls, 'wall_label', 'wall_label')
    : null;

  const defaultGrid = 20;
  const v0 = { x: 0, y: 0 };
  const v1 = { x: 4, y: 0 };
  const v2 = { x: 4, y: 3 };
  const v3 = { x: 0, y: 3 };
  const defaultRoomPayload = {
    unit: 'meters',
    gridSize: defaultGrid,
    vertices: [v0, v1, v2, v3],
  };

  const walls = [];
  if (wallsKey && wallGeometryField) {
    const wallVertices = [
      [v0, v1],
      [v1, v2],
      [v2, v3],
      [v3, v0],
    ];
    wallVertices.forEach((pair, idx) => {
      const payload = {
        unit: 'meters',
        gridSize: defaultGrid,
        vertices: pair,
      };
      walls.push({
        id: uuidv7(),
        values: {
          [wallGeometryField]: JSON.stringify(payload),
          ...(wallLabelField ? { [wallLabelField]: `W#${idx + 1}` } : {}),
        },
        repeatable: {},
      });
    });
  }

  return {
    id: uuidv7(),
    values: {
      [roomVerticesField]: JSON.stringify(defaultRoomPayload),
    },
    repeatable: wallsKey && walls.length > 0 ? { [wallsKey]: walls } : {},
  };
}

function buildPerimeterWallsFromRoomValues(buildingPlanMeta, repeatableKey, roomValues = {}) {
  const metaEntry = findMetaByRepeatableKey(buildingPlanMeta, repeatableKey);
  if (!metaEntry) return null;
  const wallsKey = getBuildingPlanRepeatableKey(metaEntry, BP_NODE_KEYS.walls);
  if (!wallsKey) return null;

  const roomVerticesField = getBuildingPlanFieldDataName(
    metaEntry,
    BP_NODE_KEYS.rooms,
    'room_vertices',
    'room_vertices'
  );
  const wallGeometryField = getBuildingPlanFieldDataName(
    metaEntry,
    BP_NODE_KEYS.walls,
    'wall_geometry',
    'wall_geometry'
  );
  const wallLabelField = getBuildingPlanFieldDataName(
    metaEntry,
    BP_NODE_KEYS.walls,
    'wall_label',
    'wall_label'
  );

  const raw = roomValues?.[roomVerticesField];
  if (!raw) return null;
  let parsed = null;
  try {
    parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    parsed = null;
  }
  if (!parsed || !Array.isArray(parsed.vertices) || parsed.vertices.length < 3) {
    return null;
  }

  const verts = parsed.vertices;
  const gridSize = Number(parsed.gridSize) || 20;
  const unit = parsed.unit || 'meters';
  const walls = [];
  for (let i = 0; i < verts.length; i += 1) {
    const a = verts[i];
    const b = verts[(i + 1) % verts.length];
    if (!a || !b) continue;
    const payload = { unit, gridSize, vertices: [a, b] };
    const values = {
      [wallGeometryField]: JSON.stringify(payload),
    };
    if (wallLabelField) {
      values[wallLabelField] = `W#${i + 1}`;
    }
    walls.push({
      id: uuidv7(),
      values,
      repeatable: {},
    });
  }

  return { wallsKey, walls };
}

function rectFromVerticesList(vertices = []) {
  if (!Array.isArray(vertices) || vertices.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  const xs = vertices.map((p) => Number(p?.x) || 0);
  const ys = vertices.map((p) => Number(p?.y) || 0);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function findBuildingPlanSection(elements = [], dataName) {
  for (const el of elements || []) {
    if (!el || typeof el !== 'object') continue;
    if (el.type === 'BuildingPlanSection' && (!dataName || el.data_name === dataName)) {
      return el;
    }
    if (el.type === 'Section' || el.type === 'RepeatableSection') {
      const found = findBuildingPlanSection(el.elements, dataName);
      if (found) return found;
    }
  }
  return null;
}

function parseVertexPayload(raw, { defaultUnit = 'meters', defaultGrid = 20 } = {}) {
  if (!raw) return { unit: defaultUnit, gridSize: defaultGrid, vertices: [] };
  let parsed = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
  }
  if (!parsed || typeof parsed !== 'object') {
    return { unit: defaultUnit, gridSize: defaultGrid, vertices: [] };
  }
  const vertices = Array.isArray(parsed.vertices) ? parsed.vertices : [];
  return {
    unit: parsed.unit || defaultUnit,
    gridSize: parsed.gridSize || defaultGrid,
    vertices,
  };
}

function toCanvasVertices(payload) {
  const grid = Number(payload.gridSize) || 20;
  if (!Array.isArray(payload.vertices)) return [];
  if (payload.unit && String(payload.unit).toLowerCase().startsWith('meter')) {
    return payload.vertices.map((p) => ({
      x: Number(p?.x) * grid,
      y: Number(p?.y) * grid,
    }));
  }
  return payload.vertices.map((p) => ({ x: Number(p?.x) || 0, y: Number(p?.y) || 0 }));
}

function fromCanvasVertices(canvasVertices, payloadTemplate) {
  const grid = Number(payloadTemplate.gridSize) || 20;
  const unit = payloadTemplate.unit || 'meters';
  if (unit && String(unit).toLowerCase().startsWith('meter')) {
    return canvasVertices.map((p) => ({
      x: Number(p?.x) / grid,
      y: Number(p?.y) / grid,
    }));
  }
  return canvasVertices.map((p) => ({ x: Number(p?.x) || 0, y: Number(p?.y) || 0 }));
}

function transformVerticesByRect(vertices, oldRect, newRect) {
  const deltaX = newRect.x - oldRect.x;
  const deltaY = newRect.y - oldRect.y;
  return (vertices || []).map((point) => {
    if (!point) return { x: 0, y: 0 };
    if (oldRect.width === 0 || oldRect.height === 0) {
      return {
        x: Number(point.x) + deltaX,
        y: Number(point.y) + deltaY,
      };
    }
    const relX = (Number(point.x) - oldRect.x) / oldRect.width;
    const relY = (Number(point.y) - oldRect.y) / oldRect.height;
    return {
      x: newRect.x + relX * newRect.width,
      y: newRect.y + relY * newRect.height,
    };
  });
}

const TIMESTAMP_METADATA_FIELD_DEFS = [
  {
    type: 'TextField',
    data_name: 'created_at_client',
    label: 'Created at (client)',
    read_only: true,
    key: '__metadata_created_at_client',
  },
  {
    type: 'TextField',
    data_name: 'updated_at_client',
    label: 'Updated at (client)',
    read_only: true,
    key: '__metadata_updated_at_client',
  },
  {
    type: 'TextField',
    data_name: 'created_at_server',
    label: 'Created at (server)',
    read_only: true,
    key: '__metadata_created_at_server',
  },
  {
    type: 'TextField',
    data_name: 'updated_at_server',
    label: 'Updated at (server)',
    read_only: true,
    key: '__metadata_updated_at_server',
  },
];

const createTimestampMetadataFields = (keySuffix = '') =>
  TIMESTAMP_METADATA_FIELD_DEFS.map((field) => ({
    ...field,
    key: keySuffix ? `${field.key}_${keySuffix}` : field.key,
  }));

const getTimestampSourceValue = (source, key) => {
  if (!source || typeof source !== 'object') {
    return undefined;
  }
  if (!Object.prototype.hasOwnProperty.call(source, key)) {
    return undefined;
  }
  return source[key];
};

function deriveInitialTimestamps(initialValues, overrideValues) {
  const now = new Date().toISOString();
  const resolveValue = (key, fallback) => {
    const overrideValue = getTimestampSourceValue(overrideValues, key);
    if (overrideValue !== undefined) {
      return overrideValue;
    }
    const initialValue = getTimestampSourceValue(initialValues, key);
    if (initialValue !== undefined) {
      return initialValue;
    }
    return fallback;
  };
  return {
    created_at_client: resolveValue('created_at_client', now),
    updated_at_client: now,
    created_at_server: resolveValue('created_at_server', null),
    updated_at_server: resolveValue('updated_at_server', null),
  };
}

function areTimestampValuesEqual(a, b) {
  if (a === b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return (
    a.created_at_client === b.created_at_client &&
    a.updated_at_client === b.updated_at_client &&
    a.created_at_server === b.created_at_server &&
    a.updated_at_server === b.updated_at_server
  );
}

const isPathPrefix = (candidate = [], target = []) => {
  if (!Array.isArray(candidate) || candidate.length === 0) {
    return false;
  }
  if (!Array.isArray(target) || candidate.length > target.length) {
    return false;
  }
  return candidate.every((id, idx) => target[idx] === id);
};

function useFocusTrap(active = false, containerRef, { initialFocusRef } = {}) {
  useEffect(() => {
    if (!active || typeof document === 'undefined') {
      return undefined;
    }
    const container = containerRef?.current;
    if (!container) {
      return undefined;
    }

    const redirectingRef = { current: false };

    const focusElement = (node) => {
      if (!node || typeof node.focus !== 'function') {
        return;
      }
      if (redirectingRef.current) {
        return;
      }
      redirectingRef.current = true;
      try {
        node.focus({ preventScroll: true });
      } catch {
        node.focus();
      }
      setTimeout(() => {
        redirectingRef.current = false;
      }, 0);
    };

    const getFocusableElements = () => {
      if (!containerRef.current) {
        return [];
      }
      const selectors = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ];
      return Array.from(containerRef.current.querySelectorAll(selectors.join(','))).filter(
        (el) => {
          if (el.hasAttribute('disabled')) {
            return false;
          }
          if (el.getAttribute('tabindex') === '-1') {
            return false;
          }
          const rects = el.getClientRects();
          return rects.length > 0 || el.offsetParent !== null;
        }
      );
    };

    const focusFirstElement = () => {
      const focusable = getFocusableElements();
      const target =
        (initialFocusRef && initialFocusRef.current) ||
        focusable[0] ||
        containerRef.current;
      focusElement(target);
    };

    const handleKeyDown = (event) => {
      if (event.key !== 'Tab') {
        return;
      }
      const focusable = getFocusableElements();
      const activeElement = document.activeElement;
      if (focusable.length === 0) {
        event.preventDefault();
        focusElement(containerRef.current);
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const isInside = containerRef.current.contains(activeElement);

      if (event.shiftKey) {
        if (!isInside || activeElement === first) {
          event.preventDefault();
          focusElement(last);
        }
        return;
      }

      if (!isInside || activeElement === last) {
        event.preventDefault();
        focusElement(first);
      }
    };

    const handleFocusIn = (event) => {
      if (!containerRef.current) {
        return;
      }
      if (redirectingRef.current) {
        return;
      }
      if (!containerRef.current.contains(event.target)) {
        focusFirstElement();
      }
    };

    focusFirstElement();
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('focusin', handleFocusIn, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('focusin', handleFocusIn, true);
    };
  }, [active, containerRef, initialFocusRef]);
}

function collectValidatableFields(elements, { includeRepeatableChildren = false } = {}, acc = []) {
  if (!Array.isArray(elements)) {
    return acc;
  }
  elements.forEach((element) => {
    if (!element || typeof element !== 'object') {
      return;
    }
    if (element.type === 'Section' || element.type === 'BuildingPlanSection') {
      collectValidatableFields(element.elements || [], { includeRepeatableChildren }, acc);
      return;
    }
    if (element.type === 'RepeatableSection') {
      if (includeRepeatableChildren) {
        collectValidatableFields(element.elements || [], { includeRepeatableChildren }, acc);
      }
      return;
    }
    acc.push(element);
  });
  return acc;
}

function buildValidationSummary(fields, { getValue, isVisible, isRequired, getError }) {
  const requiredFieldErrors = [];
  const generalErrors = [];

  fields.forEach((field) => {
    if (!field || !field.data_name) {
      return;
    }
    if (typeof isVisible === 'function' && !isVisible(field)) {
      return;
    }
    const dataName = field.data_name;
    const errorMessage = typeof getError === 'function' ? getError(field, dataName) : null;
    if (errorMessage) {
      generalErrors.push({
        field,
        fieldName: dataName,
        message: errorMessage,
      });
    }
    if (!isRequired || !isRequired(field)) {
      return;
    }
    const value = typeof getValue === 'function' ? getValue(field, dataName) : undefined;
    if (isFieldValueEmpty(field, value)) {
      requiredFieldErrors.push({
        field,
        fieldName: dataName,
        message: 'This field is required',
      });
    }
  });

  return {
    hasErrors: requiredFieldErrors.length > 0 || generalErrors.length > 0,
    requiredFieldErrors,
    generalErrors,
  };
}

const truncateLabel = (label = '', maxLength = 32) => {
  if (typeof label !== 'string') {
    return '';
  }
  if (label.length <= maxLength) {
    return label;
  }
  return `${label.slice(0, maxLength)}…`;
};

function buildFieldLookup(elements) {
  const byKey = new Map();
  const byDataName = new Map();

  const collect = (nodes) => {
    if (!Array.isArray(nodes)) {
      return;
    }
    nodes.forEach((element) => {
      if (!element || typeof element !== 'object') {
        return;
      }
      if (element.type === 'Section' || element.type === 'RepeatableSection' || element.type === 'BuildingPlanSection') {
        collect(element.elements || []);
        return;
      }
      if (element.key) {
        byKey.set(element.key, element);
      }
      if (element.data_name) {
        byDataName.set(element.data_name, element);
      }
    });
  };

  collect(elements);
  return { byKey, byDataName };
}

function formatValidationIssues(summary, fieldLookup, fieldToSectionPath) {
  if (!summary || !summary.hasErrors) {
    return [];
  }
  const combined = [
    ...(Array.isArray(summary.requiredFieldErrors) ? summary.requiredFieldErrors : []),
    ...(Array.isArray(summary.generalErrors) ? summary.generalErrors : []),
  ];

  const grouped = new Map();

  combined.forEach((issue) => {
    if (!issue) {
      return;
    }
    const dataName =
      (typeof issue.field?.data_name === 'string' && issue.field.data_name.length > 0
        ? issue.field.data_name
        : typeof issue.fieldName === 'string' && issue.fieldName.length > 0
        ? issue.fieldName
        : null);
    if (!dataName) {
      return;
    }
    const key = dataName;
    let entry = grouped.get(key);
    if (!entry) {
      const fieldDef = fieldLookup?.byDataName?.get(dataName) || issue.field;
      const label = fieldDef?.label || dataName || 'Field';
      entry = {
        id: key,
        fieldName: dataName,
        label: truncateLabel(label),
        messages: new Set(),
        sectionPath: fieldToSectionPath?.[dataName] || [],
      };
      grouped.set(key, entry);
    }
    if (issue.message) {
      entry.messages.add(issue.message);
    }
  });

  return Array.from(grouped.values()).map((entry, index) => ({
    id: `${entry.id}-${index}`,
    fieldName: entry.fieldName,
    label: entry.label,
    sectionPath: entry.sectionPath,
    messages: Array.from(entry.messages),
  }));
}

function useRecordTimestamps({ initialValues, overrideValues, values }) {
  const [timestamps, setTimestamps] = useState(() =>
    deriveInitialTimestamps(initialValues, overrideValues)
  );
  const timestampsRef = useRef(timestamps);
  const sourcesRef = useRef({ initialValues, overrideValues });
  const valuesRef = useRef(values);
  const updateTimerRef = useRef(null);

  const cancelScheduledUpdate = useCallback(() => {
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
      updateTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => cancelScheduledUpdate(), [cancelScheduledUpdate]);

  useEffect(() => {
    const prevSources = sourcesRef.current;
    if (
      prevSources.initialValues === initialValues &&
      prevSources.overrideValues === overrideValues
    ) {
      return;
    }
    sourcesRef.current = { initialValues, overrideValues };
    cancelScheduledUpdate();
    const next = deriveInitialTimestamps(initialValues, overrideValues);
    setTimestamps((prev) => (areTimestampValuesEqual(prev, next) ? prev : next));
  }, [initialValues, overrideValues, cancelScheduledUpdate]);

  useEffect(() => {
    timestampsRef.current = timestamps;
  }, [timestamps]);

  useEffect(() => {
    if (valuesRef.current === values) {
      return undefined;
    }
    valuesRef.current = values;
    cancelScheduledUpdate();
    updateTimerRef.current = setTimeout(() => {
      updateTimerRef.current = null;
      setTimestamps((prev) => {
        const nextUpdatedAt = new Date().toISOString();
        if (prev.updated_at_client === nextUpdatedAt) {
          return prev;
        }
        return { ...prev, updated_at_client: nextUpdatedAt };
      });
    }, 500);
    return cancelScheduledUpdate;
  }, [values, cancelScheduledUpdate]);

  const touchUpdatedAt = useCallback((nextTimestamp = new Date().toISOString()) => {
    const update = (prev) => {
      if (prev.updated_at_client === nextTimestamp) {
        return prev;
      }
      const next = { ...prev, updated_at_client: nextTimestamp };
      timestampsRef.current = next;
      return next;
    };
    setTimestamps(update);
  }, []);

  return { timestamps, timestampsRef, touchUpdatedAt };
}

function buildSectionHierarchy(elements = [], resolveRepeatableKey) {
  const metadata = {};
  const fieldPathMap = {};

  const traverse = (nodes, sectionPath = [], drilldownPath = []) => {
    if (!Array.isArray(nodes)) {
      return [];
    }

    const treeNodes = [];

    nodes.forEach((el) => {
      if (!el) {
        return;
      }

      if (SECTION_LIKE_TYPES.has(el.type)) {
        const sectionId = el.data_name || el.key;
        const hasSectionId = typeof sectionId === 'string' && sectionId.length > 0;
        const display =
          el.type === 'RepeatableSection' || el.type === 'BuildingPlanSection'
            ? 'drilldown'
            : el.display || 'inline';
        const nextSectionPath = hasSectionId ? [...sectionPath, sectionId] : sectionPath;
        const shouldExtendDrilldown = display === 'drilldown' && hasSectionId;
        const nextDrilldownPath = shouldExtendDrilldown
          ? [...drilldownPath, sectionId]
          : drilldownPath;

        if (hasSectionId) {
          const repeatableKey =
            el.type === 'RepeatableSection' && typeof resolveRepeatableKey === 'function'
              ? resolveRepeatableKey(el)
              : null;
          metadata[sectionId] = {
            id: sectionId,
            label: el.label || el.data_name || 'Unnamed Section',
            type: el.type,
            display,
            path: nextSectionPath,
            drilldownPath: nextDrilldownPath,
            repeatableKey,
            field: el,
          };
        }

        // For BuildingPlanSection we intentionally hide its inner repeatables from navigation
        // (canvas handles them via drilldowns), so do not descend for nav tree purposes.
        const shouldDescend = el.type !== 'BuildingPlanSection';
        const childNodes = shouldDescend
          ? traverse(el.elements || [], nextSectionPath, nextDrilldownPath)
          : [];

        if (
          hasSectionId &&
          (el.type === 'Section' || el.type === 'RepeatableSection' || el.type === 'BuildingPlanSection')
        ) {
          treeNodes.push({
            id: sectionId,
            label: el.label || el.data_name || 'Unnamed Section',
            display,
            type: el.type,
            children: childNodes,
          });
        } else {
          treeNodes.push(...childNodes);
        }
      } else if (el.data_name) {
        fieldPathMap[el.data_name] = sectionPath;
      }
    });

    return treeNodes;
  };

  const sectionTree = traverse(elements);
  return { sectionTree, sectionMetadata: metadata, fieldToSectionPath: fieldPathMap };
}

function buildNavigationNodes(nodes = []) {
  return nodes
    .map((node) => {
      if (!node) {
        return null;
      }
      if (node.type === 'RepeatableSection') {
        return { ...node, children: [] };
      }
      const children = node.children ? buildNavigationNodes(node.children) : [];
      return {
        ...node,
        children,
      };
    })
    .filter(Boolean);
}

function findSectionNodeById(nodes = [], targetId) {
  for (const node of nodes) {
    if (!node) {
      continue;
    }
    if (node.id === targetId) {
      return node;
    }
    if (node.children && node.children.length > 0) {
      const found = findSectionNodeById(node.children, targetId);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

export function FormRenderer({
  schema,
  initialValues,
  overrideValues,
  onSubmit,
  mode = 'edit',
  debug = false,
  onSchemaReady,
  theme = 'standard',
  colorMode = 'light',
  className = '',
  labelPosition = 'top',
  labelWidthPercent = 30,
  formWidth = '30vw', //Accepts 30vw or 50%
  simplifiedMode = false,
  onSimplifiedNavigation,
  formPlacement = 'form-page',
  interactionPresentations = null,
  onRequestClose,
  autoCloseOverlayOnSubmit = false,
  engineMode = 'main-thread',
  engineStoreMode = 'snapshot',
  showPrimaryActionsInViewMode = true,
  fieldKeyMode = 'prefer-key',
  ...rest
}) {
  const [activeDrilldownPath, setActiveDrilldownPath] = useState([]);
  const sectionRefs = useRef(new Map());
  const fieldRefs = useRef(new Map());
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const touchedFieldsRef = useRef(new Set());
  const [, setTouchVersion] = useState(0);
  const [submitCount, setSubmitCount] = useState(0);
  const [alertQueue, setAlertQueue] = useState([]);
  const [activeAlert, setActiveAlert] = useState(null);
  const loadEventTriggeredRef = useRef(false);
  const alertOkButtonRef = useRef(null);
  const alertDialogRef = useRef(null);
  const previousAlertFocusRef = useRef(null);
  const insideSpecialSectionRef = useRef(false);
  const leftActionRef = useRef(null);
  const rightActionRef = useRef(null);
  const [actionPadding, setActionPadding] = useState({
    left: MIN_TITLE_PADDING_PX,
    right: MIN_TITLE_PADDING_PX,
  });
  const [discardDialogVisible, setDiscardDialogVisible] = useState(false);
  const discardDialogRef = useRef(null);
  const discardCancelButtonRef = useRef(null);
  const [repeatableModals, setRepeatableModals] = useState([]);
  const [hasRootChanges, setHasRootChanges] = useState(false);
  const rootChangesRef = useRef(false);
  const formRendererRootRef = useRef(null);
  const repeatableModalPortalRef = useRef(
    typeof document !== 'undefined' ? document.createElement('div') : null
  );
  const blockingPortalTarget =
    typeof document !== 'undefined' ? document.body : null;
  const overlayPortalTarget =
    typeof document !== 'undefined'
      ? formRendererRootRef.current || document.body
      : null;
  const normalizedInitialMode = mode === 'readonly' ? 'readonly' : 'edit';
  const [interactionMode, setInteractionMode] = useState(normalizedInitialMode);
  const presentation = useMemo(() => {
    if (simplifiedMode) return 'simplified';
    if (formPlacement === 'form-modal') return 'modal';
    if (formPlacement === 'form-spotlight') return 'spotlight';
    return 'standard';
  }, [formPlacement, simplifiedMode]);
  const presentationInitMode = useMemo(() => {
    const initMode = interactionPresentations?.[presentation]?.initMode;
    return initMode === 'on-edit' ? 'on-edit' : 'immediate';
  }, [interactionPresentations, presentation]);
  const [altShortcutPrefix, setAltShortcutPrefix] = useState('Alt');

  useEffect(() => {
    if (typeof navigator === 'undefined') {
      return undefined;
    }
    const platform =
      (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
    if (/mac|ip(hone|ad|od)/i.test(platform)) {
      setAltShortcutPrefix('⌥');
    }
    return undefined;
  }, []);

  const getAltShortcutLabel = useCallback(
    (key) => {
      if (!key) {
        return null;
      }
      return `${altShortcutPrefix}+${key.toUpperCase()}`;
    },
    [altShortcutPrefix]
  );

  useEffect(() => {
    setInteractionMode(normalizedInitialMode);
  }, [normalizedInitialMode]);

  // Release any stale scroll lock left behind by an unmounted overlay.
  useEffect(() => {
    if (!blockingPortalTarget) return undefined;
    const staleLock =
      blockingPortalTarget.hasAttribute(BODY_SCROLL_LOCK_ATTR) &&
      blockingPortalTarget.style.overflow === 'hidden';
    if (staleLock && !discardDialogVisible && !activeAlert) {
      const prev = blockingPortalTarget.getAttribute(BODY_SCROLL_LOCK_ATTR) || '';
      blockingPortalTarget.style.overflow = prev;
      blockingPortalTarget.removeAttribute(BODY_SCROLL_LOCK_ATTR);
    }
    return undefined;
  }, [blockingPortalTarget, discardDialogVisible, activeAlert]);

  useEffect(() => {
    // Avoid locking scroll on full-page rendering; only lock when the form is in an overlay.
    const scrollLockEnabled = formPlacement === 'form-modal' || formPlacement === 'form-spotlight';
    if (!scrollLockEnabled || !blockingPortalTarget) return undefined;
    const shouldLockScroll = discardDialogVisible || Boolean(activeAlert);
    if (!shouldLockScroll) return undefined;
    const previousOverflow = blockingPortalTarget.style.overflow;
    blockingPortalTarget.setAttribute(BODY_SCROLL_LOCK_ATTR, previousOverflow || '');
    blockingPortalTarget.style.overflow = 'hidden';
    return () => {
      const prev = blockingPortalTarget.getAttribute(BODY_SCROLL_LOCK_ATTR);
      blockingPortalTarget.style.overflow = prev || '';
      blockingPortalTarget.removeAttribute(BODY_SCROLL_LOCK_ATTR);
    };
  }, [blockingPortalTarget, discardDialogVisible, activeAlert, formPlacement]);

  const discardDialogActive = discardDialogVisible && typeof document !== 'undefined';
  useFocusTrap(discardDialogActive, discardDialogRef, { initialFocusRef: discardCancelButtonRef });
  useFocusTrap(Boolean(activeAlert), alertDialogRef, { initialFocusRef: alertOkButtonRef });

  const enterEditMode = useCallback(() => {
    setInteractionMode('edit');
  }, []);

  useEffect(() => {
    const host = overlayPortalTarget;
    const node = repeatableModalPortalRef.current;
    if (!host || !node) {
      return undefined;
    }
    node.style.display = 'contents';
    host.appendChild(node);
    return () => {
      if (host.contains(node)) {
        host.removeChild(node);
      }
    };
  }, [overlayPortalTarget]);

  const markRootDirty = useCallback(() => {
    if (!rootChangesRef.current) {
      rootChangesRef.current = true;
      setHasRootChanges(true);
    }
  }, []);

  const resetRootChanges = useCallback(() => {
    if (rootChangesRef.current) {
      rootChangesRef.current = false;
      setHasRootChanges(false);
    }
  }, []);

  useEffect(() => {
    resetRootChanges();
  }, [initialValues, overrideValues, schema, resetRootChanges]);

  const resolveRepeatableKey = useCallback((field) => {
    if (!field) return null;
    if (field.key && typeof field.key === 'string' && field.key.trim().length > 0) {
      return field.key;
    }
    return field.data_name || null;
  }, []);

  const closeRepeatableModal = useCallback((modalId = null) => {
    setRepeatableModals((prev) => {
      if (prev.length === 0) return prev;
      if (!modalId || prev[prev.length - 1].modalId === modalId) {
        return prev.slice(0, -1);
      }
      const index = prev.findIndex((modal) => modal.modalId === modalId);
      if (index === -1) {
        return prev;
      }
      return [...prev.slice(0, index), ...prev.slice(index + 1)];
    });
  }, []);

  const markFieldTouched = useCallback(
    (dataName) => {
      if (!dataName) return;
      if (!touchedFieldsRef.current.has(dataName)) {
        touchedFieldsRef.current.add(dataName);
        setTouchVersion((version) => version + 1);
      }
    },
    [setTouchVersion]
  );

  const isFieldTouched = useCallback(
    (dataName) => touchedFieldsRef.current.has(dataName),
    []
  );
  
  const handleOperations = useCallback(
    (operations, meta, fallback) => {
      if (!Array.isArray(operations) || operations.length === 0) {
        return;
      }

      const deferredOperations = [];

      operations.forEach((operation) => {
        if (!operation || typeof operation !== 'object') {
          return;
        }

        if (operation.type === 'UI_OPERATION' && operation.operation === 'ALERT') {
          const rawTitle = operation.params?.title ?? '';
          const rawMessage = operation.params?.message ?? '';
          setAlertQueue((queue) => [
            ...queue,
            {
              title: String(rawTitle || '').trim() || 'Alert',
              message: String(rawMessage || ''),
            },
          ]);
        } else {
          deferredOperations.push(operation);
        }
      });

      if (deferredOperations.length > 0) {
        if (typeof fallback === 'function') {
          fallback(deferredOperations, meta);
        } else {
          console.warn(
            'form0-react: onOperations handler received operations but fallback handler was not provided.',
            deferredOperations
          );
        }
      }
    },
    [setAlertQueue]
  );

  const engineOptions = useMemo(
    () => ({
      onOperations: handleOperations,
      engineMode,
      engineStoreMode,
    }),
    [engineMode, engineStoreMode, handleOperations]
  );

  const closeAlert = useCallback(() => {
    setActiveAlert(null);
  }, []);

  const {
    values,
    visible,
    read_only,
    required,
    errors,
    setValue,
    submit,
    triggerEvent,
    schema: finalSchema,
    engine,
    engineStore,
    engineStoreMode: currentEngineStoreMode,
    engineReadyVersion,
    repeatable,
    repeatableMetadata,
    addRepeatableInstance,
    updateRepeatableInstance,
    removeRepeatableInstance,
    setRepeatableInstances,
    getRepeatableInstances,
    getRepeatableInstance,
    buildingPlanMeta,
  } = useFormEngine(schema, initialValues, overrideValues, engineOptions);

  const flattenedSchemaFields = useMemo(
    () => flattenFields(finalSchema?.form?.elements || []),
    [finalSchema]
  );

  const buildParentValuesForPath = useCallback(
    (path = []) => {
      let merged = { ...values };
      if (!Array.isArray(path) || path.length === 0) {
        return merged;
      }
      const traversePath = [];
      path.forEach(({ key, id }) => {
        const instance = getRepeatableInstance(key, id, traversePath);
        if (instance?.values) {
          merged = { ...merged, ...instance.values };
        }
        traversePath.push({ key, id });
      });
      return merged;
    },
    [getRepeatableInstance, values]
  );

  const formRepeatableController = useMemo(
    () => ({
      metadata: repeatableMetadata,
      getInstances: (repeatableKey, parentPath = []) =>
        getRepeatableInstances(repeatableKey, parentPath),
      setInstances: (repeatableKey, instances = [], parentPath = []) =>
        setRepeatableInstances(repeatableKey, instances, parentPath),
      getInstance: (repeatableKey, instanceId, parentPath = []) =>
        getRepeatableInstance(repeatableKey, instanceId, parentPath),
      buildParentValues: buildParentValuesForPath,
    }),
    [
      buildParentValuesForPath,
      getRepeatableInstance,
      getRepeatableInstances,
      repeatableMetadata,
      setRepeatableInstances,
    ]
  );

  const openRepeatableModal = useCallback(
    (config, controller = formRepeatableController) => {
      if (!controller) {
        console.warn('form0-react: repeatable modal controller is missing');
        return;
      }
      const repeatableKey = config.repeatableKey;
      if (!repeatableKey) {
        console.warn('form0-react: repeatable modal missing repeatableKey');
        return;
      }
      const repInfo =
        config.repInfo ||
        controller.metadata?.byPreferredKey?.get(repeatableKey) ||
        repeatableMetadata.byPreferredKey?.get(repeatableKey);
      if (!repInfo) {
        console.warn(`form0-react: unable to find repeatable metadata for "${repeatableKey}"`);
        return;
      }
      const modalId = config.modalId || uuidv7();
      const instanceId = config.instanceId || uuidv7();
      const initialInstance =
        config.initialInstance ||
        {
          id: instanceId,
          values: config.initialValues || {},
          repeatable: config.initialRepeatable || {},
        };
      setRepeatableModals((prev) => [
        ...prev,
        {
          ...config,
          modalId,
          instanceId,
          repInfo,
          controller,
          initialInstance,
          buildingPlanMeta,
        },
      ]);
    },
    [buildingPlanMeta, formRepeatableController, repeatableMetadata]
  );

  const handleRepeatableAdd = useCallback(
    (field, repeatableKey, parentPath = [], controller = formRepeatableController) => {
      if (!controller) {
        console.warn('form0-react: repeatable controller is unavailable');
        return;
      }
      const label = field?.label || 'Repeatable Section';

      // If adding a BuildingPlan room via modal, seed default vertices so the canvas has geometry
      const initialInstance = buildDefaultRoomInstance(buildingPlanMeta, repeatableKey);

      openRepeatableModal(
        {
          repeatableKey,
          field,
          sectionId: field?.data_name || field?.key || repeatableKey,
          label,
          description: field?.description || '',
          parentPath,
          mode: 'create',
          schema: finalSchema,
          engineOptions,
          parentValues: controller.buildParentValues(parentPath),
          initialInstance,
        },
        controller
      );
    },
    [engineOptions, finalSchema, formRepeatableController, openRepeatableModal, buildingPlanMeta]
  );

  const handleRepeatableEdit = useCallback(
    (field, repeatableKey, instanceId, parentPath = [], controller = formRepeatableController) => {
      if (!controller) {
        console.warn('form0-react: repeatable controller is unavailable');
        return;
      }
      const existing = controller.getInstance(repeatableKey, instanceId, parentPath);
      if (!existing) {
        console.warn('form0-react: repeatable instance not found for editing');
        return;
      }
      const label = field?.label || 'Repeatable Section';
      openRepeatableModal(
        {
          repeatableKey,
          field,
          sectionId: field?.data_name || field?.key || repeatableKey,
          label,
          description: field?.description || '',
          parentPath,
          mode: 'edit',
          schema: finalSchema,
          engineOptions,
          parentValues: controller.buildParentValues(parentPath),
          instanceId,
          initialInstance: cloneDeepSafe(existing),
        },
        controller
      );
    },
    [engineOptions, finalSchema, formRepeatableController, openRepeatableModal]
  );

  const handleRepeatableRemove = useCallback(
    (repeatableKey, instanceId, parentPath = [], controller = formRepeatableController) => {
      if (!controller) {
        return;
      }
      const instances = controller.getInstances(repeatableKey, parentPath);
      const next = instances.filter((instance) => instance.id !== instanceId);
      controller.setInstances(repeatableKey, next, parentPath);
      if (controller === formRepeatableController) {
        markRootDirty();
      }
    },
    [formRepeatableController, markRootDirty]
  );

  const persistRepeatableEntry = useCallback((modalConfig, payload) => {
    const { controller, repeatableKey, parentPath, mode } = modalConfig;
    if (!controller) {
      return;
    }
    const existing = controller.getInstances(repeatableKey, parentPath);
    let next = [];
    if (mode === 'edit') {
      next = existing.map((instance) => (instance.id === payload.id ? payload : instance));
    } else {
      next = [...existing, payload];
    }
    controller.setInstances(repeatableKey, next, parentPath);
    if (controller === formRepeatableController) {
      markRootDirty();
    }
  }, [formRepeatableController, markRootDirty]);

  const handleRepeatableModalSave = useCallback(
    (modalConfig, entryPayload) => {
      persistRepeatableEntry(modalConfig, entryPayload);
      closeRepeatableModal(modalConfig.modalId);
    },
    [closeRepeatableModal, persistRepeatableEntry]
  );

  const handleRepeatableModalCancel = useCallback(
    (modalConfig) => {
      closeRepeatableModal(modalConfig?.modalId);
    },
    [closeRepeatableModal]
  );

  useEffect(() => {
    if (onSchemaReady) onSchemaReady(finalSchema, buildingPlanMeta);
  }, [finalSchema, buildingPlanMeta, onSchemaReady]);

  useEffect(() => {
    loadEventTriggeredRef.current = false;
  }, [engineReadyVersion]);

  useEffect(() => {
    if (loadEventTriggeredRef.current || !engineReadyVersion) {
      return;
    }
    const shouldTriggerOnReady =
      normalizedInitialMode !== 'readonly' || presentationInitMode === 'immediate';
    if (!shouldTriggerOnReady) {
      return;
    }
    triggerEvent('load-record');
    loadEventTriggeredRef.current = true;
  }, [engineReadyVersion, normalizedInitialMode, presentationInitMode, triggerEvent]);

  useEffect(() => {
    if (loadEventTriggeredRef.current || !engineReadyVersion) {
      return;
    }
    const shouldTriggerOnEdit =
      normalizedInitialMode === 'readonly' &&
      presentationInitMode === 'on-edit' &&
      interactionMode === 'edit';
    if (!shouldTriggerOnEdit) {
      return;
    }
    triggerEvent('load-record');
    loadEventTriggeredRef.current = true;
  }, [
    engineReadyVersion,
    interactionMode,
    normalizedInitialMode,
    presentationInitMode,
    triggerEvent,
  ]);

  useEffect(() => {
    if (activeAlert || alertQueue.length === 0) {
      return;
    }
    setActiveAlert(alertQueue[0]);
    setAlertQueue((prev) => prev.slice(1));
  }, [alertQueue, activeAlert, setAlertQueue, setActiveAlert]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }
    if (!activeAlert) {
      return undefined;
    }

    previousAlertFocusRef.current = document.activeElement;
    const focusTimer = setTimeout(() => {
      alertOkButtonRef.current?.focus?.();
    }, 0);

    return () => {
      clearTimeout(focusTimer);
      previousAlertFocusRef.current?.focus?.();
      previousAlertFocusRef.current = null;
    };
  }, [activeAlert]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }
    if (!activeAlert) {
      return undefined;
    }
    const handler = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeAlert();
      }
    };
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
    };
  }, [activeAlert, closeAlert]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    const anyOverlayOpen =
      Boolean(activeAlert) ||
      discardDialogVisible ||
      repeatableModals.length > 0 ||
      presentation === 'modal' ||
      presentation === 'spotlight';

    if (!anyOverlayOpen) {
      return undefined;
    }

    // Calculate scrollbar width to prevent content shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [activeAlert, discardDialogVisible, repeatableModals.length, presentation]);

  // Flatten form elements for simplified mode
  const schemaForRender = finalSchema || schema;
  const titleField = schemaForRender?.form?.title_field || null;
  const statusField = schemaForRender?.form?.status_field || null;
  const baseElements = schemaForRender?.form?.elements || [];

  const headerFields = useMemo(() => {
    const fields = createTimestampMetadataFields();
    if (statusField && statusField.enabled !== false) {
      fields.push(statusField);
    }
    return fields;
  }, [statusField]);

  const statusFieldName = statusField?.data_name || null;

  const overrideStatusSignature = useMemo(() => {
    if (!statusFieldName || !overrideValues) {
      return '__no_override__';
    }
    if (!Object.prototype.hasOwnProperty.call(overrideValues, statusFieldName)) {
      return '__no_override__';
    }
    return JSON.stringify(overrideValues[statusFieldName]);
  }, [statusFieldName, overrideValues]);

  const initialStatusSignature = useMemo(() => {
    if (!statusFieldName || !initialValues) {
      return '__no_initial__';
    }
    if (!Object.prototype.hasOwnProperty.call(initialValues, statusFieldName)) {
      return '__no_initial__';
    }
    return JSON.stringify(initialValues[statusFieldName]);
  }, [statusFieldName, initialValues]);

  const computeStatusSourceValue = () => {
    if (!statusField || !statusFieldName) {
      return null;
    }
    if (overrideValues && Object.prototype.hasOwnProperty.call(overrideValues, statusFieldName)) {
      return overrideValues[statusFieldName];
    }
    if (initialValues && Object.prototype.hasOwnProperty.call(initialValues, statusFieldName)) {
      return initialValues[statusFieldName];
    }
    if (statusField.default_value !== undefined) {
      return statusField.default_value;
    }
    return null;
  };

  const [statusValue, setStatusValue] = useState(() => computeStatusSourceValue());

  const { timestamps, timestampsRef, touchUpdatedAt } = useRecordTimestamps({
    initialValues,
    overrideValues,
    values,
  });

  useEffect(() => {
    if (!statusField || !statusFieldName) {
      if (statusValue !== null) {
        setStatusValue(null);
      }
      return;
    }
    const next = computeStatusSourceValue();
    setStatusValue((prev) => (Object.is(prev, next) ? prev : next));
  }, [statusField, statusFieldName, overrideStatusSignature, initialStatusSignature]);

  const handleFieldValueChange = useCallback(
    (fieldDef, nextValue) => {
      if (!fieldDef?.data_name) return;
      const dataName = fieldDef.data_name;
      markFieldTouched(dataName);
      if (fieldDef.type === 'StatusField') {
        setStatusValue(nextValue ?? null);
      } else {
        setValue(dataName, nextValue);
      }
      markRootDirty();
      triggerEvent('change', dataName, { value: nextValue, field: fieldDef });
    },
    [markFieldTouched, markRootDirty, setStatusValue, setValue, triggerEvent]
  );

  const fieldLookup = useMemo(() => buildFieldLookup(baseElements), [baseElements]);

  const titleValue = useMemo(() => {
    if (!titleField || !Array.isArray(titleField.elements)) {
      return '';
    }

    const getChoiceLabel = (fieldDef, choice) => {
      if (!choice) return '';
      if (typeof choice.label === 'string' && choice.label.trim() !== '') {
        return choice.label.trim();
      }
      if (choice.value != null) {
        const match = (fieldDef.choices || []).find((c) => c.value === choice.value);
        if (match && typeof match.label === 'string' && match.label.trim() !== '') {
          return match.label.trim();
        }
        return String(choice.value);
      }
      return '';
    };

    const collectOtherEntries = (entries) => {
      if (!Array.isArray(entries) || entries.length === 0) return [];
      const results = [];
      for (const entry of entries) {
        if (!entry) continue;
        if (typeof entry === 'string') {
          const trimmed = entry.trim();
          if (trimmed) results.push(trimmed);
        } else if (typeof entry.label === 'string') {
          const trimmed = entry.label.trim();
          if (trimmed) results.push(trimmed);
        } else if (entry.value != null) {
          const valueString = String(entry.value).trim();
          if (valueString) results.push(valueString);
        }
      }
      return results;
    };

    const resolveSingleChoiceText = (fieldDef, value) => {
      if (value == null) return '';
      if (typeof value !== 'object') {
        return String(value).trim();
      }
      const labels = [];
      const choiceArray = Array.isArray(value.choice) ? value.choice : [];
      if (choiceArray.length > 0) {
        labels.push(getChoiceLabel(fieldDef, choiceArray[0]));
      }
      labels.push(...collectOtherEntries(value.other));
      return labels.filter(Boolean).join(', ');
    };

    const resolveMultiChoiceText = (fieldDef, value) => {
      if (value == null) return '';
      if (typeof value !== 'object') {
        return String(value).trim();
      }
      const labels = [];
      const choiceArray = Array.isArray(value.choices) ? value.choices : [];
      for (const choice of choiceArray) {
        labels.push(getChoiceLabel(fieldDef, choice));
      }
      labels.push(...collectOtherEntries(value.other));
      return labels.filter(Boolean).join(', ');
    };

    const parts = [];
    for (const ref of titleField.elements) {
      if (typeof ref !== 'string') continue;
      const referencedField =
        fieldLookup.byKey.get(ref) || fieldLookup.byDataName.get(ref);
      if (!referencedField || !referencedField.data_name) continue;
      const rawValue = values[referencedField.data_name];
      if (rawValue == null) continue;
      let text = '';
      if (referencedField.type === 'SingleChoiceField' || referencedField.type === 'BooleanField') {
        text = resolveSingleChoiceText(referencedField, rawValue);
      } else if (referencedField.type === 'MultiChoiceField') {
        text = resolveMultiChoiceText(referencedField, rawValue);
      } else if (
        typeof rawValue === 'string' ||
        typeof rawValue === 'number' ||
        typeof rawValue === 'boolean'
      ) {
        text = String(rawValue);
      } else if (rawValue instanceof Date) {
        text = rawValue.toISOString();
      } else if (rawValue && typeof rawValue === 'object' && 'value' in rawValue) {
        text = String(rawValue.value);
      }
      if (text && typeof text === 'string' && text.trim() !== '') {
        parts.push(text.trim());
      }
    }
    return parts.join(', ');
  }, [fieldLookup, titleField, values]);

  const recordTitleDisplay = useMemo(() => {
    if (!titleField) {
      return null;
    }
    const cleaned = typeof titleValue === 'string' ? titleValue.trim() : '';
    if (cleaned.length > 0) {
      return cleaned;
    }
    return 'Untitled';
  }, [titleField, titleValue]);

  const displayValues = useMemo(() => {
    let next = values;
    if (statusFieldName) {
      next = {
        ...next,
        [statusFieldName]: statusValue ?? null,
      };
    }
    if (titleField) {
      const titleValueForDisplay = recordTitleDisplay ?? 'Untitled';
      next = {
        ...next,
        [titleField.data_name]: titleValueForDisplay,
      };
    }
    // Add timestamp values for display in Record Metadata
    next = {
      ...next,
      created_at_client: timestamps.created_at_client,
      updated_at_client: timestamps.updated_at_client,
      created_at_server: timestamps.created_at_server,
      updated_at_server: timestamps.updated_at_server,
    };
    return next;
  }, [statusFieldName, statusValue, titleField, recordTitleDisplay, values, timestamps]);

  const recordStatusInfo = useMemo(() => {
    if (!statusField) {
      return null;
    }
    const fieldEnabled = statusField.enabled !== false;
    const choices = Array.isArray(statusField.choices) ? statusField.choices : [];
    const getChoice = (val) => choices.find((choice) => choice.value === val) || null;
    const effectiveValue =
      statusValue != null
        ? statusValue
        : statusField.default_value != null
        ? statusField.default_value
        : null;
    const selectedChoice = effectiveValue != null ? getChoice(effectiveValue) : null;
    const color = selectedChoice?.color || '#d4d4d8';
    const label = selectedChoice?.label || selectedChoice?.value || effectiveValue || '';
    return { color, label, disabled: !fieldEnabled };
  }, [statusField, statusValue]);

  const elementsForFlattening = baseElements;

  const flattenedElements = simplifiedMode
    ? flattenFormElements(elementsForFlattening)
    : [];
  const flattenedElementsLength = flattenedElements.length;

  const resolveFieldVisibility = useCallback(
    (field) => {
      if (!field || !field.data_name) {
        return false;
      }
      const key = field.data_name;
      if (Object.prototype.hasOwnProperty.call(visible, key)) {
        return visible[key] !== false;
      }
      return field.visible !== false;
    },
    [visible]
  );

  const resolveFieldReadOnly = useCallback(
    (field) => {
      if (!field || !field.data_name) {
        return false;
      }
      const key = field.data_name;
      if (Object.prototype.hasOwnProperty.call(read_only, key)) {
        return read_only[key] === true;
      }
      return field.read_only === true;
    },
    [read_only]
  );

  const resolveFieldRequired = useCallback(
    (field) => {
      if (!field || !field.data_name) {
        return false;
      }
      const key = field.data_name;
      if (Object.prototype.hasOwnProperty.call(required, key)) {
        return required[key];
      }
      return !!field.required;
    },
    [required]
  );

  const computeFieldError = useCallback(
    (field, fieldValue, fieldRequired) => {
      if (!field || !field.data_name) {
        return null;
      }
      const dataName = field.data_name;
      const engineError = errors[dataName];
      if (engineError) {
        return engineError;
      }
      if (!fieldRequired) {
        return null;
      }
      const shouldShowRequired =
        (isFieldTouched(dataName) || submitCount > 0) && isFieldValueEmpty(field, fieldValue);
      return shouldShowRequired ? 'This field is required' : null;
    },
    [errors, isFieldTouched, submitCount]
  );

  const validatableRootFields = useMemo(
    () =>
      collectValidatableFields(baseElements, {
        includeRepeatableChildren: false,
      }),
    [baseElements]
  );

  const buildRootValidationSummary = useCallback(
    () =>
      buildValidationSummary(validatableRootFields, {
        getValue: (field) => {
          if (!field?.data_name) {
            return null;
          }
          if (field.data_name === statusFieldName) {
            return statusValue ?? null;
          }
          return values[field.data_name];
        },
        isVisible: (field) => resolveFieldVisibility(field),
        isRequired: (field) => resolveFieldRequired(field),
        getError: (field) => errors[field.data_name],
      }),
    [
      errors,
      resolveFieldRequired,
      resolveFieldVisibility,
      statusFieldName,
      statusValue,
      validatableRootFields,
      values,
    ]
  );

  const rootValidationSummary = useMemo(
    () => buildRootValidationSummary(),
    [buildRootValidationSummary]
  );

  // Get current field in simplified mode
  const currentField = simplifiedMode && flattenedElementsLength > 0
    ? flattenedElements[currentFieldIndex] 
    : null;

  // Check if current field is visible
  const isCurrentFieldVisible = currentField ? resolveFieldVisibility(currentField) : true;

  const currentFieldRequired = currentField ? resolveFieldRequired(currentField) : false;
  const currentFieldValue = currentField ? displayValues[currentField.data_name] : null;
  const currentFieldError = currentField
    ? computeFieldError(currentField, currentFieldValue, currentFieldRequired)
    : null;
  const hasCurrentFieldError = currentField ? currentFieldError != null : false;
  const isCurrentFieldValid = currentField ? !hasCurrentFieldError : true;
  const currentFieldKey = currentField?.data_name ?? null;
  const debugIsLastField =
    simplifiedMode && flattenedElementsLength > 0
      ? currentFieldIndex === flattenedElementsLength - 1
      : false;

  const debugData = useMemo(
    () => ({
      values: displayValues,
      visible,
      read_only,
      required,
      errors,
      currentFieldIndex,
      currentField: currentFieldKey,
      isLastField: debugIsLastField,
      isCurrentFieldValid,
      hasCurrentFieldError,
      flattenedElementsLength,
    }),
    [
      displayValues,
      visible,
      read_only,
      required,
      errors,
      currentFieldIndex,
      currentFieldKey,
      debugIsLastField,
      isCurrentFieldValid,
      hasCurrentFieldError,
      flattenedElementsLength,
    ]
  );

  const debugText = useMemo(
    () =>
      JSON.stringify(
        debugData,
        (key, value) => {
          if (typeof value === 'string' && value.length > 160) {
            const visiblePart = value.slice(0, 120);
            const remaining = value.length - 120;
            return `${visiblePart}… (${remaining} more chars)`;
          }
          return value;
        },
        2
      ),
    [debugData]
  );

  const placementAllowsExit = EXIT_CAPABLE_PLACEMENTS.has(formPlacement);
  const isReadOnlyMode = interactionMode === 'readonly';
  const hasSubmitHandler = typeof onSubmit === 'function';
  const canSubmitForm = !isReadOnlyMode && hasSubmitHandler;
  const discardPromptEnabled = placementAllowsExit && typeof onRequestClose === 'function';
  const isOverlayNonRoot = placementAllowsExit && activeDrilldownPath.length > 0;

  const closeOverlayAfterSubmit = useCallback(() => {
    if (
      !autoCloseOverlayOnSubmit ||
      interactionMode === 'readonly' ||
      !placementAllowsExit ||
      typeof onRequestClose !== 'function'
    ) {
      return;
    }
    onRequestClose({ reason: 'submit-success' });
  }, [autoCloseOverlayOnSubmit, interactionMode, onRequestClose, placementAllowsExit]);

  const handleSubmit = useCallback(
    (e) => {
      if (e && typeof e.preventDefault === 'function') {
        e.preventDefault();
      }
      setSubmitCount((count) => count + 1);
      const validationSummary = rootValidationSummary;
      if (validationSummary?.hasErrors) {
        console.info('🚀 [RECORD SUBMIT] Starting record submission...');
        console.log('❌ [RECORD SUBMIT] Submission blocked due to validation errors');
        return;
      }
      if (onSubmit) {
        const submissionTimestamp = new Date().toISOString();
        touchUpdatedAt(submissionTimestamp);
        const submission = submit();
        const timestampSnapshot = {
          ...timestampsRef.current,
          updated_at_client: submissionTimestamp,
        };
        const submissionWithTimestamps = {
          ...submission,
          created_at: timestampSnapshot.created_at_client ?? null,
          updated_at: timestampSnapshot.updated_at_server ?? null,
          created_at_client: timestampSnapshot.created_at_client ?? null,
          updated_at_client: timestampSnapshot.updated_at_client ?? null,
          created_at_server: timestampSnapshot.created_at_server ?? null,
          updated_at_server: timestampSnapshot.updated_at_server ?? null,
        };
        const rawValues =
          statusFieldName && statusFieldName.length > 0
            ? { ...submissionWithTimestamps, [statusFieldName]: statusValue ?? null }
            : submissionWithTimestamps;

        let structuredRecord = rawValues;
        try {
          structuredRecord = createStructuredRecord(
            { values: rawValues, repeatable: cloneDeepSafe(repeatable) },
            flattenedSchemaFields,
            {
              fieldKeyMode,
              originalElements: finalSchema?.form?.elements || [],
              title_field: finalSchema?.form?.title_field || null,
              status_field: finalSchema?.form?.status_field || null,
              '@status': statusFieldName ? statusValue ?? null : undefined,
            }
          );
        } catch (err) {
          console.error('form0-react: failed to build structured record, falling back to raw values', err);
          structuredRecord = rawValues;
        }
        const meta = {
          repeatable: cloneDeepSafe(repeatable),
          timestamps: {
            created_at_client: timestampSnapshot?.created_at_client ?? null,
            updated_at_client: timestampSnapshot?.updated_at_client ?? null,
            created_at_server: timestampSnapshot?.created_at_server ?? null,
            updated_at_server: timestampSnapshot?.updated_at_server ?? null,
          },
          validationSummary,
          rawValues,
        };
        const submitReturn = onSubmit(structuredRecord, meta);
        if (submitReturn && typeof submitReturn.then === 'function') {
          submitReturn
            .then(() => {
              closeOverlayAfterSubmit();
            })
            .catch((error) => {
              //console.error('[form0-react] onSubmit promise rejected', error);
            });
        } else {
          closeOverlayAfterSubmit();
        }
      }
    },
    [
      rootValidationSummary,
      onSubmit,
      repeatable,
      statusFieldName,
      statusValue,
      submit,
      timestampsRef,
      touchUpdatedAt,
      closeOverlayAfterSubmit,
      flattenedSchemaFields,
      finalSchema,
      fieldKeyMode,
    ]
  );

  // Simplified mode navigation handlers
  const handleNext = () => {
    if (currentFieldIndex < flattenedElementsLength - 1) {
      const nextIndex = currentFieldIndex + 1;
      setCurrentFieldIndex(nextIndex);
      if (onSimplifiedNavigation) {
        onSimplifiedNavigation({
          type: 'next',
          currentIndex: currentFieldIndex,
          nextIndex,
          currentField,
          nextField: flattenedElements[nextIndex]
        });
      }
    }
  };

  const handleBack = () => {
    if (currentFieldIndex > 0) {
      const prevIndex = currentFieldIndex - 1;
      setCurrentFieldIndex(prevIndex);
      if (onSimplifiedNavigation) {
        onSimplifiedNavigation({
          type: 'back',
          currentIndex: currentFieldIndex,
          prevIndex,
          currentField,
          prevField: flattenedElements[prevIndex]
        });
      }
    }
  };

  // Handle Enter key for navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && simplifiedMode) {
      e.preventDefault();
      if (isCurrentFieldValid && !hasCurrentFieldError) {
        if (currentFieldIndex === flattenedElementsLength - 1) {
          // Submit on last field
          handleSubmit(e);
        } else {
          // Go to next field
          handleNext();
        }
      }
    }
  };

  // Global keyboard listener for simplified mode
  useEffect(() => {
    if (simplifiedMode) {
      const handleGlobalKeyDown = (e) => {
        if (e.key === 'Enter' && !e.target.matches('input, textarea, select')) {
          e.preventDefault();
          if (isCurrentFieldValid && !hasCurrentFieldError) {
            if (currentFieldIndex === flattenedElementsLength - 1) {
              // Submit on last field
              handleSubmit(e);
            } else {
              // Go to next field
              handleNext();
            }
          }
        }
      };

      document.addEventListener('keydown', handleGlobalKeyDown);
      return () => document.removeEventListener('keydown', handleGlobalKeyDown);
    }
  }, [simplifiedMode, currentFieldIndex, isCurrentFieldValid, hasCurrentFieldError, flattenedElementsLength]);

  const themeMap = {
    'standard-light': standardThemeLight,
    'standard-dark': standardThemeDark,
    'modal-light': modalThemeLight,
    'modal-dark': modalThemeDark,
    'simplified-light': simplifiedThemeLight,
    'simplified-dark': simplifiedThemeDark,
    'spotlight-light': spotlightThemeLight,
    'spotlight-dark': spotlightThemeDark,
  };

  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    if (colorMode === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      setSystemDark(mq.matches);
      const handler = (e) => setSystemDark(e.matches);
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [colorMode]);

  const effectiveColorMode = colorMode === 'system' ? (systemDark ? 'dark' : 'light') : colorMode;

  // If theme is a string, check if it's a named theme or a custom class name.
  let themeClass;
  if (typeof theme === 'string') {
    const effectiveThemeKey = `${theme}-${effectiveColorMode}`;
    // Check if it's a named theme (exists in themeMap)
    if (themeMap[effectiveThemeKey]) {
      themeClass = themeMap[effectiveThemeKey];
    } else {
      // Not a named theme, assume it's a custom theme class name
      themeClass = theme;
    }
  } else {
    // Assume it's a class name (custom theme)
    themeClass = theme;
  }

  const { sectionTree, sectionMetadata, fieldToSectionPath } = useMemo(
    () => buildSectionHierarchy(baseElements, resolveRepeatableKey),
    [baseElements, resolveRepeatableKey]
  );

  const [highlightedSections, setHighlightedSections] = useState([ROOT_NAV_NODE_ID]);
  const [navigationClickTimestamp, setNavigationClickTimestamp] = useState(0);
  const activeNavigationSectionId =
    highlightedSections.length > 0
      ? highlightedSections[highlightedSections.length - 1]
      : ROOT_NAV_NODE_ID;

  const activeDrilldownSectionId =
    activeDrilldownPath.length > 0 ? activeDrilldownPath[activeDrilldownPath.length - 1] : null;
  const activeDrilldownFullPath =
    activeDrilldownSectionId && sectionMetadata[activeDrilldownSectionId]
      ? sectionMetadata[activeDrilldownSectionId].path || []
      : [];
  const activeDrilldownSectionInfo = activeDrilldownSectionId
    ? sectionMetadata[activeDrilldownSectionId]
    : null;
  const isSpecialSectionActive =
    activeDrilldownSectionInfo && SPECIAL_SECTION_TYPES.has(activeDrilldownSectionInfo.type);
  const drilldownDepth = activeDrilldownPath.length;
  const isRootPage = drilldownDepth === 0;
  const isFirstSpecialPage = drilldownDepth === 1 && isSpecialSectionActive;
  const isNestedDrilldownPage = drilldownDepth > 0 && (!isSpecialSectionActive || drilldownDepth > 1);
  const isRepeatableFirstPage =
    isFirstSpecialPage && activeDrilldownSectionInfo?.type === 'RepeatableSection';
  const navigationSections = useMemo(() => {
    if (!sectionTree || sectionTree.length === 0) {
      return [];
    }

    const isRepeatableContextActive = activeDrilldownSectionInfo?.type === 'RepeatableSection';
    const shouldUseRootNavigation =
      !activeDrilldownSectionId || isRepeatableFirstPage || !isRepeatableContextActive;

    const contextNodes = shouldUseRootNavigation
      ? sectionTree
      : findSectionNodeById(sectionTree, activeDrilldownSectionId)?.children || [];
    const childNodes = buildNavigationNodes(contextNodes);

    return [
      {
        id: ROOT_NAV_NODE_ID,
        label: ROOT_NAV_LABEL,
        type: 'Root',
        children: childNodes,
      },
    ];
  }, [sectionTree, activeDrilldownSectionId, activeDrilldownSectionInfo?.type, isRepeatableFirstPage]);
  const hasNavigableSections = sectionTree.length > 0;
  const showRootValidationList = submitCount > 0 && rootValidationSummary?.hasErrors;
  const rootValidationIssues = useMemo(
    () =>
      showRootValidationList
        ? formatValidationIssues(rootValidationSummary, fieldLookup, fieldToSectionPath)
        : [],
    [
      fieldLookup,
      fieldToSectionPath,
      rootValidationSummary,
      showRootValidationList,
    ]
  );
  const showNavigationPanel = hasNavigableSections || showRootValidationList;

  const activeRepeatableListContext = useMemo(() => {
    // Standard RepeatableSection first page
    if (isRepeatableFirstPage) {
      const field = activeDrilldownSectionInfo?.field;
      const repeatableKey =
        activeDrilldownSectionInfo?.repeatableKey || resolveRepeatableKey(field);
      if (!field || !repeatableKey) {
        return null;
      }
      return {
        field,
        repeatableKey,
        parentPath: activeDrilldownSectionInfo?.repeatableParentPath || [],
        kind: 'repeatable',
      };
    }

    // BuildingPlanSection first page: map header Add to the Floors repeatable
    if (
      isFirstSpecialPage &&
      activeDrilldownSectionInfo?.type === 'BuildingPlanSection' &&
      activeDrilldownSectionInfo?.field
    ) {
      const bpField = activeDrilldownSectionInfo.field;
      const metaEntry = getBuildingPlanMetaEntry(buildingPlanMeta, bpField.data_name);
      const floorRepeatableKey = getBuildingPlanRepeatableKey(metaEntry, 'floors');

      const findFirstRepeatable = (nodes = []) => {
        for (const el of nodes || []) {
          if (!el) continue;
          if (el.type === 'RepeatableSection') return el;
          const found = findFirstRepeatable(el.elements || []);
          if (found) return found;
        }
        return null;
      };

      const floorField = findFirstRepeatable(bpField.elements || []);
      const repeatableKey = floorRepeatableKey || resolveRepeatableKey(floorField);

      if (!floorField || !repeatableKey) {
        return null;
      }

      return {
        field: floorField,
        repeatableKey,
        parentPath: [], // Floors live at the top of BuildingPlanSection
        kind: 'building-plan-floor',
      };
    }

    // BuildingPlanSection first page: treat similarly to repeatable for header controls
    if (
      isFirstSpecialPage &&
      activeDrilldownSectionInfo?.type === 'BuildingPlanSection' &&
      activeDrilldownSectionInfo?.field
    ) {
      const bpField = activeDrilldownSectionInfo.field;
      const metaEntry = getBuildingPlanMetaEntry(buildingPlanMeta, bpField.data_name);
      const floorRepeatableKey = getBuildingPlanRepeatableKey(metaEntry, 'floors');

      const findFirstRepeatable = (nodes = []) => {
        for (const el of nodes || []) {
          if (!el) continue;
          if (el.type === 'RepeatableSection') return el;
          const found = findFirstRepeatable(el.elements || []);
          if (found) return found;
        }
        return null;
      };

      const floorField = findFirstRepeatable(bpField.elements || []);
      const repeatableKey = floorRepeatableKey || resolveRepeatableKey(floorField);

      if (!floorField || !repeatableKey) {
        return null;
      }

      return {
        field: floorField,
        repeatableKey,
        parentPath: [], // Floors live at the top of BuildingPlanSection
        kind: 'building-plan-floor',
      };
    }

    return null;
  }, [
    activeDrilldownSectionInfo,
    buildingPlanMeta,
    isFirstSpecialPage,
    isRepeatableFirstPage,
    resolveRepeatableKey,
  ]);

  const handleRepeatableListAddFromHeader = useCallback(() => {
    if (!activeRepeatableListContext) {
      return;
    }
    const { field, repeatableKey, parentPath = [] } = activeRepeatableListContext;
    handleRepeatableAdd(field, repeatableKey, parentPath);
  }, [activeRepeatableListContext, handleRepeatableAdd]);

  const registerSectionNode = useCallback((sectionId, node) => {
    if (!sectionId) {
      return;
    }
    if (node) {
      sectionRefs.current.set(sectionId, node);
    } else {
      sectionRefs.current.delete(sectionId);
    }
  }, []);

  const registerFieldNode = useCallback((dataName, node) => {
    if (!dataName) {
      return;
    }
    if (node) {
      fieldRefs.current.set(dataName, node);
    } else {
      fieldRefs.current.delete(dataName);
    }
  }, []);

  const scrollSectionIntoView = useCallback((sectionId) => {
    const node = sectionRefs.current.get(sectionId);
    if (!node || typeof node.scrollIntoView !== 'function') {
      return false;
    }
    node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (typeof node.focus === 'function') {
      try {
        node.focus({ preventScroll: true });
      } catch {
        node.focus();
      }
    }
    return true;
  }, []);

  const scrollFieldIntoView = useCallback((dataName) => {
    if (!dataName) {
      return false;
    }
    const node = fieldRefs.current.get(dataName);
    if (!node) {
      return false;
    }
    if (typeof node.scrollIntoView === 'function') {
      node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (typeof node.focus === 'function') {
      try {
        node.focus({ preventScroll: true });
      } catch {
        node.focus();
      }
    }
    return true;
  }, []);

  const focusFieldByDataName = useCallback(
    (dataName) => {
      if (!dataName) return;
      const schedule =
        typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
          ? window.requestAnimationFrame
          : (cb) => setTimeout(cb, 16);
      schedule(() => {
        if (scrollFieldIntoView(dataName)) {
          return;
        }
        setTimeout(() => {
          scrollFieldIntoView(dataName);
        }, 120);
      });
    },
    [scrollFieldIntoView]
  );

  const focusSectionAfterNavigation = useCallback((sectionId) => {
    if (!sectionId) return;

    const attemptFocus = () => scrollSectionIntoView(sectionId);

    const schedule =
      typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
        ? window.requestAnimationFrame
        : (cb) => setTimeout(cb, 16);

    schedule(() => {
      if (attemptFocus()) return;
      setTimeout(attemptFocus, 80);
    });
  }, [scrollSectionIntoView]);

  const setHighlightedPath = useCallback((path = []) => {
    const normalizedPath =
      Array.isArray(path) && path.length > 0
        ? [ROOT_NAV_NODE_ID, ...path.filter((id) => id && id !== ROOT_NAV_NODE_ID)]
        : [ROOT_NAV_NODE_ID];
    setHighlightedSections(normalizedPath);
  }, []);

  const markNavigationInteraction = useCallback(() => {
    setNavigationClickTimestamp(Date.now());
  }, []);

  const setActiveDrilldownForSection = useCallback(
    (sectionId) => {
      const section = sectionMetadata[sectionId];
      if (!section) return;
      setActiveDrilldownPath(section.drilldownPath);
      setHighlightedPath(section.path);
    },
    [sectionMetadata, setHighlightedPath]
  );

  const handleNavigate = useCallback(
    (sectionId) => {
      if (sectionId === ROOT_NAV_NODE_ID) {
        setActiveDrilldownPath([]);
        setHighlightedPath([ROOT_NAV_NODE_ID]);
        markNavigationInteraction();
        return;
      }
      const section = sectionMetadata[sectionId];
      if (!section) {
        return;
      }
      if (section.display === 'drilldown') {
        setActiveDrilldownForSection(sectionId);
      } else {
        setActiveDrilldownPath(section.drilldownPath);
        setHighlightedPath(section.path);
      }
      markNavigationInteraction();
      focusSectionAfterNavigation(sectionId);
    },
    [
      focusSectionAfterNavigation,
      sectionMetadata,
      setActiveDrilldownForSection,
      setHighlightedPath,
      markNavigationInteraction,
    ]
  );

  const navigateToSectionForField = useCallback(
    (sectionPath = []) => {
      if (!Array.isArray(sectionPath) || sectionPath.length === 0) {
        return;
      }
      const targetSectionId = sectionPath[sectionPath.length - 1];
      if (!targetSectionId) {
        return;
      }
      const sectionInfo = sectionMetadata[targetSectionId];
      if (!sectionInfo) {
        return;
      }
      setActiveDrilldownPath(sectionInfo.drilldownPath);
      setHighlightedPath(sectionPath);
      focusSectionAfterNavigation(targetSectionId);
    },
    [focusSectionAfterNavigation, sectionMetadata, setActiveDrilldownPath, setHighlightedPath]
  );

  const handleFieldFocus = useCallback(
    (fieldDataName) => {
      const timeSinceNavClick = Date.now() - navigationClickTimestamp;
      if (timeSinceNavClick < 500) {
        return;
      }

      const sectionPath = fieldToSectionPath[fieldDataName];
      if (sectionPath && sectionPath.length > 0) {
        setHighlightedPath(sectionPath);
      } else {
        setHighlightedPath([]);
      }
    },
    [fieldToSectionPath, navigationClickTimestamp, setHighlightedPath]
  );

  const handleValidationIssueSelect = useCallback(
    (issue) => {
      if (!issue || !issue.fieldName) {
        return;
      }
      if (Array.isArray(issue.sectionPath) && issue.sectionPath.length > 0) {
        navigateToSectionForField(issue.sectionPath);
      }
      focusFieldByDataName(issue.fieldName);
    },
    [focusFieldByDataName, navigateToSectionForField]
  );

  const handleDrilldownBack = useCallback(
    (sectionId) => {
      const info = sectionMetadata[sectionId];
      if (!info) {
        setActiveDrilldownPath([]);
        setHighlightedPath([]);
        return;
      }
      const nextDrilldownPath = info.drilldownPath.slice(0, -1);
      setActiveDrilldownPath(nextDrilldownPath);
      const nextHighlightPath =
        info.path && info.path.length > 1 ? info.path.slice(0, -1) : [];
      setHighlightedPath(nextHighlightPath);
      markNavigationInteraction();
      const parentSectionId =
        info.path && info.path.length > 1 ? info.path[info.path.length - 2] : null;
      if (parentSectionId) {
        focusSectionAfterNavigation(parentSectionId);
      }
    },
    [focusSectionAfterNavigation, sectionMetadata, setHighlightedPath, markNavigationInteraction]
  );

  const submitFromHeader = useCallback(() => {
    handleSubmit({ preventDefault: () => {} });
  }, [handleSubmit]);

  const goBackFromDrilldown = useCallback(() => {
    if (activeDrilldownSectionId) {
      handleDrilldownBack(activeDrilldownSectionId);
    }
  }, [activeDrilldownSectionId, handleDrilldownBack]);

  const handleRootCancel = useCallback(() => {
    if (placementAllowsExit && typeof onRequestClose === 'function') {
      onRequestClose({ reason: 'root-cancel' });
    }
  }, [onRequestClose, placementAllowsExit]);

  const openDiscardDialog = useCallback(() => {
    if (!discardPromptEnabled) {
      return;
    }
    setDiscardDialogVisible(true);
  }, [discardPromptEnabled]);

  const shouldPromptOnRootCancel = useCallback(
    () => discardPromptEnabled && (hasRootChanges || touchedFieldsRef.current.size > 0),
    [discardPromptEnabled, hasRootChanges]
  );

  const requestRootCancel = useCallback(() => {
    if (shouldPromptOnRootCancel()) {
      openDiscardDialog();
      return;
    }
    handleRootCancel();
  }, [handleRootCancel, openDiscardDialog, shouldPromptOnRootCancel]);

  const closeDiscardDialog = useCallback(() => {
    setDiscardDialogVisible(false);
  }, []);

  const confirmDiscard = useCallback(() => {
    setDiscardDialogVisible(false);
    handleRootCancel();
  }, [handleRootCancel]);

  const headerActions = useMemo(() => {
    const disableRootCancel = !discardPromptEnabled;
    const primaryActionsAllowed = showPrimaryActionsInViewMode || !isReadOnlyMode;

    let leftAction = null;
    let rightAction = null;
    let secondaryRightAction = null;

    if (isNestedDrilldownPage || isRepeatableFirstPage || (isFirstSpecialPage && activeDrilldownSectionInfo?.type === 'BuildingPlanSection')) {
      leftAction = {
        id: 'back',
        label: 'Back',
        icon: ChevronLeft,
        onClick: goBackFromDrilldown,
        disabled: !activeDrilldownSectionId,
        shortcutLabel: getAltShortcutLabel('b'),
      };
    } else if (isFirstSpecialPage) {
      leftAction = {
        id: 'cancel-section',
        label: 'Cancel',
        icon: XCircle,
        onClick: goBackFromDrilldown,
      };
    } else if (isRootPage) {
      leftAction = {
        id: 'cancel-root',
        label: 'Cancel',
        icon: XCircle,
        onClick: disableRootCancel ? undefined : requestRootCancel,
        disabled: disableRootCancel,
        shortcutLabel: disableRootCancel ? null : getAltShortcutLabel('q'),
      };
    }

  const canShowRepeatableAdd =
    primaryActionsAllowed &&
    isFirstSpecialPage &&
    Boolean(activeRepeatableListContext) &&
    (activeRepeatableListContext.kind === 'repeatable' ||
      activeRepeatableListContext.kind === 'building-plan-floor');

    if (canShowRepeatableAdd) {
      const addLabel =
        activeRepeatableListContext?.kind === 'building-plan-floor' ? 'Add Floor' : 'Add';
      rightAction = {
        id: 'add-repeatable',
        label: addLabel,
        icon: Plus,
        variant: 'primary',
        onClick: isReadOnlyMode ? undefined : handleRepeatableListAddFromHeader,
        disabled: isReadOnlyMode,
        shortcutLabel: getAltShortcutLabel('a'),
      };
    } else if (
      primaryActionsAllowed &&
      isFirstSpecialPage &&
      !isRepeatableFirstPage &&
      hasSubmitHandler
    ) {
      rightAction = {
        id: 'save-section',
        label: 'Save',
        icon: Save,
        variant: 'primary',
        disabled: !canSubmitForm,
        onClick: canSubmitForm ? submitFromHeader : undefined,
      };
    } else if (primaryActionsAllowed && isRootPage && hasSubmitHandler) {
      rightAction = {
        id: 'submit',
        label: 'Submit',
        icon: SendHorizontal,
        variant: 'primary',
        disabled: !canSubmitForm,
        onClick: canSubmitForm ? submitFromHeader : undefined,
        shortcutLabel: getAltShortcutLabel('s'),
      };
    }

    if (mode === 'readonly' && isReadOnlyMode) {
      secondaryRightAction = {
        id: 'enter-edit-mode',
        label: 'Edit',
        icon: Pencil,
        variant: 'edit',
        onClick: enterEditMode,
        shortcutLabel: getAltShortcutLabel('m'),
      };
    }

    return { leftAction, rightAction, secondaryRightAction };
  }, [
    activeDrilldownSectionId,
    activeRepeatableListContext,
    canSubmitForm,
    enterEditMode,
    getAltShortcutLabel,
    discardPromptEnabled,
    goBackFromDrilldown,
    handleRepeatableListAddFromHeader,
    hasSubmitHandler,
    isFirstSpecialPage,
    isNestedDrilldownPage,
    isRepeatableFirstPage,
    isRootPage,
    isReadOnlyMode,
    mode,
    showPrimaryActionsInViewMode,
    requestRootCancel,
    submitFromHeader,
  ]);

  useLayoutEffect(() => {
    const measurePadding = () => {
      const leftWidth =
        leftActionRef.current && leftActionRef.current.offsetWidth
          ? leftActionRef.current.offsetWidth
          : 0;
      const rightWidth =
        rightActionRef.current && rightActionRef.current.offsetWidth
          ? rightActionRef.current.offsetWidth
          : 0;
      setActionPadding((prev) => {
        const next = {
          left: Math.max(leftWidth, 0),
          right: Math.max(rightWidth, 0),
        };
        if (prev.left === next.left && prev.right === next.right) {
          return prev;
        }
        return next;
      });
    };

    if (typeof window === 'undefined') {
      return undefined;
    }

    measurePadding();

    if (typeof ResizeObserver === 'function') {
      const observer = new ResizeObserver(measurePadding);
      if (leftActionRef.current) {
        observer.observe(leftActionRef.current);
      }
      if (rightActionRef.current) {
        observer.observe(rightActionRef.current);
      }
      window.addEventListener('resize', measurePadding);
      return () => {
        observer.disconnect();
        window.removeEventListener('resize', measurePadding);
      };
    }

    window.addEventListener('resize', measurePadding);
    return () => {
      window.removeEventListener('resize', measurePadding);
    };
  }, [headerActions]);

  const currentLeftAction = headerActions.leftAction;
  const currentRightAction = headerActions.rightAction;
  const currentSecondaryRightAction = headerActions.secondaryRightAction;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const isPlainAlt = (event) =>
      event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;

    const matchesKey = (event, code, fallbackKey) => {
      const eventCode = typeof event.code === 'string' ? event.code : '';
      if (eventCode) {
        return eventCode === code;
      }
      if (!fallbackKey) {
        return false;
      }
      const normalizedKey = typeof event.key === 'string' ? event.key.toLowerCase() : '';
      return normalizedKey === fallbackKey;
    };

    const handleKeyDown = (event) => {
      if (event.defaultPrevented) {
        return;
      }

      if (discardDialogVisible) {
        if (isPlainAlt(event) && matchesKey(event, 'KeyQ', 'q')) {
          event.preventDefault();
          event.stopPropagation();
          closeDiscardDialog();
          return;
        }
        if (isPlainAlt(event) && matchesKey(event, 'KeyY', 'y')) {
          event.preventDefault();
          confirmDiscard();
          return;
        }
        if (event.key === 'Escape' && placementAllowsExit) {
          event.preventDefault();
          event.stopPropagation();
        }
        return;
      }

      if (event.key === 'Escape') {
        if (placementAllowsExit) {
          event.preventDefault();
          event.stopPropagation();
        }
        return;
      }

      if (repeatableModals.length > 0) {
        return;
      }

      const plainAlt = isPlainAlt(event);

      if (
        plainAlt &&
        matchesKey(event, 'KeyQ', 'q') &&
        currentLeftAction &&
        currentLeftAction.id === 'cancel-root' &&
        !currentLeftAction.disabled
      ) {
        event.preventDefault();
        event.stopPropagation();
        requestRootCancel();
        return;
      }

      if (!plainAlt) {
        return;
      }

      if (
        matchesKey(event, 'KeyB', 'b') &&
        currentLeftAction &&
        currentLeftAction.id === 'back' &&
        !currentLeftAction.disabled
      ) {
        event.preventDefault();
        goBackFromDrilldown();
        return;
      }

      if (
        matchesKey(event, 'KeyS', 's') &&
        currentRightAction &&
        currentRightAction.id === 'submit' &&
        !currentRightAction.disabled
      ) {
        event.preventDefault();
        submitFromHeader();
        return;
      }

      if (
        matchesKey(event, 'KeyA', 'a') &&
        currentRightAction &&
        currentRightAction.id === 'add-repeatable' &&
        !currentRightAction.disabled
      ) {
        event.preventDefault();
        if (typeof currentRightAction.onClick === 'function') {
          currentRightAction.onClick();
        }
        return;
      }

      if (
        matchesKey(event, 'KeyM', 'm') &&
        currentSecondaryRightAction &&
        currentSecondaryRightAction.id === 'enter-edit-mode'
      ) {
        event.preventDefault();
        if (typeof currentSecondaryRightAction.onClick === 'function') {
          currentSecondaryRightAction.onClick();
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [
    closeDiscardDialog,
    confirmDiscard,
    currentLeftAction,
    currentRightAction,
    currentSecondaryRightAction,
    discardDialogVisible,
    goBackFromDrilldown,
    requestRootCancel,
    placementAllowsExit,
    repeatableModals.length,
    submitFromHeader,
  ]);

  const renderFormName = useCallback(() => {
    const formName = schemaForRender?.form?.name;
    if (!formName) {
      return null;
    }

    const { leftAction, rightAction } = headerActions;
    const paddingLeft = Math.max(actionPadding.left + 12, MIN_TITLE_PADDING_PX);
    const paddingRight = Math.max(actionPadding.right + 12, MIN_TITLE_PADDING_PX);
    const titlePaddingStyle = {
      '--form-name-title-padding-left': `${paddingLeft}px`,
      '--form-name-title-padding-right': `${paddingRight}px`,
    };

    const renderActionButtons = (actions, position, slotRef) => {
      const items = Array.isArray(actions)
        ? actions.filter(Boolean)
        : actions
        ? [actions]
        : [];
      const slotClassName =
        position === 'left'
          ? `${styles.formNameActionSlot} ${styles.formNameActionSlotLeft}`
          : `${styles.formNameActionSlot} ${styles.formNameActionSlotRight}`;
      return (
        <div
          ref={slotRef}
          className={slotClassName}
          aria-hidden={items.length === 0 ? 'true' : undefined}
        >
          {items.map((action) => {
            const IconComponent = action.icon;
            return (
              <button
                key={action.id || action.label}
                type="button"
                className={styles.formNameActionButton}
                data-variant={action.variant || 'ghost'}
                onClick={action.onClick}
                disabled={action.disabled}
              >
                {IconComponent && (
                  <span className={styles.formNameActionIcon} aria-hidden="true">
                    <IconComponent size={16} strokeWidth={1.8} />
                  </span>
                )}
                <span className={styles.formNameActionLabel}>
                  <span>{action.label}</span>
                  {action.shortcutLabel ? (
                    <span className={styles.shortcutBadge} aria-hidden="true">
                      {action.shortcutLabel}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      );
    };

    return (
      <div className={styles.formNameContainer} role="heading" aria-level="2">
        {renderActionButtons(leftAction, 'left', leftActionRef)}
        <div
          className={styles.formNameTitle}
          title={formName}
          aria-label={formName}
          style={titlePaddingStyle}
        >
          {formName}
        </div>
        {renderActionButtons(
          [headerActions.secondaryRightAction, rightAction],
          'right',
          rightActionRef
        )}
      </div>
    );
  }, [actionPadding, headerActions, schemaForRender]);

  const renderRecordSummary = useCallback(() => {
    if (!recordTitleDisplay && !recordStatusInfo) {
      return null;
    }
    const titleText = recordTitleDisplay || 'Untitled';
    const statusColor = recordStatusInfo?.color || '#d4d4d8';
    const statusLabel = recordStatusInfo?.label
      ? `Status: ${recordStatusInfo.label}${recordStatusInfo?.disabled ? ' (disabled)' : ''}`
      : recordStatusInfo?.disabled
      ? 'Status disabled'
      : undefined;
    const statusBadgeClass = recordStatusInfo?.disabled
      ? styles.recordSummaryStatusDisabled
      : styles.recordSummaryStatus;
    const statusBadgeStyle =
      recordStatusInfo?.disabled || !statusColor ? undefined : { backgroundColor: statusColor };

    return (
      <div className={styles.recordSummary} role="group" aria-label="Record summary">
        <span
          className={statusBadgeClass}
          style={statusBadgeStyle}
          {...(statusLabel ? { role: 'img', 'aria-label': statusLabel } : { 'aria-hidden': 'true' })}
        />
        <div className={styles.recordSummaryContent}>
          <div className={styles.recordSummaryTitle}>{titleText}</div>
        </div>
      </div>
    );
  }, [recordStatusInfo, recordTitleDisplay]);

  const renderRecordMetadata = useCallback(() => {
    if (!headerFields || headerFields.length === 0) {
      return null;
    }
    if (activeDrilldownPath.length > 0 || insideSpecialSectionRef.current) {
      return null;
    }

    const metadataFields = headerFields
      .map((field) => {
        if (!field || !field.data_name) {
          return null;
        }
        if (!resolveFieldVisibility(field)) {
          return null;
        }
        const fieldRequired = resolveFieldRequired(field);
        const fieldValue = displayValues[field.data_name];
        const fieldReadOnly =
          isReadOnlyMode ||
          resolveFieldReadOnly(field) ||
          field.type === 'TitleField';
        const fieldError = computeFieldError(field, fieldValue, fieldRequired);
        const handleFieldChange =
          field.type === 'TitleField' ? undefined : (val) => handleFieldValueChange(field, val);

        return (
          <FieldRenderer
            key={field.key || field.data_name}
            ref={field.data_name ? (node) => registerFieldNode(field.data_name, node) : null}
            field={field}
            value={fieldValue}
            readOnly={fieldReadOnly}
            required={fieldRequired}
            error={fieldError}
            showError={false}
            onChange={handleFieldChange}
            onFocus={() => handleFieldFocus(field.data_name)}
            labelPosition={labelPosition}
            labelWidthPercent={labelWidthPercent}
          />
        );
      })
      .filter(Boolean);

    if (metadataFields.length === 0) {
      return null;
    }

    return (
      <section
        className={`${styles.recordMetadataSection} ${styles.recordMetadata}`}
        aria-label="Record Metadata"
      >
        <h3 className={styles.sectionHeader}>Record Metadata</h3>
        <div className={styles.recordMetadataFields}>{metadataFields}</div>
      </section>
    );
  }, [
    headerFields,
    resolveFieldVisibility,
    resolveFieldRequired,
    displayValues,
    isReadOnlyMode,
    resolveFieldReadOnly,
    computeFieldError,
    handleFieldValueChange,
    handleFieldFocus,
    labelWidthPercent,
    labelPosition,
    activeDrilldownPath.length,
  ]);

  const formNameNode = renderFormName();
  const recordSummaryNode = renderRecordSummary();
  const stickyHeaderContent =
    formNameNode || recordSummaryNode ? (
      <div className={styles.stickyHeader} role="region" aria-label="Form summary">
        <div className={`${styles.headerSection} ${themeClass}`}>
          {formNameNode}
          {recordSummaryNode}
        </div>
      </div>
    ) : null;
  const recordMetadataSection = simplifiedMode ? null : renderRecordMetadata();
  const modeBannerNode = <ModeBanner mode={interactionMode} />;

  const discardDialogNode =
    discardDialogVisible && blockingPortalTarget
      ? createPortal(
          <div
            className={styles.alertOverlay}
            role="dialog"
            aria-modal="true"
            aria-labelledby="form0-react-discard-title"
            aria-describedby="form0-react-discard-message"
          >
            <div
              className={`${styles.alertDialog} ${themeClass}`}
              ref={discardDialogRef}
              tabIndex={-1}
            >
              <h3 id="form0-react-discard-title" className={styles.alertTitle}>
                This record has unsaved changes
              </h3>
              <p id="form0-react-discard-message" className={styles.alertMessage}>
                Are you sure you want to discard any changes?
              </p>
              <div className={styles.confirmDialogActions}>
                <button
                  type="button"
                  className={styles.confirmSecondaryButton}
                  ref={discardCancelButtonRef}
                  onClick={closeDiscardDialog}
                >
                  Cancel
                  <span className={styles.shortcutBadge} aria-hidden="true">
                    {getAltShortcutLabel('q')}
                  </span>
                </button>
                <button
                  type="button"
                  className={styles.confirmPrimaryButton}
                  onClick={confirmDiscard}
                >
                  Yes, discard
                  <span className={styles.shortcutBadge} aria-hidden="true">
                    {getAltShortcutLabel('y')}
                  </span>
                </button>
              </div>
            </div>
          </div>,
          blockingPortalTarget
        )
      : null;

  // Simplified mode rendering
  if (simplifiedMode) {
    if (!currentField) {
      return (
        <div className={`${styles.form} ${themeClass} ${className}`} {...rest}>
          <p>No fields to display</p>
        </div>
      );
    }

    const isLastField = currentFieldIndex === flattenedElementsLength - 1;

    const currentFieldValue = displayValues[currentField.data_name];
    const currentFieldReadOnly =
      isReadOnlyMode ||
      resolveFieldReadOnly(currentField) ||
      currentField.type === 'TitleField';
    const currentFieldChangeHandler =
      currentField.type === 'TitleField'
        ? undefined
        : (val) => handleFieldValueChange(currentField, val);

    return (
      <ThemeProvider themeClass={themeClass}>
        <form
          onSubmit={handleSubmit}
          className={`${styles.form} ${themeClass} ${className}`}
          onKeyDown={handleKeyDown}
          style={{ maxWidth: formWidth, width: '100%' }}
          {...rest}
        >
          {modeBannerNode}
          {stickyHeaderContent}
          {/* Progress indicator */}
          <div className={styles.simplifiedProgress}>
            Question {currentFieldIndex + 1} of {flattenedElementsLength}
          </div>

          {/* Current field */}
          {isCurrentFieldVisible && (
            <FieldRenderer
              key={currentField.key || currentField.data_name}
              ref={currentField.data_name ? (node) => registerFieldNode(currentField.data_name, node) : null}
              field={currentField}
              value={currentFieldValue}
              readOnly={currentFieldReadOnly}
              required={currentFieldRequired}
              error={currentFieldError}
              onChange={currentFieldChangeHandler}
              onKeyDown={handleKeyDown}
              labelPosition="top"
              labelWidthPercent={100}
            />
          )}

          {/* Navigation buttons */}
          <div className={styles.simplifiedNavigation}>
            <button
              type="button"
              onClick={handleBack}
              disabled={currentFieldIndex === 0}
              className={`${styles.simplifiedButton} ${currentFieldIndex === 0 ? styles.simplifiedButtonDisabled : ''}`}
            >
              ← Back
            </button>

            {isLastField ? (
              <button
                type="submit"
                className={`${styles.simplifiedButton} ${(!isCurrentFieldValid || hasCurrentFieldError) ? styles.simplifiedButtonDisabled : ''}`}
                disabled={!isCurrentFieldValid || hasCurrentFieldError}
              >
                Submit
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                disabled={!isCurrentFieldValid || hasCurrentFieldError}
                className={`${styles.simplifiedButton} ${(!isCurrentFieldValid || hasCurrentFieldError) ? styles.simplifiedButtonDisabled : ''}`}
              >
                Next →
              </button>
            )}
          </div>

          {debug && <pre className={styles.debugPanel}>{debugText}</pre>}
        </form>

        {activeAlert && blockingPortalTarget && createPortal(
          <div
            className={styles.alertOverlay}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="form0-react-alert-title"
            aria-describedby="form0-react-alert-message"
          >
            <div
              className={`${styles.alertDialog} ${themeClass}`}
              ref={alertDialogRef}
              tabIndex={-1}
            >
              <button
                type="button"
                className={styles.alertCloseButton}
                aria-label="Close alert"
                onClick={closeAlert}
              >
                ×
              </button>
              <h3 id="form0-react-alert-title" className={styles.alertTitle}>
                {activeAlert.title}
              </h3>
              <div id="form0-react-alert-message" className={styles.alertMessage}>
                {activeAlert.message || ''}
              </div>
              <div className={styles.alertFooter}>
                <button
                  type="button"
                  ref={alertOkButtonRef}
                  className={styles.alertOkButton}
                  onClick={closeAlert}
                >
                  OK
                </button>
              </div>
            </div>
          </div>,
          blockingPortalTarget
        )}
        {discardDialogNode}
      </ThemeProvider>
    );
  }

  const pathsEqual = useCallback((a = [], b = []) => {
    if (!Array.isArray(a) || !Array.isArray(b)) {
      return false;
    }
    if (a.length !== b.length) {
      return false;
    }
    return a.every(
      (segment, index) =>
        segment &&
        b[index] &&
        segment.key === b[index].key &&
        segment.id === b[index].id
    );
  }, []);

  const renderRepeatableSectionNode = useCallback(
    (field, parentSectionPath, repeatableContextPath) => {
      const sectionId = field.data_name || field.key;
      const repeatableKey = resolveRepeatableKey(field);
      if (!sectionId || !repeatableKey) {
        return null;
      }

      const sectionInfo = sectionMetadata[sectionId];
      const drilldownPath = sectionInfo?.drilldownPath ?? [];
      const isDescendantOfActive =
        activeDrilldownPath.length > 0
          ? isPathPrefix(activeDrilldownPath, drilldownPath)
          : false;
      const isOnActivePath = isPathPrefix(drilldownPath, activeDrilldownPath);
      const isCurrentLevelActive =
        isOnActivePath && drilldownPath.length === activeDrilldownPath.length;

      if (activeDrilldownPath.length > 0 && !isOnActivePath && !isDescendantOfActive) {
        return null;
      }

      const instances = formRepeatableController.getInstances(
        repeatableKey,
        repeatableContextPath
      );
      const overlayActive = repeatableModals.some(
        (modal) =>
          modal.sectionId === sectionId &&
          pathsEqual(modal.parentPath || [], repeatableContextPath)
      );

      if (!isCurrentLevelActive) {
        const label = field.label || 'Repeatable Section';
        const instanceCount = Array.isArray(instances) ? instances.length : 0;
        const countLabel = `${instanceCount} item${instanceCount === 1 ? '' : 's'}`;
        const countPillClass =
          instanceCount === 0
            ? `${styles.repeatableCountPill} ${styles.repeatableCountPillEmpty}`
            : `${styles.repeatableCountPill} ${styles.repeatableCountPillFilled}`;
        return (
          <div key={sectionId} className={styles.drilldownInactive}>
            <div className={styles.drilldownInfo}>
              <span className={styles.drilldownLabel}>{label}</span>
              <span className={countPillClass}>{countLabel}</span>
            </div>
            <button
              type="button"
              className={`${styles.formNameActionButton} ${styles.drilldownActionButton}`}
              onClick={() => {
                setActiveDrilldownForSection(sectionId);
                markNavigationInteraction();
                focusSectionAfterNavigation(sectionId);
              }}
            >
              <span>View</span>
              <span className={styles.formNameActionIcon} aria-hidden="true">
                <ChevronRight size={16} strokeWidth={1.8} />
              </span>
            </button>
          </div>
        );
      }

      return (
        <RepeatableSectionList
          key={sectionId}
          field={field}
          instances={instances}
          readOnly={isReadOnlyMode}
          overlayActive={overlayActive}
          onAdd={() => handleRepeatableAdd(field, repeatableKey, repeatableContextPath)}
          onEdit={(instanceId) =>
            handleRepeatableEdit(field, repeatableKey, instanceId, repeatableContextPath)
          }
          onRemove={(instanceId) =>
            handleRepeatableRemove(repeatableKey, instanceId, repeatableContextPath)
          }
        />
      );
    },
    [
      activeDrilldownPath,
      focusSectionAfterNavigation,
      formRepeatableController,
      handleRepeatableAdd,
      handleRepeatableEdit,
      handleRepeatableRemove,
      markNavigationInteraction,
      isReadOnlyMode,
      pathsEqual,
      repeatableModals,
      resolveRepeatableKey,
      sectionMetadata,
      setActiveDrilldownForSection,
    ]
  );

  function renderBuildingPlanSectionNode(field, parentSectionPath, repeatableContextPath) {
    const sectionId = field.data_name || field.key;
    if (!sectionId) return null;

    const sectionInfo = sectionMetadata[sectionId];
    const drilldownPath = sectionInfo?.drilldownPath ?? [];
    const isDescendantOfActive =
      activeDrilldownPath.length > 0
        ? isPathPrefix(activeDrilldownPath, drilldownPath)
        : false;
    const isOnActivePath = isPathPrefix(drilldownPath, activeDrilldownPath);
    const isCurrentLevelActive =
      isOnActivePath && drilldownPath.length === activeDrilldownPath.length;

    if (activeDrilldownPath.length > 0 && !isOnActivePath && !isDescendantOfActive) {
      return null;
    }

    const metaEntry = getBuildingPlanMetaEntry(buildingPlanMeta, field.data_name);
    const floorKey = getBuildingPlanRepeatableKey(metaEntry, BP_NODE_KEYS.floors);
    const floorInstances =
      floorKey && repeatable?.[floorKey] && Array.isArray(repeatable[floorKey])
        ? repeatable[floorKey]
        : [];
    const floorCount = floorInstances.length;
    const countLabel = `${floorCount} floor${floorCount === 1 ? '' : 's'}`;
    const countPillClass =
      floorCount === 0
        ? `${styles.repeatableCountPill} ${styles.repeatableCountPillEmpty}`
        : `${styles.repeatableCountPill} ${styles.repeatableCountPillFilled}`;

    if (!isCurrentLevelActive) {
      const label = field.label || 'Building Plan';
      return (
        <div key={sectionId} className={styles.drilldownInactive}>
          <div className={styles.drilldownInfo}>
            <span className={styles.drilldownLabel}>{label}</span>
            <span className={countPillClass}>{countLabel}</span>
          </div>
          <button
            type="button"
            className={`${styles.formNameActionButton} ${styles.drilldownActionButton}`}
            onClick={() => {
              setActiveDrilldownForSection(sectionId);
              markNavigationInteraction();
              focusSectionAfterNavigation(sectionId);
            }}
          >
            <span>View</span>
            <span className={styles.formNameActionIcon} aria-hidden="true">
              <ChevronRight size={16} strokeWidth={1.8} />
            </span>
          </button>
        </div>
      );
    }

    // Resolve floor repeatable for actions (reuse metaEntry/floorKey above)
    const findFirstRepeatable = (nodes = []) => {
      for (const el of nodes || []) {
        if (!el) continue;
        if (el.type === 'RepeatableSection') return el;
        const found = findFirstRepeatable(el.elements || []);
        if (found) return found;
      }
      return null;
    };
    const floorField = findFirstRepeatable(field.elements || []);

    const handleViewFloor = (floorId) => {
      if (!floorField || !floorKey) return;
      handleRepeatableEdit(floorField, floorKey, floorId, repeatableContextPath);
    };

    const handleRemoveFloor = (floorId) => {
      if (!floorKey) return;
      handleRepeatableRemove(floorKey, floorId, repeatableContextPath);
    };

    const repeatableApi = {
      addInstance: (repeatableKey, options = {}) =>
        addRepeatableInstance(repeatableKey, options),
      updateInstance: (repeatableKey, instanceId, updater, parentPath = []) =>
        updateRepeatableInstance(repeatableKey, instanceId, updater, parentPath),
      removeInstance: (repeatableKey, instanceId, parentPath = []) =>
        removeRepeatableInstance(repeatableKey, instanceId, parentPath),
      setInstances: (repeatableKey, instances = [], parentPath = []) =>
        setRepeatableInstances(repeatableKey, instances, parentPath),
      getInstances: (repeatableKey, parentPath = []) =>
        getRepeatableInstances(repeatableKey, parentPath),
    };

    return (
      <BuildingPlanSectionView
        key={sectionId}
        section={field}
        buildingPlanMeta={buildingPlanMeta}
        repeatableState={repeatable}
        repeatableApi={repeatableApi}
        onViewFloor={handleViewFloor}
        onRemoveFloor={handleRemoveFloor}
      />
    );
  }

  function renderElements(
    elements = [],
    parentSectionPath = [],
    insideSpecialSection = false,
    repeatableContextPath = []
  ) {
    // Update the ref based on whether we're inside a special section
    insideSpecialSectionRef.current = insideSpecialSection;

    return elements.map((field) => {
      if (!field) return null;

      if (activeDrilldownSectionId) {
        if (field.type === 'Section' || field.type === 'RepeatableSection' || field.type === 'BuildingPlanSection') {
          const sectionId = field.data_name || field.key;
          if (!sectionId) {
            return null;
          }
          const sectionPath = [...parentSectionPath, sectionId];
          const isAncestorOfActive =
            sectionId !== activeDrilldownSectionId && activeDrilldownFullPath.includes(sectionId);
          const isWithinActiveBranch = sectionPath.includes(activeDrilldownSectionId);

          if (!isAncestorOfActive && !isWithinActiveBranch) {
            return null;
          }

          if (isAncestorOfActive) {
            const isSpecialType = field.type === 'RepeatableSection' || field.type === 'BuildingPlanSection';
            return (
              <React.Fragment key={sectionId}>
                {renderElements(
                  field.elements || [],
                  sectionPath,
                  insideSpecialSection || isSpecialType,
                  repeatableContextPath
                )}
              </React.Fragment>
            );
          }

          // fall through to normal section rendering when within active branch
        } else if (!parentSectionPath.includes(activeDrilldownSectionId)) {
          return null;
        }
      }

      if (field.type === 'RepeatableSection') {
        return renderRepeatableSectionNode(field, parentSectionPath, repeatableContextPath);
      }

      // Handle BuildingPlanSection
      if (field.type === 'BuildingPlanSection') {
        return renderBuildingPlanSectionNode(field, parentSectionPath, repeatableContextPath);
      }

      if (field.type === 'Section') {
        const sectionId = field.data_name || field.key;
        const display = field.display || 'inline';

        if (!sectionId) {
          return (
            <React.Fragment key={field.key || Math.random()}>
              {renderElements(
                field.elements || [],
                parentSectionPath,
                insideSpecialSection,
                repeatableContextPath
              )}
            </React.Fragment>
          );
        }

        const sectionPath = [...parentSectionPath, sectionId];
        const sectionInfo = sectionMetadata[sectionId];
        const drilldownPath = sectionInfo?.drilldownPath ?? [];
        const isDescendantOfActive =
          activeDrilldownPath.length > 0
            ? isPathPrefix(activeDrilldownPath, drilldownPath)
            : false;

        if (display === 'drilldown') {
          const isOnActivePath = isPathPrefix(drilldownPath, activeDrilldownPath);
          const isCurrentLevelActive =
            isOnActivePath && drilldownPath.length === activeDrilldownPath.length;

          if (activeDrilldownPath.length > 0 && !isOnActivePath && !isDescendantOfActive) {
            return null;
          }

          const shouldRenderPreviewState =
            !isOnActivePath && (!activeDrilldownPath.length || isDescendantOfActive);

          if (shouldRenderPreviewState) {
            return (
              <div key={sectionId} className={styles.drilldownInactive}>
                <span className={styles.drilldownLabel}>{field.label}</span>
                <button
                  type="button"
                  className={`${styles.formNameActionButton} ${styles.drilldownActionButton}`}
                  onClick={() => {
                    setActiveDrilldownForSection(sectionId);
                    markNavigationInteraction();
                    focusSectionAfterNavigation(sectionId);
                  }}
                >
                  <span>View</span>
                  <span className={styles.formNameActionIcon} aria-hidden="true">
                    <ChevronRight size={16} strokeWidth={1.8} />
                  </span>
                </button>
              </div>
            );
          }

          if (!isCurrentLevelActive) {
            return (
              <React.Fragment key={sectionId}>
                {renderElements(
                  field.elements || [],
                  sectionPath,
                  insideSpecialSection,
                  repeatableContextPath
                )}
              </React.Fragment>
            );
          }

          return (
            <div
              key={sectionId}
            className={styles.drilldownActive}
            ref={(node) => registerSectionNode(sectionId, node)}
            tabIndex={-1}
          >
            <h3 className={styles.sectionHeader}>{field.label}</h3>
            {renderElements(
              field.elements || [],
              sectionPath,
              insideSpecialSection,
              repeatableContextPath
            )}
          </div>
        );
      }

        return (
          <div
            key={sectionId}
          className={styles.section}
          ref={(node) => registerSectionNode(sectionId, node)}
          tabIndex={-1}
        >
          <h3 className={styles.sectionHeader}>{field.label}</h3>
          {renderElements(
            field.elements || [],
            sectionPath,
            insideSpecialSection,
            repeatableContextPath
          )}
        </div>
      );
    }

      if (!resolveFieldVisibility(field)) {
        return null;
      }

      const fieldRequired = resolveFieldRequired(field);
      const fieldValue = displayValues[field.data_name];
      const fieldReadOnly =
        isReadOnlyMode ||
        resolveFieldReadOnly(field) ||
        field.type === 'TitleField';
      const fieldError = computeFieldError(field, fieldValue, fieldRequired);
      const handleFieldChange =
        field.type === 'TitleField' ? undefined : (val) => handleFieldValueChange(field, val);

      return (
        <FieldRenderer
          key={field.key || field.data_name}
          ref={field.data_name ? (node) => registerFieldNode(field.data_name, node) : null}
          field={field}
          value={fieldValue}
          readOnly={fieldReadOnly}
          required={fieldRequired}
          error={fieldError}
          onChange={handleFieldChange}
          onFocus={() => handleFieldFocus(field.data_name)}
          labelPosition={labelPosition}
          labelWidthPercent={labelWidthPercent}
          engineStore={engineStore}
          storeMode={currentEngineStoreMode}
        />
      );
    });
  }

  return (
    <ThemeProvider themeClass={themeClass}>
      <div
        ref={formRendererRootRef}
        className={`${styles.formRendererRoot} ${themeClass}`}
        style={{ maxWidth: formWidth, width: '100%' }}
      >
        {modeBannerNode}
        {stickyHeaderContent}
        <div className={styles.bodySection}>
          {showNavigationPanel && (
            <NavigationTree
              sections={navigationSections}
              highlightedSections={highlightedSections}
              activeSectionId={activeNavigationSectionId}
              onNavigate={handleNavigate}
              validationIssues={rootValidationIssues}
              validationEnabled={submitCount > 0}
              onSelectValidationIssue={handleValidationIssueSelect}
            />
          )}
          <div className={styles.formColumn}>
            <form
              onSubmit={handleSubmit}
              className={`${styles.form} ${themeClass} ${className}`}
              {...rest}
            >
              {recordMetadataSection}
              {renderElements(baseElements, [], false, [])}
              {debug && <pre className={styles.debugPanel}>{debugText}</pre>}
            </form>
          </div>
        </div>
      </div>

      {repeatableModals.length > 0 && repeatableModalPortalRef.current
        ? createPortal(
            repeatableModals.map((modal, index) => (
              <RepeatableEntryModal
                key={modal.modalId}
                modal={{ ...modal, stackIndex: index }}
                isTopModal={index === repeatableModals.length - 1}
                themeClass={themeClass}
                labelPosition={labelPosition}
                labelWidthPercent={labelWidthPercent}
                initialMode={modal.mode === 'create' ? 'edit' : 'readonly'}
                allowEditToggle={modal.mode !== 'create'}
                onSave={handleRepeatableModalSave}
                onCancel={handleRepeatableModalCancel}
                openNestedModal={openRepeatableModal}
                resolveRepeatableKey={resolveRepeatableKey}
                recordStatusInfo={recordStatusInfo}
                getAltShortcutLabel={getAltShortcutLabel}
                showPrimaryActionsInViewMode={showPrimaryActionsInViewMode}
              />
            )),
            repeatableModalPortalRef.current
          )
        : null}

      {activeAlert && blockingPortalTarget && createPortal(
        <div
          className={styles.alertOverlay}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="form0-react-alert-title"
          aria-describedby="form0-react-alert-message"
        >
          <div
            className={`${styles.alertDialog} ${themeClass}`}
            ref={alertDialogRef}
            tabIndex={-1}
          >
            <button
              type="button"
              className={styles.alertCloseButton}
              aria-label="Close alert"
              onClick={closeAlert}
            >
              ×
            </button>
            <h3 id="form0-react-alert-title" className={styles.alertTitle}>
              {activeAlert.title}
            </h3>
            <div id="form0-react-alert-message" className={styles.alertMessage}>
              {activeAlert.message || ''}
            </div>
            <div className={styles.alertFooter}>
              <button
                type="button"
                ref={alertOkButtonRef}
                className={styles.alertOkButton}
                onClick={closeAlert}
              >
                OK
              </button>
            </div>
          </div>
        </div>,
        blockingPortalTarget
      )}
      {discardDialogNode}
    </ThemeProvider>
  );
}

function RepeatableSectionList({
  field,
  instances = [],
  onAdd,
  onEdit,
  onRemove,
  onBack,
  readOnly,
  overlayActive = false,
  variant = 'drilldown',
}) {
  const showInlineAddButton = variant !== 'drilldown';
  const showInlineBackButton = variant !== 'drilldown' && typeof onBack === 'function';
  const addLabel =
    field?.add_label ||
    (field?.label ? `Add ${String(field.label).replace(/s\\b/i, '').trim()}` : 'Add');
  return (
    <div
      className={`${styles.repeatableList} ${
        overlayActive ? styles.repeatableListBlurred : ''
      }`}
    >
      <div className={styles.repeatableListHeader}>
        <div className={styles.repeatableListHeaderText}>
          {showInlineBackButton && (
            <button type="button" className={styles.repeatableBackButton} onClick={onBack}>
              <ChevronLeft size={16} strokeWidth={1.8} />
              Back
            </button>
          )}
          <h3 className={styles.repeatableListTitle}>{field?.label || 'Repeatable Section'}</h3>
          {field?.description ? (
            <p className={styles.repeatableListDescription}>{field.description}</p>
          ) : null}
        </div>
        {showInlineAddButton && !readOnly && (
          <button type="button" className={styles.repeatableAddButton} onClick={onAdd}>
            <Plus size={16} strokeWidth={1.8} />
            {addLabel}
          </button>
        )}
      </div>
      <div className={styles.repeatableEntryList}>
        {instances.length === 0 ? (
          <div className={styles.repeatableEmptyState}>
            <span>No entries yet.</span>
            {/* {!readOnly && (
              <button
                type="button"
                className={styles.repeatableEmptyStateButton}
                onClick={onAdd}
              >
                Add the first entry
              </button>
            )} */}
          </div>
        ) : (
          instances.map((instance, index) => (
            <div key={instance.id || index} className={styles.repeatableEntryRow}>
              <div className={styles.repeatableEntryInfo}>
                <div className={styles.repeatableEntryTitle}>
                  {getRepeatableEntryTitle(field, instance, index)}
                </div>
              </div>
              {!readOnly && (
                <div className={styles.repeatableEntryActions}>
                  <button
                    type="button"
                    className={styles.repeatableActionButton}
                    onClick={() => onEdit(instance.id)}
                  >
                    View
                    <ChevronRight size={14} strokeWidth={1.8} />
                  </button>
                  <button
                    type="button"
                    className={`${styles.repeatableActionButton} ${styles.repeatableDangerButton}`}
                    onClick={() => onRemove(instance.id)}
                  >
                    <Trash2 size={14} strokeWidth={1.8} />
                    Remove
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function RepeatableEntryModal({
  modal,
  isTopModal = true,
  themeClass,
  labelPosition,
  labelWidthPercent,
  initialMode = 'edit',
  allowEditToggle = false,
  onSave,
  onCancel,
  openNestedModal,
  resolveRepeatableKey,
  recordStatusInfo,
  getAltShortcutLabel = () => null,
  showPrimaryActionsInViewMode = true,
}) {
  const {
    values: entryValues,
    visible: entryVisible,
    required: entryRequired,
    read_only: entryReadOnlyState,
    errors: entryErrors,
    setValue: setEntryValue,
    setValues: setEntryValues,
    repeatable: entryRepeatable,
    setRepeatableInstances: setEntryRepeatableInstances,
    getRepeatableInstances: getEntryRepeatableInstances,
    getRepeatableInstance: getEntryRepeatableInstance,
    updateRepeatableInstance: updateEntryRepeatableInstance,
    repeatableMetadata: entryRepeatableMetadata,
    engineStore: entryEngineStore,
    engineStoreMode: entryEngineStoreMode,
  } = useRepeatableInstanceEngine({
    schema: modal.schema,
    repInfo: modal.repInfo,
    baseValues: modal.parentValues,
    initialInstance: modal.initialInstance,
    engineOptions: modal.engineOptions,
  });

  const entryInitialTimestampValues = useMemo(
    () => ({
      created_at_client: modal.initialInstance?.created_at_client,
      updated_at_client: modal.initialInstance?.updated_at_client,
      created_at_server: modal.initialInstance?.created_at_server,
      updated_at_server: modal.initialInstance?.updated_at_server,
    }),
    [
      modal.initialInstance?.created_at_client,
      modal.initialInstance?.updated_at_client,
      modal.initialInstance?.created_at_server,
      modal.initialInstance?.updated_at_server,
    ]
  );

  const {
    timestamps: entryTimestamps,
    timestampsRef: entryTimestampsRef,
    touchUpdatedAt: touchEntryUpdatedAt,
  } = useRecordTimestamps({
    initialValues: entryInitialTimestampValues,
    overrideValues: undefined,
    values: entryValues,
  });

  const [entrySubmitCount, setEntrySubmitCount] = useState(0);

  useEffect(() => {
    setEntrySubmitCount(0);
  }, [modal.modalId]);

  const normalizedEntryMode = initialMode === 'readonly' ? 'readonly' : 'edit';
  const [entryMode, setEntryMode] = useState(normalizedEntryMode);

  useEffect(() => {
    setEntryMode(normalizedEntryMode);
  }, [normalizedEntryMode, modal.modalId]);

  const isEntryReadOnly = entryMode === 'readonly';
  const enterEntryEditMode = useCallback(() => {
    setEntryMode('edit');
  }, []);

  const entryValidationFields = useMemo(
    () =>
      collectValidatableFields(modal.repInfo?.field?.elements || [], {
        includeRepeatableChildren: false,
      }),
    [modal.repInfo]
  );

  const buildEntryValidationSummary = useCallback(
    () =>
      buildValidationSummary(entryValidationFields, {
        getValue: (field) => (field?.data_name ? entryValues?.[field.data_name] : null),
        isVisible: (field) => !field?.data_name || entryVisible?.[field.data_name] !== false,
        isRequired: (field) => Boolean(field?.data_name && entryRequired?.[field.data_name]),
        getError: (field) => (field?.data_name ? entryErrors?.[field.data_name] : null),
      }),
    [entryErrors, entryRequired, entryValidationFields, entryValues, entryVisible]
  );

  const entryValidationSummary = useMemo(
    () => buildEntryValidationSummary(),
    [buildEntryValidationSummary]
  );

  const initialEntrySnapshot = useRef({
    values: modal.initialInstance?.values || {},
    repeatable: modal.initialInstance?.repeatable || {},
  });

  useEffect(() => {
    initialEntrySnapshot.current = {
      values: modal.initialInstance?.values || {},
      repeatable: modal.initialInstance?.repeatable || {},
    };
  }, [modal.modalId]);

  const hasEntryChanges = useMemo(() => {
    const snapshot = initialEntrySnapshot.current;
    return (
      !deepEqual(entryValues, snapshot.values) || !deepEqual(entryRepeatable, snapshot.repeatable)
    );
  }, [entryRepeatable, entryValues]);

  const buildEntryParentValues = useCallback(
    (path = []) => {
      let merged = { ...(modal.parentValues || {}), ...entryValues };
      const traversePath = [];
      path.forEach(({ key, id }) => {
        const instance = getEntryRepeatableInstance(key, id, traversePath);
        if (instance?.values) {
          merged = { ...merged, ...instance.values };
        }
        traversePath.push({ key, id });
      });
      return merged;
    },
    [entryValues, getEntryRepeatableInstance, modal.parentValues]
  );

  const entryController = useMemo(
    () => ({
      metadata: entryRepeatableMetadata,
      getInstances: (repeatableKey, parentPath = []) =>
        getEntryRepeatableInstances(repeatableKey, parentPath),
      setInstances: (repeatableKey, instances = [], parentPath = []) =>
        setEntryRepeatableInstances(repeatableKey, instances, parentPath),
      getInstance: (repeatableKey, instanceId, parentPath = []) =>
        getEntryRepeatableInstance(repeatableKey, instanceId, parentPath),
      // Use functional update for batching compatibility
      updateInstance: (repeatableKey, instanceId, updater, parentPath = []) =>
        updateEntryRepeatableInstance(repeatableKey, instanceId, updater, parentPath),
      buildParentValues: buildEntryParentValues,
    }),
    [
      buildEntryParentValues,
      entryRepeatableMetadata,
      getEntryRepeatableInstance,
      getEntryRepeatableInstances,
      setEntryRepeatableInstances,
      updateEntryRepeatableInstance,
    ]
  );

  // Building Plan modal canvas context (scoped to current floor/room)
  const buildingPlanModalContext = useMemo(() => {
    if (!modal.buildingPlanMeta || !modal.repInfo?.preferredKey) return null;
    const metaEntry = findMetaByRepeatableKey(modal.buildingPlanMeta, modal.repInfo.preferredKey);
    if (!metaEntry) return null;

    const bpSection =
      findBuildingPlanSection(modal.schema?.form?.elements || [], metaEntry.dataName) || null;

    const floorsKey = getBuildingPlanRepeatableKey(metaEntry, BP_NODE_KEYS.floors);
    const roomsKey = getBuildingPlanRepeatableKey(metaEntry, BP_NODE_KEYS.rooms);
    const wallsKey = getBuildingPlanRepeatableKey(metaEntry, BP_NODE_KEYS.walls);
    if (!floorsKey || !roomsKey) return null;

    const isRoomModal = modal.repInfo.preferredKey === roomsKey;
    const isFloorModal = modal.repInfo.preferredKey === floorsKey;
    if (!isRoomModal && !isFloorModal) return null;

    const floorId =
      (isRoomModal && modal.parentValues?.id) ||
      (isRoomModal && modal.parentValues?.floor_id) ||
      modal.instanceId ||
      `__bp_floor_${modal.modalId}`;

    const roomInstance = {
      id: modal.instanceId,
      values: entryValues,
      repeatable: entryRepeatable,
    };

    const floorInstance = {
      id: floorId,
      values: isRoomModal ? modal.parentValues || {} : entryValues,
      repeatable: {
        ...(isRoomModal ? { [roomsKey]: [roomInstance] } : entryRepeatable || {}),
      },
    };

    const repeatableState = {
      [floorsKey]: [floorInstance],
    };

    const toLocalPath = (path = []) => {
      const normalized = Array.isArray(path) ? [...path] : [];
      if (isRoomModal) {
        if (normalized[0]?.key === floorsKey) {
          normalized.shift();
        }
        if (normalized[0]?.key === roomsKey) {
          normalized.shift();
        }
      } else if (isFloorModal) {
        if (normalized[0]?.key === floorsKey) {
          normalized.shift();
        }
      }
      return normalized;
    };

    const repeatableApi = {
      addInstance: (repeatableKey, { parentPath = [], seedValues = {}, instanceId } = {}) => {
        const localPath = toLocalPath(parentPath);
        const instances = entryController.getInstances(repeatableKey, localPath) || [];
        const created = {
          id: instanceId || uuidv7(),
          values: { ...(seedValues || {}) },
          repeatable: {},
        };
        entryController.setInstances(repeatableKey, [...instances, created], localPath);
        return created;
      },
      updateInstance: (repeatableKey, instanceId, updater, parentPath = []) => {
        const localPath = toLocalPath(parentPath);
        const isRoomRootUpdate =
          isRoomModal && repeatableKey === roomsKey && localPath.length === 0 && instanceId === modal.instanceId;

        if (isRoomRootUpdate) {
          const currentRoom = {
            id: modal.instanceId,
            values: entryValues,
            repeatable: entryRepeatable,
          };
          const nextRoom =
            typeof updater === 'function'
              ? updater(cloneDeepSafe(currentRoom))
              : { ...currentRoom, ...updater };

          if (nextRoom && nextRoom.values && typeof setEntryValues === 'function') {
            setEntryValues(nextRoom.values);
          } else if (nextRoom && nextRoom.values) {
            Object.entries(nextRoom.values).forEach(([key, value]) => setEntryValue(key, value));
          }
          return;
        }

        // Use functional update for proper React state batching.
        // This ensures multiple wall updates don't overwrite each other.
        entryController.updateInstance(repeatableKey, instanceId, updater, localPath);
      },
      removeInstance: (repeatableKey, instanceId, parentPath = []) => {
        const localPath = toLocalPath(parentPath);
        const instances = entryController.getInstances(repeatableKey, localPath) || [];
        const next = instances.filter((inst) => inst.id !== instanceId);
        entryController.setInstances(repeatableKey, next, localPath);
      },
      setInstances: (repeatableKey, instances = [], parentPath = []) =>
        entryController.setInstances(repeatableKey, instances, toLocalPath(parentPath)),
      getInstances: (repeatableKey, parentPath = []) =>
        entryController.getInstances(repeatableKey, toLocalPath(parentPath)),
    };

    const scope = {
      floorId: floorId || null,
      roomId: isRoomModal ? modal.instanceId : null,
    };

    const mode = isRoomModal ? 'room-modal' : 'floor-modal';

    return {
      metaEntry,
      repeatableState,
      repeatableApi,
      scope,
      mode,
      floorsKey,
      roomsKey,
      wallsKey,
      section: bpSection,
    };
  }, [
    entryController,
    entryRepeatable,
    entryValues,
    setEntryValue,
    setEntryValues,
    modal.buildingPlanMeta,
    modal.instanceId,
    modal.modalId,
    modal.parentValues,
    modal.repInfo?.preferredKey,
    modal.schema?.form?.elements,
  ]);

  const buildingPlanModalController = useBuildingPlanController({
    sectionDataName: buildingPlanModalContext?.metaEntry?.dataName,
    buildingPlanMeta: modal.buildingPlanMeta,
    repeatableState: buildingPlanModalContext?.repeatableState || {},
    mode: buildingPlanModalContext?.mode || 'parent',
    scope: buildingPlanModalContext?.scope || {},
  });

  const entryElements = modal.repInfo?.field?.elements || [];
  const modalFieldLookup = useMemo(() => buildFieldLookup(entryElements), [entryElements]);
  const {
    sectionTree: modalSectionTree,
    sectionMetadata: modalSectionMetadata,
    fieldToSectionPath: modalFieldToSectionPath,
  } = useMemo(
    () => buildSectionHierarchy(entryElements, resolveRepeatableKey),
    [entryElements, resolveRepeatableKey]
  );
  const showModalValidationList = entrySubmitCount > 0 && entryValidationSummary?.hasErrors;
  const modalValidationIssues = useMemo(
    () =>
      showModalValidationList
        ? formatValidationIssues(entryValidationSummary, modalFieldLookup, modalFieldToSectionPath)
        : [],
    [
      entryValidationSummary,
      modalFieldLookup,
      modalFieldToSectionPath,
      showModalValidationList,
    ]
  );

  // Auto-seed perimeter walls for BuildingPlan rooms inside the modal if missing
  useEffect(() => {
    if (!modal.buildingPlanMeta || !entryController || !modal.repInfo?.preferredKey) return;
    const wallsInfo = buildPerimeterWallsFromRoomValues(
      modal.buildingPlanMeta,
      modal.repInfo.preferredKey,
      entryValues
    );
    if (!wallsInfo) return;
    const { wallsKey, walls } = wallsInfo;
    const existing = entryController.getInstances(wallsKey, []);
    if (Array.isArray(existing) && existing.length > 0) {
      return;
    }
    if (Array.isArray(walls) && walls.length > 0) {
      entryController.setInstances(wallsKey, walls, []);
    }
  }, [entryController, entryValues, modal.buildingPlanMeta, modal.repInfo?.preferredKey]);

  // Wall geometry updates now rely on legacy canvas/controller behavior; no extra syncing here.
  const modalNavigationSections = useMemo(() => {
    if (!modalSectionTree || modalSectionTree.length === 0) {
      return [];
    }
    return [
      {
        id: MODAL_ROOT_NAV_NODE_ID,
        label: ROOT_NAV_LABEL,
        type: 'Root',
        children: buildNavigationNodes(modalSectionTree),
      },
    ];
  }, [modalSectionTree]);
  const [modalHighlightedSections, setModalHighlightedSections] = useState([MODAL_ROOT_NAV_NODE_ID]);
  const [modalActiveDrilldownPath, setModalActiveDrilldownPath] = useState([]);
  const modalActiveDrilldownSectionId =
    modalActiveDrilldownPath.length > 0
      ? modalActiveDrilldownPath[modalActiveDrilldownPath.length - 1]
      : null;
  const modalSectionRefs = useRef(new Map());
  const modalFieldRefs = useRef(new Map());
  const modalActiveSectionId =
    modalHighlightedSections.length > 0
      ? modalHighlightedSections[modalHighlightedSections.length - 1]
      : MODAL_ROOT_NAV_NODE_ID;
  const setModalHighlightedPath = useCallback((path = []) => {
    const normalizedPath =
      Array.isArray(path) && path.length > 0
        ? [MODAL_ROOT_NAV_NODE_ID, ...path.filter((id) => id && id !== MODAL_ROOT_NAV_NODE_ID)]
        : [MODAL_ROOT_NAV_NODE_ID];
    setModalHighlightedSections(normalizedPath);
  }, []);

  useEffect(() => {
    modalSectionRefs.current = new Map();
    setModalHighlightedPath([MODAL_ROOT_NAV_NODE_ID]);
    setModalActiveDrilldownPath([]);
  }, [modal.modalId, setModalActiveDrilldownPath, setModalHighlightedPath]);

  const registerModalSectionNode = useCallback((sectionId, node) => {
    if (!sectionId) {
      return;
    }
    if (node) {
      modalSectionRefs.current.set(sectionId, node);
    } else {
      modalSectionRefs.current.delete(sectionId);
    }
  }, []);

  const registerModalFieldNode = useCallback((dataName, node) => {
    if (!dataName) {
      return;
    }
    if (node) {
      modalFieldRefs.current.set(dataName, node);
    } else {
      modalFieldRefs.current.delete(dataName);
    }
  }, []);

  const scrollModalSectionIntoView = useCallback((sectionId) => {
    const node = modalSectionRefs.current.get(sectionId);
    if (!node) {
      return false;
    }
    if (typeof node.scrollIntoView === 'function') {
      node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (typeof node.focus === 'function') {
      try {
        node.focus({ preventScroll: true });
      } catch {
        node.focus();
      }
    }
    return true;
  }, []);

  const focusModalSectionAfterNavigation = useCallback(
    (sectionId) => {
      if (!sectionId || sectionId === MODAL_ROOT_NAV_NODE_ID) {
        return;
      }
      const schedule =
        typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
          ? window.requestAnimationFrame
          : (cb) => setTimeout(cb, 16);
      schedule(() => {
        if (scrollModalSectionIntoView(sectionId)) {
          return;
        }
        setTimeout(() => {
          scrollModalSectionIntoView(sectionId);
        }, 80);
      });
    },
    [scrollModalSectionIntoView]
  );

  const scrollModalFieldIntoView = useCallback((dataName) => {
    if (!dataName) {
      return false;
    }
    const node = modalFieldRefs.current.get(dataName);
    if (!node) {
      return false;
    }
    if (typeof node.scrollIntoView === 'function') {
      node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (typeof node.focus === 'function') {
      try {
        node.focus({ preventScroll: true });
      } catch {
        node.focus();
      }
    }
    return true;
  }, []);

  const focusModalFieldByDataName = useCallback(
    (dataName) => {
      if (!dataName) return;
      const schedule =
        typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
          ? window.requestAnimationFrame
          : (cb) => setTimeout(cb, 16);
      schedule(() => {
        if (scrollModalFieldIntoView(dataName)) {
          return;
        }
        setTimeout(() => {
          scrollModalFieldIntoView(dataName);
        }, 120);
      });
    },
    [scrollModalFieldIntoView]
  );

  const [activeNestedRepeatable, setActiveNestedRepeatable] = useState(null);

  useEffect(() => {
    setActiveNestedRepeatable(null);
  }, [modal.modalId]);

  const setModalActiveDrilldownForSection = useCallback(
    (sectionId) => {
      const info = sectionId ? modalSectionMetadata[sectionId] : null;
      if (!info) {
        return;
      }
      setModalActiveDrilldownPath(info.drilldownPath);
      setModalHighlightedPath(info.path || []);
    },
    [modalSectionMetadata, setModalActiveDrilldownPath, setModalHighlightedPath]
  );

  const handleModalDrilldownBack = useCallback(() => {
    const sectionId = modalActiveDrilldownSectionId;
    if (!sectionId) {
      setModalActiveDrilldownPath([]);
      setModalHighlightedPath([MODAL_ROOT_NAV_NODE_ID]);
      return;
    }
    const info = modalSectionMetadata[sectionId];
    if (!info) {
      setModalActiveDrilldownPath([]);
      setModalHighlightedPath([MODAL_ROOT_NAV_NODE_ID]);
      return;
    }
    const nextDrilldownPath = info.drilldownPath.slice(0, -1);
    setModalActiveDrilldownPath(nextDrilldownPath);
    const nextHighlightPath =
      info.path && info.path.length > 1 ? info.path.slice(0, -1) : [MODAL_ROOT_NAV_NODE_ID];
    setModalHighlightedPath(nextHighlightPath);
    const parentSectionId =
      info.path && info.path.length > 1 ? info.path[info.path.length - 2] : null;
    if (parentSectionId) {
      focusModalSectionAfterNavigation(parentSectionId);
    }
  }, [
    focusModalSectionAfterNavigation,
    modalActiveDrilldownSectionId,
    modalSectionMetadata,
    setModalActiveDrilldownPath,
    setModalHighlightedPath,
  ]);

  const handleEnterNestedRepeatable = useCallback(
    (config = {}) => {
      const { field, repeatableKey, contextPath = [], sectionId, highlightPath } = config;
      if (!field || !repeatableKey) {
        return;
      }
      const metadata = sectionId ? modalSectionMetadata[sectionId] : null;
      const nextHighlightPath = highlightPath || metadata?.path || [];
      setModalHighlightedPath(nextHighlightPath);
      setModalActiveDrilldownPath([]);
      setActiveNestedRepeatable({
        field,
        repeatableKey,
        contextPath,
        sectionId,
      });
    },
    [modalSectionMetadata, setModalActiveDrilldownPath, setModalHighlightedPath]
  );

  const handleExitNestedRepeatable = useCallback(() => {
    setActiveNestedRepeatable(null);
    setModalHighlightedPath([MODAL_ROOT_NAV_NODE_ID]);
    setModalActiveDrilldownPath([]);
  }, [setModalActiveDrilldownPath, setModalHighlightedPath]);

  const [discardDialogVisible, setDiscardDialogVisible] = useState(false);
  const discardDialogRef = useRef(null);
  const discardCancelButtonRef = useRef(null);
  const discardDialogActive = discardDialogVisible && typeof document !== 'undefined';
  useFocusTrap(discardDialogActive, discardDialogRef, { initialFocusRef: discardCancelButtonRef });

  const openDiscardDialog = useCallback(() => {
    setDiscardDialogVisible(true);
  }, []);

  const closeDiscardDialog = useCallback(() => {
    setDiscardDialogVisible(false);
  }, []);

  const confirmDiscard = useCallback(() => {
    setDiscardDialogVisible(false);
    onCancel(modal);
  }, [modal, onCancel]);

  const handleCancelRequest = useCallback(() => {
    if (activeNestedRepeatable) {
      handleExitNestedRepeatable();
      return;
    }
    if (!hasEntryChanges) {
      onCancel(modal);
      return;
    }
    openDiscardDialog();
  }, [activeNestedRepeatable, handleExitNestedRepeatable, hasEntryChanges, modal, onCancel, openDiscardDialog]);

  const repeatableMetadataFields = useMemo(
    () => createTimestampMetadataFields(`repeatable_${modal.modalId}`),
    [modal.modalId]
  );

  const repeatableMetadataSection = useMemo(() => {
    if (modalActiveDrilldownPath.length > 0) {
      return null;
    }

    const metadataFields = repeatableMetadataFields.map((field) => {
      const fieldValue = entryTimestamps[field.data_name] || null;
      return (
        <FieldRenderer
          key={field.key || field.data_name}
          field={field}
          value={fieldValue}
          readOnly
          required={false}
          error={null}
          showError={false}
          labelPosition={labelPosition}
          labelWidthPercent={labelWidthPercent}
        />
      );
    });

    return (
      <section
        className={`${styles.recordMetadataSection} ${styles.recordMetadata}`}
        aria-label="Record Metadata"
      >
        <h3 className={styles.sectionHeader}>Record Metadata</h3>
        <div className={styles.recordMetadataFields}>{metadataFields}</div>
      </section>
    );
  }, [entryTimestamps, labelPosition, labelWidthPercent, modalActiveDrilldownPath.length, repeatableMetadataFields]);

  const handleSave = useCallback(() => {
    setEntrySubmitCount((count) => count + 1);
    const validationSummary = entryValidationSummary;
    if (validationSummary?.hasErrors) {
      console.info('📝 [ENTRY SAVE] Attempting to save repeatable entry...');
      console.log('❌ [ENTRY SAVE] Save blocked due to validation errors');
      return;
    }
    const submissionTimestamp = new Date().toISOString();
    touchEntryUpdatedAt(submissionTimestamp);
    const timestampSnapshot = {
      ...entryTimestampsRef.current,
      updated_at_client: submissionTimestamp,
    };
    onSave(modal, {
      id: modal.instanceId,
      values: cloneDeepSafe(entryValues),
      repeatable: cloneDeepSafe(entryRepeatable),
      created_at_client: timestampSnapshot?.created_at_client ?? null,
      updated_at_client: timestampSnapshot?.updated_at_client ?? null,
      created_at_server: timestampSnapshot?.created_at_server ?? null,
      updated_at_server: timestampSnapshot?.updated_at_server ?? null,
    });
  }, [entryRepeatable, entryTimestampsRef, entryValidationSummary, entryValues, modal, onSave, touchEntryUpdatedAt]);

  const handleModalNavigate = useCallback(
    (sectionId) => {
      if (sectionId === MODAL_ROOT_NAV_NODE_ID) {
        handleExitNestedRepeatable();
        setModalHighlightedPath([MODAL_ROOT_NAV_NODE_ID]);
        setModalActiveDrilldownPath([]);
        return;
      }
      const info = modalSectionMetadata[sectionId];
      if (!info) {
        return;
      }

      if (info.type === 'RepeatableSection') {
        const field = info.field;
        const repeatableKey = info.repeatableKey || resolveRepeatableKey(field);
        if (!field || !repeatableKey) {
          return;
        }
        setModalActiveDrilldownPath([]);
        handleEnterNestedRepeatable({
          field,
          repeatableKey,
          contextPath: info.repeatableParentPath || [],
          sectionId: info.id,
          highlightPath: info.path || [],
        });
        return;
      }

      if (info.display === 'drilldown') {
        setModalActiveDrilldownForSection(sectionId);
      } else {
        setModalActiveDrilldownPath(info.drilldownPath);
        setModalHighlightedPath(info.path || []);
      }
      if (activeNestedRepeatable) {
        handleExitNestedRepeatable();
        setTimeout(() => {
          scrollModalSectionIntoView(sectionId);
        }, 0);
      } else {
        scrollModalSectionIntoView(sectionId);
      }
    },
    [
      modalSectionMetadata,
      resolveRepeatableKey,
      handleEnterNestedRepeatable,
      activeNestedRepeatable,
      handleExitNestedRepeatable,
      scrollModalSectionIntoView,
      setModalHighlightedPath,
      setModalActiveDrilldownForSection,
      setModalActiveDrilldownPath,
    ]
  );

  const handleModalFieldFocus = useCallback(
    (fieldDataName) => {
      const sectionPath = modalFieldToSectionPath[fieldDataName];
      setModalHighlightedPath(sectionPath || []);
    },
    [modalFieldToSectionPath, setModalHighlightedPath]
  );

  const navigateModalToSection = useCallback(
    (sectionPath = []) => {
      if (!Array.isArray(sectionPath) || sectionPath.length === 0) {
        return;
      }
      const targetSectionId = sectionPath[sectionPath.length - 1];
      if (!targetSectionId || targetSectionId === MODAL_ROOT_NAV_NODE_ID) {
        return;
      }
      const sectionInfo = modalSectionMetadata[targetSectionId];
      if (!sectionInfo) {
        return;
      }
      setModalActiveDrilldownPath(sectionInfo.drilldownPath);
      setModalHighlightedPath(sectionPath);
      focusModalSectionAfterNavigation(targetSectionId);
    },
    [
      focusModalSectionAfterNavigation,
      modalSectionMetadata,
      setModalActiveDrilldownPath,
      setModalHighlightedPath,
    ]
  );

  const handleModalValidationIssueSelect = useCallback(
    (issue) => {
      if (!issue || !issue.fieldName) {
        return;
      }
      if (Array.isArray(issue.sectionPath) && issue.sectionPath.length > 0) {
        navigateModalToSection(issue.sectionPath);
      }
      focusModalFieldByDataName(issue.fieldName);
    },
    [focusModalFieldByDataName, navigateModalToSection]
  );

  const handleNestedAdd = useCallback(
    (field, repeatableKey, parentPath = []) => {
      const initialInstance = buildDefaultRoomInstance(modal.buildingPlanMeta, repeatableKey);
      openNestedModal(
        {
          repeatableKey,
          field,
          sectionId: field?.data_name || field?.key || repeatableKey,
          label: field?.label || 'Repeatable Section',
          description: field?.description || '',
          parentPath,
          mode: 'create',
          schema: modal.schema,
          engineOptions: modal.engineOptions,
          parentValues: entryController.buildParentValues(parentPath),
          initialInstance,
        },
        entryController
      );
    },
    [entryController, modal.buildingPlanMeta, modal.engineOptions, modal.schema, openNestedModal]
  );

  const handleNestedEdit = useCallback(
    (field, repeatableKey, instanceId, parentPath = []) => {
      const existing = entryController.getInstance(repeatableKey, instanceId, parentPath);
      if (!existing) {
        return;
      }
      openNestedModal(
        {
          repeatableKey,
          field,
          sectionId: field?.data_name || field?.key || repeatableKey,
          label: field?.label || 'Repeatable Section',
          description: field?.description || '',
          parentPath,
          mode: 'edit',
          schema: modal.schema,
          engineOptions: modal.engineOptions,
          parentValues: entryController.buildParentValues(parentPath),
          instanceId,
          initialInstance: cloneDeepSafe(existing),
        },
        entryController
      );
    },
    [entryController, modal.engineOptions, modal.schema, openNestedModal]
  );

  const handleNestedRemove = useCallback(
    (repeatableKey, instanceId, parentPath = []) => {
      const instances = entryController.getInstances(repeatableKey, parentPath);
      const next = instances.filter((instance) => instance.id !== instanceId);
      entryController.setInstances(repeatableKey, next, parentPath);
    },
    [entryController]
  );

  const triggerNestedAdd = useCallback(() => {
    if (!activeNestedRepeatable) {
      return;
    }
    const { field, repeatableKey, contextPath = [] } = activeNestedRepeatable;
    handleNestedAdd(field, repeatableKey, contextPath);
  }, [activeNestedRepeatable, handleNestedAdd]);

  const triggerNestedEdit = useCallback(
    (instanceId) => {
      if (!activeNestedRepeatable) {
        return;
      }
      const { field, repeatableKey, contextPath = [] } = activeNestedRepeatable;
      handleNestedEdit(field, repeatableKey, instanceId, contextPath);
    },
    [activeNestedRepeatable, handleNestedEdit]
  );

  const triggerNestedRemove = useCallback(
    (instanceId) => {
      if (!activeNestedRepeatable) {
        return;
      }
      const { repeatableKey, contextPath = [] } = activeNestedRepeatable;
      handleNestedRemove(repeatableKey, instanceId, contextPath);
    },
    [activeNestedRepeatable, handleNestedRemove]
  );

  const readOnly = isEntryReadOnly;
  const nestedListActive = Boolean(activeNestedRepeatable);
  const modalDrilldownActive = modalActiveDrilldownPath.length > 0;
  const modalTitle =
    activeNestedRepeatable?.field?.label || modal.label || 'Repeatable Entry';
  const modalRecordTitle = 'Untitled';
  const modalStatusColor = recordStatusInfo?.color || '#d4d4d8';
  const modalStatusLabel = recordStatusInfo?.label
    ? `Status: ${recordStatusInfo.label}${recordStatusInfo?.disabled ? ' (disabled)' : ''}`
    : recordStatusInfo?.disabled
    ? 'Status disabled'
    : undefined;
  const modalStatusBadgeClass =
    recordStatusInfo && recordStatusInfo.disabled
      ? styles.recordSummaryStatusDisabled
      : styles.recordSummaryStatus;
  const modalStatusBadgeStyle =
    recordStatusInfo?.disabled || !modalStatusColor ? undefined : { backgroundColor: modalStatusColor };
  const modalStatusBadgeA11yProps =
    modalStatusLabel ? { role: 'img', 'aria-label': modalStatusLabel } : { 'aria-hidden': 'true' };
  const hasModalNavigation = modalSectionTree && modalSectionTree.length > 0;
  const showModalNavigationPanel = hasModalNavigation || showModalValidationList;

  const modalLeftAction = nestedListActive
    ? {
        id: 'back',
        label: 'Back',
        icon: ChevronLeft,
        onClick: handleExitNestedRepeatable,
        shortcutLabel: getAltShortcutLabel('b'),
      }
    : modalDrilldownActive
    ? {
        id: 'drilldown-back',
        label: 'Back',
        icon: ChevronLeft,
        onClick: handleModalDrilldownBack,
        shortcutLabel: getAltShortcutLabel('b'),
      }
    : {
        id: 'cancel',
        label: 'Cancel',
        icon: XCircle,
        onClick: handleCancelRequest,
        shortcutLabel: getAltShortcutLabel('q'),
      };

  let modalRightAction = null;
  const modalPrimaryActionsAllowed = showPrimaryActionsInViewMode || !readOnly;

  if (modalPrimaryActionsAllowed && nestedListActive) {
    modalRightAction = {
      id: 'add',
      label: 'Add',
      icon: Plus,
      onClick: readOnly ? undefined : triggerNestedAdd,
      shortcutLabel: getAltShortcutLabel('a'),
      variant: 'primary',
      disabled: readOnly,
    };
  } else if (modalPrimaryActionsAllowed && !modalDrilldownActive) {
    modalRightAction = {
      id: 'save',
      label: 'Save',
      icon: Save,
      onClick: readOnly ? undefined : handleSave,
      shortcutLabel: getAltShortcutLabel('s'),
      variant: 'primary',
      disabled: readOnly,
    };
  }

  const modalSecondaryRightAction =
    allowEditToggle && isEntryReadOnly
      ? {
          id: 'modal-enter-edit-mode',
          label: 'Edit',
          icon: Pencil,
          onClick: enterEntryEditMode,
          shortcutLabel: getAltShortcutLabel('m'),
          variant: 'edit',
        }
      : null;

  const ownerDocument =
    typeof window !== 'undefined' && window.document ? window.document : undefined;

  useLayoutEffect(() => {
    if (!ownerDocument || !isTopModal) {
      return undefined;
    }

    const isPlainAlt = (event) =>
      event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;

    const matchesKey = (event, code, fallbackKey) => {
      const eventCode = typeof event.code === 'string' ? event.code : '';
      if (eventCode) {
        return eventCode === code;
      }
      if (!fallbackKey) {
        return false;
      }
      const normalizedKey = typeof event.key === 'string' ? event.key.toLowerCase() : '';
      return normalizedKey === fallbackKey;
    };

    const haltEvent = (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      }
    };

    const handleKeyDown = (event) => {
      if (event.defaultPrevented) {
        return;
      }

      const plainAlt = isPlainAlt(event);

      if (discardDialogVisible) {
        if (plainAlt && matchesKey(event, 'KeyQ', 'q')) {
          haltEvent(event);
          closeDiscardDialog();
          return;
        }
        if (plainAlt && matchesKey(event, 'KeyY', 'y')) {
          haltEvent(event);
          confirmDiscard();
          return;
        }
        if (event.key === 'Escape') {
          haltEvent(event);
        }
        return;
      }

      if (event.key === 'Escape') {
        haltEvent(event);
        return;
      }

      if (!plainAlt) {
        return;
      }

      if (matchesKey(event, 'KeyQ', 'q')) {
        haltEvent(event);
        if (!nestedListActive) {
          handleCancelRequest();
        }
        return;
      }
      if (matchesKey(event, 'KeyB', 'b')) {
        if (nestedListActive) {
          haltEvent(event);
          handleExitNestedRepeatable();
          return;
        }
        if (modalDrilldownActive) {
          haltEvent(event);
          handleModalDrilldownBack();
          return;
        }
      }
      if (
        matchesKey(event, 'KeyM', 'm') &&
        modalSecondaryRightAction &&
        modalSecondaryRightAction.id === 'modal-enter-edit-mode'
      ) {
        haltEvent(event);
        if (typeof modalSecondaryRightAction.onClick === 'function') {
          modalSecondaryRightAction.onClick();
        }
        return;
      }
      if (
        matchesKey(event, 'KeyA', 'a') &&
        modalRightAction &&
        modalRightAction.id === 'add' &&
        !modalRightAction.disabled
      ) {
        haltEvent(event);
        if (typeof modalRightAction.onClick === 'function') {
          modalRightAction.onClick();
        }
        return;
      }
      if (
        matchesKey(event, 'KeyS', 's') &&
        modalRightAction &&
        modalRightAction.id === 'save' &&
        !modalRightAction.disabled
      ) {
        haltEvent(event);
        if (typeof modalRightAction.onClick === 'function') {
          modalRightAction.onClick();
        }
      }
    };

    ownerDocument.addEventListener('keydown', handleKeyDown, true);
    return () => {
      ownerDocument.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [
    ownerDocument,
    closeDiscardDialog,
    confirmDiscard,
    discardDialogVisible,
    handleCancelRequest,
    handleExitNestedRepeatable,
    handleModalDrilldownBack,
    nestedListActive,
    modalDrilldownActive,
    isTopModal,
    modalRightAction,
    modalSecondaryRightAction,
  ]);

  const nestedRepeatableInstances = activeNestedRepeatable
    ? entryController.getInstances(
        activeNestedRepeatable.repeatableKey,
        activeNestedRepeatable.contextPath || []
      )
    : null;

  const renderHeaderActionButtons = (actions, position) => {
    const slotClass =
      position === 'right'
        ? `${styles.repeatableModalHeaderSlot} ${styles.repeatableModalHeaderSlotRight}`
        : styles.repeatableModalHeaderSlot;
    const items = Array.isArray(actions)
      ? actions.filter(Boolean)
      : actions
      ? [actions]
      : [];
    return (
      <div className={slotClass} aria-hidden={items.length === 0 ? 'true' : undefined}>
        {items.map((action) => {
          const IconComponent = action.icon;
          const disabled = Boolean(action.disabled) || !isTopModal;
          return (
            <button
              key={action.id || action.label}
              type="button"
              className={styles.formNameActionButton}
              data-variant={action.variant || 'ghost'}
              onClick={disabled ? undefined : action.onClick}
              disabled={disabled}
            >
              {IconComponent && (
                <span className={styles.formNameActionIcon} aria-hidden="true">
                  <IconComponent size={16} strokeWidth={1.8} />
                </span>
              )}
              <span className={styles.formNameActionLabel}>
                <span>{action.label}</span>
                {action.shortcutLabel ? (
                  <span className={styles.shortcutBadge} aria-hidden="true">
                    {action.shortcutLabel}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <div
        className={styles.repeatableModalOverlay}
        style={{ zIndex: 60 + (modal.stackIndex || 0) * 2 }}
      >
        <div className={`${styles.repeatableModal} ${themeClass}`}>
          <ModeBanner mode={entryMode} />
          <div className={`${styles.repeatableModalHeader} ${styles.headerSection} ${themeClass}`}>
            <div className={styles.repeatableModalHeaderTopRow}>
              {renderHeaderActionButtons(modalLeftAction, 'left')}
              <div className={styles.repeatableModalTitle}>{modalTitle}</div>
              {renderHeaderActionButtons(
                [modalSecondaryRightAction, modalRightAction],
                'right'
              )}
            </div>
            {!nestedListActive && (
              <div className={styles.repeatableModalSummaryRow}>
                <div
                  className={`${styles.recordSummary} ${styles.repeatableModalSummaryCard}`}
                  role="group"
                  aria-label="Repeatable entry summary"
                >
                  <span
                    className={modalStatusBadgeClass}
                    style={modalStatusBadgeStyle}
                    {...modalStatusBadgeA11yProps}
                  />
                  <div className={styles.recordSummaryContent}>
                    <div className={styles.recordSummaryTitle}>{modalRecordTitle}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className={styles.repeatableModalBody}>
            <div className={styles.repeatableModalContent}>
              {showModalNavigationPanel && (
                <div className={styles.repeatableModalNavigation}>
                  <NavigationTree
                    sections={modalNavigationSections}
                    highlightedSections={modalHighlightedSections}
                    activeSectionId={modalActiveSectionId}
                    onNavigate={handleModalNavigate}
                    validationIssues={modalValidationIssues}
                    validationEnabled={entrySubmitCount > 0}
                    onSelectValidationIssue={handleModalValidationIssueSelect}
                  />
                </div>
              )}
              <div className={styles.repeatableModalFormColumn}>
                {nestedListActive ? (
                  <RepeatableSectionList
                    key={activeNestedRepeatable.repeatableKey}
                    field={activeNestedRepeatable.field}
                    instances={nestedRepeatableInstances || []}
                    readOnly={readOnly}
                    variant="drilldown"
                    onAdd={triggerNestedAdd}
                    onEdit={triggerNestedEdit}
                    onRemove={triggerNestedRemove}
                  />
                ) : (
                  <>
                    {repeatableMetadataSection}
                    {buildingPlanModalContext ? (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(360px, 1fr) minmax(360px, 1fr)',
                          gap: '16px',
                        }}
                      >
                        <div
                          style={{
                            background: 'var(--form0-color-surface, #f8f8f9)',
                            border: '1px solid var(--form0-color-border-subtle, #e5e7eb)',
                            borderRadius: '8px',
                            padding: '8px',
                          }}
                        >
                          <BuildingPlanCanvasHost
                            section={
                              buildingPlanModalContext.section || {
                                data_name:
                                  buildingPlanModalContext.metaEntry?.dataName ||
                                  buildingPlanModalContext.metaEntry?.key,
                                label: modal.label || 'Building Plan',
                                elements: [],
                              }
                            }
                            buildingPlanMeta={modal.buildingPlanMeta}
                            repeatableState={buildingPlanModalContext.repeatableState}
                            repeatableApi={buildingPlanModalContext.repeatableApi}
                            mode={buildingPlanModalContext.mode}
                            scope={buildingPlanModalContext.scope}
                            toolbarState={buildingPlanModalController?.toolbarState}
                          />
                        </div>
                        <div>
                          <RepeatableEntryForm
                            elements={modal.repInfo?.field?.elements || []}
                            contextPath={[]}
                            state={{
                              values: entryValues,
                              visible: entryVisible,
                              required: entryRequired,
                              read_only: entryReadOnlyState,
                              errors: entryErrors,
                            }}
                            setValue={setEntryValue}
                            engineStore={entryEngineStore}
                            engineStoreMode={entryEngineStoreMode}
                            labelPosition={labelPosition}
                            labelWidthPercent={labelWidthPercent}
                            controller={entryController}
                            onAddRepeatable={handleNestedAdd}
                            onEditRepeatable={handleNestedEdit}
                            onRemoveRepeatable={handleNestedRemove}
                            resolveRepeatableKey={resolveRepeatableKey}
                            readOnly={readOnly}
                            onEnterRepeatable={handleEnterNestedRepeatable}
                            registerSectionNode={registerModalSectionNode}
                            onFieldFocus={handleModalFieldFocus}
                            highlightedSections={modalHighlightedSections}
                            submitCount={entrySubmitCount}
                            registerFieldNode={registerModalFieldNode}
                            sectionMetadata={modalSectionMetadata}
                            activeDrilldownPath={modalActiveDrilldownPath}
                            activeDrilldownSectionId={modalActiveDrilldownSectionId}
                            activateDrilldownSection={setModalActiveDrilldownForSection}
                            focusSection={focusModalSectionAfterNavigation}
                          />
                        </div>
                      </div>
                    ) : (
                      <RepeatableEntryForm
                        elements={modal.repInfo?.field?.elements || []}
                        contextPath={[]}
                        state={{
                          values: entryValues,
                          visible: entryVisible,
                          required: entryRequired,
                          read_only: entryReadOnlyState,
                          errors: entryErrors,
                        }}
                        setValue={setEntryValue}
                        engineStore={entryEngineStore}
                        engineStoreMode={entryEngineStoreMode}
                        labelPosition={labelPosition}
                        labelWidthPercent={labelWidthPercent}
                        controller={entryController}
                        onAddRepeatable={handleNestedAdd}
                        onEditRepeatable={handleNestedEdit}
                        onRemoveRepeatable={handleNestedRemove}
                        resolveRepeatableKey={resolveRepeatableKey}
                        readOnly={readOnly}
                        onEnterRepeatable={handleEnterNestedRepeatable}
                        registerSectionNode={registerModalSectionNode}
                        onFieldFocus={handleModalFieldFocus}
                        highlightedSections={modalHighlightedSections}
                        submitCount={entrySubmitCount}
                        registerFieldNode={registerModalFieldNode}
                        sectionMetadata={modalSectionMetadata}
                        activeDrilldownPath={modalActiveDrilldownPath}
                        activeDrilldownSectionId={modalActiveDrilldownSectionId}
                        activateDrilldownSection={setModalActiveDrilldownForSection}
                        focusSection={focusModalSectionAfterNavigation}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {discardDialogVisible && typeof document !== 'undefined' && (
        <div
          className={styles.alertOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="form0-react-repeatable-discard-title"
          aria-describedby="form0-react-repeatable-discard-message"
          style={{ zIndex: 70 + (modal.stackIndex || 0) * 2 }}
        >
          <div
            className={`${styles.alertDialog} ${themeClass}`}
            ref={discardDialogRef}
            tabIndex={-1}
          >
            <h3 id="form0-react-repeatable-discard-title" className={styles.alertTitle}>
              This record has unsaved changes
            </h3>
            <p id="form0-react-repeatable-discard-message" className={styles.alertMessage}>
              Are you sure you want to discard any changes?
            </p>
            <div className={styles.confirmDialogActions}>
              <button
                type="button"
                className={styles.confirmSecondaryButton}
                ref={discardCancelButtonRef}
                onClick={closeDiscardDialog}
              >
                Cancel
                <span className={styles.shortcutBadge} aria-hidden="true">
                  {getAltShortcutLabel('q')}
                </span>
              </button>
              <button
                type="button"
                className={styles.confirmPrimaryButton}
                onClick={confirmDiscard}
              >
                Yes, discard
                <span className={styles.shortcutBadge} aria-hidden="true">
                  {getAltShortcutLabel('y')}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function RepeatableEntryForm({
  elements,
  contextPath,
  state,
  setValue,
  engineStore = null,
  engineStoreMode = 'snapshot',
  labelPosition,
  labelWidthPercent,
  controller,
  onAddRepeatable,
  onEditRepeatable,
  onRemoveRepeatable,
  resolveRepeatableKey,
  readOnly,
  onEnterRepeatable = () => {},
  registerSectionNode,
  onFieldFocus,
  highlightedSections,
  sectionMetadata = {},
  activeDrilldownPath = [],
  activeDrilldownSectionId = null,
  activateDrilldownSection = () => {},
  focusSection = () => {},
  parentSectionPath = [],
  submitCount = 0,
  registerFieldNode = () => {},
}) {
  if (!Array.isArray(elements) || elements.length === 0) {
    return null;
  }

  const hasActiveDrilldown = Array.isArray(activeDrilldownPath) && activeDrilldownPath.length > 0;
  const activeDrilldownFullPath =
    activeDrilldownSectionId && sectionMetadata[activeDrilldownSectionId]
      ? sectionMetadata[activeDrilldownSectionId].path || []
      : [];

  return elements.map((field) => {
    if (!field) {
      return null;
    }

    if (hasActiveDrilldown) {
      if (
        field.type === 'Section' ||
        field.type === 'RepeatableSection' ||
        field.type === 'BuildingPlanSection'
      ) {
        const sectionId = field.data_name || field.key;
        if (!sectionId) {
          return null;
        }
        const sectionPath = [...parentSectionPath, sectionId];
        const isAncestorOfActive =
          sectionId !== activeDrilldownSectionId && activeDrilldownFullPath.includes(sectionId);
        const isWithinActiveBranch = sectionPath.includes(activeDrilldownSectionId);

        if (!isAncestorOfActive && !isWithinActiveBranch) {
          return null;
        }

        if (isAncestorOfActive) {
          return (
            <React.Fragment key={sectionId}>
              <RepeatableEntryForm
                elements={field.elements || []}
                contextPath={contextPath}
                state={state}
                setValue={setValue}
                labelPosition={labelPosition}
                labelWidthPercent={labelWidthPercent}
                controller={controller}
                onAddRepeatable={onAddRepeatable}
                onEditRepeatable={onEditRepeatable}
                onRemoveRepeatable={onRemoveRepeatable}
                resolveRepeatableKey={resolveRepeatableKey}
                readOnly={readOnly}
                onEnterRepeatable={onEnterRepeatable}
                registerSectionNode={registerSectionNode}
                onFieldFocus={onFieldFocus}
                highlightedSections={highlightedSections}
                sectionMetadata={sectionMetadata}
                activeDrilldownPath={activeDrilldownPath}
                activeDrilldownSectionId={activeDrilldownSectionId}
                activateDrilldownSection={activateDrilldownSection}
                focusSection={focusSection}
                parentSectionPath={sectionPath}
                submitCount={submitCount}
                registerFieldNode={registerFieldNode}
              />
            </React.Fragment>
          );
        }
        // Continue to normal rendering when on the active branch
      } else if (!parentSectionPath.includes(activeDrilldownSectionId)) {
        return null;
      }
    }

    if (field.type === 'Section') {
      const rawSectionId = field.data_name || field.key;
      const sectionId = rawSectionId || Math.random().toString(36);
      const display = field.display || 'inline';
      const nextSectionPath =
        rawSectionId && rawSectionId !== '' ? [...parentSectionPath, rawSectionId] : parentSectionPath;

      if (!rawSectionId || display !== 'drilldown') {
        const isHighlighted = rawSectionId
          ? Boolean(highlightedSections && highlightedSections.includes(rawSectionId))
          : false;
        const sectionClassName = `${styles.repeatableModalSection}${
          isHighlighted ? ` ${styles.repeatableModalSectionHighlighted}` : ''
        }`;

        return (
          <div
            key={sectionId}
            className={sectionClassName}
            ref={rawSectionId ? (node) => registerSectionNode?.(rawSectionId, node) : undefined}
            tabIndex={rawSectionId ? -1 : undefined}
          >
            {field.label ? (
              <h4 className={styles.repeatableModalSectionTitle}>{field.label}</h4>
            ) : null}
            <RepeatableEntryForm
              elements={field.elements || []}
              contextPath={contextPath}
              state={state}
              setValue={setValue}
              engineStore={engineStore}
          engineStoreMode={engineStoreMode}
              labelPosition={labelPosition}
              labelWidthPercent={labelWidthPercent}
              controller={controller}
              onAddRepeatable={onAddRepeatable}
              onEditRepeatable={onEditRepeatable}
              onRemoveRepeatable={onRemoveRepeatable}
              resolveRepeatableKey={resolveRepeatableKey}
              readOnly={readOnly}
              onEnterRepeatable={onEnterRepeatable}
              registerSectionNode={registerSectionNode}
              onFieldFocus={onFieldFocus}
              highlightedSections={highlightedSections}
              sectionMetadata={sectionMetadata}
              activeDrilldownPath={activeDrilldownPath}
              activeDrilldownSectionId={activeDrilldownSectionId}
              activateDrilldownSection={activateDrilldownSection}
              focusSection={focusSection}
              parentSectionPath={nextSectionPath}
              submitCount={submitCount}
              registerFieldNode={registerFieldNode}
            />
          </div>
        );
      }

      const sectionInfo = sectionMetadata[rawSectionId];
      const drilldownPath = sectionInfo?.drilldownPath ?? [];
      const isDescendantOfActive = hasActiveDrilldown
        ? isPathPrefix(activeDrilldownPath, drilldownPath)
        : false;
      const isOnActivePath = isPathPrefix(drilldownPath, activeDrilldownPath);
      const isCurrentLevelActive =
        isOnActivePath && drilldownPath.length === activeDrilldownPath.length;

      if (hasActiveDrilldown && !isOnActivePath && !isDescendantOfActive) {
        return null;
      }

      const shouldRenderPreviewState =
        !isOnActivePath && (!hasActiveDrilldown || isDescendantOfActive);

      if (shouldRenderPreviewState) {
        return (
          <div key={sectionId} className={styles.drilldownInactive}>
            <span className={styles.drilldownLabel}>{field.label}</span>
            <button
              type="button"
              className={`${styles.formNameActionButton} ${styles.drilldownActionButton}`}
              onClick={() => {
                activateDrilldownSection(rawSectionId);
                focusSection(rawSectionId);
              }}
            >
              <span>View</span>
              <span className={styles.formNameActionIcon} aria-hidden="true">
                <ChevronRight size={16} strokeWidth={1.8} />
              </span>
            </button>
          </div>
        );
      }

      if (!isCurrentLevelActive) {
        return (
          <React.Fragment key={sectionId}>
            <RepeatableEntryForm
              elements={field.elements || []}
              contextPath={contextPath}
              state={state}
              setValue={setValue}
              labelPosition={labelPosition}
              labelWidthPercent={labelWidthPercent}
              controller={controller}
              onAddRepeatable={onAddRepeatable}
              onEditRepeatable={onEditRepeatable}
              onRemoveRepeatable={onRemoveRepeatable}
              resolveRepeatableKey={resolveRepeatableKey}
              readOnly={readOnly}
              onEnterRepeatable={onEnterRepeatable}
              registerSectionNode={registerSectionNode}
              onFieldFocus={onFieldFocus}
              highlightedSections={highlightedSections}
              sectionMetadata={sectionMetadata}
              activeDrilldownPath={activeDrilldownPath}
              activeDrilldownSectionId={activeDrilldownSectionId}
              activateDrilldownSection={activateDrilldownSection}
              focusSection={focusSection}
              parentSectionPath={nextSectionPath}
              submitCount={submitCount}
              registerFieldNode={registerFieldNode}
            />
          </React.Fragment>
        );
      }

      return (
        <div
          key={sectionId}
          className={styles.drilldownActive}
          ref={(node) => registerSectionNode?.(rawSectionId, node)}
          tabIndex={-1}
        >
          <h3 className={styles.sectionHeader}>{field.label}</h3>
          <RepeatableEntryForm
            elements={field.elements || []}
            contextPath={contextPath}
            state={state}
            setValue={setValue}
            engineStore={engineStore}
            engineStoreMode={engineStoreMode}
            labelPosition={labelPosition}
            labelWidthPercent={labelWidthPercent}
            controller={controller}
            onAddRepeatable={onAddRepeatable}
            onEditRepeatable={onEditRepeatable}
            onRemoveRepeatable={onRemoveRepeatable}
            resolveRepeatableKey={resolveRepeatableKey}
            readOnly={readOnly}
            onEnterRepeatable={onEnterRepeatable}
            registerSectionNode={registerSectionNode}
            onFieldFocus={onFieldFocus}
            highlightedSections={highlightedSections}
            sectionMetadata={sectionMetadata}
            activeDrilldownPath={activeDrilldownPath}
            activeDrilldownSectionId={activeDrilldownSectionId}
            activateDrilldownSection={activateDrilldownSection}
            focusSection={focusSection}
            parentSectionPath={nextSectionPath}
            submitCount={submitCount}
            registerFieldNode={registerFieldNode}
          />
        </div>
      );
    }

    if (field.type === 'RepeatableSection') {
      const repeatableKey = resolveRepeatableKey(field);
      if (!repeatableKey) {
        return null;
      }
      const sectionId = field.data_name || field.key || repeatableKey;
      const label = field.label || 'Repeatable Section';
      const nestedInstances =
        controller && typeof controller.getInstances === 'function'
          ? controller.getInstances(repeatableKey, contextPath) || []
          : [];
      const nestedCount = Array.isArray(nestedInstances) ? nestedInstances.length : 0;
      const nestedLabel = `${nestedCount} item${nestedCount === 1 ? '' : 's'}`;
      const nestedPillClass =
        nestedCount === 0
          ? `${styles.repeatableCountPill} ${styles.repeatableCountPillEmpty}`
          : `${styles.repeatableCountPill} ${styles.repeatableCountPillFilled}`;
      return (
        <div key={sectionId} className={styles.repeatableModalSection}>
          <div className={styles.drilldownInactive}>
            <div className={styles.drilldownInfo}>
              <span className={styles.drilldownLabel}>{label}</span>
              <span className={nestedPillClass}>{nestedLabel}</span>
            </div>
            <button
              type="button"
              className={`${styles.formNameActionButton} ${styles.drilldownActionButton}`}
              onClick={() =>
              onEnterRepeatable?.({
                  field,
                  repeatableKey,
                  contextPath,
                  sectionId,
                })
              }
            >
              <span>View</span>
              <span className={styles.formNameActionIcon} aria-hidden="true">
                <ChevronRight size={16} strokeWidth={1.8} />
              </span>
            </button>
          </div>
        </div>
      );
    }

    const dataName = field.data_name;
    if (dataName && state.visible && state.visible[dataName] === false) {
      return null;
    }
    const fieldValue = dataName ? state.values?.[dataName] : null;
    const fieldRequired = dataName ? Boolean(state.required?.[dataName]) : false;
    const fieldReadOnly =
      readOnly || (dataName ? state.read_only?.[dataName] : false) || field.type === 'TitleField';
    let fieldError = null;
    if (dataName) {
      const engineError = state.errors?.[dataName];
      if (engineError) {
        fieldError = engineError;
      } else if (fieldRequired && submitCount > 0 && isFieldValueEmpty(field, fieldValue)) {
        fieldError = 'This field is required';
      }
    }

    const handleChange =
      field.type === 'TitleField'
        ? undefined
        : (value) => {
            if (dataName) {
              setValue(dataName, value);
            }
          };

    return (
      <FieldRenderer
        key={field.key || dataName}
        ref={dataName ? (node) => registerFieldNode(dataName, node) : null}
        field={field}
        value={fieldValue}
        readOnly={fieldReadOnly}
        required={fieldRequired}
        error={fieldError}
        onChange={handleChange}
        labelPosition={labelPosition}
        labelWidthPercent={labelWidthPercent}
        onFocus={dataName ? () => onFieldFocus?.(dataName) : undefined}
        engineStore={engineStore}
        storeMode={engineStoreMode}
      />
    );
  });
}

function getRepeatableEntryTitle(field, instance, index) {
  const titleFieldDataName = field?.title_field?.data_name;
  if (titleFieldDataName && instance?.values?.[titleFieldDataName]) {
    return String(instance.values[titleFieldDataName]);
  }
  const fallbackKeys = ['title', 'name', 'label'];
  for (const key of fallbackKeys) {
    if (instance?.values?.[key]) {
      return String(instance.values[key]);
    }
  }
  return `${field?.label || 'Entry'} ${index + 1}`;
}
