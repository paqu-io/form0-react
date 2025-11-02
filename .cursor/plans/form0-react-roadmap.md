# form0-react Roadmap

This roadmap captures the current priorities for evolving `form0-react` so it can sit alongside `form0-core` and the CLI as a production-ready rendering layer. We can refine/update this document as work progresses.

## 1. Stabilize Engine Integration
- [ ] **Refactor `useFormEngine`**  
  - [x] Memoize schema preparation (key generation, validation) so it only runs when inputs change.  
  - [x] Expose stable setters (`setValue`, `setValues`, `reset`, `submit`) that don’t mutate engine state during render.  
  - [ ] Add lifecycle hooks (`onUpdate`, `onWarning`, event subscriptions) mirroring core engine events.  
    - [x] Invoke `onUpdate` callback after state syncs.  
    - [x] Bridge engine warning system to `onWarning` handlers with automatic cleanup.  
    - [ ] Revisit event subscription interface once we decide whether to expose engine listeners in the React API.
- [ ] **Schema utilities package**  
  - [x] Provide shared cloning/key helpers (`cloneDeep`, `cloneSchema`, `ensureSchemaKeys`, `prepareSchema`) and export them for consumers.  
  - [ ] Revisit additional helpers as more schema tooling is identified (parsing, validation summaries, etc.).

## 2. Expand Field Surface Through a Registry
- [ ] **Introduce a field component registry**  
  - [x] Establish registry infrastructure with default components (TextField, NumericField, CalculatedField) and expose public registration helpers.  
  - [x] Add built-in renderers for `SingleChoiceField` (select/radio, with “other” support) and `BooleanField`; surface warnings for unhandled field types via `FIELD_SPECS`.  
  - [x] Implement `MultiChoiceField` (multi-select & checkboxes with “other” handling) plus `DateField`/`TimeField` inputs (including `default_value: 'now'` support).  
  - [x] Generate default mappings from `form0-core` field metadata (`FIELD_SPECS`) so supported types stay in sync.  
    - The registry now auto-syncs with `FIELD_SPECS` and logs the current renderer gaps: `SignatureField`, `VideoField`, `FormLinkField`.  
  - [x] Add a display-only `LabelField` renderer that reuses description/media affordances from the shared FieldRenderer layout.  
  - [x] Add a read-only `TitleField` renderer that surfaces the derived title value in a text input.  
    - `FormRenderer` now derives @title strings from referenced fields and renders them ahead of the main sections.  
  - [x] Implement `StatusField` support with a color-coded pill, select input, and read-only badge rendering.  
  - [x] Implement `PhotoField` with multi-upload previews, caption editing, and read-only gallery mode.  
  - [ ] Allow downstream apps to register overrides or custom fields (with clear reform-only gaps flagged).  
  - [ ] Ensure Calculated, Choice, Date, Boolean, Multi-Choice, Rich text, etc., all render with feature parity.
- [ ] **Field-level validation & messaging**  
  - Display validation errors from the engine per field, with hooks for custom messages.

## 3. Layouts, Modes, and Accessibility
- [ ] **Finish existing modes**  
  - Simplified mode: respect engine visibility/required state, remove direct `document` listeners (support SSR/React 19).  
  - Drilldown/spotlight: support breadcrumbs, section metadata, and optional multi-column layouts.
- [ ] **Accessibility audit**  
  - Ensure ARIA attributes, focus management, and keyboard navigation are correct across all modes (especially modal/drawer contexts).
- [ ] **Layout configuration**  
  - Provide a lightweight configuration surface (label placement, widths, spacing) so apps – including the CLI scaffold – can set defaults without forking components.

## 4. Theming & Styling Contract
- [ ] **Expose full design tokens** via vanilla-extract so designers can override typography, spacing, and component states.  
- [ ] **Honor layout props** (`formWidth`, `labelWidthPercent`, `labelPosition`) by applying the CSS custom properties already scaffolded in the demo apps.  
- [ ] **Document custom theme creation** with examples (light/dark, brand palette) and ensure React Native parity via a shared token schema.

## 5. Developer Experience & Tooling
- [ ] **Storybook / Component catalog**  
  - New docs workspace that imports `form0-react` (and eventually `form0-react-native`) with stories for every field + mode.  
  - Integrate visual regression or interaction tests to guard against UI regressions.
- [ ] **CLI integration**  
  - `form0-cli forge react --template <stack>` command that scaffolds production apps, copies schemas, and wires `form0-react` with sample routing.  
  - Include multi-schema switching examples and notes on reform-only capabilities.
  - Decision pending: confirm whether the CLI should generate a sibling app template (preferred path today) or support in-place workspace mutation once we prototype both experiences.
- [ ] **Testing strategy**  
  - Add component tests (React Testing Library) for critical field behaviors.  
  - Smoke tests that mount real schemas and assert engine <> UI synchronization.
- **Vite example template**  
  - Treat `form0-test1` as the canonical starter app once it matches production expectations (theme modes, multi-schema routing, connector examples).  
  - Keep the template in-repo/GitHub for now; no need to publish an npm package unless distribution via npm proves necessary.  
  - When CLI scaffolding is ready, have `form0-cli` copy/clone this template so developers get the same baseline experience.

## 6. Documentation & Communication
- [ ] **Public API reference** describing props (`FormRenderer`, hooks, utilities) and extension points.  
- [ ] **Feature matrix** highlighting OSS vs reform-only support, published outside the CLI UI so it’s easy to track.  
- [ ] **Migration guide** for teams moving from the CLI preview to a production React/React Native app.

---

**Open Questions / Future Investigations**
- Shared metadata package between web and native renderers (vs. duplication).  
- Event handling story (custom handlers, async submission, integration with connector packages).  
- Performance profiling for large schemas (virtualization, memoized subtrees).
