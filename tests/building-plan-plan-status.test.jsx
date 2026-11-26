// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { PlanStatus } from '../src/building-plan/plan-status.jsx';

// Its styles need the build's vanilla-extract step: class names stand in for them here.
vi.mock('../src/building-plan/plan-status.css.js', () =>
  Object.fromEntries(
    ['line', 'refusal', 'icon', 'text', 'step', 'dismiss', 'kbd', 'access'].map((name) => [
      name,
      name,
    ])
  )
);

// A canvas that edits nothing says so first in its status line (decided 2026-11-26, in place of
// the "View only" badge in the floor row): an element's entry "View only", a read-only record
// "Read only", with a lock icon, before the hint, and there even with no hint.

afterEach(cleanup);
const hint = 'plan.status.view';

it('says "View only" first, with its icon, then the hint', () => {
  render(<PlanStatus access="view" hintKey={hint} />);
  const line = screen.getByRole('status');
  const chip = line.firstElementChild;
  expect(chip.textContent).toBe('View only');
  expect(chip.querySelector('svg')).not.toBeNull();
  expect(line.textContent).toMatch(/^View onlyDouble-click an element to open it/);
  expect(line.hidden).toBe(false);
});

it('says "Read only" for a read-only record, and shows with no hint', () => {
  render(<PlanStatus access="read" />);
  const line = screen.getByRole('status');
  expect(line.textContent).toBe('Read only');
  expect(line.hidden).toBe(false);
});

it('says nothing of it on a canvas that edits', () => {
  const { rerender } = render(<PlanStatus hintKey={hint} />);
  expect(screen.getByRole('status').textContent).not.toMatch(/only/);
  rerender(<PlanStatus />);
  expect(screen.getByRole('status', { hidden: true }).hidden).toBe(true);
});
