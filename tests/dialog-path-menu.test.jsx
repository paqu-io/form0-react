// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { DialogPath } from '../src/dialog-path.jsx';
import { dialogPathParts } from '../src/dialog-path-parts.js';

// Its styles need the build's vanilla-extract step: class names stand in for them here.
vi.mock('../src/dialog-path.css.js', () =>
  Object.fromEntries(
    [
      'root',
      'path',
      'ancestor',
      'link',
      'separator',
      'current',
      'row',
      'entry',
      'more',
      'menu',
      'menuItem',
    ].map((name) => [name, name])
  )
);

// A collapsed dialog path's "…" (2026-11-26): a menu of the parts it hides, in order, lists and
// rows told apart; picking one steps up to it as pressing that part does. Esc closes it and goes
// no further (the dialog stays open), as a press elsewhere closes it. jsdom lays nothing out: every
// element 80 px wide in a 200 px path, so W3's path collapses to "… › Walls › this entry".

let width = 200;
beforeEach(() => {
  width = 200;
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get: () => width,
  });
  Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
    configurable: true,
    get: () => 80,
  });
});
afterEach(() => {
  delete HTMLElement.prototype.clientWidth;
  delete HTMLElement.prototype.scrollWidth;
  cleanup();
});

const parts = dialogPathParts({
  above: [
    { list: 'Floors', row: 'Ground floor', key: 'floors' },
    { list: 'Rooms', row: 'Bedroom', key: 'rooms' },
  ],
  list: 'Walls',
  listKey: 'walls',
  row: 'W3',
});

it('a collapsed path\'s "…" lists the parts it hides; picking one steps up to it', () => {
  const onSelect = vi.fn();
  render(<DialogPath parts={parts} onSelect={onSelect} />);
  expect(screen.getByRole('button', { name: 'Walls' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Bedroom' })).toBeNull();
  const more = screen.getByRole('button', { name: 'Show the whole path' });
  expect(more.getAttribute('aria-expanded')).toBe('false');

  fireEvent.click(more);
  const items = within(screen.getByRole('menu')).getAllByRole('menuitem');
  expect(items.map((item) => item.textContent)).toEqual([
    'Floors',
    'Ground floor',
    'Rooms',
    'Bedroom',
  ]);
  expect(items.map((item) => item.dataset.kind)).toEqual(['list', 'row', 'list', 'row']);
  expect(more.getAttribute('aria-expanded')).toBe('true');
  // Marked as an open dropdown, so the dialog's shortcuts leave its keys to it.
  expect(more.closest('[data-form0-dropdown-open]')).not.toBeNull();
  // The first item focused; the arrows, Home and End move through them, round.
  expect(document.activeElement).toBe(items[0]);
  fireEvent.keyDown(items[0], { key: 'ArrowUp' });
  expect(document.activeElement).toBe(items[3]);
  fireEvent.keyDown(items[3], { key: 'ArrowDown' });
  expect(document.activeElement).toBe(items[0]);
  fireEvent.keyDown(items[0], { key: 'End' });
  expect(document.activeElement).toBe(items[3]);

  // Rooms: the floor's dialog, showing its Rooms list.
  fireEvent.click(items[2]);
  expect(onSelect).toHaveBeenCalledWith({ to: 0, list: 'rooms' });
  expect(screen.queryByRole('menu')).toBeNull();
});

it('Esc closes the menu and goes no further; so does a press elsewhere', () => {
  const outer = vi.fn();
  document.addEventListener('keydown', outer);
  render(<DialogPath parts={parts} onSelect={() => {}} />);
  const more = screen.getByRole('button', { name: 'Show the whole path' });
  fireEvent.click(more);
  fireEvent.keyDown(document.activeElement, { key: 'Escape' });
  expect(screen.queryByRole('menu')).toBeNull();
  expect(document.activeElement).toBe(more);
  expect(outer).not.toHaveBeenCalled();
  document.removeEventListener('keydown', outer);

  fireEvent.click(more);
  expect(screen.getByRole('menu')).toBeTruthy();
  fireEvent.pointerDown(document.body);
  expect(screen.queryByRole('menu')).toBeNull();
});

it('without steps up, the "…" stays text', () => {
  render(<DialogPath parts={parts} />);
  expect(screen.queryByRole('button', { name: 'Show the whole path' })).toBeNull();
  expect(screen.getByText('…')).toBeTruthy();
});

// Found on the page (2026-11-26): a window narrowed while the whole path fitted set its level to
// 0 again, which it was, so nothing measured until something else drew the dialog again.
it('a path that fitted collapses when its box narrows', () => {
  const observers = [];
  const original = globalThis.ResizeObserver;
  globalThis.ResizeObserver = class {
    constructor(callback) {
      this.callback = callback;
      observers.push(this);
    }
    observe() {}
    disconnect() {}
  };
  try {
    width = 2000;
    render(<DialogPath parts={parts} onSelect={() => {}} />);
    expect(screen.getByRole('button', { name: 'Bedroom' })).toBeTruthy();
    width = 200;
    act(() => observers.forEach((observer) => observer.callback([])));
    expect(screen.getByRole('button', { name: 'Show the whole path' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Bedroom' })).toBeNull();
  } finally {
    globalThis.ResizeObserver = original;
  }
});
