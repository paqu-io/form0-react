// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { FormRenderer } from '../dist/index.js';
import { fixture, listRows, mockCanvas } from './building-plan-front-fixture.js';

// A3 (decided 2026-11-26): Front in a room's entry. It opens on the wall selected on the plan if
// it is the room's, else the Walls list's first row; the wall line's arrows and Alt+Shift+←/→ step
// through the list's rows, round from the last to the first, "W2 · 2 of 4"; a click on a wall on
// the mini-map shows it; showing a wall selects it on the plan. The tool rail stays, disabled,
// saying "Switch to Plan to edit", and the Select tool comes back.

afterEach(cleanup);
beforeEach(mockCanvas);

async function bedroomEntry() {
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
  await waitFor(() =>
    expect(screen.getAllByText('Rooms', { exact: true }).length).toBeGreaterThan(0)
  );
  const rooms = screen.getAllByText('Rooms', { exact: true }).at(-1).parentElement.parentElement;
  fireEvent.click(within(rooms).getByRole('button', { name: 'View', exact: true }));
  fireEvent.click((await listRows('Rooms'))[0]);
  await waitFor(() => expect(screen.getAllByRole('dialog')).toHaveLength(2));
  return within(screen.getAllByRole('dialog').at(-1));
}

const shown = (entry) => entry.getByRole('img', { name: /^Front view of / });
const line = (entry) => entry.getByRole('button', { name: 'Next wall' }).parentElement.textContent;
// The Walls list's row marked for the wall selected on the plan.
const marked = () =>
  screen.getAllByRole('list', { name: 'Walls' }).at(-1).querySelector('[data-plan-marked="true"]')
    ?.textContent || '';
const step = (key) => fireEvent.keyDown(window, { code: key, key, altKey: true, shiftKey: true });

it("Front in a room's entry steps through its walls, selecting each, the tools disabled", async () => {
  const entry = await bedroomEntry();
  // The room's Walls list beside the canvas, to see the row marked.
  const walls = screen.getAllByText('Walls', { exact: true }).at(-1).parentElement.parentElement;
  fireEvent.click(within(walls).getByRole('button', { name: 'View', exact: true }));
  await listRows('Walls');
  const views = within(entry.getByRole('group', { name: 'View' }));
  const front = views.getByRole('button', { name: 'Front' });
  await waitFor(() => expect(front.disabled).toBe(false));
  fireEvent.click(front);
  await entry.findByRole('img', { name: 'Front view of W1' });
  expect(line(entry)).toBe('W1 · 1 of 4');
  const rail = entry.getByRole('toolbar', { name: 'Canvas tools' });
  expect(
    within(rail)
      .getAllByRole('button')
      .every((button) => button.disabled)
  ).toBe(true);
  expect(rail.dataset.tooltip).toBe('Switch to Plan to edit');
  // Front's own hint, not the Select tool's.
  const hint = entry
    .getAllByRole('status')
    .map((status) => status.textContent)
    .join(' ');
  expect(hint).toMatch(/Double-click an element to open it · AltShift←\/→ next wall/);
  expect(hint).not.toMatch(/Drag a corner/);

  // The arrows, round from the first to the last; each wall selected on the plan.
  fireEvent.click(entry.getByRole('button', { name: 'Next wall' }));
  await entry.findByRole('img', { name: 'Front view of W2' });
  expect(line(entry)).toBe('W2 · 2 of 4');
  await waitFor(() => expect(marked()).toMatch(/^W2\b/));
  fireEvent.click(entry.getByRole('button', { name: 'Previous wall' }));
  fireEvent.click(entry.getByRole('button', { name: 'Previous wall' }));
  await entry.findByRole('img', { name: 'Front view of W4' });
  expect(line(entry)).toBe('W4 · 4 of 4');

  // Alt+Shift+← / →.
  step('ArrowRight');
  await entry.findByRole('img', { name: 'Front view of W1' });
  step('ArrowRight');
  step('ArrowRight');
  await entry.findByRole('img', { name: 'Front view of W3' });
  step('ArrowLeft');
  await entry.findByRole('img', { name: 'Front view of W2' });

  // A click on a wall on the mini-map shows it.
  const map = entry.getByRole('img', { name: 'Where W2 is seen from' });
  fireEvent.click(map.querySelector('[data-map="row"][data-label="W4"]'));
  await entry.findByRole('img', { name: 'Front view of W4' });
  await waitFor(() => expect(marked()).toMatch(/^W4\b/));

  // Back on Plan: the tools again, W4 still selected; Front opens on it.
  fireEvent.click(views.getByRole('button', { name: 'Plan' }));
  await waitFor(() => expect(entry.queryByRole('img', { name: /^Front view/ })).toBeNull());
  expect(
    within(rail)
      .getAllByRole('button')
      .some((button) => !button.disabled)
  ).toBe(true);
  fireEvent.click(front);
  await entry.findByRole('img', { name: 'Front view of W4' });
  expect(line(entry)).toBe('W4 · 4 of 4');
});
