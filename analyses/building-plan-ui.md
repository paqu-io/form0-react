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

Committed after the hand test (2026-11-18): form0-core `7babcdf`; form0-react `7694985`
(chrome, tooltip, shortcuts), `5d647da` (canvas drawing, sharp canvas, grid), `f611cc3` (floors
panel), `c8f114a` (1c), `f124f3b` (docs). Each form0-react commit was built and passed the plan
tests on its own.

After the commits (not committed, to test by hand): the split distance is shown to the
centimetre (`Math.round(... * 100) / 100`). Known problem, to revisit with dimensions on the
canvas: typing a distance and pressing "Split at distance" doesn't split; only clicking the wall
does.

**1d, decided 2026-11-18** (mockups page, "Dialogs (1d)"): plan entry dialogs wide, with the
canvas between navigation and the whole form, considered up to 2,560 px screens; stacked only on
small screens; the canvas fills its column; every plan entry and list shows the canvas (floor and
room edit as today, dimension quotes to come; wall, door, window, column, beam and object entries
only highlight); in lists, a row and its element mark each other, and a double-click on the canvas
opens that wall's, door's, window's, column's or beam's own entry; top labels in the plan
dialogs' form column only (the form-level `labelPosition` stays for everything else); wall
entries titled by their label (core).

Done, to test by hand (not committed):

- **Wall titles (form0-core).** Dataset descriptors keep a BuildingPlan projection as
  `projected_fields` (not a dataset field, so exports don't change); `resolveDatasetRowTitle`
  and the schema validator's title check read them; the expander no longer skips projected
  names. Wall faces are titled by their label ("W4"), in the dialog header, lists and stored
  records. Files: `src/utilities/dataset-descriptors.js`, `src/schema/schema-validator.js`,
  `src/schema/building-plan-expander.js`, `tests/building-plan-title-fields.test.js`. Core suite
  green.
- **Layout (form0-react).** `src/plan-entry-layout.css.js` and the dialog body in
  `form-renderer.jsx`: plan entries (floor, room) are `min(96vw, 2460px)` wide; from a 1,105 px
  viewport (dialog ≥ 1,060 px) three columns, navigation 200 px, canvas ≥ 420 px filling its
  column (the rail scrolls if taller), form `clamp(380px, 26%, 560px)`, each column scrolling on
  its own (the navigation's sticky offset reset inside); below that the body scrolls as one
  column with the canvas 360 px high above the form; under 768 px navigation hides as before.
  The canvas column stays for the entry's list pages (a floor's Rooms, a room's Walls). Record
  Metadata and the entry form use top labels in plan entries. Measured: 2560×1300 → dialog
  2,458, canvas 1,514×1,038, form 560; 1536×740 → 1,475 / 711×495 / 380; 1366×650 → 1,311 /
  547×408 / 380; 1024×650 → stacked, canvas 615×358.
- **Split distance** shown to the centimetre.
- Tests: `building-plan-editor.test.jsx` (wall entries titled by their label, also when opened
  from a validation issue). Web 295 of 303 in a full run: the six worker tests plus one worker
  test that passes alone (timing under load).

Second part (2026-11-18, done, to test by hand, not committed):

- **Exported records unchanged (form0-core).** The committed title change (`7babcdf`) had made
  stored records carry an `@title` on 23 plan rows of the example (values untouched). Plan
  datasets are now marked (`building_plan: true`, from `getBuildingPlanProjectionNames().rows`)
  and the three places that write `@title` (two in `record-transformer.js`, one in
  `structured-record.js`) give plan rows what they had before (no key, or `null`). Checked by
  diffing the example's stored record, its normalized form and its snapshot against the previous
  core: identical apart from timestamps. The titles stay for display (dialog headers, lists).
  Regression test in `tests/building-plan-title-fields.test.js`; core 611 of 611. Projected
  fields exist only inside BuildingPlanSection (`getBuildingPlanProjectionNames` reads the plan
  metadata), so other forms' descriptors are untouched.
- **Scale.** 100% is now 100 px per metre (was 20): a 1,000 to 1,500 px canvas shows 10 to 15 m.
  It is the canvas's units per metre (`DEFAULT_GRID_SIZE`, passed to the controller with
  `setGridSize`), so geometry stays in metres and handles and pointer tolerances keep their
  screen size at 100%.
- **Fit.** The view fits the rooms in scope on open and after a floor switch (`fitToContent`,
  margin 48 px, at most 250%); the zoom pill's last button is "Fit plan" (was "Reset zoom to
  100%"). Zoom is usable in read-only forms too (it was disabled).
- **Names keep their screen size** at any zoom; room names 14 px, other names 12 px.
- **Canvas in every plan entry.** Wall, door, window, column, beam and object entries show their
  room's canvas view only (no rail, no undo, a "View only" chip), their element marked (walls by
  face, openings by face and opening, columns and beams by their own id), the view fitted to
  the room; while an element is marked its room doesn't draw as selected. Double-click opens the
  element's own entry, as before.
- **Lists and canvas.** In a plan entry's list (a floor's Rooms, a room's Walls…) hovering or
  focusing a row marks its element; clicking an element on the canvas marks its row (accent bar)
  and scrolls it into view (`RepeatableEntryRows` `onHighlight` / `markedId`, generic).
- **Fix.** A double-click on the canvas opened the element as if it belonged to the current
  entry even when it didn't (a wall of another room from a room entry); `focusRow` now opens
  only the entry's own rows.
- **Plan page.** `section-view.css.js`: the canvas as the wide column, as tall as the screen
  allows, the Floors list 320 to 520 px beside it; stacked when the section is under 820 px
  (container query).
- Tests: web 297 of 303 (the six worker tests); plan tests and list tests green.

Hand test: the plan page and floor / room entries at a few widths (fit on open, 100% showing 10
to 15 m, Fit plan, names readable when zoomed out); a room's Walls list (hover a row, click a
wall); a wall, a door and a column entry (view only, marked, double-click a door from its wall);
read-only form (zoom works).

Not in 1d (later steps): handles, dimension quotes and typed values on the canvas; mobile.

## After the 1d hand test (agreed 2026-11-19)

Done (tested by hand, committed 2026-11-19):

- **Plan page width.** A BuildingPlanSection page is as wide as the plan dialogs
  (`PLAN_WIDE_WIDTH` in `building-plan/plan-width.js`, `min(96vw, 2460px)`) instead of the host's
  `formWidth`; a host can set another width with `buildingPlanPageWidthOverride`. A host page
  container narrower than that still limits it, so the form root now centres itself
  (`marginInline: auto`) and the web template's form page no longer caps its container at the
  form width: the header, messages and buttons keep it (`FormPage.jsx`, form0-web-tmpl-react-vite).
  The local harness does the same in page view.
- **Source tag inside dropdowns.** The building plan source tag ("Form default", the Reset
  button) sits inside a single or multiple choice dropdown, before the clear button
  (`ChoiceDropdown` `adornment`, passed as `endAdornment` by the choice fields). Radio buttons
  and checkboxes keep it below (not used in BuildingPlanSection).
- **Hit areas keep their screen size.** Handle sizes and hit distances are screen pixels at
  any zoom (`px()` in the legacy canvas). With 100 px per metre, the old canvas-unit tolerances
  had shrunk to centimetres. Room corner handles are 8 px (were 6).
- **Openings.** A door or window is hit anywhere on its band through the wall, or 6 px around
  it. A click there selects it and starts a move, as its centre handle does (`grabOpening`):
  before, only the centre handle selected an opening that wasn't selected yet, which is why it
  was easy zoomed out and hard zoomed in. A click doesn't move it (3 px before a drag starts) and
  a drag keeps the grabbed point under the pointer (`grabOffset`). While dragged, the canvas sends core's existing
  `previewOpening` each frame, as rooms, corners and walls already did, so the wall closes behind
  it and opens under it live; the drop sends the same updates (`openingDragUpdates`).
- **Wall grip.** A selected wall shows a 28 px grip on its middle (on the band's axis): two-way arrows
  at right angles to the wall, four-way for a partition drawn with the wall tool (core moves a
  room wall along its normal, a partition any way). It has a matching cursor and takes the
  drag over an opening under it. Not shown while an opening, column or beam is selected, or in
  read-only and view-only canvases.
- **Fix.** Clicking a wall now clears an opening, column or beam selected before (the wall-end
  handles already did); the list row of the wall is marked again.

Decided 2026-11-19 (mockups, section "Messages · scope (1e)"), to build:

- Canvas messages: M1 and M2. Refusals in the status line (red, icon, ×, "1 of 2"), the refused
  position as a red dashed ghost and the element in the way outlined; stored issues as red or
  amber markers on their elements, listed from "n issues" in the floor row (an item selects the
  element and marks its list row). The text row under the canvas goes (no layout shift).
- Out of scope: V1. Three levels: the entry's element in full colour, its room at half strength
  (walls), the rest faded (faint walls, no fill, grey names); a shared wall takes the level of
  the room in scope, openings follow their wall; no hover and an arrow cursor over faded
  elements.

Remaining in step 3: lengths while dragging; handle and cursor review for columns and beams.

## 1e: canvas messages and scope (2026-11-19)

Plan agreed on the frames artifact "Building Plan 1e Frames":

- **M2 sources.** Shared-property conflicts are never stored (core refuses such a record and asks
  at edit time), so the only stored source is the form's validation of plan rows: red only, no
  amber for now. A record that fails to load shows as a red status with ×.
- **M2 timing.** Markers after the first Save attempt, then live, like the Validation tab and the
  form's own required fields. A one-line switch if live from the start is wanted later.
- **M2 count.** The chip counts what is in scope: the room in room and element entries, the floor
  on the plan page and in floor entries.
- **Ghost lifetime.** The ghost and the outline stay with the message after the drop, until the
  next gesture, × or Esc. (Today's behaviour, message only, was fine too; this one is to try.)
- **V1 focus.** A separate `focus` input, the entry's own element (`buildingPlanModalContext
  .highlight`), so hovering a list row doesn't move the levels.
- **Refactor.** `makeAdapters` and the key lookup moved to `canvas-adapters.js` (move only), so
  `canvas-host.jsx` went from 671 to 410 lines.
- **Dialog banner.** The red banner at the top of an entry dialog (core refusing an edit made in
  the form part: a typed value, "Reset to inheritance", removing a nested row) stays as it is.
  Showing it under the refused field is a candidate for step 4. Confirmed after the M1 hand
  test, where it showed "The opening height and sill must fit the accepted wall height."
- **Nested rows (M2):** a click on an element one level below the list (a window, under the
  Walls list of a room entry) marks the nearest row the list has (its wall), from the issues list
  and from the canvas alike. Today it marks no row.

### M1: refusals in the status line (hand-tested 2026-11-19, committed)

- The status line is React now (`plan-status.jsx`, `plan-status.css.js`), over the canvas's
  bottom-left corner as before. The legacy canvas reports its hint key (`onStatus`) instead of
  building DOM. A refusal turns it red, with an icon, "1 of 2" (steps through several messages)
  and ×. One live region throughout. The row under the canvas (`.building-plan-conflict`) is gone.
- The canvas keeps the messages, since the ghost belongs to the gesture: the controller's
  `reportIssues` goes to `canvas.receiveIssues` (issues reported before the canvas exists are
  handed over), and Undo / Redo results too. Messages are grouped by text (twin faces report
  one refusal twice). The host renders what the canvas reports (`onMessages`).
- Ghost (`draw/refusal-marks.js`): read from the drag state before each preview, because core
  keeps the last allowed preview. Room move (its outline moved, with an arrow), room resize (the
  rectangle), corner (the two edges to the dragged corner, arrow), wall (the dragged line,
  arrow), opening (a box across the wall). Columns and beams don't preview, so they have none.
- Outline: the elements the shown message names (`plan-messages.js`): its subject (room, room
  face by its physical wall, physical wall, opening, column, beam), plus `roomIds` (rooms that
  overlap or stand in the way) and `openingIds` (openings a cut would remove). Floors, cuts,
  edges and vertices name nothing drawn; several derived-engine refusals carry no subject
  (for example "An opening no longer fits its wall"), so they get the ghost and the message only.
- Cleared together by the next pointer-down on the canvas, ×, Esc, or a floor tab change. Esc
  only acts on the canvas last touched, so a stale message on the plan page under a dialog
  doesn't swallow the dialog's Esc. A first Esc dismisses the message, a second one reaches the
  dialog.
- New plan token `error` (the theme's error colour). New texts `plan.message.position`,
  `plan.message.next`, `plan.message.dismiss`.
- Logic unchanged: on drop the canvas still commits the pointer's position; a refusal leaves the
  element where it was before the drag, as before.
- Tests: `tests/building-plan-refusal.test.js` (grouping, targets, each ghost, outlines, drawing,
  the canvas's message state). The editor test still finds the hint in a floor dialog. Web 310
  of 317 with the local core (the six worker tests and the numeric setters timing flake).
  Checked in headless Chromium, light and dark: a room dragged onto its neighbour shows "The
  proposed rooms overlap.", the dashed ghost with its arrow and both rooms outlined, all of it
  still there after the release, gone after Esc with the dialog still open.

After the hand test: the arrow started where the drag began, which while dragging can be behind
where the element stopped. It now starts where the element is shown at each redraw
(`refusalArrowStart`): where it stopped while the drag goes on, where it went back after the
drop. It grows as the pointer pulls past the limit and shows from 16 px. Openings got the arrow
too (along their wall). To test by hand.

Hand test (form "Building plan fixture", a floor or room entry):

1. Drag a room onto another: red status line, dashed ghost and arrow, both rooms outlined; no
   row appears under the canvas and nothing below moves.
2. Release: the room goes back; ghost, outline and message stay. Click the canvas, or ×, or
   press Esc: all three go. Esc again closes the dialog.
3. Drag a wall or a corner so it cuts an opening; drag an opening onto another: ghost and
   outline where core names the element.
4. A refusal that names several things or has twin messages: "1 of 2" steps, the outline
   follows.
5. The hint still shows with key caps; in dark mode the red reads well.
6. Undo / Redo still work; a refused one shows its message without a ghost.

### M2: findings on the canvas (hand-tested 2026-11-19, committed)

- Source: the root form's findings on plan rows, the Validation tab's list (after a Save
  attempt, then live). The root turns them into id paths from the floor (`plan-findings.js`,
  `buildingPlanFindings`) and provides them to every plan canvas below it
  (`plan-findings-context.jsx`): the plan page's and the dialogs'.
- Scope: the plan page lists the floor shown (the canvas's floor tab now reports its row id); a
  floor entry its floor; room and element entries their room (`findingScope`, from the entry's
  path).
- Drafts: a dialog's edits reach the root record only when its floor is saved, so a dialog
  drops the findings its draft has fixed since. `editor.evaluate` writes `required` and
  `errors` on each draft row; a finding whose row is gone, or whose field is now filled and
  without error, is not shown. New rows a dialog adds are not listed until saved (as in the
  Validation tab).
- Markers: one per row, red with "!", a fixed size on screen (`draw/issue-markers.js`), up and to
  the right of the element: halfway along a wall face, an opening's, column's or beam's centre,
  the top right of a room's name. A row is matched to its element by index path (every canvas
  entry carries `path`), so the plan page needs no row resolver. Floor findings have no marker.
- "n issues" (`plan-issue-list.jsx`) in the floor row's end group, with "View only" and
  Undo / Redo. The list names each finding by the rows below the scope, innermost first
  ("W1 · Bedroom" in a floor entry, "W1" in a room entry), then the field and its messages. A
  click selects the element (`canvas.selectRow`, reported as a canvas click is), a double-click
  opens its entry (`focusRow`, as a canvas double-click). Esc or a click elsewhere closes it.
- Nested rows: the list marks the nearest row it holds (`markPlanRow`): a wall in a floor entry
  marks its room, a window in a room entry its wall. Canvas clicks do the same now.
- Test page: the preview has a new form, "Building plan, required notes" (`form=plan-issues`):
  the fixture with its room and wall text notes required, built in memory. The fixture itself
  has no findings after Submit (every required plan field has a default), and a dialog won't
  save with one of its own required fields empty. Restart `preview.mjs` to get it.
- Found on the way: an exterior wall lists the same text twice, here and in the Validation
  tab. Core's contract copies a wall-face field for the outside face (`finish` and
  `finish_outside`) with the same label; the form tells them apart by the tag after the label
  ("Room side", "Exterior"), which the findings don't carry. Core's example schema also labels
  the field "Room-side finish", which is wrong on the outside copy. Proposed fix under "Open
  questions".
- Tests: `tests/building-plan-findings.test.js` (findings, scope, the draft check, items,
  markers, `selectRow`), two editor tests (no chip before Submit; a floor dialog lists the
  findings and marks the room row of the wall picked). Web 324 of 332 with the local core (the
  six worker tests and the numeric setters flake, both variants this run; they pass alone).
  Checked in headless Chromium, light and dark, on the new form: 20 issues on the plan page and
  in the floor entry, 10 in the room entry; picking a wall marks its room's row, then its own.

Hand test (form "Building plan, required notes"):

1. Before Submit: no chip anywhere. Submit: "n issues" on the plan page, markers on the walls
   and rooms of the floor shown; another floor tab shows its own.
2. Open the floor, then a room: the count narrows to the entry's floor, then room; the list
   names the rows below it.
3. Click an item: the element is selected on the canvas and its row (or its room's, its wall's)
   is marked in the list. Double-click: its entry opens.
4. Fill a note in a wall entry and save the wall: its marker and item go before the floor is
   saved.
5. Esc closes the list and not the dialog; dark mode reads well.

Outcome: works. Follow-up: the "!" a little bigger (done with V1).

### V1: scope levels (hand-tested 2026-11-19, committed)

Before V1 the canvas faded what lay outside the entry's room with transparency (rooms at 55 %,
wall lines at 35 %), but drew the thick walls in one pass at full strength, so a room entry
still showed every other room's walls fully dark ("the fading is not very visible").

- Levels (`draw/scope-levels.js`): the plan page and floor entries have none. A room entry draws
  its room and everything in it in full and fades the rest. An element entry (wall, door,
  window, column, beam) draws the element in full, the rest of its room at half strength (its
  walls, openings, columns and beams, and the room's outline; the surface and name stay), and
  fades the rest. A wall in focus is drawn whole, past this room's side of it (decided
  2026-11-19), with the openings in it. A wall shared with a faded room takes the level of the
  room in scope; an opening follows its room side.
- Focus: a new `focus` input on the canvas host, the entry's own element
  (`buildingPlanModalContext.highlight`), so hovering a list row doesn't move the levels.
- Tones, not transparency: new plan tokens, as colour mixes resolved like the others: `ground`
  (the canvas behind the rooms), `wallHalf` and `symbolHalf` (50 % over the room surface),
  `wallFaint` and `symbolFaint` (24 % over the ground), `labelFaint` (30 %). Faded rooms have
  no surface (the ground shows through), and an opening's gap there shows the ground.
  Overlapping walls don't stack.
- Thick walls in three passes (`draw/walls.js`, moved out of the legacy canvas): faded, half,
  full, so the stronger level wins at junctions.
- Names: grey for faded rooms, walls, columns and beams; faded openings keep hiding theirs.
- Cursor: a plain arrow over faded rooms and walls, also on view-only canvases; elsewhere as
  before. Faded elements already ignored hover and clicks.
- The "!" markers are larger (disc radius 9.5 px, "!" 13 px).
- Tests: `tests/building-plan-scope-levels.test.js` (levels per entry, tones, footprint order,
  faded hit test, cursor, a faded room's drawing). Checked in headless Chromium, light and
  dark: floor, room, wall and door entries; the arrow over faded areas in room and wall
  entries; no page errors.

Hand test (form "Building plan fixture", then "Building plan, required notes"):

1. Plan page and a floor entry: nothing fades.
2. A room entry: the room in full, the other rooms without surface, their walls faint and
   names grey; the wall shared with the room in scope stays dark. Arrow cursor over the faded
   part; editing in the room works as before.
3. A wall entry (from the room's Walls list): the wall dark and whole, the rest of the room's
   walls mid grey, the rest faint. Hovering rows in the Walls list still marks them on the
   canvas, without changing the levels.
4. A door or window entry (double-click it): the opening in full, its room at half strength.
5. Dark mode reads well. The "!" markers after a Save attempt are larger.

### Same label on both faces of a wall field (hand-tested 2026-11-19, committed)

Open question 3, agreed 2026-11-19.

- form0-react: the findings tag the outside copy of a wall field with the tag the form shows
  after its label, so the Validation tab, the issues list and an entry's own Validation list
  read "Finish" and "Finish · Exterior" (or "Opposite face"). Only outside copies are tagged.
  The tag comes from the plan's field state (`editor.fieldState`): the root reads it through
  an editor of the plan, made only when such a finding comes (`planSideStates` in
  `plan-findings.js`); an entry uses its own editor. The form's tag texts stay where they were
  (`buildingPlanFieldTag` in `form-renderer.jsx`, shared by the form and the lists).
- form0-core: the example's wall field is labelled "Finish" (it was "Room-side finish"),
  in `create-example.js` and `schema.json`. The test page's plan fixture comes from it.
- Tests: `locatePlanRow` and `planSideStates` in `tests/building-plan-findings.test.js`; the
  M2 editor test checks "Wall note · Exterior". Checked in headless Chromium on the required
  notes form: exterior walls list "Finish" and "Finish · Exterior"; a wall entry's Validation
  tab too.

Hand test: on "Building plan, required notes", Submit, then the Validation tab and "n issues":
each exterior wall lists "Finish" and "Finish · Exterior". In a wall entry the fields read
"Finish" with "Room side" and "Exterior" tags. Restart `preview.mjs` to get the core label.

### After the V1 hand test (2026-11-19)

V1 and the label fix work. Raised during the test, to align on:

1. **Long decimals in opening values** (a door: width 0.9000000000000001, distance from wall
   start 0.7314717950526478). Two causes. (a) A bug in core: an opening entry opened from a
   wall edits the face's copy of the opening (`face_doors`, `face_windows`), and the
   presentation only knows system fields, not those copies, so their values are shown raw
   (`toPrecision(14)` would trim 0.9000000000000001), their labels keep "(m)", and imperial
   would show metres. (b) Opening drags don't snap, so a position is whatever the pointer gave.
   `ROUND()` doesn't apply: it is a calculation builtin, and these are stored values.
2. **W3 can't be moved** ("The wall does not reach the changed room corner…", then it goes
   back). In the fixture W3 is the wall the two bedrooms share. Moving it moves a corner of the
   first bedroom past the end of its side wall (W2), and core requires every edge of a changed
   room to be covered by walls (`capturedBoundaryIssues`, `incomplete_boundary_binding`). It
   doesn't extend W2 by itself, since the extension would be a new piece of wall between the
   two bedrooms. A rule as designed today, not a canvas bug.
3. **Name the selected element.** Only room names show on the canvas (since 1d); a selected
   wall, door, window, column or beam should show its name.

### Opening entries by double-click (noted for later)

Raised at the M2 hand test: double-clicking a room, wall or door (on the canvas, in the issues
list, in the Floors, Rooms or Walls lists) opens entries with jumps, and it's hard to tell
where in the form you land. To review in a later round: what the page behind does (scroll),
which dialog and which part of it opens, where focus goes, and how the way back reads.

### Measurement units (noted for later)

`measurement_system` (si or imperial, default si) is a form attribute, not a BuildingPlanSection
one. Values are always stored in metres; core's presentation converts the form fields (m and mm,
or ft and in) and puts the unit in their labels. On the canvas only the split distance uses it.
Grid, snapping (5 m, 1 m or 10 cm by zoom) and nudges (10 cm) are metric only, so in imperial a
room can't snap to exactly 12 ft. To handle with the first lengths on the canvas (lengths while
dragging, step 3): grid and snap steps per system. 1e shows no lengths.

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
| Step 1, units 1 to 3, 1b, 1c and 1d | Done and committed (form0-react, form0-core) |
| Plan page width, dropdown source tag, step 3 first part (hit areas, opening clicks and preview, wall grip) | Done and committed |
| 1e: move-only `canvas-adapters.js`, M1 (refusals in the status line) | Done and committed |
| 1e: M2 (issue markers and list) | Done and committed |
| 1e: V1 (scope levels), with a larger "!" | Done and committed |
| Same label on both faces of a wall field (form0-react, core example) | Done and committed |
| After V1: opening decimals, moving a shared wall, the selected element's name | To align |
| Opening entries by double-click (jumps) | To review |
| Rest of step 3, then step 2 (lengths, plaster), step 4, step 5 | To do |
| Step 6 | Proposals |

## Open questions

1. Beams: wall beams under Wall (proposed) or under Room with a wall reference. Whether "over
   an opening" / "under a window" / "top of the wall" keep the beam's height in step with that
   element (the window's head changes, the beam moves; core derives the height) or only set it
   once (the beam keeps its number). Following needs to know which opening; the beam's own span
   could tell (the opening under it).
2. Plaster: answered 2026-11-19. The recorded wall thickness is the wall only; plaster is
   additional, so its band is drawn on the face, into the room.
3. Same label on both faces of a wall field (found at M2). Agreed 2026-11-19, done (see
   above). Proposed: (a) in form0-react, the
   findings carry the tag the form shows after the label, so the Validation tab and the issues
   list read "Finish · Exterior" (the outside copy is its own data name, `finish_outside`, and
   the plan metadata marks it `outside`); (b) in core's example schema, "Room-side finish"
   becomes "Finish", since the form tags the side. Not proposed: core rewriting the copy's label
   in the contract (English text in the schema, shown twice next to the tag).
