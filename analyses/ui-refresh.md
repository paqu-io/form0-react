# UI refresh: plan and change log

Tracks the default-styling refresh for `form0-react` and `form0-react-native`
(issues form0-react#77 and form0-react-native#45), and later the two starter templates.

- Mockups: https://claude.ai/artifact/JgvW22r7DGSLXaNPux7WeB (private)
- Building plan round mockups: https://claude.ai/artifact/GPW3m7Tiq9XvEERPMoxYVB (private;
  steps 5 and 10, door swing, dimensions, open decisions)
- Branch: `feat/ui-refresh`, from `experiment/building-plan-model`
- Chosen base: proposal **A (Refined)**. Parts of B may be added later, one at a time.

## Rules for this work

1. The engine and form logic are not touched. Anything that needs new logic is listed under
   "Needs a decision" and is not started without agreement.
2. Cosmetic steps come first, riskier structural steps after.
3. Nothing is committed until it has been tested by hand.
4. Every step is logged below with the files it touched, so a single step can be reverted.

## Where things live

| Area | Libraries | Templates |
|---|---|---|
| Colour | Neutral default palette, correct dark mode | Brand accent through a theme override |
| Sizing, spacing, radius | Yes | Only through tokens |
| Hover, focus, pressed, disabled, read-only, error | Yes | No |
| Tokens | Same names on web and mobile; no hardcoded colours | Consume them |
| Building plan layout | Yes | No |
| Extras (shadcn date picker, per-button override example) | No | Yes |

## Compatibility constraints

- **Web theme contract.** Reform builds its theme with `createTheme(vars, {...})`, which needs
  every key of the contract. New state colours are therefore derived from existing tokens with
  `color-mix` (`src/theme-derived.css.js`), not added to `vars`.
- **Generated class names.** Reform and the web template select
  `[class*="field-renderer_labelInputRow"]` and `[class*="field-renderer_labelRow"]`. Those
  style export names stay as they are.
- **Mobile theme.** `customTheme` is deep-merged, so new tokens are safe to add.
- **Reform versions.** Reform web is on `form0-react` 0.4.0 and Reform mobile on
  `form0-react-native` 0.2.1. Upgrading Reform is a separate step.

## Decisions so far

| Topic | Decision |
|---|---|
| Base direction | A (Refined) |
| Sections and issues panel | Kept. Left of the form on web. On mobile it still opens by tapping the title; a small chevron after the title marks it as openable and a small count shows only while there are issues. The mobile header stays on one line: icon-only Back, truncated title, Submit |
| Add buttons in repeatable lists | Primary style, like Submit |
| Error row | Always reserved under each control, so an error never shifts the layout. Field spacing is tightened to make up for it |
| Yes/No fields | Two or three options (`third_option_enabled`); long labels wrap inside their option |
| Header button size | 36px, like every control. The header stays 48px high, as before |
| Navigation panel height | It has no box of its own: panel and form share one tinted surface, so the panel cannot look cut short |
| Empty repeatable list | Keeps growing with its entries; while empty it shows a fixed-height dashed area |
| Form name and record row | Two separate rows, as today. The record row (status colour, record title) is unchanged |
| Coloured left edge | Kept on drill-down rows and expanded drill-down sections, same colour for plain and repeatable. Also kept in the navigation panel for the current section and its parents |
| Section kind in the navigation panel | An icon after the name: one chevron for a section that opens separately, a double chevron for a repeatable one, none for inline |
| Mode indicator | A small EDITING / VIEWING pill beside the title replaces the full-width strip (the strip stays in simplified mode) |
| Title position | Centred in the form: both sides reserve the width of the wider button group, so the title does not move when a button appears on one side |
| Accent edge shape | An inset, straight, rounded bar instead of a border that bends with the corners |
| Modal and spotlight | The form draws no outer frame; the host dialog is the container (trial, to review) |
| Tooltips | One themed library tooltip, to be done with the building plan (step 5). No shadcn or new dependency |
| Web on phone browsers | Not a target: mobile is the React Native app |
| Navigation tab size | 14px, same as the section links |
| Nested sections | Flat: only the top section is a card. Every nested level keeps a filled, full-width header band showing the path to it ("Structure › Roof › Covering"). A long path keeps the two nearest parents and collapses the rest into "…" |
| Separation between inline sections | Stronger: tinted form background, filled header band, wider gap |
| Dialog buttons | The first button is the primary one; schema order is kept |
| Inherited values | Variant 1: source tag inside the field, becomes the reset button once overridden |
| Mobile plan editor | Bottom sheet (structural, step 10) |
| Keyboard bar (previous / next / done) | Wanted, pending a fit check (step 11) |
| Section "3 of 3" counts | Not in this round |
| Mobile keyboard handling | Fix inside `form0-react-native`, no new dependency, automated and manual tests |
| Presentations | Standard, modal, spotlight and simplified now share one palette (simplified lost its green) |

## How each request fits the current code

| Request | What exists today | Effect on logic |
|---|---|---|
| Choice modes | Web: `display: "radio"` / `"checkbox"` gives a list; anything else gives a native `<select>` (`multiple` for multi choice). Mobile: a modal picker. | Restyling both modes is cosmetic. |
| Choice search | The schema rejects `is_searchable: true` when `display` is `"radio"` (`form0-core/src/schema/field-specs.js`), so search is dropdown-only by rule. Mobile implements it for single and multiple choice (`is_searchable` with `is_searchable_mode: "default"`). **Web does not implement it at all.** | Mobile: cosmetic. Web: a custom list with search is a new feature. |
| Supporting image | `supporting_image_display`: `"dialog"` or inline. Descriptions: `description_mode: "subtext"` or dialog. | Cosmetic. |
| ALERT / MESSAGEBOX | One managed dialog: title, message, optional input, any number of buttons, all with one style. The first button gets focus. | Cosmetic. |
| Nested sections | Web: each nested `Section` is another bordered, padded box. Mobile: a card per level. | Flattening changes styles and heading markup only. |
| Calculated vs read-only | Web: a calculated field is a read-only `<input>`; other read-only fields are `disabled`. They share one class. | Cosmetic; needs a distinct class or data attribute per case. |
| Sections and issues panel | Web: `NavigationTree`, shown when the form has sections, when forced, or after a failed submit. Mobile: a sheet opened by tapping the form title. | Cosmetic. The mobile entry point gets a visible button. |
| Date picker | Web library: native date input. Web template: `date-field-shadcn` (typed input, calendar button, popover with month and year dropdowns), plus an older `date-field` with a Today button. **Mobile: the library field is a plain text input with a `YYYY-MM-DD` placeholder, and the mobile template registers no date renderer.** | Web: cosmetic, in the template. Mobile: a real picker is a new feature and likely a new dependency. |
| Section counts | No per-section count exists. Fields subscribe to the engine store one by one. | New derived state; headers would re-render on every change. Deferred. |
| Bottom sheet | The mobile canvas is the first child of the form's scroll view; fields follow in the same scroll view. | No engine change, but the render tree of the plan screens changes. Structural. |
| Keyboard bar | `fieldInputRefs` maps field names to inputs. There is no ordered "next field" list. | UI-only, but needs a field order and a rule for non-text fields. Structural. |

## Steps

Status: `todo`, `in progress`, `to test`, `done`.

### Cosmetic

| # | Step | Repo | Status |
|---|---|---|---|
| 1 | Tokens and palette: neutral defaults, dark mode, derived state colours; remove hardcoded colours in field, form and navigation styles | form0-react | done |
| 2 | Controls: input, textarea, select, choice lists, yes/no, buttons, `kbd`; all states; error row | form0-react | done |
| 3 | Form shell: header, section bands and gaps, navigation panel, drill-down rows, repeatable list and modal | form0-react | committed, **to review** |
| 4 | Dialogs (ALERT, MESSAGEBOX, discard, description, supporting image); calculated vs read-only | form0-react | committed, **to review** |
| 5 | Building plan on theme tokens: canvas, toolbar, zoom, floor tabs; one themed tooltip | form0-react | mockups done, **decisions pending** (see "Building plan round") |
| 6 | Steps 1 to 4 mirrored on mobile, with 48pt controls (step 5 skipped) | form0-react-native | committed, **to review** |

### Structural (each needs a go-ahead)

| # | Step | Repo | Status |
|---|---|---|---|
| 7 | Nested sections shown flat, with the path in nested headers | both | committed, **to review** |
| 8 | Inherited values, variant 1 | both | committed, **to review** |
| 9 | Mobile keyboard: one mechanism, whole field above the keyboard, dynamic bottom space | form0-react-native | committed, **to test on devices** |
| 10 | Mobile plan: still preview in the form, full-screen editor with bottom sheet | form0-react-native | mockups done, **decisions pending** (see "Building plan round") |
| 11 | Keyboard bar | form0-react-native | committed, **to test on devices** |
| 12 | Templates: brand theme example, date picker on the form's palette, remove workaround CSS | both templates | committed, **to review** |

## Needs a decision

- Search for dropdowns on web (new feature). Open, still under discussion (2026-11-18).
- ~~A date picker on mobile~~: covered by the mobile template's native pickers (field overrides
  with `@react-native-community/datetimepicker`, round B, `976dc50`); typing still works and the
  library keeps typed entry only. Nothing to replace; a picker inside the library is not planned.
- Dimensions drawn on the canvas and edited in place (new logic; second phase, see below).
  Moved into the building plan round with steps 5 and 10 (2026-11-18).
- ~~Section counts (new derived state)~~: not wanted (2026-11-18).
- Mobile date typed in the device's locale order (a display/value conversion layer; the
  library field's text is the stored YYYY-MM-DD value today).

## Second phase: dimensions on the building plan

Reference: how magicplan handles it, from its help centre. Its videos were not reviewed, so
anything shown only there is missing.

- **Entering a value.** Select the room, then the wall, then tap the wall's measurement, which
  is drawn in blue. A "Change Measurement" pop-up opens; the value is adjusted there and
  confirmed with "Apply". The same pop-up is reachable from the details panel (swipe up on a
  phone, an "i" button on a tablet). Dragging the wall is the third way.
- **Locks.** A dimension that was entered by hand locks automatically and shows a lock icon
  beside the value. Locked dimensions stay fixed when rooms are moved or joined and do not
  follow connected elements.
- **Unlocking.** Either drag the wall and confirm an alert, or open the pop-up and tap
  "Unlock".
- **Not documented.** Where labels sit relative to walls, how they move during a drag, and
  which neighbouring wall gives way when a length changes.

Ideas worth carrying over, to discuss before any logic work:

1. Only the selected wall's dimension is editable, so the canvas is not covered in inputs.
2. Editing happens in a small pop-up or sheet with Apply, not inline on the canvas. On mobile
   this avoids the keyboard covering the plan.
3. A typed value is marked as locked, so later drags cannot silently change it.

Open questions for that phase: which wall moves when a length changes, how shared walls and
inheritance interact with a locked length, and label placement for interior versus exterior
dimensions.

Sources:
https://help.magicplan.app/change-dimensions-of-your-floor-plan,
https://help.magicplan.app/how-to-lock-and-unlock-dimensions,
https://help.magicplan.app/magicplan-floor-plan-editor-faq

## Flags outside this work

- `form0-cli` ships its own static renderer (`src/server/static/form-renderer.js`) with the old
  colours. Not touched here.
- The mobile template has an uncommitted local edit in `src/components/Form0Form.js` marked
  "do not commit". Left alone.
- Reform web (`reform-frontend-tanstack/src/form0-renderer/styles/form0-overrides.css`) has the
  same labelWidthPercent workaround the web template had (see step 12). On form0-react 0.4.0 it
  may still be needed; remove it as part of the Reform upgrade.
- The web template's starter survey does not render with its installed form0-core 0.11.0 (the
  known `building_plan` attribute issue from the 2026-11-16 retest). Use the nature observation
  form when checking the template's date picker.
- The web template also registers an older date field (`date-field.jsx`, react-day-picker
  classNames from v8). Its stylesheet import is what overrode the shadcn calendar. It could be
  removed if nobody uses it; not done.
- Mobile `npm test`: `tests/managed-events.test.mjs` never finishes and two tests fail
  (`building-plan-touch`, the consumer audit manifest), identically on the branch before this
  work. Run the other files with `node --test $(ls tests/*.test.mjs | grep -v managed-events)`.

## Tests on this branch

`npm test` resolves `form0-core` to the published 0.11.0 in `node_modules`, which lacks what
this branch uses (for example `createBuildingPlanSession`). Result: 22 of 29 test files fail to
run and 72 of 80 tests pass, before and after step 1.

With `form0-core` pointed at the local source through a throwaway Vitest config (no file in
the repo changed), 259 of 266 pass, again identically before and after step 1. The 7 that still
fail are six tests that start the real worker, which loads the installed core outside the
alias, and one building plan reset test that passes when run alone. So moving the packages to
the new core should clear most failures; the last 7 are likely the same cause but that is not
proven.

How the suites are run now (one at a time, as in "WSL crashes"):

- Web: the tests import `../dist/index.js`, so build first (`npx tsup`), then
  `npx vitest run --config ../.local-test-harnesses/form0-ui-refresh-20261116/vitest.local-core.config.mjs --maxWorkers=2`.
  Known failures: the six worker tests.
- Mobile fixtures: `node native-build.mjs` in the harness folder, then the three `native-*.test.jsx`
  files (see Manual testing). Mobile unit: `node --test --test-concurrency=2 --test-timeout=20000
  $(ls tests/*.test.mjs | grep -v managed-events)`; known failures: consumer audit manifest and
  `building-plan-touch` (installed core).

## Manual testing

Web: `node preview.mjs` in `.local-test-harnesses/form0-ui-refresh-20261116/`, then open
http://127.0.0.1:4180. The bar offers a "UI gallery" form (cases the starter schemas lack,
such as three-option Yes/No) and "Show as: Modal", which puts the form in a host dialog. It bundles this package's build with the local `form0-core` source in
memory, so nothing is installed or linked, and a page reload rebuilds after a source change.
`shots.mjs` in the same folder writes screenshots of a fixed set of views.

Mobile, in the same folder (nothing installed; reads react-native-web from
`reform-mobile-react-native-expo/node_modules`):

- `node native-web-preview.mjs`, then http://127.0.0.1:4182 (`?form=`, `&color=dark`,
  `&mode=readonly`). The real form0-react-native renderer in a 390×844 frame through
  react-native-web. Good for layout and colours; fonts, gestures and the native keyboard are not
  represented, so it does not replace a device.
- `node native-keyboard-check.mjs <screenshot dir>` with the preview running: focuses the
  first, a middle and the last field, raises a simulated 300pt keyboard, checks each field and
  its error row ends above the toolbar, and checks "Next field".
- `node native-build.mjs`, then `../../form0-react/node_modules/.bin/vitest run --config
  native-vitest.config.mjs native-record-renderer.test.jsx native-editor.test.jsx
  native-reset.test.jsx`: the mobile renderer's jsdom fixtures (63 tests), using the platform
  shims of the building plan harness (read only).

On devices (needed for steps 9 and 11): the Expo template as in
`reform-backend-nestjs/docs/building-plan-retest-2026-11-16.md`, on iOS and Android. The template
must use the local libraries, linked from `form0-mobile-tmpl-react-native-expo` with
`npm link ../form0-core ../form0-react-native` (its `metro.config.cjs` watches those folders).
Any `npm install` or `npx expo install` there replaces the links with the published packages
(this happened on 2026-11-17 when the date picker package was added, so the device test showed
no keyboard toolbar): check `ls -l node_modules/form0-react-native node_modules/form0-core`
shows links to `../../form0-react-native` and `../../form0-core` before testing. Checklist:

1. Tap the first text field: the keyboard opens, nothing jumps, the toolbar sits on the
   keyboard.
2. Tap a field in the lower half: the whole field, including the space for its error, ends
   just above the toolbar.
3. Tap the last field of the form: same, and the form can still scroll down to it.
4. Previous / Next walk the text fields in screen order, skip read-only and hidden ones, and
   are disabled at the ends. Done closes the keyboard.
5. Rotate, switch keyboards (emoji, suggestions bar) and dismiss by dragging (iOS): the
   padding follows and nothing stays covered.
6. Inside a repeatable row (the editor screen) repeat 2 to 4.
7. Submit with errors and jump to an issue: the field scrolls into view (navigation still uses
   the same scroll code).
8. Android: try one device or emulator with edge-to-edge (SDK 55 and later default) and, if
   available, one without.

## Change log

### Step 1: tokens and palette (2026-11-16, tested by hand, committed)

Files:

- `src/theme.css.js`: the contract (`vars`) is unchanged. The eight themes are now built from
  one light and one dark palette. Magenta, cyan and yellow are gone: the primary action is ink,
  `primary` is a blue accent used for focus and selection, drill-down and back buttons are
  neutral. The dark edit banner, which used light-mode colours, is fixed. Radius goes from 6px
  to 8px. The simplified presentation no longer has its own green palette.
- `src/theme-derived.css.js` (new): state colours computed from the contract.
- `src/field-renderer.css.js`: disabled input, signature clear button, photo and video
  thumbnail backgrounds, form-link buttons, banner and info icon now use tokens. The info icon
  hover used `vars.color.foregroundMuted`, which does not exist; it now has a real colour.
- `src/form-renderer.css.js`: record status bar, section header tint, repeatable count pill.
- `src/navigation-tree.css.js`: the hardcoded magenta active state, greys and borders.

Left as they were on purpose: signature surfaces (white, so ink stays readable), overlay
scrims and shadows, the dark photo remove button, the dark form-link tooltip.

Not changed in this step: sizes, spacing, layout, hover and focus behaviour.

To test: see "Manual testing". Check light and dark, a form with sections, a repeatable
section, the navigation panel and a failed submit.

To revert: `git checkout -- src/theme.css.js src/field-renderer.css.js src/form-renderer.css.js
src/navigation-tree.css.js && rm src/theme-derived.css.js`. To bring back only the old colours,
restore `src/theme.css.js` alone; the other files work with any palette.

### Step 1 commit

`9651404` feat(theme): neutral default palette and theme-derived state colours.

### Step 2: controls and their states (2026-11-16, tested by hand, committed)

Files:

- `src/theme-derived.css.js`: more derived colours (hover border, placeholder, error tint,
  pressed button) and a `control` object with the shared metrics: 36px control height, 12px
  horizontal padding, focus ring, error ring, focus outline.
- `src/field-renderer.css.js`:
  - Field rows: the hairline under every field is gone. The error row under each control is
    still always reserved (no layout shift) and now also provides the space between fields. Side layout aligns the label with the first control
    row instead of the vertical centre of the whole field.
  - Inputs, selects and textareas: 36px, own `box-sizing` and font family (they no longer
    depend on a host CSS reset, which fixes the overflow seen in the bare preview), hover
    border, focus ring, placeholder colour, invalid state.
  - Dropdowns: custom arrow drawn in the text colour. The open list stays the browser's.
  - Calculated fields (read-only, not disabled) are filled with no border and bold; fields that
    are read-only by attribute or logic (disabled) keep the outline with muted text.
  - Radio and checkbox lists: themed marks, 32px rows with a hover fill, focus outline.
  - Yes/No: 36px, selected option in ink, hover and focus states. Works with two or three
    options; long labels wrap inside their option instead of overflowing.
  - Label icon buttons (supporting image, description): 24px target with hover fill.
  - Subtext and error text sizes and colours. One `vars.lineHeight.snug` that did not exist is
    now `tight`.
- `src/form-renderer.css.js`:
  - The shared action button (`formNameActionButton`, used by header actions, View, Add,
    Remove and others): 36px, hover, pressed, focus-visible and disabled states. Fixes an
    existing bug where hovering the primary button gave it dark text.
  - Shortcut hints look like key caps and are no longer forced to lowercase ("Alt+S").
  - Generic `button`, repeatable Add (primary, with hover and pressed states) and Remove
    (error colour, tinted hover).
  - Header action slots: 8px between buttons (was 2px).
  - The form and its overlays now set `box-sizing: border-box` on themselves. Before, the
    layout relied on the host's CSS reset: without one, sections and inputs overflowed to the
    right and the repeatable modal scrolled sideways. Hosts with a reset see no change.
- `src/field-renderer.jsx`, one markup change with no effect on values or validation:
  controls get `aria-invalid="true"` while they show an error, which the red border uses.

Checked with screenshots from the preview (light, dark, phone width, read-only, failed
submit, repeatable modal, host modal) and with an automated check that nothing scrolls
sideways at desktop and phone width. Tests against the local core: 259 or 260 of 266 pass
depending on the run; the failures are the six worker tests and, intermittently, the reset
test, all of which also fail without this work.

Not changed in this step: header layout, mode banner, sections, navigation panel, drill-down
rows, dialogs, media fields, building plan. The lock icon on read-only fields and the "ƒ" mark
on calculated fields from the mockup need markup and are left for step 4.

After the second round of testing: 6px of padding above and below each field (the reserved
error row plus this padding separate fields; top-label layouts were too tight), the selected
Yes/No option keeps the same font weight so choosing it no longer shifts the others, option
rows and the repeatable modal set their own font size (the modal is portalled outside the form
and showed 16px text), and View / Remove are 8px apart.

To revert step 2: `git revert` its commit.

### Step 2 commit

`02f3325` feat(controls): consistent control sizes, states and spacing.

### Step 3: form shell (2026-11-16 and 17, committed, to review)

Files:

- `src/form-renderer.css.js`:
  - Body: the navigation panel and the form now sit on one tinted surface with a border. The
    form inside it has no background or border of its own (it keeps them in simplified mode).
  - Header: the title row is no longer a bordered box inside the header card; title 18px.
    Action slots align with the card's padding.
  - Sections: white cards with 16px padding and a filled header band; 16px between cards.
  - Nested sections: flat. Only the outermost section is a card; deeper levels keep a
    full-width band and lose no width. Done with selectors only, no markup change.
  - Drill-down rows: white card rows without the thick coloured left edge. The count is a pill,
    tinted when there are entries.
  - Repeatable list: white card, quieter description, 8px between rows. The empty state is a
    dashed, tinted area with a minimum height.
  - Repeatable modal: same header and section treatment as the form; tinted body.
- `src/navigation-tree.css.js`: no background or padding of its own, 200px wide; the current
  section is a white pill, sections on the path to it are darker text; hover and focus states;
  tabs aligned left with a pill-shaped count.
- `src/field-renderer.css.js`: field padding depends on label position. With the label on
  top the wrapper was `display: block`, which dropped the gap between label and control; it is
  now a flex column like the side layout, with more room above and below.

After discussion (2026-11-17), still in this uncommitted step:

- The accent left edge is back on drill-down rows and expanded drill-down sections (4px), and
  in the navigation panel on the current section and its parents.
- Navigation tabs are 14px.
- Shortcut hints are hidden below 640px wide, where the header has no room for them.
- Markup changes, none of which touch values, validation or the engine:
  - `src/navigation-tree.jsx`: an icon after the name of sections that open separately. The
    link's accessible name is unchanged; the kind is exposed as its description.
  - `src/form-renderer.jsx`: `ModePill` beside the title in the form header and in the
    repeatable modal header. It still contains the sentence "You are in Edit mode" / "You are
    in View mode" for screen readers and tests. The old strip (`ModeBanner`) is now used only
    in simplified mode.
  - `src/form-renderer.jsx`: nested section headers show their parents (`SectionHeading`,
    `inlineSectionTrail`). The path stops at the nearest drill-down ancestor, since that is a
    page of its own. Repeatable entries pass the labels down through a new
    `parentSectionLabels` prop of the internal `RepeatableEntryForm`.

Not changed in this step: the wording of the "Navigation" and "Validation" tabs and the
record summary row.

Second round (2026-11-17): pill wording EDITING / VIEWING; title centred in the form; double
chevron for repeatable sections in the navigation; accent edges drawn as inset bars; in modal
and spotlight placement the header and body lose their border, radius and tint (the form root
now carries `data-form0-presentation`, which the styles use).

Checked with screenshots (light, dark, phone width with top labels, nested sections, empty
repeatable list, repeatable modal, building plan root) and the sideways-scroll check. Tests
against the local core: 259 of 266, the same failures as before.

To revert step 3: `git revert` its commit.

### Step 3 commit

`d7e01eb` feat(shell): section cards, shared body surface and clearer navigation.

### Step 4: dialogs and field marks (2026-11-17, committed, to review)

Files:

- `src/form-renderer.css.js`: ALERT / MESSAGEBOX dialog (padding, shadow, title, muted
  message, close button with a real target). The first button keeps the primary style and the
  others become secondary; the schema's order is kept. The MESSAGEBOX answer input looks like
  the form's inputs. Discard dialog: Cancel is secondary, "Yes, discard" is styled as a
  destructive action (error colour).
- `src/field-renderer.css.js`: description, supporting-image and form-link dialogs get the
  same padding, radius, shadow and close button. Styles for the marks below.
- `src/theme-derived.css.js`: a hover colour for destructive buttons.
- `src/field-renderer.jsx` (markup): calculated fields show "Calculated" at the right edge of
  the control. Text and number fields whose own `read_only` attribute is true show a lock.
  Fields that are read-only only because the form is in View mode, or through
  `read_only_conditions`, get the read-only look without the lock: the renderer receives one
  combined read-only flag and cannot tell those cases apart without more plumbing.

Checked with screenshots: MESSAGEBOX with input and three buttons (light), ALERT (dark), the
"Calculated" mark. **Not seen rendered:** the discard dialog and the supporting-image dialog
(my automation could not open them), and the lock, because no starter schema has a read-only
text field. Tests against the local core: 260 of 266, worker tests only.

The preview's UI gallery opens a MESSAGEBOX, then an ALERT, when the first three-way field is
answered.

### Step 4 commit

`c994151` feat(dialogs): restyle alert, message box and field dialogs; mark calculated fields.

Note: the lock also appears on the Record Metadata fields, since they are read-only text
fields.

### Step 8 (web): inherited values in the building plan (2026-11-17, committed, to review)

Before: a line of text above the field ("Room side · Inherited from floor default") and a
separate "Reset to inheritance" button.

Now, in `src/field-renderer.jsx` and `src/form-renderer.jsx`:

- The position ("Room side", "Shared physical wall", "Exterior", "Opposite face") is a small
  tag after the label.
- An inherited value has a dashed outline and muted text, with a tag inside the control naming
  the source ("Floor default").
- Once the value is set on the row, that same place holds a "Reset" button. Its accessible
  name is still "Reset to inheritance", and it calls the same
  `controller.resetBuildingPlanProperty` as before.
- A value set here that cannot be reset (not inheritable, or read-only) shows a tag naming
  where it is set ("This wall").
- For controls with no room inside (dropdowns, choices) the tag or button sits under the
  control.

`FieldRenderer` gained four optional props for this (`labelTag`, `sourceMode`,
`sourceLabel`, `onResetSource`). No engine or plan logic changed.

Seen rendered in the building plan fixture (room screen): inherited and overridden states.
The existing reset test passes.

### Step 8 commit (web)

`01a3c30` feat(building-plan): show the source of an inherited value inside the field.

### Steps 6, 7 and 8 on mobile (2026-11-17, committed `8a95586`, to review)

One commit in `form0-react-native`, branch `feat/ui-refresh`:

- `src/theme.js`: the same neutral palette as web (light and dark), `control` metrics (48pt
  height, 14pt padding), radius 8 / 12, and new tokens `fill`, `fillPress`, `borderStrong`,
  `primarySoft`, `errorSoft`. Existing keys keep their names, so a host `customTheme` still
  merges.
- `src/control-styles.js` and `src/control-input.jsx` (new): one input look (height, focus and
  invalid borders, disabled) used by text, number, date and time fields, the choice triggers,
  the "Other" inputs and the MESSAGEBOX input.
- Yes/No and status: segments of the control height, selected in ink; two or three options
  share the row.
- Single and multiple choice: the dropdown trigger looks like an input with a chevron; the
  picker opens as a sheet from the bottom with 48pt rows and a handle; radio and checkbox
  marks are larger, rows have a pressed state.
- Calculated fields: filled, bold value, "Calculated" mark.
- Field rows: no hairline; the reserved error row is kept.
- Header (`src/form-header.jsx`): neutral background; EDITING / VIEWING pill under the title;
  a chevron after the title shows it opens the sections and issues sheet, with a red count
  while there are issues (new optional `issueCount` prop, wired by the renderer). A long title
  truncates instead of running under the buttons.
- Buttons (`src/form-action-button.jsx`): 44pt minimum height.
- Drill-down and repeatable rows: white, with the inset accent bar; View buttons 40pt.
- Navigation sheet entries: 48pt, the current one white with the accent bar, single chevron for
  a drill-down section, double for a repeatable one.
- Nested inline sections (step 7): flat, with a full-width band showing the path, as on web.
  Section padding goes from 8 to 14pt.
- ALERT / MESSAGEBOX: buttons stacked at full width, the first primary.
- Building plan fields (step 8): position tag after the label; inside the control the source
  ("Floor default", dashed inherited look) or the "Reset to inheritance" button. One test
  fixture that looked for the old sentence ("Override at this wall") now looks for the reset
  button or the source tag.

Seen rendered through react-native-web (see Manual testing), not on a device.

### Steps 9 and 11: mobile keyboard (2026-11-17, committed `88fb7e6`, to test on devices)

Before: `KeyboardAvoidingView` (padding on iOS, height on Android), the ScrollView's
`automaticallyAdjustKeyboardInsets` and a hook that measured the focused input and scrolled.
On iOS the three overlapped; the hook measured only the input, so the error row could stay
under the keyboard; the bottom padding was a fixed 32pt.

Now (`src/keyboard-aware-scroll.jsx`, `src/keyboard-layout.js`):

- One mechanism. The keyboard's top comes from Keyboard events (iOS: will-show, will-change-
  frame, will-hide; Android: did-show, did-hide). The covered part of the form's scroll view is
  added as bottom padding, so the last field can always scroll clear. On Android without
  edge-to-edge the window is already resized and the covered part is 0.
- On focus, and when the keyboard appears, the field's whole container (label, control, error
  row) is scrolled so it ends `keyboardScrollOffset` (default 24) above the keyboard or the
  toolbar. A field taller than the visible area aligns its control instead.
- Keyboard state lives in the scroll view component, so keyboard changes no longer re-render
  the form.
- Toolbar (`keyboardToolbar`, default true): Previous and Next walk the text fields in screen
  order (measured, so conditional fields and sections are handled), skipping read-only and
  hidden ones; Done closes the keyboard. Choice, yes/no and media fields are not part of the
  walk; they are tapped.
- Markup and API: fields now pass their name to `onFocus` (second argument); input
  registration takes a read-only flag; `keyboardToolbar` is typed in `index.d.ts`.

Tests: `tests/keyboard-layout.test.mjs` (10 unit tests of the geometry), the 63 jsdom fixture
tests, and the browser check with a simulated keyboard (all three positions clear, Next moves
to the next field). The remaining mobile suite gives the same result as before this work.
Not tested on a device: that is the checklist under Manual testing.

### Step 12: templates (2026-11-17, committed, to review)

Web template (`form0-web-tmpl-react-vite`, branch `feat/ui-refresh`, `6158857`):

- Date picker (`date-field-shadcn.jsx`): shadcn's tokens are mapped to the form's palette inside
  the field and its popover (`.form0-date-shadcn`), and a Today button is added. The picker
  never fitted because react-day-picker's own stylesheet, imported by the template's other date
  field, is not in a CSS layer and so beats Tailwind's classes; scoped rules now win over it.
- `form0-overrides.css`: the same neutral palette as form0-react's default theme, 36px fields,
  8px radius, a focus ring like the form's, no heavy shadows.
- `custom-example.css.js`: a complete brand theme (teal accent and primary action) instead of
  the red-border demo, which lacked contract keys and would not build if enabled.
- **"Remove workaround CSS"** meant this rule at the top of `form0-overrides.css`:
  `[class*="field-renderer_labelInputRow"] > [class*="field-renderer_labelRow"] { width:
  var(--label-width, 30%) }`. It targeted form0-react's generated class names to force the side
  label width. In the current markup the label row sits inside `labelColumn`, which already
  applies `--label-width`, so the selector matches nothing and the rule did nothing. It is
  removed from the template. Reform has the same rule (see Flags).

Checked: the template builds and lints; the date picker screenshot matches the mockup. The
form itself in the template still uses the published form0-react 0.10.0 until the packages are
released or linked.

Mobile template (`form0-mobile-tmpl-react-native-expo`, branch `feat/ui-refresh`, `0294ccd`):
`src/themes/brand-example.js` (light and dark brand variants) and a pointer to it in
`form0.config.js`. The local edit in `src/components/Form0Form.js` was left uncommitted. The
mobile template has no date picker of its own (the mobile date field is a text input); a real
picker would be a new feature.

### Not done

- Steps 5 and 10, as agreed.
- The themed tooltip (with step 5).
- form0-cli's own preview renderer (flagged, untouched).

## Review round 2 (2026-11-17)

Decisions: sticky header edge in every presentation; record row to be decided after seeing the
header (preference: a bar on the left, box or no box open); "ƒ" plus "Calculated"; navigation
always shown on root and rows; browser time input in the library plus a time popover in the web
template; keypad and auto-format for mobile date and time, plus the native picker in the mobile
template (adds `@react-native-community/datetimepicker` there); better photo and video controls;
signature improved in the library and templates with the same logic and workflow (Reform mobile
imports `SignatureFieldComponent` directly).

### Batch 1 (committed: form0-react `5eea90a`, form0-react-native `7d6b150`)

- Navigation always shown (web: also without sections, then on Validation; mobile: the title
  always opens the sheet). `forceShowNavigationPanel` no longer changes anything. Tests that
  asserted the old rule (`runtime-retention.test.jsx` on web, `record-renderer.fixture.jsx` on
  mobile) now assert the panel or title button.
- Sticky header: an IntersectionObserver sentinel sets `data-stuck` on the header; while stuck
  it shows a bottom edge, and in modal or spotlight it also covers the host dialog's top
  padding (1.5rem) so content does not show through above it.
- "ƒ" before calculated values, web and mobile.
- Repeatable rows: the extra 8px gap between fields is gone.
- Preview: the UI gallery has a text field with `read_only: true` (shows the lock).
- The local-core Vitest config now lives in the harness folder
  (`vitest.local-core.config.mjs`), since `/tmp` is cleared on restart.

### Batch 2: date and time (committed)

- form0-react `71b79af`: the time field keeps its text input and its tested behaviour (partial
  times kept, invalid text left for the engine, late worker echoes); a clock button opens the
  browser's own time picker through a hidden time input. A real `<input type="time">` was not
  used because it would drop partial and invalid text, which four tests cover. The date field
  was already the browser's date input.
- form0-react-native `cd7dc4d`: date and time fields open the number keypad; "-" and ":" are
  added while digits are typed (`src/utils/masked-entry.js`, 5 unit tests). Deleting, and text
  in any other format, is left as typed. No dependency.
- Web template `f03ac6f`: `time-field-shadcn.jsx`, typed entry plus a popover with hour and
  minute columns (5-minute steps) and "Now", styled like the date picker; selected in
  `form0.config.js`.
- Mobile template `976dc50`: `@react-native-community/datetimepicker` 9.2.1 (`npx expo install`,
  config plugin added to `app.json`) and `src/field-renderers/date-time-pickers.js`: the
  library's typed field plus a button that opens the platform picker (iOS bottom sheet with a
  spinner, Android system dialog). Not run on a device yet.
- Harness: `template-web-preview.mjs` runs the web template's own dev server with form0-react
  and form0-core pointed at the local copies (http://127.0.0.1:5174), so the template's
  overrides can be tested with the branch. The starter survey renders there (the local core
  accepts its schema).

### Batch 3: photos and videos (committed)

- form0-react `d7809ad`: photo and video fields get an add area: a label that wraps the
  field's own file input (still in the page, same handler, so tests and Reform's wrapper keep
  working) and accepts dropped files, with the limit in plain words. The "No photos selected"
  box is replaced by it; thumbnails get more room.
- form0-react-native `25b95ff`: the camera and library actions (which already existed) become
  two equal 48pt buttons above the attached items. The mediaPicker contract is unchanged; Reform
  mobile replaces these fields with its own renderers.

### Open after batch 3

- Signature (done in round A, see below): mockup published (review round 2 block, last row). Same steps and names as today
  ("Add signature", "Save", "Clear pad", "Clear signature"); Reform mobile imports the mobile
  component, so its props stay as they are. Not implemented yet.
- Record row (title and status): decided in review round 3: B, no box, status name shown.
- Template signature override: none planned unless the mockup review asks for one.

### Batch 4: follow-ups from testing (committed)

- form0-react `d018f70`:
  - `repeatableBackButton` restored. An earlier scripted style edit replaced the style before
    it and removed it too (the build warning "import will always be undefined"). The other
    style files were checked against the branch base: nothing else was lost.
  - Date field: uncontrolled while typing (the browser reports intermediate years and an empty
    value for incomplete segments; writing the last value back made digits disappear). Echoes
    of typed values are ignored, external changes still replace the value. Checked: typing
    "12252025" gives 2025-12-25.
  - Navigation panel sticks below the sticky header (`--form0-sticky-header-height`, measured
    with a ResizeObserver) instead of scrolling under it.
  - Repeatable row dialog: 1.25rem padding and a frameless header, like the root form in a host
    dialog.
  - Time picker opens at the field's left edge, as the date picker does; "ƒ" lifted to the
    value's centre line; the dropdown chevron is an SVG image (gradient triangles turned into a
    thin line under browser zoom).
- form0-react-native `b2bbc88`: a separator typed right after a complete group ("11" then ":")
  is kept (unit test added).
- Web template `b3c6e7d`: the Vite starter's `a` and `button` rules removed from `index.css`
  (8px radius, padding and a #646cff hover border on every button that did not set them: the
  Home page hover, the Yes/No segments and the picker buttons).
- Separators ("-", ":") while typing are mobile only, by design: on web the date field is the
  browser's segmented date input, and the time field keeps its tested text behaviour.

### Next (new chat)

Signature (mockup approved; no template override for now), record row (status bar on the left,
box or no box), and mobile testing on devices (checklist under Manual testing).

Added 2026-11-17 after testing batch 4:

- **Web template date typing:** typing "11122001" in the shadcn date field stays one run of
  digits, while the library's browser date input moves from segment to segment by itself. The
  override parses the text with the locale's format (for example MM/dd/yyyy) and needs the
  separators to be typed. Fix: add separators while typing, in the locale's order (the same
  idea as mobile's `formatMaskedEntry`).
- **Prettier shadcn date and time overrides** in the web template: mockup first, then
  implement (include the typing fix above).
- **Web time field auto ":"** (open question): adding the mobile helper's behaviour to the web
  time text input. With separators typed after a complete group kept, the four existing time
  tests should still pass unchanged; the visible difference is that "1430" becomes "14:30"
  instead of staying "1430" (which the engine then rejects).

## Round A (2026-11-17, second chat)

Order agreed: **A** signature (web and mobile) plus mockups for the record row and the shadcn
date and time overrides; **B** record row, shadcn overrides with separators while typing, web
time ":"; **C** device testing (one session for the keyboard checklist, the signature and the
native pickers). Steps 5 and 10 still need discussion.

Decisions:

- Signature: the signed-state button stays **"Replace signature"** (the mockup's "Re-sign" is
  not used; names stay as today). "Clear signature" is **hidden while empty** on web and
  mobile. The pad **follows the theme** (dark pad, light ink in dark mode); the saved image is
  always dark ink. The saved signature is shown on white "paper" in every theme, because it
  shows the saved image. No split of the two large files in this round (web 652 lines, mobile
  877; both over the 300-line rule): split later.
- Web time ":" **approved** for round B. Details from the earlier analysis, not recorded
  before: the tests protect three things (half-typed times kept, invalid text passed on for
  the engine to reject, late worker echoes not overwriting typing). Against them: "1", "11",
  "11:", "11:3", "11:30" come out exactly as typed and "99:99" still reaches the engine as
  invalid text, so they should pass unchanged (not run yet). Costs: the helper and its unit
  tests are copied into form0-react (the libraries share no code); "9" then "30" still gives
  "93:0", as today, and the engine flags it.
- Date order while typing: the web template's shadcn field follows the **browser's locale**
  (it already parses with the format `Intl.DateTimeFormat` gives; in Chrome that follows the
  browser's language, like its native date input). The web library field is the browser's own
  date input, already in that order. The **mobile library field stays YYYY-MM-DD**: its text
  is the stored value, so a locale order would need a display/value conversion layer (with
  half-typed text) and is a new feature; the mobile template's native picker already shows the
  device's locale. Added to "Needs a decision".

### Signature (round A, tested by hand, committed)

Web, `src/field-components/signature-field.jsx` and `src/field-renderer.css.js` (the old
signature styles are replaced; Reform does not target them):

- Empty: one dashed "Add signature" area (pen icon, "Opens the signature pad"), styled like
  the photo and video add area. Its accessible name is "Add signature"; the hint is its
  description.
- Signed: a card with the signature on white paper above a sign line, then "Signed" and the
  actions "Replace signature" (secondary) and "Clear signature" (red, no border). A value with
  no image to show says "Preview not available." in the paper.
- Read-only: the same card without actions, or "No signature captured." in a filled box.
- Pad: 720px card with the dialogs' radius, shadow and scrim; Cancel / title / Save header;
  "Draw your signature below." plus "Saving replaces the current signature." only when one
  exists; a 260px pad on the theme's background with a sign line, a cross and "Sign above the
  line" until the first stroke (all under the transparent canvas, so never saved); "Clear pad"
  is disabled while the pad is empty (it was always enabled).
- Ink: the canvas draws in the theme's text colour. On save the strokes are recoloured to
  #222 (`source-in` fill), so the saved PNG is dark ink on a transparent background, exactly
  as before. Checked by decoding the saved image after signing on the dark pad: every opaque
  pixel is 34,34,34.
- The field container also gets the renderer's input class; like photo and video it is reset
  to a plain block. `touch-action: none` moved from the whole field to the pad, so the field no
  longer blocks touch scrolling.

Mobile, `src/field-components/signature-field.js` (`SignatureFieldComponent`, props and value
handling unchanged; Reform mobile imports this file):

- Same states as web, with touch sizes: dashed add area (`PenLine` from `lucide-react-native`,
  which the package already uses), paper card with "Signed", "Replace signature" and "Clear
  signature" as 44pt buttons, side by side from 480pt wide and stacked full width below (side
  by side, "Replace signature" did not fit a phone), read-only box.
- Pad: full screen as before, pad and ink on the theme (as before), sign line, cross and
  placeholder under the strokes, "Clear pad" as a 44pt button disabled while empty. The export
  (#222 on white) is unchanged.

Checked: screenshots of empty, pad, signed and read-only, light and dark, on web (preview) and
mobile (react-native-web preview). Tests: web 260 of 266 against the local core (the six worker
tests, as before); mobile jsdom fixtures 63 of 63; mobile unit tests 130 of 132 (the two known
failures). Harness: `native-icons.jsx` adds `PenLine` to the building plan harness's icon
stubs for `native-build.mjs`.

Commits: form0-react `edc7b46`, form0-react-native `4e15941`.

Flags (existing logic, not changed): on both platforms replacing a signature keeps the first
`signature_id` and `signed_at_client`, so a "signed on" date would show the first signing
(which is why the card says only "Signed"). Web saves a transparent PNG, mobile a white one;
they look the same on the paper.

### Mockups for round B (reviewed 2026-11-17)

"Review round 3" in the mockups page (top section):

- Record row (web only; mobile has no record row): today, A (quieter box), B (no box, a divider
  inside the header card, my pick), plus B with approved, no status field and status disabled.
  A and B show the status name as text on the right; today it is only an `aria-label`.
- Template date: screenshot of today's picker; proposed field with the locale's format as
  placeholder (MM/DD/YYYY, DD/MM/YYYY, DD.MM.YYYY, YYYY/MM/DD) and separators added while
  typing, with a live demo per locale; calendar with 32px days, arrows grouped on the right,
  today as a dot, selected day filled, Today in the footer, opening under the field.
- Template time: screenshot of today's picker; the typing rule (live demo); A refined columns
  (my pick) or B hour grid then minute grid.

Decisions: record row **B** (no box, a divider inside the header card) with the status name
**shown as text** on the right; template date **as proposed** (calendar and typing); template
time **A** (refined columns).

Found while preparing them, both to fix in round B: the template date field reads the stored
"yyyy-MM-dd" with `new Date(value)`, which is UTC midnight, so west of Greenwich it shows the
day before. Also, in the template preview the `.dark` class and the form's own theme are not
linked: with `.dark` the popover turns dark while the form stays light. Nothing in the
template sets `.dark` today (it was added by hand in the preview), so the fix starts with how
the form's theme is chosen; any choice there is asked first.

### Round B (done, tested by hand, committed)

1. Record row, web (form0-react): B with the status name as text.
2. Web library time field: ":" added while typing (helper and unit tests copied from
   form0-react-native); the four time tests must pass unchanged.
3. Web template date: locale format as placeholder, separators while typing, the proposed
   calendar; stored value parsed as a local date (UTC bug).
4. Web template time: same typing rule, refined columns (A).
5. Web template: popover and form on the same light/dark switch.

Then round C: device testing (checklist under Manual testing).

### Round B, item 1: record row (tested, committed)

- `src/record-summary.jsx` (new): `RecordSummary`, the row used by the form header and by the
  repeatable entry dialog (both had their own copy of the markup). The bar is decorative now;
  the status name is visible text at the end of the row with a screen-reader-only "Status: "
  before it (before: the bar was an image named "Status: …"). A disabled status shows
  "<name> (disabled)" or "Status disabled", as the old label did. The group labels ("Record
  summary", "Repeatable entry summary") are unchanged.
- `src/form-renderer.jsx`: both places use `RecordSummary`; no logic changed.
- `src/form-renderer.css.js`: the row is a divider inside the header card that runs to its
  edges (no box, no fill), 4px bar, title 15px, status name 13px muted on the right; the
  disabled bar is striped. In a host dialog and the repeatable entry dialog the header has no
  side padding, so the row keeps to the content width there.

Checked with screenshots: survey header light, dark, phone width, host dialog, and the
repeatable entry dialog (parent status beside the entry title); equipment checkout (no status
field: grey bar, no text). Tests: 260 of 266 against the local core, the six worker tests.

### Round B, items 2 to 5 (tested, committed)

Decisions taken while implementing (2026-11-17):

- **Separator after one digit pads it, on every platform.** The mobile helper dropped a
  separator typed after a single digit, so on a web keyboard "9:30" became "93:0" and an en-US
  "1/5/2026" became "15/20/26". Now "9:" gives "09:" and "1/" gives "01/" ("9:30" gives
  "09:30", "1/5/2026" gives "01/05/2026"); a year in progress is not padded. The mobile
  keypad has no separator keys, so only hardware keyboards see the difference there.
- **Template dark mode: one switch for the page.** `theme.mode` in `form0.config.js` also sets
  the page's `.dark` class (following the system for `'system'`), so the page, the shadcn
  pickers and the form use one setting.

form0-react-native:

- `src/utils/masked-entry.js`: the padding rule, and a pattern argument besides `'date'` and
  `'time'` (`{ groups, separator }`, for a locale order). `tests/masked-entry.test.mjs`: the
  expectation for "1" then ":" is now "01:" (was "1"); new cases for padding, a pasted
  "9:30", a year in progress, and en-US / de-DE patterns. 9 tests pass.

form0-react (item 2):

- `src/utils/masked-entry.js` (new): copy of the mobile helper, same body.
- `src/field-components/time-field.jsx`: typed text goes through the helper; picks from the
  clock button are unchanged. The four existing time tests pass unchanged.
- `tests/masked-entry.test.js` (new, the mobile cases in Vitest) and a new case in
  `tests/time-input.test.jsx` (typing "1430" shows "14:30" and sends "14:30:00"; "9:30" shows
  "09:30").

Web template (items 3 to 5):

- `src/lib/masked-entry.js` (new): copy of the helper.
- `src/field-renderers/date-field-shadcn.jsx`: placeholder is the locale's format (MM/DD/YYYY,
  DD/MM/YYYY, …) unless the field sets one; separators are added while typing in the locale's
  order; only a complete date is read, so a year being typed is no longer sent as 0002, 0020,
  0200; the stored "yyyy-MM-dd" is parsed as a local date (UTC bug); the popover is anchored to
  the whole field and opens below it at its left edge; the footer shows the selected date in
  words.
- `src/field-renderers/time-field-shadcn.jsx`: ":" added while typing (same helper); the
  popover is anchored to the field; while the field is empty the current hour and 5-minute
  step are outlined and scrolled to the middle; the footer shows the value.
- `src/components/ui/popover.jsx`: exports `PopoverAnchor`.
- `src/styles/form0-overrides.css`: 32px days (react-day-picker's own variables were forcing
  44px), month and year first with the arrows grouped on the right, today as a dot under the
  day, footer with the value, ghost Today/Now button, faded ends on the time columns, the
  "now" outline, and the calendar's background mapped to the popover surface (it drew a
  darker box in dark mode).
- `src/lib/color-mode.js` (new) and `src/main.jsx`: the page's `.dark` class from `theme.mode`.

Checked in the template preview: en-US typing "11122001" gives 11/12/2001 (stored
2001-11-12), "1/5/2026" gives 01/05/2026; it-IT placeholder DD/MM/YYYY and "11122001" stored
as 2001-12-11; time "1430" gives 14:30 and "9:30" gives 09:30; in the America/Los_Angeles
time zone the default date shows the local day; both popovers in light, and in dark with
`mode: 'system'` (set for the check and restored to `'light'`). Tests: web 270 of 276 (the six
worker tests); mobile unit 133 of 135 and fixtures 63 of 63 (known failures); template 8 of
11 (the three known `building_plan` attribute failures with the installed core 0.11.0); lint
clean.

### Round B follow-ups after testing (2026-11-17, committed)

- Record row: title 16px (was 15px in mockup B, 17.6px before the refresh); status bar 6px
  (was 4px; the old boxed bar was 8px).
- Time placeholder "HH:MM" everywhere (form0-react and form0-react-native showed
  "HH:MM[:SS]"; the template already "HH:MM"). Seconds are still accepted when typed; there is
  no seconds setting in the schema. One mobile fixture that looked the field up by the old
  placeholder (`tests/validation-pagination.fixture.jsx`) uses the new one.
- Template date segments: the library's date field is the browser's segmented input, the
  template's a text box, so a click only placed the caret. Now, once the text is a whole date,
  a click selects the day, month or year under it, digits fill it (a day or month waits for a
  second digit unless the first cannot start one: "5" in a day is 05) and move to the next
  segment; a day or month is saved at once, a year when its four digits are in or on leaving
  the field; Left and Right (and the separator key) move between segments; tabbing in selects
  the first segment. Partial typing in an empty field works as before. Pure logic in
  `src/lib/date-segments.js` (5 unit tests in `tests/date-segments.test.mjs`), the input wiring
  in `src/field-renderers/use-date-segments.js`; `getLocalePattern` moved there from the date
  field, and the date field's save logic is one `commitText`.

Checked in the template preview, en-US and it-IT: click on each segment, typing a day, a
two-digit month, a year (stored only at four digits), Left arrow, keyboard focus. Record row
seen at 16px with the 6px bar. Tests: form0-react time and helper tests 14 of 14; mobile
`validation-pagination` passes with the new placeholder; template 13 of 16 (the three known
`building_plan` failures); lint clean.

Commits:

- form0-react: `82f174d` record row, `1e2f9ab` time field typing (both include the
  follow-ups above).
- form0-react-native: `6124c2f` helper padding and pattern argument, HH:MM placeholder.
- form0-web-tmpl-react-vite: `20c8b51` date and time pickers, typing, segments, UTC fix;
  `0ef9613` one light/dark switch for the page.

### Next

Round C: device testing (checklist under Manual testing); it now also covers the mobile
signature, the native pickers in the mobile template, and typing a separator on a hardware
keyboard. Steps 5 (building plan on theme tokens) and 10 (mobile plan editor) still need
discussion.

### Round C: device testing (Android, 2026-11-17, in progress)

Checklist (Manual testing): 1 and 4 not testable yet (no toolbar, see below); 2, 3, 5 ok; 6 and
7 ok with the notes below; 8 ok for now.

Found and changed (not committed yet):

- **Field spacing (mobile)** was looser than before the refresh: the space between fields was
  about the same (34pt, 33pt before), but a 6pt gap under the label was new, controls are 48pt
  and section padding went from 8 to 14pt. Field padding 6 → 2pt and the label gap 6 → 4pt
  (`src/field-renderer.jsx`): about 10pt less per field, about 26pt between fields. To check on
  the device that it is not too compact.
- **Header buttons (mobile)** went from about 36pt to 44pt. Back to 36pt to the eye
  (`src/form-action-button.jsx`); their existing hit slop (12pt on every side) keeps the touch
  target above 44pt.
- **Yes/No (mobile)** was separate buttons with an 8pt gap; now one joined control with
  dividers, full width, as in the mockup and on web (`src/control-styles.js`
  `joinedSegmentsStyle` / `joinedSegmentStyle`, `src/field-components/boolean-field.js`). Long
  labels wrap inside their option.
- **Sections and issues sheet (mobile)**: the Modal slid in with its dim backdrop, so the grey
  layer moved up the screen. Now the backdrop fades and only the sheet slides up (Animated,
  started on the Modal's `onShow`). The issue cards had no space between them (the list's gap
  did not reach them through their wrapper): 8pt now (`src/form-renderer.jsx`).
- **Mobile template date picker**: `onChange` is deprecated in
  `@react-native-community/datetimepicker` 9; Android uses `onValueChange` / `onDismiss`, the
  iOS spinner `onValueChange`. The iOS sheet gets the same fade-and-slide as above
  (`src/field-renderers/date-time-pickers.js`).
- Harness: `native-rn.jsx` adds `Animated` and `Easing` stubs to the building plan harness's
  react-native stubs for `native-build.mjs`.

Answers recorded: supporting images and descriptions were restyled on web only (dialogs in step
4, label icon buttons in step 2; inline images and subtext only changed colour and size), not on
mobile. The repeatable list screen on mobile (View and Remove pills about 30pt high, Remove in
hardcoded pinks) was not part of the refresh; it goes into the repeatable page mockup (next).

Mockup "Review round 4 · repeatable list page" published (top of the mockups page): today's
web and mobile empty states as screenshots; proposed rows that open on tap with a chevron and a
trash icon instead of View / Remove, an empty state with its own "Add the first entry", the
count beside the title; on mobile, Add in the header (A) or a full-width bar at the bottom (B).
Labels stay generic: today's attempt to make the section label singular
(`replace(/s\\b/i, '')` in form0-react) never matches, and singular forms are not reliable
across languages.

Round 4 decisions (2026-11-17): rows open on tap or click with a chevron, Remove as a trash
icon (same confirmation); the empty state gets its own "Add the first entry", a secondary
button on web and mobile alike (the header keeps the primary Add); on mobile Add stays in the
header (A). Applies to the shared lists (web `RepeatableSectionList`, mobile
`RepeatableListScreen`, so also the lists inside the building plan) and to the web building
plan's own floor list (`building-plan/section-view.jsx`, same styles, its own markup). The line
under the title is the section's `description` from the schema, as today.

After the second device pass:

- Field spacing ok on mobile. Compared with web: web side labels are about 26px apart (6px gap
  plus a reserved error row of about 16px plus 2px padding), the same as mobile now; web top
  labels have 6px more padding (about 34px apart). Option: the same 2px padding for top labels
  on web.
- Header buttons: web is 36px, mobile 36pt again: consistent, no web change needed.
- Issues tab (mobile) before validation: tapping it switched the tab and a rule in the sheet
  switched it straight back to Sections (the flash). It is disabled until validation has run,
  as web's Validation tab already is (`src/form-renderer.jsx`).
- Date picker warning gone; Yes/No ok.

**Keyboard toolbar not shown on Android: found and fixed (to confirm on the device).** The
debug log (second run, with timestamps) showed the bar laid out at y 506–550 in window
coordinates while the keyboard's `screenY` was 549: Android reports `screenY` from the top of
the screen, but the window starts below the status bar (screen 914, window 844: status bar 46,
gesture bar 24), so the keyboard really started at 503 in the window and the bar sat entirely
behind it. The overlap was also 46 too small (178 instead of 224), so the bottom padding and
the scrolling were slightly short. Fix (form0-react-native): `keyboardTopInWindow` in
`src/keyboard-layout.js`: on Android the top is the window height minus the keyboard's height;
iOS keeps `screenY` (window coordinates there). Two unit tests with the device's numbers
(`tests/keyboard-layout.test.mjs`, 12 of 12). The "hide" line in the first log was the keyboard
being closed. The debug log stays until the fix is confirmed, then is removed before the commit.

Web top labels: their padding goes from 6px to 2px above and below, the same as side labels,
so fields sit about 26px apart on both platforms (`labelTop` in `src/field-renderer.css.js`).

Mockup "Review round 5 · supporting images and descriptions" published: inline image as a
framed figure at the field's width (at most 200px web, 180pt mobile) that opens larger on click
or tap; dialogs titled with the field's label (mobile says "Field Information" today); on mobile
the description and the image open as a bottom sheet. Today's look, from the code: web inline
image unframed, centred, 250px; mobile inline image 150pt; subtext under the label on both.

Tests: mobile unit 133 of 135 (known failures), fixtures 63 of 63.

### Round C, third device pass and round 4 in progress (2026-11-17, nothing committed)

Confirmed on Android: the keyboard toolbar now sits on the keyboard (Previous / Next walk the
text fields only, as wanted); the debug log for it is removed. Open question: make the toolbar
slightly more visible (for example a stronger top line), without making it loud.

Fixed after this pass (uncommitted):

- **Sheet flash** (sections and issues sheet; also the mobile template's iOS picker sheet): the
  slide offset was never reset on close, so the next opening drew the sheet fully open for a
  frame, then jumped away when the slide started on the Modal's `onShow` (most visible with the
  keyboard open, since closing it delays `onShow`). The slide now starts in a layout effect
  when the sheet opens, before its first frame (`src/form-renderer.jsx`,
  `src/field-renderers/date-time-pickers.js` in the mobile template).
- **Issue cards showed data names** (labels came back after reopening the sheet a few times):
  the issue list prefers the summary prepared by the managed events (`rootEvents.summary`,
  older than this work: `48f50d1`), whose issues carry names but no field objects; the in-form
  summary has them. `buildNavigationIssues` now looks the field up by name
  (`validatableRootFields`) when an issue comes without one.
- **Picking an issue did not scroll to its field**: cause not found yet (names match, so the
  lookup should work). A temporary log is in `navigateToRootValidationIssue`
  (`[form0 nav] issue`, marked "do not commit"): run it on the device, pick an issue, read the
  line (hidden flag, instance path, section, whether the input and container refs exist).

Answers recorded:

- **Remove confirmation**: web never asked (`handleRepeatableRemove` removes at once, no
  confirmation in its history); mobile has its own dialog ("Remove this entry?"). Round 4's note
  "same confirmation as today" was wrong for web. To decide: add the same confirmation on web.
- **"Existing damage notes" has no asterisk**: in the starter schema it is `required: false`
  with only `visible_conditions` (`item_condition` equal to `damaged`); the error comes from an
  event, `ON('validate-repeatable', 'equipment_items', …)` calling `INVALID(...)`. The engine
  does not know the field is required, so no asterisk. With `required: true` (the visibility
  condition already limits it to when it shows) the asterisk appears when the field does and
  the engine's own check covers it. To decide: change the starter schemas (web and mobile
  templates), keeping or dropping the event.
- Round 5 decisions: 1, 2, 3 ok; **plus pinch to zoom in the mobile image sheet** (no
  dependency: PanResponder with two touches and Animated, pan while zoomed, reset on close);
  the inline description stays under the label on both platforms and in both label layouts,
  which is already the case (the mockup text that said otherwise is corrected).

**Round 4 implemented, tests not yet updated:**

- form0-react: `src/repeatable-list-parts.jsx` (new: `RepeatableEntryRows`,
  `RepeatableEmptyState`, `RepeatableCount`), used by `RepeatableSectionList`
  (`src/form-renderer.jsx`) and the building plan's floor list
  (`src/building-plan/section-view.jsx`); styles in `src/form-renderer.css.js` (one bordered
  list with dividers, 44px rows that open the entry, 36px trash button, dashed empty state with
  "Add the first entry", count pill beside the title).
- form0-react-native: `RepeatableListScreen` in `src/form-renderer.jsx` (count and description
  line, dashed empty state with a secondary "+ Add the first entry", one bordered list, 56pt
  rows that open the entry, 44pt trash button through the existing confirmation dialog, no
  hardcoded colours).
- Each row's accessible name is now the entry's title (before: a button named "View"); the
  trash button is "Remove <title>".
- **Tests to migrate**: web suite 240 of 276 (30 new failures besides the six worker tests) and
  mobile fixtures (`native-editor`, and probably `native-reset`) open entries and floors through
  buttons named "View". Drill-down section rows still say "View"; entry and floor rows must now
  be found by their title (for example `getByRole('button', { name: 'Rooms 1' })`). Harness:
  `native-icons.jsx` gained `List` and `Trash2`.

### Round C, fourth device pass (2026-11-17, third chat, nothing committed)

Reported on Android: picking an issue could leave its field behind the keyboard; opening the
sheet with the keyboard up flashed; no issue count in an entry's header after a failed Save
(tapping the title listed the issues); the Sections tab stayed active without sections; the first
saved entry kept a dashed border until the page was opened again.

Decisions: Sections tab disabled without sections on web and mobile (3b); keyboard closed before
the sheet opens (5); remove confirmation on web as on mobile (6); `required: true` for "Existing
damage notes" and its `validate-repeatable` event dropped (7); stronger toolbar top line (8);
round 5 as proposed, with a shared mobile bottom sheet (9).

Changed:

- **Issue navigation (mobile).** The `[form0 nav]` log showed the lookup works (field,
  container and section found; choice fields have no input). Likely cause, not proven on the
  device: navigation ran two frames after the sheet was told to close, while the Modal was
  still fading out and held the window's focus, and it started two scrolls (one before focus,
  the keyboard's after it) that could overlap. Now the sheet slides down and the pick runs once
  the Modal is gone; a text field is only focused and placed by the keyboard's own reveal; a
  field without an input is scrolled to; when no reveal happens within 800 ms (no keyboard, or
  the field was already focused) it scrolls anyway. `focusField` in
  `src/keyboard-aware-scroll.jsx`, used by the root and the entry editor
  (`src/form-renderer.jsx`). The debug log is removed.
- **Sheet (mobile).** New `src/bottom-sheet.jsx`: `BottomSheet` (backdrop fade and sheet slide,
  both ways; `onClosed` after the Modal is gone) and `afterKeyboardCloses` (dismisses the
  keyboard and opens on `keyboardDidHide`, 400 ms fallback). `FormNavigationSheet` uses it;
  `useNavigationSheetActions` in `src/form-renderer.jsx` opens it and runs the picked section or
  issue on close, for the root and the entry editor.
- **Entry header count (mobile).** The entry editor's `FormHeader` now gets `issueCount`.
- **Sections tab.** Mobile: disabled (0.45 opacity) without sections, and the sheet then opens
  on Issues (`src/form-renderer.jsx`). Web: "Navigation" is shown disabled instead of hidden
  (`src/navigation-tree.jsx`).
- **Dashed border (mobile).** The empty state and the list were the same `View` in a ternary;
  Android kept the removed dashed border when it was reused. Separate keys and an explicit
  `borderStyle: 'solid'` (`RepeatableListScreen`). Same pattern fixed on the inherited-value
  input of the building plan (`src/field-renderer.jsx`), which kept its dashed border after an
  override.
- **Toolbar.** Top line uses `borderStrong` (`src/keyboard-aware-scroll.jsx`).
- **Remove confirmation (web).** New `src/remove-entry-dialog.jsx` ("Remove this entry?", the
  entry's title, "This cannot be undone.", Cancel focused, Escape cancels, focus kept inside,
  focus back on the trash button after Cancel). `RepeatableEntryRows` asks before calling
  `onRemove`, so root lists, nested lists and the floor list all confirm. The form's global
  shortcut handlers skip key events from the dialog (`isRemoveEntryDialogEvent`).
  `useFocusTrap` moved unchanged from `src/form-renderer.jsx` to `src/use-focus-trap.js` so the
  dialog can use it. Test: `tests/repeatable-remove.test.jsx` (3).
- **Starter schemas** (web and mobile templates, identical): `damage_notes` `required: true`;
  the `validate-repeatable` event on `equipment_items` removed (building-condition-survey still
  shows one); `tests/starter-schemas.test.mjs` and `docs/starter-schema-review.md` updated.

Tests migrated (round 4 rows are named by their title): web accepted-view,
building-plan-derived-engine, building-plan-editor, building-plan-reset, choice-events fixture,
engine-options-diagnostics, event-reporting fixture, record-renderer, renderer-events,
repeatable-opening, submission-reporting (the header Add, since an empty list also offers "Add
the first entry"); mobile record-renderer, building-plan-editor and building-plan-reset fixtures,
the identical choice-events and event-reporting fixture copies, and the source check in
`tests/field-registry.test.mjs`.

Results: web 273 of 279 (the six worker tests, as before); mobile fixtures 63 of 63; mobile unit
145 of 151, all six failing at HEAD too, because form0-react-native resolves its installed
`form0-core` (Nov 1): consumer audit manifest, `building-plan-touch` (no
`BUILDING_PLAN_ZOOM_LIMITS`), and four managed question tests in `managed-events` (two of which
hang without `--test-timeout`); mobile template schemas 8 of 8; web template schemas 5 of 8 (its
installed core rejects the building survey's `building_plan` attributes; unrelated).

Found while migrating, not changed: a floor row is titled "Floor #1" on web
(`section-view.jsx`: `floor.label || 'Floor #n'`, and `floor.label` is empty) and "Floors 1" on
mobile (generic entry title), while the canvas tab says "Ground Floor".

### Round C, fifth pass (2026-11-18, third chat, nothing committed)

The fourth pass was confirmed on the device (issue navigation for typed fields, sheet with the
keyboard up, entry header count, Sections disabled, first saved entry, toolbar line, remove
confirmation, damage notes). Reported: the bar appears just after the keyboard; picking a
choice while a text field is focused leaves it focused and the bar gone; issue navigation does
not bring choice (and other untyped) fields into view; on web the remove dialog had a double gap
above "This cannot be undone" and an empty space in Remove, and mobile's confirmation buttons
differed from web's; floor rows were titled "Floor #1" / "Floors 1".

Changed:

- **Bar timing (mobile).** Android reports the keyboard only once it is fully open. When a text
  field gets focus, the bar now slides up with the keyboard (280 ms) to where that kind of
  keyboard ended last time (remembered per field type, so the number pad keeps its own height);
  the report then corrects it. The first keyboard after launch keeps the short delay; without a
  keyboard (hardware keyboard) the bar is withdrawn after 700 ms. On the report the bar is placed
  from the last measured viewport at once, then re-measured (`src/keyboard-aware-scroll.jsx`;
  `src/field-renderer.jsx` passes the field type on focus).
- **Bar lost after a Modal (mobile).** A picker or an alert made Android report the keyboard
  hidden and the controller forgot the focused field; the keyboard came back with no focus
  event. A hide now keeps the field while its input still has the focus (`isFocused()` or
  `TextInput.State.currentlyFocusedInput()`).
- **Choices end typing (mobile).** Picking an option in a single or multiple choice, or Yes/No,
  closes the keyboard; their pickers open once it has closed. New `src/keyboard-dismiss.js`
  (`endTyping`, and `afterKeyboardCloses` moved there from `bottom-sheet.jsx`). The mobile
  template's date and time pickers also open after the keyboard closes
  (`src/field-renderers/date-time-pickers.js`).
- **Untyped fields on issue navigation (mobile).** Typed fields worked because focusing them
  makes Android scroll them into view; untyped fields rely on one scroll. A temporary log showed
  the reported scroll position always equal to a measured one, and the untyped jumps either
  scrolling (78pt) or not needing to (already visible): with nothing to show the jump, a field
  already on screen looked like a miss. So the field jumped to is now highlighted briefly
  (primarySoft, 1.5 s): new `src/field-highlight.jsx`, used by `renderElements` for every field
  container, with a provider for the form and one per entry editor. Jumping to such a field also
  ends typing in another field, as picking a choice does, and scrolls once the keyboard has
  closed (`focusField`). The measured position and the log were removed again.
- **Remove dialog (web).** Title and sentence as two lines with one gap; Remove has a trash icon;
  Alt+Q / Alt+Y badges and shortcuts as in the discard dialog (`src/remove-entry-dialog.jsx`).
- **Confirmation dialogs (mobile).** New `src/confirm-dialog.jsx` (outlined Cancel, solid confirm
  in the error colour, 44pt, theme colours only; the hardcoded pinks are gone), used by the
  remove dialog (with a trash icon; a BuildingPlan removal warning goes in the message, not in
  the bold title) and the discard dialog.
- **Row names.** BuildingPlan rows in lists show their own name through form0-core's
  `buildingPlanRowTitle` (floor name, room name, wall label), falling back to "<section> <n>".
  Web: `controller.js` (floor and room labels; it read `floor_name`, which no longer exists under
  that name and is a choice), `section-view.jsx`, and a `rowTitle` for `RepeatableSectionList`
  at the root and in entry dialogs. Mobile: `getRepeatableEntryTitle`. Entry screen headers keep
  their position title ("Rooms 2"). Entry lists are now named after their section
  (`aria-label` on web, `accessibilityRole="list"` + label on mobile).

Tests: web 273 of 279 (the six worker tests); mobile fixtures 63 of 63 (building plan fixtures
find rows through the named list); mobile unit 135 of 137 without `managed-events` (the two
known). Web building plan tests assert the floor row "Ground Floor" and the room row "Bedroom";
mobile asserts the floor row.

### Next

1. Fifth pass on the device (2026-11-18): choices ending typing, issue navigation with the
   highlight, both dialogs and row names work. Open: the bar still appears slightly after the
   keyboard (to decide: accept, check in a release build, where JavaScript runs faster than in
   development, or frame-synced bar with `react-native-keyboard-controller`, a native
   dependency needing a development build). To check: a jump to a choice field now ends typing.
   **Update (2026-11-18, fourth chat):** everything above confirmed by hand, including the jump
   to a choice field; `react-native-keyboard-controller` parked for now.
2. ~~Round 5~~ and ~~round C commit~~: done (see "Round 5" below).
3. ~~Sheet drag and pinch area~~: tested by hand and committed (`a1bc827`); the temporary
   gallery is removed from the mobile template.
4. Remaining work, order agreed on 2026-11-18:
   1. Close the refresh, in this chat: review of the steps marked "to review" (checklist under
      "Review of steps 3, 4, 6, 7, 8 and 12" below) and the clipped label icon with side labels
      on a phone.
   2. **In progress (2026-11-18, fifth chat: mockups and decisions, see "Building plan round").** Building plan round, in a new chat (research, mockups and discussion first): step 5
      (building plan on theme tokens, one themed tooltip), step 10 (mobile plan editor in a
      bottom sheet) and the second phase (dimensions on the building plan). Before
      localization, since it adds and changes the building plan's texts.
   3. Localization, phases 1 to 3, in a new chat (`analyses/localization.md`).
   4. iOS pass: postponed until an iOS device is available (keyboard steps 9 and 11, sheets,
      pinch, pickers), with the keyboard bar timing decision (a release build check first).
   5. Release, handled by the maintainer: merge `feat/ui-refresh` into
      `experiment/building-plan-model` (a fast-forward in both libraries: 24 and 11 commits
      ahead, none behind), finish the building plan work there, publish form0-core, then the
      bindings, then update the templates. The mobile template's npm links are replaced by the
      published packages on the next `npm install` after its versions are bumped (the lockfile
      records registry versions, not the links).
   6. Reform upgrade: tracked in
      `reform-frontend-tanstack/analyses/FORM0_PRODUCTION_ADOPTION_HANDOFF.md` (section "UI
      refresh, building plan and localization", 2026-11-18).
   7. Decided 2026-11-18: no section counts. Still open: mobile dates typed in the locale's
      order (undecided) and dropdown search on web (to keep discussing).

### Round 5: supporting images and descriptions (2026-11-18, fourth chat, reading only)

Scope (decided): framed inline image at the field's width (at most 200px tall on web, 180pt on
mobile; today 250px and 150pt) that opens larger on click or tap; dialogs titled with the
field's label; on mobile the description and the image open as a bottom sheet on `BottomSheet`;
pinch to zoom in the mobile image sheet (1x to 4x, pan while zoomed, reset on close, no double
tap, PanResponder and Animated, no new dependency). Inline descriptions stay under the label.

How it works today (both platforms read `description_mode` and `supporting_image_display` the
same way: `subtext` / anything else, `dialog` / anything else):

- **Web** (`src/field-renderer.jsx`, styles in `src/field-renderer.css.js`): subtext under the
  label in every layout (in the label column for side labels). The inline `<img>` is centred,
  unframed, 250px tall with `object-fit: contain`, above the control (in the control column for
  side labels), not clickable. Dialog mode: 24px icon buttons after the label open native
  `<dialog>`s (480px max) titled **"Field information"** and **"Supporting image"** with an icon,
  the label repeated in bold in the body. Escape closes, focus returns to the button, a backdrop
  click does not close. The three dialog effects (description, image, FormLinkField warning) are
  the same code three times. Local paths load from `/supporting-images/<path>`.
- **Mobile** (form0-react-native `src/field-renderer.jsx`): same placement. The inline image is
  150pt tall at full width, `contain`, not tappable; it shows only when the app's image resolver
  returns a source (the template's generated registry). Dialog mode: centred fading Modals
  titled **"Field Information"** / **"Supporting Image"**, the label again in the body, a
  footer button ("Got it" / "Close"), backdrop tap closes; the image is 250pt tall with the
  label as a caption.
- The mockup said web dialogs were already titled with the label "since step 4"; they are not.
  Item 2 therefore applies to web too.
- No test covers these dialogs or the inline image on either platform.
- The starter schemas have no inline image and no dialog description: every image is in
  `dialog` mode (the 900×540 `evidence-photo-guide.png`), every description is `subtext`.

Round C committed first (2026-11-18): form0-react `e7d4728` (code) and `c539fdc` (notes),
form0-react-native `0208522`, web template `2c190bc`, mobile template `45e135a` (starter schema)
and `6fd9c4b` (pickers). The mobile template's local `buildingPlanDerivedCommands` line in
`Form0Form.js` stays uncommitted, as marked.

Decisions (2026-11-18, all as recommended):

1. Web dialogs: the label is the title; no title icon, no bold label repeated in the body.
2. Web image viewer: up to about 960px / 92vw wide, image up to about 80vh; the description
   dialog stays at 480px.
3. Web: a backdrop click closes the description and image dialogs (not the confirmations).
4. Mobile sheets: grab handle (visual only), label as title on up to 2 lines, Done in the
   header, no footer button; the header shared with the sections sheet in `bottom-sheet.jsx`.
5. Pinch to zoom: around the fingers' midpoint; hard stops at 1x and 4x, no bounce, no glide;
   pan clamped to the image edges; one finger pans only while zoomed; zoom stays inside the
   sheet's image area. Runs in JavaScript, so it may stutter in a development build.
6. Mobile inline frame: height follows the image's shape, at most 180pt (size read with
   `Image.resolveAssetSource` for bundled images, `Image.getSize` for URLs).
7. Test material: temporary only, removed before the commit.
8. Files: web `src/field-help.jsx` (figure, dialogs, one dialog hook for the three copies);
   mobile `src/field-help-sheets.jsx`, `src/zoomable-image.jsx`, `src/pinch-zoom.js` (pure
   limits, Node unit tests).
9. Kept as today: the inline image in the control column for side labels; UI texts in English
   in the components (the libraries have no translation layer).

**Implemented (2026-11-18, nothing committed, to test by hand):**

- form0-react: new `src/field-help.jsx` (`SupportingImageFigure`, `DescriptionDialog`,
  `ImageViewerDialog`, `useModalDialog`, `supportingImageSrc`) and `src/field-help.css.js`.
  The figure is a button named "View supporting image for <label>", like the image button, with
  a corner expand mark; the image keeps its shape, never enlarged, at most 200px tall. Dialogs:
  the label as title, an X close button, backdrop press-and-release closes; description text keeps
  its line breaks (`pre-line`, as on mobile); the viewer is up to 960px / 92vw, image up to 90vh
  minus the header. The FormLinkField warning keeps its markup and uses `useModalDialog`. Unused
  styles removed (`supportingImage`, `supportingImageDialog*`). `src/field-renderer.jsx` 649 →
  519 lines.
- form0-react-native: `src/bottom-sheet.jsx` gains `BottomSheetHeader` (handle, title on
  `titleLines` lines, Done) and `bottomSheetSurface`, now also used by the sections sheet. New
  `src/field-help-sheets.jsx` (`SupportingImageFigure`, `DescriptionSheet`, `ImageSheet`,
  `useImageSize`: `Image.resolveAssetSource` for bundled images, `Image.getSize` for URLs, a
  fixed 180pt frame when the size cannot be known), `src/zoomable-image.jsx` (PanResponder and
  Animated; the box's centre is measured when a gesture starts, since the sheet slides in after
  layout), `src/pinch-zoom.js` (`fitImage`, `clampScale`, `clampView`, `startGesture`,
  `moveGesture`). The image sheet is up to 85% of the window; the description sheet 72%, scrolling.
  `src/field-renderer.jsx` 678 → 420 lines.
- Tests: web `tests/field-help.test.jsx` (4; jsdom has no `showModal`, the test stubs it);
  mobile `tests/pinch-zoom.test.mjs` (9) and `tests/field-help.fixture.jsx` (3, run through the
  harness's `native-field-help.test.jsx`). Results: web 277 of 283 (the six worker tests);
  mobile fixtures 66 of 66; mobile unit 144 of 146 without `managed-events` (the two known);
  mobile template 11 of 11 with the gallery in place.
- Checked in screenshots (web harness, react-native-web preview): frames follow the image's
  shape in both layouts and themes; sheet titles wrap to two lines; the description sheet
  scrolls.

**Temporary, remove before the commit** (mobile template only):

- `src/forms/ui-gallery/` (untracked) and the two lines marked TEMPORARY in
  `src/forms/registry.js`.
- `assets/supporting-images/gallery-wide.png` and `gallery-tall.png` (untracked), then
  `npm run generate-images` again to restore `src/supporting-images/index.js`.
- Unchanged: the `buildingPlanDerivedCommands` line in `Form0Form.js` (local, never committed).
- Side labels on the device: `layout.labelPosition: 'side'` in `form0.config.js`, then back.

Harness (local, not a repository): the UI gallery has a "Supporting images and descriptions"
section (inline with subtext, wide and tall grid images, both dialogs with a long description,
a long label, a LabelField); `make-gallery-images.mjs` writes the grid images to
`gallery-images/`, served at `/supporting-images/gallery-*.png`; `native-web-preview.mjs`
shows the mobile gallery (`?form=gallery`, `&labels=side`) with an image resolver;
`native-rn.jsx` has `Animated.Image`, `native-icons.jsx` `Maximize2`.

Found, not changed: with side labels on a phone the label column (30%) is too narrow for a label
with two icons; the second icon is clipped ("Moisture reading (%)" in the gallery). Older than
this round.

Device checklist (round 5):

1. Inline figure: frame at the field's width; wide image shorter than 180pt; tall image 180pt,
   centred; tap opens the image sheet titled with the label.
2. Image button (dialog mode) opens the same sheet; Done, backdrop and Android back close it.
3. Pinch: zooms around the fingers, stops at 1x and 4x; one finger pans only while zoomed and
   stops at the edges; lifting one finger of a pinch continues as a pan without a jump;
   reopening starts at 1x.
4. Description sheet: label as title (long label on two lines, then cut), long text scrolls.
5. Sections sheet looks as before (now on the shared header).
6. Web (harness, UI gallery): figure click and the image button open the wide viewer; the
   description dialog titled with the label; Escape, X and a backdrop click close; focus returns
   to the button.

Round 5 tested by hand (2026-11-18) and committed: form0-react `4dde915` (code) and `c3ab878`
(notes), form0-react-native `033d936`. The temporary gallery stays in the mobile template for
the next change.

### Round 5 follow-up: sheet drag and pinch area (2026-11-18, tested by hand, committed `a1bc827`)

Reported: pinching is hard when the sheet is short. The pinch area was the image's own shown
size (about 360×215pt for a landscape image), so a taller sheet alone would not have helped.
Decided: both A and B.

- **A. Pinch area fills the image sheet.** The image sheet opens at 75% of the screen
  (`openShare`); `ZoomableImage` fills the sheet's body, measures itself, fits the image inside,
  centred, and pinches anywhere in the area. Zoomed, the image moves until its edges reach the
  area's edges; along an axis where it still fits, it stays centred (`clampView` and
  `moveGesture` take the image and the area). When the area changes size, the image is fitted
  again and the zoom kept within the new edges.
- **B. Every sheet drags by its handle and header.** Up to just below the status bar (safe-area
  top inset, 32pt without a SafeAreaProvider, plus 8); letting go settles on the nearer stop or
  the one a flick points to; below the opening height the sheet moves down instead of shrinking,
  and letting go more than 30% of that height down (or flicking down) closes it. Applies to the
  sections and issues sheet, the description sheet and the image sheet. Vertical moves are taken
  even from Done; scrolling lists inside sheets are not affected (the drag lives on the header).
  The height animates on the JavaScript thread (it is a layout property); the slide stays
  native. The drag is not exposed to screen readers (Done remains).
- Files (form0-react-native): new `src/sheet-drag.js` (pure: `dragFrame`, `dragEnd`) and
  `src/use-sheet-drag.js` (`useSheetDrag`, `useSheetDragHandlers`, the context);
  `src/bottom-sheet.jsx` (two nested views: the outer slides with the native driver and holds
  the limits, the inner takes the dragged height; `openShare`; the closing slide clears an
  expanded sheet); `src/zoomable-image.jsx`; `src/pinch-zoom.js`; `src/field-help-sheets.jsx`.
- Tests: `tests/sheet-drag.test.mjs` (7), `tests/pinch-zoom.test.mjs` (11); mobile unit 153 of
  155 (the two known), fixtures 66 of 66. In the react-native-web preview: opening at 75%, drag
  up to full height, back to the opening height, and down to close all work. Two preview-only
  effects: the browser hands a mouse drag to text selection, and react-native-web decides a
  move's target from where the pointer is, so a first step that leaves the header is lost.
  Neither applies to touch on a device.

Device checklist:

1. Image sheet opens at about three quarters of the screen; pinching works anywhere in the grey
   area, including above and below a landscape image.
2. Zoomed in, a landscape image pans sideways to its edges and stays centred vertically until it
   is taller than the area.
3. Drag the header up: the sheet follows the finger and settles at the top (below the status
   bar); the image is fitted again (a tall image grows), the zoom stays within the edges.
4. Drag it back down: it settles where it opened; further down (or a flick down) closes it, and
   the next tap on a field or button works at once.
5. Description sheet with the long text, and the sections sheet: drag up, scroll the list or
   text inside, drag back; Done still works with a plain tap.

### WSL crashes (2026-11-17)

Four WSL crashes (Nov 15, and Nov 17 at 10:53, 13:30, 13:36) left kernel-panic reports in
`%TEMP%\wsl-crashes`. All four are the same hardware machine check delivered to the WSL VM:
`Machine Check Exception: 4 Bank 0: b200000080060001 ... Processor context corrupt ... Fatal
machine check`, each on a different vCPU (19, 3, 5, 11). Windows logged no WHEA hardware
error. The three on Nov 17 happened in the same second a headless Chromium started (journal of each
boot); the Nov 15 one happened with no Chromium running. It does not happen at every
launch: about 18 other Chromium launches that day were fine, and a video call was also running
during that session, which adds load. So Chromium (and other bursts across all cores, such as builds)
is at most a trigger, not the cause; the cause is on the host (CPU stability
under sudden load, power or undervolt profile, firmware, or the WSL kernel/Hyper-V).

How commands are run since: one at a time, pinned and lowered (`taskset -c 0-3 nice -n 10`),
Vitest with `--maxWorkers=2`, `node --test --test-concurrency=2`, screenshots with Playwright's
`chrome-headless-shell` and `--disable-gpu --renderer-process-limit=1`, one browser launch per
batch, and the preview servers stopped before tests. No crash since (signature, tests, template
screenshots and the mockup render all ran this way).

### Review of steps 3, 4, 6, 7, 8 and 12 (2026-11-18, reviewed; fixes to test)

Most of these were exercised while testing later rounds; the points below are the ones worth a
deliberate look. Record the outcome of each here.

Web, in the harness (`node preview.mjs`, http://127.0.0.1:4180; the bar switches form, colour,
labels, width and "Show as"):

1. Step 3, form shell (Building Condition Survey, light and dark, Wide and Phone, Page and
   Modal): title centred with the EDITING / VIEWING pill and the record row; navigation panel
   (current section as a pill with the accent bar, one chevron for drill-down sections, two for
   repeatable ones, 14px tabs); section cards with a filled header band; drill-down rows with the
   accent bar and a count pill; the repeatable entry modal's header and body.
2. Step 7, nested sections (UI gallery, "Structure" four levels deep): only the top section is a
   card; each nested level has a full-width band with its path, long paths shortened with "…".
3. Step 4, dialogs and marks (UI gallery): answering "Protected species (three options)" opens a
   MESSAGEBOX (input, three buttons, the first primary), then an ALERT; Cancel after a change
   opens the discard dialog (Cancel secondary, "Yes, discard" in the error colour; never seen
   rendered in screenshots); the lock on "Survey reference (read-only attribute)" (also shown on
   the Record Metadata fields); the "Calculated" mark on a calculated field.
4. Step 8, inherited values (Building plan fixture, a room, then a wall): position tag after the
   label; inherited value dashed and muted with its source inside; after a change, "Reset" in
   the same place; for dropdowns and choices the tag or button sits under the control.

Mobile, on the device with the mobile template:

5. Step 6, controls and chrome: most were covered in round C; still to look at: ALERT and
   MESSAGEBOX buttons stacked at full width (first primary), calculated fields (filled, bold,
   "Calculated"), nested inline sections with the path band (Building Condition Survey), the
   navigation sheet's entries (48pt, current one with the accent bar, chevrons).
6. Step 8 on mobile: the same inherited and overridden states as 4, in the building survey's
   plan.

Templates:

7. Step 12, web template (`node template-web-preview.mjs`, http://127.0.0.1:5174): the date
   picker on the form's palette with a Today button; `custom-example.css.js` as a complete brand
   theme (enable it to see it).
8. Step 12, mobile template: `src/themes/brand-example.js` (light and dark), switched on from
   `form0.config.js`.

Clipped label icon (Next, 4.1): with side labels on a phone the label column is 30% wide (about
107pt). When a label's longest word plus its two 24pt icons (image and info) is wider than that,
the row is too cramped: in the react-native-web preview the second icon was pushed out of the
column (the browser does not shrink text below its longest word); on a device the text is
squeezed instead and the native text layout breaks the word. Seen on "Moisture reading (%)".
Older than this work.

Outcome (2026-11-18): steps 3, 4, 6, 7, 8 and 12 approved, with three small fixes asked for in
this pass; step 8 gets more work in the building plan round. Changed (nothing committed, to test
by hand):

- **Entry dialog spacing (step 3).** The case reported: "Notes" right under the "System
  fields" section in a floor entry. Beside the plan canvas the entry form sat in a plain `<div>`,
  so sections had no margin at all and "Notes" touched the card. That column now has a class
  (`repeatableModalPlanFormColumn`) and shares the dialog column's rules: sections keep 1rem below
  them, and a field right after a card (a section or Record Metadata) starts 1.5rem below it
  (card after card keeps 1rem). In the plain entry dialog the same rule moves the first field
  8px further from Record Metadata (about 19px before). The root has the same pattern if a schema
  puts a field right after a section; not changed there. Tested by hand and committed
  (`96ff0fe`).
- **Nested list rows in entries.** A floor's "Rooms" showed as a card inside a section card
  (16px above, about 33px below). form0-core puts it beside "System fields" and "Notes", not in a
  section (`building-plan-expander.js`: system section, extra fields, then children); the
  wrapper came from form0-react's `RepeatableEntryForm`, which put every nested repeatable's row
  in a `repeatableModalSection` div. The row is now one `drilldownInactive` card, as at the root,
  and counts as a card for the spacing rule above. Mobile already drew one card. Not committed.
- **Flash between MESSAGEBOX and ALERT (step 4).** Answering a MESSAGEBOX cleared the dialog at
  once and the ALERT from its callback was queued a moment later, so for a frame no overlay was
  mounted and the page showed through. New `src/managed-alert-dialog.jsx` (`ManagedAlertDialog`,
  replacing the two identical copies in `form-renderer.jsx`): a closed dialog's backdrop stays
  for 200ms and fades (`data-closing`, no pointer events); a dialog that follows reuses the same
  element. Measured in the harness frame by frame: the answer is followed by one frame of the
  closing backdrop, then the ALERT, never a frame without a backdrop. Test:
  `tests/managed-alert-dialog.test.jsx`.
- **Today's dot (step 12, web template; tested by hand, committed `c0932e9`).** First moved to 1px from the bottom, which put it
  against the edge of the filled or tinted day. Now every day number sits 2px above the centre
  (4px bottom padding on all day buttons, so numbers stay aligned along a row) and the dot is
  back at 3px from the bottom, with room above and below it (`src/styles/form0-overrides.css`).
- **Label icons with side labels (4.1, option a; tested, committed `f4faede`).** The mobile label row wraps: the label keeps
  at least 96pt beside its tag and icons, and when that does not fit they move under the label.
  Wide rows (top labels) are unchanged, long labels still wrap beside the icons. Spacing between
  label, tag and icons is now the row's `columnGap` (`src/field-renderer.jsx`). A single word
  wider than the whole column (for example "Measurement" in a 104pt column) still breaks; only a
  wider column or smaller text avoids that.
- Harness: the UI gallery has "Spacing after sections" (the same fields at the root and in a
  repeatable entry); `native-web-preview.mjs` has `?form=label-icons` (`&labels=side`).

Tests: web 278 of 284 (the six worker tests, after the plan column change too); mobile fixtures
66 of 66; mobile unit 153 of 155 (the two known).

**Dropdown search on web (decided 2026-11-18: in form0-react).** form0-core allows
`is_searchable: true` only for `display: 'default'` (SingleChoiceField rejects it with
`radio`, MultiChoiceField with `checkbox`), and then requires `is_searchable_mode: 'default'`.
Web ignores the attribute and shows a native `<select>`; mobile filters by a case-insensitive
"contains" on the label ("Search...", "No results"), keeps "Other" at the end of the list
unfiltered, and clears the search when the picker closes. Design agreed on 2026-11-18: the field
looks like today's dropdown and opens a panel with the search box focused; matches anywhere in
the label ignoring case and accents (mobile gets accent folding too); ↑ ↓ Enter Escape Tab;
single choice closes on pick, multiple stays open with checkboxes; "Other" at the end, never
filtered; an × clears a choice when the field is not required; multiple choice shows the chosen
labels, then "+n" for the ones that do not fit; non-searchable dropdowns keep the native list.
Mockup (its own page, with a working demo): https://claude.ai/artifact/FKV6Dm3fn72LjNP2r3bzz6.
Version 2 (after review): "Other" in multiple choice checks and shows its text input; the × also
on required fields and in multiple choice (proposed); every web dropdown on the same field and
panel, without the search box when not searchable, typing jumps to the first match (proposed;
tests set choices through events and snapshots, so few tests depend on the native select);
mobile adjustments (proposed): the picker on `BottomSheet` with the field's label as title and
Done in the header instead of its own Modal titled "Select an option" with Clear / Done at the
bottom, the same × on the field, labels then "+n" for multiple choice, accent-insensitive search;
radio circles and checkboxes stay.

All of version 2 agreed on 2026-11-18. Also committed that day after hand testing: the
MESSAGEBOX → ALERT backdrop (`b3c947e`) and the nested list row as one card (`97e183b`).

**Dropdowns implemented (2026-11-18, tested by hand, committed):**

- form0-react: `src/field-components/choice-dropdown.jsx` (`ChoiceDropdown`: the field is a
  button with the field's id, named by the label and the value; × clear; chevron; keys; outside
  press closes), `choice-dropdown-panel.jsx` (search box, options, "Other" after a separator,
  footer), `choice-dropdown-layout.js` (`OTHER_VALUE`, `isOpenDropdownEvent`,
  `isDropdownEvent`, panel placement, the "+n" count measured with a hidden span),
  `src/choice-dropdown.css.js`, `src/utils/choice-search.js` (`foldText`, `filterOptions`,
  `typeAheadIndex`). Every SingleChoiceField / MultiChoiceField with display "default" uses it;
  radio and checkbox displays are unchanged. The panel renders in place (absolute, under the
  field, above it when there is less room below within the viewport and the nearest clipping
  container), not in a portal, so it also works inside a host's native `<dialog>`. Picking
  "Other" in single choice moves the focus to its text input. Multiple choice keeps the
  selection it has just sent until the engine's value comes back, so quick clicks do not undo
  each other (the old `<select multiple>` had the same weakness). The form's global shortcuts
  (capture phase on window) skip events from an open dropdown, and simplified mode's "Enter goes
  to the next field" skips dropdowns.
- Tests: `tests/choice-dropdown.test.jsx` (7: search ignoring accents, keyboard pick, ×, no
  results with "Other" and its focused input, type-to-jump and Space, multiple choice with
  "Other" and clear, quick toggles, Escape closes the panel and not a form-modal, read-only).
  Migrated: `building-plan-editor.test.jsx` (the translated floor name read from the field,
  not an `<option>`), `consumer-compatibility.fixture.jsx` (web picks "Other" through the
  dropdown). Web 285 of 291 (the six worker tests).
- form0-react-native: `src/field-components/choice-trigger.jsx` (`ChoiceTrigger`: value, "+n",
  × with a 44pt touch area, chevron; the "+n" count from hidden copies of the label prefixes
  that report their widths, rendered only once the field has a size), `choice-picker.jsx`
  (`ChoicePickerSheet` on `BottomSheet` with `BottomSheetHeader`: the label as title on up to two
  lines, Done, drag; search box when searchable; radio circles or checkboxes; "No results";
  "Other" after a separator), `src/utils/choice-search.js`. The old picker (its own Modal
  titled "Select an option", Clear and Done at the bottom) is gone; both choice files lost about
  200 lines each. Same quick-toggle fix as web.
- Tests: `tests/choice-picker.fixture.jsx` (3) through the harness's
  `native-choice-picker.test.jsx`; fixtures 69 of 69; unit 153 of 155 (the two known). Harness:
  `native-icons.jsx` gained `Check`, `ChevronDown`, `Search`; `native-web-preview.mjs` has
  `?form=dropdowns`; the web UI gallery has a "Dropdowns" section (searchable single and
  multiple with "Other", not searchable single and multiple).
- Checked in screenshots: web light and dark, side and top labels, phone width ("+4" with
  "Other" and its input); mobile through react-native-web (sheet with search, "+3", ×).
- After the hand test: on web the "Other" input sat right against the dropdown (no gap; the old
  `<select>` had none either). The dropdown and the input are now in a column 8px apart
  (`stack` in `choice-dropdown.css.js`), as on mobile (`marginTop: 8`); measured 8px at the root
  and in an entry dialog, single and multiple choice (the harness gallery's entries got two
  dropdowns with "Other" for this). The panel styles moved to `src/choice-dropdown-panel.css.js`
  to keep both stylesheets under 300 lines. Web 285 of 291 (the six worker tests).

## Building plan round (2026-11-18, fifth chat: reading, research, mockups; no code)

Branches checked: form0-react and form0-react-native on `feat/ui-refresh` (clean, not yet
merged into `experiment/building-plan-model`), form0-core on `experiment/building-plan-model`.
Mockups: https://claude.ai/artifact/GPW3m7Tiq9XvEERPMoxYVB (today's screenshots next to A ·
Aligned and B · Studio; working demos for door flipping and length editing; decisions D1 to D14).
Screenshots were taken one browser launch at a time, pinned and lowered; no crash.

### How it looks and works today

Web (`section-view.jsx`, `canvas-host.jsx`, `toolbar/`, `zoom-controls.*`, `canvas.css`,
`legacy/building-plan-canvas.js`):

- Plan page: three columns. Vertical tool rail (Select, Clear | Split, Rejoin, Draw Room, Column,
  Beam, Wall | Door, Window) with an "alt+shift+x" caption under every icon; per-mode enabled
  state from `toolbar-config.js`. Then the canvas panel: floor tab (legacy blue button), "Pin /
  unpin" and a hint line, then a 16:9 canvas; Split adds a row ("Split distance [m]", "Split at
  distance", hint). Right: the Floors panel with its own "Add" button and the fixed description
  "Each floor created from the canvas is stored here.", although the header has "Add Floor" and
  the empty list "Add the first entry".
- Floor and room entries (dialog): Record Metadata, then grey Undo / Redo, then the same canvas.
- Colours are hardcoded everywhere: rail, zoom, tabs, canvas (`#fafafa`), grid (1 m `#e6e6e6`,
  10 cm from 150% zoom, 5 m at 50% and below), origin axes and a "0,0" label, rooms in their own
  colour at 35% with a blue outline, walls `#444`, selection red, doors green bars, windows blue
  bars, columns orange, beams purple, names in boxed badges. Dark mode: canvas and rail stay
  white and the hint line is light grey on white.
- Tooltips: three CSS `::after` tooltips (rail to the right, zoom to the left, floor placeholder
  above) plus native titles on the legacy canvas buttons; elsewhere in the form, native `title`.
- The view opens at the origin, not fitted, so a small plan sits in the top-left corner. No
  lengths are drawn; no door hinge or swing exists in the data.

Mobile (`canvas.jsx`, `touch-controller.js`, `form-renderer.jsx`):

- At the root the plan is a drilldown row ("Building layout · View"). Its page puts the canvas
  first in the page's scroll view: 18 wrapped text buttons (Add floor, Select, Pan, Resize, Room,
  Wall, Split, Rejoin, Pin / unpin, Door, Window, Column, Beam, Zoom in, Zoom out, Reset view,
  Free drag), floor buttons only with two or more floors, a 320 pt canvas without a grid or an
  empty state, then the Floors row. Floor and room editors also show the canvas first, with Undo
  and Redo, then the fields.
- Theme colours are used (dark works) except doors and windows (fixed green and blue). A
  selected room shows width and height inputs with "Set dimensions"; a selected wall shows
  "Split at distance". Pan is a tool because a drag on the canvas competes with the page scroll.

form0-core facts that matter here: a wall's parallel move exists (`resize_face`), as do
`move_corner`, `resize_room` and session-only wall pins (`toggleWallPin`); doors store label,
width, height, segment index, start and end ratios and a wall reference (`building-plan-blueprint.js`),
nothing about hinge or swing.

### Research (sources in the mockups page)

- magicplan help centre: wall length by room, wall, then tapping the blue measurement;
  "Change Measurement" pop-up with Apply, Units, laser; same from the details panel (swipe up on
  a phone); typed lengths lock automatically (lock icon), unlock by dragging and confirming or
  "Unlock"; without locks, lengths win over angles; angled walls come from dragging corners;
  "Set Diagonal" adds a corner-to-corner measurement. No documented door swing control
  ("Mirror Object" is for asymmetrical objects). Drawing style is not documented.
- BIMCraft (Rust/egui desktop, Revit-like, no touch): door swings drawn in plan, placement with
  `flip_facing` and `flip_hand`, door kinds; dimensions editable by typing, the far reference
  stays; wall poché and hatches; main and sub grid.
- Revit "Flip Hand" / "Flip Facing" as two on-canvas flip controls; Chief Architect "Change
  Opening/Hinge Side" and "Change Swing Side" or a handle dragged along or across the wall.
- Apple HIG sheets (nonmodal sheet, medium and large detents, grabber, one sheet at a time);
  Android BottomSheetBehavior (peek, half-expanded, draggable).

### Proposals and open decisions (waiting for the go-ahead)

Proposed order: 1) step 5 web on tokens (canvas tokens derived with `color-mix`, neutral
architectural symbols, quieter grid with a scale bar and no origin axes, fit on open, icon rail
without captions, one themed tooltip, floor tabs with "+", horizontal zoom pill, status line,
the Floors panel's "Add" and fixed description removed); 2) step 10 mobile (still preview in the
form, full-screen editor with bottom bar and a sheet on selection); 3) door swing (two system
fields on Door, `door_hinge_side` left/right and `door_swing` inward/outward as seen from the
row's room, twin rows mirrored by core; two flip handles); 4) dimensions shown (selected room's
inside lengths, Dimensions switch); 5) dimensions edited (popover on web, length sheet on
mobile, end that stays chosen, the far wall moves parallel; diagonal walls by length or run and
rise); locks later. The decisions, with options and recommendations, are D1 to D14 in the
mockups page. New UI texts: one module per library (`building-plan/plan-text.js`) with future
catalog keys, English only, listed on the page.

### Alignment on step 5 (2026-11-18, same chat; mockups version 2, no code)

Decided by the maintainer:

- **Web layout A** (D2). The right panel stays the RepeatableSection list panel: title with the
  count pill, rows that open and delete like every list, plus a per-floor pill such as
  "5 rooms" (wording open, D21). The panel's extra "Add" and its fixed description go.
- **Grid** (D4): magicplan-like coarse crosses with finer dots. Proposed spacing by zoom: crosses
  every 1, 5 or 10 m, dots every 10 cm, 25 cm or 1 m, keeping crosses at least about 48 px apart
  and dots about 12 px; no origin axes; a 1 m scale bar.
- **Shortcuts**: plan actions stay Alt+Shift so they never meet the form's plain Alt (Q, Y, B,
  S, A, M). Proposed new ones: N pin, = − 0 zoom, L dimensions, Z / Y undo and redo, H / F door
  flips. Found: the plan toolbar matches `event.key`, the form `event.code`; with Option held
  macOS types another character, so the plan shortcuts probably don't fire on a Mac (not tested).
- **Handles** on web and mobile for every existing drag: room corners and wall grips, opening
  start, end and slide, column corners and body, beam ends and body; the lengths that change
  are drawn while dragging, and clicking one types it. Facts checked: web already has these
  drags (room and wall handles, opening start/end/centre, beam start/end, column body); mobile
  has no handles and uses a Resize mode instead; `updateDoor` / `updateWindow` take start and
  width, columns and beams take their values, so typed values need no core change. A wall's
  typed length is the existing parallel move (`resize_face`) of the neighbouring wall, one
  operation; run and rise on a diagonal would be two (corner move and parallel move), so a
  combined core operation is the clean way for that one.
- **Plaster** shown on the canvas, read only. In form0-core it is a wall-face value
  (`wall_plaster`, `wall_plaster_thickness`, plus `_outside` for the outer face), inheriting the
  floor's interior and exterior defaults (`building-plan-floors.js`); `fieldState()` returns the
  resolved value. Proposed: a tone band on the plastered face, to scale with a 2 px minimum, a
  Plaster switch next to Dimensions.
- **Beams at any height**: beams store width, depth (vertical), length and ends, no height. Proposed:
  one new system field, the underside height from the finished floor, with references that only
  fill the number (top of the wall, over the window, under the window, custom); a dashed beam with
  a height tag on the plan; a read-only front view of the wall (openings from existing data) with
  the beam band. Open: what "place over a beam" means.

Proposed order now (mockups page, top): 1 look only, 2 read-only layers (plaster, dimensions),
3 handles and live lengths, 4 typed values, 5 mobile, 6 new data (door swing, beam height, wall
elevation, run and rise). New decisions D15 to D21 (mobile handles, plaster style, beam height
data, front view, refactor of the 4,204-line legacy canvas, `event.code`, row count wording).

### Step 1 of the building plan round (2026-11-18, done, to test by hand, not committed)

Plan, approach and status now live in `analyses/building-plan-ui.md`. Agreed that day: grid with
a cross on every metre at every zoom (magicplan), plaster thickness drawn, doors as a plain cut
for now, only the legacy canvas's drawing moves into modules, one commit per unit. Step 1 (web,
look only) is in three units: chrome on tokens with one tooltip and shortcut matching; canvas
drawing on the theme (`draw/` modules, every colour literal gone from the legacy canvas); the
floors list panel (no extra "Add", rooms pill per row). Web 294 of 300 with the local core (the
six worker tests). Hand-test checklist and file lists in `building-plan-ui.md`.

### Steps 1b and 1c (2026-11-18, done, to test by hand, not committed)

Sharp canvas (bitmap by `devicePixelRatio`), finer grid, rooms pill dropped; plan entries titled
by their name through a generic `title_field` the form0-core expander now adds (wall faces
excepted: their label is projected); rail in the mockup's groups with Pin as a tool and new
icons, floor tabs in React with "+" and Undo / Redo icons, the hints as a status line and the
split distance as a floating bar on the canvas. Web 297 of 303 (the six worker tests), core
suite green. Details in `analyses/building-plan-ui.md`.

### Step 1d, first part (2026-11-18, done, to test by hand, not committed)

Decisions taken on the mockups. Done: wall entries titled by their label (form0-core reads
projected fields for titles), the wide three-column plan entry dialog with its stacked fallback,
top labels in plan entries, the split distance to the centimetre. Next in 1d: the canvas in leaf
entries and the list ↔ canvas link. Details in `analyses/building-plan-ui.md`.

### Step 1d, second part (2026-11-18, done, to test by hand, not committed)

Exported records back to exactly what they were (plan rows titled for display only), 100% = 100
px per metre, fit on open and a Fit plan button, names a fixed size on screen, the canvas in
every plan entry (view only for walls, doors, windows, columns, beams), list rows and canvas
marking each other, the plan page laid out like the dialogs, and a fix for double-click opening
another room's element. Details in `analyses/building-plan-ui.md`.

### After the 1d hand test (2026-11-19, committed)

The BuildingPlanSection page as wide as the plan dialogs (the web template's form page no longer
caps it), the building plan source tag inside choice dropdowns, and the first part of step 3:
hit distances and handles in screen pixels, openings selected and moved from anywhere on their
band with a live preview, and a grip on the selected wall. Decided for 1e: canvas messages in the
status line plus issue markers (M1 + M2), out-of-scope elements faded on three levels (V1).
Details in `analyses/building-plan-ui.md`.

### 1e, M1 (2026-11-19, hand-tested, committed)

Plan agreed on the frames artifact; details and the hand-test list in `building-plan-ui.md`.
`canvas-host.jsx` split (adapters to `canvas-adapters.js`, move only). Refusals now show in the
canvas status line (React, red, "1 of 2", ×) with a dashed ghost of the refused position and
the element in the way outlined; the row under the canvas is gone. After the hand test the
refusal arrow starts where the element is shown (where it stopped, or where it went back), not
where the drag began. Web 314 of 321 (the six worker tests and the timing flake).
