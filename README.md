# form0-react

[![NPM Version](https://img.shields.io/npm/v/form0-react)](https://www.npmjs.com/package/form0-react)
[![NPM Downloads](https://img.shields.io/npm/dt/form0-react)](https://www.npmjs.com/package/form0-react)
![NPM License](https://img.shields.io/npm/l/form0-react)
[![Docs](https://img.shields.io/badge/docs-docs.form0.dev-2563eb)](https://docs.form0.dev)
[![Website](https://img.shields.io/badge/site-form0.dev-0f172a)](https://form0.dev)
![NPM Last Update](https://img.shields.io/npm/last-update/form0-react)

> [!WARNING]
> form0 is in active, very early development. Do not use in production. Expect breaking
> changes and unstable behavior.

form0-react is the React UI layer of the [form0 ecosystem](https://form0.dev), wrapping the form0-core engine with React bindings and a lightweight set of default field renderers. It ships minimal, accessible HTML components so downstream apps can layer their own design systems on top without rewriting engine integration code.

## 🗂️ Documentation

> [!WARNING]
> 🚧 Work in progress...

## Requirements

- Node.js 18+
- Worker mode expects a bundler/runtime that supports ESM module workers and rewrites
  `new Worker(new URL('./engine-worker.js', import.meta.url), { type: 'module' })`.
  Vite-based apps are supported. If a consumer has custom worker infrastructure, the
  internal hooks also accept `workerUrl` or `createWorker` overrides through engine options.

## Consumer-owned renderer UI

`FormRenderer` supports consumer-owned state without coupling the renderer to a domain:

- `headerAccessory` accepts a React node or a render function receiving the live
  `{ mode: 'edit' | 'readonly' }`. It renders at full width after the sticky summary and before the
  form body.
- `externalDirty` includes consumer-owned changes in modal and spotlight discard confirmation.
- `submitBlockedReason` disables header submission and guards native form submission while the
  reason is set.
- A `recordMetadataFields` descriptor may include `displayValue` for read-only display data that
  must never enter engine values, snapshots, or submitted form values.

## Contributing

Contributions are welcome! Please feel free to submit [issues](https://github.com/paqu-io/form0-react/issues) and [pull requests](https://github.com/paqu-io/form0-react/pulls).
