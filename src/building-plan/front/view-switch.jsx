import React from 'react';
import { planText } from '../plan-text.js';
import * as styles from './front-view.css.js';

/**
 * Plan | Front in the floor row (A2, decided 2026-11-26): always there, disabled where there is
 * no wall to show (its tooltip says where it works), so nothing appears or disappears.
 * @param {{ available: boolean, front: boolean, onChange: (front: boolean) => void }} props
 */
export function ViewSwitch({ available, front, onChange }) {
  return (
    <div
      className={styles.viewSwitch}
      role="group"
      aria-label={planText('plan.view.label')}
      data-tooltip={available ? undefined : planText('plan.view.frontUnavailable')}
    >
      <button
        type="button"
        className={styles.viewButton}
        aria-pressed={!front}
        disabled={!available}
        onClick={() => onChange(false)}
      >
        {planText('plan.view.plan')}
      </button>
      <button
        type="button"
        className={styles.viewButton}
        aria-pressed={front}
        disabled={!available}
        data-tooltip={planText('plan.view.frontHint')}
        onClick={() => onChange(true)}
      >
        {planText('plan.view.front')}
      </button>
    </div>
  );
}
