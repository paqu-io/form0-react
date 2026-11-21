import React, { useEffect, useState } from 'react';
import { isMacPlatform, shortcutKeys } from './plan-shortcuts.js';
import * as styles from './plan-tooltip.css.js';

const SHOW_DELAY_MS = 300;
// A click focuses the button too; the tooltip it would show then is noise.
const POINTER_FOCUS_GRACE_MS = 600;
const GAP = 8;

/**
 * One themed tooltip for the plan. Delegated on the host, it serves every element inside it
 * with `data-tooltip` (and optionally `data-shortcut`, "Alt+Shift+D"), including the DOM the
 * legacy canvas builds. The bubble is decorative (aria-hidden): buttons keep their accessible
 * name and `aria-keyshortcuts`. Things the canvas draws (a pinned wall's badge) have no element:
 * the canvas sends a bubbling `plan-tooltip` event with `{ text, box }` (client coordinates)
 * while the pointer is on one, and with no detail when it leaves.
 * @param {{ hostRef: { current: HTMLElement | null } }} props
 */
export function PlanTooltip({ hostRef }) {
  const [tip, setTip] = useState(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const mac = isMacPlatform();
    let timer = null;
    let current = null;
    let lastPointerDown = 0;

    const hide = () => {
      clearTimeout(timer);
      timer = null;
      current = null;
      setTip(null);
    };
    const place = (text, keys, box) => {
      const hostBox = host.getBoundingClientRect();
      const centreX = box.left + box.width / 2 - hostBox.left;
      // Targets on the right half (the zoom pill) open to the left, the others to the right.
      const toLeft = centreX > hostBox.width / 2;
      setTip({
        text,
        keys,
        top: box.top - hostBox.top + box.height / 2,
        left: toLeft ? box.left - hostBox.left - GAP : box.right - hostBox.left + GAP,
        toLeft,
      });
    };
    const show = (target) => {
      if (target === current) return;
      clearTimeout(timer);
      current = target;
      timer = setTimeout(() => {
        if (!target.isConnected || !target.dataset.tooltip) return;
        const keys = shortcutKeys(target.dataset.shortcut || '', mac);
        place(target.dataset.tooltip, keys, target.getBoundingClientRect());
      }, SHOW_DELAY_MS);
    };
    const onCanvasTip = (event) => {
      const detail = event.detail;
      if (!detail) {
        if (current?.drawn) hide();
        return;
      }
      clearTimeout(timer);
      current = { drawn: true };
      timer = setTimeout(() => place(detail.text, [], detail.box), SHOW_DELAY_MS);
    };
    const targetOf = (event) => {
      const element = event.target?.closest?.('[data-tooltip]');
      return element && host.contains(element) ? element : null;
    };
    const onOver = (event) => {
      const target = targetOf(event);
      if (target) show(target);
      else if (current) hide();
    };
    const onOut = (event) => {
      if (current && !current.drawn && !current.contains(event.relatedTarget)) hide();
    };
    const onFocusIn = (event) => {
      if (Date.now() - lastPointerDown < POINTER_FOCUS_GRACE_MS) return;
      const target = targetOf(event);
      if (target) show(target);
    };
    const onPointerDown = () => {
      lastPointerDown = Date.now();
      hide();
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && current) hide();
    };

    host.addEventListener('pointerover', onOver);
    host.addEventListener('pointerout', onOut);
    host.addEventListener('focusin', onFocusIn);
    host.addEventListener('focusout', hide);
    host.addEventListener('pointerdown', onPointerDown);
    host.addEventListener('keydown', onKeyDown);
    host.addEventListener('plan-tooltip', onCanvasTip);
    return () => {
      clearTimeout(timer);
      host.removeEventListener('pointerover', onOver);
      host.removeEventListener('pointerout', onOut);
      host.removeEventListener('focusin', onFocusIn);
      host.removeEventListener('focusout', hide);
      host.removeEventListener('pointerdown', onPointerDown);
      host.removeEventListener('keydown', onKeyDown);
      host.removeEventListener('plan-tooltip', onCanvasTip);
    };
  }, [hostRef]);

  if (!tip) return null;
  return (
    <div
      className={styles.bubble}
      aria-hidden="true"
      data-plan-tooltip=""
      style={{
        top: tip.top,
        left: tip.left,
        transform: `translate(${tip.toLeft ? '-100%' : '0'}, -50%)`,
      }}
    >
      <span>{tip.text}</span>
      {tip.keys.length > 0 && (
        <span className={styles.keys}>
          {tip.keys.map((key, index) => (
            <kbd key={index}>{key}</kbd>
          ))}
        </span>
      )}
    </div>
  );
}
