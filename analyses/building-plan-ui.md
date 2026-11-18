# Building plan UI: plan, approach and status

The building plan part of the UI refresh: step 5 (web plan on the theme), step 10 (mobile
editor) and the second phase (dimensions), plus the items added while aligning (handles, plaster,
beams, door swing). The day-by-day log stays in `analyses/ui-refresh.md` ("Building plan round");
this file is the plan and the current state.

- Mockups: https://claude.ai/artifact/GPW3m7Tiq9XvEERPMoxYVB (private; today next to the
  proposals, working demos, decisions D1 to D21)
- Branches: form0-react and form0-react-native `feat/ui-refresh`; form0-core
  `experiment/building-plan-model`
- Harness: `.local-test-harnesses/form0-ui-refresh-20261116` (`node preview.mjs`, form "Building
  plan fixture"; `node native-web-preview.mjs` for mobile)

## Rules

1. UI first. form0-core logic is not changed unless agreed; anything that needs new data or a new
   operation is listed under "Data proposals" and waits for a go-ahead.
2. Every step is split into small units, one commit each, so a unit can be reverted on its own.
   Nothing is committed before the maintainer has tested it by hand.
3. Refactoring the legacy canvas (`src/building-plan/legacy/building-plan-canvas.js`) is limited
   to the parts a unit touches: drawing code moves into small modules under
   `src/building-plan/draw/`; event and interaction code stays where it is.
4. New UI texts go in `src/building-plan/plan-text.js` (and its mobile twin later) with the keys
   the localization phase will use (`analyses/localization.md`), English only for now.
5. Heavy commands one at a time, pinned and lowered (see "WSL crashes" in `ui-refresh.md`).

## Decisions

| Topic | Decision | Date |
|---|---|---|
| Web layout | A · Aligned: tool rail, canvas, list panel on the right | 2026-11-18 |
| Right panel | Stays the RepeatableSection list panel: title with the count pill, rows that open and delete like every list, nothing extra on the rows (a "2 rooms" pill was tried and dropped: entry rows elsewhere carry no count). No extra "Add", no fixed description | 2026-11-18 |
| Grid | magicplan style: a cross on every metre at every zoom, finer dots in between. Only density changes with zoom: dots every 10 cm, 50 cm or none (at least 14 px apart, so 100% shows crosses only); crosses one device pixel wide with 3 px arms, fading below 18 px per metre and gone below 6. No origin axes, no "0,0", no scale bar (a cross is a metre) | 2026-11-18 |
| Sharp canvas | The canvas bitmap follows `devicePixelRatio` (lines and text were stretched and soft on scaled screens); pan, zoom and pointer maths stay in CSS pixels | 2026-11-18 |
| Plan dialogs | Wider, with navigation, canvas and the whole entry form side by side; the canvas on top only on small screens (to be measured) | 2026-11-18 |
| Undo / Redo | Where the canvas edits (floor and room entries today), as icon buttons in the floor tab row | 2026-11-18 |
| Shortcuts | Plan actions are Alt+Shift+key, never plain Alt (the form's), matched on the physical key (`event.code`) | 2026-11-18 |
| Handles | Visible handles for every existing drag, web and mobile; the lengths that change are drawn while dragging; clicking a length types it | 2026-11-18 |
| Plaster | Shown on the canvas, read only, as a sand-coloured band on each plastered face, its thickness drawn to scale | 2026-11-18 |
| Doors | Drawn as a plain cut in the wall until the swing fields exist | 2026-11-18 |
| Legacy canvas | Move out only the drawing parts a unit touches; no logic changes | 2026-11-18 |
| Commits | One per unit, so each can be reverted on its own | 2026-11-18 |

Still open (mockups page, "Open decisions"): D3, D5 to D18, D21, and the questions at the end.

## Approach

| Step | What | Logic touched | Status |
|---|---|---|---|
| 1 | Look only, web: chrome and canvas on the theme tokens, grid, symbols, the list panel, one tooltip, shortcut matching | None | Done, **to test by hand** |
| 2 | Read-only layers, web: plaster band, the selected room's lengths, a Show menu | None (reads resolved values through `fieldState()`) | To do |
| 3 | Handles and live lengths, web: handles and cursors for today's drags, lengths while dragging, Pin in the rail, hints in a status line, fit on open | None (same calls) | To do |
| 4 | Typed values, web: click a length to type it (openings, columns, beams, wall lengths) | None (existing update calls; a wall length is the existing parallel move of the neighbouring wall) | To do |
| 5 | Mobile: steps 1 to 4 on react-native-svg (handles replace the Resize mode), then the full-screen editor with the bottom sheet (step 10) | None in core | To do |
| 6 | New data: door swing, wall beams and beam height, wall front view, run and rise | Core fields and operations, after agreement | Proposals |

## Step 1 (web): what was done

Three units, planned as three commits (after the hand test):

1. **Chrome on tokens, one tooltip, shortcut matching.**
   - `toolbar.css`, `zoom-controls.css` and `canvas.css` are replaced by vanilla-extract files
     (`toolbar/toolbar.css.js`, `zoom-controls.css.js`, `canvas-host.css.js`) on `vars` and
     `derived`, keeping every class name (`globalStyle`), so the legacy canvas's own DOM (floor
     tabs, Pin / unpin, hints, split distance) and the host's Undo / Redo row follow the theme.
     The canvas ground is the theme's section colour.
   - The rail keeps its groups and loses the "alt+shift+x" captions; `plan-tooltip.jsx` is one
     delegated tooltip for everything in the plan host with `data-tooltip` / `data-shortcut`
     (rail, zoom, the legacy "No floors" chip), showing the name and the keys (⌥ ⇧ on a Mac).
     Buttons get `aria-keyshortcuts`. The three CSS `::after` tooltips are gone.
   - Zoom is one horizontal pill: out, level, in, reset; the pan hint is the level's tooltip.
   - `plan-shortcuts.js`: the rail matches `event.code` (KeyD …) with `event.key` as the
     fallback. Before, Option+Shift+letter on macOS typed another character and didn't match.
   - `plan-text.js`: new texts with their future keys (`plan.zoom.panHint`, `plan.rooms.count.*`).
   - Files: `toolbar/building-plan-toolbar.jsx`, `toolbar/toolbar.css.js`, `zoom-controls.jsx`,
     `zoom-controls.css.js`, `canvas-host.css.js`, `plan-tooltip.jsx`, `plan-tooltip.css.js`,
     `plan-shortcuts.js`, `plan-text.js`, `canvas-host.jsx` (stylesheet import, tooltip, host
     ref); removed the three `.css` files. Test: `tests/building-plan-shortcuts.test.js`.
2. **Canvas drawing on the theme.**
   - `plan-tokens.css.js`: the canvas colours as custom properties on the host, derived from the
     theme with `color-mix` (no new keys in `vars`). `draw/plan-theme.js` resolves them to
     concrete colours through a hidden probe; the host passes them to the canvas
     (`setTheme`) when it is created and whenever the theme class changes. Defaults (light) are
     used until then and in tests.
   - `draw/grid.js`: crosses and dots (see Decisions); `draw/symbols.js`: a door is a cut with
     jambs and a dashed threshold, a window a cut with two glass lines, a column filled like a
     wall, a beam a dashed outline as wide as the beam (hit testing unchanged); names are plain
     text with a halo (room names in the label colour, the others muted).
   - `legacy/building-plan-canvas.js`: every colour literal replaced by the theme (rooms are the
     room surface with a faint tint of their colour, walls in wall ink, every selection, handle,
     guide and draft in the accent); its grid method calls `draw/grid.js`; the "no floors" veil
     follows the theme. 4,204 → 4,087 lines.
   - Files: `plan-tokens.css.js`, `draw/plan-theme.js`, `draw/grid.js`, `draw/symbols.js`,
     `legacy/building-plan-canvas.js`, `canvas-host.jsx` (token class, theme effect). Test:
     `tests/building-plan-canvas-theme.test.js`.
3. **List panel.** `section-view.jsx` drops its "Add" button and the fixed description (the
   field's own description still shows). Test: `tests/building-plan-editor.test.jsx` (no "Add",
   no fixed description). The rooms pill tried here was removed again (1b).

`canvas-host.jsx` carries lines of units 1 and 2; the commits will be cut so each unit has its
own lines.

Tests: web 294 of 300 with the local core (`vitest.local-core.config.mjs`, `--maxWorkers=2`);
the 6 failures are the known worker tests. Screenshots in the harness, light and dark: rail,
tooltip, zoom pill, floor tabs, list panel, grid, the door cut, a selected room.

### Hand test (web harness, form "Building plan fixture", light and dark)

1. Plan page: rail without captions; hover a tool for the tooltip with its keys; Alt+Shift+D
   picks Door, Alt+Shift+S Select (on a Mac too, if one is at hand).
2. Zoom pill: out, level, in, reset; hover the level for the pan hint; wheel and Shift-drag as
   before.
3. Canvas: crosses every metre, dots appearing as you zoom in, fading crosses when zoomed far
   out; walls in ink, rooms white (dark: light walls on dark rooms), selection in the accent;
   the door between the bedrooms as a cut; names without boxes.
4. Floors panel: count pill in the title, "2 rooms" on the row, chevron and trash as in other
   lists, no "Add", no fixed description; "Add Floor" in the header still adds a floor.
5. Floor and room entries: Undo / Redo, Pin / unpin and the hint row on the theme; drawing,
   dragging corners and walls, split and rejoin behave as before.

### Not in step 1

Pin as a rail tool, hints in a status line on the canvas, "+" in the floor tabs, fit on open,
handles, lengths, plaster, room areas, labels that keep their size on screen.

## Step 1b to 1d (web, agreed 2026-11-18)

**1b, done, to test by hand.**

- Sharp canvas: `resizeCanvas` sizes the bitmap by `devicePixelRatio`, `getViewSize()` gives
  the CSS box, a media query re-sizes it when the density changes; render maps CSS pixels onto
  the bitmap. Pan, zoom and pointer maths unchanged.
- Finer grid (see Decisions); after the hand test the dots were made a little more visible
  (30% ink, 1.25 px).
- Rooms pill dropped; `RepeatableEntryRows` back as committed.
- Entry titles, the clean way (form0-core, `experiment/building-plan-model`, not committed):
  the expander gives every plan section a `title_field` on its name field
  (`BUILDING_PLAN_TITLE_FIELDS`, exported from `building-plan/row-title.js`), so list rows,
  the entry dialog's header and stored records read it through `resolveDatasetRowTitle`. A
  `title_field` a node already has keeps its references, mapped to the expanded keys. Floors,
  rooms, doors, windows, physical walls, columns, beams and objects get one. **Wall faces
  don't**: their label is projected from the physical wall, and dataset titles (and the schema
  validator) only accept the section's own fields, so a wall's entry keeps "Walls 1". Test:
  `tests/building-plan-title-fields.test.js` (in `npm test`); core suite green. No change in
  form0-react: the floor dialog now shows "Ground floor" (asserted in
  `building-plan-editor.test.jsx`).

**1c, done, to test by hand.**

- Rail in the mockup's groups: Select, Clear selection | Draw room, Wall, Column, Beam | Door,
  Window | Split, Rejoin, Pin walls (Alt+Shift+N). Same per-mode rules as before
  (`toolbar-config.js`); Pin uses the canvas's existing `pin` mode. Lucide icons where they
  fit, `toolbar/plan-icons.jsx` for wall, column, beam and rejoin (Room and Column no longer
  share a square). "Clear" is now "Clear selection".
- Floor tabs are React (`floor-tabs.jsx`): the canvas reports its floors (`onFloorTabs`) instead
  of building the tabs; a tab calls the canvas's own `handleFloorTabClick`. "+" (the existing
  `addFloor`) only on the plan page. Undo / Redo as icon buttons at the row's right where the
  canvas edits (an entry's editor), with Alt+Shift+Z / Alt+Shift+Y; the old text row is gone.
  The card moved from the canvas panel to its wrapper, so tabs and canvas share it.
- With the external toolbar the legacy canvas no longer builds the Pin / unpin row: its hints
  are a status line over the canvas's bottom-left corner (`building-plan-status`; texts in
  `plan-text.js` with key caps: select, view, split, rejoin, pin; nothing for drawing tools),
  and the split distance is a small bar floating over the top-left corner
  (`building-plan-cut-bar`), shown while Split is the tool.
- Tests: rail order, Pin, unique keys away from Z / Y, status text parts
  (`building-plan-shortcuts.test.js`); tabs, "Add floor", Pin, Undo / Redo, no "+" in an entry,
  the status line (`building-plan-editor.test.jsx`). Web 297 of 303 (the six worker tests).

Hand test, in addition to step 1's: the rail's new icons and tooltips (Pin walls, Alt+Shift+N
in a room); floor tabs and "+" on the plan page; Undo / Redo icons and Alt+Shift+Z / Y in a
floor or room entry; the status line changing with the tool; Split showing its floating bar;
the floor dialog's header "Ground floor"; the grid's dots.

Noticed, not changed: the split distance shows the raw number (2.058621); rounding it is a
small follow-up.

**1d, to do, after mockups.** Plan dialogs wider, with navigation | canvas | form; the canvas
stays in view while the form scrolls; stacked only on small screens, measured at 1920×1080,
1536×864 (125%), 1440×900, 1366×768 and 1280×800 (1920×1200 at 150%). With it, mockups for
showing the canvas in wall, door, window, column and beam entries and their lists (read-only,
the element highlighted).

## Data proposals (step 6, to agree before any core work)

**Door swing.** Two system fields on Door: `door_hinge_side` (left, right) and `door_swing`
(inward, outward), both as seen from the room that holds the row; missing values read as right
and inward. A door on a shared wall has a row in each room; core keeps the twin mirrored.

**Beams on walls.** Today a beam is two points inside its room (`beam_start_u/v`,
`beam_end_u/v`) with width and depth; `beam_wall_segment_index` and the ratios are read-only
leftovers that core's model doesn't read. Wanted (2026-11-18): beams over a wall, over an opening
or under a window, starting at a distance from the wall's left end and never longer than the
wall, several per wall in any combination.

- One row per beam. A multiple-choice field on the wall would hold each placement once (two
  lintels over two windows wouldn't fit) and would be a second source of truth next to the
  rows. The idea of a choice with visibility rules fits per beam: a single choice on each beam
  row, with the numeric fields it needs shown by visibility rules.
- Proposed home: wall beams as children of Wall, like doors and windows (`wall_beams`), so they
  follow the wall when it moves or splits, as openings do. Beams across a room stay under Room.
- Proposed fields: `beam_label`; `beam_offset` (m from the left end, seen from inside the room,
  default 0); `beam_length` (m, offset + length ≤ wall length, default the rest of the wall);
  `beam_position` (single choice: top of the wall, over an opening, under a window, at a
  height); `beam_elevation` (m, the underside, shown for "at a height"); `beam_width`,
  `beam_depth`. Room beams gain `beam_elevation`.
- On the canvas: select, drag the two ends and the body along the wall, type offset and length.
  The position and height are edited in the form and shown in a front view of the wall.

**Plaster.** No new data. Thickness drawn to scale (2 px minimum on screen), with its value as a
label when the wall is selected.

**Run and rise on a diagonal wall.** Two existing operations (a corner move and a parallel move);
one combined core operation is the clean way.

## Status

| Item | Status |
|---|---|
| Research, mockups, decisions round 1 | Done (2026-11-18) |
| Step 1, units 1 to 3, 1b and 1c | Done, to test by hand, not committed (form0-react and form0-core) |
| 1d (layout) and the canvas in every plan entry | Mockups first |
| Steps 2 to 6 | To do |

## Open questions

0. Wall entries: their label is projected from the physical wall, so the generic title can't
   reach it (see 1b). Options: let dataset titles read projected fields (a core change in
   `dataset-descriptors.js` and the validator), or accept "Walls 1" for faces.
1. Beams: wall beams under Wall (proposed) or under Room with a wall reference. Whether "over
   an opening" / "under a window" / "top of the wall" keep the beam's height in step with that
   element (the window's head changes, the beam moves; core derives the height) or only set it
   once (the beam keeps its number). Following needs to know which opening; the beam's own span
   could tell (the opening under it).
2. Plaster: does the recorded wall thickness include plaster? If yes the band is drawn inside
   the wall and the room's lengths don't change; if not it is drawn on the face.
