// @vitest-environment jsdom
import React, { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { FormRenderer } from '../dist/index.js';
import { eventSchema } from './fixtures/event-conformance.js';
import { field } from './fixtures/diagnostic-conformance.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const quiet = { diagnostics: { console: false } };
const options = (onEventController, extras = {}) => ({
  ...quiet,
  events: { recordKind: 'new' },
  onEventController,
  ...extras,
});

it('requires explicit classification when lifecycle is omitted', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  expect(() => render(<FormRenderer schema={eventSchema()} />)).toThrow(/recordKind/);
  expect(() =>
    render(<FormRenderer schema={eventSchema()} engineOptions={{ events: {} }} />)
  ).toThrow(/recordKind/);
});

async function mount(fixture, extraProps = {}, extraOptions = {}) {
  let controller;
  const onUpdate = vi.fn();
  const props = {
    schema: fixture,
    ...extraProps,
    engineOptions: options((value) => (controller = value), { onUpdate, ...extraOptions }),
  };
  const view = render(<FormRenderer {...props} />);
  await waitFor(() => expect(controller).toBeTruthy());
  return {
    view,
    props,
    onUpdate,
    get controller() {
      return controller;
    },
  };
}

it('default lifecycle initializes load/new once, while explicit opt-out preserves load/edit', async () => {
  const fixture = eventSchema(
    "ON('load-record', function() { SETVALUE('trace', 'load'); });\nON('new-record', function() { SETVALUE('trace', $trace + ':new'); });\nON('edit-record', function() { SETVALUE('trace', $trace + ':edit'); });"
  );
  const managed = await mount(fixture);
  await waitFor(() => expect(managed.onUpdate.mock.calls.at(-1)[0].values.trace).toBe('load:new'));
  managed.view.unmount();
  const legacyUpdate = vi.fn();
  render(
    <FormRenderer
      schema={fixture}
      engineOptions={{ ...quiet, events: { lifecycle: false }, onUpdate: legacyUpdate }}
    />
  );
  await waitFor(() => expect(legacyUpdate.mock.calls.at(-1)[0].values.trace).toBe('load:edit'));
});

it('readonly opens with load only and entering edit uses explicit classification', async () => {
  const fixture = eventSchema(
    "ON('load-record', function(event) { if (event.mode === 'edit') SETVALUE('trace', 'load'); });\nON('edit-record', function() { SETVALUE('trace', $trace + ':edit'); });"
  );
  const managed = await mount(
    fixture,
    { mode: 'readonly', initialValues: { input: 4, trace: 'accepted' } },
    { events: { recordKind: 'existing' } }
  );
  await waitFor(() => expect(managed.onUpdate.mock.calls.at(-1)[0].values.trace).toBe('accepted'));
  expect((await managed.controller.prepareSave({ intent: 'submit' })).issues[0].code).toBe(
    'readonly_scope'
  );
  fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
  await waitFor(() =>
    expect(managed.onUpdate.mock.calls.at(-1)[0].values.trace).toBe('accepted:edit')
  );
});

it('custom validation uses the existing summary UI, clears on edits and remains separate from intrinsic errors', async () => {
  const fixture = eventSchema(
    "ON('validate-record', function(e) { if ($input < 6) INVALID('Reach six.'); });"
  );
  const onSubmit = vi.fn();
  const managed = await mount(fixture, { onSubmit, forceShowNavigationPanel: true });
  fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
  await waitFor(() => expect(managed.onUpdate.mock.calls.at(-1)[0].errors).toEqual({}));
  await act(async () => {
    const result = await managed.controller.prepareSave({ intent: 'submit' });
    expect(result.eligible).toBe(false);
  });
  expect(onSubmit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /Validation/i }));
  expect(await screen.findByText('Reach six.')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('input'), { target: { value: '6' } });
  await waitFor(() => expect(screen.queryByText('Reach six.')).toBeNull());
  fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  expect(onSubmit.mock.calls[0][0].form_values.input).toBe(6);
});

it('application and built-in preparations use final pre-save values, awaited delegation and invalid draft policy', async () => {
  const fixture = eventSchema(
    "ON('validate-record', function(e) { if ($input < 4) INVALID(e.isDraft ? 'Draft invalid.' : 'Submit invalid.'); });\nON('save-record', function(e) { SETVALUE('input', $input + 1); ALERT('Saved preparation', 'one alert'); });"
  );
  const onSubmit = vi.fn();
  const delegate = vi.fn(async (ops, meta, fallback) => {
    await Promise.resolve();
    fallback(ops);
  });
  const managed = await mount(fixture, { onSubmit }, { onOperations: delegate });
  fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  expect(onSubmit.mock.calls[0][0].form_values.input).toBe(5);
  expect(delegate.mock.calls[0][0].every((op) => op.operation !== 'ALERT')).toBe(true);
  await waitFor(() => expect(screen.getAllByText('one alert')).toHaveLength(1));
  fireEvent.change(screen.getByLabelText('input'), { target: { value: '0' } });
  let draft;
  await act(async () => {
    draft = await managed.controller.prepareSave({ intent: 'draft' });
  });
  expect(draft.eligible).toBe(true);
  expect(draft.validationSummary.hasErrors).toBe(true);
  expect(draft.payload.raw_values.input).toBe(1);
  expect(JSON.stringify(draft.payload)).not.toMatch(/scopeId|instancePath|validationIssues/);
});

it('confirmed cancel runs cancel/unload before closing, while forced disposal and Strict Mode do not', async () => {
  const fixture = eventSchema(
    "ON('cancel-record', function() { mark('cancel'); });\nON('unload-record', function() { mark('unload'); });"
  );
  const mark = vi.fn();
  const close = vi.fn();
  const managed = await mount(
    fixture,
    { formPlacement: 'form-modal', onRequestClose: close },
    { helpers: { mark } }
  );
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  if (screen.queryByRole('button', { name: /discard/i }))
    fireEvent.click(screen.getByRole('button', { name: /discard/i }));
  await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  expect(mark.mock.calls.map(([value]) => value)).toEqual(['cancel', 'unload']);
  managed.view.unmount();
  mark.mockClear();
  const strict = render(
    <StrictMode>
      <FormRenderer schema={fixture} engineOptions={options(() => {}, { helpers: { mark } })} />
    </StrictMode>
  );
  await act(async () => {});
  strict.unmount();
  expect(mark).not.toHaveBeenCalled();
});

it('refreshes controller callbacks without replay and rejects a replaced schema generation', async () => {
  const fixture = eventSchema("ON('load-record', function() { count(); });");
  const count = vi.fn();
  const managed = await mount(fixture, {}, { helpers: { count } });
  const controller = managed.controller;
  const second = vi.fn();
  managed.view.rerender(
    <FormRenderer
      {...managed.props}
      engineOptions={{ ...managed.props.engineOptions, onEventController: second }}
    />
  );
  await waitFor(() => expect(second).toHaveBeenCalledWith(controller));
  expect(count).toHaveBeenCalledTimes(1);
  managed.view.rerender(
    <FormRenderer {...managed.props} schema={{ form: { ...fixture.form, name: 'Replacement' } }} />
  );
  await waitFor(() => expect(count).toHaveBeenCalledTimes(2));
  expect((await controller.dispatch({ type: 'change', fieldKey: 'input' })).issues[0].code).toBe(
    'stale_generation'
  );
});

it('open rows initialize repeatable events and retire on close without main-record lifecycle', async () => {
  const mark = vi.fn();
  const fixture = eventSchema(
    "ON('load-record', function() { mark('root'); });\nON('load-repeatable', 'rows', function() { mark('row-load'); });\nON('new-repeatable', 'rows', function() { mark('row-new'); });\nON('cancel-repeatable', 'rows', function() { mark('row-cancel'); });\nON('unload-repeatable', 'rows', function() { mark('row-unload'); });"
  );
  const managed = await mount(fixture, {}, { helpers: { mark } });
  fireEvent.click(screen.getByRole('button', { name: 'View' }));
  fireEvent.click(screen.getByRole('button', { name: 'Add' }));
  await waitFor(() =>
    expect(mark.mock.calls.map(([v]) => v)).toEqual(['root', 'row-load', 'row-new'])
  );
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  if (screen.queryByRole('button', { name: /discard/i }))
    fireEvent.click(screen.getByRole('button', { name: /discard/i }));
  await waitFor(() =>
    expect(mark.mock.calls.map(([v]) => v)).toEqual([
      'root',
      'row-load',
      'row-new',
      'row-cancel',
      'row-unload',
    ])
  );
  expect(managed.controller).toBeTruthy();
});

it('serializes user edits with change handlers, without programmatic change cascades', async () => {
  const seen = vi.fn();
  const fixture = eventSchema(
    "ON('change', 'input', function(e) { seen($input, e.value); SETVALUE('trace', 'changed'); });\nON('change', 'trace', function() { seen('cascade'); });"
  );
  const managed = await mount(fixture, {}, { helpers: { seen } });
  fireEvent.change(screen.getByLabelText('input'), { target: { value: '0' } });
  fireEvent.change(screen.getByLabelText('input'), { target: { value: '8' } });
  await waitFor(() =>
    expect(seen.mock.calls).toEqual([
      [0, 0],
      [8, 8],
    ])
  );
  // The handler runs before its queued SETVALUE batch has finished publishing state.
  await waitFor(() => expect(managed.onUpdate.mock.calls.at(-1)[0].values.trace).toBe('changed'));
});

it('focus/blur/click default on, permit explicit opt-out and do not evaluate pure notifications', async () => {
  const seen = vi.fn();
  const fixture = eventSchema(
    "ON('focus', 'input', function() { seen('focus'); });\nON('blur', 'input', function() { seen('blur'); });\nON('click', 'input', function() { seen('click'); });"
  );
  const diagnostic = vi.fn();
  const managed = await mount(
    fixture,
    {},
    {
      helpers: { seen },
      onDiagnostics: diagnostic,
      events: { recordKind: 'existing' },
    }
  );
  const count = diagnostic.mock.calls.length;
  fireEvent.focus(screen.getByLabelText('input'));
  fireEvent.blur(screen.getByLabelText('input'));
  fireEvent.click(screen.getByLabelText('input'));
  await waitFor(() => expect(seen.mock.calls.map(([v]) => v)).toEqual(['focus', 'blur', 'click']));
  expect(diagnostic).toHaveBeenCalledTimes(count);
  managed.view.unmount();
  await mount(
    fixture,
    {},
    { helpers: { seen }, events: { recordKind: 'new', fieldInteractions: [] } }
  );
  const before = seen.mock.calls.length;
  fireEvent.focus(screen.getByLabelText('input'));
  fireEvent.blur(screen.getByLabelText('input'));
  await act(async () => {});
  expect(seen).toHaveBeenCalledTimes(before);
});

it('root preparation preserves closed row and media metadata while open row preparation remains local', async () => {
  const snapshot = {
    raw_values: { input: 4 },
    repeatable: {
      rows: [
        {
          id: 'row-A',
          values: { amount: 2 },
          attachment: { media_id: 'media-A' },
          repeatable: { children: [{ id: 0, values: { quantity: 3 }, repeatable: {} }] },
        },
      ],
    },
  };
  const fixture = eventSchema(
    "ON('validate-repeatable', 'rows', function() { if ($amount < 3) INVALID('Row needs three.'); });\nON('save-repeatable', 'rows', function() { SETVALUE('amount', $input); });"
  );
  const reports = [];
  const managed = await mount(
    fixture,
    { initialSnapshot: snapshot },
    { onDiagnostics: (value, meta) => reports.push(meta) }
  );
  let prepared;
  await act(async () => {
    const blocked = await managed.controller.prepareSave({ intent: 'submit' });
    expect(blocked.eligible).toBe(false);
    expect(blocked.validationSummary.scopeIssues[0].message).toBe('Row needs three.');
    prepared = await managed.controller.prepareSave({ intent: 'draft' });
  });
  expect(prepared.payload.repeatable.rows[0].attachment.media_id).toBe('media-A');
  expect(prepared.payload.repeatable.rows[0].repeatable.children[0].id).toBe(0);
  fireEvent.click(screen.getByRole('button', { name: 'View' }));
  fireEvent.click(screen.getByRole('button', { name: 'View' }));
  await waitFor(() => expect(reports.some((meta) => meta.instancePath.length)).toBe(true));
  fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
  const row = reports.find(
    (meta) => meta.instancePath.length && meta.instancePath[0].instanceId === 'row-A'
  );
  await act(async () => {
    prepared = await managed.controller.prepareSave({ intent: 'submit', scopeId: row.scopeId });
  });
  expect(prepared.eligible).toBe(false);
  expect(prepared.validationSummary.generalErrors[0].message).toBe('Row needs three.');
  fireEvent.change(screen.getByLabelText('amount'), { target: { value: '3' } });
  await act(async () => {
    prepared = await managed.controller.prepareSave({ intent: 'submit', scopeId: row.scopeId });
  });
  expect(prepared.eligible).toBe(true);
  expect(prepared.payload.values.amount).toBe(4);
  expect(prepared.payload.id).toBe('row-A');
  expect(prepared.payload.values).not.toHaveProperty('input');
  expect(snapshot.repeatable.rows[0].values.amount).toBe(2);
});

it('user status changes notify once and pre-save status writes reach the final record without another notification', async () => {
  const seen = vi.fn();
  const fixture = eventSchema(
    "ON('change-status', function(e) { seen(e.type, $status); });\nON('save-record', function() { SETVALUE('status', 'done'); });"
  );
  fixture.form.status_field = {
    type: 'StatusField',
    key: '@status',
    data_name: 'status',
    label: 'Status',
    enabled: true,
    display: 'default',
    visible: true,
    read_only: false,
    default_value: 'pending',
    visible_conditions: null,
    read_only_conditions: null,
    choices: ['pending', 'active', 'done'].map((value) => ({
      value,
      label: value,
      color: '#888888',
    })),
  };
  const managed = await mount(fixture, {}, { helpers: { seen } });
  fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'active' } });
  await waitFor(() => expect(seen.mock.calls).toEqual([['change-status', 'active']]));
  let prepared;
  await act(async () => {
    prepared = await managed.controller.prepareSave({ intent: 'submit' });
  });
  expect(prepared.eligible).toBe(true);
  expect(prepared.payload['@status']).toBe('done');
  expect(prepared.meta.rawValues.status).toBe('done');
  expect(seen).toHaveBeenCalledTimes(1);
});

it.each([false, true])(
  'preserves selected photo files and metadata with lifecycle=%s',
  async (lifecycle) => {
    // Node structuredClone does not serialize jsdom File objects as a browser does.
    // Model the platform File/Blob serialization and keep native cloning for other values.
    const nativeClone = globalThis.structuredClone;
    const browserClone = (value) => {
      if (value instanceof File)
        return new File([value], value.name, {
          type: value.type,
          lastModified: value.lastModified,
        });
      if (value instanceof Blob) return value.slice(0, value.size, value.type);
      if (Array.isArray(value)) return value.map(browserClone);
      if (value && Object.getPrototypeOf(value) === Object.prototype)
        return Object.fromEntries(
          Object.entries(value).map(([key, entry]) => [key, browserClone(entry)])
        );
      return nativeClone(value);
    };
    vi.stubGlobal('structuredClone', browserClone);
    const fixture = eventSchema(
      "ON('validate-record', function() { if ($photo[0].file.name !== 'photo.jpg') INVALID('Wrong file.'); });"
    );
    const photo = field('PhotoField', 'photo', { min_length: null, max_length: null });
    for (const key of ['supporting_image', 'supporting_image_path', 'supporting_image_display'])
      delete photo[key];
    fixture.form.elements.push(photo);
    const submitted = vi.fn();
    const managed = await mount(
      fixture,
      { onSubmit: submitted },
      { events: { lifecycle, recordKind: 'existing' } }
    );
    const file = new File(['image bytes'], 'photo.jpg', { type: 'image/jpeg', lastModified: 1234 });
    if (!URL.createObjectURL) URL.createObjectURL = () => 'blob:photo-test';
    if (!URL.revokeObjectURL) URL.revokeObjectURL = () => {};
    fireEvent.change(managed.view.container.querySelector('input[type="file"]'), {
      target: { files: [file] },
    });
    await waitFor(() => expect(managed.onUpdate.mock.calls.at(-1)[0].values.photo).toHaveLength(1));
    const original = managed.onUpdate.mock.calls.at(-1)[0].values.photo[0];
    let prepared;
    await act(async () => {
      prepared = await managed.controller.prepareSave({ intent: 'submit' });
    });
    expect(prepared.eligible).toBe(true);
    const copied = prepared.meta.rawValues.photo[0];
    expect(copied.photo_id).toBe(original.photo_id);
    expect(copied.media_id).toBe(original.media_id);
    expect(copied.file.name).toBe('photo.jpg');
    expect(copied.file.size).toBe(file.size);
    expect(copied.file.type).toBe(file.type);
    expect(copied.file.lastModified).toBe(file.lastModified);
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() => expect(submitted).toHaveBeenCalledTimes(1));
  }
);
