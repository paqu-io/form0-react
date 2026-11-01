// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { FormRenderer } from '../dist/index.js';
import { field, repeatable } from './fixtures/diagnostic-conformance.js';

afterEach(cleanup);
for (const lifecycle of [false, true])
  it(`removes corrected required findings one at a time after Submit; lifecycle=${lifecycle}`, async () => {
    render(
      <FormRenderer
        schema={{
          form: {
            name: 'Live findings',
            elements: ['first', 'second', 'third'].map((name) =>
              field('TextField', name, { required: true })
            ),
          },
        }}
        engineOptions={{ events: { lifecycle, recordKind: 'new' } }}
        onSubmit={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Submit', exact: true }));
    const sidebar = within(await screen.findByRole('navigation', { name: 'Form sidebar' }));
    await sidebar.findAllByText('first');
    expect(sidebar.getAllByText('This field is required')).toHaveLength(3);
    fireEvent.change(screen.getByLabelText(/^first/), { target: { value: 'Fixed' } });
    await sidebar.findAllByText('second');
    await waitFor(() => expect(sidebar.queryAllByText('first')).toHaveLength(0));
    expect(sidebar.getAllByText('This field is required')).toHaveLength(2);
    fireEvent.change(screen.getByLabelText(/^second/), { target: { value: 'Fixed' } });
    await waitFor(() => expect(sidebar.getAllByText('This field is required')).toHaveLength(1));
    fireEvent.change(screen.getByLabelText(/^third/), { target: { value: 'Fixed' } });
    expect(await sidebar.findByText('No validation issues.')).toBeTruthy();
  });

it('keeps the other row findings visible while correcting a child editor', async () => {
  render(
    <FormRenderer
      schema={{
        form: {
          name: 'Rows',
          elements: [
            repeatable(
              'items',
              ['first', 'second', 'third'].map((name) =>
                field('TextField', name, { required: true })
              )
            ),
          ],
        },
      }}
      engineOptions={{ events: { lifecycle: false } }}
    />
  );
  fireEvent.click(await screen.findByRole('button', { name: 'View', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: 'Add', exact: true }));
  const editor = within(await screen.findByRole('dialog'));
  fireEvent.click(editor.getByRole('button', { name: 'Save', exact: true }));
  const sidebar = within(await editor.findByRole('navigation', { name: 'Form sidebar' }));
  expect(sidebar.getAllByText('This field is required')).toHaveLength(3);
  for (const [index, name] of ['first', 'second', 'third'].entries()) {
    fireEvent.change(editor.getByLabelText(new RegExp('^' + name)), { target: { value: 'Fixed' } });
    await waitFor(() =>
      expect(sidebar.queryAllByText('This field is required')).toHaveLength(2 - index)
    );
  }
  expect(sidebar.getByText('No validation issues.')).toBeTruthy();
});
