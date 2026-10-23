# form0-react

[![NPM Version](https://img.shields.io/npm/v/form0-react)](https://www.npmjs.com/package/form0-react)
[![NPM Downloads](https://img.shields.io/npm/dm/form0-react)](https://www.npmjs.com/package/form0-react)
[![CI](https://github.com/paqu-io/form0-react/actions/workflows/ci.yml/badge.svg)](https://github.com/paqu-io/form0-react/actions/workflows/ci.yml)
![NPM License](https://img.shields.io/npm/l/form0-react)
[![Docs](https://img.shields.io/badge/docs-docs.form0.dev-2563eb)](https://docs.form0.dev)
[![Website](https://img.shields.io/badge/site-form0.dev-0f172a)](https://form0.dev)
![NPM Last Update](https://img.shields.io/npm/last-update/form0-react)
[![Socket](https://socket.dev/api/badge/npm/package/form0-react)](https://socket.dev/npm/package/form0-react)

> [!NOTE]
> form0 is in active development and is available to use today. Its schema format and core
> concepts are stable in practice, but releases before 1.0 may include breaking changes. Pin your
> versions and review the release notes when upgrading. A formally stable release is coming.

`form0-react` is the React UI layer for the [form0 ecosystem](https://form0.dev). It combines the
`form0-core` engine with accessible default field renderers while allowing applications to replace
the presentation with their own components and design system.

## 🚀 Start with the CLI

For a new project, install [`form0-cli`](https://github.com/paqu-io/form0-cli) and follow the
[quickstart](https://docs.form0.dev/getting-started/quickstart). Choose the web application option
to start from the maintained React and Vite template.

Install `form0-react` directly when integrating it into an existing React application.

## 📦 Installation

```bash
npm install form0-react form0-core
```

Install compatible React peer dependencies if the application does not already provide them.

## ⚡ Quick example

```jsx
import { FormRenderer } from 'form0-react';
import 'form0-react/index.css';

const schema = {
  form: {
    name: 'Contact form',
    status_field: null,
    elements: [
      {
        type: 'TextField',
        key: 'name',
        data_name: 'name',
        label: 'Name',
        display: 'default',
        description: null,
        description_mode: null,
        required: true,
        required_conditions: null,
        visible: true,
        visible_conditions: null,
        read_only: false,
        read_only_conditions: null,
        default_value: null,
        pattern: null,
        pattern_description: null,
        supporting_image: false,
        supporting_image_path: null,
        supporting_image_display: null,
      },
    ],
  },
};

export function ContactForm() {
  return <FormRenderer schema={schema} onSubmit={(record) => console.log(record)} />;
}
```

## Custom renderers

Applications can replace or extend field components without forking the package. Use the exported
field registry APIs or a `FieldRegistryProvider` to keep application-specific UI outside the form
engine.

`FormRenderer` also supports consumer-owned state and layout integration:

- `headerAccessory` renders application UI between the form summary and body.
- `externalDirty` includes application-owned changes in discard confirmation.
- `submitBlockedReason` prevents submission while an external condition is unresolved.
- `recordMetadataFields` can provide read-only display data that never enters engine values.

## ✅ Requirements

- Node.js 22 or newer
- React 18 or 19
- React DOM 18 or 19
- `@vanilla-extract/css` 1.17.4 or newer

Worker mode requires a bundler that supports ESM module workers and rewrites
`new Worker(new URL(..., import.meta.url), { type: 'module' })`. Vite-based applications are
supported. `FormRenderer` uses the packaged worker when `engineMode="worker"`; custom worker URLs
and factories are not part of its public API.

## 📚 Documentation

- [Quickstart](https://docs.form0.dev/getting-started/quickstart)
- [Bindings overview](https://docs.form0.dev/bindings/overview)
- [Install and render with React](https://docs.form0.dev/bindings/react/install-render)
- [FormRenderer](https://docs.form0.dev/bindings/react/form-renderer)
- [Custom field renderers](https://docs.form0.dev/bindings/react/custom-renderers)
- [React API reference](https://docs.form0.dev/bindings/react/api-reference)
- [Web starter](https://github.com/paqu-io/form0-web-tmpl-react-vite)

## 🔒 Security

Schema expressions are evaluated by `form0-core`. Only use schemas from trusted authors and review
the [form0-core security policy](https://github.com/paqu-io/form0-core/blob/main/SECURITY.md).
Report vulnerabilities according to this repository's [security policy](./SECURITY.md).

## 🤝 Support and contributing

See [SUPPORT.md](https://github.com/paqu-io/form0-react/blob/main/SUPPORT.md) for help and
[CONTRIBUTING.md](https://github.com/paqu-io/form0-react/blob/main/CONTRIBUTING.md) to contribute.

## 📄 License

[MIT](./LICENSE)

## Engine options and calculation diagnostics

`engineOptions` forwards helpers, security, `onWarning`, `onUpdate`, `onOperations`, and calculation diagnostic controls to root and repeatable-row engines. Helpers and security are engine-construction settings: remount `FormRenderer` to replace them predictably. Callbacks and the console preference stay current in already-open editors without an extra evaluation.

```jsx
const findingsByScope = new Map();

<FormRenderer
  schema={schema}
  engineOptions={{
    diagnostics: { console: false },
    onDiagnostics(snapshot, meta) {
      if (meta.kind === 'scope-ended') findingsByScope.delete(meta.scopeId);
      else findingsByScope.set(meta.scopeId, { snapshot, meta });
    },
  }}
/>;
```

Console reporting is enabled by default. `diagnostics.console: false` suppresses calculation details, recovery and scope-ended console notices; collection and callbacks remain active. Providing `onDiagnostics` does not implicitly disable console reporting. Core codes, severity, messages, phases, suggestions and context are preserved. Developer console headings use English, as with the existing binding messages.

`onDiagnostics(snapshot, meta)` receives a defensive array after each accepted completed evaluation, including the first, identical findings and `[]` after recovery. Console output suppresses identical repeats and reports new/changed findings, recovery and recurrence. Errors from diagnostic observers, including rejected promises, cannot interrupt evaluation or operation processing.

Metadata contains `scopeId`, `instancePath`, `evaluationId` and `kind`. A scope identifies one transient engine lifetime; evaluation IDs increase within that scope. Root paths are `[]`. Each row path segment contains `repeatableKey`, `instanceId`, zero-based `index`, and `identity: "id" | "position"`. Existing `id` or `record_id` values are used, with an explicitly positional fallback when absent. Findings carry the same path in `context.instancePath`; reporting never creates record IDs.

Closing/deleting an editor, replacing its engine/schema, or unmounting retires the old scope with `onDiagnostics([], { ...meta, kind: "scope-ended" })`. This means the scope is no longer observed, not that the saved row recovered. Only engines that actually evaluate are represented: the callback is not a complete submission-health report and does not re-evaluate closed rows.

Calculation diagnostics remain outside `state.errors`, saved snapshots and record payloads. They do not change validation display timing, submission decisions or draft saving, and do not create automatic alerts or a diagnostics panel.

`onOperations(operations, meta, applyDefault)` receives non-alert operations. Delegate selected operations with `applyDefault(selected, meta)`; without a callback, existing default processing remains active. Renderer-owned `ALERT` dialogs appear once. Operation batches follow the existing platform processing; callbacks must handle every supplied batch. `onWarning` remains the legacy warning route, including its existing throttling, and is not a replacement for diagnostic snapshots. `onUpdate(state, engine)` retains the execution-specific engine/facade argument; use `onDiagnostics` for portable diagnostic consumption.

## Engine options in worker mode

Application callbacks (`onDiagnostics`, `onWarning`, `onUpdate`, `onOperations`) stay on the host; they are not serialized into the worker. Schema, values and engine configuration must be structured-cloneable. Function-valued helpers and other non-cloneable configuration are rejected with a clear initialization error before a request is dispatched: use `engineMode="main-thread"` for function helpers. Configuration failure does not silently change the requested mode or drop helpers. The existing fallback when Worker support is unavailable remains unchanged. Diagnostic messages are accepted once per active scope/evaluation; obsolete generations cannot restore old findings. See [FormRenderer](https://docs.form0.dev/bindings/react/form-renderer) for the shared interface.

If replacing the schema or initial seed while a worker is still initializing, remount `FormRenderer` to initialize the replacement predictably. The existing in-flight initialization guard is retained: obsolete diagnostic scopes end immediately, but reporting does not schedule an extra evaluation. An empty active diagnostic collection does not establish that the replacement has evaluated.

## Managed events and save preparation

The managed event integration uses **form0-core 0.5.1 or later**. Expanded automatic lifecycle
behavior is opt-in. Without it, the existing root load/edit/change behavior remains available.

```jsx
<FormRenderer
  schema={schema}
  engineOptions={{
    events: {
      lifecycle: true,
      recordKind: 'existing', // explicitly 'new' or 'existing'; never inferred from values
      fieldInteractions: ['focus', 'blur'],
    },
    onEventController: (controller) => {
      controllerRef.current = controller;
    },
  }}
/>
```

`onEventController(controller | null)` receives the current engine generation after initialization.
Callbacks can be replaced while editors are open. Lifecycle settings and record classification are
fixed for the editor session; remount to replace them, helpers or security configuration. Observer
exceptions and rejected promises are isolated.

Both controller methods return promises in every execution mode:

```js
const detail = await controller.dispatch({
  type: 'validate-record',
  metadata: { isDraft: false, isValid: true },
});
// { status: 'completed' | 'failed', operations, validationIssues, issues }

const prepared = await controller.prepareSave({ intent: 'submit' });
if (prepared.eligible) await persistRecord(prepared.payload, prepared.meta);
// prepareSave never persists, reports persistence success, or closes an editor.
```

`prepareSave` waits for accepted updates, validates, runs the pre-save hook once when policy permits,
awaits delegated operations, revalidates if editable values changed, then serializes that same final
snapshot. Built-in actions use this path when lifecycle integration is enabled; application buttons
can use the controller directly. Requests are serialized; concurrent preparation for the same scope
returns `save_in_progress`. Applications own deduplication of their subsequent persistence requests.
A failure returns `eligible: false`, `payload: null` and structured `issues`, preserving editable
values for correction. Normal submit and row acceptance respect validation failures. Root draft
preparation (`intent: 'draft'`) remains allowed with `validationSummary.hasErrors: true`; row drafts
are unsupported. Root submit returns the structured record, root draft the existing raw snapshot,
and row preparation the existing row shape. `meta` retains submission/draft metadata.

```js
ON('validate-record', function (event) {
  if ($amount < 4) INVALID('Amount must be at least four.');
});
ON('save-record', function (event) {
  SETVALUE('note', event.isDraft ? 'Draft reviewed' : 'Ready');
});
```

`INVALID(nonemptyMessage)` is synchronous and validation-only. Findings are scope-level messages in
the existing validation summary/navigation; they have no invented field association and never enter
intrinsic `state.errors`, calculation diagnostics, saved values or record/media metadata. Every
validation attempt replaces custom findings; editable changes or scope retirement clear them.
Validation and cancel/unload handlers reject value/UI operations and promises. `isDraft` describes
the current attempted action; `isValid` describes intrinsic validity, with combined validity in the
returned summary. Calculation diagnostics alone never block saving.

Opt-in opening evaluates effective values, runs load, then new/edit when entering editing; readonly
opening runs load only. Rows use their actual new/existing classification and repeatable events.
User field edits notify change after updates settle; accepted row membership changes carry `action`
(`add`, `edit`, `remove`) and `affectedInstancePath` on the owning repeatable listener. Enabled status
fields notify `change-status` for user changes only. Defaults, SETVALUE and calculations emit no
additional automatic change. Extra focus/blur/click interactions default to none; the built-in text
and numeric inputs support them (Native click means input press). Other/custom controls may dispatch
supported interactions explicitly from their own event handlers.

For a row request, supply `instancePath` or the active `scopeId` from diagnostics metadata. Full paths
use schema keys and existing row IDs, with explicit positional fallback; positional paths require
that observed active `scopeId`. Old controllers, closed/deleted editors and obsolete generations are
rejected. Open row handlers may read current main/ancestor values but SETVALUE writes only within
that row. Collections and closed-row freshness/aggregation remain outside this contract.

Confirmed renderer cancellation sends cancel then unload; supported successful close paths send
unload before releasing the engine. Host-owned closing must dispatch unload before unmounting.
Forced disposal, resets, rerenders and Strict Mode cleanup only retire scopes. `save-record` and
`save-repeatable` are pre-save hooks; there are no saved-\* schema events. The application owns
persistence, success notifications and closing. Async `onOperations` work is awaited; its selective
`applyDefault` callback is valid only during that dispatch. Renderer alerts remain owned by the
binding and are delivered once.

Worker execution transports cloneable requests/results and keeps application callbacks and alerts on
the host. Function-valued helpers and non-cloneable configuration fail before dispatch; use the main
thread for executable helpers. Event replies are consumed once and stale generations are rejected.
No Native worker mode is added.

Native File/Blob media handles retain standard metadata and immutable binary content. Custom properties
on these handles are outside native serialization; attach custom metadata to the surrounding plain
record object. Async schema handlers remain unsupported. The form0-core 0.5.1 minimum includes
the media compatibility correction.

## Repeatable entry opening mode

`repeatableEntryMode` accepts `'readonly'` (default) or `'edit'` for existing rows at every nesting
level. View mode offers Edit when the containing record permits editing. New rows start in edit
mode. Read-only parents allow browsing descendants but prevent editing, adding and removing them;
`repeatableEntryMode="edit"` does not override that restriction. This is a renderer option, with no
schema or saved-record change.

Opening modes control editing and lifecycle entry. Calculations, conditions and intrinsic
validation still evaluate when a row is viewed. With managed lifecycle enabled, opening runs
`load-repeatable`; entering editing runs `edit-repeatable` or `new-repeatable` according to the
row's classification. Viewing accepted values without recalculation is a separate pending policy.
