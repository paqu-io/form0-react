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
    - The registry now auto-syncs with `FIELD_SPECS` and logs the current renderer gaps: (none – `SignatureField`, `VideoField`, and `FormLinkField` now render with OSS-compatible placeholders where reform-only features apply).  
  - [x] Add a display-only `LabelField` renderer that reuses description/media affordances from the shared FieldRenderer layout.  
  - [x] Add a read-only `TitleField` renderer that surfaces the derived title value in a text input.  
    - `FormRenderer` now derives @title strings from referenced fields and renders them ahead of the main sections.  
  - [x] Implement `StatusField` support with a color-coded pill, select input, and read-only badge rendering.  
  - [x] Implement `PhotoField` with multi-upload previews, caption editing, and read-only gallery mode.  
  - [x] Implement `VideoField` with multi-upload previews, caption editing, duration metadata, and read-only playback.  
  - [x] Implement `FormLinkField` with CLI-parity placeholders, reform-only notices, and proper value wiring.  
  - [x] Allow downstream apps to register overrides for built-in field types (with clear reform-only gaps flagged).  
    - Scoped registry support (`createFieldRegistry`, `FieldRegistryProvider`) documented in README; new field types remain a form0-core concern.
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

---
---

# ARCHITECTURAL REVISION (2025-11-03)

## Summary of Revised Approach

After discussion about field registry extensibility, theming, and how form0-test1 should serve as the reference template, we've clarified a **layered architecture** where:

1. **form0-react (library)** ships with **minimal, functional HTML components** (no opinionated styling)
2. **form0-test1 (Vite template)** ships with **production-ready, pre-styled field renderers** using Tailwind + custom components
3. **Future templates** (Next.js, TanStack Start, etc.) can use different styling approaches while building on the same form0-react foundation
4. **Developers** get polished fields out-of-the-box from templates, with easy customization via theme tokens/Tailwind config

## Current State Analysis

**Good news:** Most of the required infrastructure already exists!

### Already Implemented ✅
- **Field component registry** with public API:
  - `registerFieldComponent(type, component)` - global registration
  - `getFieldComponent(type)` - retrieval
  - `listRegisteredFieldTypes()` - introspection
  - `getMissingFieldComponentTypes()` - gap detection
- **17 minimal field components** covering all form0-core field types
- **FieldRenderer wrapper** handling labels, descriptions, errors, accessibility, validation display
- **Clean component contract**: Field components receive `{ field, value, onChange, readOnly, inputProps, className }`
- **Auto-sync with FIELD_SPECS** from form0-core

### What Needs Work 🔨
- **Documentation** of the extension API and renderer contract
- **Context-based registry** (optional enhancement for SSR/testing isolation)
- **Production-ready field renderers** in form0-test1 template
- **Template scaffolding** via CLI (`form0-cli forge react --template vite`)

## Revised Priorities by Section

### Section 2: Field Registry
**Status:** ~90% complete, needs documentation

**What changes:**
- ~~"Allow downstream apps to register overrides"~~ → **Already works** via `registerFieldComponent()`
- **Add (optional):** Context-based registration via `<FieldRegistryProvider>` for advanced use cases (SSR, testing)
- **Critical next step:** Document the renderer contract and extension pattern

**Implementation:**
```javascript
// Already works (global registration):
import { registerFieldComponent } from 'form0-react';
registerFieldComponent('DateField', CustomDatePicker);

// Optional enhancement (context-based):
<FieldRegistryProvider renderers={{ DateField: CustomDatePicker }}>
  <FormRenderer schema={schema} engine={engine} />
</FieldRegistryProvider>
```

### Section 4: Theming & Styling
**Status:** De-prioritized for form0-react core, critical for templates

**What changes:**
- **form0-react core:** Keep minimal styling (current vanilla-extract classes are sufficient)
- **form0-test1 template:** Implement comprehensive theming via Tailwind + CSS variables
- **Template responsibility:** Define theme tokens, color schemes, typography, spacing

**Rationale:**
- Templates can use any styling system (Tailwind, styled-components, CSS modules, etc.)
- Avoids coupling form0-react to specific styling opinions
- Each template demonstrates a production-ready approach that developers can customize

### Section 5: Developer Experience & Tooling
**Status:** This becomes the critical path

**What changes:**
- **Vite template (form0-test1) priority:** Build production-ready field renderers with:
  - Tailwind for styling
  - Third-party libraries where appropriate (react-datepicker, etc.)
  - Custom icons and polish
  - Theme customization via Tailwind config
  - Register all custom renderers in `main.jsx`
- **CLI scaffolding:** `form0-cli forge react --template vite` copies form0-test1
- **Template structure:**
  ```
  form0-test1/
  ├── src/
  │   ├── field-renderers/          # Production-ready custom components
  │   │   ├── text-field.jsx
  │   │   ├── date-field.jsx        # Uses react-datepicker
  │   │   ├── choice-field.jsx      # Searchable dropdown
  │   │   └── index.js              # Exports all renderers
  │   ├── main.jsx                  # Registers custom renderers
  │   └── tailwind.config.js        # Theme customization
  ```

### Section 6: Documentation
**Status:** Critical for adoption

**What changes:**
- **Priority 1:** Document field renderer contract (props, expected behavior)
- **Priority 2:** Show how to override field components in templates
- **Priority 3:** Demonstrate template customization (colors, fonts, spacing)
- **Include:** Side-by-side comparison of minimal (library) vs. polished (template) renderers

## Key Architectural Decisions

### A. Minimal Library, Polished Templates
- **form0-react** remains framework-agnostic with basic HTML inputs
- **Templates** (form0-test1, future Next.js, etc.) demonstrate production-ready styling
- **Benefit:** Supports any styling system, no forced dependencies

### B. Global Registration by Default
- Templates use simple global registration in entry point (`main.jsx`)
- **Optional:** Context-based registration for advanced scenarios (SSR, per-form styling)
- **Benefit:** Simple for 90% of use cases, flexible for the other 10%

### C. Prop-Based Renderer Contract
- Field components receive minimal props: `{ field, value, onChange, readOnly, inputProps, className }`
- **Optional:** Add helper hooks (`useFieldState`, `useFieldActions`) if patterns emerge requiring them
- **Benefit:** Simple, predictable, easy to implement custom renderers

### D. Template-First for Styling
- Library provides the mechanisms (registry, renderer contract)
- Templates provide the aesthetics (Tailwind, custom components, icons)
- **Benefit:** Clear separation of concerns, easy to customize

## Concrete Next Steps

1. **form0-react (library):**
   - [ ] Document renderer contract in README
   - [ ] Export TypeScript types for renderer props (if not already exported) -> I'd like to stay with JavaScript if possible
   - [ ] (Optional) Add `<FieldRegistryProvider>` for context-based registration
   - [ ] Ensure all utility helpers are exported (`prepareSchema`, etc.)

2. **form0-test1 (template):**
   - [ ] Create `src/field-renderers/` directory
   - [ ] Build production-ready renderers for all field types:
     - [ ] TextField, NumericField (basic but styled)
     - [ ] DateField, TimeField (with custom picker library)
     - [ ] SingleChoiceField, MultiChoiceField (searchable/filterable)
     - [ ] PhotoField, VideoField (polished upload UI)
     - [ ] BooleanField, StatusField (styled toggle/badge)
     - [ ] SignatureField, FormLinkField (reform-only notices)
   - [ ] Register all custom renderers in `main.jsx`
   - [ ] Add Tailwind configuration for theme customization
   - [ ] Document customization approach in template README

3. **form0-cli:**
   - [ ] Implement `form0-cli forge react --template vite` command
   - [ ] Copy form0-test1 as base template with all custom renderers
   - [ ] Include README explaining customization options

4. **Documentation:**
   - [ ] Renderer contract reference (props, behavior, accessibility requirements)
   - [ ] Extension guide (how to override/add custom renderers)
   - [ ] Template customization guide (Tailwind config, CSS variables, swapping libraries)
   - [ ] Examples of common customizations (date pickers, choice components, file uploads)

## Questions for Review / Feedback

1. **Styling approach for form0-test1:** Tailwind + custom components vs. Tailwind + shadcn/ui? -> Tailwinf + custom components
2. **Context-based registry:** Required now or defer until use case emerges? -> TBD
3. **Helper hooks:** Add `useFieldState()`/`useFieldActions()` proactively or wait for patterns? -> TBD
4. **Template distribution:** Keep in-repo vs. publish as npm package (e.g., `create-form0-app`)? -> TBD
5. **TypeScript:** Should templates include TypeScript variants or JavaScript-only initially? -> JavaScript-only initially

---

**Note:** This revision doesn't invalidate the original roadmap—it clarifies implementation strategy and surfaces the fact that most registry infrastructure is already complete. The main work ahead is building polished template implementations and documenting the extension patterns.
