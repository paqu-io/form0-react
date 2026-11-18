// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { FormRenderer } from '../dist/index.js';
import { field } from './fixtures/diagnostic-conformance.js';

afterEach(cleanup);

// jsdom has no showModal(): open and close the dialog through its `open` attribute, with the
// `close` event a browser fires.
const original = {};
beforeAll(() => {
  const proto = window.HTMLDialogElement.prototype;
  original.showModal = proto.showModal;
  original.close = proto.close;
  proto.showModal = function showModal() {
    this.setAttribute('open', '');
  };
  proto.close = function close() {
    if (!this.hasAttribute('open')) return;
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});
afterAll(() => {
  Object.assign(window.HTMLDialogElement.prototype, original);
});

const image = (path, display) => ({
  supporting_image: true,
  supporting_image_path: path,
  supporting_image_display: display,
});
const schema = {
  form: {
    name: 'Field help',
    elements: [
      field('TextField', 'crack', {
        label: 'Widest crack (mm)',
        description: 'Measure at the widest point.',
        description_mode: 'subtext',
        ...image('crack-guide.png', 'default'),
      }),
      field('TextField', 'moisture', {
        label: 'Moisture reading (%)',
        description: 'Take three readings.\n\nEnter the highest one.',
        description_mode: 'default',
        ...image('https://example.test/meter.png', 'dialog'),
      }),
    ],
  },
};

function renderForm() {
  render(
    <FormRenderer
      schema={schema}
      engineOptions={{ events: { recordKind: 'new' }, diagnostics: { console: false } }}
    />
  );
}

const openDialog = () => document.querySelector('dialog[open]');

it('shows an inline image as a framed figure that opens the viewer, titled with the label', async () => {
  renderForm();
  const figure = await screen.findByRole('button', {
    name: 'View supporting image for Widest crack (mm)',
  });
  expect(figure.closest('figure')).not.toBeNull();
  expect(within(figure).getByRole('img').getAttribute('src')).toBe(
    '/supporting-images/crack-guide.png'
  );
  // The subtext stays under the label.
  expect(screen.getByText('Measure at the widest point.')).toBeTruthy();

  expect(openDialog()).toBeNull();
  fireEvent.click(figure);
  const dialog = openDialog();
  expect(dialog).not.toBeNull();
  expect(within(dialog).getByRole('heading').textContent).toBe('Widest crack (mm)');
  expect(document.getElementById(dialog.getAttribute('aria-labelledby')).textContent).toBe(
    'Widest crack (mm)'
  );
  expect(within(dialog).getByRole('img').getAttribute('src')).toBe(
    '/supporting-images/crack-guide.png'
  );
  expect(figure.getAttribute('aria-expanded')).toBe('true');

  fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
  expect(openDialog()).toBeNull();
  expect(figure.getAttribute('aria-expanded')).toBe('false');
});

it('titles the description dialog with the label and keeps the line breaks in the text', async () => {
  renderForm();
  fireEvent.click(
    await screen.findByRole('button', { name: 'View description for Moisture reading (%)' })
  );
  const dialog = openDialog();
  expect(within(dialog).getByRole('heading').textContent).toBe('Moisture reading (%)');
  expect(dialog.textContent).not.toMatch(/Field information/i);
  const text = within(dialog).getByText(/Take three readings/);
  expect(text.textContent).toBe('Take three readings.\n\nEnter the highest one.');
});

it('opens the image button of dialog mode in the same viewer, loading URLs as they are', async () => {
  renderForm();
  fireEvent.click(
    await screen.findByRole('button', { name: 'View supporting image for Moisture reading (%)' })
  );
  const dialog = openDialog();
  expect(within(dialog).getByRole('heading').textContent).toBe('Moisture reading (%)');
  expect(within(dialog).getByRole('img').getAttribute('src')).toBe(
    'https://example.test/meter.png'
  );
  expect(dialog.textContent).not.toMatch(/Supporting image/i);
});

it('closes on a press and release on the backdrop, not on a click inside or a drag out', async () => {
  renderForm();
  const button = await screen.findByRole('button', {
    name: 'View description for Moisture reading (%)',
  });
  fireEvent.click(button);
  let dialog = openDialog();
  const heading = within(dialog).getByRole('heading');

  // Inside the dialog.
  fireEvent.pointerDown(heading);
  fireEvent.click(heading);
  expect(openDialog()).toBe(dialog);

  // Pressed inside (selecting text), released on the backdrop.
  fireEvent.pointerDown(heading);
  fireEvent.click(dialog);
  expect(openDialog()).toBe(dialog);

  // On the backdrop: the dialog element itself is the target.
  fireEvent.pointerDown(dialog);
  fireEvent.click(dialog);
  expect(openDialog()).toBeNull();

  // It opens again afterwards.
  fireEvent.click(button);
  dialog = openDialog();
  expect(dialog).not.toBeNull();
});
