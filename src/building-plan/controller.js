import { useMemo } from 'react';

const NODE_KEYS = {
  floors: 'floors',
  rooms: 'rooms',
  walls: 'walls',
  columns: 'columns',
  beams: 'beams',
  doors: 'doors',
  windows: 'windows',
};

const DEFAULT_SCOPE = {
  floorId: null,
  roomId: null,
};

/**
 * Resolve a repeatable (preferred) key for a blueprint node.
 */
function getRepeatableKey(meta, nodeKey) {
  if (!meta) return null;
  const fromMap = meta.repeatablesByNodeKey?.[nodeKey];
  if (fromMap?.preferredKey || fromMap?.key) {
    return fromMap.preferredKey || fromMap.key;
  }
  const match = Array.isArray(meta.repeatables)
    ? meta.repeatables.find((entry) => entry?.nodeKey === nodeKey)
    : null;
  if (match?.preferredKey || match?.key) {
    return match.preferredKey || match.key;
  }
  return null;
}

/**
 * Minimal derived controller for BuildingPlan data to drive canvases.
 * It does not perform geometry logic; it only scopes repeatable data and
 * computes capability flags per view context.
 */
export function useBuildingPlanController({
  sectionDataName = null,
  buildingPlanMeta = [],
  repeatableState = {},
  mode = 'parent', // 'parent' | 'floor-modal' | 'room-modal'
  scope = DEFAULT_SCOPE,
  onViewFloor = null,
  onRemoveFloor = null,
} = {}) {
  const metaEntry = useMemo(() => {
    if (!Array.isArray(buildingPlanMeta)) return null;
    if (sectionDataName) {
      return buildingPlanMeta.find((entry) => entry?.dataName === sectionDataName) || null;
    }
    return buildingPlanMeta[0] || null;
  }, [buildingPlanMeta, sectionDataName]);

  const repeatableKeys = useMemo(() => {
    if (!metaEntry) {
      return {};
    }
    return {
      floors: getRepeatableKey(metaEntry, NODE_KEYS.floors),
      rooms: getRepeatableKey(metaEntry, NODE_KEYS.rooms),
      walls: getRepeatableKey(metaEntry, NODE_KEYS.walls),
      columns: getRepeatableKey(metaEntry, NODE_KEYS.columns),
      beams: getRepeatableKey(metaEntry, NODE_KEYS.beams),
      doors: getRepeatableKey(metaEntry, NODE_KEYS.doors),
      windows: getRepeatableKey(metaEntry, NODE_KEYS.windows),
    };
  }, [metaEntry]);

  const derived = useMemo(() => {
    const floorKey = repeatableKeys.floors;
    const roomKey = repeatableKeys.rooms;

    const floors =
      floorKey && Array.isArray(repeatableState[floorKey]) ? repeatableState[floorKey] : [];
    const floorField =
      metaEntry?.repeatablesByNodeKey?.[NODE_KEYS.floors]?.field ||
      (metaEntry?.repeatables?.find((r) => r?.nodeKey === NODE_KEYS.floors)?.field ?? null);

    const mappedFloors = floors.map((floor) => {
      const rooms =
        roomKey && floor?.repeatable?.[roomKey] && Array.isArray(floor.repeatable[roomKey])
          ? floor.repeatable[roomKey]
          : [];
      const isActiveFloor = scope.floorId ? floor.id === scope.floorId : false;
      return {
        id: floor.id,
        label: floor.values?.floor_name || null,
        values: floor.values || {},
        rooms: rooms.map((room) => {
          const isActiveRoom = scope.roomId ? room.id === scope.roomId : false;
          return {
            id: room.id,
            label: room.values?.room_name || null,
            values: room.values || {},
            repeatable: room.repeatable || {},
            isActive: isActiveRoom,
            isDimmed: Boolean(scope.roomId && room.id !== scope.roomId),
          };
        }),
        repeatable: floor.repeatable || {},
        isActive: isActiveFloor,
        isDimmed: Boolean(scope.floorId && floor.id !== scope.floorId),
      };
    });

    const hasAnyRooms = mappedFloors.some((floor) => floor.rooms.length > 0);
    const hasRoomsInScope = scope.floorId
      ? mappedFloors.some((f) => f.id === scope.floorId && f.rooms.length > 0)
      : hasAnyRooms;

    const toolbarState = (() => {
      // Base permissions
      const base = {
        canSelect: true,
        canMove: false,
        canResize: false,
        canMoveResize: false,
        canDrawFloor: false,
        canDrawRoom: false,
        canDrawWall: false,
        canDrawColumn: false,
        canDrawBeam: false,
        canDrawDoor: false,
        canDrawWindow: false,
      };

      // Parent canvas: select only (no move, no resize)
      if (mode === 'parent') {
        return base;
      }

      // Floor canvas/modal: select + move (no resize)
      if (mode === 'floor-modal' || mode === 'floor') {
        base.canMove = true;
        base.canMoveStructural = false; // Only move rooms; walls/columns/beams stay fixed here
        base.canDrawRoom = true; // Can draw rooms in floor view
        return base;
      }

      // Room canvas/modal: select + move + resize, full drawing
      if (mode === 'room-modal' || mode === 'room') {
        return {
          ...base,
          canMove: true,
          canMoveStructural: true,
          canResize: true,
          canMoveResize: true,
          canDrawWall: true,
          canDrawColumn: true,
          canDrawBeam: true,
          canDrawDoor: true,
          canDrawWindow: true,
        };
      }

      return base;
    })();

    return {
      meta: metaEntry,
      repeatableKeys,
      floorField,
      floors: mappedFloors,
      hasFloors: mappedFloors.length > 0,
      hasAnyRooms,
      toolbarState,
      // Back-compat for any consumers still checking the old combined flag
      toolbarStateLegacy: {
        ...toolbarState,
        canMoveResize: toolbarState.canMove && toolbarState.canResize,
      },
      scope: {
        floorId: scope.floorId || null,
        roomId: scope.roomId || null,
      },
      onViewFloor,
      onRemoveFloor,
    };
  }, [metaEntry, repeatableKeys, repeatableState, scope, onViewFloor, onRemoveFloor]);

  return derived;
}
