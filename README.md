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
supported. Applications with custom worker infrastructure can provide `workerUrl` or
`createWorker` through engine options.

## 📚 Documentation

- [Quickstart](https://docs.form0.dev/getting-started/quickstart)
- [Full documentation](https://docs.form0.dev)
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
