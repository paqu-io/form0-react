import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { collapsedPathParts } from './dialog-path-parts.js';
import * as styles from './dialog-path.css.js';

/**
 * A RepeatableSection dialog's header title (2026-11-22): the path to it, "Floors › Ground floor
 * › Rooms", the last part the title. When it doesn't fit between the header's buttons, its middle
 * collapses ("Floors › … › Rooms"), then all but the title ("… › Rooms"). A single part renders
 * as the title did before.
 * @param {{ parts: string[], className?: string }} props
 */
export function DialogPath({ parts, className = '' }) {
  const ref = useRef(null);
  // 0: the whole path; 1: its middle collapsed; 2: only the title, after an ellipsis.
  const [level, setLevel] = useState(0);
  const signature = parts.join('\u0000');

  // A new path, or a new width, starts whole; it collapses a step at a time while it overflows.
  useLayoutEffect(() => setLevel(0), [signature]);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || level >= 2 || parts.length <= 1) return;
    // The parts' own widths (they shrink with an ellipsis, so the box itself rarely overflows).
    const gap = parseFloat(getComputedStyle(node).columnGap) || 0;
    const children = [...node.children];
    const natural = children.reduce((sum, child) => sum + child.scrollWidth, 0);
    if (natural + gap * (children.length - 1) > node.clientWidth)
      setLevel(parts.length > 3 ? level + 1 : 2);
  });
  // The title's box takes the header's free width whatever it holds, so watching it (not the
  // path, which shrinks when it collapses) can't loop.
  const whole = parts.length > 1;
  useEffect(() => {
    const box = ref.current?.parentElement;
    if (!box || typeof ResizeObserver === 'undefined') return undefined;
    let width = box.clientWidth;
    const observer = new ResizeObserver(() => {
      if (box.clientWidth === width) return;
      width = box.clientWidth;
      setLevel(0);
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, [whole]);

  if (parts.length <= 1) return <span className={className}>{parts[0] || ''}</span>;
  const shown = level ? collapsedPathParts(parts, level) : parts;
  return (
    <span ref={ref} className={`${styles.path} ${className}`} title={parts.join(' › ')}>
      {shown.map((part, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <span className={styles.separator} aria-hidden="true">
              ›
            </span>
          )}
          <span className={index === shown.length - 1 ? styles.current : styles.ancestor}>
            {part ?? '…'}
          </span>
        </React.Fragment>
      ))}
    </span>
  );
}
