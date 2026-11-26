import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { planText } from '../plan-text.js';
import { frontTransform, frontZoomed, frontCentre } from './front-camera.js';
import { frontShapes } from './front-shapes.js';
import { frontChains } from './front-chains.js';
import { FrontSvg } from './front-svg.jsx';
import { FrontMap } from './front-map-svg.jsx';
import { cursorStyle } from '../cursor-images.js';
import * as styles from './front-view.css.js';

/**
 * The read-only front view of a wall row (A2, decided 2026-11-26), over the plan canvas in its
 * place: the row seen from inside its room, from core's front view (`controller.frontView`).
 * Zoom (wheel, the zoom pill) and pan (Shift-drag, the middle button) are its own; a
 * double-click opens a part's entry as on the plan; the plan's selected element and its issues'
 * markers show here too. The wall line names the row: "W1 · 1 of 1", in a room's entry "W2 · 2 of
 * 5" with arrows stepping through its walls (A3); the mini-map, bottom left, shows where it is seen
 * from (2026-11-26), and in a room's entry a click on a wall there shows it.
 */

const WHEEL = 0.002; // as the plan canvas
// jsdom measures nothing: a 16:9 panel.
const FALLBACK = Object.freeze({ width: 864, height: 486 });

/** The element's size, followed while it changes. */
function useBoxSize(ref) {
  const [size, setSize] = useState(FALLBACK);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const measure = () => {
      const { clientWidth: width, clientHeight: height } = element;
      if (width > 0 && height > 0)
        setSize((current) =>
          current.width === width && current.height === height ? current : { width, height }
        );
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}

function WallLine({ label, index, total, onStep }) {
  const off = !onStep || total < 2;
  return (
    <div className={styles.wallLine}>
      <button
        type="button"
        className={styles.step}
        disabled={off}
        onClick={() => onStep(-1)}
        aria-label={planText('plan.front.previous')}
        aria-keyshortcuts={off ? undefined : 'Alt+Shift+ArrowLeft'}
      >
        <ChevronLeft size={14} strokeWidth={2.25} aria-hidden="true" />
      </button>
      <span>
        <span className={styles.wallName}>{label}</span>
        {` · ${planText('plan.front.position', { index, total })}`}
      </span>
      <button
        type="button"
        className={styles.step}
        disabled={off}
        onClick={() => onStep(1)}
        aria-label={planText('plan.front.next')}
        aria-keyshortcuts={off ? undefined : 'Alt+Shift+ArrowRight'}
      >
        <ChevronRight size={14} strokeWidth={2.25} aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * @param {{
 *   view: object,
 *   camera: { zoom: number, pan: { x: number, y: number } },
 *   onCamera: (update: (camera: object) => object) => void,
 *   selection?: { collection: string, id: string } | null,
 *   markers?: Array<Array<{ key: string, index: number }>>,
 *   format: (metres: number) => string,
 *   onOpen: (ref: { collection: string, id: string, path: object[] }) => void,
 *   onPick?: (ref: { collection: string, id: string } | null) => void,
 *   position?: { index: number, total: number },
 *   onStep?: ((by: number) => void) | null,
 *   onShow?: ((faceId: string) => void) | null,
 *   lit?: string | null,
 *   subject?: { collection: string, id: string, name?: string } | null,
 * }} props `onPick`: a click on a part selects it, on nothing the entry's own (2026-11-26);
 *   `position`, `onStep`, `onShow`: a room's entry steps through its rows (A3); `lit`: the wall
 *   a hovered Walls row names, lit on the mini-map; `subject`: an element's entry's element (A4)
 */
export function FrontView({
  view,
  camera,
  onCamera,
  selection = null,
  markers = [],
  format,
  onOpen,
  onPick = () => {},
  position = { index: 1, total: 1 },
  onStep = null,
  onShow = null,
  lit = null,
  subject = null,
}) {
  const rootRef = useRef(null);
  const box = useBoxSize(rootRef);
  const [panning, setPanning] = useState(null);
  const t = frontTransform(view, box, camera);
  const shapes = frontShapes(view, t, { selection, markers, subject });
  const chains = frontChains(view, t, format, subject);
  const openable = [
    ...shapes.pieces,
    ...shapes.openings,
    ...shapes.beams,
    ...shapes.columns,
    ...shapes.roomBeams,
    ...shapes.freeWalls,
  ].filter((s) => s.ref);
  const own = view.pieces.find((piece) => piece.shown);

  // The wheel zooms about the pointer (a listener of its own: React's is passive).
  const latest = useRef({ box, onCamera });
  latest.current = { box, onCamera };
  useEffect(() => {
    const element = rootRef.current;
    if (!element) return undefined;
    const onWheel = (event) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const centre = frontCentre(latest.current.box);
      const offset = {
        x: event.clientX - rect.left - centre.x,
        y: event.clientY - rect.top - centre.y,
      };
      latest.current.onCamera((current) =>
        frontZoomed(current, Math.exp(-event.deltaY * WHEEL), offset)
      );
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, []);

  const onPointerDown = (event) => {
    if (!(event.button === 1 || (event.button === 0 && event.shiftKey))) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setPanning({ x: event.clientX, y: event.clientY, pan: camera.pan });
  };
  const onPointerMove = (event) => {
    if (!panning) return;
    const pan = {
      x: panning.pan.x + event.clientX - panning.x,
      y: panning.pan.y + event.clientY - panning.y,
    };
    onCamera((current) => ({ ...current, pan }));
  };
  const onPointerUp = (event) => {
    if (!panning) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    setPanning(null);
  };
  const partAt = (event) => {
    const index = event.target.closest?.('[data-part]')?.getAttribute('data-part');
    return index == null ? null : openable[Number(index)];
  };
  const onClick = (event) => {
    if (event.shiftKey || event.button !== 0) return;
    onPick(partAt(event)?.ref || null);
  };
  const onDoubleClick = (event) => {
    if (event.shiftKey) return;
    const part = partAt(event);
    if (part?.ref) onOpen(part.ref);
  };

  return (
    <div ref={rootRef} className={styles.root}>
      <svg
        className={`${styles.svg} ${panning ? styles.panning : ''}`}
        style={panning ? { cursor: cursorStyle('grabbing') } : undefined}
        role="img"
        aria-label={planText('plan.front.label', { wall: own?.label || '' })}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
      >
        <FrontSvg shapes={shapes} chains={chains} openable={openable} />
      </svg>
      <WallLine label={own?.label || ''} {...position} onStep={onStep} />
      <FrontMap map={view.map} wall={own?.label || ''} rows={view.rows} onShow={onShow} lit={lit} />
    </div>
  );
}
