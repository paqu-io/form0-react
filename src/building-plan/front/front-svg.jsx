import React from 'react';
import { PILL_HEIGHT } from '../draw/dimension-layout.js';
import { planText } from '../plan-text.js';
import * as styles from './front-view.css.js';

/**
 * The front view's drawing (A2), from its laid out shapes and lengths (`front-shapes.js`,
 * `front-chains.js`), in px. Parts that open by double-click carry `data-part` (their index in
 * `openable`); the view finds the part from it.
 */

const MARKER_RADIUS = 9.5;

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

function Piece({ piece, part }) {
  const { x, y, w, h } = piece;
  // The side's other wall picks by a click.
  const pickable = piece.shown ? '' : ` ${styles.openable}`;
  if (!piece.unknown)
    return (
      <rect
        className={`${styles.wallFace}${pickable}`}
        x={x}
        y={y}
        width={w}
        height={h}
        {...part}
      />
    );
  // Its height unknown: three sides drawn, the top dashed.
  return (
    <g className={pickable || undefined} {...part}>
      <rect className={styles.wallFace} x={x} y={y} width={w} height={h} stroke="none" />
      <path className={styles.wallEdge} d={`M${x} ${y} V${y + h} H${x + w} V${y}`} />
      <line className={styles.unknownTop} x1={x} y1={y} x2={x + w} y2={y} />
    </g>
  );
}

function Element({ shape, className, labelClass, part }) {
  const { x, y, w, h } = shape;
  return (
    <g
      className={shape.faded ? styles.faded : undefined}
      data-name={shape.name}
      data-selected={shape.selected || undefined}
    >
      <rect
        className={`${className} ${styles.openable}`}
        x={x}
        y={y}
        width={w}
        height={h}
        {...part}
      />
      {shape.selected && <rect className={styles.selected} x={x} y={y} width={w} height={h} />}
      {shape.label && (
        <text
          className={labelClass}
          x={shape.label.x}
          y={shape.label.y}
          textAnchor={shape.label.anchor}
        >
          {shape.name}
        </text>
      )}
    </g>
  );
}

function Chains({ chains }) {
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

/**
 * @param {{ shapes: object, chains: object, openable: object[] }} props `openable`: the parts
 *   that open, in the order their `data-part` counts
 */
export function FrontSvg({ shapes, chains, openable }) {
  const part = (shape) => {
    const index = openable.indexOf(shape);
    return index >= 0 ? { 'data-part': index } : {};
  };
  const { pieces, beams, openings, problems, folds, floor, unknown, markers } = shapes;
  return (
    <>
      <g className={styles.faded}>
        {pieces
          .filter((piece) => !piece.shown)
          .map((piece) => (
            <Piece key={piece.key} piece={piece} part={part(piece)} />
          ))}
      </g>
      {pieces
        .filter((piece) => piece.shown)
        .map((piece) => (
          <Piece key={piece.key} piece={piece} part={part(piece)} />
        ))}
      {pieces
        .filter((piece) => piece.selected)
        .map((piece) => (
          <rect
            key={`selected:${piece.key}`}
            className={styles.selected}
            x={piece.x}
            y={piece.y}
            width={piece.w}
            height={piece.h}
            data-selected-wall={piece.label}
          />
        ))}
      {beams.map((shape) => (
        <Element
          key={shape.key}
          shape={shape}
          className={styles.beam}
          labelClass={styles.name}
          part={part(shape)}
        />
      ))}
      {openings.map((shape) => (
        <Element
          key={shape.key}
          shape={shape}
          className={styles.opening}
          labelClass={styles.openingName}
          part={part(shape)}
        />
      ))}
      {problems.map((problem) => (
        <rect
          key={problem.key}
          className={styles.problem}
          x={problem.x}
          y={problem.y}
          width={problem.w}
          height={problem.h}
        />
      ))}
      {folds.map((fold) => (
        <line
          key={fold.key}
          className={styles.fold}
          x1={fold.x}
          y1={fold.y0}
          x2={fold.x}
          y2={fold.y1}
        />
      ))}
      <line className={styles.floorLine} x1={floor.x0} y1={floor.y} x2={floor.x1} y2={floor.y} />
      {unknown && (
        <text className={styles.note} x={unknown.x} y={unknown.y}>
          {planText('plan.front.heightUnknown')}
        </text>
      )}
      <Chains chains={chains} />
      {markers.map((marker) => (
        <g key={marker.key} aria-hidden="true">
          <circle className={styles.marker} cx={marker.x} cy={marker.y} r={MARKER_RADIUS} />
          <text className={styles.markerText} x={marker.x} y={marker.y + 4.5} textAnchor="middle">
            !
          </text>
        </g>
      ))}
    </>
  );
}
