// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook } from '@testing-library/react';
import { useEntryIssues } from '../src/building-plan/use-entry-issues.js';

// Wall beams hand test (2026-11-24): a value typed in an entry's form that core refuses ("Beam B#1
// does not fit on its wall.") showed in a banner above the form; it goes to the entry's canvas,
// in the status line with the canvas's own refusals.

afterEach(cleanup);

describe("an entry's typed refusals on its canvas", () => {
  it('sends each new set of issues to the canvas, an empty one to clear them', () => {
    const canvas = { receiveIssues: vi.fn() };
    const canvasRef = { current: canvas };
    const refused = [{ code: 'wall_beam_outside_wall', message: 'Beam B#1 does not fit.' }];
    const hook = renderHook(({ issues }) => useEntryIssues({ canvasRef, issues }), {
      initialProps: { issues: null },
    });
    expect(canvas.receiveIssues).not.toHaveBeenCalled();
    hook.rerender({ issues: refused });
    expect(canvas.receiveIssues).toHaveBeenLastCalledWith(refused);
    // The same set again (a re-render): not sent twice, so a dismissed message stays dismissed.
    hook.rerender({ issues: refused });
    expect(canvas.receiveIssues).toHaveBeenCalledTimes(1);
    hook.rerender({ issues: [] });
    expect(canvas.receiveIssues).toHaveBeenLastCalledWith([]);
  });

  it('waits for a canvas', () => {
    const canvasRef = { current: null };
    expect(() =>
      renderHook(() => useEntryIssues({ canvasRef, issues: [{ message: 'Refused.' }] }))
    ).not.toThrow();
  });
});
