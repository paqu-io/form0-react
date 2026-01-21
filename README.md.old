# form0-react

`form0-react` wraps the `form0-core` engine with React bindings and a lightweight set of default field renderers. The library ships with minimal, accessible HTML components so downstream apps can layer their own design systems on top without rewriting engine integration code.

## Field registry

Every field renderer is resolved through the registry exported from `form0-react`. The registry drives the UI layer while the engine continues to own value, visibility, and validation logic. You can override renderers globally or per React subtree.

> The registry only accepts field types defined in `form0-core`'s `FIELD_SPECS`. Introducing a brand-new field type still requires engine work in `form0-core`; the React layer is purely responsible for presentation.

### Global overrides

Use the global helpers to register or unregister field components at module load time:

```js
import {
  registerFieldComponent,
  resetFieldComponents,
} from 'form0-react';
import { FancyTextField } from './components/fancy-text-field.jsx';

registerFieldComponent('TextField', FancyTextField);

// In tests you can clear overrides and restore defaults:
afterEach(() => {
  resetFieldComponents();
});
```

The helpers manipulate the default registry that `FormRenderer` consumes out of the box. Warnings about missing components mirror the behaviour of earlier releases.

### Scoped overrides with a provider

When you need different renderers for part of your tree—SSR, storybook examples, or per-app theming—create an isolated registry and provide it via context:

```jsx
import React, { useMemo } from 'react';
import {
  FormRenderer,
  FieldRegistryProvider,
  createFieldRegistry,
} from 'form0-react';
import { TailwindDateField } from './date-field.jsx';

export function ExampleForm({ schema }) {
  const registry = useMemo(
    () =>
      createFieldRegistry({
        includeDefaults: true,
        renderers: {
          DateField: TailwindDateField,
        },
      }),
    []
  );

  return (
    <FieldRegistryProvider registry={registry}>
      <FormRenderer schema={schema} />
    </FieldRegistryProvider>
  );
}
```

The provider also accepts a `renderers` prop for simple overrides:

```jsx
<FieldRegistryProvider
  renderers={{ BooleanField: ToggleSwitch }}
>
  <FormRenderer schema={schema} />
</FieldRegistryProvider>
```

Both approaches keep the engine contract intact—your components receive the same props as the defaults (`{ field, value, onChange, readOnly, inputProps, className }`) while retaining full control over markup, styling, and supporting libraries.

> `FieldRegistryProvider` merges the `renderers` prop into the supplied `registry` when both are passed. Renderers are memoized internally, so inline objects like `{ DateField: CustomDate }` are safe to use without extra `useMemo` wrappers.

## Field type helpers

- `KNOWN_FIELD_TYPES` (exported from `form0-react`) lists every field type provided by `form0-core` once section-like nodes are filtered out. You can reference it when building configuration UIs or validating override inputs. The registry guards against unknown types automatically, so lookups remain consistent with the engine.
