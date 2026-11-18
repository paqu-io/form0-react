import { describe, expect, it } from 'vitest';
import {
  isPlanShortcutEvent,
  planShortcut,
  planShortcutKey,
  shortcutKeys,
} from '../src/building-plan/plan-shortcuts.js';
import { planText } from '../src/building-plan/plan-text.js';

describe('shortcuts', () => {
  it('matches the physical key, so Option on macOS does not change it', () => {
    const mac = { altKey: true, shiftKey: true, code: 'KeyD', key: 'Î' };
    expect(isPlanShortcutEvent(mac)).toBe(true);
    expect(planShortcutKey(mac)).toBe('D');
    expect(planShortcutKey({ code: 'Digit0', key: '=' })).toBe('0');
    // Without a code (old browsers, synthetic events) the typed character is used.
    expect(planShortcutKey({ key: 'w' })).toBe('W');
    expect(planShortcutKey({ code: 'BracketLeft', key: '[' })).toBeNull();
  });

  it('never takes the form’s plain Alt or a Ctrl / Meta chord', () => {
    expect(isPlanShortcutEvent({ altKey: true, shiftKey: false })).toBe(false);
    expect(isPlanShortcutEvent({ altKey: true, shiftKey: true, ctrlKey: true })).toBe(false);
    expect(isPlanShortcutEvent({ altKey: true, shiftKey: true, metaKey: true })).toBe(false);
  });

  it('shows the keys as on the platform', () => {
    expect(planShortcut('s')).toBe('Alt+Shift+S');
    expect(shortcutKeys('Alt+Shift+S', false)).toEqual(['Alt', 'Shift', 'S']);
    expect(shortcutKeys('Alt+Shift+S', true)).toEqual(['⌥', '⇧', 'S']);
  });
});

describe('texts', () => {
  it('fills a text by its key and keeps unknown keys visible', () => {
    expect(planText('plan.zoom.panHint')).toMatch(/Shift-drag/);
    expect(planText('plan.missing')).toBe('plan.missing');
  });
});
