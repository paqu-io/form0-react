# UI refresh: plan and change log

Tracks the default-styling refresh for `form0-react` and `form0-react-native`
(issues form0-react#77 and form0-react-native#45), and later the two starter templates.

- Mockups: https://claude.ai/artifact/JgvW22r7DGSLXaNPux7WeB (private)
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
| 4 | Dialogs (ALERT, MESSAGEBOX, discard, description, supporting image); calculated vs read-only | form0-react | todo |
| 5 | Building plan on theme tokens: canvas, toolbar, zoom, floor tabs | form0-react | todo |
| 6 | Steps 1 to 5 mirrored on mobile, with 48px controls and the "Sections" header button | form0-react-native | todo |

### Structural (each needs a go-ahead)

| # | Step | Repo | Status |
|---|---|---|---|
| 7 | Nested sections shown flat, with the path in nested headers. Web done in step 3 | both | web **to test**, mobile todo |
| 8 | Inherited values, variant 1 | both | todo |
| 9 | Mobile keyboard: one mechanism, whole field above the keyboard, dynamic bottom space | form0-react-native | todo |
| 10 | Mobile plan: still preview in the form, full-screen editor with bottom sheet | form0-react-native | todo |
| 11 | Keyboard bar | form0-react-native | todo |
| 12 | Templates: brand theme example, date picker on library tokens, remove workaround CSS | both templates | todo |

## Needs a decision

- Search for dropdowns on web (new feature).
- A date picker on mobile (new feature, probably a dependency).
- Dimensions drawn on the canvas and edited in place (new logic; second phase, see below).
- Section counts (new derived state).

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
- The web template's `custom-example.css.js` omits several contract keys.
- The mobile template has an uncommitted local edit in `src/components/Form0Form.js` marked
  "do not commit". Left alone.
- The built CSS contains one `line-height: undefined` that predates this work. To fix in step 2.
- Seen in the bare preview, both predating this work: inputs overflow their section on the
  right when the host page has no `box-sizing` reset (the template's Tailwind reset hides it),
  and the "Navigation" tab label is clipped on the left. To fix in steps 2 and 3.

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

## Manual testing

Web: `node preview.mjs` in `.local-test-harnesses/form0-ui-refresh-20261116/`, then open
http://127.0.0.1:4180. The bar offers a "UI gallery" form (cases the starter schemas lack,
such as three-option Yes/No) and "Show as: Modal", which puts the form in a host dialog. It bundles this package's build with the local `form0-core` source in
memory, so nothing is installed or linked, and a page reload rebuilds after a source change.
`shots.mjs` in the same folder writes screenshots of a fixed set of views.

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
