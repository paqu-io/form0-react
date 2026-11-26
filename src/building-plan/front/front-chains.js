import { PILL_HEIGHT } from '../draw/dimension-layout.js';
import { textWidth } from './front-shapes.js';

/**
 * The front view's lengths (A2; H1, agreed 2026-11-25), in px: the shown row's levels from the
 * floor on the left; on the right a chain of the partial lengths between them, a pill too long
 * for its stretch stepped aside, alternating, with a leader, and the row's whole height outside
 * it when known; along the bottom the row's ends, its openings' and its columns' edges
 * (2026-11-26), the whole side under them.
 */

const PILL_FONT = 11; // the plan's pill text, monospace
const CHAIN_GAP = 28; // px from the side's right end to the height chain
const ASIDE_GAP = 27; // px from the chain to a stepped pill's left edge
const LEVEL_GAP = 12; // px between level labels, at least
const BOTTOM_GAP = 34; // px under the floor to the bottom chain
const BOTTOM_STEP = 20; // a pill stepped up or down from it
const SIDE_GAP = 78; // px under the floor to the whole side
const TICK_START = 4; // px from the drawing to where a tick starts

/** A length's pill: its text, its width, where it stands. */
export const pillWidth = (text) => Math.ceil(textWidth(text, PILL_FONT)) + 12;
const near = (a, b) => Math.abs(a - b) < 1e-6;

/**
 * @param {object} view core's front view
 * @param {{ scale: number, x: (m: number) => number, y: (m: number) => number }} t
 * @param {(metres: number) => string} format the plan's length text
 */
export function frontChains(view, t, format) {
  const right = t.x(view.length);
  const left = t.x(0);
  const own = view.pieces.find((piece) => piece.shown);
  return {
    levels: levelLabels(view.levels, t, left, format),
    height: heightChain(view.levels, t, right, format),
    whole:
      own?.height == null
        ? null
        : {
            x: right + CHAIN_GAP + wholeOffset(view.levels, format),
            y0: t.y(0),
            y1: t.y(own.height),
            pill: { text: format(own.height), width: pillWidth(format(own.height)) },
          },
    ...bottomChains(view, t, format),
  };
}

/** The levels above (and below) the floor, labelled left of the side, kept apart going up. */
function levelLabels(levels, t, left, format) {
  let last = Infinity;
  return levels
    .filter((level) => !near(level, 0))
    .map((level) => {
      const y = t.y(level);
      const ty = Math.min(y + 4, last - LEVEL_GAP);
      last = ty;
      return {
        key: `level:${level}`,
        x: left - 18,
        tick: [left - 14, left - TICK_START],
        y,
        ty,
        text: format(level),
      };
    });
}

/** Widest of the chain's pills, so stepped pills and the whole height clear each other. */
const widest = (levels, format) =>
  Math.max(0, ...levels.slice(1).map((level, i) => pillWidth(format(level - levels[i]))));
const wholeOffset = (levels, format) => ASIDE_GAP + 2 * (widest(levels, format) + 6) + 20;

function heightChain(levels, t, right, format) {
  const x = right + CHAIN_GAP;
  const column = widest(levels, format) + 6;
  let aside = 0;
  const pills = levels.slice(1).map((level, i) => {
    const below = levels[i];
    const text = format(level - below);
    const width = pillWidth(text);
    const y = (t.y(below) + t.y(level)) / 2;
    if (t.y(below) - t.y(level) >= PILL_HEIGHT + 1)
      return { key: `height:${below}`, x, y, text, width, leader: null };
    const edge = x + ASIDE_GAP + (aside++ % 2) * column;
    return {
      key: `height:${below}`,
      x: edge + width / 2,
      y,
      text,
      width,
      leader: { x0: x, x1: edge, y },
    };
  });
  return {
    x,
    y0: t.y(levels[0]),
    y1: t.y(levels.at(-1)),
    ticks: levels.map((level) => ({
      key: `tick:${level}`,
      x0: right + TICK_START,
      x1: x + 5,
      y: t.y(level),
    })),
    pills,
  };
}

/** Along the bottom: the shown row's ends and its openings', stepped when short; the side under. */
function bottomChains(view, t, format) {
  const floor = t.y(0);
  const stops = [
    ...view.pieces.filter((piece) => piece.shown).flatMap((piece) => [piece.from, piece.to]),
    ...[...view.openings, ...(view.columns || [])]
      .filter((part) => part.faceId === view.faceId)
      .flatMap((part) => [part.from, part.to]),
  ]
    .sort((a, b) => a - b)
    .filter((stop, i, all) => i === 0 || !near(stop, all[i - 1]));
  const y = floor + BOTTOM_GAP;
  let stepped = 0;
  const bottom = {
    y,
    x0: t.x(stops[0]),
    x1: t.x(stops.at(-1)),
    ticks: stops.map((stop) => ({
      key: `stop:${stop}`,
      x: t.x(stop),
      y0: floor + TICK_START,
      y1: y + 5,
    })),
    pills: stops.slice(1).map((stop, i) => {
      const text = format(stop - stops[i]);
      const width = pillWidth(text);
      const fits = (stop - stops[i]) * t.scale >= width + 4;
      // Too short: up, then down, alternating.
      const shift = fits ? 0 : (stepped++ % 2 ? 1 : -1) * BOTTOM_STEP;
      return {
        key: `along:${stops[i]}`,
        x: (t.x(stops[i]) + t.x(stop)) / 2,
        y: y + shift,
        text,
        width,
      };
    }),
  };
  const whole = stops.length > 2 || view.pieces.length > 1;
  const sideY = floor + SIDE_GAP;
  return {
    bottom,
    side: whole
      ? {
          y: sideY,
          x0: t.x(0),
          x1: t.x(view.length),
          ticks: [0, view.length].map((at) => ({
            key: `side:${at}`,
            x: t.x(at),
            y0: floor + TICK_START,
            y1: sideY + 5,
          })),
          pill: {
            x: t.x(view.length / 2),
            y: sideY,
            text: format(view.length),
            width: pillWidth(format(view.length)),
          },
        }
      : null,
  };
}
