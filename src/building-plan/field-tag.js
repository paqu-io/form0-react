import { planText } from './plan-text.js';

/**
 * The tag after a building plan field's label: where its value sits (moved from
 * `form-renderer.jsx`, 2026-11-23). A whole-wall field says "Whole wall", or "Shared wall" on a
 * wall other rooms share (`sharedWith`, from core), with a note naming them
 * (`buildingPlanFieldNote`). Both sides of a free wall face its room: "This side" (the row's) and
 * "Other side"; nothing shares a free wall, so its own fields (its thickness) carry no tag.
 * `isFreeWall` is asked only for a tagged field.
 */

const listed = (names) =>
  names.length < 2
    ? names.join('')
    : planText('plan.list', { first: names.slice(0, -1).join(', '), last: names.at(-1) });

const sharedRooms = (propertyState) => propertyState.sharedWith || [];

/**
 * @param {object} propertyState core's field state
 * @param {() => boolean} [isFreeWall]
 * @returns {string | null}
 */
export function buildingPlanFieldTag(propertyState, isFreeWall = () => false) {
  // A band row's value shows where it comes from without a position tag (bands unit 3).
  if (propertyState.untagged) return null;
  const otherSide = propertyState.outside || propertyState.opposite;
  if ((otherSide || propertyState.source) && isFreeWall()) {
    if (otherSide) return planText('plan.side.other');
    return propertyState.scope === 'physical_wall' ? null : planText('plan.side.this');
  }
  return propertyState.outside
    ? 'Exterior'
    : propertyState.opposite
      ? 'Opposite face'
      : !propertyState.source
        ? null
        : propertyState.scope === 'physical_wall'
          ? planText(
              sharedRooms(propertyState).length ? 'plan.tag.sharedWall' : 'plan.tag.wholeWall'
            )
          : 'Room side';
}

/**
 * The note a shared wall's whole-wall field opens from its tag: which rooms share it, and that a
 * value set here applies to them too. Null for any other field.
 * @param {object} propertyState core's field state
 * @param {() => boolean} [isFreeWall]
 * @returns {{ title: string, body: string } | null}
 */
export function buildingPlanFieldNote(propertyState, isFreeWall = () => false) {
  const rooms = sharedRooms(propertyState);
  if (
    !rooms.length ||
    buildingPlanFieldTag(propertyState, isFreeWall) !== planText('plan.tag.sharedWall')
  )
    return null;
  const names = listed(rooms.map((room) => room.name));
  return {
    title: planText('plan.tag.sharedWith', { rooms: names }),
    body: planText(rooms.length === 1 ? 'plan.tag.sharedNote.one' : 'plan.tag.sharedNote.other', {
      rooms: names,
    }),
  };
}
