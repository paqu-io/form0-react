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
| Sections and issues panel | Kept. Left of the form on web. On mobile it still opens by tapping the title; a small chevron after the title marks it as openable and a small count shows only while there are issues |
| Nested sections | Flat: only the top section is a card. Every nested level keeps a filled, full-width header band, lighter and smaller with depth; deep levels name their parent |
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
| 2 | Controls: input, textarea, select, choice lists, yes/no, buttons, `kbd`; all states; error row | form0-react | todo |
| 3 | Form shell: header, mode indicator, section bands and gaps, navigation panel, repeatable list | form0-react | todo |
| 4 | Dialogs (ALERT, MESSAGEBOX, discard, description, supporting image); calculated vs read-only | form0-react | todo |
| 5 | Building plan on theme tokens: canvas, toolbar, zoom, floor tabs | form0-react | todo |
| 6 | Steps 1 to 5 mirrored on mobile, with 48px controls and the "Sections" header button | form0-react-native | todo |

### Structural (each needs a go-ahead)

| # | Step | Repo | Status |
|---|---|---|---|
| 7 | Nested sections shown flat | both | todo |
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
http://127.0.0.1:4180. It bundles this package's build with the local `form0-core` source in
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
