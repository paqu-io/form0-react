// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { FormRenderer } from '../dist/index.js';
import { field } from './fixtures/diagnostic-conformance.js';

afterEach(cleanup);

// Review of step 4 (2026-11-18): answering a MESSAGEBOX whose callback opens an ALERT flashed
// the page between the two dialogs, because the overlay was removed until the ALERT was queued.
const schema = {
  form: {
    name: 'Chained dialogs',
    events: {
      code: "ON('change', 'note', function () { MESSAGEBOX({ title: 'Question', message: 'Pick one', buttons: ['Yes', 'No'] }, function (reply) { ALERT('Answer', 'You chose ' + reply.value); }); });",
    },
    elements: [field('TextField', 'note')],
  },
};

it('keeps the backdrop from a MESSAGEBOX to the ALERT its answer opens, then fades it', async () => {
  render(
    <FormRenderer
      schema={schema}
      engineOptions={{ events: { recordKind: 'new' }, diagnostics: { console: false } }}
    />
  );
  fireEvent.change(await screen.findByLabelText('note'), { target: { value: 'x' } });
  const question = await screen.findByRole('alertdialog', { name: 'Question' });

  fireEvent.click(within(question).getByRole('button', { name: 'Yes' }));
  // Right after the answer: the same overlay, closing, no dialog in it.
  expect(question.isConnected).toBe(true);
  expect(question.getAttribute('data-closing')).toBe('true');
  expect(question.getAttribute('role')).toBeNull();

  const answer = await screen.findByRole('alertdialog', { name: 'Answer' });
  expect(answer).toBe(question);
  expect(answer.hasAttribute('data-closing')).toBe(false);
  expect(within(answer).getByText(/You chose/)).toBeTruthy();

  fireEvent.click(within(answer).getByRole('button', { name: 'OK' }));
  expect(answer.getAttribute('data-closing')).toBe('true');
  // Nothing follows: the backdrop goes once its fade is over.
  await waitFor(() => expect(answer.isConnected).toBe(false), { timeout: 1000 });
});
