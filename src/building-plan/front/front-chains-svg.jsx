import React from 'react';
import { PILL_HEIGHT } from '../draw/dimension-layout.js';
import * as styles from './front-view.css.js';

/**
 * The front view's lengths, drawn (moved out of `front-svg.jsx`): the levels on the left, the
 * partial heights and the whole height on the right, the lengths along the bottom
 * (`front-chains.js` lays them out).
 */

function Pill({ x, y, text, width }) {
  return (
    <g>
      <rect
        className={styles.pill}
        x={x - width / 2}
        y={y - PILL_HEIGHT / 2}
        width={width}
        height={PILL_HEIGHT}
        rx={3.5}
      />
      <text className={styles.pillText} x={x} y={y + 4} textAnchor="middle">
        {text}
      </text>
    </g>
  );
}

export function FrontChains({ chains }) {
  const { levels, height, whole, bottom, side } = chains;
  return (
    <g>
      <g className={styles.ext}>
        {levels.map((level) => (
          <line key={level.key} x1={level.tick[0]} y1={level.y} x2={level.tick[1]} y2={level.y} />
        ))}
        <line x1={height.x} y1={height.y0} x2={height.x} y2={height.y1} />
        {height.ticks.map((tick) => (
          <line key={tick.key} x1={tick.x0} y1={tick.y} x2={tick.x1} y2={tick.y} />
        ))}
        {height.pills
          .filter((pill) => pill.leader)
          .map((pill) => (
            <line key={pill.key} x1={pill.leader.x0} y1={pill.y} x2={pill.leader.x1} y2={pill.y} />
          ))}
        {whole && (
          <>
            <line x1={whole.x} y1={whole.y0} x2={whole.x} y2={whole.y1} />
            <line x1={whole.x - 6} y1={whole.y0} x2={whole.x + 6} y2={whole.y0} />
            <line x1={whole.x - 6} y1={whole.y1} x2={whole.x + 6} y2={whole.y1} />
          </>
        )}
        <line x1={bottom.x0} y1={bottom.y} x2={bottom.x1} y2={bottom.y} />
        {bottom.ticks.map((tick) => (
          <line key={tick.key} x1={tick.x} y1={tick.y0} x2={tick.x} y2={tick.y1} />
        ))}
        {side && (
          <>
            <line x1={side.x0} y1={side.y} x2={side.x1} y2={side.y} />
            {side.ticks.map((tick) => (
              <line key={tick.key} x1={tick.x} y1={tick.y0} x2={tick.x} y2={tick.y1} />
            ))}
          </>
        )}
      </g>
      {levels.map((level) => (
        <text key={level.key} className={styles.pillText} x={level.x} y={level.ty} textAnchor="end">
          {level.text}
        </text>
      ))}
      {height.pills.map((pill) => (
        <Pill key={pill.key} {...pill} />
      ))}
      {whole && <Pill x={whole.x} y={(whole.y0 + whole.y1) / 2} {...whole.pill} />}
      {bottom.pills.map((pill) => (
        <Pill key={pill.key} {...pill} />
      ))}
      {side && <Pill {...side.pill} />}
    </g>
  );
}
