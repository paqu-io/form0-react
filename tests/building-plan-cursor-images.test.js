import { describe, expect, it } from 'vitest';
import { cursorStyle, cursorSvg, customCursor } from '../src/building-plan/cursor-images.js';

// Our own grab and grabbing hands (G1, decided 2026-11-26): sharp at 1× and 2×, the browser's
// own as the fallback; other cursors as they are.

describe('our grab hands', () => {
  it('gives image-set at 1× and 2× with its hotspot, the browser’s hand after it', () => {
    const value = customCursor('grab', () => true);
    expect(value).toMatch(
      /^image-set\(url\("data:image\/svg\+xml,.+"\) 1x, url\(".+"\) 2x\) 12 12, grab$/
    );
    expect(decodeURIComponent(value)).toContain('width="48"');
  });

  it('falls back to the prefixed form, one image, then the name', () => {
    const only = (prefix) => (property, value) => property === 'cursor' && value.startsWith(prefix);
    expect(customCursor('grabbing', only('-webkit-image-set('))).toMatch(/^-webkit-image-set\(/);
    expect(customCursor('grabbing', only('url('))).toMatch(/^url\(.+\) 12 12, grabbing$/);
    expect(customCursor('grabbing', () => false)).toBe('grabbing');
  });

  it('draws a white hand in a ~1 px dark outline, as the system cursors; others alone', () => {
    const svg = cursorSvg('grabbing', 24);
    expect(svg).toContain('width="24"');
    expect(svg).toContain('fill="#fff"');
    expect(svg).toContain('stroke="#111" stroke-width="1.1"');
    expect(svg).not.toContain('stroke-width="5"'); // no halo (the hand test: too heavy)
    for (const name of ['pointer', 'default', 'move', 'ns-resize', 'crosshair'])
      expect(cursorStyle(name)).toBe(name);
  });
});
