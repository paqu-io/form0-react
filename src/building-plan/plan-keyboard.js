/**
 * Which open plan takes the keyboard. Plan shortcuts (undo, redo, the rail, Esc for a tool or a
 * refusal) listen on `window`, once per open plan, so the Floor entry under a Rooms entry
 * reacted too (found 2026-11-21). Now only the plan of the top dialog acts: plans claim the
 * keyboard as their host mounts, and an entry opens over the entry or page it came from, so the
 * last one mounted and still open is the top one.
 */
import { useEffect } from 'react';

const hosts = [];

/**
 * Claims the keyboard for the plan host in `hostRef` while it is mounted.
 * @param {{ current: HTMLElement | null }} hostRef
 */
export function usePlanKeyboard(hostRef) {
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    hosts.push(host);
    return () => {
      const index = hosts.lastIndexOf(host);
      if (index >= 0) hosts.splice(index, 1);
    };
  }, [hostRef]);
}

/**
 * Whether the plan holding `element` (its canvas, its rail) takes the keyboard: it is the top
 * one, or it never claimed (a canvas without a host, as in tests).
 * @param {Element | null | undefined} element
 * @returns {boolean}
 */
export function ownsPlanKeyboard(element) {
  if (!element) return true;
  const host = hosts.find((entry) => entry.contains(element));
  return !host || host === hosts.at(-1);
}
