import { describe, expect, it } from 'vitest';
import {
  isPlanShortcutEvent,
  planShortcut,
  planShortcutKey,
  shortcutKeys,
} from '../src/building-plan/plan-shortcuts.js';
import { planText, planTextParts } from '../src/building-plan/plan-text.js';
import { getButtonsForMode } from '../src/building-plan/toolbar/toolbar-config.js';

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

describe('rail', () => {
  it('lists the tools in the rail\u2019s groups, with Pin among the wall tools', () => {
    const room = getButtonsForMode('room-modal');
    expect(room.map((button) => button.id)).toEqual([
      'select',
      'clear',
      'room',
      'wall',
      'column',
      'beam',
      'door',
      'window',
      'split',
      'rejoin',
      'pin',
    ]);
    expect(room.find((button) => button.id === 'pin')).toMatchObject({
      enabled: true,
      shortcutKey: 'N',
      group: 'editing',
    });
    // Pin, like Split and Rejoin, acts on a room's walls only.
    expect(getButtonsForMode('floor').find((button) => button.id === 'pin').enabled).toBe(false);
    expect(getButtonsForMode('floor').find((button) => button.id === 'room').enabled).toBe(true);
  });

  it('keeps every tool key unique and away from Z and Y (undo, redo)', () => {
    const keys = getButtonsForMode('room').map((button) => button.shortcutKey);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).not.toContain('Z');
    expect(keys).not.toContain('Y');
  });

  it('splits status texts around their key caps', () => {
    expect(planTextParts('plan.status.select')).toEqual([
      { text: 'Drag a corner to reshape · ' },
      { key: 'alt' },
      { text: ' moves it freely · ' },
      { key: 'shift' },
      { text: '-drag pans' },
    ]);
  });
});
