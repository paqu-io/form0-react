import { useEffect } from 'react';

/**
 * Keeps keyboard focus inside `containerRef` while `active`: Tab and Shift+Tab cycle through its
 * focusable elements, and focus that lands outside is brought back. `initialFocusRef` gets the
 * focus first (the safe choice of a confirmation, usually Cancel).
 */
export function useFocusTrap(active = false, containerRef, { initialFocusRef } = {}) {
  useEffect(() => {
    if (!active || typeof document === 'undefined') {
      return undefined;
    }
    const container = containerRef?.current;
    if (!container) {
      return undefined;
    }

    const redirectingRef = { current: false };

    const focusElement = (node) => {
      if (!node || typeof node.focus !== 'function') {
        return;
      }
      if (redirectingRef.current) {
        return;
      }
      redirectingRef.current = true;
      try {
        node.focus({ preventScroll: true });
      } catch {
        node.focus();
      }
      setTimeout(() => {
        redirectingRef.current = false;
      }, 0);
    };

    const getFocusableElements = () => {
      if (!containerRef.current) {
        return [];
      }
      const selectors = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ];
      return Array.from(containerRef.current.querySelectorAll(selectors.join(','))).filter((el) => {
        if (el.hasAttribute('disabled')) {
          return false;
        }
        if (el.getAttribute('tabindex') === '-1') {
          return false;
        }
        const rects = el.getClientRects();
        return rects.length > 0 || el.offsetParent !== null;
      });
    };

    const focusFirstElement = () => {
      const focusable = getFocusableElements();
      const target =
        (initialFocusRef && initialFocusRef.current) || focusable[0] || containerRef.current;
      focusElement(target);
    };

    const handleKeyDown = (event) => {
      if (event.key !== 'Tab') {
        return;
      }
      const focusable = getFocusableElements();
      const activeElement = document.activeElement;
      if (focusable.length === 0) {
        event.preventDefault();
        focusElement(containerRef.current);
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const isInside = containerRef.current.contains(activeElement);

      if (event.shiftKey) {
        if (!isInside || activeElement === first) {
          event.preventDefault();
          focusElement(last);
        }
        return;
      }

      if (!isInside || activeElement === last) {
        event.preventDefault();
        focusElement(first);
      }
    };

    const handleFocusIn = (event) => {
      if (!containerRef.current) {
        return;
      }
      if (redirectingRef.current) {
        return;
      }
      if (!containerRef.current.contains(event.target)) {
        focusFirstElement();
      }
    };

    focusFirstElement();
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('focusin', handleFocusIn, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('focusin', handleFocusIn, true);
    };
  }, [active, containerRef, initialFocusRef]);
}
