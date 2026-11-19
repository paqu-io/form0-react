import { describe, expect, it } from 'vitest';
import { snapOpeningRatios } from '../src/building-plan/opening-snap.js';

const close = (value, expected) => expect(value).toBeCloseTo(expected, 9);

describe('openings on a 1 cm step', () => {
  // A room side covering 1 m to 5 m of its wall.
  const forward = { interval: [1, 5], direction: 1 };
  const backward = { interval: [1, 5], direction: -1 };
  const ends = (binding, { startRatio, endRatio }) =>
    binding.direction > 0
      ? [1 + startRatio * 4, 1 + endRatio * 4]
      : [5 - endRatio * 4, 5 - startRatio * 4];

  it('moves an opening to whole centimetres from the wall start, its width kept', () => {
    for (const binding of [forward, backward]) {
      const snapped = snapOpeningRatios(binding, 0.18286794876, 0.40786794876, {
        keepWidth: true,
      });
      const [start, end] = ends(binding, snapped);
      close(start * 100, Math.round(start * 100));
      close(end - start, 0.9);
      expect(snapped.width).toBe(0.9);
    }
  });

  it('puts both ends of a resized opening on the step, never under one step wide', () => {
    const snapped = snapOpeningRatios(forward, 0.1004, 0.3537);
    const [start, end] = ends(forward, snapped);
    close(start, 1.4);
    close(end, 2.41);
    const tiny = snapOpeningRatios(forward, 0.5, 0.5001);
    expect(tiny.width).toBe(0.01);
  });

  it('stays within the room side, and leaves ratios alone without one', () => {
    const snapped = snapOpeningRatios(forward, 0.999, 1.2, { keepWidth: true });
    expect(snapped.endRatio).toBe(1);
    close(snapped.endRatio - snapped.startRatio, Math.round(0.201 * 4 * 100) / 100 / 4);
    expect(snapOpeningRatios(null, 0.2, 0.4)).toEqual({
      startRatio: 0.2,
      endRatio: 0.4,
      width: null,
    });
  });
});
