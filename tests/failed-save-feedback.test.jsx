// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { FormRenderer } from '../dist/index.js';
import { field, repeatable } from './fixtures/diagnostic-conformance.js';

// 4a hand test (2026-11-25): a Save or Submit that validation stops was easy to miss (only the
// Validation badge's number changed). Now the Validation tab opens with its first finding
// focused, screen readers hear why, the badge turns red, and the button shows a red ring with an
// alert icon in place of its own until the findings are fixed.

afterEach(cleanup);

const schema = {
  form: {
    name: 'Failed save',
    elements: [
      field('TextField', 'first', { required: true }),
      repeatable('items', [field('TextField', 'name', { required: true })]),
    ],
  },
};

function expectStopped(scope, button) {
  const sidebar = within(scope.getByRole('navigation', { name: 'Form sidebar' }));
  const tab = sidebar.getByRole('button', { name: /^Validation/ });
  expect(tab.dataset.active).toBe('true');
  expect(tab.querySelector('[data-tone]')?.dataset.tone).toBe('error');
  const [finding] = within(sidebar.getByRole('list')).getAllByRole('button');
  expect(document.activeElement).toBe(finding);
  expect(sidebar.getByRole('status').textContent).toBe('Not saved: 1 issue to fix.');
  expect(button().dataset.failed).toBe('true');
}

for (const lifecycle of [false, true])
  it(`a Submit validation stops opens the Validation tab and marks the button; lifecycle=${lifecycle}`, async () => {
    render(
      <FormRenderer
        schema={schema}
        engineOptions={{ events: { lifecycle, recordKind: 'new' } }}
        onSubmit={vi.fn()}
      />
    );
    const submit = () => screen.getByRole('button', { name: /^Submit/ });
    const sidebar = within(await screen.findByRole('navigation', { name: 'Form sidebar' }));
    expect(sidebar.getByRole('button', { name: /^Validation/ }).dataset.active).toBe('false');
    expect(submit().dataset.failed).toBeUndefined();
    fireEvent.click(submit());
    await waitFor(() => expectStopped(screen, submit));
    fireEvent.change(screen.getByLabelText(/^first/), { target: { value: 'Fixed' } });
    await waitFor(() => expect(submit().dataset.failed).toBeUndefined());
  });

it('a Save validation stops in an entry opens its Validation tab and marks its Save', async () => {
  render(<FormRenderer schema={schema} engineOptions={{ events: { lifecycle: false } }} />);
  fireEvent.click(await screen.findByRole('button', { name: 'View', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: 'Add', exact: true }));
  const editor = within(await screen.findByRole('dialog'));
  const save = () => editor.getByRole('button', { name: /^Save/ });
  fireEvent.click(save());
  await waitFor(() => expectStopped(editor, save));
  fireEvent.change(editor.getByLabelText(/^name/), { target: { value: 'Fixed' } });
  await waitFor(() => expect(save().dataset.failed).toBeUndefined());
});
