// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { FormRenderer } from '../dist/index.js';
import { fixture, listRows, mockCanvas } from './building-plan-front-fixture.js';

// A4 (decided 2026-11-26): Front in an element's entry (a door's, a window's, a wall beam's or a
// band's): its wall row seen from inside the room, the element in the accent colour and its own
// lengths only. Wall beams and bands open on Front, doors and windows on Plan; one opened by a
// double-click in Front opens on Front.

afterEach(cleanup);
beforeEach(mockCanvas);

const dialogs = () => screen.getAllByRole('dialog');
const top = () => within(dialogs().at(-1));
const views = (scope) => within(scope.getByRole('group', { name: 'View' }));
const texts = (svg) => [...svg.querySelectorAll('text')].map((text) => text.textContent);

/** Opens a nested list's row in the top dialog: its section's View, then the row. */
async function open(label, row = () => true) {
  await waitFor(() =>
    expect(screen.getAllByText(label, { exact: true }).length).toBeGreaterThan(0)
  );
  const section = screen.getAllByText(label, { exact: true }).at(-1).parentElement.parentElement;
  fireEvent.click(within(section).getByRole('button', { name: 'View', exact: true }));
  fireEvent.click((await listRows(label)).find(row));
}

/** W1's entry, through the floor's and the Bedroom's. */
async function w1Entry() {
  const f = fixture();
  render(
    <FormRenderer
      schema={f.schema}
      initialSnapshot={f.snapshot}
      mode="edit"
      repeatableEntryMode="edit"
      buildingPlanDerivedCommands
      engineOptions={{ events: { recordKind: 'existing' }, diagnostics: { console: false } }}
    />
  );
  fireEvent.click(await screen.findByRole('button', { name: 'View', exact: true }));
  fireEvent.click((await listRows('Floors'))[0]);
  await open('Rooms');
  await waitFor(() => expect(dialogs()).toHaveLength(2));
  await open('Walls', (button) => /^W1\b/.test(button.textContent));
  await waitFor(() => expect(dialogs()).toHaveLength(3));
  return top();
}

it("a window's entry opens on Plan; its Front shows it in the accent, its own lengths", async () => {
  await w1Entry();
  await open('Windows');
  await waitFor(() => expect(dialogs()).toHaveLength(4));
  const entry = top();
  await entry.findByLabelText(/Distance from floor/);
  const front = views(entry).getByRole('button', { name: 'Front' });
  await waitFor(() => expect(front.disabled).toBe(false));
  expect(views(entry).getByRole('button', { name: 'Plan' }).getAttribute('aria-pressed')).toBe(
    'true'
  );

  fireEvent.click(front);
  const svg = await entry.findByRole('img', { name: 'Front view of W1' });
  expect(svg.querySelector('[data-subject]')?.dataset.name).toBe('Window A');
  expect(entry.getByText('W1', { selector: 'span' }).parentElement.textContent).toBe('W1 · 1 of 1');
  // Its sill 0.90 and head 2.10, the wall's 3.00; 1.00 in from W1's left end, 1.00 wide, 3.00 to
  // its right end. The lintel band's underside (1.90) isn't one of its lengths.
  await waitFor(() =>
    expect(texts(svg)).toEqual(expect.arrayContaining(['0.90', '2.10', '3.00', '1.20', '1.00']))
  );
  expect(texts(svg)).not.toContain('1.90');
});

it("a band's entry opens on Front, the band in the accent", async () => {
  await w1Entry();
  await open('Beams', (button) => /Lintel band/.test(button.textContent));
  await waitFor(() => expect(dialogs()).toHaveLength(4));
  const entry = top();
  const svg = await entry.findByRole('img', { name: 'Front view of W1' });
  expect(views(entry).getByRole('button', { name: 'Front' }).getAttribute('aria-pressed')).toBe(
    'true'
  );
  expect(svg.querySelector('[data-subject]')?.dataset.name).toBe('Lintel band');
  // Drawn over the rest (the window, the column, the other bands).
  expect([...svg.querySelectorAll('[data-name]')].at(-1).dataset.name).toBe('Lintel band');
});

it("a double-click on the window in W1's Front opens its entry on Front", async () => {
  const entry = await w1Entry();
  const front = views(entry).getByRole('button', { name: 'Front' });
  await waitFor(() => expect(front.disabled).toBe(false));
  fireEvent.click(front);
  const svg = await entry.findByRole('img', { name: 'Front view of W1' });
  fireEvent.doubleClick(svg.querySelector('[data-name="Window A"] rect'));
  await waitFor(() => expect(dialogs()).toHaveLength(4));
  const opened = await top().findByRole('img', { name: 'Front view of W1' });
  expect(opened.querySelector('[data-subject]')?.dataset.name).toBe('Window A');
});
