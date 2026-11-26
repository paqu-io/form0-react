/**
 * Our own grab and grabbing hands for the plan canvases (G1, decided 2026-11-26). On Windows the
 * pointing hand is the system's cursor, drawn sharp at the display's scale, but `grab` and
 * `grabbing` have no system cursor there: Chromium draws them from small images of its own,
 * blurry above 100% and in an older style. These are lucide's `hand` and `hand-grab` (ISC, the
 * icons the app already uses), drawn as the system's cursors are: white, a dark outline about
 * 1 px wide (the hand test found a 1.6 px one with a white halo too heavy beside the arrow and
 * the pointing hand), given at 1× and 2× so they stay sharp; the browser's own is the fallback.
 * `hoverCursor` and `dragCursor` keep returning the names; a canvas sets `cursorStyle(name)`.
 */

const SIZE = 24; // px, as the system's cursors
const HOTSPOT = 12; // the palm's middle

// lucide 0.553, 24 × 24.
const SHAPES = {
  grab: {
    lines: [
      'M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2',
      'M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2',
      'M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8',
      'M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15',
    ],
    palm: 'M6 9h16v5a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-6-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L6 15z',
    // Down each finger's middle, 4 wide: its inside.
    fingers: 'M16 6v6M12 4v6M8 6v8M20 8v6',
  },
  grabbing: {
    lines: [
      'M18 11.5V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1.4',
      'M14 10V8a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2',
      'M10 9.9V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v5',
      'M6 14a2 2 0 0 0-2-2a2 2 0 0 0-2 2',
      'M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-4a8 8 0 0 1-8-8 2 2 0 1 1 4 0',
    ],
    palm: 'M4 12h18v2a8 8 0 0 1-8 8h-4a8 8 0 0 1-8-8z',
    fingers: 'M16 9v3M12 8v3M8 9v5M20 11v3M4 14v.01',
  },
};

/** The hand's SVG at a size: the palm and fingers filled white inside a ~1 px outline. */
export function cursorSvg(name, size = SIZE) {
  const { lines, palm, fingers } = SHAPES[name];
  const paths = lines.map((d) => `<path d="${d}"/>`).join('');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" ` +
    'viewBox="-1 -1 26 26" fill="none" stroke-linecap="round" stroke-linejoin="round">' +
    `<path d="${palm}" fill="#fff"/><path d="${fingers}" stroke="#fff" stroke-width="4"/>` +
    `<g stroke="#111" stroke-width="1.1">${paths}</g></svg>`
  );
}

const url = (markup) => `url("data:image/svg+xml,${encodeURIComponent(markup)}")`;
const cssSupports = (property, value) =>
  typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports(property, value);

/**
 * The CSS cursor for one of our hands: the first form the browser takes (`image-set` at 1× and
 * 2×, the prefixed one, a single image), each falling back to the browser's own; the name itself
 * when it takes none (as in jsdom).
 * @param {'grab' | 'grabbing'} name
 * @param {(property: string, value: string) => boolean} [supports]
 */
export function customCursor(name, supports = cssSupports) {
  const one = url(cursorSvg(name, SIZE));
  const two = url(cursorSvg(name, SIZE * 2));
  const tail = `${HOTSPOT} ${HOTSPOT}, ${name}`;
  return (
    [
      `image-set(${one} 1x, ${two} 2x) ${tail}`,
      `-webkit-image-set(${one} 1x, ${two} 2x) ${tail}`,
      `${one} ${tail}`,
    ].find((value) => supports('cursor', value)) || name
  );
}

const cache = new Map();

/**
 * What to set as a canvas's cursor for a name: our hand for `grab` and `grabbing`, any other as
 * it is.
 * @param {string} name
 */
export function cursorStyle(name) {
  if (!SHAPES[name]) return name;
  if (!cache.has(name)) cache.set(name, customCursor(name));
  return cache.get(name);
}
