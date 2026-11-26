import React from 'react';
import { planText } from '../plan-text.js';
import { FRONT_MAP, frontMapLayout } from './front-map.js';
import * as styles from './front-view.css.js';

/**
 * The mini-map's card in Front (decided 2026-11-26): the room in plan as the plan draws it, its
 * walls with openings as gaps, the shown row in the accent colour and the side's other rows grey,
 * the cone it is seen from and a ring at its 0 end. Display only: a click on the card does
 * nothing (in a room's entry, A3 will show the wall clicked).
 */

const EYE = 3.5; // px
const RING = 3.2;

/**
 * @param {{ map: object | null | undefined, wall: string }} props `map`: the front view's
 */
export function FrontMap({ map, wall }) {
  if (!map) return null;
  const m = frontMapLayout(map);
  return (
    <div className={styles.map} style={{ left: FRONT_MAP.left, bottom: FRONT_MAP.bottom }}>
      <svg
        className={styles.mapSvg}
        width={FRONT_MAP.width}
        height={FRONT_MAP.height}
        role="img"
        aria-label={planText('plan.front.map', { wall })}
      >
        <path className={styles.mapFloor} d={m.floor} />
        {m.cone ? <path className={styles.mapCone} d={m.cone} data-map="cone" /> : null}
        <path className={styles.mapWalls} d={m.walls} data-map="walls" />
        {m.lines.map((line, i) => (
          <line key={`line${i}`} className={styles.mapLine} {...line} data-map="line" />
        ))}
        {m.others.map((line, i) => (
          <line key={`other${i}`} className={styles.mapOther} {...line} data-map="other" />
        ))}
        {m.shown.map((line, i) => (
          <line key={`shown${i}`} className={styles.mapShown} {...line} data-map="shown" />
        ))}
        <circle className={styles.mapEye} cx={m.eye.x} cy={m.eye.y} r={EYE} data-map="eye" />
        <circle className={styles.mapZero} cx={m.zero.x} cy={m.zero.y} r={RING} data-map="zero" />
      </svg>
    </div>
  );
}
