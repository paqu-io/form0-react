import React, { useMemo } from 'react';
import { useBuildingPlanController } from './controller.js';
import { BuildingPlanCanvasHost } from './canvas-host.jsx';
import * as styles from '../form-renderer.css.js';
import { ChevronRight, Trash2 } from 'lucide-react';

/**
 * Parent-level BuildingPlanSection renderer (standard page view).
 * For now it renders a placeholder canvas while we wire the full canvas.
 */
export function BuildingPlanSectionView({
  section,
  buildingPlanMeta,
  repeatableState,
  repeatableApi,
  mode = 'parent',
  onViewFloor,
  onRemoveFloor,
}) {
  const dataName = section?.data_name || null;

  const controller = useBuildingPlanController({
    sectionDataName: dataName,
    buildingPlanMeta,
    repeatableState,
    mode,
    scope: { floorId: null, roomId: null },
    onViewFloor,
    onRemoveFloor,
  });

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '8px',
  };

  return (
    <div className={styles.section} data-type="building-plan-section">
      <div style={headerStyle}>
        <div className={styles.sectionHeader}>{section?.label || 'Building Plan'}</div>
      </div>

      <div style={{ padding: 0 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(320px, 1fr) minmax(280px, 360px)',
            gap: '16px',
          }}
        >
          <BuildingPlanCanvasHost
            section={section}
            buildingPlanMeta={buildingPlanMeta}
            repeatableState={repeatableState}
            repeatableApi={repeatableApi}
            mode={mode}
            toolbarState={controller?.toolbarState || {}}
            scope={controller?.scope || {}}
          />

          <div className={styles.repeatableList}>
            <div className={styles.repeatableListHeader}>
              <div className={styles.repeatableListHeaderText}>
                <h3 className={styles.repeatableListTitle}>
                  {controller?.floorField?.label || 'Floors'}
                </h3>
                <p className={styles.repeatableListDescription}>
                  {controller?.floorField?.description ||
                    'Each floor created from the canvas is stored here.'}
                </p>
              </div>
            </div>
            <div className={styles.repeatableEntryList}>
              {(controller?.floors?.length || 0) === 0 ? (
                <div className={styles.repeatableEmptyState}>No entries yet.</div>
              ) : (
                controller.floors.map((floor, idx) => (
                  <div key={floor.id} className={styles.repeatableEntryRow}>
                    <div className={styles.repeatableEntryInfo}>
                      <div className={styles.repeatableEntryTitle}>
                        {floor.label || `Floor #${idx + 1}`}
                      </div>
                    </div>
                    <div className={styles.repeatableEntryActions}>
                      <button
                        type="button"
                        className={styles.formNameActionButton}
                        onClick={() => controller.onViewFloor?.(floor.id)}
                      >
                        <span>View</span>
                        <span className={styles.formNameActionIcon} aria-hidden="true">
                          <ChevronRight size={14} strokeWidth={1.8} />
                        </span>
                      </button>
                      <button
                        type="button"
                        className={`${styles.formNameActionButton} ${styles.repeatableDangerButton}`}
                        onClick={() => controller.onRemoveFloor?.(floor.id)}
                      >
                        <span className={styles.formNameActionIcon} aria-hidden="true">
                          <Trash2 size={14} strokeWidth={1.8} />
                        </span>
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
