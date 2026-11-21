// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, renderHook } from '@testing-library/react';
import { ownsPlanKeyboard, usePlanKeyboard } from '../src/building-plan/plan-keyboard.js';

const host = () => {
  const element = document.createElement('div');
  element.appendChild(document.createElement('canvas'));
  document.body.appendChild(element);
  return element;
};

afterEach(cleanup);

describe('which open plan takes the keyboard', () => {
  it('is the plan of the top dialog, then the one under it again', () => {
    const page = host();
    const floor = host();
    renderHook(() => usePlanKeyboard({ current: page }));
    const entry = renderHook(() => usePlanKeyboard({ current: floor }));
    expect(ownsPlanKeyboard(floor.firstChild)).toBe(true);
    expect(ownsPlanKeyboard(page.firstChild)).toBe(false);
    entry.unmount();
    expect(ownsPlanKeyboard(page.firstChild)).toBe(true);
  });

  it('lets a canvas outside any host act (tests, a detached canvas)', () => {
    renderHook(() => usePlanKeyboard({ current: host() }));
    expect(ownsPlanKeyboard(document.createElement('canvas'))).toBe(true);
    expect(ownsPlanKeyboard(null)).toBe(true);
  });
});
