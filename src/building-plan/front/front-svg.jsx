import React from 'react';
import { planText } from '../plan-text.js';
import { FrontChains } from './front-chains-svg.jsx';
import * as styles from './front-view.css.js';

/**
 * The front view's drawing (A2), from its laid out shapes and lengths (`front-shapes.js`,
 * `front-chains.js`), in px. Parts that open by double-click carry `data-part` (their index in
 * `openable`); the view finds the part from it.
 */

const MARKER_RADIUS = 9.5;

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

/** A part: its box, a diagonal cross (a room beam seen end on), its name. */
function Element({ shape, className, labelClass, part, cross = false }) {
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
      {cross && (
        <path
          className={styles.cross}
          d={`M${x} ${y} L${x + w} ${y + h} M${x + w} ${y} L${x} ${y + h}`}
        />
      )}
      {shape.unknown && <line className={styles.unknownTop} x1={x} y1={y} x2={x + w} y2={y} />}
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

/**
 * @param {{ shapes: object, chains: object, openable: object[] }} props `openable`: the parts
 *   that open, in the order their `data-part` counts
 */
export function FrontSvg({ shapes, chains, openable }) {
  const part = (shape) => {
    const index = openable.indexOf(shape);
    return index >= 0 ? { 'data-part': index } : {};
  };
  const { pieces, beams, openings, columns, roomBeams, freeWalls, problems, folds } = shapes;
  const { floor, unknown, markers } = shapes;
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
      {columns.map((shape) => (
        <Element
          key={shape.key}
          shape={shape}
          className={styles.column}
          labelClass={styles.name}
          part={part(shape)}
        />
      ))}
      {(freeWalls || []).map((shape) => (
        <Element
          key={shape.key}
          shape={shape}
          className={styles.freeWall}
          labelClass={styles.name}
          part={part(shape)}
        />
      ))}
      {roomBeams.map((shape) => (
        <Element
          key={shape.key}
          shape={shape}
          className={styles.beam}
          labelClass={styles.name}
          part={part(shape)}
          cross={shape.endOn}
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
      <FrontChains chains={chains} />
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
