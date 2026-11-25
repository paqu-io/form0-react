// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { openFloor } from './fixtures/plan-window-band.jsx';

// Bands 4b (decided 2026-11-25): a band edit running bands into openings asks: fit the openings,
// keep them (problems to fix, 4a), or cancel, which puts the typed value back in its field (a
// cancelled plan question left it there, unapplied).

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

/** Types the floor's lintel underside, then answers the question with `button`. */
async function lowerLintel(dialog, value, button) {
  const underside = await dialog.findByLabelText(/Lintel band underside/);
  fireEvent.change(underside, { target: { value } });
  fireEvent.blur(underside);
  const question = within(await screen.findByRole('alertdialog'));
  expect(question.getByText('Openings in the way')).toBeTruthy();
  expect(
    question.getByText('This edit runs Lintel band into 1 opening: Window 1 (W1).')
  ).toBeTruthy();
  fireEvent.click(question.getByRole('button', { name: button }));
  await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
  return () => dialog.getByLabelText(/Lintel band underside/).value;
}
const chip = (dialog) => dialog.queryByRole('button', { name: /^\d+ issues?$/ });

it('Cancel puts the typed value back; Fit lowers the window, Save works', async () => {
  const dialog = await openFloor(2.4);
  const cancelled = await lowerLintel(dialog, '2.2', 'Cancel');
  await waitFor(() => expect(cancelled()).toBe('2.4'));
  expect(chip(dialog)).toBeNull();

  const fitted = await lowerLintel(dialog, '2.2', 'Fit the openings');
  await waitFor(() => expect(fitted()).toBe('2.2'));
  expect(chip(dialog)).toBeNull();
  fireEvent.click(dialog.getByRole('button', { name: /^Save/ }));
  await waitFor(() => expect(screen.queryAllByRole('dialog')).toHaveLength(0));
});

it('Keep applies the edit and leaves the problem to fix', async () => {
  const dialog = await openFloor(2.4);
  const kept = await lowerLintel(dialog, '2.2', "Keep them, I'll fix them");
  await waitFor(() => expect(kept()).toBe('2.2'));
  expect(await dialog.findByRole('button', { name: '1 issue' })).toBeTruthy();
});
