// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, screen, within, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { listRows, openFloor } from './fixtures/plan-window-band.jsx';

// Bands 4a (decided 2026-11-25): problems to fix in the plan before saving its floor. A canvas
// lists them first in its "n issues", live; the floor entry lists them first in its Validation
// panel with a "Plan" tag, and its Save waits until none is left; a room entry saves.

afterEach(cleanup);
beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () =>
      new Proxy(
        { measureText: () => ({ width: 30 }) },
        {
          get: (target, name) => target[name] || (() => {}),
          set: (target, name, value) => {
            target[name] = value;
            return true;
          },
        }
      )
  );
  HTMLElement.prototype.scrollIntoView = () => {};
});

const LABEL = 'Window 1 and Lintel band · Plan';
const MESSAGE = 'Window 1 runs into Lintel band.';

it("a floor entry's Save waits for its problems, listed first with a Plan tag", async () => {
  const dialog = await openFloor(2.4);
  const underside = await dialog.findByLabelText(/Lintel band underside/);
  expect(dialog.queryByRole('button', { name: /^\d+ issues?$/ })).toBeNull();
  // Typed, then saved at once: the band edit asks first (4b); kept, Save reads the problem the
  // typed value makes.
  fireEvent.change(underside, { target: { value: '2.2' } });
  fireEvent.blur(underside);
  fireEvent.click(dialog.getByRole('button', { name: /^Save/ }));
  const question = within(await screen.findByRole('alertdialog'));
  fireEvent.click(question.getByRole('button', { name: "Keep them, I'll fix them" }));
  const validation = () => dialog.getByRole('button', { name: /^Validation/ });
  await waitFor(() => expect(validation().textContent).toMatch(/Validation\s*1$/));
  expect(screen.getAllByRole('dialog')).toHaveLength(1);
  fireEvent.click(validation());
  const finding = await dialog.findByText(LABEL);
  expect(finding.closest('button').textContent).toContain('W1');
  expect(finding.closest('button').textContent).toContain(MESSAGE);

  // The canvas lists it too, live.
  fireEvent.click(await dialog.findByRole('button', { name: '1 issue' }));
  const [item] = within(dialog.getByRole('list', { name: 'Issues' })).getAllByRole('button');
  expect(item.textContent).toContain(LABEL);
  expect(item.textContent).toContain(`W1: ${MESSAGE}`);

  fireEvent.change(underside, { target: { value: '2.4' } });
  fireEvent.blur(underside);
  fireEvent.click(dialog.getByRole('button', { name: /^Save/ }));
  await waitFor(() => expect(screen.queryAllByRole('dialog')).toHaveLength(0));
});

it('a room entry lists the problems of its walls and saves', async () => {
  const dialog = await openFloor(2.2);
  expect(await dialog.findByRole('button', { name: '1 issue' })).toBeTruthy();
  const rooms = dialog.getAllByText('Rooms', { exact: true }).at(-1).parentElement.parentElement;
  fireEvent.click(within(rooms).getByRole('button', { name: 'View', exact: true }));
  fireEvent.click((await listRows('Rooms'))[0]);
  await waitFor(() => expect(screen.getAllByRole('dialog')).toHaveLength(2));
  const room = within(screen.getAllByRole('dialog').at(-1));
  expect(await room.findByRole('button', { name: '1 issue' })).toBeTruthy();
  fireEvent.click(room.getByRole('button', { name: /^Save/ }));
  await waitFor(() => expect(screen.getAllByRole('dialog')).toHaveLength(1));
});
