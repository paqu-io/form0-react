// Shared pieces of the choice dropdown: the "Other" value, the markers the form's keyboard
// shortcuts look for, where the panel opens, and the "+n" summary of multiple choice.
import { useLayoutEffect, useState } from 'react';

export const OTHER_VALUE = '__other__';
export const DROPDOWN_ATTRIBUTE = 'data-form0-dropdown';
export const OPEN_ATTRIBUTE = 'data-form0-dropdown-open';

const PANEL_HEIGHT = 320;
// The "+n" pill and the gap before it.
const MORE_WIDTH = 40;

/**
 * Whether a key event comes from an open dropdown: the form's global shortcuts (Escape, Alt+…)
 * leave those events to it.
 * @param {Event} event
 */
export function isOpenDropdownEvent(event) {
  return Boolean(event?.target?.closest?.(`[${OPEN_ATTRIBUTE}]`));
}

/** Whether a key event comes from a dropdown, open or not. */
export function isDropdownEvent(event) {
  return Boolean(event?.target?.closest?.(`[${DROPDOWN_ATTRIBUTE}]`));
}

// The nearest ancestor that clips or scrolls, whose edges limit the panel.
function clippingRect(element) {
  let node = element?.parentElement;
  while (node && node !== document.body) {
    const { overflowY } = window.getComputedStyle(node);
    if (/(auto|scroll|hidden)/.test(overflowY)) return node.getBoundingClientRect();
    node = node.parentElement;
  }
  return { top: 0, bottom: window.innerHeight };
}

/**
 * Below the field, or above it when there is less room below and more above (within the
 * viewport and the nearest scrolling or clipping container).
 * @param {Element | null} element
 * @returns {'top' | 'bottom'}
 */
export function placementFor(element) {
  if (!element || typeof window === 'undefined') return 'bottom';
  const rect = element.getBoundingClientRect();
  const bounds = clippingRect(element);
  const below = Math.min(window.innerHeight, bounds.bottom) - rect.bottom;
  const above = rect.top - Math.max(0, bounds.top);
  return below < PANEL_HEIGHT && above > below ? 'top' : 'bottom';
}

/**
 * How many of the chosen labels fit in the field before "+n", measured with a hidden span of
 * the same font; at least one. Without layout (jsdom) all of them.
 * @param {string[]} labels
 * @param {{ current: HTMLElement | null }} areaRef the space for labels and "+n"
 * @param {{ current: HTMLElement | null }} measureRef
 */
export function useFittingCount(labels, areaRef, measureRef) {
  const [count, setCount] = useState(labels.length);
  const key = labels.join('\n');
  useLayoutEffect(() => {
    const area = areaRef.current;
    const measure = measureRef.current;
    if (!area || !measure) return undefined;
    const fit = () => {
      const width = area.clientWidth;
      if (!width || labels.length < 2) {
        setCount(labels.length);
        return;
      }
      let fitting = 1;
      for (let i = 2; i <= labels.length; i += 1) {
        measure.textContent = labels.slice(0, i).join(', ');
        const room = width - (i < labels.length ? MORE_WIDTH : 0);
        if (measure.offsetWidth > room) break;
        fitting = i;
      }
      setCount(fitting);
    };
    fit();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(fit);
    observer.observe(area);
    return () => observer.disconnect();
    // The labels are compared through their joined key.
  }, [key, areaRef, measureRef]);
  return Math.min(count, labels.length);
}
