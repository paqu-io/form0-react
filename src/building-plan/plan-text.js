/**
 * New building plan texts in one place, keyed the way the localization phase will key its
 * catalog (analyses/localization.md). English only for now; texts that existed before this
 * work are still where they were. `{alt}` and `{shift}` mark keys, shown as key caps.
 */
const TEXT = {
  'plan.zoom.panHint': 'Pan: Shift-drag or the middle mouse button',
  'plan.zoom.fit': 'Fit plan',
  'plan.viewOnly': 'View only',
  'plan.floor.add': 'Add floor',
  'plan.floor.none': 'No floors yet',
  'plan.floor.tabs': 'Floors',
  // The floor drawn under the one shown (F2), named after the floor tabs.
  'plan.floor.below': '{floor} below',
  // "Show" in the floor row (step 2): the plan's read-only layers.
  'plan.show.button': 'Show',
  'plan.show.title': 'Show on the plan',
  'plan.show.someOff': 'some hidden',
  'plan.show.lengths': 'Lengths',
  'plan.show.lengthsHint': 'Of the selected room, to the bare wall face',
  'plan.show.lengthsHintEntry': 'Of this room, to the bare wall face',
  'plan.show.plaster': 'Plaster',
  'plan.show.plasterHint': 'On plastered wall faces, to scale',
  'plan.show.floorBelow': 'Floor below',
  'plan.show.floorBelowHint': '{floor}, and the pulls to it',
  'plan.show.floorBelowNone': 'No floor below this one',
  // Beams and bands (D1b): bands off by default; a selected wall shows its own either way.
  'plan.show.beams': 'Beams',
  'plan.show.beamsHint': 'Room beams and beams added to walls',
  'plan.show.bands': 'Bands',
  'plan.show.bandsHint': "Every wall's ring beam, lintel and sill bands",
  // With the selected wall's name (step 2, S6): its face's plaster and the face across.
  'plan.plaster.label': 'plaster: {faces}',
  'plan.plaster.none': 'none',
  'plan.plaster.inside': '{value} (int.)',
  'plan.plaster.outside': '{value} (ext.)',
  'plan.plaster.thisSide': '{value} (this side)',
  'plan.plaster.otherSide': '{value} (other side)',
  'plan.history.undo': 'Undo',
  'plan.history.redo': 'Redo',
  'plan.status.select': 'Drag a corner to reshape · {alt} moves it freely · {shift}-drag pans',
  'plan.status.view': 'Double-click an element to open it · {shift}-drag pans',
  'plan.status.split': 'Point at a wall and click, or type a distance from its 0 end',
  'plan.status.rejoin': 'Click an editing node to rejoin aligned portions',
  'plan.status.pin': 'Click a wall to pin or unpin it, then go back to Select',
  // While a drag shows lengths (step 3): their unit, and which of them the drag changes.
  'plan.status.lengths.m': 'Lengths in metres · the highlighted ones are changing',
  'plan.status.lengths.ft': 'Lengths in feet · the highlighted ones are changing',
  // After the hint while a room's lengths show (step 2, S9), or are hidden zoomed out (S12).
  'plan.status.lengthsNote.m': 'lengths in metres',
  'plan.status.lengthsNote.ft': 'lengths in feet',
  'plan.status.lengthsHidden': 'zoom in to see the lengths',
  // A pinned wall's badge on the canvas (step 3).
  'plan.wall.pinned': 'Pinned: stays in place while you edit other walls',
  // A refused edit in the status line (1e): "1 of 2" steps through several messages.
  'plan.message.position': '{index} of {total}',
  'plan.message.next': 'Next message',
  'plan.message.dismiss': 'Dismiss',
  // The plan's validation findings in the floor row (1e).
  'plan.issues.one': '{count} issue',
  'plan.issues.other': '{count} issues',
  'plan.issues.list': 'Issues',
  'plan.issues.open': 'Double-click to open',
  // Problems to fix in the plan before saving its floor (bands 4a): the tag after their names.
  'plan.problem.tag': 'Plan',
  'plan.problem.pair': '{first} and {second}',
  // After a free wall's field label: a free wall stands in its room, so both sides face it.
  'plan.side.this': 'This side',
  'plan.side.other': 'Other side',
  // A whole-wall field's tag; on a wall other rooms share, a button with a note naming them
  // (2026-11-23, decided with a mockup).
  'plan.tag.wholeWall': 'Whole wall',
  'plan.tag.sharedWall': 'Shared wall',
  'plan.tag.sharedWith': 'Shared with {rooms}',
  'plan.tag.sharedNote.one':
    'This wall stands between both rooms, so a value set here applies to {rooms} too.',
  'plan.tag.sharedNote.other':
    'This wall stands between these rooms, so a value set here applies to {rooms} too.',
  'plan.list': '{first} and {last}',
  // Select, then add (3b): the commands, what they need, and where nothing fits.
  'plan.tool.door': 'Add door',
  'plan.tool.window': 'Add window',
  'plan.tool.column': 'Add column',
  'plan.add.doorNeedsWall': 'Select a wall to add a door',
  'plan.add.windowNeedsWall': 'Select a wall to add a window',
  'plan.add.noRoomDoor': 'No room for a door on this wall',
  'plan.add.noRoomWindow': 'No room for a window on this wall',
  'plan.add.noRoomColumn': 'No room for a column here',
};

/**
 * @param {keyof typeof TEXT} key
 * @param {Record<string, string | number>} [params]
 */
export function planText(key, params = {}) {
  return String(TEXT[key] ?? key).replace(/\{(\w+)\}/g, (match, name) =>
    name in params ? String(params[name]) : match
  );
}

/**
 * A text split around its `{placeholders}`, for texts that show keys as key caps:
 * [{ text: 'Drag a corner to reshape · ' }, { key: 'alt' }, { text: ' moves it freely' }, …].
 * @param {keyof typeof TEXT} key
 * @returns {Array<{ text: string } | { key: string }>}
 */
export function planTextParts(key) {
  return String(TEXT[key] ?? key)
    .split(/(\{\w+\})/)
    .filter(Boolean)
    .map((part) => {
      const match = /^\{(\w+)\}$/.exec(part);
      return match ? { key: match[1] } : { text: part };
    });
}
