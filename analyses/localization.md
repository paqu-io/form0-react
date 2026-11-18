# Localization of the form UI: plan

Status: decided on 2026-11-18, not started. To pick up in a new chat. Read this file, then
"Rules for this work" and "WSL crashes" in `analyses/ui-refresh.md` (heavy commands one at a
time, pinned and lowered).

Scope: the text the libraries themselves show (buttons, dialogs, sheets, empty states, issue
lists, accessibility labels) and form0-core's validation messages, in English, Spanish, French
and Italian. Not in scope: text the form author writes (labels, descriptions, choices,
`pattern_description`, messages from events such as `INVALID()`, `ALERT`, `MESSAGEBOX`), which
stays as written; forms in several languages would be a separate feature. Not in scope either:
form0-cli's own preview renderer, which has its own translations.

## Decisions (2026-11-18)

1. **Hybrid.** Built-in tables for en, es, fr and it, chosen by the `locale` prop that both
   renderers already take, plus a `messages` prop that overrides single texts. English stays the
   default, so a host that passes nothing sees no change.
2. **One shared catalog in form0-core.** Web and mobile use the same keys and translations;
   core's validation messages are translated in the same place. (Core already holds the building
   plan's translations.)
3. **Validation messages get a code.** Each validation finding keeps its English `message`
   (backward compatible) and gains a stable `code` and `params`; the libraries translate by code
   and fall back to the message.
4. **Same branch**, in new chats, one phase per chat: `feat/ui-refresh` in form0-react and
   form0-react-native, or `experiment/building-plan-model` once the maintainer has merged
   `feat/ui-refresh` into it (planned). Check the current branches first.
5. Specific props keep priority over the catalog: mobile `primaryActionLabel` (Reform passes its
   own translated "Save"), `submissionOptions.messages` (web) / `messages` (mobile) of the child
   calculations review.

## What exists today

- **Renderers.** `FormRenderer({ locale = 'en' })` in both libraries (form0-react
  `src/form-renderer.jsx`, form0-react-native `src/form-renderer.jsx`) passes `locale` only to
  `BuildingPlanPresentationProvider`, which calls form0-core's `createBuildingPlanPresentation`
  (`src/building-plan/presentation.js`: a `TRANSLATIONS` table keyed by the English text for fr,
  it and es; `normalizeBuildingPlanLocale` maps any tag to en/es/fr/it, English otherwise).
  Changing the locale repaints controls without rebuilding the engine.
- **Overridable texts today.** `submissionMessages` (both libraries,
  `utils/submission-presentation.js`) for the "Update child calculations?" dialog; mobile
  `primaryActionLabel`. Everything else is English in the components.
- **form0-core validation.** `src/engine/submission-validation.js` builds findings with a
  `kind` ('required' | 'error' | 'custom') and an English `message` ("This field is required");
  value rules in `src/schema/field-value-registry.js` return English sentences (about 16 "must
  be …" messages) built with the field's data name.
- **Inventory (rough).** form0-react about 180 texts in 30 files (most in
  `building-plan/legacy/building-plan-canvas.js`, `form-renderer.jsx`,
  `field-components/signature-field.jsx`, `utils/managed-events.js`, `navigation-tree.jsx`);
  form0-react-native about 140 in 26 files (`form-renderer.jsx`, `building-plan/canvas.jsx`,
  `field-components/signature-field.js`, `utils/managed-events.js`). The count misses single
  words ("Done", "Cancel") and texts built from variables, so the real number is higher. Many
  texts are the same on both platforms. Script: `ui-strings.py` in the harness folder
  (`.local-test-harnesses/form0-ui-refresh-20261116`), `python3 ui-strings.py <src dir>`.
- **form0-cli.** A language setting (auto, en, es, fr, it) for its terminal messages and its
  own preview renderer (`src/locales/*.json`, `client` section); it does not reach the libraries.
- **Reform web** (reform-frontend-tanstack): Paraglide, `src/i18n.ts` (`supportedLocales` en,
  es, fr, it; `getCurrentLocale()`; a `reform:locale-changed` event). The wrapper
  `src/form0-renderer/components/Form0Form.jsx` passes no `locale` to form0-react. Uses the
  published form0-react `^0.4.0`.
- **Reform mobile** (reform-mobile-react-native-expo): Paraglide and `expo-localization`
  (`src/i18n/provider.tsx`, device language or stored preference, the same four languages).
  `src/features/records/record-editor-screen.tsx` passes `primaryActionLabel={m.shared_save()}`
  and no `locale`. Uses the published form0-react-native `^0.2.1`.

Effect on Reform: none until it upgrades to the new library versions (the refresh is not in
Reform yet either) and passes `locale`, one prop in each app. On web, `locale` also switches the
building plan's labels, as intended.

## Proposed design (to confirm at the start of phase 1)

- **form0-core** `src/ui-messages/`: `catalog/en.js`, `es.js`, `fr.js`, `it.js` (flat key →
  string, placeholders `{label}`, `{count}`); plural forms as `key.one` / `key.other` chosen with
  `Intl.PluralRules`; `createMessages({ locale, overrides })` returning `t(key, params)`; locale
  normalised like `normalizeBuildingPlanLocale` (shared helper). Exported through a subpath
  `form0-core/ui-messages`, like `form0-core/building-plan` (`package.json` `exports`).
- **Keys** by area and purpose: `sheet.done`, `fieldHelp.viewImage` (`View supporting image for
  {label}`), `list.addFirst`, `validation.required`, …
- **Validation** findings: `code` (`required`, `min_length`, `pattern`, …) and `params`; the
  libraries show `t('validation.' + code, params)`, falling back to `message`.
- **Libraries:** a `MessagesProvider` with `useMessages()` in each; `FormRenderer` gains
  `messages` (overrides) next to the existing `locale`. Accessibility labels are translated too.
- **Tests:** in core, every catalog has the same keys and the same placeholders as English (the
  rule form0-cli follows for its locale files); in each library, a render with `locale="it"`
  shows Italian for a few texts; existing tests stay in English (the default).
- **Translations:** drafted by Claude; the user reviews Italian; French and Spanish need a
  native check (listed as "to review" until then).

## Phases (one chat each)

1. **form0-core:** catalog module, locale helper, `createMessages`, subpath export, validation
   codes and params, tests. Seed the catalog with the validation texts.
2. **form0-react:** provider, `messages` prop, extraction file by file, tests.
3. **form0-react-native:** the same, reusing phase 2's keys wherever the text is the same.
4. **Translations:** complete es, fr, it; review; reader docs in form0-docs-zudoku (`locale`,
   `messages`, the list of keys).
5. **Reform** (with the Reform upgrade): pass `locale` in `Form0Form.jsx` (web, following
   `reform:locale-changed`) and `record-editor-screen.tsx` (mobile, from the LocaleProvider).

## Open questions for phase 1

- Which form0-core branch: core is on `experiment/building-plan-model`; the UI refresh needed
  nothing in core until now.
- Whether the building plan's `TRANSLATIONS` (keyed by English text) move into the catalog or
  stay.
- Number and date formatting by locale: out of scope unless it falls out of the same work.
- Mobile: whether `locale` should follow the device by default or stay `en` (proposal: stay
  `en`; the host decides, as Reform already detects the language).
