import React from 'react';
import { planText } from '../plan-text.js';
import { FRONT_MAP, frontMapLayout } from './front-map.js';
import * as styles from './front-view.css.js';

/**
 * The mini-map's card in Front (decided 2026-11-26): the room in plan as the plan draws it, its
 * walls with openings as gaps, the shown row in the accent colour and the side's other rows grey,
 * the cone it is seen from (lighter, to the side's ends, when Front shows other rows beside it)
 * and a ring at its 0 end. In a room's entry (A3, `onShow`) each of the room's walls is a target:
 * hovered it lights up, a click shows it; elsewhere the card is display only.
 */

const EYE = 3.5; // px
const RING = 3.2;

/**
 * @param {{
 *   map: object | null | undefined,
 *   wall: string,
 *   rows?: Array<{ faceId: string, label: string }>,
 *   onShow?: ((faceId: string) => void) | null,
 * }} props `map`: the front view's; `rows`: its rows' labels (the view's `rows`)
 */
export function FrontMap({ map, wall, rows = [], onShow = null }) {
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
        {m.sideCone ? (
          <path className={styles.mapSideCone} d={m.sideCone} data-map="side-cone" />
        ) : null}
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
        {onShow &&
          m.rows.map((row) => (
            <g
              key={row.faceId}
              className={styles.mapRow}
              data-map="row"
              data-label={rows.find((entry) => entry.faceId === row.faceId)?.label}
              onClick={() => onShow(row.faceId)}
            >
              {row.segments.map((line, i) => (
                <line key={i} {...line} />
              ))}
            </g>
          ))}
      </svg>
    </div>
  );
}
