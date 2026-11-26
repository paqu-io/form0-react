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
| Step 2 layers | A Show menu (Lengths, Plaster, Floor below), the plaster's real thickness to scale, the selected room's lengths: S1 to S12, see "Step 2: decisions" | 2026-11-22 |

Still open (mockups page, "Open decisions"): D3, D5 to D7, D9 to D15, D17, D18, D21 (D8 settled
by step 2's S2 and S8), and the questions at the end.

## Approach

| Step | What | Logic touched | Status |
|---|---|---|---|
| 1 | Look only, web: chrome and canvas on the theme tokens, grid, symbols, the list panel, one tooltip, shortcut matching | None | Done, **to test by hand** |
| 2 | Read-only layers, web: plaster band, the selected room's lengths, a Show menu | None in records (reads resolved values through `fieldState()`); a core controller setting turns the floor below's pulls off | Done (2026-11-23): 2a, 2a-2, 2b, 2c committed |
| 3 | Handles and live lengths, web: handles and cursors for today's drags, lengths while dragging, Pin in the rail, hints in a status line, fit on open | None (same calls) | Done (2026-11-22): see "Step 3: wrap-up" |
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
Decided 2026-11-21, see "Step 3, rest: handles, cursors and lengths".

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
   back). The refusal is core's `capturedBoundaryIssues` (`incomplete_boundary_binding`): after
   a room's outline changes, each of its edges must be covered by the walls bound to it. The
   first reading (the fixture's shared W3) was wrong: replayed in core, that move is accepted.
   The hand test's plan was another one (R#1 with R#3 and R#2 against its right wall, R#2
   reaching lower; R#1's bottom wall moved down to R#2's), and a rebuild of it from the
   screenshot is accepted too, also past R#2's bottom. The cause lies in that plan's history,
   so it needs the plan itself: see "Capturing a plan" below. Not decided until then. The
   hand tester couldn't reproduce it afterwards; the "Save state" button stays for next time.
3. **Name the selected element.** Only room names show on the canvas (since 1d); a selected
   wall, door, window, column or beam should show its name.

Agreed 2026-11-19: a 1 cm step; the order below; W3 decided once its cause is known.

### The selected element's name (hand-tested 2026-11-19, committed)

- A selected wall, door, window, column or beam shows its name in the selection colour, while
  names other than rooms' stay hidden. A wall's or opening's name goes beside the middle of its
  line, on the room's side, clear of the wall (`draw/selection-name.js`); a column's and a
  beam's above it, as before. A selected wall isn't named while one of its openings is the
  selection. In an entry, the element is selected, so it is named too.
- Tests: `tests/building-plan-selection-name.test.js`. Checked in headless Chromium: a wall
  entry names its wall, a dragged door is named.

### Openings on a 1 cm step (hand-tested 2026-11-19, committed)

- form0-core, a bug: a door or window entry opened from a wall edits the face's copy of the
  opening (`face_doors`, `face_windows`), which the presentation now treats as the field it
  copies (the same unit, label and conversion; `presentation.js`). The entry shows
  "Width [m]" and 0.9, not "Width (m)" and 0.9000000000000001, and imperial converts.
- form0-react: a dragged, resized or placed opening keeps its distance from the wall start and
  its width in whole centimetres (`opening-snap.js`), in the preview and on the drop alike. The
  step is taken in metres along the physical wall, where the values are stored.
- form0-core: the canvas controller stores an opening's width and distance from the wall start
  to the millimetre (ratios times the wall's span carry float noise), kept within the room
  side's portion of the wall.
- Existing values aren't changed until the opening is moved or resized.
- Tests: `tests/building-plan-opening-snap.test.js` (both directions along the wall, a move
  keeps the width, a resize, the ends of the room side); core
  `tests/building-plan-measures.test.js` (the face copies, millimetres). Core's building plan
  tests 613 of 613; web 344 of 350 (the six worker tests). Checked in headless Chromium: a
  dragged door reads width 0.9 and distance 1.1 in its entry.

Hand test (form "Building plan fixture"):

1. Select a wall, a door, a window, a column and a beam on the plan page or in a floor entry:
   each shows its name in blue; clicking elsewhere hides it. Wall and door entries name their
   element.
2. Drag a door along its wall, resize it from an end, add a new window: in their entries,
   "Width [m]" and "Distance from wall start [m]" show whole centimetres.
3. Dark mode reads well.

### Free walls and room contents (2026-11-19, to align)

Raised at the hand test of the two units above. Agreed: free walls lock to horizontal and
vertical only; a free wall's centreline stays inside its room (its ends may touch the outline);
a room edit that would leave one of its free walls outside is refused, naming it; free walls are
drawn by their centreline; a free wall's two sides are tagged "This side" and "Other side";
columns after free walls; beams wait for step 6. Order: the fading fix, free walls inside their
room and drawn by their centreline, selection as a whole with the wall's own side marked,
snapping, columns.

Found while checking: core accepts a free wall drawn outside its room (the canvas only lets a
drawing start inside the room, and keeps its ends within the room's bounding box, not its
outline), one moved outside, and a room shrunk past its free wall. A free wall has a single row
(its drawn face; the thickness goes to one side); the row holds both sides' answers (plaster on
this side, and "Opposite face"). Core runs two geometry engines today, and the derived one
replaces the current one at "the switch" (4f-2, planned in the core redesign track,
`reform-backend-nestjs/docs/building-plan-derive-step-3-item-4.md`).

Raised next, to think through as a whole before any core change: when a room wall moves, the
free walls, columns and beams touching it should follow it (a beam lengthens or shortens),
unless something would end up outside the room.

**Room contents: rules (agreed 2026-11-19).** For everything a room holds: free walls, columns,
beams (later objects); doors and windows stay on their wall as today.

1. Ownership: an element belongs to its room, lies inside its outline (touching it is allowed),
   and no edit may leave it outside: the edit is refused, naming the element. For columns, the
   outline is widened to include the room's own walls, so a column may sit in them (decided
   2026-11-20, unit 3).
2. Attachment from contact (decided): whatever touches a wall is attached to it (a free wall's
   end, a column's side, a beam's end); nothing new is stored, core finds the contacts when an
   edit starts; snapping makes contacts exact.
3. What moves: what isn't attached keeps its place relative to the parts of the room that don't
   move, and moves with the room when the whole room moves; what is attached follows its wall (a
   free wall's end, so the wall gets longer or shorter; a column; a beam's end, so the beam
   lengthens or shortens); a free wall touching a moving free wall follows it too; at a corner
   move, attached points keep their relative position along their wall (decided). Then rule 1.
4. Splits, rejoins, removals: nothing to update (contacts are derived).

Checked on both engines (probe, the fixture's first bedroom): moving its left or right wall
leaves a window on the top wall, a column and a free wall where they were (the column's stored
fraction of the room's box is rewritten so it stays put); moving the whole room moves all three
with it. So the "relative to the room" part of rule 3 is today's behaviour; what is new is
attached contents following their wall, and rule 1.

Where and when (decided): in the derived engine, before the switch (today's engine retires at
4f-2 and is not changed); tested with `engine=derived` on the test page. Columns and beams keep
their stored fractions: core works in metres and rewrites them (as checked). No storage format
was planned for columns; step 6 only proposes one for beams on walls.

**Plan of work (2026-11-19).** In form0-react first, since none of it depends on the engine:
(1) a free wall selected as a whole, its sides tagged "This side" and "Other side"; (2)
snapping for free walls (horizontal and vertical, pulls to corners, ends and lines, the 1 cm
step, kept inside the room's outline while dragging; core's interaction helper and the canvas);
(3) columns, the same. Then the derived engine: (4a) free walls drawn by their centreline and
kept inside their room (rule 1, room edits included); (4b) attached contents follow their wall
(rules 2 and 3). Attachment relies on exact contact, which (2) and (3) give, so they come first.
Added after the unit 2 hand test, for 4a: a free wall's end on a room face, or on another free
wall's side, is cut along it (no triangle at an angle).

### A free wall selected as a whole (hand-tested 2026-11-19, committed)

- Canvas: a selected free wall (not a room's side nor a Split portion of one) has its body
  outlined (1.5 px), its own side (the line it was drawn along, the row's side) as a 4 px line,
  and its name on that side, away from its body. Room walls are selected as before.
- Form: a free wall's side fields are tagged "This side" (the row's) and "Other side" (the copy
  for the side across), in the entry, its Validation tab and the plan's findings. Room walls
  keep "Room side", "Opposite face" and "Exterior". The row is told by its model's free path
  (`editor.resolveRow`); the findings get it from `planSideStates` (`freeWall`). New texts in
  `plan-text.js` (`plan.side.this`, `plan.side.other`).
- A free wall's physical-wall fields (its thickness) read "Shared physical wall", though
  nothing shares it. Agreed 2026-11-19: no tag there (hand-tested 2026-11-19, committed;
  `buildingPlanFieldTag` in `form-renderer.jsx`).
- Tests: `tests/building-plan-selection-name.test.js` (a selected free wall),
  `tests/building-plan-findings.test.js` (`freeWall`). Web 346 of 353 (the six worker tests and
  the numeric setters flake). Checked in headless Chromium, light and dark: a wall drawn in a
  room entry, then its own entry ("Plaster" with "This side" and "Other side").

Hand test (form "Building plan fixture"): in a room entry, draw a free wall and select it (the
whole wall outlined, the drawn side heavier, the name on that side); select a room wall (as
before); open the free wall's entry ("This side", "Other side" on the plaster fields).

### Unit 2: free wall snapping (hand-tested 2026-11-19, committed)

Agreed 2026-11-19: on a locked line the lock wins (a corner off the line doesn't bend the wall);
a whole free wall is pulled by its ends only (not laid flat against a parallel room wall); the
snapping lives in core so every host shares it; no mockups.

- form0-core: `free-wall-targets.js` (what a free wall is pulled to, from the canvas snapshot:
  the room's outline; corners and ends, and lines, in its room: the room's corners and faces,
  other free walls' bodies and ends, columns; corners and ends anywhere on the floor to line up
  with) and `free-wall-snapping.js`:
  - an end (drawing, or dragging one): horizontal or vertical with the other end within reach
    (8 px, held to 13 px, as the other pulls); locked, it slides along the line, stops on a line
    it reaches, else lines up with a corner or end (a guide), else takes the 1 cm step; unlocked,
    a corner or end, else a line, else lining up per axis, else 1 cm; it never leaves the room's
    outline (it stops where it would, on the step along that face when the face is straight);
  - a whole free wall: keeps its direction; an end meets a corner or end, else a line, else its
    ends line up, else its first end takes the 1 cm step; it stops where it would leave the room.
  - Alt, or snapping off: only the 1 cm step and the room.
  - `createBuildingPlanInteraction` gains `snapFreeWallEnd` and `snapFreeWallTranslation`, with
    the same hold and guides as the other pulls.
- form0-react: the canvas draws, drags an end of and moves a free wall through them
  (`snapFreeWallPoint`); the guides show as for rooms. Room walls and Split portions are as
  before.
- Tests: core `tests/building-plan-free-wall-snapping.test.js` (7; in the test script), web
  `tests/building-plan-free-wall-snapping.test.js` (2). Core 620 of 620; web 349 of 355 (the six
  worker tests). Checked in headless Chromium on the derived engine: a wall drawn 6 px off level
  stays level with a guide along it and stops on the room's face (3 m).

Hand test (form "Building plan fixture", a room entry):

1. Draw a free wall nearly level or plumb: it locks, with a guide; pass the room's face: it stops
   on it; stop short of nothing: whole centimetres (its entry).
2. Draw towards another free wall or a column: the end meets its side or corner.
3. Unlocked (diagonal): an end near a corner takes it, near a face lands on it; near a corner of
   another room it lines up (guide).
4. Drag an end, then move the whole wall: the same pulls; it can't leave the room.
5. Alt while drawing or moving: no pulls, still whole centimetres and inside.
6. The free wall entry: "Thickness [mm]" has no tag.

**Columns (raised 2026-11-19, for unit 3).** A column against a wall can sit in several ways:
its centre on the wall's centre line, or one of its sides flush with either face of the wall.
Open: a single-choice system field on the column row for this, and whether the canvas offers a
way to choose it. Decided 2026-11-20: see "Unit 3: columns" below.

**After the unit 2 hand test (2026-11-19).** Works. Raised, none of it for this unit:

- Moving one of the room's walls leaves a free wall where it is. By rule 3, a free wall touching
  the moved wall follows it (its end moves, so the wall gets longer or shorter): that is 4b. One
  that doesn't touch it keeps its place. Moving the whole room moves it (checked on both
  engines).
- A column snaps by its centre: unit 3, with the placement options above.
- A diagonal free wall ending on a face leaves a triangle with no wall: core builds a free wall's
  body with square ends, so at an angle one corner touches the face and the other stops short of
  it (or goes into the room's wall). Snapping makes it visible, since ends now land exactly on
  faces. For 4a, where the body changes anyway: an end on a room face, or on another free wall's
  side, is cut along it. To check then: whether that changes an exported value (the two sides of
  a diagonal wall would have different lengths).
- The wall is drawn along one of its faces, with its body to one side, not centred on the line
  drawn: drawing by the centreline is 4a, as agreed.

### Free walls fading in their own room (hand-tested 2026-11-19, committed)

A free wall's footprint bounds no room (core gives it no `roomIds`), so V1 drew it faded in its
own room's entry and in its own wall entry, with the arrow cursor over it. A footprint now counts
as part of the room when the room has a face on it (`draw/scope-levels.js`). Test: a case in
`tests/building-plan-scope-levels.test.js`; checked in headless Chromium (a wall drawn in a room
entry, then its own entry).

### Remove confirmation shortcuts (hand-tested 2026-11-19, committed)

Alt+Q, Alt+Y and Escape in "Remove this entry?" only worked while focus was inside it. A click on
its backdrop (or anywhere on the page behind) left focus outside, and the shortcuts did nothing;
reproduced from a room entry's Walls list. The dialog now takes its shortcuts at the window level
while it is open, ahead of the form's, and a press on its backdrop keeps focus in it. Test:
`tests/repeatable-remove.test.jsx`.

Hand test: draw a free wall in a room entry (it shows dark, also in its own entry); open "Remove
this entry?" from any list, click its backdrop, then Alt+Q (it closes), again and Alt+Y (the row
goes).

### Unit 3: columns (hand-tested 2026-11-20, committed)

Today (read 2026-11-20):

- A column is a rectangle square to the page. There is no rotation: core's `transactions.js`
  reads `column_rotation_deg`, but no schema declares it.
- "Place Column" places it on a press; Select drags it. Both keep its centre inside the room's
  bounding box, and within reach of a room face put the centre on the face. Room outlines are the
  inner faces and walls go outward, so half the column ends up in the wall, by accident. No
  rounding.
- The drag preview is the canvas's own (`column.preview`), not core's `previewElement`.
- Core checks nothing for columns (`element-operations.js` stores them).
- `column_wall_segment_index` and `column_wall_ratio` are written by the canvas and exported;
  core reads neither. The index points into the points of a wall that isn't recorded, so it is
  0 or −1.
- Wall bodies include their corner pieces (separate footprint polygons).

Decided:

- **Against a wall, three placements:**
  - flush inside: a side on the room face;
  - centred on the wall's midline: only where the column is no wider than the wall across it (a
    30 cm column in a 20 cm wall would stick out of the far face);
  - flush with the far face: the column fills the wall and stands into the room by the rest of
    its depth.
- **Rule 1 for columns:** inside the room plus its own walls' bodies (corner pieces included), so
  a column may sit in its room's walls, up to their far face. Columns already stored with their
  centre on a face stay valid.
- **For now the position says it all (option B):** the placement is chosen by dragging, where the
  pulls catch each one. No new field yet.
- **Follow-up** (step 6 for the data, 4b for the engine):
  - a single-choice system field on the column row for the placement;
  - later, a canvas command to change it;
  - core keeps the placement when the wall's thickness changes and when the column's size
    changes (the flush side, or the centre, stays put).
- **No overlaps:** a column doesn't overlap another column, a door or a window; it may touch them.
  It may be attached to room walls, free walls and beams. Details still to confirm: see "To
  confirm" below.
- **Pulls, in order:**
  1. a corner into a corner: the room's corners, free walls' corners and ends, other columns'
     corners;
  2. otherwise, per axis, a contact: a side flush with a line it is next to (room faces, free
     wall sides, other columns' sides, the far faces of its room's walls, the jambs of doors and
     windows), or its centre on a room wall's midline; on a diagonal face, the nearest corner goes
     onto it;
  3. otherwise, per axis, lining up with a guide: its sides with corners and ends anywhere on the
     floor, its centre with other columns' centres (a structural grid);
  4. otherwise the 1 cm step, on the column's sides (its top-left corner), so distances to faces
     are whole centimetres.

  Positions that don't fit (outside the room and its walls, or overlapping) are skipped; a drag
  stops where the column would leave or overlap. Alt: no pulls, still the 1 cm step, inside and
  clear. Against a diagonal face a column meets it with a corner (no rotation).
- **Core refusals** go into 4a, with free walls: a column leaving its room and walls, or
  overlapping a column or an opening, from any edit (room, wall and opening edits, typed sizes
  included). Unit 3 keeps columns inside and clear on the canvas only, as unit 2 did for free
  walls.
- **Legacy wall fields** keep their meaning: segment 0 and the centre's position along the room
  wall the column touches or sits in, else −1 and 0. They are kept while they carry useful
  information in the export, and reviewed with the other system fields
  (`reform-backend-nestjs/docs/building-plan-v2-system-fields.md`, "Review points").
- **Exported values:** only `column_center_u` and `column_center_v` (and the legacy wall fields)
  of columns placed or moved change, with the same meaning. No new fields. Existing columns are
  untouched until moved.
- **Mockups:** none for this unit (no new control). The canvas command, with the field, will need
  one.

Overlaps in detail (agreed 2026-11-20):

- An opening's box runs across its wall, from face to far face, between its jambs. A column may
  touch a jamb (the jambs pull its sides). A column flush inside that stands across the opening
  counts as an overlap, since it would block it.
- Free walls hold columns like room walls: a column may sit in a free wall and stand out on both
  sides, since both sides are its room.
- Beams: no check (a beam passes over a column; beams wait for step 6).
- The opening side of the rule (an opening dragged onto a column): on the canvas with the
  placing unit, in core with 4a.

Placing (agreed 2026-11-20):

- Today, on web and mobile alike, a tool stays armed. A click or tap creates a column, door or
  window where it went down, with no preview (openings at their default width), and Select
  adjusts it afterwards. Free walls and beams are drawn by press, drag and release.
- Proposed first: the press starts the element, the drag adjusts it, the release creates it.
  Not taken: creating on release feels odd, and an opening released off a wall would be lost.
- Maintainer's proposal: the tool button brings up a faded preview (a ghost) that snaps as
  agreed, and a click places it. For openings, a pointer inside a room, off a wall, shows that it
  can't go there. Open: how mobile keeps the same behaviour, so nothing is learnt twice.
- Proposed next: a ghost on the web, and on touch a ghost moved like any element, then ✓. The
  maintainer found the touch part still odd and proposed selecting first, then adding: see
  "Placing: select, then add" below.

Placing: select, then add (maintainer's proposal, refined and agreed 2026-11-20):

- Set aside: a ghost that follows the pointer. It needs hover, so touch would need a flow of its
  own (place the ghost, then ✓), which still felt odd.
- **The same on web and mobile:** select where the element goes, then add it.
  - Doors and windows: select a wall, and the tool adds the opening there.
  - Columns (beams at step 6): select a room, and the tool adds the element there.
  - Afterwards the new element is selected, and is moved and adjusted as usual, with the pulls.
- **Insertion mark:** the click or tap that selects a wall or a room also leaves a mark where it
  landed: a short tick across the wall (on the 1 cm step along it), or a small cross in the room.
  Clicking another spot moves it. The element is added at the mark, which answers "where on a
  wall that already has two openings".
- **Without a mark** (selected from a list, or the entry's own room): an opening goes in the
  middle of the wall's largest free stretch, a column at the room's centre (a point inside an
  L-shaped room).
- **When it doesn't fit at the mark:** a door or window slides along the wall to the nearest
  stretch that fits (within the room side, clear of openings and columns); a column moves to the
  nearest place inside and clear; if there is none, nothing is added and the status line says why
  ("No room for a door on this wall").
- **A column with a wall selected:** "Add column" works there too and adds it flush inside
  against that wall at the mark (the wall's room is known). Otherwise it needs a room selected.
- **No ghost for now.** A preview at the mark while hovering a tool button (web only) is left to
  look at after the hand test. No prototype: the steps reuse selection, and the mark is checked
  at the 3b hand test.
- **The tools become commands** for doors, windows and columns (beams at step 6): one element
  per press, no armed mode. A tool is enabled only with the selection it needs; its tooltip and
  the status line say what to select. Each keeps an Alt+Shift shortcut, so on the web it is a
  click and a key. Rooms, free walls, Split, Rejoin and Pin stay drawing modes.
- **Core decides, hosts draw:** core works out the element to add from the selection and the
  mark (the free stretch, the clear place, or the refusal), so both canvases add elements the
  same way. On mobile the commands sit with the selection's actions in the bottom sheet (step 5).
- **Trade-off:** two actions per element (select, then add) where the ghost needed one click; a
  row of columns is slower. A Duplicate command could help later.
- **Order:** unit 3 snaps columns (moving them; placing stays as today until 3b); 3b brings
  select-then-add to columns, doors and windows on the web, with the canvas side of the
  opening/column overlap; mobile adopts it with step 5.

**Core's rule for columns, found while building (asked 2026-11-20).** Core already refuses a
column whose centre is outside its room's outline (`model.js`, `invalid_room_element`, shared by
both engines), and the blueprint limits `column_center_u` and `column_center_v` to 0..1 of the
room's box. Flush with the far face, a 30 cm column in a 20 cm wall has its centre in the wall,
so with today's core only flush inside works fully: in a wall, only as far as the centre stays in
the room (the far face for a column deeper than twice the wall; centred never). Decided: keep
core's rule until 4a. Unit 3 stays canvas-only, the snapping carries core's rule as one marked
check (`centreRegion` in `column-targets.js`), and 4a changes core's rule to the room and its
walls, widens the u/v range, and drops that check.

Unit 3 as built (2026-11-20):

- form0-core:
  - `column-targets.js`: what a column is pulled to and kept clear of, from the canvas snapshot:
    the free wall targets in its room (the column itself left out: `freeWallTargets` takes a
    `columnId`), its walls' bodies (far faces, ends, corner pieces) and midlines (`axisPoints`),
    the openings' boxes (`physicalOpenings`, reaching 1 mm past both faces, so a column flush
    inside across an opening overlaps it and one touching a jamb doesn't), other columns'
    rectangles and centres; the region (the outline and its walls' bodies) and core's centre
    rule.
  - `column-fit.js`: whether a column fits (its centre in the room for now; its outline inside
    the region, cut where it meets the polygons' edges; clear of other columns and of openings
    by more than 0.1 mm, above the canvas's rounding); where a drag stops (as far as it goes,
    then sliding along what stopped it); the nearest place that fits for a placement (flush
    against nearby lines, then rings of 5 cm, within 2 m).
  - `column-snapping.js`: the pulls in the agreed order (a corner into a corner; per axis a side
    flush with a line beside it or the centre on a midline, a corner onto a slanted line; per
    axis lining up, sides with corners and ends on the floor, centre with other columns'
    centres; per axis the 1 cm step on its sides). The first offer that fits wins; else the drag
    stops, or the placement goes to the nearest fit; Alt keeps only the step and the fit.
  - `createBuildingPlanInteraction.snapColumn(centre, { roomId, columnId, width, height, from,
    zoom, bypass })`: the same reach and hold as the other pulls (8 px, held to 13), the guides
    shown as for rooms. Null when the column fits nowhere near. About 0.7 ms a call on the
    fixture.
- form0-react:
  - `src/building-plan/column-placement.js`: `snapColumnCentre` (through core; with an older
    core, as before: the room's box and the centre onto a nearby wall line) and
    `columnWallValues` (the legacy wall fields: the room wall the column stands against, within
    1 mm, or in; the segment and where its centre falls along it; else -1 and 0).
  - Legacy canvas: placing ("Place Column", still a click until 3b) and dragging go through
    `snapColumnPoint`. A click that wobbles less than 3 px doesn't move a column (before, any
    move did, and with the step it would now rewrite its position).
- Tests: core `tests/building-plan-column-snapping.test.js` (11, in the test script): targets,
  the step, against a wall, corners, a drag stopping, columns touching, openings, placing,
  lining up, Alt, the hold. Core 631 of 631. Web `tests/building-plan-column-snapping.test.js`
  (3): placing with the legacy fields, dragging (a wobble, past the wall), the fallback. Web 352
  of 358 (the six worker tests).
- Checked in headless Chromium (a room entry of the fixture, derived engine): a column clicked
  near the right face lands flush inside (4.85 m, wall segment 0, ratio 0.33); near the top-left
  corner, into it (0.15, 0.15); dragged past the right wall, it stops with its centre on the face
  (5.0 m); the others on whole centimetres. No page errors. Core accepts all of them.

Found while checking: a column filled with the wall's tone read as a notch in the wall when flush
against it; `interaction.js` in core is 397 lines (371 before).

**After the unit 3 hand test (2026-11-20).** Works. Raised, and what was done:

1. **A column vanished when its width or depth was typed in its entry** (a bug in core, also on
   beams). The row's position fields are geometry, not plain values, so `transactions.js` sent
   the edit without them and the element lost its position (a beam its ends); the canvas skips an
   element without one. Fixed: an edit without the position fields keeps the element where it is.
   A beam's typed width and depth never reached it at all (only its ends were rebuilt); fixed on
   the way. Test: core `tests/building-plan-element-edits.test.js` (2, in the test script).
2. **A column in a room's corner: moving that corner inwards is refused.** Core's rule 1 (the
   column would be left outside: `invalid_room_element`). Moving it outwards is accepted, and
   the column stays where it was, out of the corner. Both are 4b: a column touching both walls
   is attached and follows the corner. The refusal's text is generic ("Keep structural elements
   inside their room…"); naming the element is 4a.
3. **A column couldn't centre on a free wall.** The midlines were only the room's own walls'.
   Now every wall of its room, free walls included (`axisPoints`, the centre of a free wall's
   body). Centred on a free wall, a column stands out on both sides, its centre in the room, so
   core accepts it today. Test: a case in core's column snapping test.
4. **Columns drawn with their diagonals** (agreed): outline and both diagonals in the wall's
   tone (following the scope levels), on the room's surface, the outline in the accent when
   selected (`drawColumnSymbol`). Checked in light and dark.
5. `interaction.js` stays as it is for now (agreed).

Core 634 of 634; web 352 of 358 (the six worker tests). Checked in headless Chromium: a column's
width typed in its entry (0.5) keeps its centre and shows wider.

Hand test (form "Building plan fixture", a room entry):

1. "Place Column" near a face: it lands flush inside. Near a corner: in the corner. In the
   middle: its sides on whole centimetres. Near a door: beside its jamb, never flush across it.
2. Drag a column: it is pulled flush to faces, other columns and jambs, lines up with another
   column (a guide), and stops at walls and other columns; past a wall, its centre stops on the
   face (core's rule until 4a). A 50 cm column (set its width and depth in its entry) can go
   flush with the far face of a 20 cm wall.
3. Alt while dragging: no pulls, still whole centimetres, still inside and clear.
4. A click on a column (without dragging) doesn't move it; double-click opens its entry.
5. Free walls still snap to columns' sides and corners.

**Second check of unit 3 (2026-11-20).** The fixes above work (hand-tested). Raised:

1. **A column's fill: see-through** (done, `e45e9a5`): 55 % opaque, so what lies under it shows
   while it is placed or moved.
2. **A typed width or depth can take a column out of its room** (core accepts it while the centre
   stays in), and the column can't then be dragged back to the same place (the canvas holds the
   whole column inside). Decided: 4a, where core refuses a typed size that takes a column out of
   its room and walls; with 4b keeping the flush side put, a wider column grows away from its
   wall.
3. **A selected free wall highlights one face**, as room walls do (its drawn side, heavier, for
   "This side"); with a column centred on it, that reads oddly. Proposed for 4a, where free walls
   are redrawn by their centreline: a free wall highlighted as a whole on hover and selection, and
   "This side" shown only in its own entry, where its fields carry the tags.

The canvas host is split (move only, `f3da7e0`): `canvas-host.jsx` keeps its state, effects and
layout; `canvas-host-mount.js` creates the controller and the canvas, `use-plan-history.js` holds
Undo / Redo, `use-plan-tools.js` the toolbar and zoom handlers.

### 3b: select, then add (hand-tested 2026-11-20, committed)

Agreed details (2026-11-20): commands waiting for a selection look unavailable but keep their
tooltip, and pressing one says what to select (status line, not red); the mark only in room
entries (the only canvases with these commands); the canvas host split first.

- form0-core:
  - `opening-stretches.js`: the free stretches of a wall face's segment, past the openings in its
    physical wall (from either side) and the columns standing against it (within 1 mm) or in it;
    a face's ratios to metres along its physical wall and back.
  - `element-placement.js`: `placeBuildingPlanOpening` (centred on the mark inside the stretch
    holding it, else the nearest one wide enough; without a mark, the middle of the widest; its
    start on whole centimetres along the physical wall, kept in the stretch; null when none is
    wide enough) and `placeBuildingPlanColumn` (flush inside against the selected wall at the
    mark, on the room's side of a room wall, on the nearer side of a free wall; else at the mark;
    else at the room's centre; then the column pulls and the nearest place that fits).
  - Exported, with `buildingPlanOpeningStretches`, from `index.js` and `browser.js`: plain
    functions of the canvas snapshot (`interaction.js` unchanged).
- form0-react:
  - `insertion-mark.js` and `draw/insertion-mark.js`: in a room entry, a click (no drag) on one
    of the room's walls leaves a short accent tick across it (through its body, a little into the
    room, on the 1 cm step along it); a click on the room's floor, a small accent cross. Cleared
    by a drag, another selection (canvas or list), a tool change, or adding. A click on the room's
    floor in its entry now clears the selected element (before, it kept it, and a door would have
    gone in a wall selected earlier).
  - `add-elements.js`: "Add door", "Add window", "Add column" through core; the new element is
    created and selected. A door or window needs a selected wall; a column with a selected wall
    and no mark (a Walls list row) goes against the middle of that wall. Nowhere to go: a red
    status message ("No room for a door on this wall", "… a window on this wall", "No room for a
    column here").
  - Toolbar: Door, Window and Column are commands now ("Add door", "Add window", "Add column", the
    same Alt+Shift keys), not modes; no tool stays armed. Door and Window without a selected wall:
    `aria-disabled`, dimmed, the tooltip "Select a wall to add a door", and pressing one shows it
    in the status line until the next press (`showHint`). The host follows the canvas's selection
    (`setSelected`) for that.
  - `opening-clear.js`: a dragged or resized door or window stays between the columns against
    its wall (the stretch holding it, columns only; core refuses an opening dropped on another and
    says why), on whole centimetres.
  - New texts in `plan-text.js` (`plan.tool.*`, `plan.add.*`).
- Not changed: the legacy canvas's own modes for placing (its DOM toolbar, unused here), mobile
  (step 5).
- Tests: core `tests/building-plan-element-placement.test.js` (7, in the test script); web
  `tests/building-plan-add-elements.test.js` (6). Core 641 of 641; web 358 of 364 (the six worker
  tests).
- Checked in headless Chromium (Bedroom's room entry): "Add door" with nothing selected is dimmed
  with "Select a wall to add a door", and pressing it says so; a click on the right wall leaves
  the tick and "Add door" adds a door centred on it; a click on the floor, then "Add column", puts
  a column there; a click on the left and right walls, then "Add column", puts columns flush
  against them; "Add window" on the short wall holding a door: "No room for a window on this
  wall"; the new door dragged towards a column stops against it. No page errors.

Hand test (form "Building plan fixture", a room entry):

1. Nothing selected: "Add door" and "Add window" are dimmed, their tooltips say to select a wall,
   pressing one (or Alt+Shift+D, Alt+Shift+I) says it in the status line. "Add column" adds a
   column in the middle of the room.
2. Click a wall: a blue tick where you clicked. "Add door": a door centred there. Click elsewhere
   on the wall: the tick moves. On a wall with openings, near one: the new one goes beside it.
   Where nothing fits: a red message, nothing added.
3. Click the floor: a small blue cross. "Add column": a column there (pulled to what's near).
   Click a wall, then "Add column": flush against it at the tick.
4. A wall selected from the Walls list (no tick): "Add door" goes in the middle of its widest free
   stretch, "Add column" against the middle of the wall.
5. Drag or resize a door along its wall towards a column: it stops against it.
6. Undo removes what was added in one step. The tools no longer stay armed.

**After the 3b hand test (2026-11-20).** Works. Raised: the tick stayed where it was while its
wall (a room wall or a free wall) was dragged, and went only on release. Now a drag or resize
takes it away as soon as it starts (`gestureMoved`, checked on each pointer move). Checked in
headless Chromium: the tick shows after a click on a wall and is gone while the wall moves.

### 4a-1: columns in core (hand-tested 2026-11-20, committed)

4a split (agreed 2026-11-20): 4a-1 columns in core; 4a-2 free walls kept inside their room; 4a-3
free walls by their centreline, ends cut along faces, highlighted as a whole (perhaps in a new
chat).

Decided (2026-11-20): reading a record stays permissive and the rule is checked on edits (records
aren't launched yet, so no care for old ones beyond that); the u/v limits dropped; no handling for
old columns; names in the canvas's style for codes: "C#1" (and "B#1"), not "C1", consistent with
F#1, R#1, W#1.

- form0-core:
  - `room-contents.js`, `columnPlacementIssues`: on every derived edit (in
    `derivedCandidateIssues`), each column of the edited floors must lie inside its room plus the
    room's own walls (corner pieces included) and touch, not overlap, another column or a door or
    window (flush inside across an opening counts, as on the canvas; touching within 0.1 mm). The
    shapes come from core's footprints at one unit a metre, checked with unit 3's
    `columnTargets` and `columnClash` (new in `column-fit.js`: what a column runs into; the
    targets now carry the other columns' and openings' ids). Refusals: `column_outside_room`
    ("Column C#1 would leave its room."), `column_overlap` ("Column C#2 would overlap column C#1.",
    "Column C#1 would overlap Shared door."), the column as subject, `columnIds` or `openingIds`
    for what it runs into; a pair is reported once, from the column the edit changed.
  - `model.js`: the shared check no longer asks a column's centre to be in its room (still a
    finite position and positive sizes), so a record with a column in a wall reads. Today's engine
    has no column rule of its own any more (see "After the 4a-1 hand test", point 2).
  - The canvas's temporary centre check is gone from `column-targets.js`: flush with the far face
    and centred on a midline are offered, a drag past a wall stops at its far face.
  - Blueprint: `column_center_u` and `column_center_v` have no limits (a centre in a wall falls
    outside the room's box). Stored values unchanged; the generated system fields of every plan
    form lose `min: 0, max: 1` there.
  - Default names: new columns "C#1", beams "B#1" (a stored default, as agreed).
- form0-react: a column's fractions are no longer clamped to 0..1 when placed or dragged
  (`columnRatios`); a refusal outlines the column in the way (`columnIds` in `plan-messages.js`).
- Tests: core `tests/building-plan-room-contents.test.js` (6, in the test script): in the wall up
  to the far face, past it, over a column, a door, a wall moved in, a typed width, today's engine;
  column snapping tests on the three placements; default names. Core 647 of 647 (and the whole
  `npm test`); web 358 of 365 (the six worker tests and the numeric setters flake).
- Checked in headless Chromium (Bedroom's entry): a column added against the right wall and dragged
  past it stops flush with the far face, 10 cm in the room; in its entry, a width of 0.8 m shows
  "Column C#1 would leave its room." at the top. In core: such a column is stored with
  `column_center_u` 1.01, reads back, and the form finds nothing to flag.

**After the 4a-1 hand test (2026-11-20).** Works. Raised, and what was done:

1. **A column wider than its wall, centred on it** (agreed): a column centred on one of its room's
   own walls may stand out of it on both sides, into the next room or outside, along the wall's
   length (`straddles` in `column-targets.js`, `straddleStrips` in `column-fit.js`); still clear of
   other columns and openings. Core's check reads the walls' midlines like the canvas
   (`room-contents.js`). Tests: core snapping and room contents.
2. **"Keep structural elements inside their room…" for a column touching a wall's exterior face**
   (in the room entry, then on saving the entries). Cause, traced in the browser: an entry
   previewing its unchanged row sends an empty batch, which `isDataBatch` doesn't take (it needs
   one operation at least), so it goes to today's engine even on the derived one; the old centre
   rule kept there for `engine=current` refused the column standing in the wall. Fixed: today's
   engine has no column rule of its own any more (it retires at the switch; the canvas keeps
   columns in place). Test: an empty batch with a column in a wall. Noted: the test page
   rebuilds only when form0-react's source changes; after a core-only change, restart
   `preview.mjs`.
3. **Columns' and beams' width and depth in mm** (in for imperial), like a wall's thickness:
   `building-plan-measures.js` (`thickness` kind); stored values unchanged; column height and beam
   length stay in m.
4. **A typed value's refusal shows at the top of the entry**, not like the canvas's messages.
   Agreed for step 4 (typed values): the message under the refused field, and in the entry's
   canvas status line (red, the element outlined); the top banner goes.
5. **A wall moved into a column is refused**: in 4b a column touching or standing in the moved wall
   follows it; a free-standing one it would pass still blocks the move (rule 1).

Core 647 of 647 (and the whole `npm test`); web 359 of 365 (the six worker tests). Checked in
headless Chromium: a column added at the right wall, dragged out to its far face, its entry saved
unchanged, the room entry saved: no message.

**Second round (2026-11-20, hand-tested, committed).** Raised and done:

1. **Its centre where wall midlines meet**: the corners, T-junctions, and where a free wall meets
   a wall (`junctions`, in the new `column-wall-targets.js`, with the room's walls' midlines);
   a pull of the same rank as a corner into a corner. A column centred there may stand out past
   the walls (the room walls' midlines are carried on to those points, `straddles`).
2. **A column's face flush with a wall's interior face, from inside the wall**: in the wall, its
   room-side face on the wall's interior face; as deep as the wall it stays inside it, deeper it
   stands out past the exterior face (along the wall's length). `faces` (each room wall's interior
   face and the side its body lies on); the side-to-face pull already offered it, the fit now
   allows it (`allowances` in `column-fit.js`, replacing the strip of the first round).

Core 648 of 648; web 359 of 365 (the six worker tests). Checked in headless Chromium: a column
dragged into the right wall stops with its room-side face on the interior face (x 5.15 m, 10 cm
outside); one dragged onto the corner centres where the two midlines meet (5.1, −0.1), standing out
of both walls; no message.

Hand test (form "Building plan fixture", a room entry):

1. Drag a column into a wall: it catches flush inside, centred (a column no wider than the wall,
   e.g. 20 × 20 cm), and stops flush with the far face; its symbol shows over the wall.
2. In its entry, type a width or depth that takes it past the far face: refused, "Column C#… would
   leave its room."; one that fits: accepted.
3. Move the wall a column stands against inwards past it (the room's corner or face): refused,
   naming the column; a door dragged onto a column stops (3b); a new column is named "C#n".
4. After Submit, no finding on a column standing in a wall.

### 4a-2: free walls kept inside their room (hand-tested 2026-11-20, committed)

Found first (probe on the derived engine, Bedroom): a free wall drawn from (3, 1) to (7, 1) across
the right face, one moved out, and the right face moved in by 50 cm past a wall ending on it were
all accepted, and `validate()` found nothing.

Decided (2026-11-20):

- D1: the line checked is the one the wall is drawn by, today its stored face path (`freePath`),
  the line the canvas keeps inside; 4a-3 switches the check to the centreline in the same commit
  that draws by it. Checking the centreline now would refuse what the canvas draws: a diagonal
  wall snapped onto a face (at 45°, 20 cm thick, its centreline end is 7 cm past it, for half the
  drawing directions) and one drawn flat along a face with its body outwards. The whole body
  inside would refuse every diagonal wall ending on a face until 4a-3 cuts its ends.
- D2: until 4b, a room wall a free wall touches can't be moved inwards (refused, naming it), and
  moved outwards it leaves the free wall short of the face, as with columns.
- D3: `free_wall_outside_room`, "Wall W9 would leave its room." (`wall_label`, else `autoLabel`,
  as the canvas names it); the subject is the wall's row (`room_face`), so the canvas outlines it;
  one issue per row (a wall drawn with turns has a row per run, W9 and W9.1).
- D4: an exact test: each segment of the line, cut where it meets the outline or passes one of
  its corners, lies inside or on it piece by piece (across an L-shaped room's notch is refused
  even with both ends inside); within 0.1 mm of the outline counts as on it (as columns touch).
  The whole line is checked, so Split portions are too.
- Not covered for now: a free wall crossing another free wall, overlapping a column, or ending in
  front of a door.

Built:

- form0-core: `freeWallPlacementIssues(floor)` in `room-contents.js`, called from
  `derivedCandidateIssues` on every derived edit next to the column check. Reading a record,
  today's engine (and so an entry's empty batch) and the findings are unchanged, as in 4a-1.
- form0-react: no change. The canvas already holds free walls inside while drawing and dragging;
  a refused room edit shows in the status line with the wall outlined (`refusalOutlines` reads a
  `room_face` subject).
- Tests: core `tests/building-plan-room-contents.test.js` (4 more): drawn or moved out, refused and
  named; a face moved in past it refused, moved out or the whole room moved accepted (the wall goes
  with the room); an L-shaped room's notch refused, its corner touched accepted, a slanted face
  0.05 mm past accepted and 2 mm not; today's engine and the empty batch without the rule. Core
  652 of 652 (`npm test`); web 358 of 365 (the six worker tests and the numeric setters flake).
- Checked in headless Chromium (Bedroom's entry, derived engine): a free wall drawn to the right
  face, then the face dragged in past it: "Wall W9 would leave its room." in red in the status
  line, the wall outlined, the room unchanged; dragged out, accepted, the wall left short of the
  face. No page errors.

Hand test (form "Building plan fixture", restart `preview.mjs` first: a core-only change):

1. In Bedroom's entry, draw a free wall ending on the right face; drag that face inwards past the
   wall's end: refused, "Wall W… would leave its room.", the wall outlined in red.
2. Drag the same face outwards: accepted, the free wall stays where it was (following is 4b).
3. Drag a corner of the room inwards past the free wall: refused the same way. Move the whole room:
   the free wall goes with it.
4. Draw a free wall well inside, drag it and its ends around: the canvas keeps it inside, no
   refusal. A diagonal one ending on a face: accepted.
5. `engine=current`: none of this is refused (today's engine is unchanged).

**After the 4a-2 hand test (2026-11-20).** Works (core `353f71c`). Raised: with a free wall ending
on Bedroom's right wall (W2) and a room on the other side sharing it, moving the shared wall
towards Bedroom from that room's entry is refused, where it used to go through. Checked on the
fixture with a room at x 5.2 to 8 sharing W2, moving the shared wall 30 cm from the new room:

| | Before 4a-2 | With 4a-2 |
|---|---|---|
| No free wall, towards Bedroom | Accepted, Bedroom 4.7 m wide | The same |
| Free wall (3, 1)–(5, 1) ending on W2, towards Bedroom | Accepted, the free wall left where it was, its last 30 cm in W2's body and past it | Refused, "Wall W11 would leave its room." |
| The same, away from Bedroom | Accepted, Bedroom keeps its size | The same |

So it is D2: the move used to leave the free wall out of its room. 4b fixes it (the wall's end
follows W2, 30 cm shorter, and the move goes through). Order kept: 4a-3, then 4b, which reads the
free wall's final geometry. Noted for step 4's messages: from another room's entry, "its room"
doesn't say which; it could read "Wall W11 would leave Bedroom."

### 4a-3: free walls by their centreline, ends cut, highlighted as a whole (2026-11-20)

Read first (derived engine and canvas):

- A free wall is stored as the line it was drawn along, one of its faces (`freePath`, the row's
  side), its body on one side of it. The physical wall's `wall_geometry` segments already hold
  the centreline (`referenceOffset`, half the thickness). No wall lengths or areas are exported,
  and no builtin reads this geometry.
- On the canvas a free wall was its face line (`points`), with the centreline beside it
  (`axisPoints`): drawing, dragging, handles, snapping and the 4a-2 check used the face. Its body
  is a rectangle around the centreline with square ends (`footprints.js`), hence the triangle at
  a diagonal end.
- A thickness change under the canvas's policy (`thicknessAnchor: room_face`) kept the face and
  grew the body to one side; `midline` already kept the centreline (`shiftPartitions`, J5).
- "Hover": a hovered Walls list row marks the element as selected on the canvas; nothing is
  highlighted under the pointer.
- Splitting a room wall leaves boundary faces (both engines); only free walls and their Split
  portions have free paths.

Decided (2026-11-20):

- D1: storage unchanged: the face stays the stored line, `wall_geometry` the centreline; exported
  values keep their meaning. Free walls drawn or moved from now on land where drawn, their stored
  face half a thickness off; existing walls don't move.
- D2: the canvas snapshot gives a free wall (Split portions included) by its centreline, with its
  row's face as `sidePoints`; core's canvas controller turns a centreline back into the face
  (`create_wall`, `update_wall` unchanged, so `engine=current` works). Taken as the cleanest
  after the audit below; the maintainer wanted to see and test it.
- D3: a free wall keeps its centreline when its thickness changes, whatever the anchor (derived
  engine).
- D4: the 4a-2 check reads the centreline; snapping works on the line the canvas passes.
- D5: an end on the room's outline or on another free wall's side (within 0.1 mm) is cut along it
  (both faces in a corner), in the drawn body only; nothing stored, no exported value changes.
  Not covered: an end against a column, a door at a cut end.
- D6: a selected or list-hovered free wall: body outlined, handles at the centreline ends, name
  beside the body, no heavy side line; in its own entry, the row's side as today's 4 px line with
  a small "This side" label. Room walls get no label (their heavy line is on the room's face, so
  the side is plain; a free wall has its room on both sides).
- No mockups. Units: 4a-3a (D1–D4), hand test; then 4a-3b (D5) and 4a-3c (D6) together.

**Audit for D2 (2026-11-20).** What reads a free wall's line, and what it needs:

- Read the line as given, right with the centreline, unchanged: Split placement (the offset along
  the line is the same), opening placement and free stretches (same ratios; the body band from the
  footprint), the axis alignment of a moved wall (`interaction.js`: both lines on the centreline),
  free wall snapping targets (other free walls' ends become centreline ends, as wanted), the
  corner handle reserve; in form0-react the hit test, drags, handles, the grip, opening geometry
  (already on `axisPoints`), drags and placing, scope levels, issue markers, refusal outlines.
- Changed: the snapshot and the Split marks of free walls (on the centreline); the controller's
  conversion; the 4a-2 check; a column added on a free wall at a mark on its centreline goes to
  the row's side (a tie otherwise); a free wall's Split portion is treated as a free wall when a
  column is added against it (its line is no longer a face); on the canvas, the selected side line
  and the name read the row's face (today's look until 4a-3c); the insertion tick crosses the whole
  body; the legacy column wall fields keep reading a Split portion's face, so they don't change.
- Mobile reads the same snapshot: it gets free walls by their centreline, adjusted in step 5.

### 4a-3a: free walls drawn and edited by their centreline (hand-tested 2026-11-20, committed)

- form0-core:
  - `free-wall-lines.js`: `offsetLine` (a line moved along its normal, joints where the moved
    lines cross), `freeWallSideDistance`, `newFreeWallWidth` (a new wall's thickness, resolved as
    the derived engine does), `newFreeWallFace`, `faceCentreline`, `freeWallCutPoints`,
    `freeWallSideLine` (exported as `buildingPlanFreeWallSide` from `index.js` and `browser.js`).
  - `canvas-controller.js`: free walls by their centreline with `sidePoints`; Split marks on it;
    `createWall` and a free wall's `update_wall` send the face (the side and distance kept).
  - `room-contents.js`: the 4a-2 check on the centreline. `thickness-commands.js`: free walls keep
    their centreline (J5 whatever the anchor). `element-placement.js`: the row's side on a tie.
- form0-react: `free-wall-side.js` (`freeWallSide`, through core); the legacy canvas draws and
  names a selected free wall's side from the row's face; `draw/insertion-mark.js` (the tick across
  the body); `column-placement.js` (the legacy fields read a Split portion's face).
- Tests: core `tests/building-plan-free-wall-lines.test.js` (6, in the test script): drawn by its
  centreline on both engines, the row keeping its face; moved and turned; thicker; a Split mark;
  "Add column" at a mark on it; `offsetLine`. The 4a-2 tests now give walls by their centreline.
  Web `tests/building-plan-free-wall-side.test.js` (2). Core 658 of 658; web 361 of 367 (the six
  worker tests).
- Checked in headless Chromium (Bedroom's entry, derived engine): a wall drawn from (1, 1.5) to
  (4, 1.5) has its body from 1.4 to 1.6, handles on the centreline ends, the heavy line and W9 on
  the row's face (y 1.6); its end dragged past the right face stops on it; moved down, centred on
  2.1; a diagonal wall drawn into the left face is accepted (its square end still leaves the
  triangle, 4a-3b); the tick crosses the body; "Add column" at a click on it goes flush on the
  row's side. No page errors.

Hand test (form "Building plan fixture", Bedroom's entry; restart `preview.mjs`):

1. Draw a free wall: its body is centred on the line you draw; the handles are at the ends of that
   line. Drag an end and move the whole wall: the body follows centred; ends stop on the room's
   faces, on other free walls' sides and corners; nothing leaves the room.
2. Draw it along a face (close to a room wall): at most half its body goes into the room's wall.
   A diagonal wall into a face: accepted (the triangle at its end goes with 4a-3b).
3. Select it: the heavy line on one side ("This side") with the name, as before.
4. In its entry, change "Thickness [mm]": the wall grows on both sides, its centreline stays.
5. Click on it (the tick crosses its whole body), "Add column": flush on its own side; "Add
   door": centred at the tick. Split it: the mark is on its centreline; move a portion; Rejoin.
6. Free walls drawn before: unchanged in the record; they show where they were.
7. `engine=current`: drawing and moving work the same (a thickness change keeps the face there).

**After the 4a-3a hand test (2026-11-20).** Works (core `0657e4d`, web `ec0ffcc`). Raised, with
proposals (to align):

1. **A free wall dragged close to a room wall overlaps it** (half of it at the same thickness):
   the rule keeps only the centreline inside. Proposed: rule 1 for free walls becomes the body,
   its ends cut along what they stop on, inside the outline (touching allowed); a parallel move
   stops flush, an end still runs to the face it meets and is cut along it. With 4a-3b, since it
   needs the cut ends (with square ends a diagonal wall ending on a face always pokes through).
   Until 4b, a free wall flush against a room wall can't be made thicker (it grows both ways);
   4b could keep its flush side, as for columns.
2. **A free wall's split point can't be dragged into diagonals**, as a room wall's can. For a room
   wall the split point is a room corner (the corner move); for a free wall, Split makes portions
   that move square to themselves. Bending one needs a new derived operation (the point moves, the
   two portions become runs at an angle), handles and snapping for the point. Proposed: a unit of
   its own after 4a-3c (4a-4).
3. **The jog forms on one side or the other of the split point** depending on the move. For room
   walls it makes sense (the return's body always lies outside the room). For free walls it
   doesn't (both sides are the room; it follows the stored face). Proposed: a free wall's return
   centred on the split point whichever way the portion moves (`partition-portions.js`: the
   portions' ends at the return shift by half the thickness along the wall, back when it
   closes; Rejoin and moving back to check), with 4a-4.

Agreed (2026-11-20): (1) the body kept inside, with 4a-3b; (2) and (3) as 4a-4, in the same pass
as 4a-3b and 4a-3c, with one hand test.

### 4a-3b, 4a-3c, 4a-4 (hand-tested 2026-11-21, committed)

**4a-3b: ends cut, the body kept inside.**

- form0-core:
  - `free-wall-body.js`: the body, a band around the centreline; an end on the room's outline cut
    along it (both faces in a convex corner; square at a reflex one; a line within 5° of the wall
    doesn't cut), else along another free wall's side; `freeWallFits` (centreline and body inside
    the outline, within 0.1 mm); `freeWallSegmentBodies` for the drawing. The "inside" helpers
    moved here from `room-contents.js`.
  - `free-wall-hold.js`: how far a move or an end may go. A move stops where the body would leave
    the room, then goes back onto the 1 cm step when that still fits (flush, exactly). An end near
    a face goes onto it, where it is cut along it, else stops where it last fitted (the interaction
    remembers it per drag).
  - `footprints.js` draws free walls with their cut ends; `room-contents.js` checks the body too;
    `free-wall-snapping.js` and the interaction pass the half-thickness (the wall's, or a new wall's
    from the room, `freeWallWidth` in the snapshot).
- No exported value changes (nothing stored; the cut is drawn from contact).

**4a-3c: highlighted as a whole.** A selected or list-hovered free wall (its Split portions too):
its body outlined, handles at the centreline ends, its name beside the body; no heavy side line.
In its own entry, the row's side as the 4 px line, with a small "This side" label beyond the face
(`plan.side.this`), and the name across the body. Room walls: no label (agreed).

**4a-4: bending at a split point, the return centred.**

- form0-core:
  - `derive/partition-bend.js`, `move_free_wall_point` (derived engine only): the split point's
    new centreline point; each portion keeps its far centreline end and its face is rebuilt from
    its centreline (a far end joined to another portion meets it where their faces cross); the
    later portion's openings keep their distance from its far end. Refused where a return stands
    ("Move this portion back in line with the wall before bending it here.").
  - The canvas snapshot lists free wall split points with no return as corners (`freeWall`, on the
    derived engine only); the controller's corner drag sends the bend, and the interaction snaps
    it like an end (no lock), holding both runs inside (`free-wall-bend.js`, `holdFreeWallBend`).
  - `partition-portions.js`: a free wall's return stands centred on its split point whichever way
    the portion moves; the portions' ends at it shift half the width along the wall, back when it
    closes or the portion moves the other way. Nothing marks it (see point 1 below).
- form0-react: none for the bend (the canvas's corner drag and preview carry it).
- Rejoin refuses a bent wall, as for any portions out of line ("Align the split portions on the
  same straight line before rejoining.").

**Choices made while building (to review at the hand test):**

1. A marker on centred returns (`editingReturn.centred`) would have been a new key in an exported
   field. Decided (2026-11-20): no marker; every square return of a free wall is taken as centred,
   so a return made before 4a-4 shifts by half the width on its portion's next move (records
   aren't launched).
2. Once a return is centred, its portions' stored faces start half the width along the wall: an
   `update_wall` on such a portion sends its stored face moved (the canvas controller does), not the
   face as split. Documented for future callers (`partition-portions.js`); two parity tests now move
   the stored face and skip the geometry while a return stands.
3. Bend points are corners on the derived engine only; `engine=current` shows none.
4. In its own entry, a free wall's side and "This side" show whether or not it is selected.
5. Files: `interaction.js` 425 lines (397 before, left as agreed), `footprints.js` 370 (366),
   `canvas-controller.js` grew by about 30; the new modules are under 300.

Tests: core `tests/building-plan-free-wall-body.test.js` (4), `tests/building-plan-free-wall-bend.test.js`
(5), the room contents notch case updated (its centreline through the notch's corner now refused, its
body cutting it), two derived partition parity tests updated; web `tests/building-plan-selection-name.test.js`
(the free wall cases restated, 2). Core 667 of 667; web 362 of 368 (the six worker tests).

Checked in headless Chromium (Bedroom's entry, derived engine): a diagonal wall into the right face,
its end cut along it; a wall moved up into the top face stops flush (body 0 to 0.2 m); selected, its
body outlined, no side line, the name below; a straight wall split at 2.5 and bent there (far ends
kept); its right portion moved up, the return centred on 2.5 (body 2.4 to 2.6; the first try showed it
on one side: the squareness check was stricter than a portion move's tolerance, fixed); the portion's
own entry: the side line, "This side" beyond the face, the name across. No page errors.

Hand test (form "Building plan fixture", Bedroom's entry; restart `preview.mjs`):

1. Draw a diagonal free wall into a face, and one into a corner: their ends follow the face(s), no
   triangle, nothing past them. Draw one ending on another free wall's side at an angle: cut along it.
2. Move a free wall towards a room wall: it stops flush. Drag an end towards a face at an angle: it
   lands on the face. Tilt a flush wall's end into the face: it stops. Make a flush wall thicker in
   its entry: refused, naming it (until 4b).
3. Select a free wall, and hover its row in the Walls list: the body outlined, no heavy side line,
   handles at the centreline ends, the name beside it. Open its entry: the heavy line and "This
   side" on the row's side, the name across.
4. Split a free wall: a round handle at the split point. Drag it: the wall bends there, its far ends
   stay; it stops at faces. Undo. Rejoin a bent wall: refused with a message.
5. Split a free wall and move a portion up, then down: the return stays centred on the split point;
   back in line, it goes. With a return, drag the split point's handle: refused with a message.
6. `engine=current`: no bend handles; the rest as before.

**Hand test (2026-11-20).** Points 3 and 4 (the choices above) agreed, no file split needed.
Raised, and what was done:

1. **A free wall attached to a room wall was pulled back when moved along it, and hard to move.**
   Cause: a drag that wobbles towards the face past the line pull's hold (13 px) took the attached
   end past the face; the move's stop scaled the whole move back towards where it started (so the
   wall stayed), and its step back onto the 1 cm grid shifted it sideways, off the face (7 mm on
   the right face). Fixed (`free-wall-hold.js`): after the stop, the rest of the move slides along
   what stopped it (across or down the page, or along the face an end or side met); an end within
   1 mm of a face is then put on it exactly; the step back only goes along what the wall moved, and
   never takes an end off a face.
2. **After that, its free end tilted only a few degrees** ("would leave its room"): its attached end
   sat off the face, so it wasn't cut along it and its square corner poked into the wall (0.3 mm off:
   0.2°; 3 mm: 1.8°). Fixed by point 1, and an end within 1 mm of a face or side now meets it and is
   cut along it (`CUT_REACH` in `free-wall-body.js`; inside or outside is still within 0.1 mm).
3. **The jog formed on either side of the split point**: the hand test ran on a preview built
   before the squareness fix (the test page rebuilds only on form0-react changes, and form0-react
   changed in the middle of the work). After a restart, fixed.
4. **A list-hovered free wall's outline was thinner than a room wall's highlight**: now as heavy (6
   plan units), selected or hovered.

Also: "Save state" only holds a dialog's work once its floor entry is saved (the capture from this
round was empty). Tests: core `tests/building-plan-free-wall-body.test.js` (+1: the slide, an end
0.3 mm off still tilting); core 668 of 668; web 362 of 368 (the six worker tests). Checked in headless
Chromium: a wall drawn into the right face, dragged up 0.6 m with 25 cm towards the face, slides up
with its end on the face; its free end then tilts to (3.2, 0.2).

**Recheck (2026-11-21).** Works. Committed: form0-core `cb398d7` (4a-3b) and `5159e88` (4a-4),
form0-react `5933bf6` (4a-3c).

### 4b: attached contents follow their wall (hand-tested 2026-11-21, committed)

Agreed 2026-11-21 (D1 to D8 as proposed): a point keeps its place along a wall that moved square
to itself, and its fraction along one whose corner moved (D1); a free wall's end on a face
follows it, a free wall lying along a face moves with it, an end on another free wall follows
that wall (D2); its openings keep their place from the end that stayed (D3); a free wall left
under 1 cm, or turned back, is refused, named (D4); a thicker free wall flush with a face keeps
that side (D5); columns follow their wall, at a corner both, keeping to the line they hold to
when the wall's thickness or their own size changes (D6); a shared wall moved from the other
room carries both rooms' contents (D7); what touches nothing keeps its place and still blocks a
move (D8). Beams wait for their own unit.

Built (form0-core, derived engine only):

- `derive/attached-contacts.js`: the contacts, read from the floor before the edit (rule 2,
  nothing stored), within 1 mm (the cut's reach): a free wall's centreline end on a room face or
  on another free wall's side or centreline; a free wall lying along a face or another free
  wall's side; a column flush with a face on the room's side, centred on the wall's midline,
  standing in the wall from its face, flush with its far face, or else in the wall; centred on a
  free wall or flush with one of its sides. Rows of the same wall and returns at its split points
  are not anchors, and an end joined to another row's end has no contacts.
- `derive/follow-attached.js`: after every derived edit (room, face, corner and free wall
  commands, data and thickness changes, a decision's rederive), what touched a moved line moves:
  with a line that moved whole it moves with it; along one that only got longer, shorter or moved
  square to itself it keeps its place; along one that turned, or at a corner move, it keeps its
  fraction. Two lines (a corner): where both meet. A free wall that follows carries what touches
  it. Joints of a wall's rows meet where their faces cross; openings keep their distance from the
  end that stayed. Too short: `free_wall_too_short`, "Wall W9 would be too short."
- `partition-thickness.js` (D5): a free wall with a side on a face of its room keeps that side.
- `derived-edit.js` (`followAndWrite`); `data-commands.js` gives the floor before any of an
  operation's edits (`original`), so a column only resized keeps its contacts.

Choices made while building (to review at the hand test):

1. **Centred before flush**: a column as wide as its wall is flush with both faces and centred;
   it is taken as centred, so a thicker wall keeps it centred.
2. **Room resize** (`resize_room`): an end on a face that only stretched keeps its place (D1),
   though doors on a resized room's walls scale with them (today's rule for openings).
3. **A free wall row of more than one edge** (older records) doesn't follow; drawn walls have a
   row per straight run.
4. **Cost**: a face drag preview with four free walls and three columns takes about 6.2 ms
   instead of 5.1 ms.

Tests: core `tests/building-plan-attached-follow.test.js` (8, in the test script);
`tests/building-plan-room-contents.test.js`: the face moved past a column or a free wall now
uses ones clear of it (attached ones follow), and the column resized uses one clear of the walls.
Core 676 of 676; web 362 of 368 (the six worker tests; the numeric setters flake passed alone).
Checked in headless Chromium: a free wall drawn into the right wall, the wall dragged out: its
end goes with it.

Hand test (restart `preview.mjs`, core changed; Bedroom's entry):

1. Draw a free wall into the right wall. Drag the wall out, then in: the free wall gets longer,
   then shorter. Drag it in past the free wall's other end: "Wall W9 would be too short."
2. A slanted free wall into the right wall: drag the wall out: its end stays at its height. Drag
   the bottom-right corner: its end keeps its place down the face, as a fraction.
3. A free wall flush along the top wall: drag the top wall down: it moves with it. Make it
   thicker in its entry: it grows into the room, its side staying on the face.
4. A free wall ending on another's side: move the other, split and bend it: the first follows.
5. From the room below, drag the shared wall up into the Bedroom, a free wall ending on it:
   accepted, the free wall shorter (the case raised at 4a-2).
6. Columns: flush with the right wall inside the room, drag the wall: it follows. Centred on the
   wall, and flush with its far face: change W2's thickness: they keep to the midline and the far
   face. One in a corner: move the corner. One flush with a face: type a larger width: its side
   stays on the face.
7. A free wall or a column touching nothing: a wall moved into it is still refused.
8. `engine=current`: nothing follows.

**Hand test (2026-11-21).** Works. Committed: form0-core `9e74d2a` (4b-1, free walls) and
`8fc0699` (4b-2, columns). Raised, not about 4b: see "After the 4b hand test" below.

### After the 4b hand test (hand-tested 2026-11-21, committed)

Raised: at an L of two shared walls (Room 2 wrapping Room 1's corner), W1.1's highlight stops a
wall's thickness short of Room 2's corner; detached, an empty square at that corner; W7.1 (and W4)
should reach the corner too; the square under the shared wall's end, beside W8, is grey from Room
2; "Wall W5 would leave its room" while aligning W1.2 with W1. And: walls named W#1 like R#1?

Found (on the captured plans; "Save state" first fixed to keep them):

- **The stretch past the other room's corner is a cap** (rule F4, variant C2): a remainder of a
  room's face whose material lies inside other walls' has no row. So Room 2's face there belongs
  to no wall (the highlight stops), and at an inner corner the two caps have the same band (the
  corner square): each counts as covering the other, so neither supplies it, and once the other
  room no longer fills it the square is empty. The canvas drew a cap only as a corner's incidence,
  never its band.
- **The grey square** is Room 2's corner fill: W4's binding on Room 2's face ends 2.3 µm short of
  that face's end (it is clipped to the segment built from Room 1's slightly shorter face), and
  the canvas wanted 1 µm, so the corner went unfilled and only Room 1's W3 covered it.
- **Tried and dropped: the record-level change** (a cap joins its source's row and body, the
  station at the other room's corner goes, the segment runs over every row): it did what was
  asked, but 13 core tests failed, among them real regressions (rooms overlapping on corner drags,
  a Split point moving, a door shifting, a thickness round trip): that station is what face drags
  and jogs move a shared part of a face by. It would mean reworking the face commands.
- **W#1**: kept W1. Wall labels are stored (`wall_label` is written into the record); "R#1" and
  "C#1" are only shown for a room or column with no name.

Built (records unchanged):

- core `footprints.js`: a cap's band is drawn with its source wall (its edge's `profile`), so an
  inner corner is built (attached or not); a row reaches its edge's end within 0.1 mm (was 1 µm),
  so a room's corner beside a face a few micrometres longer than its wall is filled.
- core `face-extent.js`: a room face's line over the caps next to it (`extentPoints` in the
  canvas snapshot); web `building-plan-canvas.js`: a selected room wall is drawn over it, its end
  marks at its ends (not while previewed; free walls as before).
- web `canvas-host-mount.js` and the test page: "Save state" keeps the plan the last opened canvas
  shows (unsaved entry work included) when the page sets `__FORM0_PLAN_CAPTURE__`; the replay
  tool reads it, with the template forms' meta.

On the captured plans: Room 2's W1.1 is highlighted to x 0.72, W4 up to y 1.249; detached, both
inner corners built (Room 1's: W1.2 to x 3.713, W7.1 down to y 2.001); the square beside W8 is
W4's too. Open: "Wall W5 would leave its room" (its capture came from a tab with the old page: no
plan). The console's `invalid_routing_context` for `room_walls`: the entry dialog sends a list's
change event from its own level (`handleNestedRemove`); the edit applies; to look at.

Tests: core `tests/building-plan-junction-faces.test.js` (3, in the test script; each fails
without the fix); `building-plan-footprints.test.js` rounds both scales (a cap's band is clipped
at each); web `building-plan-selection-name.test.js` (+1). Core 679 of 679; web 363 of 369 (the
six worker tests).

Hand test (restart `preview.mjs`; reload any open tab):

1. Two rooms at an L as before. Select Room 2's wall along the inner corner (W1.1): the highlight
   and its end marks reach the corner; the same for W4. From Room 1, its walls at its own inner
   corner likewise.
2. The square under the shared wall's end, beside W8: dark from Room 2.
3. Detach the rooms: no empty square at either room's inner corner; W7.1 and W1.2 reach it.
4. Align W1.2 with W1 again; if "Wall W5 would leave its room" comes back, "Save state" first
   (the file now holds the plan).

**Hand test (2026-11-21).** Works. Committed: form0-core `a6cebad`; form0-react the capture hook
and the highlight. Still raised: "Column C#1 would leave its room" aligning Room 1's W1 with W1.1
(captured).

**"Column C#1 would leave its room" (hand-tested 2026-11-21, committed).** Reproduced in
headless Chromium on the capture (the test page now opens one: `?state=<file in captured/>`).
The drag snaps W1 exactly onto W1.1's line (0.796455 m; a round 0.797 left a 0.5 mm jog and
went through). In line, the two faces merge and the jog's vertices go, so the follow pass (4b),
which finds a face after the edit by its two vertices, lost the contact: the column stayed where
it was, outside the moved face. Fixed in `follow-attached.js`: a face whose vertices are gone is
the one that keeps one of them and runs the same way. The same cause fits "Wall W5 would leave
its room" (a free wall's end on such a face). The column helpers moved to `follow-columns.js`
(the file was past 300 lines). Test: `building-plan-attached-follow.test.js` (+1: a column and
a free wall on a raised part of a face snapped back into line; fails without the fix). Core 680 of
680. In the browser, on the capture: the snapped drag goes through, the column flush with the
merged face.

Hand test (restart `preview.mjs`): align Room 1's W1 with W1.1 as before (the column goes with
it); a free wall ending on a raised part of a face, that part dragged back into line (it goes
with it; the W5 case).

Hand-tested: both work. Committed: form0-core `7a6abde`.

### Step 3, rest: handles, cursors and lengths (decided 2026-11-21)

Agreed on the mockups page, section "Handles · lengths (3)":

- **3-H1, one handle style.** Every point you drag (room corners, wall ends, a free wall's split
  point, opening ends, beam ends): a 10 px circle in the theme background with an accent ring,
  filled with the accent under the pointer. Hit areas at least 16 px. The wall grip stays.
- **3-H2, grips.** Doors and windows: a capsule along the wall (20 × 8 px) in the middle.
  Columns: a four-way grip (22 px) on the centre while selected. Chosen over arrows inside the
  outline, accepting that the grip covers a column under about 22 px on screen.
- **3-H3, cursors follow the element.** Resize arrows: the nearest of the four to the element's
  direction (a door on a vertical wall gets `ns-resize`). `move`: corners, ends, split points,
  four-way grips. `grab`, then `grabbing`: bodies and opening grips. Unchanged: the arrow over
  faded elements, the crosshair for drawing tools.
- **3-H4.** Column resize on the canvas later (step 4); sizes are typed in the form.
- **3-H5.** Beams: style and cursor only; the rest waits for the beam unit.
- **3-L1, which lengths.** A drag shows the lengths it changes, in the room in scope; a move
  (column, free wall) shows the distance to the nearest wall on each axis. Only in room and
  element entries: a Floor canvas moves whole rooms and doesn't resize them (`canResize` false
  in `controller.js`, confirmed 2026-11-21), so a floor entry has no lengths to show.
- **3-L2, a split side.** Corner to corner of the room's inside; a row's own length comes with
  step 2.
- **3-L3, the look.** Thin line, slash ticks, the value in the mono face on a pill, changing
  values in the accent; the same size on screen at any zoom. One module, `draw/dimensions.js`,
  reused by step 2.
- **3-L4, units.** The plan's unit and the locale's decimal sign, two decimals, no unit on the
  labels; the status line names the unit while dragging.
- **3-L5, when.** Only during the drag; at a refused position they keep the last valid one.
- **3-P, a pinned wall.** A pin badge (16 px, accent) a quarter along the wall, with a tooltip
  (`plan.wall.pinned` in `plan-text.js`), replacing the hard-coded word "Pinned".

Units, each hand-tested before its commit: 3c-1 handles, cursors and the pin badge; 3c-2
`draw/dimensions.js` with doors and windows; 3c-3 walls and corners; 3c-4 free walls and
columns. Then the navigation unit (see "Opening entries by double-click").

### 3c-1: handles, cursors and the pin badge (hand-tested 2026-11-21, committed)

- `draw/handles.js` (new): the drag handle, the opening capsule, round grips with arrows (the
  wall grip moved here, a column's four-way grip), the pin badge and where it sits.
- `canvas-cursors.js` (new): the cursor rules, moved out of the legacy canvas (`updateCursor`,
  `gripCursor`, `getCursorForHandle`). A gesture keeps the cursor it started on, a grab turned
  into grabbing.
- Legacy canvas: hover detection moved into `hoverAt`, in the order a press takes things, and
  corners are hovered now. Handles carry their point (drawn hot) and their element's direction.
  The selected wall's ends, opening ends, beam ends and corners use the one handle.
- `plan-tooltip.jsx`: things the canvas draws get the plan's tooltip through a bubbling
  `plan-tooltip` event (`{ text, box }`). Used by the pin badge.
- Unchanged: hit areas (corners 9 px in core, wall ends 8, opening ends 10, beam ends 12, the
  wall grip 16), records, core. The split nodes the cut tools show stay small dots (they aren't
  dragged).

Hand test (test page, a room entry):

1. Corners and a free wall's split points: round 10 px handles. Under the pointer: filled blue,
   cursor `move`, kept while dragging.
2. Select a room wall: round ends, the grip as before; its cursor follows the wall.
3. Pin tool, click a wall: a pin badge a quarter along it (no more "Pinned"); hover it for the
   tooltip.
4. Add a door on a vertical wall: round ends with `ns-resize`, a capsule in the middle (`grab`,
   then `grabbing`). On a horizontal wall: `ew-resize`.
5. Select a column: a four-way grip on its centre, cursor `move`. On a Floor canvas: no grip.
6. A free wall: round ends and split point, the grip `move`. A beam: round ends, the cursor
   along the beam.
7. Dark colour scheme: the same, readable.

Checked in headless Chrome (room entry, light and dark): the handles, the capsule, the column
grip, the badge and its tooltip, the hot states, and the cursors for steps 1 to 5. Web 366 of 373
(the 6 worker tests and the numeric-setters flake); new `tests/building-plan-handles.test.js`;
the selected-wall test reads the end marks as circles.

Hand-tested: works. Committed: form0-react `e9707ac`. Asked after it (2026-11-21), as 3c-1b: cursors follow what the canvas allows
(a column on a Floor canvas can't be selected today, but may be later), and the handle being
dragged stays filled. Navigation: the proposed table above, to adjust as we go.

### 3c-1b: cursors and handles follow what the canvas allows (hand-tested 2026-11-21, committed)

- A cursor promises only what a press does (`hoverCursor(hover, capabilities)`): on a Floor
  canvas rooms and openings show `grab`, walls, columns and beams the arrow; on the plan page
  everything the arrow; in a room entry a room's floor the arrow (a click marks a place there),
  walls `grab`. Hover now tells walls and rooms apart (`wall`, `room`). View-only canvases keep
  V1's look (the arrow over faded elements, `grab` elsewhere).
- A handle shows only where it can be dragged (`showsHandles`), in the select tool of an
  editable canvas: an opening's ends need resize, its capsule move, a wall's and a beam's ends
  resize and structure. On a Floor canvas an opening shows its capsule only, and the capsule now
  slides it (before, its press needed resize and did nothing); an end that can't resize falls
  through to the body, which moves it.
- The handle being dragged stays filled: hot handles are tracked by a key (`corner:room:vertex`,
  `opening:id:end`, …), and a gesture keeps the one it started on. After the drop, what is under
  the pointer is hovered again (not on touch), so its handle and cursor are right at once.
- Fix on the way: two corners of one room no longer count as the same hover.

Hand test: the plan page (arrow everywhere); a Floor canvas (rooms and doors `grab`, walls
arrow; select a door: capsule only, drag it); a room entry (drag a corner, a door's end, the
capsule, a column: each stays filled while dragged; after the drop the cursor is right without
moving).

### 3c-2: lengths for doors, windows and a room being drawn (hand-tested 2026-11-21, committed)

- `draw/dimensions.js` (new): one length (thin line, slash ticks, extension lines, the value on
  a pill in the mono face, upright and reading bottom to top on vertical sides; changing values
  in the accent) and `formatLength` (the plan's unit, the presentation locale's decimal sign,
  two decimals, no unit). It returns the pill's box, for step 4.
- `drag-lengths.js` (new): which lengths a gesture shows. A dragged door or window: the chain
  along the room's inside face, corner to opening, width, opening to corner, the side found from
  either face of a shared wall and run corner to corner across vertices in line (3-L2); dragging
  an end changes the width and that side, sliding changes both sides. A room being drawn: its
  width along the top and its depth along the left.
- Legacy canvas: `drawDragLengths` over the plan, from what it draws (the drag's preview, the
  draft); the dragged opening's name is hidden meanwhile (the chain takes its place). Measured
  in the room in scope; on a Floor canvas, which slides openings too, in the opening's own room.
- Status line while lengths show: "Lengths in metres · the highlighted ones are changing" (or
  feet). The mockup's "{what} · blue lengths are changing · in {unit}" became two fixed texts:
  the status line takes a key without parameters, the element's name is already beside it, and
  the accent follows the form theme, so it isn't always blue.

Seen while checking (not changed): on the derived engine a room drawn on a Floor canvas isn't
snapped (`snapSize` returns the raw size when the controller has an interaction), and core
attaches it to a room within 25 cm (`create_room`, `attachmentTolerance`), so the room created
can differ a little from the lengths shown while drawing.

For later (maintainer, 2026-11-21): the lengths of a room being drawn are to be looked at again
when lengths stay visible (step 2) and when they can be typed on the canvas (step 4). Then the
drag shows its lengths in place of the ones that stay, and a pill becomes the field you type in.

Hand test (test page):

1. A room entry: add a door, slide it by its capsule: three lengths along the inside face, the
   two outer ones highlighted, its name hidden; drag an end: the width and that side
   highlighted. Status line: "Lengths in metres …"; back to its hint after the drop.
2. A door on a shared wall, and on a side with a vertex where another room's wall meets it: the
   chain runs corner to corner of this room.
3. A Floor canvas: draw a room: its width and depth while drawing.
4. Not on the test page (it has no locale or unit switch): a comma decimal and feet, covered
   by `formatLength`'s tests.

Checked in headless Chrome: steps 1 and 3 (and the 3c-1b cursors and handles on the plan page,
a Floor canvas and a room entry). Web 375 of 381 (the 6 worker tests); new
`tests/building-plan-drag-lengths.test.js`.

Hand-tested: works. Committed: form0-react `21f4ba8` (3c-1b), `2d18dd2` (3c-2). Decided after it
(2026-11-21):

- A room being drawn snaps as corner drags do, Alt for free; core keeps attaching it to a room
  within 25 cm (wanted, to attach it when needed). The status line's wording stays.
- Several openings on one side: the full chain, every opening breaking it (corner, opening,
  gap, opening, corner), the lengths the drag changes highlighted. The same chain is the one to
  make editable in step 4. Both as 3c-2b.
- Columns show their clearances while moving (3-L1, in 3c-4); beams wait for the beam unit.
- Seen at the hand test: Cancel on a Rooms entry refused with "A later independent edit depends
  on this editor" (core `cancelScope`, `dependent_edit`), and Save stuck too. Not reproduced
  (four paths tried). Found meanwhile: every open plan dialog listens for the undo, redo and rail
  shortcuts on `window`, so the Floor dialog under a Rooms dialog reacts too. Fix first: plan
  shortcuts in the top dialog only, and core's refusal naming the later edit, for next time.

### Plan shortcuts in the top dialog only; a refused cancel explained (hand-tested 2026-11-21, committed)

- `plan-keyboard.js` (new): plan hosts claim the keyboard as they mount (`usePlanKeyboard`), and
  `ownsPlanKeyboard(element)` tells a canvas, a rail or the undo hook whether its plan is the top
  one (the last mounted and still open: an entry opens over what it came from). Undo and redo
  (`use-plan-history.js`), the rail's shortcuts and the canvas's Esc now act only there. A
  canvas outside a host (tests) still acts.
- Confirmed on the last commit before the fix: Alt+Shift+Z in a Rooms entry undid the Floor
  entry's door slide underneath, and Cancel then asked to discard changes the room never made.
  With the fix the Floor entry keeps it. Not shown to be the refused cancel's cause, but a path
  to it (an edit in another editor while the Rooms entry is open).
- Core (`session.js`): a refused cancel (`dependent_edit`) now says what is in the way, on the
  issue: the edit that can't be undone (`operation`), the path of its first change whose value
  moved (`path`), and the edits made since in other editors (`laterEdits`, empty when the value
  changed outside the history). Message unchanged.
- form0-react logs the whole issue when a BuildingPlan cancel or save is refused
  (`[form0-react] BuildingPlan cancel refused.`), so the console has the details next time.
- `NO_STATUS` moved to `plan-status.jsx` (keeps `canvas-host.jsx` under 300 lines).
- Seen: in a Rooms entry with nothing of its own to undo, Alt+Shift+Z says "Undo and Redo
  belong to the editor that owns the operation." (as before; the undo button could be disabled
  there instead).

Hand test: a Floor entry, slide a door, open its room, press Alt+Shift+Z, close the room: the
door stays slid (no discard question). Rail shortcuts (Alt+Shift+S, R) in a Rooms entry change
only its tools. If the refused cancel comes back, the console now names the edit in the way.
Tests: core 681 of 681 (`building-plan-cancel-dependent.test.js`), web
`tests/building-plan-keyboard.test.jsx`.

### 3c-2b: a room being drawn snaps; the full chain (hand-tested 2026-11-21, committed)

- A room being drawn (`snapDraftCorner`): each corner pulled into line with other rooms'
  corners, as a corner drag is (Alt: no pull), else on whole centimetres, so the room created is
  the one its lengths showed; core still attaches it within 25 cm. On the press, while drawing
  and on the drop.
- Several openings on one side: the chain breaks at each (corner, opening, gap, opening,
  corner); the lengths on the moving side(s) of the dragged one are highlighted, other openings'
  widths plain. Openings on other sides and the dragged one's twin face are left out.
- Seen: a length shorter than its pill (a window 1 cm from the corner shows "0.01") draws its
  pill over the corner. For later, with step 2: a pill that doesn't fit goes outside its
  segment.

Hand test: a room entry, a door and a window on one wall, slide the door: corner, door, gap,
window, corner; the gap and the far side highlighted. A Floor entry, draw a room next to a
room: its edges pull into line (guide), the lengths are whole centimetres, Alt draws freely.
Web 380 of 386 (the 6 worker tests).

Hand-tested: both work. Committed: form0-react `da3cb32` (shortcuts), `b512976` (3c-2b);
form0-core `41244e3` (refusal details). Agreed: Undo and Redo off where the entry has nothing of
its own to undo (now); a pill that doesn't fit goes outside its segment (with step 2).

Seen at the hand test (2026-11-21, captured `state-2026-11-21T18-48-49-321Z.json`): R#1's W2
pushed right into the next room draws a solid piece of wall above W2, in the faded neighbour;
moving W2 back left, the neighbour keeps the indent the push made, though nothing was saved.

**Found (2026-11-21), reproduced with two rooms attached (drawn within 25 cm, so W2 is shared):**

- *The kept indent is decided behaviour* (`reform-backend-nestjs/docs/building-plan-derive-step-3-item-3.md`):
  F5 makes `widen` the default; towards the neighbour the whole shared wall moves, so a taller
  neighbour gets a notch; away from it the neighbour keeps its face, the wall widens up to the
  limit, holds, then the room detaches (W2 became "W10.1"), and point 9 says a seated jog stays
  when the face is dragged back. F7 counts "before the edit" from the drag's start. Options:
  (1) keep it, Undo is the way back; (2) a drag away first returns the neighbour's face to where
  it was when the entry opened, then widens (revisits F7: entry start instead of drag start; a
  core change); (3) `move_wall` as the default (revisits F5: shrinking a room then pulls its
  neighbour along).
- *The solid piece is a stray footprint polygon.* The neighbour was 16 cm taller than Room 1's
  outer face, so after the push it keeps a 16 cm strip above Room 1's top wall, which becomes
  shared. That shared wall's footprint has a 20 × 4 cm polygon at the strip's end (y 6.86 to
  6.90, over W2) inside the neighbour's top wall band, and it is drawn at the room in scope's
  level, so it shows dark in the faded wall. Likely a junction cap mostly hidden under the strip.
  Fix in core's footprints (the polygon shouldn't be there), not in the drawing.

### Undo and Redo off with nothing of the entry's own (hand-tested 2026-11-21, committed)

Core's state names the editor that owns the next undo and redo (`undoScopeId`, `redoScopeId`);
`ownsHistory` turns an entry's Undo and Redo off, and its shortcuts quiet, when the next step
belongs to the entry under it (no more "Undo and Redo belong to the editor…"). Hand test: slide a
door on a Floor canvas, open its room: the room's Undo is off; drag a corner: on (the Floor's
off). Core 682 of 682.

### 3c-3: lengths for room walls and corners (hand-tested 2026-11-21, committed)

- `changedSides` (`drag-lengths.js`): the room in scope's sides corner to corner (vertices in
  line merged, 3-L2), compared with the room when the drag started (`gestureRooms`); those whose
  length changed, or that the drag made (a jog), drawn inside the room, all highlighted. A side is
  matched to the one before it running the same way, on the same line if there is one, else the
  nearest, so a wall moved straight shows the two sides next to it and not itself.
- The canvas: a room wall's move (its room and kind recorded at the drag's start, since a preview
  can replace the row's id) and a room corner's drag. Core keeps the last valid preview when it
  refuses, so the lengths keep the last valid position (3-L5). Free walls and their split points
  are 3c-4.

Hand test: a room entry, drag the top wall's grip: the left and right sides' lengths; drag a
corner: the two sides meeting there; split a side and move the wall at its end: the side
corner to corner; push a wall into a shared neighbour: only this room's lengths. Web 385 of
391 (the 6 worker tests).

Hand-tested: both work. Committed: form0-core `f83c85c` (undo owner), form0-react `154c79c`
(Undo off), `0fd00e3` (3c-3). Decided: the kept notch, option 2 (a drag away first returns the
neighbour's face to where it was when the entry opened, then widens), to try and revert if it
doesn't feel right; the stray footprint polygon fixed in core before 3c-4.

### A new entry's Undo removed its own row (hand-tested 2026-11-21, committed)

Seen: in a new floor's entry Undo was on (the floor's creation is the entry's first edit), and
clicking it removed the floor; the open entry's row no longer existed and the form broke ("The
BuildingPlan editor row no longer exists", `RepeatableEntryModal`). Core: the edit that creates
the row an editor opened on (`openRow` → `apply(…, { opening: true })`) is the scope's opening
edit: Cancel reverses it, Undo leaves it (`unchanged`), `canUndo` and `undoScopeId` say there
is nothing to undo; once the entry is saved it becomes the parent's ordinary edit (the parent's
Undo removes the row). Same for a room, wall, door, column or beam added from a list.
Hand test: Add Floor: Undo off, Alt+Shift+Z does nothing; Cancel removes the new floor; Save,
then the plan page's Undo (if any) or the parent's removes it. Core 683 of 683
(`building-plan-editor-open-row.test.js`). Restart the test page (core change).

Hand-tested: works. Committed: form0-core `97a127b`.

### The stray cap piece; a floor's number in its title (hand-tested 2026-11-21, committed)

- *Stray piece (core `footprints.js`).* A cap (an edge with no row, F4) was banded both ways
  from its edge, the room's clear space taking the inner half away. Where that space is
  shallower than the wall (the neighbour's 16 cm strip above the pushed wall), 4 cm stood past
  it in the next wall's band, at the other room's level. The band now stands on the face's outer
  side only (`-side`, the room's orientation). Test `building-plan-cap-band.test.js` (fails
  without the fix).
- *Floor number.* A floor named "Upper floor" or "Basement floor" shows its number as entered:
  "Upper floor 2", "Basement floor -1" (`buildingPlanFloorTitle`, core `row-title.js`), in the
  list rows, the entry's header (form0-react: a plan entry's header reads like its list row)
  and the canvas's floor tabs; shared-value questions name it so too. A record's stored title
  (`title_field`) is unchanged: exported values stay as they were.

Hand test: the pushed shared wall (two rooms drawn within 25 cm, the right one taller): no dark
piece over W2. A floor: Name "Upper floor", number 2: the header, the tab and the Floors list say
"Upper floor 2"; "Basement floor" with -1 says "Basement floor -1". Core 685 of 685, web 385 of
391. Restart the test page (core change).

Hand-tested: both work. Committed: form0-core `f008b24` (cap band), `c1788dd` (floor title);
form0-react `ab7c255` (entry header).

**Floor order (raised 2026-11-21, to decide).** Floors are listed, in the Floors list and the
canvas's floor tabs, in the order they were added. Proposed: show them by level, from the story
elevation they already require (ground 0, above positive, below negative), ties by name (land
survey, basement, ground, mezzanine, upper, roof, other) and number; display only, so the stored
row order and exported records stay as they are. A mezzanine then falls where its elevation puts
it. Dragging rows to reorder a RepeatableSection is a separate, general feature (it changes the
stored order, needs touch and keyboard ways too), not needed for floors.

**Floor order (hand-tested 2026-11-21, committed: core `5081770`, web `7194255`).** Decided: by story elevation, display only;
dragging rows to reorder left for later, if needed. Core `floor-order.js`
(`buildingPlanFloorsByLevel`): elevation low to high (none: last; an empty value is none, not
0), ties by name (land survey, basement, ground floor, mezzanine, upper floor, roof, other) and
number, then as added. The canvas snapshot's floors carry their `order`, and the floor tabs sort
by it; the React controller adds `floorsByLevel` for the Floors list (unnamed floors keep their
stored number in "Floors n"). Stored rows and exported records keep their order. Hand test: add a
floor "Basement floor", -1, elevation -3: the Floors list and the tabs show it before the Ground
floor; its tab still switches to it; change an elevation and the order follows. Core 687 of 687,
web 384 of 391 (the worker tests and the numeric-setters flake).

Seen meanwhile (not changed): a new floor's entry shows the first floor's plan (tabs "Ground
floor", "F#2", the first active), not its own.

### The kept notch, option 2 (2026-11-22, committed)

Agreed (2026-11-22): N1, outside any editor no return (today's behaviour); N2, the neighbour's
face at the editor's start found by geometry, not by row id; N3, the mirror case (a wall widened
in an entry, then dragged towards the neighbour, moves whole at its widened width) left out, a
follow-up if the hand test asks for it, since narrowing back drops the explicit thickness widen
stores.

- *Core (`derive/entry-return.js`, new).* A drag of a shared wall away from its one neighbour,
  under `widen`, in an editor: how far the neighbour's face now stands past where the editor
  first saw it. That much of the drag moves the whole wall back (`move_wall`), exactly, however
  the drag snaps; the rest widens as before (limit, hold and detach measured after the return).
  `resizeFace` runs the two passes. Where the editor first saw the face: the earliest of the
  plans the editor went through in which the neighbour had a line facing the same way as its face
  now, overlapping the shared stretch, on the dragged room's side, with a line of the dragged room
  facing it across a wall (no wider than the widen limit). Revised after the first hand test, see
  below.
- *Core (`session.js`).* Each editor scope keeps the plans it went through (the plan it opened
  on, then the plan after each commit, synchronize, undo, redo or child cancel; a private map,
  not in `getState()`); `preview` hands them to the derived command (`entryStates`, each plan's
  copy of the floor as `entryFloors`).
- *Core (`canvas-controller.js`).* Found by the headless check: the web canvas previews in a
  session of its own (the editor commits), with no scope, so the drop returned the wall while the
  drag showed it widening. A managed controller now opens a scope of its own in its session when
  it creates it (the plan the canvas opened on: the entry's start) and previews in it
  (`previewScopeId`).

Hand test (restart the test page, core change): `?form=plan`, View, double-click the Bedroom
(its entry opens over the floor's), select W3 (left of its door), push it 0.5 m down into the
next room (the notch), release, then drag it back: the next room's face comes back with it
while dragging, and at 0.5 m the plan is the one the entry opened on; drag further: the wall
widens as before (up to 0.7 m), the next room stays. Save, reopen the Bedroom, drag back: the
saved push stays (the entry opened on it). Core 693 of 693
(`building-plan-derived-entry-return.test.js`), web 384 of 391 (the worker tests and the
numeric-setters flake).

First hand test (2026-11-22, capture `state-2026-11-22T10-53-48-254Z.json`): the first wall
returned; a second didn't. The sequence, read from the capture: Room 1 beside the taller Room 2;
W2 pushed into Room 2 (the notch), W1 and W3 pushed into the notch's top and bottom sides, then
dragged back: the sides stayed. Cause: the return looked for the neighbour's face only in the
plan the entry opened on, and the notch's sides didn't exist then (W2's push in the same entry
made them). A second fault turned up reproducing it: the lookup could take another face of the
neighbour within reach for the pushed one (the core example: A's side pushed 0.3 into B's notch
side, dragged back 0.6, B's side ended 0.3 past where it was; B's far side matched), with only a
depth check against it. Agreed fix (2026-11-22): the session keeps every plan the entry went
through, and the return reads the earliest that has the face, which must face the dragged room
across a wall (replaces the depth check). Three tests added (the report's sequence in a session
and through a managed canvas, the far face within reach); they fail with the start plan only, the
far-face one also without the across-a-wall check. Core 696 of 696, web 385 of 391 (the worker
tests). Headless on the real canvas: W3 pushed 0.498, A's side pushed 0.299 into the notch's side
(5.2 to 5.499), dragged back 0.498: the side returns to 5.2 and A's side widens to 4.801, during
the drag and after the drop.

Hand test, round 2 (restart the test page, core change): as above, then in the same entry push
the Bedroom's right side, where it now meets the next room's notch, further into it, and drag it
back: the notch's side comes back with it, then the wall widens. On your plan: W2 into Room 2,
then W1 or W3 into the notch's sides and back.

Hand-tested 2026-11-22 (round 2: works). Committed: core `bcd0861`.

### 3c-4: lengths for free walls and columns (2026-11-22, hand-tested, committed)

Agreed (2026-11-22): a free wall's end shows its run's length along the centreline, a split point
both runs; a free wall moved, its clearances along its own axes (across from its faces, along
from its ends); a column, across x and y; one per axis, the nearer side, 0 not drawn; a new
module, since `drag-lengths.js` is at 237 lines.

- `content-lengths.js` (new): `runLength` (beside the wall, clear of its face: above it, or left
  of it when it runs up and down), `splitPointLengths` (each run on the outside of the bend),
  `clearances` (a ray from each side of the element along the axis to the room's inside face,
  the nearer kept; under 5 mm, a side on a wall, not drawn), `columnClearances` (from the middle
  of each side), `freeWallClearances`, `freeWallHalfWidth` (from the centreline and the row's
  face). Clearances are drawn along the gap itself (no offset).
- Legacy canvas: `contentDragLengths`, from what the canvas draws (the wall's rendered points, the
  column as drawn), dispatched before the room lengths; a dimension may carry its own offset.
- Targets are the room's inside face only ("face to inside face"); other free walls and columns
  are not measured to.

Hand test (reload the test page; web only): `?form=plan`, View, double-click the Bedroom. Wall
tool, draw a free wall across it; Select, click it, drag an end: its length above it; drag its
grip: the clearance across (from the nearer face) and along (from the nearer end), none for a side
on a wall. Split it, drag the split point: both runs' lengths, outside the bend. Add column (it
lands at the room's centre), drag it near a corner: its clearance across x and y; against a wall:
only the other axis. Tests: `building-plan-content-lengths.test.js` (10); web 395 of 401 (the
worker tests). Headless on the real canvas: all four gestures as described. Seen there: a column's
clearance upwards runs over its label (C#1), and a free wall's clearance across can touch its
label; hiding the dragged element's own label while it moves would clear both (to decide).

Hand-tested 2026-11-22: works. Committed: form0-react `b092562`. Hiding the dragged element's
label: on hold. Found at the hand test, in core, not 3c-4 (agreed 2026-11-22, each its own unit
before the step 3 docs wrap-up):

- *A split point doesn't hold its wall's line.* Dragged, it snaps as a free end does (corners,
  faces, lining up, else 1 cm steps); nothing pulls it onto its own wall's line, so it is hard to
  slide along a straight wall. Fix: the runs' lines as the drag found them pull it (8 px, 13
  held), with a guide; corners and ends first, Alt none.
- *A return can't be moved* ("Move an adjacent partition portion to adjust this return.",
  capture `state-2026-11-22T11-47-02-185Z.json`: W9.2, the return made when W9.1 moved). Today's
  rule. Change: a return moves parallel to itself, its ends sliding along the neighbouring
  portions' lines (they lengthen or shorten, keeping their direction), as a room wall's jog does;
  refused when a portion would vanish or the return runs nearly along one.

### A split point's pull and moving a return (2026-11-22, hand-tested, committed)

Two core units from the 3c-4 hand test, each committed on its own after the hand test.

- *The split point holds its wall's line* (`free-wall-bend.js`, `interaction.js`). The runs' lines
  as the drag found them (each far end through the split point, across the room) are line targets
  of the split point's pull, after corners and ends (8 px, 13 held; Alt none). On one, the point
  goes on the 1 cm step from that run's far end (the run a whole centimetre long), with a guide
  from that end. On a straight wall both lines are the wall's line: the point slides along it.
  Tests (2, in `building-plan-free-wall-bend.test.js`) fail with the old pull.
- *A return moves* (`derive/partition-portions.js`, `moveReturn`). Parallel to itself, by the part
  of the move across it; its ends slide along the portions it joins (they lengthen or shorten,
  keeping their direction). Refused when a portion would shrink to nothing
  (`partition_return_collapse`) or runs nearly along the return (`partition_return_parallel`).
  The stored paths are faces on one side, all at the same distance from the centrelines, so the
  centrelines follow. Bends aren't offered once a return exists (as before). Tests: new
  `building-plan-partition-return-move.test.js` (3), failing without the change. On the capture,
  W9.2 moves 0.3 either way; 0.84 right or 0.9 left are refused.

Core 701 of 701, web 395 of 401 (the worker tests). Headless on the canvas: a split point dragged
3 cm off its wall stays on it (lengths whole centimetres, a guide along the wall); a return made by
moving a portion down moves 0.3 m sideways, the portions next to it following.

Hand test (restart the test page, core change): a room entry, draw a free wall, split it, drag
the split point along the wall a little off it: it stays on the line, then leaves it when you pull
away; bend it, drag again: each run's line holds. Then split a straight wall, move one portion
sideways (a return appears), select the return and drag it: it moves, the portions next to it
lengthen and shorten; too far, the refusal.

Hand-tested 2026-11-22: both work. Committed: form0-core `68747f3` (split point), `d95d345`
(return).

### Step 3: wrap-up (2026-11-22)

Step 3 (handles and live lengths, web) is done, each unit hand-tested before its commit:

| Unit | What | Commits |
|---|---|---|
| First part | Hit areas in screen pixels, openings grabbed anywhere, the wall grip; Pin in the rail, hints in the status line, fit on open | form0-react `b5dc3d9` and earlier |
| 3c-1, 3c-1b | One handle style (3-H1), grips (3-H2), cursors that follow the element and what the canvas allows (3-H3), the pin badge (3-P) | form0-react `e9707ac`, `21f4ba8` |
| 3c-2, 3c-2b | `draw/dimensions.js` (3-L3, 3-L4); lengths for doors and windows (the full chain along a side) and a room being drawn, which snaps | form0-react `2d18dd2`, `b512976` |
| 3c-3 | Lengths for room walls and corners, corner to corner (3-L2) | form0-react `0fd00e3` |
| 3c-4 | Lengths for free walls (a run, both runs at a split point) and clearances for a moved free wall or column | form0-react `b092562` |

Along the way, in core (each its own unit): the undo owner (`f83c85c`), a new entry's Undo
(`97a127b`), the cap band (`f008b24`), the kept notch option 2 (`bcd0861`), a split point holding
its wall's line (`68747f3`), moving a return (`d95d345`).

Left out of step 3, by decision: column resize on the canvas (3-H4, step 4; sizes are typed);
beams beyond style and cursor (3-H5, the beam unit); hiding a dragged element's own label (on hold
2026-11-22); a length shorter than its pill drawn outside its segment (with step 2). Clicking a
length to type it is step 4.

### F1: an entry shows its own floor (2026-11-22, hand-tested, committed)

Seen (reproduced headless): Add Floor opened the new floor's entry on the Ground floor, its tab
active and its room selected; a room drawn there went to the Ground floor. Cause: the entry passes
its floor as `scope.floorId` (`form-renderer.jsx`, from the editor's row), but nothing used it to
choose the floor shown; the core canvas controller always started on floor index 0. So any floor
or room entry on another floor showed the first floor, not only a new one.

- *Core (`canvas-controller.js`).* The controller keeps the floor shown by id (`shownFloorId`): a
  `floorId` option (an entry's own floor), `showFloor(floorId)`, and a tab chosen
  (`setActiveFloor`); `refresh` picks it whenever the plan changes, so it stays shown when floors
  are added or reordered. None given: the first, as before.
- *Web (`canvas-host-mount.js`).* The managed controller gets `floorId` from the entry's scope;
  a scope change shows its floor.

Tests: `building-plan-canvas-shown-floor.test.js` (3: shown from the start with its tab active,
drawing goes to it, it stays as the plan changes and follows `showFloor` and the tabs), failing
without the change. Core 704 of 704, web 395 of 401 (the worker tests). Headless: Add Floor shows
F#2, empty; a room drawn there stays on F#2; its room entry shows F#2.

Hand test (restart the test page, core change): `?form=plan`, View, Add Floor: the new floor's
tab is active and the canvas empty; draw a room: it stays there; double-click it: its entry
shows the same floor. On a plan with two saved floors, open the upper one's entry, and a room's
on it: each shows its floor.

Hand-tested 2026-11-22: works. Committed: form0-core `f685d76`, form0-react `418114c`. Decided
for F2 (2026-11-22): U1 kept (a floor with no elevation shows nothing under it, a new floor
included until its elevation is typed); the chip is muted text in the floor tab row, after the
tabs; in a floor or room entry only the entry's own floor tab shows (all tabs on the plan page).

### F2: the floor below, drawn and named (2026-11-22, hand-tested, committed)

As decided (U1 to U4; the chip in the tab row; an entry shows only its floor's tab):

- *Core (`floor-below.js`, new; `canvas-controller.js`).* The canvas snapshot's `floorBelow`: the
  nearest floor before the one shown in level order with a lower story elevation (none for a
  floor with no elevation, the lowest, or one only at the same level), with its label (its tab's)
  and outlines in canvas units: its wall bands (`buildingPlanFootprints`, free walls included) and
  its columns (position and size). Display only. Worked out on each refresh; a preview reuses it
  (an edit of this floor can't change it).
- *Web.* `draw/floor-below.js` (new): hairline outlines (one screen pixel, both faces, no fills),
  in a new plan token `below` (the muted text mixed 70% into the background); the legacy canvas
  draws it after the room surfaces, before this floor's walls. The tab row names it after the
  tabs ("Ground floor below", `plan.floor.below`, quiet text). An entry's tab row shows only its
  own floor's tab (`entryFloorTabs` in `canvas-adapters.js`, all of them if none matches); the
  plan page shows all. The canvas reports tabs with their floor id and the floor below's label;
  the host keeps both in one state.

Tests: core `building-plan-floor-below.test.js` (3: the bands and columns, named; none for the
lowest, no elevation, the same level; a preview keeps it); web `building-plan-floor-below.test.js`
(3: the entry's tab, the fallback, the outlines drawn). Core 707 of 707, web 398 of 404 (the worker
tests). Headless: Add Floor, elevation 3: only F#2's tab, "Ground floor below", the Ground floor's
bands as hairlines; a room drawn over them shows them on its surface, its walls cover them.

Seen there, not changed: an empty new floor doesn't fit its view to the floor below (the fit on
open has nothing to fit, and the floor below only appears once the elevation is typed).

Hand test (restart the test page, core change): `?form=plan`, View, Add Floor, type a story
elevation (3): the tab row shows only the new floor's tab and "Ground floor below", the canvas the
Ground floor's walls as thin grey outlines; draw a room over them: the outlines show inside it,
not over its walls. Clear the elevation: they go. The Ground floor's own entry: no floor below,
only its tab. The plan page: all tabs.

Hand-tested 2026-11-22: works. Committed: form0-core `930c69b`, form0-react `e675129`. Found at
the hand test, both from 2026-11-08 (v2 editing), not from F2:

- *A cleared elevation keeps the floor below.* An entry's values reach the plan through core's
  `editor.completeRow`, which writes a row only when its changed fields are valid; a required
  field cleared isn't, so the plan keeps the last valid value (3) and the canvas, which reads the
  plan, keeps the floor below. Every plan field behaves so (a floor's wall thickness cleared keeps
  the walls' last thickness). Kept (2026-11-22): the canvas shows the last valid plan; Cancel
  reverts. Letting the plan take an empty required value would change every plan field.
- *Save with a cleared required field shows no validation.* The entry's Save asks the editor to
  complete the row first and stops unless it is applied or unchanged; a field typed or saved,
  then cleared, makes it invalid, so Save stopped before counting the submit, which turns on the
  Validation panel and the red fields. To fix (web).

Decided (2026-11-22): an empty floor fits its view to the floor below when it appears; F3 next.

### Save shows why; an empty floor fits to the floor below; F3 (2026-11-22, hand-tested, committed)

Three units, each committed on its own after the hand test.

- *Save with a cleared required field (web, `form-renderer.jsx`).* When the plan editor can't
  complete the row (`invalid`: a required field cleared, a value it can't take), the entry's Save
  now counts the attempt before stopping, so the Validation panel and the red fields show; the
  form's own validation says why. Both paths seen at the hand test: a field typed then cleared,
  and a saved floor reopened with its elevation cleared. Test in `building-plan-editor.test.jsx`,
  failing without the fix.
- *An empty floor fits to the floor below (web, legacy canvas `fitToContent`).* With no rooms, the
  fit uses the floor below's outlines. The fit on open stays pending on an empty floor, so it
  runs when the floor below appears (its elevation typed); the first room drawn then no longer
  moves the view.
- *F3: pulls to the floor below (core `interaction.js`; web ring).* Its wall bands' corners (both
  faces) join the pulls of drawing a room (`snapPoint`), a room corner (`snapCorner`), a room wall
  and moving a room (`snapTranslation`: an edge into line with a corner below). Today's reach and
  hold, Alt none. Nearest wins, a tie goes to this floor (U8; `choose` breaks equal errors in this
  floor's favour). A face of this floor in contact still ranks first, as today. Guides from a
  corner below carry `below`; the canvas rings that corner (5 px, the guide's colour). Free walls
  and columns later (U6). Tests: `building-plan-floor-below-pull.test.js` (3), failing without it.

Core 710 of 710, web 398 of 405 (the worker tests and the numeric-setters flake). Headless: the new
floor, elevation 3, fits to the Ground floor's outline; a room drawn near it snaps its edge onto
the inside face below, a ring on the corner; elevation cleared, Save: Validation 5, the fields red.

Hand test (restart the test page, core change): Add Floor, type elevation 3: the view fits to the
Ground floor; draw a room near its walls: corners and sides pull onto the floor below's corners
(a ring marks the corner), Alt draws freely; drag a corner, a wall, the whole room: same. Clear the
elevation and Save: the Validation panel and the red field. A saved floor reopened, elevation
cleared, Save: the same.

Hand-tested 2026-11-22: all work. Committed: form0-react `1c2a3c9` (Save), `a800458` (fit),
`fdd24ca` (ring); form0-core `5666d82` (F3 pulls). Asked at the hand test: the room tool's first
corner snapping before the press (below).

### The room tool shows where a room would start (2026-11-22, hand-tested, committed)

Asked at the F3 hand test: on an empty floor, the cursor should snap to the floor below's
corners before drawing starts, as the corner being dragged does. The press already pulled the
first corner (`snapDraftCorner`), but nothing showed it until the drag. Now, with the room tool
and no room being drawn, a pointer move works out that corner the way the press will (into line
with rooms and the floor below, Alt none) and the canvas draws the handle there, with the pull's
guides and the ring on a corner below. The press starts the room there; leaving the canvas or
changing tools clears it (and its guides). Legacy canvas only (`draftStart`). Test in
`building-plan-drawing.test.js`, failing without the change. Web 400 of 406 (the worker tests).
Headless: the room tool a few pixels off a corner below: the handle on the corner,
its guide.

Hand test (reload the test page; web only): a new floor with an elevation, the room tool: move
the pointer near the floor below's corners: a handle jumps onto them (a ring when it's a corner
below); press there and draw: the room starts on that corner. Alt: the handle follows the pointer.

Hand-tested 2026-11-22: works. Committed: form0-react `40f827d`.

### Opening entries by double-click: N1 to N3 (2026-11-22, hand-tested, committed)

The decided navigation (see "Opening entries by double-click" below), in three units, each to
commit on its own after the hand test. Web only; no core change, no record change.

- *N1: a Floor canvas and the plan page open rooms only.* `entry-chain.js` (new):
  `doubleClickTarget` cuts the element's index path to its room on a floor-level canvas (`parent`
  or `floor-modal`); the managed controller's `focusRow` goes through it (`canvas-host-mount.js`).
  Legacy canvas, the press only: it records what a double-click opens before its capability
  checks (room and wall handles, columns, beams, doors and windows), since a Floor canvas can't
  drag columns, beams or handles and the plan page can't move anything. Found headless: the plan
  page's canvas isn't read-only (its controller is), so a door press there returned at `canMove`
  before recording anything. Also fixed: the locked press (view-only entries, read-only records)
  read `opening.opening.id`, undefined (`findOpeningNearPoint` gives `openingId`), so no door or
  window opened from a locked canvas.
- *N2: every level a real dialog.* The entry's `focusRow` opens the next row only
  (`nextEntryStep`), passing the rest of the path as `buildingPlanFocusPath`; the dialog opened
  carries on from its mount effect (`chained`), which shows the list towards the next row (as the
  navigation's list entry does), that row marked and selected on its canvas (a new `select` prop;
  the scope effect moved, unchanged, from `canvas-host.jsx` into `use-plan-scope.js` with it). The
  effect moved below the dialog's list reset on open. The dialog double-clicked in stays as it
  was. `markPlanRow` ignores the entry's own element: a view-only entry (a wall) selects it again
  on every update, which dropped the row marked on the way. The issues list's items carry their
  `fieldName`, so its double-click focuses the field, as the root Validation tab's does.
  `invalid_routing_context` goes: no path skips a level.
- *N3: the path in the header of nested RepeatableSection dialogs.* Each dialog reports its row
  title as it is now to the stack (`modalRecordTitles` in the form); its header shows
  `dialogPathParts` (`dialog-path-parts.js`) through `DialogPath` (`dialog-path.jsx`, styles in
  `dialog-path.css.js`) in place of the list's label. A first-level dialog on its page reads as
  before. When the path doesn't fit, by the parts' natural widths, it collapses to "Floors › … ›
  Bedroom › Walls", then to "… › Walls"; the parts before the title shrink first.

Tests (each failing without its change): `building-plan-entry-chain.test.js` (rooms only, the
next step, presses on a Floor canvas or the plan page and on a locked canvas),
`building-plan-editor.test.jsx` (a wall issue opens Floor › Room › Wall, the floor and the room
on their lists with the row marked, the wall's header path), `dialog-path.test.jsx` (the parts,
the collapse, a nested ordinary RepeatableSection), `building-plan-findings.test.js` (an item's
field). Web 407 of 413 (the worker tests).

Headless on the fixture: plan page, a room, a wall or the door: Floor › Bedroom, the Floor on its
Rooms list with Bedroom marked. Floor canvas, a wall or the door: the Bedroom only, the Floor on its
page. Room canvas, the door: W3 on its Doors list ("Shared door" marked) › the Door; the door's
label edited and saved: the list marks "Edited door"; the Wall saved: the Room as it was. A
view-only W3 opened by hand, its door: the Door, W3 as it was. The issues list in the Floor
dialog, a wall finding: Room on its Walls list (W1 marked) › W1, focus in its field. Header: wide
and medium show the whole path, phone "… › Walls". No console errors or warnings.

Hand test (reload the test page; web only):
- N1: on the plan page and on a Floor canvas, double-click a room, a wall, the door and a column:
  each opens its room only (the plan page: the Floor, then the Room).
- N2: in a Room, double-click the door: the Wall opens on its Doors list with the door marked,
  then the Door; Cancel steps back through each. From a Floor's "n issues" (`form=plan-issues`,
  after Submit), double-click a wall finding: Room › Wall, the field focused. Edit and Save in a
  Door opened so: no `invalid_routing_context` in the console.
- N3: the header of each nested dialog names the path ("Floors › Ground floor › Rooms"), the row
  in the bar; a Floor reads "Floors"; Building Condition Survey, Rooms surveyed › Observations, the
  same; Width "Phone": the path collapses, the title stays whole.

Hand-tested 2026-11-22: works. Committed: form0-react `665230e` (N1), `9c056f5` (N2), `84b53aa`
(N3).

Found at the hand test, and decided (2026-11-22):

- *A false "unsaved changes" on Cancel.* Opening a wall from a Room and coming back, the Room's
  Cancel asked with nothing changed; a Floor asked even when opened and cancelled at once.
  Read headless from the comparison Cancel makes (`hasEntryChanges`): after a child dialog
  closes, the Room's draft rows carry the editor's evaluation (`visible`, `required`, `errors`,
  `read_only`, merged by core's `evaluate` into the record `getRecord()` returns), which its
  opening snapshot doesn't; and a floor row saved by core has `null` for an unanswered choice
  where the dialog holds `{ choice: [], other: [] }`. Not from N1 to N3 (opening a wall by hand
  from the list does the same). Weighed: fixing it in core (evaluation beside the record; rows
  written with canonical choice values) was set aside, since it changes exported records
  (Reform reads them). Decided: the form compares data only (display state ignored, empty
  values alike), for every entry.
- *Clickable breadcrumbs.* Decided: a part of the path works as the Cancel and Back presses from
  the top down to its level, each asking as it does today; keeping the changes stops there. A
  list part lands on that list, a row part on its page, the first part closes every dialog; the
  "…" stays inert.
- *A Floor canvas edits rooms only.* A door double-clicked on a Floor canvas showed the door and
  its wall selected (a click selected them, since doors slid there), and the room opened.
  Decided (revising 3c-1b, where the capsule was made to slide an opening on a Floor canvas): a
  Floor canvas draws, moves and attaches rooms only; doors and windows don't slide there (walls,
  columns and beams already didn't, and corners don't reshape there). A click on anything inside
  a room selects the room, on a Floor canvas and on the plan page, so the canvas, the Rooms list
  and the double-click agree.

### Cancel, a Floor canvas for rooms, clickable breadcrumbs (2026-11-22, hand-tested, committed)

The three decisions of the N1 to N3 hand test (see there), each a unit to commit on its own;
they share one hand test. Web only, no record change.

- *A: Cancel asks about data only* (`utils/entry-data.js`, `sameEntryData`). An existing row's
  Cancel compares its data with the snapshot it opened with, leaving out a row's display state
  (`visible`, `required`, `errors`, `read_only`) and treating empty values alike (`null`, `''`,
  `[]`, an empty choice). A new row compares as before, so an untouched new row still asks:
  found by `runtime-retention.test.jsx`, which expects that prompt; making it data-only too
  would change every RepeatableSection's Add then Cancel (to decide if wanted).
- *B: a Floor canvas edits rooms only* (`controller.js`: `canMove` off on a Floor canvas; doors
  and windows no longer slide there, their cursor is the arrow). On a Floor canvas and on the
  plan page, a press on a wall, door, window, column, beam or room handle selects its room
  (`selectRoomOf`, legacy canvas, in the branches that refuse the drag), and on the plan page a
  press on a room selects it. A canvas scoped to a room is unchanged.
- *C: clickable breadcrumbs.* The parts before the title are buttons (`DialogPath`,
  `dialogPathParts` now giving each part its target: the dialog to land on and the list it then
  shows). The form keeps the request (`dialogStepUp`); each dialog above the target, on top in
  turn, closes as Back then Cancel would (`use-dialog-step-up.js`), asking when it has changes;
  keeping them stops there. The target then shows its list, or its page. The first part closes
  every dialog. `cancelEntry` now tells whether the dialog closed; the list-entering code is
  shared (`showNestedList`, the chain uses it too).

Tests (each failing without its change): `entry-data.test.js`, `building-plan-editor.test.jsx`
(a floor opened and cancelled, a room after one of its walls: no prompt; a room holding a saved
wall edit: the prompt), `building-plan-floor-selection.test.js`, `building-plan-handles.test.js`
(a Floor canvas's cursors), `dialog-path.test.jsx` (each part's target; a row's part, a change on
the way kept and then discarded, the first part). Web 415 of 421 (the worker tests).

Headless on the fixture: a Floor opened and cancelled, and a Room after a wall and Cancel, ask
nothing; on a Floor canvas a drag on the door changes nothing (the Floor's Cancel then asks
nothing); from a Door opened through the Room canvas, "Rooms" lands on the Floor's Rooms list,
then "Floors" closes every dialog. No console errors.

Hand test (reload the test page; web only):
- A: open a Floor and Cancel: no prompt. Open a Room, open a wall, Cancel, Back, Cancel the Room:
  no prompt. Edit a wall field, Save, Cancel the Room: the prompt. Add a floor and Cancel: the
  prompt, as before.
- B: on a Floor canvas, click a door, a wall, a column: the room is selected (not the door or
  wall); a door doesn't slide; double-click: the room opens. On the plan page, click a room or a
  door: the room is selected.
- C: from a Door opened through a Room canvas, press "Bedroom": the Room on its page; press
  "Rooms": the Floor on its Rooms list; "Floors": every dialog closed. Edit a field in the Door
  first: pressing a part asks; Cancel keeps you there, "Yes, discard" goes on up. Building
  Condition Survey, Rooms surveyed › Observations: the same.

Hand-tested 2026-11-22: works. Committed: form0-react `99f5674` (A), `52c9165` (B), `aee3e91` (C).

### Step 2: decisions (2026-11-22)

Settled with a mockup (https://claude.ai/artifact/UeBG8QwWJG7zgLqzAtizfG; a drawing of a sample
floor, not the real canvas). Read from the code while aligning (not yet checked headless): every
wall in the canvas snapshot carries its record `path`, so `controller.fieldState(wall.path,
'wall_plaster')` and `'wall_plaster_thickness'` give the resolved values, floor defaults included;
boundary walls and free walls have the `_outside` copies; the floor tab row already has an end
cluster (View only, issues, Undo and Redo); room areas aren't drawn anywhere (left out of step 2).

- **S1, the Show menu.** A "Show" button in the floor tab row's end cluster, before Undo and
  Redo, on every plan canvas (the plan page, floor, room and element entries, view-only ones
  included); a dot on it while a layer is off.
- **S2, what it holds.** Three switches, all on by default: Lengths, Plaster, Floor below (listed
  only when the floor has one). No "All rooms" (two lengths on every shared wall).
- **S3, how long a choice lasts.** One setting for every plan canvas of a form, in memory for the
  form's life: a provider in its own module, mounted once by `form-renderer.jsx` (wiring only).
  No localStorage; two forms on one page don't share it.
- **S4, the floor below.** Its switch (U3) goes in the menu, on by default. Off hides its outlines
  and the "… below" name in the tab row and stops its pulls (Alt still frees one gesture). The
  pulls are worked out in core (the snap functions read the controller's own snapshot), so core
  gets a controller setting that every pull path follows, U6's included (name to settle in 2a);
  interaction only, no record change.
- **S5, which faces.** Every face whose resolved plaster is "Plastered": room sides from their
  own row (a shared wall, each side from its room's row), outside faces of boundary walls, both
  sides of free walls. Broken at doors and windows, faded with the scope (V1); columns have none.
  To check in 2b: the outside band wraps outside corners and needs the wall bands' outline; if
  this floor's isn't reachable from the web, a display-only addition to the snapshot (like U4)
  is to agree first.
- **S6, the band.** The plaster's real thickness, to scale like the walls (they have no minimum),
  drawn on the face into the room: the space it takes from the room. At least 2 px on screen
  (on a typical screen 10 to 20 mm is about 1 px at the fitted zoom); exact from about 140%
  (20 mm) to 290% (10 mm). The value goes with the selected wall's name ("W#1 · plaster 15 mm",
  "not plastered"). Rejected: a band by thickness, not to scale (1 px per 5 mm).
- **S7, what lengths measure.** The bare wall face, as the drag lengths and the record do; the
  band sits inside them.
- **S8, which room.** An entry: its own room; a wall, door or window entry: its room, with that
  element's chain. The plan page and a Floor entry: the room you click (none selected, none).
- **S9, which lengths.** Each side corner to corner (3-L2, as in 3c-3), inside the room. The
  selected wall's side adds its chain (split points and openings) at the usual offset, the whole
  side moving further in. The selected wall's name moves in past its lengths; the status line
  names the unit.
- **S10, while dragging.** The drag's lengths replace the room's; a room being drawn keeps its
  width and depth.
- **S11, a pill that doesn't fit.** Past the end of its segment, on its line extended (a spot
  inside the room first, then the chain's outer side); stepped out with a short leader when both
  spots are taken. In `draw/dimensions.js`, so the lengths while dragging get it too.
- **S12, zoomed out.** A room's lengths hide when the room is too small on screen to hold them;
  a drag's lengths always show.
- **U6** (the floor below, next after step 2): free walls and columns pull to the floor below
  (its wall corners and faces, as rooms do); a column's centre onto the centre of the column
  below, centre to centre whatever their sizes; the ring and the pull rule as F3.

Units, each hand-tested before its commit (2a and 2b can share one hand test): **2a** the Show
menu and its setting, with the floor below's switch and the core pull setting; **2b** the
plaster band; **2c** the room's lengths, with S11.

*Beams and exported records* (asked 2026-11-22). Wall beams would add a collection on each wall
(stored on the physical wall, a copy per room side, as doors and windows are) with new fields
(offset, length, position, height); room beams keep their shape and gain a height; the leftover
`beam_wall_segment_index` and ratios could go. Nothing existing changes shape. Reform
(`reform-backend-nestjs` checked): no beam- or plan-specific record code (the record sync walks
Section, BuildingPlanSection and RepeatableSection generically; validation; the billing
entitlement), and building plans aren't live, so there are no stored plan records to migrate;
only `docs/building-plan-v2-system-fields.md` to update. The earlier concern was a changed export
of an existing field type (choices); this is additive. Not checked: whether core writes an empty
collection as an empty list or leaves it out. Agreed: 3a first (today's room beams: snapping,
rule 1, following their walls; no data change, and still needed for beams across a room), then
wall beams as a core design round straight after (open question 1, a beam whose wall splits),
not waiting for step 6.

### 2a: the Show menu and the floor below's switch (2026-11-23, hand-tested, committed)

- *Core (`canvas-controller.js`).* `setFloorBelowPulls(on)`, on by default: off, the scene the
  interaction's pulls read has no floor below, so every pull path stops (drawing a room and its
  start preview, a corner, a wall, moving a room; U6's later). The snapshot keeps `floorBelow`.
  Interaction only, no record change. Test in `building-plan-floor-below-pull.test.js`, failing
  without the change.
- *Web.* `plan-layers.jsx` (new): `PlanLayersProvider`, mounted once in `FormRenderer` around
  the form (wiring only), so the plan page and every entry dialog share one setting for the form's
  life (S3); `usePlanLayers` hands it to the canvas (`setLayers`) and the core controller
  (`setFloorBelowPulls`), also at mount (`canvas-host-mount.js`); a canvas outside a provider keeps
  its own. `plan-show-menu.jsx` (new): "Show" in the floor row's end, before Undo and Redo, a
  dot while a layer is off; switches in a menu that a click elsewhere or Esc closes. While open
  it carries the open-dropdown marker (`data-form0-dropdown-open`), since a dialog's key handler
  otherwise stops Esc before it (found headless). `FloorTabs` lists the layers the floor has:
  in 2a only "Floor below" ("{floor}, and the pulls to it"), so the button shows only on a floor
  with a floor below; Plaster comes with 2b, Lengths with 2c. Off, the "… below" name goes and
  the legacy canvas neither draws nor fits to the floor below (`shownFloorBelow`). Texts in
  `plan-text.js` (`plan.show.*`).

Tests: `building-plan-show-menu.test.jsx` (2: the switch on the plan page hides the name and
stops the pulls, the upper floor's entry follows the same setting, switched back on there; Esc
closes the menu and not the dialog; the canvas's `shownFloorBelow`), failing without the change
(the Esc check fails without the marker). Core 711 of 711, web 417 of 423 (the worker tests).
Headless on the test page: the plan page's Ground floor has no Show; Add Floor, elevation 3: "Ground
floor below" and Show; the room tool 3 px off a corner below starts on it (ring, guide); Floor below
off: outlines and name gone, "some hidden" on the button, Esc closes the menu and keeps the
dialog, the room tool's start stays at the pointer; on again: back. No console errors.

Seen, not changed: "n issues" (`plan-issue-list.jsx`) has the same Esc gap inside a dialog (the
list stays open); the same marker would fix it, a unit of its own if wanted.

Hand test (restart the test page, core change): `?form=plan`, View: on the Ground floor no Show.
Add Floor, type a story elevation (3): "Ground floor below" and Show beside Undo; open Show:
"Floor below" checked. Uncheck it: the grey outlines and the name go, a dot on Show; Esc closes
the menu, the dialog stays. Draw room near where the floor below's corners were: no pull, no ring.
Check it again: outlines back, the pull back (Alt still draws freely). With it off, close the
entry and open a saved upper floor (or the plan page on an upper floor's tab): it stays off there
too. Reload the page: back on.

Hand-tested 2026-11-23: works. Committed: form0-core `37ba511`, form0-react `c67c641`. Asked at
the hand test, a small unit of its own with 2b's hand test: Show stays in the row, disabled, when
there is nothing to switch (from 2b Plaster is always listed, so the same idea goes to the menu:
"Floor below" listed on every floor, disabled where there is none); the dot on Show larger.

### 2a-2 and 2b: Show's notes, the plaster band (2026-11-23, hand-tested, committed)

Two units, one hand test, a commit each.

- *2a-2, Show's notes (web).* "Floor below" is listed on every floor, disabled with "No floor
  below this one" where there is none; Show is disabled only when no switch applies (from 2b
  Plaster always does, so it stays enabled); the dot counts only switches that apply; the dot
  is 12 px (was 9).
- *2b, the plaster band (web; no core change).* `plaster-values.js` (new): the wall rows' plaster
  fields found through `meta.fieldBindings` (their data names carry a schema hash), each face read
  with the controller's `fieldState` (resolved values, floor defaults included; thicknesses in
  metres): the row's own face, and the face across (an exterior wall's outside face, a free
  wall's "Other side"; not applicable on a shared wall). Read on accepted snapshots only and kept
  while a preview lasts, found by wall id, row id, or room and physical wall. `draw/plaster-bands.js`
  (new): a band on each plastered room side into the room, the real thickness to scale and at
  least 2 px, cut where a door or window's axis lies within the wall; a free wall's two faces;
  outside faces from the outer edges of the walls' footprints (open space beyond), each piece given
  to the exterior face a wall's thickness behind it (or the nearest within 60 cm: the corner
  pieces), running on round an outside corner. Drawn after the room surfaces and the floor below,
  before the walls, faded with the wall's scope level (plan tokens `plaster`, `plasterFaint`). The
  selected wall's name adds its plaster ("W1 · plaster 15 mm · outside 20 mm", a free wall's
  "other side", "not plastered"), in mm or in by the plan's unit. The Show menu's "Plaster" switch
  (on by default) hides both.

Chosen while checking (to confirm at the hand test): plaster is drawn over the selected room's
outline. A room in its own entry counts as selected, and its 3-unit outline drawn on top covered
a 15 mm band completely (tried, reverted); now the band shows, and the selection shows through the
room's tint and on faces without plaster. Alternative: trace the selected outline at the plaster's
inner edge.

Tests: `building-plan-plaster.test.js` (6: names and values on a core plan with floor defaults, a
preview's face finding its values, mm, comma and inches, the name's text; bands into the room at
2 px zoomed out and to scale zoomed in, on both sides of a shared wall and not on it, outside
faces wrapping a corner and running on past a shared wall's end, cut at an opening, a free wall's
two faces); `building-plan-show-menu.test.jsx` updated (Plaster switches and puts the dot on Show;
Floor below disabled on the ground floor), failing against 2a. Web 423 of 429 (the worker tests).
Headless on the test page: the Ground floor's defaults set to plastered 15 mm inside and 20 mm
outside: sand bands in both rooms and along the outside faces, wrapping the outside corner,
stopping at the door; Plaster off: gone; the Bedroom's entry: its bands full, the other room's
faded; W1 selected: "W1 · plaster 15 mm · outside 20 mm". No console errors.

Hand test (reload the test page; web only): `?form=plan`, View, open the Ground floor, set
"Select a default status for interior wall plaster" to plastered, 15 mm, and the exterior one to
plastered, 20 mm: thin sand bands on every room side and outside face; zoom in (about 300%): the
bands grow with the zoom, the outside one wraps the corners, both stop at doors and windows. Show:
"Plaster" and "Floor below" (disabled, "No floor below this one"); uncheck Plaster: the bands go and
the dot (larger) shows. Double-click the Bedroom: its bands full, the other room's faded; select a
wall: its name with the plaster ("· outside" on an exterior wall, none on the shared one). Change a
wall's own plaster (its entry, 25 mm, or not plastered): its band follows. Draw a free wall,
set its two sides' plaster: a band on each side. Drag a wall: the bands follow.

First hand test (2026-11-23, capture `state-2026-11-23T09-20-15-314Z.json`): works; three notes.
Reproduced headless and in core:

1. *A selected wall hid its plaster:* its stroke, 6 units centred on the face, covered 3 cm into
   the room. Decided, option A: selection strokes keep to the wall's side of the face (clipped
   outside the room, drawn twice as wide), the selected wall's and the selected room's outline;
   the room's outline is now drawn after the walls (`drawSelectedOutline`). This also replaces
   "plaster over the selected room's outline" above.
2. *A jog's leftover (W3.3) and a small blue segment.* W3.2 (x 0 to 3 at y 3, 35 mm) dragged
   0.752 down: the drag can't take its last 0.2 m (over Room 2's wall corner), which stayed as
   W3.3, a wall of its own with W3.2's copied plaster (`dividedFromWallId` W3.2). By F4 it is a
   cap (its material lies inside the walls round it), kept a wall only because its answers
   differ from W3's; F4′ (2026-11-13) left out thickness and height answers only. The blue
   segment: the cap from (2.8, 3) to (2.8, 3.2) had no plaster band (caps have no row), so the
   selected room's outline showed through. Decided: (b) in core, and plaster over caps (web).
3. *The label:* "plaster: 35 mm (int.) · 20 mm (ext.)" (agreed wording).

Fix round (to hand test):

- *Core, a drag's leftover is a cap (`derive/caps.js`).* A cap candidate whose subject goes on as
  another wall piece of the same result loses nothing as a cap (its answers and records stay with
  that piece), so its answers no longer keep it a wall. In a settled plan each piece has its own
  subject: this applies to the edit that leaves the stretch behind. Test in
  `building-plan-derived-cap-answers.test.js` (the capture's drag on the core example: W3.2 keeps
  its 35 mm, no other Bedroom row carries it, six rows), failing without the change. Core 712 of
  712. A capture saved before this keeps its W3.3 (by then a subject of its own): the drag has to
  be made again.
- *Web, plaster over caps (`draw/plaster-bands.js`).* A room side's band runs over its row's
  extent (core's `extentPoints`: the face up to the room's corner, over the caps next to it), so
  a cap shows its neighbour's plaster.
- *Web, selection strokes on the wall side* (`clipOutside`; the selected wall's stroke, the
  selected room's outline).
- *Web, the label* (`plasterLabel`): "plaster: 35 mm (int.) · 20 mm (ext.)", a free wall's "(this
  side)" and "(other side)", one face untagged ("plaster: 15 mm"), "none" for a face without it,
  "plaster: none" with none at all.

Tests: `building-plan-plaster.test.js` 7 (the wording; bands over a row's extent, failing without
it). Web 424 of 430 (the worker tests). Headless on the test page: floor defaults 15 and 20 mm,
W3.2 set to 35 mm in its entry, dragged 0.75 m down: the Bedroom's rows W1, W2, W3, W3.2, W4,
W8.1 (no W3.3), W3.2 keeps 35 mm; the jog's corner banded all round, caps included; W8.1 selected:
its stroke on the wall band, its 15 mm showing, "W8.1 · plaster: 15 mm"; W3.2 selected: "W3.2 ·
plaster: 35 mm (int.) · 20 mm (ext.)". No console errors.

Hand test, round 2 (restart the test page, core change; your capture keeps W3.3, so make the drag
again): set the Ground floor's plaster defaults; in the Bedroom's entry give W3.2 35 mm (its
entry), then drag it down about 0.75 m: no W3.3; the band runs round the jog, over the short
stretches by the corner (W3's 15 mm on the one at y 3). Select any wall: the blue lies on the wall
band, the plaster in the room stays visible; the room's outline too. The names read as agreed.

Second hand test (2026-11-23, capture `state-2026-11-23T09-57-13-507Z.json`): better; three
notes, traced headless and in core before any change:

1. *The room's outline beside a selected wall in a room entry:* not new. The canvas auto-selects
   a room when none is, so the entry's room is selected; before 2b its outline showed as a thin
   inner line (checked on a HEAD build), round 1's plaster hid it, option A made it 3 units on the
   wall side.
2. *Exterior plaster missing south of W3.3:* the return's band ends at y 3.2 over open ground; that
   end belongs to no side, and the web's rebuild gave outside plaster only to edges in line with
   an exterior face.
3. *W3.3 shifting right when W3 is dragged up:* caused by rule (b). With it the leftover is a cap,
   and caps don't follow their source's drag: core slid the return to x 3 (the room lost a 0.2 m
   strip). Without it the leftover row moves with W3 and the return stays. Plaster wrong while
   dragging: the web read values from the saved record only and matched them to the preview's
   walls by id.

Common cause: the web rebuilt which surface belongs to which side from rows, extents and
footprints; core already knows the sides with their resolved plaster (`side.properties`), the
caps and the footprints, for previews too. Decided (D1 to D5, 2026-11-23): D1, plaster surfaces
worked out in core (display only); D2, one rule for a stretch with no side of its own (in line
first, then the same wall, then any neighbour); D3, rule (b) reverted, leftovers a later core unit
(caps following their source's drag, then (b) again); D4, the selected room's outline only on the
plan page and a Floor canvas; D5, 2a-2 committed on its own (`1d6920b`). Asked meanwhile: whether
there is a cleaner approach; answer: make "surface" a core concept checked by invariants (each room
outline covered once, every surface owned) over every plan core has, later the F4 corpus.

Round 3 (to hand test):

- *Core (`plaster-surfaces.js`, new; `canvas-controller.js`).* `plasterSurfaces` in the canvas
  snapshot, previews included: the stretches of the walls' footprint edges with no wall material
  and no opening beyond (room sides, outside faces, free walls, caps, exposed ends), overlaps on one
  line kept once, each owned by the side whose face lies on it (the centreline, half the
  thickness over on the side's sign) or, by D2, by the stretch it continues; with the owner side's
  plaster (`buildingPlanSidePlaster`). Each wall row also carries `plaster` (its side's, and the
  face across where that is the row's: an outside face, a free wall's other side). Rule (b)
  reverted. Tests `building-plan-plaster-surfaces.test.js` (5: the example's invariants; after the
  down drag a cap continues the return in line and the leftover row keeps its own 35 mm; after
  down and up the return's exposed end takes an outside face; a free wall's two faces and ends; a
  preview's surfaces, covered as the plan). Core 716 of 716.
- *Web.* `draw/plaster-bands.js` draws core's surfaces (at least 2 px, to scale, an outside
  corner's square filled, faded by the owner wall's footprint level); `plaster-values.js` keeps the
  text (`formatThickness`, `plasterLabel` from the row's `plaster`); the fieldState reading and
  the web geometry are gone. D4: no selected room outline in a room's or an element's entry.
  Tests: `building-plan-plaster.test.js` (6, on core's surfaces). Web 422 of 429 (the worker tests
  and the numeric-setters flake).

Headless on the test page: floor defaults, W3.2 35 mm, dragged 0.75 down (W3.3 stays a row, W8.1
the return), back up to 2.05 (the return at 2.8), then W3 0.2 up: the leftover moves with W3, the
return stays at 2.8; every surface owned; the return's exposed end banded round its corner; no room
outline in the entry; W3 selected: "W3 · plaster: 15 mm". No console errors.

Hand test, round 3 (restart the test page, core change): as round 2, then drag W3.2 back up past
its old line and drag W3 up: the return doesn't move; the outside plaster runs round the return's
end. While dragging, the bands follow. In a room entry no blue room outline; on a Floor canvas a
selected room's outline on the wall side. A leftover row (W3.3 after the down drag) still shows its
own copied plaster: the later core unit.

Hand-tested 2026-11-23 (round 3): works. Committed: form0-react `1d6920b` (2a-2), `e431aef` (2b);
form0-core `a2f53e4` (plaster surfaces). Noted for later, not now (2026-11-23): run the surfaces'
invariants (every surface owned, each room outline covered once) over core's corpus of floors
from the F4 work; make surfaces part of the derive output once something besides the canvas
needs them (lengths to the finished face, a wall front view, quantities for Reform). The D2 rule
is display only, so the Reform derive docs (which list rules that shape the record) don't need
it. Asked at the hand test: a selected free wall's outline covers both faces' plaster. Decided
(2026-11-23): keep the whole body outlined (the row holds both sides, 4a-3c), drawn inside the
body like room walls' selection; in its own entry "This side" inside too. Built after the
commits, to hand test.

*A selected free wall inside its body (2026-11-23, hand-tested, committed).* `clipInside`
(`draw/plaster-bands.js`): the selected free wall's outline (`drawFreeWallOutline`, 8, so 4 shows)
and, in its own entry, its "This side" line (`px(8)`) are clipped to the wall's body, so the
plaster on both faces shows. `building-plan-selection-name.test.js` updated (the two widths).
Headless on the test page: a free wall across the Bedroom, selected: blue inside the body on both
faces, the sand outside; "W9 · plaster: 15 mm (this side) · 15 mm (other side)"; its entry the same
with "This side" under its face. Hand test (reload; web only): select a free wall, then open its
entry: the blue stays inside the body, both faces' plaster visible.

Hand-tested 2026-11-23: works. Committed: form0-react `8f50901`. Asked at the same test: a free
wall's free end showed "Other side" plaster (D2 continued its neighbouring face). Decided: no
plaster there for now; a free wall's free end stays without an owner (core `plaster-surfaces.js`;
the invariant excepts it). Committed: form0-core `1712721` (test in
`building-plan-plaster-surfaces.test.js`, failing without it; core 716 of 716).

### 2c: the room's lengths, S11 (2026-11-23, hand-tested, committed)

Aligned (2026-11-23), all as recommended. Checked headless first: the plan page and a Floor
canvas always have a selected room (the first at open; a click on empty ground clears it and the
canvas selects the first again), so "none selected, none" (S8) doesn't happen.

- **A**: which row covers which stretch of a side comes from core (rule: core owns the model
  facts the canvas needs), not rebuilt in the web.
- **B**: lengths follow the selected room as the canvas has it (they show at open on the plan
  page and a Floor canvas, with the tinted room).
- **C**: the status line names the unit after its hint ("· lengths in metres"), or "· zoom in to
  see the lengths" while S12 hides them; the Show hint says "to the bare wall face".
- **D**: the Lengths switch hides the room's lengths only; a drag's still show.
- **E**: a selected free wall or column adds nothing (their lengths show while dragging, 3c-4).

Three units, one hand test, a commit each:

- *Core, room sides (`room-sides.js`, `canvas-controller.js`).* Each room in the canvas snapshot
  has `sides`, previews included: corner to corner along its inside face (edges in line are one
  side, 3-L2), with `normal` into the room, `pieces` (each row's stretch by face id; a cap goes to
  the row it continues in line, of its own wall first; a side of caps alone to a row of the cap's
  wall) and `openings` (doors and windows standing in the side's rows, by their ends along it).
  Display only. Test `building-plan-room-sides.test.js` (6) as invariants (the sides cover the
  outline once and turn at each; each side's pieces cover it end to end once, each a row of the
  room; every row and every door or window on a side, each opening inside one piece) on the
  example, W3.2's drag down (W3's cap folded in: one 2.2 m piece), the 2b hand test's leftover row
  (a piece of its own) and down then up, a split side with two windows, a preview, a free wall, a
  room wrapping the other's corner and an L with a free step. Core 722 of 722.
- *Web, S11 (`draw/dimension-layout.js`, new; `draw/dimensions.js`).* `drawDimensions` draws a
  set of lengths: lines first, pills on top. A pill fits on its line's middle with its width and
  8 px to spare; otherwise it goes past an end on the line extended, 6 px clear (a spot inside the
  room first, then past the chain's outer end, an end no other length in line touches), skipping
  a spot another pill takes; else it steps 22 px further in with a leader. Pills avoid pills
  only. Drag lengths use it too (inside: the room in scope, else any room). Test
  `building-plan-dimension-layout.test.js` (7).
- *Web, the room's lengths (`room-lengths.js`, new; the canvas; the Show menu; the status line).*
  `roomLengths` from core's `sides`: each side 26 px into the room (as a drag's lengths, so they
  stay in place when a drag replaces them, S10); the selected wall row's side, or the selected door
  or window's (or an entry's own element), adds its chain (rows' stretches, openings, the gaps) at
  26 px and the whole side at 56 px. `roomTooSmall`: hidden under 100 px either way on screen
  (S12). The canvas: `planLengths` before the walls (a gesture's lengths, else the room's),
  `lengthsTarget` (the entry's room, else the selected room; the selected element, else the
  entry's focus), `drawLengths` at the end; the selected element's name stands past the lengths on
  its side (`nameReach`), a drag's too (seen headless: W3.2's name lay on a drag's 2.80 pill, as on
  HEAD). Status: `PlanStatus` takes a `noteKey` after the hint. Show: "Lengths" first, on by
  default ("Of the selected room, to the bare wall face"; in an entry "Of this room, …"). Texts in
  `plan-text.js`. Tests: `building-plan-room-lengths.test.js` (5, on a core plan),
  `building-plan-show-menu.test.jsx` (Lengths first, the note, off with the dot).

Web 436 of 442 (the worker tests). Headless on the test page (no console errors): the plan page
and a Floor canvas, the first room's four sides, "Double-click an element to open it · Shift-drag
pans · lengths in metres"; a Floor canvas selects rooms only, so sides only there. The Bedroom's
entry: four sides; W3.2 selected: the bottom side 0.50, 0.90, 0.60 (W3 and its door) and 3.00
(W3.2), 5.00 further in, the name past them; its wall entry the same. W3.2 dragged down: the
drag's lengths (3.82, 2.80, 0.82, 2.20) in place of the room's, the name past them; Esc: back.
Zoomed out to 25%: none, "· zoom in to see the lengths". Lengths off: none, no note, "some hidden"
on Show, Esc closes the menu only. The door selected: the same chain, "D#1" past it; slid to 3 cm
from the corner: "0.03" past the corner while dragging and at rest (no free spot inside the room,
so past the outer end, over the wall: as the mockup). Plaster 15 mm at 249%: the band at the face,
the lengths inside it.

Hand test (restart the test page, core change): `?form=plan`, View: the Bedroom's four lengths
on the plan page, the status line ends "· lengths in metres"; click the other room: its lengths.
Open the Ground floor: the same on its canvas. Double-click the Bedroom: its four sides; select
W3.2: its side's chain (0.50, 0.90, 0.60, 3.00) and 5.00 further in, the name past them; select
the door: the same chain, "D#1" past it; select W1: one length, the name past it. Drag W3.2 down:
the drag's lengths replace the room's, back after the drop. Slide the door close to the corner (a
few cm): the short length goes past the corner, at rest too. Zoom out until the room is small:
the lengths go, "zoom in to see the lengths". Show: "Lengths" first; off: gone (a drag's lengths
still show), the dot; on again. Double-click W3.2 (its entry): the chain. With plaster set,
zoom in: the lengths measure the bare face, the band inside them.

Hand-tested 2026-11-23: works. Committed form0-core `d26df06` (room sides), form0-react `28356e2`
(S11) and `39cec5c` (the room's lengths, Lengths in Show).

### A shared wall's own height (asked during the 2c hand test, 2026-11-23)

Reported: a height typed on a shared wall (W8.1 typed 5 m from the second Bedroom, the first one
at 3 m) applies at once, while a room's height that disagrees with the other room's asks which one
applies. Not a regression: core's rule since the shared model (`e5bf369`, 2026-11-03).
`resolveInheritedProperty` (`inheritance.js`) asks only while a wall inherits and its rooms'
values differ; a value typed on the wall is the wall's own and beats every default, as on a wall
one room has. Pinned by "conflicting room defaults require one shared wall resolution" (model
test); the question itself ends "you can still change it on the wall later". Replayed on the
user's capture through core with the wall entry's `set_property`: applied, no question; a room set
to 4 m while W8.1 inherits asks (about W3 first); W8.1 typed, then the room: W3 only, W8.1 keeps
its 5 m.

The gap: nothing tells that the wall is shared, so from one room's entry the edit's reach on the
other room's side is invisible. Decided (option 1): keep the rule and show that the wall is
shared. No issue for a wall taller than its room's height: that height is a default and can be
overridden. How to show it is to settle with a quick mockup (queued). Candidates: a line under the
wall entry's title naming the other room; a note on the fields both rooms share (height,
thickness, material) and not on a side's own (plaster, finish); the other room outlined on the
canvas while the wall is selected.

### U6: free walls and columns pulled to the floor below (2026-11-23, hand-tested, committed)

Aligned (2026-11-23), all as recommended: (1) a free wall's end goes onto a corner or a face
below; a moved free wall's side goes flush with a face below running with it (stacked on the wall
below); its ends line up with corners below. (2) A column: corners below rank with corners, faces
below as contacts, its centre over a column below's centre with the corners (its centre only,
whatever their sizes). (3) A ring on what a pull took below. (4) Placing at the room's centre
("select, then add") unchanged. (5) Core, one hand test.

Found headless and decided (option 1): the column's ring sat at its centre, under its 11 px grip
(never seen); the stacked wall's under its 14 px grip below about 160%. A pull that places the
whole element (a column over a column below, a wall stacked on a wall below) rings its grip, 4 px
outside it; the others keep the 5 px ring on the point they took.

- *Core (`floor-below-pulls.js`, new; `free-wall-snapping.js`, `column-snapping.js`,
  `interaction.js`).* `withFloorBelow` adds to the drag paths' targets the bands' corners (where
  the element may stand: inside the room, for a column its region), their edges and, to line up
  with, every corner below; for a column, the centres of the columns below. Each is marked
  `below` and comes after this floor's, so a tie goes to this floor. A face below running with a
  moved free wall's run takes its side, not its centreline's end (else a wall over a wall below
  lands half off it): `flushWithFacesBelow`. An end held inside the room drops a ring it took
  outside. Rings: `belowRing(point, grip)`, the grip named for a whole-element pull; `getGuides`
  passes `grip` on. Also from this: a column placed with the column tool (at the pointer, through
  the drag's pulls) and a free wall's split point (pulled as an end) pull to the floor below;
  columns line up with corners below too (as rooms, F3). `free-wall-snapping.js` past 300 lines:
  its outline helpers moved unchanged to `free-wall-outline.js`. Test
  `building-plan-floor-below-contents.test.js` (4: an end onto a corner, a face, lined up, Alt and
  the switch off; a wall stacked, not its centreline on a face; a column over the column below; a
  column's side flush, a corner into a corner), each failing on HEAD's snapping; the stacked test
  fails without the run rule. Core 726 of 726.
- *Web (`draw/guides.js`, new; the canvas).* The guides' drawing moved out of the legacy canvas
  (`drawGuides`); `ringRadius`: the named grip's radius and 4 px, else 5 px. `WALL_GRIP_RADIUS`
  moved to `draw/handles.js`. Test `building-plan-guides.test.js` (2). Web 438 of 444 (the
  worker tests).

Headless on the test page (`?state=state-u6-check.json`: the example's ground floor with a 0.4 m
column in the Bedroom, an upper floor at 3 m with one room over all of it, free wall W5 and column
C#1 in it; no console errors): W5 dragged up onto the shared wall below stacks on it (its
centreline on the band's middle, both sides flush), a ring around its grip; dropped there. C#1
dragged near the column below lands centre on centre, a ring around its grip.

Asked at the hand test (capture `state-2026-11-23T17-05-35-472Z.json`): W5 stacks on the wall
below except near the W3.2 / W8 junction, where it went above or below. Replayed in core on the
capture: zoomed out (60%), a corner of the band took the wall's centreline end (corners ranked
first), so the wall lay on the band's face, half off it; the door's jamb the same; zoomed in
(150%), the junction's face crossing the wall took its end alone (one pull at a time), losing the
stack. Fixed in core: a moved free wall takes the floor below as one move (`belowMove`): across
onto the wall below (stacked, or a side flush), then along to a face crossing an end (within that
face), together; corners below no longer take a moved wall (where a running face meets a crossing
one is a corner); nearest wins against this floor's pulls by how far each moves the wall, a tie to
this floor. On the capture, both zooms: stacked at 3.10, its end on the junction's face (3.00) or
the jamb (3.60). Test: "a wall stacked near a junction below …" (zoom 3 and 7.5, the grip ring at
its new middle, a small ring where its end meets the face). Core 727 of 727. Headless on the
capture: W5 dragged near the junction stacks with its end on the junction's face, dropped there.
The small ring at its end lies under the end's handle (as a room corner's on a corner below, F3).
Drawing an end is unchanged: its centreline goes onto a corner or face below.

Hand test (restart the test page, core change): `?form=plan&state=state-u6-check.json` (in the
harness's `captured`), View, the upper floor, double-click its room. Drag W5 onto the shared wall
below: it stacks, a ring around its grip; nearer a face only: its side flush. Drag an end of W5
near a corner below and along a face below: a small ring there. Drag W5 along the wall below to the junction and to the door's jamb: it keeps the stack, its end
on the face there. Drag C#1 over the column below:
centre on centre, a ring around its grip; a side near a wall band below: flush, a small ring.
Alt: no pull. Show, Floor below off: no pull to it.

Hand-tested 2026-11-23 after the junction fix: works. Committed form0-core `08b7240` (the pulls,
the one move, `free-wall-outline.js`), form0-react `21d2a4a` (rings around the grip,
`draw/guides.js`). Queued from it: a drawn free wall stacking on the wall below (its ends pulled
to the walls below's midlines).

### A shared wall shown as shared (2026-11-23, hand-tested, committed)

Decided with a mockup (https://claude.ai/artifact/4ymJbXaosL8ZRSGf2tp17N): A, a neutral icon in
the tag (the split square), and C, the tag's words. B (amber when the wall's own value differs from
what the other room gives) left out: a room's height is a default a wall may override. Found while
checking today's UI: W1, which only the Bedroom has, said "Shared physical wall" too.

- *Core (`shared-value-question.js`, `transactions.js`).* A whole-wall field's state names the
  other rooms the wall stands between (`sharedWith: [{ roomId, name }]`), named as the shared-value
  question names them (a room's position added when two of the wall's rooms share a name:
  "Bedroom (room 2)"); none for a side's field, a free wall or a wall one room has; a physical
  wall's own row (no room of its own) lists every room when there are two or more. Test
  `building-plan-shared-wall-fields.test.js` (2). Core 729 of 729.
- *Web (`field-tag.js`, new, the tag moved out of `form-renderer.jsx`; `plan-field-tag.jsx`,
  new; `field-renderer.jsx`, `form-renderer.jsx` wiring).* A whole-wall field says "Whole wall",
  or "Shared wall" on a wall other rooms share; then its tag is a button (the icon, tinted) that
  opens a note: "Shared with Bedroom (room 2)" and "This wall stands between both rooms, so a value
  set here applies to Bedroom (room 2) too." (several rooms: "these rooms", listed). The note
  doesn't name the field (it opens beside it; no label to lower-case for another language). A
  click, a tap, Enter or Space opens it; a click elsewhere or Esc closes it, Esc going no further
  (the dialog stays open, as Show's menu). Texts in `plan-text.js`. Test
  `building-plan-field-tag.test.jsx` (4). Web 442 of 448 (the worker tests).
- *Mobile (`form0-react-native`, `form-renderer.jsx`).* The same words ("Whole wall", "Shared
  wall"); the note comes with step 5. Its jsdom fixtures: 62 of 63; "Native titles a room screen
  with its position on the floor" fails ("Rooms 2" not found), on HEAD's renderer too (not traced).

Headless on the test page (no console errors): W3's entry from the Bedroom: Height, Thickness and
Construction material "Shared wall" buttons, Plaster, Finish and Observed thickness "Room side"; a
click: the note naming Bedroom (room 2); Esc: the note closes, the entry stays. W1's entry: "Whole
wall", plain.

Hand-tested 2026-11-23: works. Committed form0-core `2c6b3c8`, form0-react `b005511`,
form0-react-native `6166420`.

Hand test (restart the test page, core change): `?form=plan`, View, Ground floor, double-click the
Bedroom, double-click W3 (not on its door): Height, Thickness and Construction material say
"Shared wall" with the icon; click one: the note names Bedroom (room 2); click elsewhere or Esc:
it closes, the entry stays; Tab to it, Enter: it opens. Plaster says "Room side". Cancel, open
W1: "Whole wall", no icon. From the other Bedroom, W3 names Bedroom (room 1).

### A drawn free wall stacking on the wall below (2026-11-23, hand-tested, committed)

Aligned 1 to 5 as recommended: (1) core gives the floor below's walls' midlines and where they
meet, checked by invariants; (2) a drawn end: midlines below join the lines, their meeting points
the corners, the nearest winning within each, a tie to this floor, a small ring; (3) the second end
keeps to a straight midline by today's lock, a slanted one pulls it as any line; (4) a moved free
wall may go centred on a midline running with it as well as flush with a face; (5) columns
unchanged.

Core only (`floor-below.js`, `column-wall-targets.js`, `floor-below-pulls.js`, `interaction.js`):
the snapshot's `floorBelow` gains `midlines` (its walls' axes, from their segments) and
`junctions` (`midlineJunctions`, the finder this floor's column targets used, now shared: crossings
within 0.5 m past either end). `withFloorBelow(…, { midlines: true })` for a free wall's pulls
(drawn, dragged, bent): midlines marked `mid`, junctions inside the room. `belowMove` across: a
side flush with a face, or the centreline on a midline (`acrossOntoWallsBelow`), the nearer; a
moved wall's end meets faces only. Tests: `building-plan-floor-below.test.js` (midlines halfway
between their band's faces wherever they cross it, each junction on two midlines; again with W3
thickened to 0.3 m, its midline at 3.15), `building-plan-floor-below-contents.test.js` (+2: a drawn
end onto the W3.2 / W8 junction and onto the shared wall's midline, the next end kept on it; a 0.1 m
wall moved centred at 0.3 off, flush at 0.2 off its face), each failing on HEAD. Core 732 of 732,
web 442 of 448 (the worker tests; no web change). Headless on the test page
(`state-u6-check.json`, the upper floor's room, Wall): pressed 3 cm off where the shared wall's
midline meets Room 2's wall's and drawn along it: the wall from (2.90, 3.10) to (1.49, 3.10), on
the wall below's middle.

Hand-tested 2026-11-23: works. Committed form0-core `f872899`.

Hand test (restart the test page, core change): `?form=plan&state=state-u6-check.json`, View, the
upper floor, double-click its room, Wall: start near where the shared wall below meets Room 2's
wall (a ring there), draw along the shared wall: it stays on its middle. Start near the middle of
a wall below, away from corners: it starts on the middle. Set W5's thickness to 0.1 m, move it onto
the shared wall below: centred near the middle, flush near a face.

### 3a: room beams (2026-11-23)

**Today (checked headless on the test page, derived engine, the Bedroom's entry).** Drawing
(Beam: press, drag, release) held each end in the room's bounding box, then put it on a room
face only within about 6 px (the code named 14 px; the wall finder stops at 6): no level or plumb
lock, no 1 cm step, no pulls to corners, columns, free walls or beams, no guides, no lengths. A
beam drawn or moved past a wall stopped with its centreline on the face, half its width over the
wall; moved, each end was held in the box on its own. A wall moved out left a beam's end behind
(no following); moved back past it, the drag stopped there with core's generic "Keep structural
elements inside their room with positive, finite dimensions." (`invalid_room_element`, the
shared model check, end points only) and the drop was refused. `beam_wall_segment_index` was -1
even face to face.

**Decided (2026-11-23), as recommended; B9 set aside.**

- *B1, rule 1*: a beam's centreline and body stay inside its room's outline, touching allowed,
  its ends cut along the face they stop on (the free wall rule, `freeWallFits`); beams over a wall
  are the wall beams round.
- *B2, snapping*: the free wall pulls as they are (the level and plumb lock, corners and ends,
  lines, lining up, the 1 cm step; a whole beam keeps its direction, pulled by its ends; never out
  of the room; Alt: the step and the room). Targets: the room's corners and faces, free walls'
  corners, ends, sides and centrelines, columns' corners, sides and centres, other beams' corners,
  ends, sides and centrelines; lining up with corners and ends anywhere on the floor. Pushed
  against a parallel face, a beam stops flush. Free walls and columns don't snap to beams (revised
  at the hand test, below); nothing of the floor below.
- *B3, following (option b)*: a beam's end on a room face, a free wall (side or centreline) or
  another beam (side or centreline) follows it, as 4b's D1 to D4 (transitively, as free walls); a
  beam lying flush along a face moves with it, and keeps that side when its width is typed larger;
  too short or turned back, refused ("Beam B#1 would be too short."). A beam resting on a column
  snaps to it but doesn't follow it (a point anchor; free walls don't follow columns either).
- *B4, the refusal named*: as columns at 4a-1, beams leave the shared model check and the
  derived engine checks them (`beam_outside_room`, "Beam B#1 would leave its room."); today's
  engine then has no beam rule (it retires at 4f-2).
- *B5, placing*: press, drag, release, as today; a drawing starts in a room; its first end is
  pulled too; at least 5 cm.
- *B6, drawing*: core gives each beam's outline (ends cut) in the snapshot, display only, checked
  by invariants; the web draws it dashed.
- *B7, lengths while dragging*: a beam's length beside it while drawn or an end dragged; its
  clearances while moved (3c-4's helpers).
- *B8, stored values*: only the start and end u/v, `beam_length` and the legacy wall fields of
  beams drawn, moved or followed change, with their meaning: both ends on one segment of a room
  wall's face give it and their ratios, else -1, 0, 1 (the web computes them, as
  `columnWallValues`; core doesn't rewrite them when a beam follows). No new fields.
- *B9 (set aside)*: moving the content snapping wrappers out of core's `interaction.js` (503
  lines).

Units: hand test A, 3a-1 (snapping) and 3a-2 (lengths); hand test B, 3a-3 (rule 1 named, the
outline in the snapshot) and 3a-4 (following).

**3a-1: snapping (hand-tested 2026-11-23, committed).**

- *Core (`beam-targets.js`, new; `interaction.js`, `free-wall-hold.js`,
  `free-wall-snapping.js`).* `beamTargets`: the free wall targets plus free walls' centrelines,
  columns' centres and the other beams in the room (corners, ends, sides, centrelines), other
  beams' ends to line up with; the beam itself left out. `snapBeamEnd` and `snapBeamTranslation`
  share the free wall path (`pull`). Found while testing: a 25 cm beam pushed against a parallel
  face stopped 5 mm off it, since the hold puts the centreline back on the 1 cm step and 12.5 cm
  isn't on it; that gap would also break "lying along a face" for B3. `holdFreeWallMove` takes
  `flush` (beams only): no step back across what stopped it, the side settled exactly on the face
  (`sideOntoFace`). Free walls are unchanged; they have the same gap when their half thickness is
  off the step (a 15 cm wall) or a face is off the centimetre grid. Test
  `building-plan-beam-snapping.test.js` (5: targets; drawing, past the room, whole centimetres;
  onto a column's centre, a beam's side and centreline, a free wall's centreline; a whole beam
  onto a face, flush when pushed into one, not laid flat when only near; Alt), failing with HEAD's
  `interaction.js`, and its flush case with HEAD's hold. Core 737 of 737.
- *Web (`beam-placement.js`, new; the legacy canvas).* Drawing, end drags and moves go through
  core (with an older core, as before); `beamPreview` (the ends as fractions of the room's box),
  `beamWallValues` (the legacy fields). `computeBeamPreview` moved out of the canvas. A click that
  wobbles under 3 px doesn't move a beam. The beam being drawn shows its outline at its width (it
  was a line as wide as its 40 cm depth). Test `building-plan-beam-placement.test.js` (4), failing
  with HEAD's canvas.

**3a-2: lengths while drawing and dragging (hand-tested 2026-11-23, committed).**
`beamDragLengths` (in `beam-placement.js`, from the canvas's `contentDragLengths`): drawn, or an
end dragged, its length beside it, half its width and 12 px clear; moved whole, its clearances
along its own axes to the room's inside face, none for a side on a wall. Test
`building-plan-beam-lengths.test.js` (2). Web 448 of 454 (the worker tests).

Headless on the test page (no console errors): drawn from 5 cm off one face to 6 cm off the other,
6 cm off level: locked level, 0 to 5.00, a guide along it, 5.00 while drawing; near nothing:
whole centimetres (1.50 to 3.31); past the wall: stopped on the face; pushed into the top face:
flush (centreline 0.125), its clearance along (1.53); an end dragged near a column: onto its
centre (4.00, 2.00).

Hand test: in the Bedroom's entry, draw with Beam near both faces slightly off level (locked, on
the faces, its length, a 25 cm outline); in the middle (whole centimetres); past the wall (stops
on the face); onto a column's centre, a beam's side or middle, a free wall's side or middle.
Select: drag an end (the same pulls, its length); the whole beam (an end onto a face or corner,
lining up; pushed into a parallel wall, flush; its clearances). Alt: no pulls, whole centimetres,
inside. A click doesn't move a beam.

Hand-tested 2026-11-23: works. Committed form0-core `fd51278`, form0-react `90cb160` (3a-1) and
`d5b8c8b` (3a-2). Raised at the hand test:

1. A column moved doesn't snap to a beam's ends or its centreline (B2 had columns not snapping
   to beams; revised).
2. A beam is drawn under columns (beams are drawn first, so a column's fill hides the beam's
   dashed outline). Not decided before.
3. A new beam's size: 15 cm instead of 25 cm.
4. A beam's name stands far from it, most of all on a level beam: it sits its depth (40 cm) and
   6 px above its centre, whatever its direction.

**After the 3a-1 hand test (2026-11-23, hand-tested, committed).** Decided: 1 and 2 as
recommended, 3 width 15 cm and depth 30 cm, 4 option (a).

- *Columns snap under beams (core, `column-targets.js`, `column-snapping.js`).* A column's
  centre goes under a beam's end in its room (ranked with corners, as where wall midlines meet)
  and onto a level or plumb beam's centreline (with the wall midlines); a slanted beam pulls with
  its ends only. "Add column" takes the same targets, so a column added near a beam lands under
  it. A column doesn't follow a beam (as a beam doesn't follow a column, B3). Test: a case in
  `building-plan-column-snapping.test.js`, failing on HEAD. Core 738 of 738.
- *Beams over columns (web).* Beams are drawn after columns (a beam is overhead; a column's fill
  hid its outline). The selected beam's end handles take a press and the hover before a column, so
  an end resting on a column's centre can be dragged off it (on HEAD the column took it; an
  unselected beam's end still leaves the column to grab). Test
  `building-plan-beam-columns.test.js`, failing on HEAD.
- *A new beam is 15 cm wide and 30 cm deep (web)*, in the canvas and the legacy controller's
  fallback path (25 by 40 cm before). Core's schema has no default. Test
  `building-plan-beam-defaults.test.js`.
- *A beam's name beside it (web, `nameAboveLine` in `draw/selection-name.js`).* As a selected
  wall's name: half its width and 6 px off its side, above a level beam or left of a plumb one
  (where its length shows while drawn), the other side when that is outside its room; selected,
  past a gesture's lengths. Tests: two cases in `building-plan-selection-name.test.js`. Web 452 of
  458 (the worker tests).

Headless (no console errors): a new beam 0.15 m wide, its name 6 px above its side; a column
dragged near the beam's end under it (3.00, 1.50), near its middle onto its centreline (1.50,
1.50); the beam selected, its end over the column dragged to 3.52, the column staying.

Hand-tested 2026-11-23: works. Committed form0-core `2e34e49`, form0-react `2adb54e` (beams over
columns), `f2cba7e` (15 by 30 cm), `5991306` (the name). For 3a-3, asked at this hand test: a
refused beam's outline mark as wide as the beam (`refusal-marks.js` uses its depth); and a room
wall dragged in past a beam's end is refused with core's generic "Keep structural elements inside
their room…" (as checked before 3a): 3a-3 names the beam, 3a-4 lets a beam touching the wall
follow it.

**3a-3 and 3a-4: a beam stays in its room, and follows what it touches (2026-11-23,
hand-tested, committed).** One hand test, as planned (3a-3 alone would only have named the
refusal raised at the 3a-1 hand test; 3a-4 lets a beam touching the dragged wall follow it).

- *3a-3, core (`beam-body.js`, `beam-contents.js`, new; `model.js`, `derived-edit.js`,
  `canvas-controller.js`, the exports).* `beamOutline` (a band of the beam's width, its ends cut
  along the faces they stop on, `cutBand` and `outlineCuts`) and `beamFits` (the free wall rule).
  `beamPlacementIssues`: an edit taking a beam out of its room is refused, named ("Beam B#1 would
  leave its room.", `beam_outside_room`, subject `beams`). Chosen while building: a beam already
  out before the edit doesn't refuse it, since records drawn before 3a may have half a beam over a
  wall and would refuse every edit on the floor (columns don't have this exception). Beams leave
  the shared model check, as columns at 4a-1: such a record still reads; today's engine has no beam
  rule. The snapshot's beams carry `outline`; `buildingPlanBeamOutline` is exported for outlines
  while a beam moves. Test `building-plan-beam-contents.test.js` (4: outlines as invariants on
  accepted plans, face to face, slanted onto two faces, flush along a face, in a corner, and after
  a wall moved; drawn out or half over a wall; a wall moved in past a beam clear of it, a width
  typed out; an old record out of its room reads and refuses no unrelated edit), failing with
  HEAD's files except the last (a guard).
- *3a-3, web (`beam-placement.js`, `draw/symbols.js`, `draw/refusal-marks.js`, the canvas).*
  `beamOutlineAt`: the snapshot's outline at rest, core's function while a beam is drawn or
  dragged, a plain band while its room moves or with an older core; `drawBeamSymbol` takes it. A
  refused beam's mark is as wide as the beam, 4 px clear (it used its depth). Test
  `building-plan-beam-outline.test.js` (2), the mark failing with HEAD's `refusal-marks.js`.
- *3a-4, core (`derive/beam-contacts.js`, `derive/follow-beams.js`, new; `follow-attached.js`,
  `attached-contacts.js` exports, `derived-edit.js`, `beam-contents.js`).* A beam's contacts, read
  before the edit: an end on a room face, a free wall's side or centreline, another beam's side or
  centreline; lying along a face, a free wall's side or another beam's side. `followAttached` runs
  beam followers with the others (4b's `place`; another beam's lines as an anchor), so a beam on a
  beam that follows follows too; a beam lying along a face keeps that side at its width now.
  `beam_too_short` ("Beam B#1 would be too short."). A beam resting on a column doesn't follow it.
  Test `building-plan-beam-follow.test.js` (6), failing with HEAD's `follow-attached.js` and
  `derived-edit.js` except the last (what doesn't follow, a guard). One 3a-3 case changed with it:
  a beam widened to 20 cm 10 cm off a face lies flush and then keeps that side, so the refused
  width is now tried from 18 cm. Core 748 of 748, web 454 of 460 (the worker tests).

Headless on the test page (no console errors): a slanted beam onto two faces, its outline cut
along both; W2 dragged out 50 cm, the beam ending on it followed to 5.50, one touching nothing
stayed; dragged in past that one: stopped at 4.50, "Beam B#3 would leave its room.", the mark at
the beam's width, the drop refused; in to 4.70: applied, the first beam followed.

Hand test: face to face, W2 out and in (follows; past its other end, too short); a beam touching
nothing, W2 in past it (refused, named, the mark at its width); slanted onto two faces (cut ends;
W2 out keeps its height; the corner keeps its fraction); flush along the top wall (moves with it;
300 mm wide grows into the room); a beam on that beam's side (follows); on a free wall (follows
it); on a column flush with W2 (the column follows, the beam doesn't); `engine=current`: nothing
follows.

Hand-tested 2026-11-23: works. Committed form0-core `13dd96d` (3a-3), `8c1e312` (3a-4),
form0-react `d9d51af` (3a-3). 3a done; next, wall beams (open question 1, a core design round).

### Wall beams (2026-11-24)

**Today (checked in node on the derived engine, and headless on the test page).**

- Exported records write an empty collection as `[]`, not left out: every physical wall carries
  `doors: []` and `windows: []`, every room `beams: []`. A room's copies of its doors and windows
  (`face_doors`, `face_windows`) are left out of stored records by design
  (`getBuildingPlanProjectionNames`): an opening is stored once, under its physical wall. So
  `wall_beams` will show as `[]` on every physical wall (additive).
- `door_offset` counts along the wall from its start, the left end seen from the reference room.
  On the test page the shared door's entry showed "Distance from wall start" 0.5 from both rooms,
  while Room 2's own lengths along W3 read 0.60 | 0.90 | 0.50 from its left end.
- Openings through edits: a moved wall keeps them in place; Split across one: refused
  (`opening_crosses_cut`); a room moved so the shared stretch cuts one: asks, confirmed removes
  it; Room 2 moved away or removed: the door stays on the Bedroom's wall; Room 1 removed: it
  stays, its offset rewritten for the turned wall.
- Bug: a Split before an opening then Rejoin moved it by the cut's distance (the shared door
  30 cm; a window 2 m along W1 to 1 m); today's engine kept it. Fixed by unit 0 below.
- The legacy room beam fields: a beam dragged flush along W1 (centreline 7.5 cm off the face) was
  stored with `beam_wall_segment_index` -1, ratios 0 and 1; since 3a no beam's centreline comes
  within the 1 mm reach of a face, and the index never named a wall. Nothing reads them (core,
  web, Reform repos).
- Data names are unique across a form (only generated copies repeat): wall beam fields need their
  own names. "Elevation" already means story elevation (`room_elevation`).
- A room beam added from the Beams list gets 25 × 40 cm from core (`editor.js`), the canvas 15 ×
  30 since 3a (read from code; to confirm with unit 1's test).

**Decided (2026-11-24).** Mockup for WB10: https://claude.ai/artifact/VTrTopfPtKR3GivVhnWq4S

- *WB1, home*: children of the physical wall, like doors and windows (`wall_beams`), stored once,
  a copy in each room's wall entry (the twin row on a shared wall comes with it).
- *WB2, how core carries them*: in `subject.openings` (about 18 derive files carry it), so every
  edit carries them as doors; places where an opening is a hole (wall material, caps, plaster,
  column clearance, opening snapping) skip them; an invariant test (every beam survives every
  accepted edit, in place). No rename. Derived engine only; `engine=current` needn't work (the
  switch is soon).
- *WB3, which end*: each room's copy counts from that room's own left end, for doors, windows and
  wall beams; stored values and exported records don't change. Unit 3 below (openings).
- *WB4 and WB5, P2*: the height is the truth: one stored field, the underside from the floor
  (`wall_beam_distance_from_floor`, "Underside from floor (m)"; room beams get
  `beam_distance_from_floor`, required, filled by core at creation); no position field, no opening
  reference, only the wall reference. Core fills the height once when a beam is added (from a
  wall's list: the top of the wall, wall height − depth) and keeps a beam touching what it rests
  on or under in step (top flush with the wall's top follows the wall's height; underside on an
  opening's head follows that head); an edit that would make an opening run into a beam, or a
  beam stand above its wall, is refused, named. Other fields: identifier (B#n, one numbering per
  floor with room beams), offset (≥ 0, default 0), length (editable, offset + length ≤ the wall,
  default the rest of the wall), width (default the wall's thickness, centred on its axis), depth
  (default 30 cm), a hidden wall reference.
- *WB6*: a beam doesn't follow an opening along the wall; the person adjusts it (an opening moved
  under a beam lower than its head is refused, named). Heights still follow by contact (P2),
  confirmed.
- *WB7*: when the opening a beam rests on goes, the beam stays where it is.
- *WB8, its wall changes*: moved: keeps its offset; shorter or longer: an end at the wall's end
  follows it, a beam that no longer fits is refused, named; removed with its room: goes with the
  wall; a room moved away: stays on the wall that stays; Rejoin: moves to the surviving wall;
  Split across a beam: refused, named, as doors (dividing it later if the hand test finds it in
  the way). Revised 2026-11-24 (2c): a Split that crosses no door or window divides the wall and
  every beam across it.
- *WB9*: the legacy room beam fields move to the plan system fields review (queue 5), with the
  new wall beam fields and Reform's doc's different names (`beam_cross_section_width_m` …).
- *WB10, the canvas*: no drawing tool or drag in the plan; beams are added and edited in the wall's
  entry (Walls › W1 › Beams). Read-only in the plan, how they show to choose from the mockup (D1
  over the wall, D2 lanes inside the face, D3 only on focus; names at rest; a Beams switch in
  Show).
- *Role*: wall beams only, a custom field left to authors and included in the starter
  (form0-cli's templates, the web and mobile templates' `building-condition-survey`, Reform's
  doc): a SingleChoiceField "Role" (Ring beam, Lintel beam, Sill beam; Other allowed), the beam's
  own answer, stored once and the same from both rooms, as a door's fields. Its own unit after
  unit 1.
- *Defaults*: core's list-added room beam becomes 15 × 30 cm, as the canvas (unit 1).
- Open: the front view of a wall, how it would be reached (A a Plan | Front switch in entries
  about a wall, B both at once, C a shortcut from any plan canvas) added to the mockup.

Units (one hand test each; core first): **0** openings keep their place across Split and Rejoin;
**1** the `wall_beams` collection and its copies, the fields, the room beam's height field,
defaults when added from a list; **2** carried by every edit, the fit rule and refusals, contact
following for heights, the snapshot for drawing, the invariant test; **3** per-room offsets (WB3);
**4** web, after the mockup: drawn read-only, highlighted with its lengths when its entry is open;
then the role starter field. 0 and 3 share one hand test (both about today's openings).

**Unit 0: openings keep their place across Split and Rejoin (core, hand-tested, committed).**
`joinEdges` (`derive/cut-edges.js`) moves the second edge's rows onto the first, their stations
shifted by its length; the openings anchored to those rows count from their row's edge start and
weren't shifted. They are now. Test: a case in `building-plan-derived-cut-commands.test.js` (the
shared door split 0.3 m before it, a window split 1 m before it; each in place after Split and
after Rejoin), failing on HEAD (the door at 3.9..4.8). Headless on the test page: W3 split at x =
4.78, the door 3.6..4.5 after the Split and after the Rejoin.

**Unit 3: each room's copy counts from its own left end (WB3; core, hand-tested, committed).**
`opening-sides.js` (new): a room on its segment's side -1 sees the segment run right to left, so
its copy shows `length - offset - width`; `storedOpeningEdit` converts a typed distance back (a
width typed alone keeps that room's distance: the opening grows to its right as that room sees
it). Wiring: `records.js` (`refreshBuildingPlanProjections` writes the copy's value; a reversed
copy's offset leaves the links to the stored row, so the record evaluator's mirror refresh
doesn't overwrite it), `transactions.js` (an edit from a room's copy). Test
`building-plan-opening-sides.test.js` (4: the copies 0.5 and 0.6 with the stored row unchanged; a
distance typed in Room 2 and in the Bedroom; a width typed in each; the links and a full
evaluation keeping 0.6), failing with HEAD's `records.js` and `transactions.js`. Core 753 of 753.
Headless on the test page: the Bedroom's door entry 0.5, Room 2's 0.6; 1 typed in Room 2's and
saved: stored 0.1, Room 2's lengths 1.00 | 0.90 | 0.10, its entry reopened 1.

Hand test (units 0 and 3; restart the test page for the core changes): in Room 2's entry,
double-click the shared door: Distance from wall start 0.6 (the Bedroom's: 0.5); type 1, Save: the
door moves to 1.00 from Room 2's left end, the Bedroom's entry shows 0.1; type a width in Room 2's
entry: the door grows to the right as Room 2 sees it. In the Bedroom's entry, Split W3 between the
right corner and the door, then Rejoin there: the door stays. A window on W1: Split before it,
Rejoin: it stays.

Hand-tested 2026-11-24: works. Committed form0-core `6621a77` (unit 0), `8a790c1` (unit 3).
Raised: the Split tool's distance box acts on the wall under the pointer and each hover rewrites
it, so a distance can't really be typed, though the status line offers it ("…or type a distance
from its 0 end"); to rework with lengths editable from the canvas (step 4, queue 4).

**After the units 0 and 3 hand test (2026-11-24).** Mockup picks: D1 (beams drawn over their
wall's band, the one whose entry is open on top in the accent colour); the front view built,
read-only first, reached by A (a Plan | Front switch in entries about a wall), after unit 2.
Still to choose: beam names at rest, a Beams switch in Show. Unit 1 also takes "carried by every
edit" (from unit 2): stored beams that an edit didn't carry would be lost.

**Unit 1: wall beams stored, added from a wall's list, carried by every edit (core,
hand-tested, committed).**

- *Schema.* `building-plan-wall-beams.js` (new): the `wall_beams` node (a child of Wall, "Beams",
  in the blueprint so authors can add fields to it) with `wall_beam_identifier`, `_offset`,
  `_length`, `_distance_from_floor` ("Underside from floor"), `_width`, `_depth` (mm on screen),
  `_wall_reference` (hidden); room beams gain `beam_distance_from_floor`. The contract puts
  `wall_beams` under the physical wall and a `face_beams` copy in each room's wall row; the
  measures and the fr/it/es texts.
- *Model and record.* Walls hold `beams`; `wall_beam_outside_wall` when one doesn't fit its wall
  (beams may lie over openings and each other). `wall-beam-records.js` (new) reads and writes a
  beam row; `wall-children.js` (new) is the one table of what a wall carries (doors, windows,
  beams: collection, copy, list, offset and span fields), used by `records.js` (copies with each
  room's own left end, WB3; links), `transactions.js` (an edit in a beam's row), `editor.js` and
  the opening operations.
- *Operations.* `create_opening` with `kind: 'beam'`, `update_opening`, `remove_opening`; the
  confirm-removal flow and partial cuts know beams ("This edit cuts through B#1"). Added from a
  wall's list (`beam-defaults.js`, new): the stretch of the wall that room faces, as wide as the
  wall, 30 cm deep, its top at the wall's top. A room beam added from its list: 15 by 30 cm; any
  new room beam's underside at the room's clear height minus its depth. Room and wall beams share
  B#n per floor.
- *Derived engine.* `derive/along-wall.js` (new): beams ride `subject.openings` with their length
  as their span (WB2); `extract-subjects.js` and `stored-walls.js` convert; material and caps
  read the stored doors and windows, so beams aren't holes.
- Not yet (unit 2): Split across a beam is refused with the doors' wording; a wall shortened under
  a beam is refused as "does not fit" unnamed; ends at a wall's end don't follow it; heights don't
  follow by contact; nothing drawn.
- Found: a derived write-back stores an opening's offset with float noise (a typed 0.3 stored as
  0.2999999999999998; the form shows 0.3, core's presentation rounds to 14 digits); exported
  records carry it. Pre-existing for doors and windows; noted, not changed.

Test `building-plan-wall-beams.test.js` (7: the schema and a custom field on wall beams; `[]` on
every physical wall in the exported record; added from Room 2's W3 entry with its defaults; a
room beam's underside and 15 by 30 cm from its list, numbering shared; carried in place through a
wall moved, Split and Rejoin, Room 2 removed, Split across refused; each room's copy, a distance
and a length typed in Room 2's; a beam that doesn't fit, refused), all failing with HEAD's
files. Core 760 of 760 and the plain test scripts; web 454 of 460 (the worker tests).

Headless on the test page: the Bedroom's W3 entry has Beams; Add: B#1, distance 0, length 2,
underside 2.7, width 200 mm, depth 300 mm; 0.2 and 1.5 typed and saved: stored 0.2 and 1.5, Room
2's copy 0.3 in the live record (not reopened from Room 2's entry: the driver reloads the page
between rooms).

Hand test (unit 1; restart the test page): in the Bedroom's entry, double-click W3 between the
right corner and the door, Beams, Add: the defaults above; type 0.2 and 1.5, Save up to the
floor; Room 2's W3 entry, Beams: B#1 at 0.3; type 0.5 there and Save: the Bedroom's copy shows 0.
Then on the canvas: drag W3, Split W3 between the beam's end and the corner of the W3 stretch
and Rejoin, remove Room 2: the beam stays, its distances unchanged. A length longer than the
wall: refused. A room beam drawn with the Beam tool: Underside from floor 2.7; one added from the
room's Beams list: 150 by 300 mm, the next B#.

Hand-tested 2026-11-24: works. Committed form0-core `4fbfd03`. Raised: a distance typed while the
beam still spans the whole wall showed "The beam does not fit on its wall…" above the form, not
on the canvas as other refusals; a Split between the door's left edge and W3's end said "This cut
crosses a door or window" (replayed on the capture: it crossed the beam, which isn't drawn yet).
Decided: round the float noise though it changes stored door values (plans aren't published);
wall beams' names at rest as columns' and room beams' (a badge at rest, accent when selected;
walls, doors and windows name only the selected one); a Beams switch in Show (web unit).

**Unit 2a: refusals name what's in the way; offsets stored as typed (core); typed refusals on the
canvas (web) (hand-tested, committed).**

- *Named refusals (core).* `nameOf` (`wall-children.js`): "Beam B#1", or a door's or window's
  label. Split across one: "This cut crosses Beam B#1. Choose a position outside it, or shorten
  the beam first." (a door: "This cut crosses Shared door. Choose an opening edge or another
  position."); the other edits that an opening or beam is in the way of name it too (corner and
  stretch edits, room resizes, partition returns, an adjacency boundary, a removed portion, a
  typed size that doesn't fit, the model's fit checks: "Beam B#1 does not fit on its wall.
  Shorten or move it.").
- *Offsets stored as typed (core).* `cleanLength` (`geometry.js`, as `cleanPoint`): the derived
  write-back rounds an opening's or beam's recomputed offset to 1e-9 m (a typed 0.3 was stored
  as 0.2999999999999998); `opening-sides.js` and `beam-defaults.js` use it.
- *Typed refusals on the canvas (web).* `use-entry-issues.js` (new): an entry's refusals for
  typed values go to its canvas's status line (`BuildingPlanCanvasHost`'s `issues`); the banner
  above the form stays only for an entry without a canvas (`form-renderer.jsx`, wiring).
- The wall beams test's room-copy case moved to `building-plan-wall-beam-copies.test.js` (it was
  310 lines).

Tests: `building-plan-named-refusals.test.js` (2: a Split across a beam and across a door; a
beam typed past its wall), `building-plan-opening-offsets.test.js` (1: 0.3, 0.2, 0.7 stored as
typed for a door and a beam, through a wall move), all failing with HEAD's files;
`building-plan-entry-issues.test.jsx` (web, 2). Core 763 of 763 and the plain test scripts; web
456 of 462 (the worker tests).

Headless on the test page (no console errors): a new beam's distance typed 0.2: "Beam B#1 does
not fit on its wall. Shorten or move it." in the canvas status line, no banner; 1.5 typed: gone;
saved up to the Bedroom, Split at x = 3.4 (on the beam, clear of the door): "This cut crosses
Beam B#1. Choose a position outside it, or shorten the beam first."

Hand test (unit 2a; restart the test page): in a new beam's entry type 0.2 first: the refusal
names B#1 in the canvas status line, not above the form; then 1.5: gone. Split W3 on the beam: the
message names it; on the door: names the door. Type 0.3 as a door's distance, Save, export or
Save state: stored 0.3.

Hand-tested 2026-11-24: works. Committed form0-core `581e4ad` (offsets), `e460399` (named
refusals), `6518675` (the test moved), form0-react `8dcc854` (typed refusals on the canvas).
Asked: a wall beam can't be split (WB8 (a), refused as doors); dividing it at a cut put back as
a choice.

**Unit 2b: ends follow their wall, heights follow what they touch, clashes refused (core,
hand-tested, committed).** The outline for drawing moves to the drawing unit (core and web, one hand test).

- *Ends (WB8), `derive/wall-beam-ends.js` (new).* Before a geometry command, a wall beam touching
  an end of its wall's stretch (its row) is replaced by a point at its free end
  (`holdWallBeamEnds`), carried as a door's edge is, so no edit boundary cuts it; after it, the
  beam is rebuilt to the stretch's new end(s) (`releaseWallBeamEnds`). Found while building: a
  wall end moved past the free end made the command refuse the point as "This edit cuts through
  B#1… remove" (the doors' question); it reads "Beam B#1 would be too short." now
  (`heldBeamRefusal`, as room beams, 3a-4; under 1 cm too). Split and Rejoin don't hold: a cut
  across a beam is still refused. Thickness changes hold as well.
- *Heights (P2), `derive/follow-beam-heights.js` (new), after the write-back against the floor
  before the edit.* A beam resting on an opening's head (their stretches overlapping) follows the
  head (several: the highest); else one flush with its wall's top stays flush (deeper, it grows
  down); a room beam whose top was at the clear height stays there. An underside typed in the
  edit is kept.
- *Clashes, `wall-beam-placement.js` (new), in `derivedCandidateIssues`.* A beam above its wall:
  "Beam B#1 would stand above its wall."; an opening and a beam overlapping along the wall and in
  height: "Window 1 would run into Beam B#1." (or "Beam B#1 would run into Window 1." when the
  beam moved); resting on a head or under a sill is allowed; a clash already there refuses no
  unrelated edit.

Test `building-plan-wall-beam-follow.test.js` (5: ends out and in, the free end in place; one
end, too short; heights by a door, the wall's top and depth, a typed one kept, a room beam by the
floor's height; the clashes, named; an old clash (a guard)), the first four failing with HEAD's
`derived-edit.js`. Core 768 of 768 and the plain test scripts; web 456 of 462 (the worker tests).

Headless on the test page (no console errors): a beam added on W1 (0, 5); W2 dragged out to
5.714 m: the beam 5.71405 long; its underside typed 2.9: "Beam B#1 would stand above its wall."
in the canvas status line.

Hand test (unit 2b; restart the test page): in W1's entry add a beam (the whole wall); drag W2
out and W4 in: reopen it, its length follows; a beam 0 to 1 m on W1: drag W4 in past 1 m: "Beam
B#2 would be too short."; on W3 a lintel over the door (distance 0.35, length 1.2, underside 2,
depth 250 mm), then the door's height typed 2.1: the lintel's underside 2.1; W1's height typed
3.2: the whole-wall beam's underside 2.9; a window on W1 and a beam over it at 2.4: the window's
height raised past it: "Window 1 would run into Beam B#n."; a beam's underside typed into the
window or above the wall: refused, named; a room beam, then the floor's height changed: its
underside follows.

Hand-tested 2026-11-24: works. Committed form0-core `3af639f`. Raised: step 5's window wasn't
refused (the capture: its head 2.3, the beam 30 cm above at 2.4; replayed, a head past 2.4 is
refused, touching 2.4 is allowed); asked why a door raising its lintel isn't refused: the lintel
rested on the door's head (touching), so it follows; a beam with a gap stays and the opening may
not run into it (WB6). A consequence: raised to touch it first, the window then carries the beam.
Decided: a Split that crosses no door or window divides the wall and every beam across it, as
the wall divides (option b, all beams across the cut); lengths shown rounded to 2 decimals.

**Unit 2c: a Split divides the beams across it; lengths shown to the centimetre (core,
hand-tested 2026-11-24, committed).**

- *Dividing (`derive/beam-divisions.js`, new).* A cut is refused only by a door or window
  (`cut-commands.js`); a wall dividing (a Split, or a room's adjacency dividing it) divides each
  beam across its pieces (`divideBeamsOnPieces` in `divideSubjects`): the part on the piece that
  keeps the wall keeps the beam's identity (else the first along the wall); the others are new
  beams with the same size, height, answers and custom rows (new row IDs), unnamed, so they get
  the next B#. A free wall's cut divides them too (`divideBeamsAtCut`). Rejoin
  (`mergeMeetingBeams`, `cut-rejoin.js`, both paths): beams meeting end to end on the floor (their
  rows may be in different rooms) become one when size, height and answers match, the one of the
  wall the Split divided surviving; otherwise they stay two.
- *Lengths shown (`presentation.js`).* `toDisplay` rounds as the canvas shows lengths: metres to
  the centimetre, millimetres whole, feet to the hundredth, inches to the tenth. Stored values
  keep their precision (a beam following a wall keeps touching its end); a field only writes what
  is typed. Applies to every plan length (a door's distance read 1.19014 in the capture too).

Tests `building-plan-wall-beam-split.test.js` (4: two beams across a cut divided, named B#3 and
B#4 with their answers, one again after Rejoin; parts that no longer match stay two; a free wall;
a door still refusing (a guard)), a case in `building-plan-measures.test.js`, the first three and
the rounding failing with HEAD's files; `building-plan-named-refusals.test.js` and
`building-plan-wall-beams.test.js` updated (a Split across a beam no longer refused). Core 773 of
773 and the plain test scripts; web 456 of 462 (the worker tests; "keeps numeric setters
numeric" failed once under the full run's load, passing twice alone).

Hand test (unit 2c; restart the test page): a beam over the whole of W1 and a shorter one; Split
W1 through both: four beams, the new parts B#3 and B#4 with the same heights; Rejoin: two again.
Change one part's underside, then Rejoin: they stay two. Split W3 through the door: refused,
naming the door. A beam's length after a wall drag shows to the centimetre (5.71).

Hand-tested 2026-11-24: works. Committed form0-core `25bfdfc` (lengths shown), `6e8068e`
(dividing). Asked: step 3 left three beams on W1. Expected: the capture's whole-wall parts matched
and became B#1 again; the shorter beam's parts (B#2 at 1.5, B#4 changed to 0.9) stay two. Seen in
the capture: a divided part's stored length carries float noise (0.9862663009999999); the offset
goes through `cleanLength`, the length doesn't yet (next unit).

Decided after it (step 5's path): one edit raising a window past a beam was refused, two (touching
first, then past) carried the beam, and once touching it stayed stuck to the window. **(a)**: an
opening rising into a beam above it pushes the beam up, as far as the wall's top (beyond, refused,
named); one edit or two give the same result; a beam lowered into an opening is still refused.
Replayed on the example before the change: 1.55 in one edit refused; 1.5 then 1.55 applied, the
beam at 2.45; lowered to 1.2, the beam came down to 2.1.

**Unit 2d: openings push beams up; lengths stored without float noise (core, hand-tested
2026-11-24, committed).**

- *(a), `derive/follow-beam-heights.js`.* The openings under a beam before the edit and still
  under it along the wall: when one it rested on moves, or one rises past its underside, the beam
  comes to rest on the highest head among them. So a window raised into a beam pushes it (one
  edit or two alike); lowered again, the beam comes down with it, stopping on another opening's
  head under it if higher. Past the wall's top: "Beam B#1 would stand above its wall." (the
  existing message). An opening moved along the wall into a beam is still refused, as is a beam
  typed into an opening.
- *Lengths, `derive/stored-walls.js`.* The write-back cleans a wall child's reach as it does its
  offset (`cleanLength`), and keeps its span field in step.

Tests `building-plan-wall-beam-push.test.js` (new, 3: one edit as two; past the top refused,
lowered onto the highest head; moved along into it refused, a guard), a case in
`building-plan-wall-beam-split.test.js` (divided parts' lengths clean), the first two and the
lengths failing with HEAD's files; `building-plan-wall-beam-follow.test.js`'s raise-refused
assertion moved to the push file. Core 777 of 777 and the plain test scripts; web 456 of 462 (the
worker tests). Not checked on the test page.

Hand test (unit 2d; restart the test page): a window on W1 (sill 0.9, height 1.4) and a beam
over it at 2.4 (depth 200 mm): type the window's height 1.55 at once: the beam's underside reads
2.45; raise it to 2.0: "Beam B#1 would stand above its wall."; lower it to 1.2: the beam comes
down to 2.1. Split a wall through a beam at an odd distance: the parts' lengths in the record have
no long decimals (Save state).

Hand-tested 2026-11-24: works. Committed form0-core `1651924`. Raised: pushing up is right, but
pulling down isn't: a beam resting on a window comes down when the window is lowered, so there's
no way to detach it except retyping its underside. Proposed "push, never pull" (aligning, see
"Floor defaults for bands").

### Floor defaults for bands (asked 2026-11-24, aligning)

Asked: two floor questions setting defaults (beams on top of all walls; lintel and sill bands on
all walls, with their default heights), overridable per wall as plaster is, so a surveyor doesn't
add each ring, lintel or sill band to every wall of every room.

Decided so far:

- **F1: bands are wall answers (A), not rows in each wall's Beams list (B).** Each physical wall
  has Ring beam, Lintel band and Sill band answers, inherited from the floor through
  `FLOOR_SYSTEM_ROUTES` (scope `physical_wall`, copied on a split), set on a wall to override,
  with "Reset to inheritance". No beam rows are created; a wall's row stores the answers it ends
  up with, marked from the floor or set here (as wall height and plaster). The Beams list keeps
  local beams only (a lintel over one window, a beam over part of a wall). A band spans its
  whole wall (decided: it doesn't stop at openings; a broken band is made per wall, with local
  beams). B's cost: rows the engine keeps in sync, tombstones for deleted ones, a sill band in
  pieces between doors re-created as doors move.
- **F2: three single choices** like plaster ("Every wall has a lintel band" / "No wall has a
  lintel band"), one floor answer to one wall answer, a band overridden alone.
- **F3: heights are undersides** (lintel and sill); the ring beam's top is its wall's top. The
  sill band's measuring point may change later if it reads wrong.
- **F4: a depth per band** (three more floor questions), grouped in an inline Section inside the
  floor's System fields inline section.
- **F5: one answer for every wall**, free walls included, overridden per wall.

**F1 revised 2026-11-24: B, band rows.** A band seen on the canvas but missing from the Beams
list reads wrong; everything drawn is a row. Each physical wall keeps three answers (Ring beam,
Lintel band, Sill band), inherited from the floor and visible in its "Ring beam and bands"
section; the engine keeps one band row per yes in the wall's Beams list (as a room's outline
keeps its wall rows). A band row:

- has a band-kind system field (ring, lintel, sill; empty on a local beam), is titled by its kind
  (no B#), spans its whole wall (distance and length locked, its ends following the wall, 2b);
- inherits its underside and depth from the floor, overridable on the row with Reset; the ring
  beam's top is its wall's top;
- divides on a Split and joins on a Rejoin (2c); parts whose values differ ask which applies (the
  joining walls' question), since a wall has one band of each kind;
- removed from the list, sets the wall's answer to No ("set here"); Reset brings it back;
- the sill band: one row over the whole wall; doors pass through it, never a clash.

Clashes (asked 2026-11-24, V and Q together): an edit of a band (a floor answer, a band row's
underside or depth, a height moving the ring beam) that runs it into openings asks first: adjust
the openings (sills up to the sill band's top, heads down to a lintel band's or ring beam's
underside), fix them myself (applied; each clash an error on the opening and the band, blocking
Save), or Cancel. An opening edit running into a band applies and shows the error.

Decided too: the role starter field is dropped (the band kind covers it); new openings take their
heights from the bands when there are any (a door's height and a window's head at the lintel
band's underside, a window's sill at the sill band's top), else today's defaults (door 2 m;
window sill 0.9 m, height 1.2 m).

Decided 2026-11-24: "push, never pull" (raised at the 2d hand test): a beam moves only when
something runs into it (a head rising pushes a beam above up, a sill dropping pushes a beam below
down; lowering a head or raising a sill leaves it), for local beams and band rows, the wall's top
and a room's clear height too; the ring beam stays at its wall's top. Built as 2e.

**Unit 2e: push, never pull (core, hand-tested 2026-11-24, committed).**

- *`derive/follow-beam-heights.js`, rewritten.* For a wall beam whose underside the edit didn't
  type, the openings under or above it before the edit and still overlapping it along the wall:
  a head rising past its underside pushes it up (the highest); a sill dropping past its top pushes
  it down (the lowest); else the wall's top come down past it (the wall lowered, or the beam made
  deeper) pushes it down, when it stood within the wall before. A room beam: the same with the
  room's structural clear height. Lowered heads, raised sills, raised walls and ceilings leave
  beams where they are (2b made lintels and top beams follow both ways).
- *`wall-beam-placement.js`.* Pushed below the floor: "Beam B#1 would go below the floor."
  (`beam_below_floor`); past the wall's top, the existing refusal.

Tests: `building-plan-wall-beam-push.test.js` (4: one edit as two; past the top refused, lowered
the beam stays; a sill dropping pushes it down, raised it stays, below the floor refused; moved
along refused), `building-plan-wall-beam-follow.test.js`'s heights case rewritten (a lintel pushed
by its door; a top beam deeper grows down, the wall raised leaves it, lowered pushes it; a room
beam by the ceiling, the same), the three failing with HEAD's files. Core 778 of 778 and the plain
test scripts; web 456 of 462 (the worker tests). Not checked on the test page.

Hand test (unit 2e; restart the test page): a window on W1 (sill 0.9, height 1.4) and a beam over
it at 2.4 (depth 200 mm): raise the window to 1.6: the beam 2.5; lower it to 1.2: the beam stays
2.5. A beam under the window with its top at the sill (underside 0.7, depth 200 mm): type the
sill 0.8: the beam 0.6; type 1.0: it stays 0.6; type 0.1: "Beam B#n would go below the floor.". A
beam flush with W1's top (underside 2.7, depth 300 mm): W1's height 3.2: it stays 2.7; 2.9: it
reads 2.6. A room beam at the ceiling: the floor's clear height raised, it stays; lowered, it's
pushed down.

Hand-tested 2026-11-24: works. Committed form0-core `beb7c67`. Asked: step 4's B#3 stayed at 2.7 with
the floor's height at 2.5: B#3 is a wall beam on W1, whose height is set on the wall (3 m), so the
floor's height doesn't reach it; the capture had no room beam. The floor field sends
`set_provider`, the operation the core test covers.

**Bands unit 1: the floor's and the wall's answers, the band kind (core, hand-tested
2026-11-24, committed).**

- *Floor (`building-plan-floors.js`).* Eight system fields after plaster: Ring beam, its depth;
  Lintel band, its underside and depth; Sill band, its underside and depth. Each band is a single
  choice ("Every wall has a lintel band" / "No wall has a lintel band", values `yes` / `no`, not
  required); its underside (m) and depth (mm) show, and are required, only on `yes`, as plaster's
  thickness. Long data names: `floor_ring_beam_depth`, `floor_lintel_band_distance_from_floor`,
  `floor_lintel_band_depth`, `floor_sill_band_*` (cut short when scoped, as plaster's already
  are). `BAND_KINDS` lists the three (kind, title, floor and wall names).
- *Routes.* Each band answer routes to a physical wall property (`wall_ring_beam`,
  `wall_lintel_band`, `wall_sill_band`; every wall, free walls too; a split's pieces copy it).
  The undersides and depths route nowhere yet (unit 3, into the band rows). The contract labels
  the wall's answers by the band, choices Yes / No, not required.
- *Grouping (`building-plan-expander.js`).* A node's `system_groups` gather some system fields in
  an inline Section of their own inside System fields, where the first of them stood: the floor's
  eight, and the wall's three (physical wall and a room's wall row), "Ring beam and bands". The
  blueprint keeps the fields flat, so every lookup by name still works.
- *Inherited choices in the receiving words (`inheritance.js`).* A wall inheriting the floor's
  "Every wall has a lintel band" reads "Yes" (values unchanged); plaster too ("All the interior
  walls are plastered" reads "Plastered" on a wall side). Changes stored labels of inherited
  plaster (not published).
- *Band kind (`building-plan-wall-beams.js`).* `wall_beam_band` (ring / lintel / sill), internal
  (hidden, read-only; system fields of child nodes are normalised to required and visible unless
  internal); the engine fills it on band rows in unit 2, whose title shows the kind.
- *Words.* fr / it / es in `presentation-band-texts.js` (new; `presentation.js` is past 300
  lines), merged into the lookup. Measures: undersides `length`, depths `thickness`.

Tests `building-plan-band-answers.test.js` (new, 5: the floor's section and its conditions, the
walls' and room walls' answers, the band kind; every wall inheriting in its own words, a wall
overriding and resetting; a split's pieces keeping it; plaster inherited in the wall's words; the
words translated with their measure), all failing with HEAD's files; `building-plan-v2.test.js`'s
catalog check exempts the band answers (optional, as plaster). Core 783 of 783 and the plain test
scripts; web 456 of 462 (the worker tests).

Headless on the test page (no console errors): the floor entry's navigation shows System fields >
Ring beam and bands; "Every wall has a lintel band" shows its underside and depth, required;
W1's entry (from the Bedroom) shows the section with Lintel band "Yes · Floor default", the others
"Form default". Seen: a nested section highlighted from the navigation gets a border with no
inner padding, so its labels touch it (an existing style of nested sections, not changed here).

Hand test (bands unit 1; restart the test page): open the floor; in System fields, Ring beam and
bands: choose "Every wall has a lintel band": its underside and depth appear, required; open a
room's wall: Lintel band reads Yes (Floor default); set it to No: a Reset button in its place;
Reset: Yes again;
the floor's answer back to "No wall has a lintel band": the walls follow; in French, Italian or
Spanish the words are translated.

Hand-tested 2026-11-24: works. Committed form0-core `72ad993`. Asked: the hand test said a wall set
to No reads "This wall"; an overridden value that can return to the floor's shows Reset instead
(`field-renderer.jsx`), so Reset and Whole wall is right. Asked too: what a wall's No does to its
band row once unit 2 keeps them. Decided (A): the answers stay visible and the rows follow them
both ways: No removes the row, Yes or Reset brings a fresh one, removing the row answers No; No
asks first only when the row has something of its own (unit 4, with the clash question). The
band kind (`wall_beam_band`) tells band rows from beams added by hand.

**Bands unit 2: band rows kept in step (core, hand-tested 2026-11-24, committed).**

- *`band-rows.js` (new), `keepBandRows` after every derived write (`derived-edit.js`: commands,
  data operations, a re-derived floor).* Per wall segment and band answered Yes: one row of that
  band (found by its kind and segment, else created), over the whole segment (offset 0, its
  length), as wide as the wall, at the floor's underside and depth, live (unit 3 lets a row set
  its own); while the floor's are blank, 2.1 m (a new window's head) and 0.3 m, the sill band's
  top at 0.9 m; the ring beam's top at its wall's top. Rows of a band answered No go; a second row
  of one band on a segment (a Rejoin of differing parts) goes too.
- *Removing a band row (`opening-operations.js`)* sets the wall's answer to No (an override), so
  the engine doesn't bring it back; a typed place, size or height on it is refused: "The lintel
  band spans its whole wall at the floor's height." The form shows those fields read-only on a
  band row (`read_only_conditions` on the band kind).
- *Names.* A band row is named by its band in the editor's language ("Lintel band", "Fascia
  architravi"; `default-names.js`), refusals too (`nameOf`); beams added by hand keep B#n.
- *Record.* The band kind is internal, so not among a row's plain answers: read and written
  explicitly (`wall-beam-records.js`); room copies carry it.
- *Left for later.* Band rows aren't pushed by openings (unit 3) or checked against them (unit 4).

Tests `building-plan-band-rows.test.js` (new, 5: every wall, free walls too, one row at the
floor's values, following them, the ring beam at the top; No, Reset, removing the row; typed
place refused, a beam by hand beside it; Split and Rejoin; names in Italian, the record and room
copies), all failing with HEAD's files. Core 788 of 788 and the plain test scripts; web 456 of
462 (the worker tests; "keeps numeric setters numeric" failed once more under the full run,
passing alone).

Headless on the test page (no console errors): "Every wall has a lintel band" gave each of the
nine walls a "Lintel band" row over its length at 2.1 m (the floor's underside blank); W1's Beams
list shows it; its entry is titled "Lintel band", its distance and length read-only.

Hand test (bands unit 2; restart the test page): on the floor, "Every wall has a lintel band",
its underside 2.2 and depth 250 mm; open a room's wall: its Beams list has "Lintel band", over the
whole wall at 2.2, its place and size read-only; change the floor's underside: the rows follow;
the wall's Lintel band set to No: the row goes; Reset: it's back; remove the row from the list:
the wall's answer reads No (with Reset); "Every wall has a ring beam": a "Ring beam" row at the
top of each wall; change a wall's height: it stays at the top; Split a wall: each piece has its
rows; Rejoin: one again.

Hand-tested 2026-11-24: works. Committed form0-core `c723306`. Asked: a band row shows every value
read-only (Beam ID aside); how to change them? Wanted as plaster: where the value comes from,
override, Reset (unit 3, aligning). Decided: a band row's underside and depth from the floor, its width from its
wall's thickness, each overridable with Reset; the ring beam's underside stays its wall's top less
its depth; distance and length stay the whole wall (a partial band: the wall's band No, beams
added by hand); openings push lintel and sill band rows as the row's own height.

**Bands unit 3: a band row's own values (core and web, hand-tested 2026-11-24, committed).**

- *Own values (`band-rows.js`).* A band row lists the values it sets itself (`ownValues`, in its
  row's model): underside, depth, width; `keepBandRows` keeps those and fills the rest (the
  floor's underside and depth, the wall's thickness). A typed underside, depth or width becomes
  the row's own; `update_opening`'s `reset: [...]` gives it back (`opening-operations.js`). The
  ring beam's underside typed is refused: "The ring beam's top is its wall's top: change its depth
  instead."; a typed distance or length: "The lintel band spans its whole wall."
- *Pushed (`follow-beam-heights.js`).* Lintel and sill band rows are pushed as other beams (2e),
  the pushed underside becoming the row's own; the ring beam isn't.
- *The form (`band-field-state.js`, new; wired in `transactions.js`).* A band row's underside and
  depth show "Floor default", its width "This wall", Reset once set on the row (the ring beam's
  underside, read-only, shows none); a Reset on a wall child's value is sent as `reset`
  (`transactions.js`). No position tag (`untagged`; web `field-tag.js`): a beam's fields had none.
  The form's read-only rules: distance and length on a band row, the underside on the ring beam.

Tests `building-plan-band-values.test.js` (new, 4: own values kept when the floor's change, Reset,
the record; the ring beam's depth and its refused underside; a window pushing a lintel band; the
form's sources and Reset through the editor), all failing with HEAD's files;
`building-plan-band-rows.test.js`'s refusal wording; web `building-plan-field-tag.test.jsx` (an
untagged state), failing with HEAD's `field-tag.js`. Core 792 of 792 and the plain test scripts;
web 456 of 462 (the worker tests).

Headless on the test page (no console errors): W1's Lintel band entry shows "Floor default" on
its underside and depth, "This wall" on its width, no tags; its underside typed 2.35: Reset in
its place. Seen in a replay: a lintel band pushed up can come to overlap the ring beam (bands
aren't checked against each other; unit 4).

Hand test (bands unit 3; restart the test page): on the floor, lintel band and ring beam on every
wall (lintel underside 2.2, depth 250 mm); open a wall's Lintel band: underside and depth "Floor
default", width "This wall"; type its underside 2.4: Reset shows; change the floor's lintel
underside to 2.3: this row stays 2.4, the other walls' read 2.3; Reset: 2.3; type its width 150
mm: kept when the wall's thickness changes; open the Ring beam: its underside read-only; its
depth 400 mm: its underside drops so its top stays at the wall's top; a window under the lintel
band raised into it: the band goes up on that wall only, with Reset.

Hand-tested 2026-11-24: works. Committed form0-core `ae65a18`, form0-react `371496d`. Asked (aligning):
why width shows "This wall" and distance and length nothing; why "This wall" looks like an
inherited value; how to record a ring beam over part of a wall. Decided: badges as they are (no new
variants); a short note on band rows says why their place is read-only and what to do for part of
a wall; no type field for beams added by hand (informative only).

**Bands unit 3b: a band row's read-only values say why (core and web, committed 2026-11-25).**

First built as two note fields (LabelField) under Beam ID; asked before the hand test: use the
fields' own description, as other notes, and on every value that can't be edited, even repeated.
Reworked so: a field's description is the same on every row, and distance and length are
editable on a beam added by hand, so the band row's description comes per row from core.

- *Core (`band-field-state.js`).* For a band row, distance and length report no source and the
  description "Spans the whole wall. For part of it, set it to No on the wall and add the beam
  yourself."; the ring beam's underside "The ring beam's top is the wall's top: change its depth
  instead." In the editor's language (`getBuildingPlanFieldState` takes the record session's
  locale; fr / it / es in `presentation-band-texts.js`). The row writer (`transactions.js`) skips
  display-only fields (an author's note would have refused the row: "the target must be an input
  field"; found with the first version).
- *Web (`form-renderer.jsx`, wiring).* A field whose state carries a description shows it as its
  subtext in place of the field's own.

Tests: a case in `building-plan-band-values.test.js` (distance, length and the ring beam's
underside described on band rows, in Italian too; a beam by hand not), failing with HEAD's files;
web `building-plan-band-description.test.jsx` (new: a band row opened from the room's wall, the
description twice, the field's own gone), failing with HEAD's `form-renderer.jsx`. Core 793 of
793 and the plain test scripts; web 457 of 463 (the worker tests).

Headless on the test page (no console errors): W1's Lintel band entry shows the description under
Distance and under Length, the field's own gone.

Hand test (unit 3b, with unit 4): open a wall's Lintel band: Distance and Length say why; the Ring
beam: its underside says why too; a beam added by hand: the usual descriptions.

Committed form0-core `e39cf31`, form0-react `f8a87fd` (asked to commit before the hand test, which moves
to the next chat with 4a). Asked: does this change how core handles field descriptions? No: the
description comes from the building plan's field state (`getBuildingPlanFieldState`), which only
plan entries ask; schemas, the engine and other forms are unchanged.

Unit 4 decided (2026-11-25): problems to fix (a band and an opening reaching into each other,
bands overlapping) never refuse an edit; they're marked on the canvas, listed in the Validation
panel first, each with a "Plan" tag (the "Exterior" tag's style) naming both elements, a click
selecting it on the canvas; they block the floor entry's Save only (inside the plan). Order: 4a
the problems and the blocked Save; 4b the question on a band edit that would cause problems
(lower the openings, fix them myself, Cancel); 4c a No removing a band row with values of its own
asks first, a Rejoin of parts that differ asks which value.

Hand-tested 2026-11-25 (unit 3b): works (a Lintel band's Distance and Length, the Ring beam's
underside, a beam added by hand with the usual descriptions).

**4a details (aligned 2026-11-25).**

- *When.* Canvas markers and the "n issues" list follow core's snapshot live; the Validation panel
  lists the problems after a Save attempt, as other errors.
- *Where.* The floor entry: markers, the list, the panel (problems first), Save blocked. Room and
  wall entries: markers and the list in their scope, Save not blocked, so a problem can be fixed
  across entries (the band row in one, the opening in another) before the floor is saved. The
  plan page: markers; the form's Submit not blocked. Web only (mobile with step 5).
- *Pairs.* Any two bands on one wall overlapping in height (so a sill band into the ring beam on a
  wall without a lintel band too).
- *Openings.* A problem only when an opening and a band overlap in height, as local beams'
  clashes (`wall-beam-placement.js`): touching is allowed, unknown heights aren't judged, doors
  pass through sill bands. A window wholly above the lintel band or a vent wholly below the sill
  band isn't flagged.
- *Words.* Core writes the message in the editor's language, as refusals ("Window 1's head (2.30
  m) is above the lintel band's underside (2.10 m)."), lengths rounded as the canvas shows them;
  the panel's item reads "Window 1 and Lintel band · Plan", the wall in its path. Only new web
  words ("Plan") go in `plan-text.js`.
- *Invariants* over the example plans with bands on: every problem names elements on its wall; no
  bands, no problems; a wall moved, Split and Rejoin keep the same problems when no height moves.
- *Confirmed 2026-11-25.* Marking: an opening's problem marks and selects the opening, a band
  against a band the wall; D1 moves both to the band once bands are drawn. A band beyond its
  wall (checked in node: a band row's underside typed 3.5 or -1 on a 3 m wall, the floor's lintel
  underside 3.4, the floor's sill underside 3.2 all applied silently; a wall lowered pushes its
  bands down, 2e): typed on the band row itself, refused as local beams ("Lintel band would stand
  above its wall."); from the floor's values or an opening pushing it, a problem. To revisit if it
  feels too invasive after some use.

**Bands unit 4a: problems to fix before saving (core and web, hand-tested 2026-11-25, committed).**

- *Core, `plan-problems.js` (new).* `buildingPlanProblems(floor)` lists per wall
  `opening_into_band`, `bands_overlap`, `band_above_wall`, `band_below_floor`, each with its
  elements (type, id, name), wall and segment, the wall's name and a message; `problemRowPaths`
  gives the rows that show each (an opening's copy in each room's wall row, else the wall rows
  facing the band's segment), from the record as canvas entries carry them. The canvas snapshot
  has `problems` (active floor); `getBuildingPlanProblems(plan, floorId, { meta, record })` is
  exported for an editor's plan. Wiring only in `canvas-controller.js`.
- *Core, refused on the row (`opening-operations.js`).* A band row's underside or depth typed
  beyond its wall: "Lintel band would stand above its wall." / "… would go below the floor." (the
  ring beam by its depth).
- *Words, a correction to "4a details".* Core's refusals are English sentences today (only names
  are in the editor's language), and the snapshot doesn't know the measurement system, so the
  messages read as the refusals, without lengths: "Shared door runs into Lintel band.", "Lintel
  band runs into Ring beam.", "Lintel band stands above its wall.". Both go with the localization
  task; lengths can come back then.
- *Web.* `plan-problems.js` (new): the panel items ("Shared door and Lintel band · Plan", the
  wall's name in its path, the message), the canvas list items and markers in scope, the floor
  entry's problems read from its editor. `use-plan-issues.js` takes the canvas's problems
  (`canvas-host-mount.js` subscribes to the controller) and lists them first, live, with markers;
  it now also works out the scope (moved from `canvas-host.jsx`). `form-renderer.jsx` (wiring):
  the floor entry's panel lists them first once Save was tried, a click selects the element
  (`planChainSelect`), Save reads them after the entry's values are applied and stops. Room and
  wall entries mark and list them, and save. "Plan" and "{first} and {second}" in `plan-text.js`.

Tests: core `building-plan-plan-problems.test.js` (4: openings and bands, touching and clear
cases; bands overlapping, a sill band into the ring beam; beyond the wall, refused on the row, a
problem from the floor's values and from a push; the canvas rows, the editor route giving the
same), `building-plan-plan-problem-invariants.test.js` (5 plans through a wall moved, Split and
Rejoin), with `tests/helpers/building-plan-bands.js`; failing with HEAD's files (the refusal case
with HEAD's `opening-operations.js` alone). Web `building-plan-plan-problems.test.jsx` (2: a floor
value typed and saved at once is blocked, listed first with its tag, the canvas list; fixed, Save
closes; a room entry lists it and saves), failing with HEAD's four wired files. Core 802 of 802
and the plain test scripts; web 458 of 465 (the worker tests and the numeric-setters flake,
passing alone).

Headless on the test page (no console errors): the floor entry, "Every wall has a lintel band",
underside 1.9: "1 issue" at once, the "!" on the Shared door; Save: the entry stays, Validation 2
(the problem first, "Shared door and Lintel band · Plan", W3, "Shared door runs into Lintel
band."; then the floor's lintel depth, required and blank); a click on the problem selects D#1;
underside 2 and depth 250: the chip goes, Save closes the entry.

Hand test (unit 4a; restart the test page): open the floor, "Every wall has
a lintel band", depth 250 mm, underside 1.9: "1 issue" and a "!" on the Shared door at once; Save:
the entry stays; Validation lists "Shared door and Lintel band · Plan" first; click it: the door
is selected. Open the Bedroom from the floor: its canvas lists the problem too; Save the room: it
saves. Underside 2: the problem goes, Save closes the floor. Then: lintel underside 2.6 with "Every
wall has a ring beam": "Lintel band runs into Ring beam." on every wall, marked on the walls; the
floor's sill band at 3.2: "Sill band stands above its wall."; a wall's Lintel band row, underside
typed 3.5: refused ("Lintel band would stand above its wall."); the Ring beam's depth 3500 mm:
refused ("… would go below the floor."); a window raised into the lintel band with no ring beam,
until the band is pushed past the top: applied, listed as a problem.

Hand-tested 2026-11-25: works. The messages' translation and lengths are noted in
`localization.md` (agreed: with the localization task). Asked: a failed Save or Submit is hard to
notice (only the Validation badge's number changes); a highlighted nested section draws a border
over its header and against the inputs; a refused typed value (a band's underside 3.5) isn't
marked on its field nor listed in Validation (aligning).

**After the 4a hand test (decided 2026-11-25).** Order: (2) and (1) as one unit, then (3), then
4b.

1. *A stopped Save or Submit* (root form and every entry; web only, mobile with step 5): the
   Validation tab opens with its first finding focused, screen readers hear "Not saved: n issues
   to fix.", the Validation badge turns red while findings are left after an attempt, and the
   button gets a red ring with an alert icon in place of its own (no layout shift: a button
   without an icon gets the ring only) until the findings are fixed. No toast (hosts like Reform
   show their own), no shake.
2. *A highlighted nested section*: no ring of its own; its header band carries the accent bar,
   as an open drill-down section's.
3. *A refused typed value* (checked headless: a band row's underside typed 3.5 stays in the field
   while the plan keeps 2.2, no red border, the message only in the canvas status line, and Save
   does nothing visible: the entry stays, Validation 0): a field error like the engine's (red
   border, the message under it at once), listed in Validation (a click focuses the field), Save
   stopped as in (1), the status line too; a valid value or Reset clears it. Step 4's first part.

**Stopped Save feedback and the nested section's highlight (web, hand-tested 2026-11-25,
committed).**

- *`navigation-tree.jsx`*: `failedAttempt` (a count of stopped attempts) opens the Validation
  tab once per attempt when its findings are there, asks the list to focus its first finding,
  and sets a visually hidden status line ("Not saved: 2 issues to fix."); the badge has
  `data-tone="error"` while findings are shown. The list, its pager and a finding moved to
  `validation-panel.jsx` (new; the tree was 327 lines, now 254); the pager's page now starts again
  on the first when the tab is reopened.
- *`form-renderer.jsx`* (wiring): counts the attempts validation stopped (root: the plain path's
  findings, the managed path's preparation not eligible with validation errors; an entry: the
  plan row it can't take, the floor's problems, the managed and plain paths' errors); Submit and
  Save carry `failed` while findings are left after one, their icon `CircleAlert` in place of
  `SendHorizontal` or `Save`; both header renderers write `data-failed`.
- *Styles*: `data-failed` on a header button: the error border and `control.errorRing`; a
  highlighted nested section: no box shadow, the accent bar in its header band.
- *Found on the way*: the Validation list's items had no text colour (a button's is the
  browser's black), unreadable in dark mode; they take the foreground colour now.

Tests: `failed-save-feedback.test.jsx` (new, 3: a Submit stopped, lifecycle on and off; an
entry's Save stopped; each: the tab opens, the badge's tone, the first finding focused, the
status line, the button marked, then fixed: unmarked), failing with HEAD's four files;
`submission-reporting.test.jsx` (the required message now shows twice: under the field and in the
opened tab) and `validation-pagination.test.jsx` (its style mock lists `visuallyHidden`)
updated. Web 461 of 468 (the worker tests and the numeric-setters flake, passing alone).

Headless on the test page, light and dark (no console errors): the floor entry, a field of "Ring
beam and bands" focused: the header band's accent bar, no rectangle; Save with the lintel band's
underside and depth blank: the Validation tab open, its first finding focused, "Not saved: 2
issues to fix.", the badge red, Save with a red ring and an alert icon.

Hand test (restart the test page; light and dark): on the floor, focus a field in "Ring beam and
bands": the band's accent bar, no blue rectangle; choose "Every wall has a lintel band" and Save
with its values blank: the Validation tab opens on its first finding, the badge is red, Save has
a red ring and an alert icon, its width unchanged; fill both: the ring goes. The plan page's
Submit with a required field empty: the same. An entry with nothing wrong: Save as before.

Hand-tested 2026-11-25: works. Committed form0-react `d2e2f5b`; 4a's were form0-core `c86fc2c`,
form0-react `bfdd66c`.

**Refused typed values as field errors (core and web, hand-tested 2026-11-25, committed).**

- *Found while building.* Core's `completeRow` sends every field changed since the row opened, so
  a refused value is sent again with each later edit of the entry (and blocks it), and a refusal
  can't be tied to the field blurred. The web can't tell which field core refused.
- *Core, `refused-fields.js` (new; wiring in `editor.js`).* On a refusal, `completeRow` returns
  `refusedFields`: each changed field tried alone (a preview, nothing applies), those refused
  alone with their own issues; refused only together, every changed field with the refusal. One
  changed field: that field.
- *Web, `plan-refusals.js` (new; wiring in `form-renderer.jsx`).* The entry keeps the refusals by
  field from each completion (cleared once the row applies, is back to its values, or the plan
  publishes, its values replacing the form's); they go in front of the field's own error (red
  border, the message under it, at once); once Save was tried, Validation lists them after the
  plan's problems (the field's label as the plan presents it, a click focuses it); Save stops on
  a refusal as on an invalid value (the feedback of `d2e2f5b`). A refusal core ties to no field
  is listed under "Plan". The canvas status line keeps the message.
- *Seen, not changed.* While a refused value shows, its source tag still reads "Floor default":
  the plan keeps the inherited value until the refusal is fixed.

Tests: core `building-plan-refused-fields.test.js` (4: one field; a refused field beside a fine
one; refused only together; applied, none), three failing with HEAD's `editor.js`; web
`building-plan-plan-refusals.test.jsx` (a band row's underside 3.5: the field's error at once;
Save stops, the Validation tab on it, focused; 2.4: cleared, Save closes the entry), failing with
HEAD's `form-renderer.jsx`. Core 806 of 806 and the plain test scripts; web 463 of 469 (the
worker tests).

Headless on the test page (no console errors): the Bedroom's W1 Lintel band, underside 3.5: red,
"Lintel band would stand above its wall." under it and in the status line; Save: the entry stays,
Validation 1 on "Underside from floor [m]", focused, Save marked; 2.4: cleared, Save closes it.

Hand test (restart the test page): open a wall's Lintel band (with "Every wall has a lintel
band"); type its underside 3.5 and leave the field: red, the refusal under it; type the width 150
and leave it: the underside stays the one marked; Save: Validation opens on the underside, a
click on it focuses the field; type 2.4: the mark goes, Save works. The Ring beam's depth 3500 mm:
the same on its depth.

Hand-tested 2026-11-25: works. Committed form0-core `9e629fb`, form0-react `d510a5d`. Asked
(aligning): a typed value normally shows Reset in place of its source tag; why "Floor default"
here? (The same tag: Reset shows once the plan holds a value of the row's own; a refused value
never reached the plan, which still inherits.) And whether `completeRow` sending every changed
field is a core defect to fix (not changed: `refusedFields` only names the fields; the row
still applies whole, so a valid edit made beside a refused one waits until the refusal is fixed).
`completeRow` is also used by form0-react-native and form0-cli's preview server; the new
property only appears on refusals, so they're unaffected.

Decided 2026-11-25: (B) a refused value's field shows no source tag (no "Floor default", no
Reset): Reset only ever returns an inherited value, so it isn't used to drop a refused one. And
rows stay whole: kept as is.

*Note for later, rows applied whole.* Today a row's completion applies every field changed since
its last applied state, or none: while a refused value stays in the form, a valid edit beside it
waits (nothing is lost; both apply once the refusal is fixed). If it gets in the way: on a
refusal, apply the fields core accepts alone (`refusedFields` already tells them apart) and keep
only the refused ones pending. Costs: a row's edit is no longer all or nothing (two values meant
together could land apart), each partial apply is an undo step of its own, and it changes every
plan entry on web, mobile and form0-cli's preview server, which all call `completeRow`.

**No source tag on a refused value (web, hand-tested 2026-11-25, committed).**
`buildingPlanFieldPresentation` (`form-renderer.jsx`) takes `refused` and leaves the source and
Reset out (the position tag and its note stay); the entry passes its refusals in the form's
state (`refused`, beside the errors). Test: `building-plan-plan-refusals.test.jsx` (the
underside's tag: inherited, none while refused, Reset once 2.4 is applied), failing with HEAD's
`form-renderer.jsx`. Web 463 of 469 (the worker tests). Hand test: a Lintel band's underside
3.5: red, no "Floor default"; 2.4: Reset in its place. Hand-tested: works. Committed `7efad5d`.

**4b decided (2026-11-25).** A band edit that makes new clashes between openings and bands asks
first (the floor's band answers and values, a wall's band answer or its Reset, a band row's
underside or depth, a wall's height or the ring beam's depth bringing the ring beam down); clashes
already there don't ask; opening edits never ask (they push lintel and sill bands; into the ring
beam, applied and listed). Other new problems (bands overlapping, a band beyond its wall) don't
ask. The question (core, as the shared-value one): "This edit runs the Lintel band into 3
openings: Window 1 (W1), …", "Fit the openings" / "Keep them, I'll fix them" / "Cancel". Fit:
openings shrink, their other edge staying: a head down to the underside of the lowest band
above it, a window's sill up to the sill band's top (doors pass sill bands); one that would keep
no height isn't touched, stays a problem, and the question says so. Keep: applied, listed (4a).
Cancel puts the field back to the plan's value, for this question and the shared-value one (a
cancelled plan question left the typed value in the field, unapplied, and Save asked again). The
edit and the fitted openings are one Undo. English for now, as the other core questions.

**Bands unit 4b: a band edit running bands into openings asks (core and web, hand-tested
2026-11-25, committed).**

- *Core, `band-clash-question.js` (new; wiring in `session.js`'s commit, after the other
  questions).* `newBandClashes(before, after)`: the opening-band problems (4a) the edit made,
  compared by opening and band kind (a Split's new band rows aren't new clashes), leaving out
  openings the edit placed or moved. `bandClashQuestion`: "Openings in the way", the message, the
  three buttons, the openings that would keep no height named. `fitOpenings`: a head down to the
  lowest band above it, a window's sill up to the sill band's top, lengths cleaned; changed in
  the candidate, so the edit and the fit are one Undo. Keep: applied as it is; Cancel: unchanged
  (the session's existing cancel).
- *Web, `form-renderer.jsx` (wiring).* The code putting the plan's row into the form moved to
  `adoptPlanRow` (used on each plan change, as before); a completion whose question was cancelled
  (asked, then unchanged) calls it, so the typed value goes back. Applies to the shared-value
  question too.
- *Tests changed by the question.* 4a's tests make clashes with floor values: they answer Keep
  now (`keep` in `tests/helpers/building-plan-bands.js`; the web fixture, moved to
  `tests/fixtures/plan-window-band.jsx`, does the same; 4a's web test answers Keep in the dialog).
- *Seen, not changed (from before).* A plan change puts the plan's row into the form: a value
  typed in another field while the previous field's completion is still running is overwritten
  (seen only with the driver typing two fields with no pause; a completion takes milliseconds).
  Deferred (2026-11-25): not on the queue for now.

Tests: core `building-plan-band-clash-question.test.js` (6: the floor's lintel band lowered into
the Shared door, Fit and one Undo; Keep, a deeper band and a Split not asking again, Cancel; opening
edits not asking; a sill band raised into a window; a wall lowered bringing the ring beam down; an
opening keeping no height, named and left), five failing with HEAD's `session.js` (the opening
edits one passes either way); web `building-plan-band-clash.test.jsx` (2: Cancel puts 2.4 back,
Fit then Save closes; Keep leaves "1 issue"), the Cancel one failing with HEAD's
`form-renderer.jsx`. Core 812 of 812 and the plain test scripts; web 464 of 471 (the worker tests
and the numeric-setters flake, passing alone).

Headless on the test page (no console errors): the floor's lintel band at 2.1 (250 mm), then 1.9:
"Openings in the way", "This edit runs Lintel band into 1 opening: Shared door (W3)."; Cancel:
2.1 back; again, Fit: the door 1.9, no issues; Save closes the floor.

Hand test (restart the test page): on the floor, "Every wall has a lintel band", underside 2.1,
depth 250 mm; type 1.9: the question names the Shared door; Cancel: 2.1 is back. Type 1.9, Fit:
the door's height reads 1.9 (its entry), no issues; Undo once: the band and the door both back.
Type 1.9 again, Keep: "1 issue". A window on W1 (sill 0.9, height 1.2) and "Every wall has a
sill band" at 0.8: the question; Fit: its sill 1.0, its head where it was. A window raised into
the lintel band: no question (the band is pushed).

Hand-tested 2026-11-25: works. Steps 5 and 6 checked on the capture
(`captured/state-2026-11-25T12-41-06-391Z.json`): the sill band's depth left blank takes 30 cm, so
its top is 1.1 and Window 1's sill went to 1.1 (the hand test's 1.0 assumed 20 cm), its head
staying at 2.1; then raised to a head of 2.6, W1's lintel band followed to 2.6 (its own), the
other walls' at 2.1; no problems. Committed form0-core `c8d9805`, form0-react `ccb6abb`.

**4c decided (2026-11-25).** A No that removes band rows with values of their own (typed, or
pushed: what shows Reset) asks: a wall's No or its Reset to the floor's No, and the floor's No;
removing a row from the Beams list keeps its usual confirmation. "W1's Lintel band has values of
its own (underside 2.6 m). Remove it?": Remove / Cancel, and on the floor's No "Keep those walls'
bands" (those walls get their own Yes). A Rejoin, or a join, whose walls' band rows give a value
differently, one of them its own, adds it to the joining walls' question (one choice per value).

**Bands unit 4c: band rows' own values not lost unasked (core, 2026-11-25, hand-tested,
committed).**

- *A No (`band-removal-question.js`, new).* `removedOwnBands(before, after, operation)`: rows
  with own values the edit removed from a wall still there whose answer isn't Yes (not when the
  edit is `remove_opening`); the question lists them with their own values; "Keep those walls'
  bands", offered when every such wall follows the floor, gives each its own Yes and puts its
  row back as it was.
- *Both band questions (`band-questions.js`, new; `session.js` calls it, replacing 4b's
  wiring).* The removal question first, then 4b's; answers recorded on the prepared edit and
  applied to its candidate (one Undo).
- *Joins (`derive/band-join-values.js`, new; wired in `value-choices.js`,
  `shared-value-choices.js`, `shared-value-question.js`).* `bandDifferences`: band rows of a kind
  giving a value differently, one of them its own, become `{ kind: 'band', band, key }` entries;
  an option's mark says whether that wall's row set it itself; the answer writes the chosen value
  to the surviving wall's rows, own or inherited as chosen. Words: "Lintel band underside", with
  units. Before, the second row of a band was dropped, its values lost.
- *Web.* Nothing new: the questions show in the managed dialog, and Cancel puts a typed value
  back (4b).

Tests: core `building-plan-band-own-values.test.js` (3: a wall's No, Remove and Cancel, a No
without own values and a removal from the list not asking; the floor's No listing two walls, keep
them (their own Yes, one Undo) and Remove; a Rejoin choosing either part, matching parts not
asking), all failing with HEAD's files. Core 815 of 815 and the plain test scripts; web 464 of 471
(the worker tests and the numeric-setters flake).

Headless on the test page (no console errors): the floor's lintel band on every wall; the
Bedroom's W1 Lintel band underside 2.6, saved up to the floor; "No wall has a lintel band":
"W1's Lintel band has values of its own (underside 2.6 m). Remove it?" with "Keep this wall's
band"; kept: W1's band alone, at 2.6.

Hand test (restart the test page): every wall's lintel band; on W1's Lintel band type the
underside 2.6, Save up to the floor; on W1's entry set Lintel band to No: the question (Remove it /
Cancel); Cancel: W1's answer back to Yes, its band at 2.6; on the floor, "No wall has a lintel
band": the question with "Keep this wall's band"; keep: W1 keeps its band (its answer Yes on the
wall), the others have none; Undo: all back. Split W1, type 2.6 on W1.1's band only, Rejoin: the
question offers "W1: 2.1 m" and "W1.1: 2.6 m".

Hand-tested 2026-11-25: works. The band values stay in ordinary joins' question too (a room moved
against another), not only Rejoin's. Committed form0-core `3337647`.

*Noted for later (2026-11-25), after the planned items, mobile included.* A question that names
plan elements ("W1: 2.1 m" or "W1.1: 2.6 m", the openings in the way) could highlight them on the
canvas behind it, in a colour of their own, so the choice reads against the drawing. They may be
out of view at the current zoom; what to do then (fit them into view, a marker at the canvas
edge, or nothing) is to decide when we take it up.

**Unit 5 aligned (2026-11-25).** New openings take their heights from the bands (decided
2026-11-24); points agreed:

1. *Which band.* The band row on the segment the opening is placed on, as it stands there: the
   wall's own value (W1's own 2.6, a pushed one) or the floor's (2.1 while the floor's underside is
   blank). A wall answered No has no row: today's defaults.
2. *One band only.* Each edge on its own: the head at the lintel band's underside, else 2.1 (a
   door's 2 m); a window's sill at the sill band's top, else 0.9. A lintel band at 2.6 alone: a
   window 0.9 to 2.6; a sill band's top at 1.1 alone: 1.1 to 2.1. Bands that leave no height (head
   at or under the sill): today's defaults, listed as a problem (4a).
3. *The ring beam* sets no height, but 4b's Fit applies (a head down to the lowest band above it),
   so a new opening never starts inside the ring beam on a low wall. Asked: one rule with 4b, no
   new exceptions.
4. *Plain values*, no source tag: a band moved later doesn't carry them (4b asks), no new badge.
5. *Core helper* called by the editor (Add in a Doors or Windows list) and the canvas controller;
   `create_opening` keeps a missing height meaning unknown.
6. *Found while aligning, fixed here.* The canvas controller filled today's defaults on every
   edit too, so a window with blank heights dragged along its wall came back 1.2 / 0.9 (checked in
   node through the controller). Heights are only filled when an opening is created.

Found too: the web canvas sent its own constants (2, 1.2, 0.9) with every new door or window, so
core's defaults were never reached from the web; it now sends where and how wide only. Mobile
already did. The v1 controller (`legacy/building-plan-controller.js`, plans with version 1 metadata,
not the engine switch) keeps its own defaults, the same values.

**Bands unit 5: new openings take their heights from the bands (core and web, 2026-11-25,
hand-tested, committed).**

- *Core, `opening-heights.js` (new).* `newOpeningHeights(floor, { wallId, segmentId, kind })`:
  the bands on the segment (doors leave the sill band out), the edges as above, then 4b's
  `fitToBands` (exported from `band-clash-question.js`, was `fitted`) for the bands the opening
  would run into. Wiring: `editor.js` (a new row in a wall's Doors or Windows list),
  `canvas-controller.js` (a new door or window; a typed height or sill still wins; an edit sends the
  opening's own heights, blank ones included).
- *Web, `legacy/building-plan-canvas.js` and `add-elements.js`.* "Add door" and "Add window" (and
  the legacy placing mode, unused here) send the width and place only; the height constants are
  gone.
- *Mobile.* Nothing: the touch controller sends the width only, so core's heights apply.

Tests: core `building-plan-new-opening-heights.test.js` (6: today's heights without bands, the
floor's lintel and sill bands, a door through the sill band; the wall's own band row and a wall
answered No; a sill band alone, the ring beam capping a head on a 2.2 m wall; bands leaving no
height, listed as a problem; a typed height winning and a moved opening keeping blank heights; the
editor's Add in the Windows and Doors lists), five failing with HEAD's `editor.js` and
`canvas-controller.js` (the no-height case gives today's either way); web
`building-plan-add-elements.test.js` (no height sent), failing with HEAD's two files. Core 821 of
821 and the plain test scripts; web 464 of 471 (the worker tests and the numeric-setters flake).

Headless on the test page (no console errors), from a plan built in node
(`captured/state-unit5-bands.json`: lintel band 2.3 / 250 mm on every wall, W1's own 2.6, sill band
0.8 / 200 mm): in the Bedroom's entry, W1 selected and "Add window": sill 1.0, height 1.6 (head
2.6); W4 and "Add door": 2.3; W2 and "Add window": sill 1.0, height 1.3.

Hand test (restart the test page): on the floor, "Every wall has a lintel band" (underside 2.3,
depth 250 mm) and "Every wall has a sill band" (underside 0.8, depth 200 mm); on W1's Lintel band
type the underside 2.6; Save up to the floor. In the Bedroom, select W1, "Add window": its entry
reads sill 1.0, height 1.6; select W4, "Add door": height 2.3; from W2's entry (Walls › W2),
Windows, Add: sill 1.0, height 1.3. Set W3.2's Lintel band to No and add a window there: sill 1.0
(the sill band), height 1.1 (the head at 2.1). Without any band (a fresh page): door 2, window 0.9
/ 1.2 as before. The same plan can be opened
with `?state=state-unit5-bands.json&form=plan&show=page&width=wide`.

Hand-tested 2026-11-25: works. Committed form0-core `2f592bc`, form0-react `aad7606`.

**Asked 2026-11-25, for D1 and A.** D1 to D3 are drawing only (WB10: wall beams aren't picked or
dragged in the plan); lengths typed on the canvas are step 4 (queue 4), for openings, columns,
room beams and wall lengths, its first part (refused values as field errors) done; the front
view's typed lengths would join it. The main mockups page's "Handles · lengths (3)" is step 4's
starting point. The front view from a room's entry too, a wall at a time with left and right
arrows to the next wall (user's idea): to sketch in the WB10 mockup with the band scenes (bands
on every wall, a wall's own band, a local beam, a problem on a band).

**D1 decided (2026-11-25, mockup round 2: https://claude.ai/artifact/VTrTopfPtKR3GivVhnWq4S).**

1. *Bands at rest: R2.* Beams added by hand are drawn at rest (D1: over their wall, dashed, at
   their width); bands only with focus: their wall selected, their entry open, a problem, or
   Show › Bands.
2. *Names at rest:* beams added by hand named at rest (as room beams); bands never at rest. A
   selected wall lists its bands and beams inside the room, top to bottom by height.
3. *Show:* "Beams" (on; room beams and beams added to walls) and "Bands" (off).
4. *Problems on bands:* the band drawn in the error colour, the marker at the clash; selecting
   the problem selects the band (replaces 4a's marker on the opening).
5. *Front view (A):* the Plan | Front switch in a room's entry, a wall at a time with arrows in
   the Walls list's order (starting on the selected wall, wrapping; a split side drawn whole, the
   other wall faded; free walls later). In a wall's entry: that wall only, no arrows. Asked too
   (to settle with A): a door's, window's or beam's entry showing the front view with that element
   highlighted (round 1 proposed it); heights as a vertical chain of partial lengths beside the
   levels (W1: 0.80, 0.20, 1.45, 0.25, 0.30), as lengths along the bottom are.

Units: **D1a** (core) wall beams and bands in the canvas snapshot, per room face as doors and
windows; **D1b** (web) drawn as decided (1 to 3), the Show switches, names, the selected wall's
list; **D1c** (core and web) an open beam or band entry on top in the accent colour with its
length and height, problems marked on and selecting the band. D1a and D1b share a hand test. Web
only; mobile with step 5.

*Correction (found while building D1b, checked headless).* Room beams are not named at rest today:
the plan canvases name rooms only (`canvas-host-mount.js`, `LABEL_SETTINGS`; walls, openings,
columns and beams are named when selected). Point 2's "as room beams" was wrong; the mockup drew
B#1 named at rest. Built as the canvas names room beams (by the same setting), so no beam is
named at rest on the plan. Decided 2026-11-25: no beam names at rest (as every element but
rooms); the selected wall's list tells its beams apart.

**D1a: wall beams and bands in the canvas snapshot (core, 2026-11-25, hand-tested, committed).**

- *`canvas-wall-beams.js` (new; wired in `canvas-controller.js`).* Per room face, each beam of its
  physical wall over the stretch of its segment the face covers: `wallBeams` entries (id
  `face:beam`, `subjectId`, `wallId`, `physicalWallId`, `roomId`, the `face_beams` copy's `path`,
  `segmentIndex`, `startRatio` and `endRatio` along the face's binding, `length`, `width`,
  `depth`, `underside`, `band` (ring, lintel, sill or null), `points` (its outline at its width,
  centred on the wall's axis), `axisPoints`, `label`, `displayLabel` (its identifier: "Lintel
  band" in the editor's language, B#n)); each wall lists its own (`wall.wallBeams`). Both faces of
  a wall give the same outline. Display only.

Tests: `building-plan-canvas-wall-beams.test.js` (3: W1's ring beam and lintel band along it, as
wide as the wall on its axis, the path to the face's copy; a beam on the shared W3 from both rooms,
counted from each room's end, the same outline; every beam on each face of its wall through a
Split, none for a wall answered No), all failing with HEAD's `canvas-controller.js`. Core 824 of
824 and the plain test scripts.

**D1b: wall beams and bands drawn, the Show switches (web, 2026-11-25, hand-tested,
committed).**

- *`draw/wall-beams.js` (new).* `shownWallBeams`: beams added by hand while Show › Beams is on,
  bands while Show › Bands is on, the selected wall's own always; one per beam and stretch (both
  faces give it), at the strongest scope level of its faces. `drawWallBeams`: the outline 2.5 px
  inside the beam's own, dashed 5/3, in the room colour, then in the symbol colour inside the
  wall's openings' gaps (as the mockup). `wallBeamLines`: a selected wall's bands and beams, top
  to bottom by height ("Ring beam 2.70"), in the plan's lengths. `wallBeamNameAt`: a beam's name
  outside the room it is drawn for (used only where beam names show at rest; see the correction).
- *Legacy canvas (wiring).* The snapshot's `wallBeams` and `physicalOpenings`; drawn over the
  openings; room beams drawn and hit only while Beams is on (the selected one always); the
  selected wall's name placed with its list as one block (`drawSelectedName` takes `lines`).
- *Show menu.* "Beams" (on, "Room beams and beams added to walls") and "Bands" (off, "Every wall's
  ring beam, lintel and sill bands"), after Floor below (`plan-layers.jsx`, `floor-tabs.jsx`,
  `plan-text.js`). The dot on Show means a switch that is on by default is off
  (`plan-show-menu.jsx`), so Bands off by default doesn't show it.

Tests: web `building-plan-wall-beams-draw.test.js` (6: which show, at rest, with Bands, with
Beams off, the selected wall's; the list's order; the two colours and the clip; a name outside
the room; the canvas drawing them and hiding room beams; the selected wall's block), the canvas
ones failing with HEAD's canvas; `building-plan-show-menu.test.jsx` (the two switches, the dot),
failing with HEAD's four files. Web 472 of 478 (the worker tests).

Headless on the test page (no console errors), from `captured/state-d1-bands.json` (ring beam,
lintel band 2.30, sill band 0.80 on every wall; W1's lintel 2.45; W4 no lintel band; B#1 over the
Shared door on W3; a room beam across the Bedroom): the plan page and the Bedroom draw B#1 once,
dashed, dark over the door's gap, no bands; W1 selected: its bands drawn, "Ring beam 2.70 /
Lintel band 2.45 / Sill band 0.80" under its name; W3: "… B#1 2.00 …"; Bands on and Beams off:
every wall's bands, B#1 and the room beam gone, the dot on Show.

Hand test (D1a and D1b; restart the test page; light and dark): open
`?state=state-d1-bands.json&form=plan&show=page&width=wide` (or set the floor's three bands, W1's
lintel band 2.45, W4's lintel band No, and add a beam from W3's Beams list); View: B#1 over the
Shared door, no bands; open the Bedroom; select W1: its bands drawn and listed under its name, top
to bottom; W3: B#1 among them; W4: no lintel band. Show: Beams on, Bands off, no dot; Bands on:
every wall's bands; Beams off: B#1 and the room beam gone (the room beam can't be clicked), the dot.

Hand-tested 2026-11-25: works. Committed form0-core `69ab451`, form0-react `458824b`.

**D1c decided (2026-11-25).** An open beam or band entry (or a hovered Beams list row): on top in
the accent colour whatever the switches, other drawn beams faded; its room side's chain through
the side's ends, where rows meet and the beam's own ends (not the openings'), so its distance and
length read as its fields (a band: its wall's length); beside it, "Lintel band · 2.45 m from
floor". Problems: an opening into a band marked at the opening, other band problems at the band's
middle; the band in the error colour whatever the switches; selecting the problem selects the
band (the lower of two overlapping, named first).

**D1c: an open beam or band entry, problems on bands (core and web, 2026-11-25, hand-tested,
committed).**

- *Core, `room-sides.js`.* Each side lists its rows' wall beams and bands (`beams`: subject id,
  ends along the side of the stretch the rows cover; one stretch for a beam over two rows).
- *Core, `plan-problems.js`.* `problemRowPaths`: `paths` (to select) are the band's copies in the
  wall rows facing it (`face_beams`; the lower band of two, named first); `markPaths` (where the
  marker stands) the opening's copies when one runs into the band, else the same rows. Without a
  `face_beams` node, the wall rows as before.
- *Web, `draw/wall-beams.js`.* `shownWallBeams` gives each a tone: `accent` (selected, or the
  entry's own), `error` (a band with a problem), `faint` (the others while one is selected),
  `plain`; the accent and error ones whatever the switches, the accent one last and drawn for its
  own face. `drawWallBeams`: accent and error on a halo of the room colour, 2 px; faint at 35%.
- *Web, `room-lengths.js`.* `beamId`: the beam's side chained through its rows and its own ends.
- *Web, `draw/issue-markers.js`, `plan-problems.js`.* Wall beams found by path (a marker at their
  stretch's middle); a canvas's markers stand on `markPaths`, its items select `paths[0]`.
- *Web, legacy canvas (wiring).* `selectedWallBeamId` (selected from a problem or a list row,
  never by a press; cleared by the next press on an editable canvas), reported as `wallBeams`;
  the entry's own from the canvas's focus; the snapshot's `problems` for the error tone; the
  selected one's name and height (`plan.beam.height`) beside it in its room; its lengths.
- *Web, `form-renderer.jsx`.* A wall beam's entry (`face_beams`, `wall_beams`) marks
  `{ collection: 'wallBeams', id: face:beam }`, as doors and windows.

Tests: core `building-plan-room-sides.test.js` (a side's beams from both rooms), and
`building-plan-plan-problems.test.js` (the band selected, the door marked; a band of its own; two
bands overlapping, the lower selected), failing with HEAD's two files; web
`building-plan-wall-beams-draw.test.js` (tones; selected from a problem: reported, named with its
height, its lengths, the entry's own the same; a marker on a band; a problem's item and markers)
and `building-plan-room-lengths.test.js` (a beam's chain without the door's ends), failing with
HEAD's five files. The entry mapping in `form-renderer.jsx` was checked on the test page. Core 826
of 826 and the plain test scripts; web 476 of 482 (the worker tests).

Headless on the test page (no console errors): W3's entry, Beams, B#1: B#1 in accent, "B#1 · 2.00
m from floor", the bottom side 3.00 | 0.45 | 1.20 | 0.35 (its distance from W3's start as the
Bedroom counts it, 0.35), the room at half strength; W1's Lintel band: along W1 in accent, "Lintel
band · 2.45 m from floor", 5.00, B#1 faint. From `captured/state-d1c-problem.json` (the floor's
lintel band at 1.9, kept): W3's band red with the marker at the Shared door, Bands off; "1 issue",
its item: the band in accent, "Lintel band · 1.90 m from floor", 3.00 | 2.00, the marker kept.

Hand test (restart the test page; light and dark): open
`?state=state-d1-bands.json&form=plan&show=page&width=wide`, the Bedroom; double-click W3 (away
from the door), Beams, B#1: B#1 in the accent colour with "B#1 · 2.00 m from floor" and its
lengths; back, W1's Lintel band: the band along W1 with its height, B#1 faded; hover the rows of a
Beams list: each highlighted. Then `?state=state-d1c-problem.json&…`: the Bedroom shows W3's band
red with the marker at the door (Bands off); "1 issue", its item: the band selected with its
lengths and height; a press elsewhere clears it; the floor entry's Save: Validation lists it, a
click selects the band.

Hand-tested 2026-11-25: works. Committed form0-core `0c79f86`, form0-react `cc8dcf9`.

### A: the read-only front view (aligning 2026-11-25)

Mockup round 3: https://claude.ai/artifact/VTrTopfPtKR3GivVhnWq4S (W1's entry, the Bedroom's
entry with arrows, W#1's entry, W4 of unknown height; H1 and H2).

Agreed (2026-11-25):

1. *Heights: H1.* Levels from the floor on the left; on the right a chain of partial lengths
   through every level of the shown wall (its top, each band's and beam's underside and top, each
   opening's sill and head; W1: 0.80 / 0.20 / 1.45 / 0.25 / 0.30), the whole height outside it.
2. *Short partials* (a pill longer than its stretch) step aside, alternating, with a leader.
3. *Along the bottom:* the shown wall's rows and openings, from the wall's own left end (WB3),
   the whole side under them (as the plan's selected wall).
4. *Element entries* (door, window, wall beam or band) get Front too, the element in the accent
   colour, the rest at half strength, its own lengths only (its ends; its sill, head and the top).
   In A, as its last unit.
5. *Show is hidden in Front*: bands, beams and lengths always show there.
6. *A wall of unknown height:* drawn with a dashed top and "Height unknown", no top level in the
   chain, no ring beam (its top is the wall's). It happens: the floor's height is required only on
   enclosed levels (an open level's parapets), and on a floor not filled in yet.
7. *Free walls are in* (asked by the user; proposed below): a free wall's entry shows it from its
   row's side ("This side"), its own length (no corners to run to); the room's arrows step
   through the Walls list's rows, free walls included.

Proposed after the user's comments (2026-11-25), to confirm at the start of A:

- *The Plan | Front switch is always in view*, disabled where there is no wall to show (the plan
  page and floor entries), its tooltip saying where it works; nothing appears or disappears.
- *The wall line is always there in Front*: "W1 · 1 of 1" with the arrows disabled in a wall's or
  an element's entry; drawn inside the view (an overlay at its top, as the zoom controls are at
  its bottom), so switching Plan and Front doesn't change the panel's size.
- *Which view an entry opens on*: a wall beam's or band's entry opens on Front (in plan it is
  only a dashed outline; its heights are its fields); every other entry on Plan (doors and
  windows read best in plan; Front is a click away). Per dialog, not remembered.
- *One scale per room*: fitted so the room's longest wall side and tallest wall fit the panel,
  kept while stepping through its walls and the same in that room's wall and element entries;
  text at a fixed screen size; refitted only when the panel changes size. Plan and Front keep
  their own zoom.
- *Unknown height's drawing*: to the floor's height when it has one; else to the highest level on
  the wall plus 0.5 m (at least 1 m).

How (proposed): core gives the facts (a new module: the front view of one room face, in metres
from the room's own left end: the side's walls with their heights, openings, wall beams and
bands, problem overlaps, the levels; the canvas controller exposes it for the wall shown,
computed on demand); the web draws it with a new SVG component (read-only, sharp text at fixed
screen sizes, the theme's tokens, testable in jsdom), not in the legacy canvas. Units: **A1**
core (free walls included); **A2** web: the view and the switch in wall entries (disabled
elsewhere), the wall line "1 of 1"; **A3** the room entry's arrows (Alt+Shift+← / →, free in the
plan's shortcuts); **A4** element entries, beams and bands opening on Front. Web only; mobile with
step 5.

Confirmed at the start of A (2026-11-25):

- The switch always in view and disabled where unused; "W1 · 1 of 1" as an overlay (the fit
  leaves room at the top so it never covers the top level); wall beams and bands open on Front,
  every other entry on Plan.
- *One scale per room*, fitted to the room's longest row (a side, or a free wall: a diagonal one
  can be longer than any side) and its tallest wall as drawn; core gives the fit with every view.
- *Unknown height*: neither "the floor's height" nor "the room's" can apply: a wall's height is
  inherited (floor, room clear height, wall), so it is unknown only when all three are (checked in
  node: W4's height cleared with the floor at 3 m comes back 3; a shared wall between rooms of
  different heights asks which applies). Every wall of unknown height in a room is drawn to the
  room's highest level (its walls' known tops, openings' heads, beams' tops) plus 0.5 m, at least
  1 m: one height per room, so a side of two such rows has no stepped top and stepping through
  the walls doesn't move it.
- A door, window, beam or band of unknown height isn't drawn in Front (it shows on the plan and
  in its entry).
- *A row on several sides* (a jog): unfolded, its sides one after another with a fold at each
  corner. Not seen in practice: the example, the contact-jog test's wrapped plan and every row of
  each room dragged ±0.4 m all keep each row on one side (a step is a row of its own).

### A1: the front view of a wall row (core, 2026-11-25, hand-tested with A2, committed)

`front-view.js` (new): `buildingPlanFrontView(floor, faceId)`, display only, in metres from the
left end of the row's side as seen from inside its room (WB3: a row on its segment's side +1 sees
the segment's start on its left). It gives `pieces` (the side's rows corner to corner, the shown
one marked, each with `height`, null when unknown, and `drawnHeight`), `folds`, `openings` and
`beams` of every row on the side (`from`, `to`, `bottom`, `top`, the row's `faceId`, a door's or
window's `kind`, a band's `band`, `name`), `problems` (the clash areas, ids as the floor's
problems), the shown row's `levels` and the room's `fit` (`length`, `height`). A free wall is seen
from its row's side, its own length. `front-view-strip.js` (new): the parts a view is laid along
(a room row's sides, a free wall's stretches), left to right. `front-view-problems.js` (new): the
clash areas (an opening and a band, two bands: their overlap; a band above its wall: from the
wall's top; below the floor: to the floor). Wiring: `room-sides.js` gives each side its `edgeIds`
(a row's bindings name theirs); `canvas-controller.js` `frontView(faceId)` for the floor shown,
computed when asked. Tests `building-plan-front-view.test.js` (7: W1 with its bands and a window,
levels 0 / 0.6 / 0.9 / 2.1 / 2.4 / 2.7 / 3; the W3 / W3.2 side from either row, the Shared door
0.5 m in from the Bedroom and 0.6 m from Room 2, as their entries say; a free wall; unknown
heights, 2.90 then 3.25 for every wall of the Bedroom, 1 m for an empty room, no ring beam; the
overlap of a window and the lintel band, a band above its wall and the fit over it; a row on two
sides unfolded, read the same from an outline wound either way; the controller) and
`building-plan-front-view-invariants.test.js` (11 plans: one fit per room, the pieces end to end
and the row shown whole, what the canvas puts on each row in its view inside the row and the fit,
levels rising from the floor, one drawn height per room above every level). Failing with HEAD's
`room-sides.js` (5 of 7) and `canvas-controller.js` (the controller test); the unfold case fails
without the reversal for an outline wound the other way. Core 834 of 834. Nothing to see on the
test page until A2.

### A2: the front view in a wall's entry (web, 2026-11-26, hand-tested, committed)

Decided at its start (2026-11-26): zoom and pan in Front now, not later (Front opens at the room's
fit, 100%; wheel, the zoom pill and Shift-drag or the middle button act on Front only; each view
keeps its zoom while the dialog is open; "Fit view" returns to the fit); Show disabled in Front,
its tooltip "Front always shows bands, beams and lengths" (disable rather than hide, replacing
round 3's "hidden"); the status line keeps the plan's hint, so a double-click opens a part's entry
in Front as on the plan (the user's point: in a view-only entry a click selects nothing, a
double-click opens the door, window, wall beam or band; another room's or the entry's own wall
opens nothing, as on the plan), its note "lengths in metres" (feet) as Front always shows them; an
issue picked in the "n issues" list is selected in both views: Front marks it in the accent colour
when it shows its element, else Front switches to Plan, where the issue is selected (the user
asked for both views; one Front can't show has nowhere to be marked there).

Core: `front-view-refs.js` (new): `canvasController.frontView` gives each piece, opening and beam
its canvas element, `ref: { collection, id, path }` (found in the snapshot by subject and row, so
the web doesn't rebuild ids), for a double-click (`controller.focus`), the plan's selection and
the issues' markers. Test: the controller case of `building-plan-front-view.test.js` checks every
part's ref against the snapshot (failing without the refs).

Web, `src/building-plan/front/` (new): `front-camera.js` (one scale per room, fitted in the panel
less 64 / 200 / 48 / 100 px for the levels, the chains, the wall line and the bottom lengths; zoom
0.5 to 8 times the fit about a point; the room's fitted height centred, so every wall of a room
stands on one floor line), `front-shapes.js` (walls, the side's other rows at 0.32, elements with
names inside when they fit, a band's at its right end, clash areas, folds, the selected element,
a "!" on each element with an issue at its top right), `front-chains.js` (H1: levels on the left,
kept 12 px apart; the partial lengths on the right, a pill longer than its stretch stepped aside in
two columns with a leader; the whole height outside when known; along the bottom the row's ends
and its openings', a short pill stepped up then down; the whole side under them when there is
more than one stretch), `front-svg.jsx`, `front-view.jsx` (measured box, wheel, pan,
double-click, the wall line "‹ W1 · 1 of 1 ›" with its arrows disabled), `view-switch.jsx` (Plan |
Front, disabled with "Front: open a wall's entry" where unused), `use-front-view.js` (per dialog,
on Plan at first; while on, follows every canvas update), `front-view.css.js` (plan tokens; the
wall's face and a beam mixed from them). `plan-stage.jsx` (new): the canvas panel with Front over
it (the canvas kept, hidden, so nothing moves: measured on the page, the frame matches the canvas
to the pixel, switching changes no height), the status line and the zoom pill (Front's limits and
"Fit view" in Front). Wiring: `canvas-host.jsx` (291 lines: the history props moved into
`use-plan-history.js`, the panel into `plan-stage.jsx`), the selected element kept whole
(`canvas-host-mount.js`), `floor-tabs.jsx` (the switch first at the end; Show's hint),
`plan-show-menu.jsx` (`disabledHint`), `zoom-controls.jsx` (`limits`, `fitLabel`), texts in
`plan-text.js`.

Tests: `building-plan-front-layout.test.js` (17: the fit, a shorter wall on the same floor line,
zoom about a point and its limits; W1's shapes to scale, names inside, a thin band unnamed, a hand
beam named in its middle, faded rows, the selection and markers, unknown height, folds and clash
areas; levels, the partial chain, stepped pills, no whole height when unknown, the bottom chain,
the side under it or not, a side of two rows, short bottom pills stepped) and
`building-plan-front-view.test.jsx` (the switch disabled in the floor's and room's entries, Front
in W1's entry: its bands, window and lengths, the wall line, Show disabled, the status note, its
own zoom kept across switches, the issue selected in Front, a double-click opening the band's
entry). Failing with HEAD's `canvas-host.jsx` (no switch) and with core's `frontView` without
refs (the issue not selected in Front). Web 494 of 500 (the 6 known worker failures), core 834 of
834. Checked headless on the test page (`state-d1c-problem.json`, light and dark): the switch
disabled on the floors page and in the Bedroom's entry, W2 and W3 in Front (W3: the Shared door,
B#1 over it, the clash with the lintel band, W3.2 faded, stepped pills 0.10 / 0.15 / 0.10), the
issue selected in Front, zoom 125% then 228% with the plan kept at 106%, a double-click on the
lintel band opening its entry; no page errors.

Hand test, first round (2026-11-26): every entry's canvas started short and grew for seconds
(Plan and Front; not the plan page), and the form felt slower. Cause: in a three-column entry
`plan-entry-layout.css.js` stretches `.building-plan-canvas-panel` to its card; A2 put it inside a
stage that didn't stretch, so the panel took its content's height and the canvas, sized to its
container, added the container's border at each resize (393 to 551 px in 4 s, measured headless;
749 px at once with HEAD's host). Fix: the stage is `.building-plan-canvas-stage` (in
`canvas-host.css.js`, sized as the panel was) and the entry layout stretches it as it does the
panel; measured again: 749 px from the first frame in the room's and W3's entries, Plan and Front,
the plan page unchanged. Raised in the same hand test, to decide: a click selecting in a wall's
entry (view-only canvases take no press but the double-click's, since 1d; the room's entry edits,
so a click selects there), an entry opened by double-click opening on the view it came from (with
A3 and A4), and a mini-map in Front (mockup round 4:
https://claude.ai/artifact/Dbk7tXCWjNRQWDGmuh4peb).

Hand test, second round (2026-11-26): the canvas no longer grows and the form isn't slow. Committed:
core `55a9075` (A1 and the parts' canvas elements), web `95b0363`.

Decided after it (2026-11-26):

- *A click selects in view-only entries* (a wall's, a door's…), in Plan and Front as in the room's
  entry: the element selected and its row marked in the entry's list, a click on nothing back to
  the entry's own element, nothing dragged. Its own unit, next.
- *A double-click opens on the view it came from*: an entry opened by double-click, and every
  dialog opened on the way to it, opens on the view double-clicked in; one opened from a list
  keeps its default (wall beams and bands on Front, the rest on Plan). With A3 and A4.
- *A mini-map in Front*, as recommended in round 4: P2 (bottom left; the fit reserves a wider left
  margin), V1 (a cone to the shown wall's ends), O1 (drawn as the plan), a ring at the wall's 0
  end, the room only, display only in a wall's entry (a click shows a wall in a room's, A3); core
  gives its facts. Its own unit after the click selection. The user asked where the cone starts in
  a very irregular room: proposed, to confirm at the start of that unit (shown on an L-shaped room
  in the mockup), in front of the shown wall's middle along its inward normal, half the wall's
  length away (a cone of about 90°) but no further than 80% of the free distance to the first wall
  that normal meets, the cone clipped to the room's floor; a row on several sides from its longest
  part, a free wall from its row's side.
- Order: the click selection, the mini-map, A3, A4.

### A click selects on locked canvases (2026-11-26, to hand-test)

Decided (2026-11-26): every locked plan canvas (view-only entries: a wall's, a door's, a window's,
a column's, a beam's; a read-only record's floor and room entries) selects what a click hits, as
a room's entry does, nothing moving: on a canvas scoped to a room a door, window, column, room
beam or wall (nothing in a faded room; wall beams and bands not by a plan press, WB10), on a
floor's canvas the room of what the click hits (as an editable Floor canvas does). A click on
nothing goes back to the entry's own element (a read-only floor or room entry: nothing); a drag
picks nothing; data refreshes keep the pick; a hovered list row replaces it, as in a room's entry.
In Front a click picks a door, window, band, beam or the side's other wall (outlined then), in
both views; on nothing, the entry's own wall.

Web: `canvas-selection.js` (new): the selection fields (moved out of the legacy canvas), what a
locked press hits and what a double-click opens (`lockedPress`, the old locked press's order), a
click's release (moved under 4 px at screen scale), the pick kept ahead of the highlight
(`applyMarks`), a new highlight dropping it (`setMarks`). The legacy canvas wires them: the
locked press, the locked release, `setHighlight`/`applyHighlight`, `selectElement` on a locked
canvas a pick (an issue, a dialog opened on the way now stay selected through updates), and
`pickElement` for Front (`plan-stage.jsx` `onPick`; `front-view.jsx` `onClick`; `front-shapes.js`
the side's other wall `selected`). `form-renderer.jsx` (one line): the entry's own element now
clears its list's marked row (it kept it: a view-only entry reselected its element on every
update, which dropped the row marked on the way; picks keep their selection, so nothing does).

Tests: `building-plan-locked-pick.test.js` (8, stubbed canvases: a click picks a door, a column,
a wall; kept through refreshes; nothing or a faded room back to the own element; a drag picks
nothing; a hovered row replaces it; an issue's band kept, none or one not shown the own element; a
read-only floor picks rooms; the double-click still opens); `building-plan-front-view.test.jsx`
(a click on the window selects it in Front, on nothing the own wall). Failing with HEAD's legacy
canvas (4 of 8 and the Front test; the other 4 hold there too, nothing being picked). Web 502 of
508 (the 6 known worker failures). Headless on the test page: W3's entry with its Doors list, a
click on the Shared door selects it and marks its row, on the floor clears both, a drag from the
door picks nothing; in Front the door and the lintel band, the band then selected on the plan with
its height line; a read-only record's Bedroom entry with its Walls list, a click on W1 marks it, on
the floor clears it; no page errors.

Click selection hand-tested and committed: web `616231c` (2026-11-26).

### Lintel and sill bands 150 mm deep by default (core, 2026-11-26, hand-tested, committed)

Asked by the user (2026-11-26): until the floor's depth is typed (it is required once a band is
Yes), a lintel or sill band is 150 mm deep, not 300; the ring beam stays 300 mm, as a beam added by
hand (`NEW_BEAM_DEPTH`). The sill band keeps its top at a new window's sill (0.9 m), so its
default underside is 0.75 m (was 0.60); the lintel band's stays 2.10 m (a new window's head). A
floor with typed depths is unchanged; one left empty (a draft) shows the new depth at its next
update. Core `band-rows.js` (`BAND_DEPTH`). Tests: `building-plan-band-rows.test.js` (new: without
the floor's depths, lintel and sill 150 mm at 2.10 and 0.75, the ring beam 300 mm at 2.70; failing
before), and the expectations that read the old default (`building-plan-front-view.test.js`:
W1's levels now 0 / 0.75 / 0.9 / 2.1 / 2.25 / 2.7 / 3, unknown heights drawn to 2.75 then 3.10,
the window's clash 1.90 to 2.05, the band above W2 to 3.55; the split's rows and a face's band in
`building-plan-band-rows` and `building-plan-canvas-wall-beams`). Core 835 of 835; web 502 of 508
(the 6 known worker failures; none read the default).

### Columns and room beams in Front (2026-11-26, hand-tested, committed)

Decided (2026-11-26): Front draws the room's columns and room beams whose footprint or body
touches the shown side's face (within 1 mm, standing against it or set into it); no free-standing
ones. A column from the floor to its height (unknown: its wall's drawn height, the top dashed),
over the bands, outlined (1.5 px) in a tone of its own (the hand test dropped the plan's diagonal
cross: in an elevation a cross reads as an opening or void and hatching as cut material, while
elevations draw what stands in front of a wall by its outline); a room beam at its underside and
depth (unknown: not drawn), with a section cross when it meets the wall across (seen end on), plain
when it lies along it; those of the side's other row faded. Columns add their edges to the bottom
chain; no heights in the chains (beam undersides left out, the user: too much). Clicks as for every
part (a click selects; a double-click opens a room row where the entry allows it: from a room's
entry, not a wall's). Done before the mini-map, which waits for the cone's start to be confirmed
(mockup round 4 updated with an L-shaped room).

Core: `front-view-structure.js` (new): the columns and room beams against a strip (a column's box
turned by its rotation, a beam's body from `beamOutline`, cut along the faces it stops on; touching
a part's face from the room's side; their stretch along the strip and the row they stand
against), and the room's columns' and beams' tops, which now count toward its highest level (the
fit, a wall of unknown height). `front-view.js` gives `columns` and `roomBeams`;
`front-view-refs.js` their canvas elements (`columns`, `beams`). Tests: `building-plan-front-view.
test.js` (new: C#1 against W1 and C#2 set into it, a free-standing column left out; B#1 across from
W1 to W3.2 end on, on both sides; B#2 along W4 side on; their refs through the controller) and
the invariants (a plan with columns and beams: inside their rows, from the floor, within the fit).
Failing with HEAD's `front-view.js`. Core 836 of 836.

Web: `front-shapes.js` (columns named at the top when they fit; room beams named inside, or above
when they don't, as one seen end on), `front-chains.js` (the shown row's columns' edges along the
bottom), `front-svg.jsx` (`Element` with a diagonal cross and a dashed unknown top), the chains'
drawing moved to `front-chains-svg.jsx` (new), `front-view.css.js` (a column's fill), the parts
open and pick (`front-view.jsx`), an issue on one stays in Front (`use-front-view.js`). Tests:
`building-plan-front-layout.test.js` (3 new: columns to scale, faded, selected, unknown; room
beams end on and along with their names and a marker; the columns' edges in the bottom chain, no
levels; failing before). Web 504 of 511 (the 6 known worker failures and the known flaky "keeps
numeric setters numeric"; a run before had the reset test flake instead, passing alone). Headless on
the test page (`state-a2-structure.json`, built in node: the bands, W#1, two columns against W1,
one free-standing, a beam across and one along W4): W1 shows C#1, C#2 and B#1 end on, the bottom
chain 0.85 / 0.30 / 0.75 / 1.00 / 0.90 / 0.40 / 0.80, the bands at 150 mm; W3 the beam's other
end; W4 the beam along it; the free-standing column nowhere; a click selects C#1, a double-click
opens nothing from a wall's entry; no page errors.

Hand-tested (2026-11-26), the columns' cross dropped as above, and committed: core `0ddd98b`
(the band default), core `3e36596` and web `fa34673` (columns and room beams). The mini-map's
cone confirmed as proposed (in front of the shown wall's middle, half its length in, at most 80% of
the way to the first wall ahead, clipped to the floor). Raised in the same hand test, to decide: a
switch in code for the click selection on locked canvases (new or old behaviour), and double-click
on columns and room beams from a wall's entry (they open only from their room's entry, as every
entry opens only its own rows, 2026-11-22).

### The click selection's switch and "open it from" (2026-11-26, hand-tested, committed)

Decided (2026-11-26): the click selection on locked canvases becomes an option in code only,
**off by default** (flipped after the hand test, so a selectable element doesn't suggest it opens):
`FormRenderer`'s `buildingPlanLockedSelection` (true turns it on; off gives the old behaviour
exactly: a click selects nothing, an issue's selection isn't kept through updates, a click in Front
does nothing, the list's marked row stays when the entry's own element comes back; the
double-click as before). The confusion the user met: a selectable element looked openable, but an
entry opens only its own rows (2026-11-22), so a column or room beam doesn't open from a wall's
entry. Kept as it is (not opened on top of W1's entry, whose dialogs underneath wouldn't be its
parents; not by leaving W1's entry), and said: a double-click on a row outside the entry's reach
(neither the entry, a parent of it, nor below it) shows "C#1 belongs to Bedroom: open it from
Bedroom's entry" in the status line (its row's parent), until the next press; in Plan and Front.

Web: `FormRenderer` prop through the dialogs (beside `buildingPlanDerivedCommands`) and the plan
page (`section-view.jsx`) to `BuildingPlanCanvasHost` `lockedSelection`, set on the canvas at
mount; `canvas-selection.js` `picksOn` (locked and not switched off) gates a click's release,
`selectElement`'s pick and `pickElement`; `form-renderer.jsx` `markPlanRow` keeps its early return
when off; `entry-chain.js` `isElsewhere`; the entry's `focusRow` returns `{ elsewhere: { name,
owner } }` (row titles) when it opens nothing for such a row, `canvas-host-mount.js` shows it as
the hint `plan.status.openElsewhere`; hints carry parameters (`showHint(key, params)`, the status
`hintParams`, `plan-status.jsx` filling a placeholder the hint names, the others key caps); Front
drops its lengths note under such a hint, as the canvas does. The test page: `&lockedSelection=on`
(harness `preview.mjs`, README). Comments marking the option: the prop in `form-renderer.jsx`,
`canvas-selection.js`.

Tests: `building-plan-entry-chain.test.js` (`isElsewhere`: the entry, its room, its door, a
column, another wall's door, another room), `building-plan-locked-pick.test.js` (switched off: a
click selects nothing, the double-click opens, an issue's band not kept through a refresh),
`building-plan-front-view.test.jsx` (a column against W1 in its fixture; a double-click on it in
Front says where it opens, no dialog; by default, a click in Front selects nothing and a
double-click opens; the Front test turns the option on for its clicks). Failing with HEAD's `form-renderer.jsx` (the two form cases) and legacy
canvas (the switched-off case). Web 509 of 515 (the 6 known worker failures). Headless on the test
page (`state-a2-structure.json`): W1's entry, a double-click on C#1 on the plan and in Front shows
the hint, the next press the usual one; by default a click on W#1 on the plan and in Front selects
and marks nothing, its double-click opens it; with `&lockedSelection=on` the click selects it and
marks its row; no page errors. Committed: web `971f709`.

### The mini-map in Front (2026-11-26, hand-tested, committed)

Decided with mockup round 4 (https://claude.ai/artifact/Dbk7tXCWjNRQWDGmuh4peb) and built as
decided: P2 (bottom left), V1 (a cone to the shown row's ends from in front of its middle, along its
inward normal, half its length in, at most 80% of the way to the first wall ahead, clipped to the
floor; a row on several sides from its longest part, a free wall from its row's side), O1 (as the
plan, not turned), a ring at the row's 0 end (its left end seen from inside, WB3), the room only,
display only. Details taken as defaults at the unit's start (the user: proceed unless questions):

- *Walls*: the plan's wall material (the canvas's footprints, openings cut) kept to the room: its
  floor and, outside each edge, a band as deep as the wall bound to it (a cap's: its source wall),
  mitred at outer corners. Neighbours' walls are left out, a corner they share is drawn; walls of
  unknown thickness are the plan's lines.
- *The first wall ahead*: the room's outline and its free walls (not the one shown).
- *The card*: 136 × 84 px; columns and room beams not drawn (not in the decided contents).

Found on the page: the status line sits in the panel's bottom-left corner (28 px tall, 8 px up;
the mockup had it below the panel) and covered the card. The card now sits above it (46 px up)
and the fit's bottom margin grows from 100 to 136 px, so the card stays under the floor line. No cost
for a wall that fits across, the usual case in an entry's tall panel; in a view fitted up it also
keeps the side's length pill off the status line. The left margin grows from 64 to 160 px (the card
plus 14 px): W1 at 94 px/m in a wall entry's 826 × 747 panel, was 112 (16% smaller, as the mockup
showed for P2).

Core: `front-view-map.js` (new): the front view's `map`, plan metres: `outline`, `walls`, `lines`,
`shown`, `others`, `zero`, `eye`, `cone`, `bounds`. `front-view-map-walls.js` (new): the room's
walls, `buildingPlanFootprints` clipped to the room's region (`clipToConvex`). Wiring:
`footprints.js` exports `halfPlane`; `front-view.js` gives `map`. Tests:
`building-plan-front-view-map.test.js` (new, 4: W1 seen from 2.4 m in, 80% of the 3 m to W3, the
room's walls and corners, the window and the Shared door as gaps, Room 2's walls left out; W3 with
W3.2 as the side's other row, 1 m in, half its length, and from Room 2 its own map; a free wall
seen from its row's side, and as the first wall ahead of W1, 1.12 m in; a bump in a room's outline
that clips the cone; walls of unknown thickness as lines) and the invariants (11 plans: the eye
and the cone on the floor, the row shown whole from its 0 end, the walls within the room's bounds
plus the thickest wall). Failing with HEAD's `front-view.js` (no map). Core 840 of 840.

Web: `front-map.js` (new: `FRONT_MAP`, the card's size and place; `frontMapLayout`, the map fitted
in the card, px), `front-map-svg.jsx` (new: the card: floor, cone, walls, lines, the side's other
rows, the shown row, the eye, the ring; `data-map` on each), `front-view.jsx` (the card after the
wall line), `front-camera.js` (margins left 160, bottom 136), `front-view.css.js` (the card on the
plan tokens: walls in `wallFaint` as in the mockup, the shown row, eye and cone in the accent),
`plan-text.js` (`plan.front.map`, "Where {wall} is seen from"). Tests:
`building-plan-front-map.test.js` (new, 3: W1's map in its card at 20 px/m; the side's other row,
lines, no cone; the card clear of the wall, the floor line and the status line),
`building-plan-front-layout.test.js` (its panel widened and heightened by the margins' growth, so
the drawing area and every y stay; every x +96), `building-plan-front-view.test.jsx` (W1's entry in
Front shows the map: W1 from its 0 end, the ring there, the cone and the walls). Failing with HEAD's
`front-camera.js` (15 layout tests) and with core's `front-view.js` without the map (the form
test). Web 512 of 518 (the 6 known worker failures).

Headless on the test page (`state-a2-structure.json`, light and dark): W1's and W3's entries in
Front; the card bottom left, 10 px above the status line, under the floor line, the wall right of
it. W1's map: its window a gap, the cone to its ends from 2.4 m in. W3's map: W3 in the accent from
its ring at x 5, W3.2 grey, the Shared door a gap, the cone from 1 m in. No page errors.

Noticed, from the columns unit (not changed here): in W3's Front, B#1 seen end on covers the
middle of the ring beam's name ("Ri⊠eam").

Hand-tested (2026-11-26, "everything works very well") and committed: core `bf86050`, web
`3b90ba0`. Raised in the hand test, to decide: a lighter cone also to the side's other rows that
Front shows (W3's map points at W3 only, W3.2 is in view too); the "View only" badge beside Show
feels out of place: say the canvas is view only on the canvas itself (an overlay or else).

### The side cone, "View only" in the status line, cursors C1 (2026-11-26, hand-tested, committed)

Raised in the mini-map's hand test and decided (2026-11-26): a lighter cone for what Front shows
beside the row; "View only" said on the canvas, not as a badge beside Show (V1: first in the status
line, an icon rather than an emoji, visible enough not to be lost; for read-only records too);
the plan page showed the arrow over rooms although a double-click opens them (asked if intended:
it followed 3c-1b's "a cursor promises only what a press does", grab meaning drag, which said
nothing about opening; the user chose C1). Three units, one hand test, separate commits.

*The side cone.* Core `front-view-map.js`: `sideCone`, from the same eye to the ends of what
Front shows (the side's, unfolded), when the side has other rows; empty for a row that is its whole
side and for a free wall. Web: `front-map.js` (`sideCone` path), `front-map-svg.jsx` (under the
row's cone), `front-view.css.js` (`mapSideCone`: the accent at 7%, no outline). Tests:
`building-plan-front-view-map.test.js` (W3's side cone to x 5 and 0, 2.5 m², none for W1 or a
free wall), the invariants (on the floor; present exactly when the side has other rows),
`building-plan-front-map.test.js` (its path). Failing with HEAD's `front-view-map.js` and
`front-map.js`.

*View only in the status line.* `plan-status.jsx` (`access`: 'view' | 'read'): a chip first in
the line, lucide's Lock (as the form's read-only fields) and "View only" or "Read only" in the text
colour on a light fill (`plan-status.css.js` `access`); the line shows with it even without a
hint. `plan-stage.jsx` passes it, `canvas-host.jsx` sets it (read-only record: "Read only", which
wins over an element's entry; an element's entry: "View only"). The badge beside Show is gone
(`floor-tabs.jsx`, `floor-tabs.css.js`); `plan.readOnly` in `plan-text.js`. Tests:
`building-plan-plan-status.test.jsx` (new, 3: the chip and its icon before the hint, "Read only"
alone, nothing on a canvas that edits; failing with HEAD's `plan-status.jsx`),
`building-plan-front-view.test.jsx` (W1's status line starts with "View only", no badge in the
floor row; the "open it from" line after the chip).

*Cursors C1, one meaning each.* `canvas-cursors.js` `hoverCursor(hover, can, { opens })`: grab,
move or a resize arrow where a press drags; the pointing hand where a press only selects and a
double-click opens (a Floor canvas and the plan page, which open the room of anything inside it);
the arrow where a press does nothing (the ground, faded elements, a room's floor in its own
entry). On a locked canvas the canvas found no elements on hover (only faded or not), so
`canvas-selection.js` `lockedCursor` asks what a double-click there does (`hitAt`, as a press):
the pointing hand over what opens or says where it opens, the arrow over the ground, faded
elements, the entry's own element and, scoped to a room, the room's floor (V1's grab before).
Wiring in the legacy canvas (`updateCursor`, the locked hover). Tests:
`building-plan-handles.test.js` (a Floor canvas and the plan page), `building-plan-locked-pick.
test.js` (new: a door, a column, another wall, its own wall, its room's floor, a faded wall, the
ground; a read-only floor's room), `building-plan-scope-levels.test.js` (the room's floor now the
arrow). Failing with HEAD's `canvas-cursors.js` and legacy canvas.

Core 840 of 840; web 515 of 522 (the 6 known worker failures and the known flaky "keeps numeric
setters numeric", passing alone). Headless on the test page (`state-a2-structure.json`, light and
dark, edit and `mode=readonly`): the plan page the pointing hand over the Bedroom and its walls,
the arrow on the ground; the Floor entry grab over the Bedroom, the pointing hand over a wall;
W1's entry the pointing hand over W#1, C#1, C#2, the free-standing column and W4, the arrow over W1,
the Bedroom's floor, faded Room 2 and the ground; "View only" (edit) and "Read only" (read-only
record, the plan page and its entries) first in the status line, no badge in the floor row; W3's
map with its side cone to W3.2's far end, none on W1's. In dark the side cone is faint. No page
errors.

Hand-tested and committed (2026-11-26): core `f3db85a` and web `2ac3680` (the side cone), web
`413c562` (View only), web `6dcbb7d` (cursors). Asked in the hand test: why the pointing hand looks
more refined than the grab hand, and whether the grab can be improved (to decide).

### Next (queue, updated 2026-11-23)

Done this round: the room tool's start preview (`40f827d`); the navigation unit, decided with a
mockup (https://claude.ai/artifact/VVdRCqjjSLKYS5xtNfjfKa): N1 rooms only from a Floor canvas
(`665230e`), N2 every level a real dialog (`9c056f5`), N3 the header path (`84b53aa`); after
their hand test, Cancel about data only (`99f5674`), a Floor canvas for rooms only (`52c9165`),
clickable breadcrumbs (`aee3e91`); the F7 note on the kept notch in reform-backend-nestjs
(`a0cbf3a`); step 2 decided (above) and built: 2a, 2a-2, 2b, 2c (core `d26df06`, web `28356e2`,
`39cec5c`); U6 (core `08b7240`, web `21d2a4a`); a shared wall shown as shared (core `2c6b3c8`,
web `b005511`, mobile `6166420`); a drawn free wall stacking on the wall below (core `f872899`).
Earlier this round: the floor below F1 to F3 and its fit, Save showing why (see "Next"
before this one in the log).

1. **Wall beams**, a core design round (open question 1; Reform checked, no blocker; see "Data
   proposals", beams on walls). 3a (today's room beams) is done: see "3a: room beams".
   Decided 2026-11-24 (WB1 to WB10, see "Wall beams"); units 0, 1, 2a, 2b, 2c and 3 done. Next:
   2d (`1651924`), 2e (`beb7c67`). Bands unit 1 (`72ad993`), unit 2 (`c723306`), unit 3 (`ae65a18`, web `371496d`), 3b (`e39cf31`, web `f8a87fd`; hand-tested 2026-11-25). 4a hand-tested and committed (see "Bands unit 4a"); a stopped Save's feedback and the nested section's highlight (`d2e2f5b`); refused typed values as field errors (core `9e629fb`, web `d510a5d`); no source tag on a refused value (`7efad5d`); 4b (core `c8d9805`, web `ccb6abb`); 4c (core `3337647`); unit 5 (core `2f592bc`, web `aad7606`); D1a/D1b (core `69ab451`, web `458824b`), D1c (core `0c79f86`, web `cc8dcf9`); A aligning (see "A: the read-only front view"). floor defaults for bands, B (see "Floor
   defaults for bands": the floor and wall answers, band rows kept in step, their values
   inherited, clashes, new openings' heights); then the drawing unit (D1, bands and local
   beams) and the front view (A, read-only). The role starter field is dropped.
2. **A drag's leftover** (core): the part of a dragged row the drag can't take (W3.2's last 20 cm
   over Room 2's wall corner) stays a row of its own with the row's copied answers. Wanted: part
   of the wall in line with it. Needs caps to follow their source wall's drags first (rule (b),
   tried and reverted 2026-11-23, made it a cap that didn't follow W3).
3. Later: the surfaces' invariants over the F4 corpus; surfaces in the derive output; Esc in the
   "n issues" list inside a dialog (the open-dropdown marker); the mobile fixture "Native titles a
   room screen with its position on the floor" ("Rooms 2" not found, failing on HEAD too).
4. Step 4 (typed lengths, a typed value's refusal under its field and in the entry's status
   line), step 5 (mobile), step 6 proposals (column placement field and canvas command). With
   step 4: rework Split's typed distance (pick the wall first, then type the distance from its 0
   end or click a length; today the box follows the pointer; hand test 2026-11-24).
5. To review: plan system fields with `reform-backend-nestjs/docs/building-plan-v2-system-fields.md`.
6. Open, small: an untouched new row's Cancel still asks (it compares as before; data-only would
   change every RepeatableSection's Add then Cancel). Kept as is unless you decide otherwise.
7. Deferred: core keeping its evaluation beside the record and writing canonical empty choices
   (would let the form drop its data-only comparison; changes exported records, so it needs a
   Reform impact check first).
8. Later, if needed: dragging rows to reorder a RepeatableSection (general feature).
9. After the planned items, mobile included: a question naming plan elements highlights them on
   the canvas behind it; what to do when they're out of view to decide then (see "Bands unit
   4c").

### Test page engine (2026-11-19)

The test page now runs the derived engine by default (`buildingPlanDerivedCommands` unless the
URL has `engine=current`), since it is the engine that stays at the switch; `replay-wall.mjs`
follows the same rule. Everything hand-tested before this ran on the current engine (the
changes were canvas and form changes, the same on both). Restart `preview.mjs` to get it.

### Capturing a plan (harness, for W3)

The test page now has a small "Save state" button (top right). It writes the live form state to
`../.local-test-harnesses/form0-ui-refresh-20261116/captured/`. `replay-wall.mjs` there lists a
saved plan's rooms and walls and replays a wall move through the canvas controller, as the canvas
sends it:

    cd form0-core
    node ../.local-test-harnesses/form0-ui-refresh-20261116/replay-wall.mjs <state.json>
    node ../.local-test-harnesses/form0-ui-refresh-20261116/replay-wall.mjs <state.json> "R#1" W3 0.4

### Opening entries by double-click (decided 2026-11-22; idea added 2026-11-21)

Raised at the M2 hand test: double-clicking a room, wall or door (on the canvas, in the issues
list, in the Floors, Rooms or Walls lists) opens entries with jumps, and it's hard to tell
where in the form you land. To review in a later round: what the page behind does (scroll),
which dialog and which part of it opens, where focus goes, and how the way back reads.

**Today (read from the code, 2026-11-21).** A double-click on a canvas, or an item in the
issues list, opens the element's own entry over the dialog you are in, skipping the levels in
between (`focusRow` in `form-renderer.jsx`): from a Floor canvas, a wall's, column's or door's
entry opens over the Floor dialog, with no Room dialog; from a Room canvas, a door's or window's
over the Room dialog, with no Wall dialog; from the plan page the Floor dialog opens, then the
element over it. Cancel closes that entry and shows the dialog below as it was left (its main
page, not a list). The header names only the list and the row ("Walls", "W3"): nothing says
which room or floor.

**Idea (maintainer, 2026-11-21).** From a Floor canvas, don't enter an element below a room
directly. Cancel goes back to the list the entry belongs to, as it does when a RepeatableSection
row is opened from its list. Breadcrumbs at the top of the form column ("Floors › Ground floor ›
Rooms › Bedroom › Walls › W3"), so it is clear where you are.

**Tied to the console's `invalid_routing_context`.** The error exists only because levels are
skipped. An entry's `change` is sent by the dialog below it (`persistRepeatableEntry`), and core
accepts a list's `change` only from the row that owns the list (the Room for `room_walls`). When
the Room dialog was skipped, the Floor sends it and core refuses it; the edit itself applies. If
no path skips a level, the owner is always open and the fix needs no new event code. If a path
still jumps (the issues list, say), the event goes one level up instead: the Floor gets a
`change` on `rooms` for that room, with the full path to the wall. The bug is on hold until the
navigation is decided.

To settle, with a mockup: one level at a time (a Floor canvas opens rooms only), the whole chain
opened down to the element (Back and Cancel step up one level, each landing in its list), or the
jump kept with breadcrumbs added; where Cancel lands; what a breadcrumb opens; the issues list;
focus and scroll.

**Direction (agreed 2026-11-21): the whole chain.** A double-click opens every level between the
canvas's entry and the element, each as a real dialog (a wall from a Floor canvas opens the Room,
then the Wall over it). Cancel and Back step up one level and land in the list the entry belongs
to, with its row marked. Breadcrumbs in the header ("Floors › Ground floor › Rooms › Bedroom ›
Walls › W3"). Chosen over a Floor canvas that opens rooms only, so one double-click still
reaches a wall. Every change is then sent by the row that owns its list, so
`invalid_routing_context` goes with no new event code. A unit of its own, right after step 3.

**What a double-click reaches, today** (editable canvases; read-only ones reach everything). It
follows what the press does, not a rule: a Floor canvas opens walls and openings but not columns
or beams, because their press returns before it records what to open.

| Canvas | Today | Proposed 2026-11-21 (replaced by the decision below) |
|---|---|---|
| Plan page | rooms, walls (the Floor, then the element over it) | as a Floor canvas, with the Floor dialog under it |
| Floor entry | rooms, walls, doors, windows | rooms; walls, columns and beams (Room › element); a door or window opens Room › Wall with its row marked |
| Room entry | walls, doors, windows, columns, beams | the same; a door or window opens Wall › Door |
| Wall entry | its doors and windows | the same |
| Door, window, column or beam entry | nothing | nothing |

Agreed 2026-11-21: the proposed column, to adjust as we go. The proposed rule: each canvas
opens what it shows at its own scale. On a zoomed-out floor a door
is a few pixels on a wall, so a double-click aimed at the wall often lands on the door. Opening
the wall, with the door's row marked, is then the right result either way. The issues list opens
the whole chain down to the field. The alternative: any element, with the whole chain (up to four
dialogs from the plan page).

Also for the mockup:

- **One Save per opened level.** Nested entries save in layers (`acceptRow` into the parent's
  draft), so a wall edited from a Floor canvas needs Save on the Wall, the Room and the Floor.
  This is the same as opening each level by hand; today the skipped Room saves one step.
- **Cancel asks before dropping saved child edits (corrected 2026-11-22).** The note here said
  Cancel on a Room holding a saved wall edit discards it without asking. That was read from the
  code, not tried, and it is wrong. Plan entries and other RepeatableSection entries share one
  Cancel: it asks ("This record has unsaved changes") whenever the entry's fields or its rows
  differ from what it opened with (`hasEntryChanges`); a saved child edit changes the entry's
  rows. Dialogs the chain opens therefore ask exactly as they do today. The headless check first
  given for this proved nothing: a Floor asks even with no edit (a false change, found at the
  N1 to N3 hand test; see there).

Today, checked headless on the fixture (2026-11-22): on a Floor canvas a room opens the Room, a
wall opens W1 over the Floor (the Room skipped), the door opens "Shared door" over the Floor (the
Room and the Wall skipped); on the plan page a room opens Floor › Room, a wall Floor › W1, the
door nothing.

**Decided (2026-11-22, with the mockup https://claude.ai/artifact/VVdRCqjjSLKYS5xtNfjfKa).**
Revises the 2026-11-21 direction.

- *Principle.* A double-click is a shortcut for clicks you could make by hand. Every dialog it
  opens is an ordinary RepeatableSection dialog: RepeatableSections inside a BuildingPlanSection
  behave like any other (Save, Cancel, titles, validation).
- *What a double-click reaches* (replaces the proposed column above):

  | Canvas | Opens |
  |---|---|
  | Plan page | rooms, as a Floor canvas: Floor › Room |
  | Floor entry | rooms only; a wall, door, window, column or beam opens its room (a shared wall: the room on the pointer's side, its face nearest the pointer, as today's hit test finds it) |
  | Room entry | walls, columns and beams; a door or window opens Wall › Door |
  | Wall entry | its doors and windows |
  | Door, window, column or beam entry | nothing |

  Chosen over the 2026-11-21 rule (a Floor canvas reaching walls and columns, a door opening
  Room › Wall): one dialog per double-click on a Floor canvas, no few-pixel targets, and the wall
  is a double-click away on the Room canvas, where it is drawn large. The cost: two double-clicks
  from a Floor canvas to a wall.
- *The issues list* (M2, "n issues" in the floor row, markers on the elements) stays as it is.
  Its double-click, and a root Validation click on a plan finding (the same `focusRow`), opens
  every level down to the row the finding is on, its field focused, from any canvas: a finding
  names a row, not a pixel. The Validation tab stays each entry's own.
- *Where each dialog opens.* The dialog you double-clicked in stays as you left it, the element
  selected (a list showing marks its row, as a selection does today). Each dialog the chain opens
  for you starts on the list towards the next level, that element selected, so its row is
  marked; the last opens on its page. Save and Cancel show the dialog below as it was: no new
  landing rule, no new row marking.
- *Where you are.* The header of every nested RepeatableSection dialog, not only plan ones, shows
  the path in place of the list's label ("Floors › Ground floor › Rooms"); the bar under it keeps
  the row's title ("Bedroom"). A first-level dialog reads as today ("Floors"), so forms without
  nested sections don't change. When the path doesn't fit between Cancel and Save, its middle
  collapses ("Floors › … › Walls"). Read only in this unit. Seen in the mockup: a list page and
  an entry opened from it share the header; the entry adds its row bar and has Cancel where the
  list has Back.
- *Cancel* asks as today (the correction above). *Save* stays one per level, with no marker for
  levels that hold changes.
- `invalid_routing_context` goes: no path skips a level, so every change is sent by the row that
  owns its list.

### Measurement units (noted for later)

`measurement_system` (si or imperial, default si) is a form attribute, not a BuildingPlanSection
one. Values are always stored in metres; core's presentation converts the form fields (m and mm,
or ft and in) and puts the unit in their labels. On the canvas only the split distance uses it.
Grid, snapping (5 m, 1 m or 10 cm by zoom) and nudges (10 cm) are metric only, so in imperial a
room can't snap to exactly 12 ft. To handle with the first lengths on the canvas (lengths while
dragging, step 3): grid and snap steps per system. 1e shows no lengths.

### Typed values and rounding (noted for step 4, 2026-11-20)

When lengths are typed (step 4), typed values must round the way the snapping does, and core's
contact and overlap checks must allow a small tolerance. Otherwise a column placed flush beside a
door, or at the end of a wall, is refused for a rounding difference.

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

**Column placement against a wall** (agreed as a follow-up of unit 3, 2026-11-20). A
single-choice system field on the column row: flush inside, centred on the wall's midline, flush
with the far face (and none, for a column standing free). Core keeps the placement when the
wall's thickness changes and when the column's size changes. Later, a canvas command to change
it (a mockup first). To settle when proposed: which wall it refers to (a corner column touches
two), and what "centred" does when the column is wider than the wall.

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
| The selected element's name | Done and committed |
| Openings on a 1 cm step (form0-react, form0-core) | Done and committed |
| W3: a wall that can't be moved | Not reproduced; "Save state" kept for next time |
| Free walls fading in their own room; remove confirmation shortcuts | Done and committed |
| A free wall selected as a whole, "This side" and "Other side" | Done and committed |
| Unit 2: free wall snapping; a free wall's thickness without a tag | Done and committed |
| Unit 3 columns: pulls, inside the room (and its walls as far as core allows), no overlaps; drawn with their diagonals; typed sizes keep columns and beams in place | Done and committed; far face and centred on room walls with 4a |
| 3b: placing by "select, then add" with an insertion mark (columns, doors, windows; web, then mobile with step 5) | Done and committed (web); mobile with step 5 |
| 4a-1: columns in core (in the room and its walls, centred ones and ones flush with a wall's interior face standing out, centres at midline junctions, no overlaps, on every derived edit; u/v limits dropped; "C#1"; sections in mm) | Done and committed |
| 4a-2: free walls kept inside their room (their drawn line, room edits included, refusals naming the wall) | Done and committed |
| 4a-3a: free walls drawn, moved and checked by their centreline (snapshot `sidePoints`, the controller converting; thickness keeps the centreline) | Done and committed |
| 4a-3b (ends cut along faces, the body kept inside the room), 4a-3c (highlighted as a whole, "This side" in its own entry), 4a-4 (bending a free wall at its split point; its return centred on it) | Done and committed |
| Derived engine: 4b (attached contents follow their wall: free walls and columns; a column keeps its placement when its wall's thickness or its size changes; a column in a corner follows a corner move) | Done and committed |
| After the 4b hand test: the L junction (inner corners built, a selected wall drawn up to its room's corner, corner tolerance 0.1 mm); a face snapped into line carries what touches it; "Save state" keeps the open plan, the test page opens a capture with `?state=` | Done and committed |
| Beams: snapping, rule 1, following their wall (left out of 4b; open question 1, wall beams or room beams) | 3a done and committed (2026-11-23): snapping, lengths, columns under beams, beams over columns, 15 by 30 cm, the name beside it, rule 1 named with core's outline, following; next wall beams as a core design round (Reform checked 2026-11-22, no blocker) |
| Caps in the record (a face's row up to the room's corner; tried and dropped: the station at the other room's corner drives face drags) | Deferred; would need the face commands reworked |
| Console `invalid_routing_context` on `room_walls` (found 2026-11-21: an entry opened from a canvas skips levels, so its change is sent by a row that doesn't own the list; the edit applies) | Gone with N2 (every level a real dialog); committed |
| Column placement field and canvas command | Step 6 proposal |
| Plan system fields (legacy column and beam wall fields among them) | To review with `reform-backend-nestjs/docs/building-plan-v2-system-fields.md` |
| `canvas-host.jsx` split (move only) | Done and committed (2026-11-20) |
| Opening entries by double-click (jumps) | Done and committed (N1 rooms only from a Floor canvas, N2 every level a real dialog, N3 the header path, clickable breadcrumbs; Cancel about data only; a Floor canvas for rooms only) |
| Step 3 decisions (handles, cursors, lengths, pin badge) | Decided 2026-11-21 |
| 3c-1: handles, cursors and the pin badge | Done and committed |
| 3c-1b: cursors and handles follow what the canvas allows; the dragged handle filled | Done and committed |
| 3c-2: lengths for doors, windows and a room being drawn (`draw/dimensions.js`) | Done and committed |
| Plan shortcuts in the top dialog only; Cancel's refusal names the edit in the way (form0-react, form0-core) | Done and committed |
| 3c-2b: a room being drawn snaps; the full chain along a side with several openings | Done and committed |
| Undo and Redo off in an entry with nothing of its own to undo (form0-react, form0-core) | Done and committed |
| 3c-3: lengths for room walls and corners | Done and committed |
| A length shorter than its pill: the pill outside its segment | Done and committed with 2c (S11) |
| A pushed wall: the neighbour's indent kept (option 2 decided) | Done (core `bcd0861`: entry return, scope plans, the canvas's preview scope; hand-tested 2026-11-22) |
| A new entry's Undo removed its own row (core: the opening edit) | Done and committed |
| The stray cap piece (core footprints); a floor's number in its title | Done and committed |
| Floors shown by level (list and tabs; display only) | Done and committed |
| 3c-4: lengths for free walls and columns | Done and committed |
| A split point holds its wall's line; a free wall's return can be moved (core) | Done and committed |
| Step 3 | Done (2026-11-22); see "Step 3: wrap-up" |
| The floor below (F1 a new floor's entry shows its floor, F2 drawn, F3 pulls, an empty floor fitted to it) | Done and committed, with the room tool's start preview; free walls and columns (U6) too |
| A drawn free wall stacking on the wall below (midlines below for its ends) | Done and committed (core) |
| Save with a required plan field cleared shows the validation | Done and committed |
| Step 2 (lengths, plaster, Show menu) | Done and committed (2a, 2a-2, 2b, 2c; 2026-11-23) |
| A shared wall shown as shared (a wall's own height beats its rooms' by design; option 1) | Done and committed (A: the icon and note; C: "Whole wall" / "Shared wall"; mobile: the words) |
| Mobile fixture "Native titles a room screen with its position on the floor" ("Rooms 2" not found) | Failing on HEAD too, found 2026-11-23; not traced |
| Step 4 (with a typed value's refusal under its field and in the entry's status line), step 5 | To do |
| Step 6 | Proposals |

## Open questions

1. Beams: wall beams under Wall (proposed) or under Room with a wall reference. Whether "over
   an opening" / "under a window" / "top of the wall" keep the beam's height in step with that
   element (the window's head changes, the beam moves; core derives the height) or only set it
   once (the beam keeps its number). Following needs to know which opening; the beam's own span
   could tell (the opening under it). Reform impact checked 2026-11-22: additive, no blocker
   (see "Step 2: decisions", beams); to settle in the wall beams design round after 3a.
   Decided 2026-11-24: under the physical wall, the height stored (P2) and kept in step by
   contact, no opening reference (see "Wall beams").
2. Plaster: answered 2026-11-19. The recorded wall thickness is the wall only; plaster is
   additional, so its band is drawn on the face, into the room.
3. Same label on both faces of a wall field (found at M2). Agreed 2026-11-19, done (see
   above). Proposed: (a) in form0-react, the
   findings carry the tag the form shows after the label, so the Validation tab and the issues
   list read "Finish · Exterior" (the outside copy is its own data name, `finish_outside`, and
   the plan metadata marks it `outside`); (b) in core's example schema, "Room-side finish"
   becomes "Finish", since the form tags the side. Not proposed: core rewriting the copy's label
   in the contract (English text in the schema, shown twice next to the tag).
