import { useEffect, useRef } from 'react';

/**
 * A dialog's turn when a part of a header path is pressed (2026-11-22): the dialogs above the
 * part's level close one at a time, each as its Cancel would (asking when it has changes); the
 * dialog at that level then shows the list asked for, or its own page.
 * @param {{
 *   stepUp: { id: number, to: number, list: string | null } | null,
 *   isTop: boolean,
 *   index: number,
 *   close: () => void,
 *   land: (list: string | null) => void,
 * }} options `index` is the dialog's place in the stack; each dialog acts once per press
 */
export function useDialogStepUp({ stepUp, isTop, index, close, land }) {
  const handled = useRef(null);
  const actions = useRef({ close, land });
  actions.current = { close, land };
  useEffect(() => {
    if (!stepUp || !isTop || handled.current === stepUp.id) return;
    handled.current = stepUp.id;
    if (stepUp.to === index) actions.current.land(stepUp.list);
    else if (stepUp.to < index) actions.current.close();
  }, [stepUp, isTop, index]);
}
