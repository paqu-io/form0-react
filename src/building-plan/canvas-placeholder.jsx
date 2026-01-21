import React from 'react';
import * as styles from '../form-renderer.css.js';

/**
 * Temporary placeholder until the full canvas is wired.
 * Shows capability flags so we can verify controller wiring
 * without breaking existing layouts.
 */
export function BuildingPlanCanvasPlaceholder({ toolbarState, scope }) {
  return (
    <div className={styles.section} style={{ minHeight: 200, border: '1px dashed #ccc' }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Building Plan Canvas (placeholder)</div>
      <div style={{ fontSize: 12, lineHeight: 1.6 }}>
        <div>Scope: floorId={scope?.floorId || '—'} · roomId={scope?.roomId || '—'}</div>
        <div>Toolbar:</div>
        <ul style={{ marginTop: 4, paddingLeft: 16 }}>
          {Object.entries(toolbarState || {}).map(([key, value]) => (
            <li key={key}>
              {key}: <strong>{value ? 'enabled' : 'disabled'}</strong>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
