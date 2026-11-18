import React, { useMemo } from 'react';
import { useBuildingPlanController } from './controller.js';
import { BuildingPlanCanvasHost } from './canvas-host.jsx';
import * as styles from '../form-renderer.css.js';
import {
  RepeatableCount,
  RepeatableEmptyState,
  RepeatableEntryRows,
} from '../repeatable-list-parts.jsx';

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
  readOnly = false,
  derivedCommands = false,
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
            readOnly={readOnly}
            derivedCommands={derivedCommands}
          />

          <div className={styles.repeatableList}>
            <div className={styles.repeatableListHeader}>
              {!readOnly && (
                <button
                  type="button"
                  className={styles.formNameActionButton}
                  onClick={repeatableApi.addFloor}
                >
                  Add
                </button>
              )}
              <div className={styles.repeatableListHeaderText}>
                <h3 className={styles.repeatableListTitle}>
                  {controller?.floorField?.label || 'Floors'}{' '}
                  <RepeatableCount count={controller?.floors?.length || 0} />
                </h3>
                <p className={styles.repeatableListDescription}>
                  {controller?.floorField?.description ||
                    'Each floor created from the canvas is stored here.'}
                </p>
              </div>
            </div>
            {(controller?.floors?.length || 0) === 0 ? (
              <RepeatableEmptyState readOnly={readOnly} onAdd={repeatableApi.addFloor} />
            ) : (
              <RepeatableEntryRows
                label={controller?.floorField?.label || 'Floors'}
                entries={controller.floors.map((floor, idx) => ({
                  id: floor.id,
                  // Unnamed floors fall back to the title any entry gets ("Floors 1").
                  title: floor.label || `${controller?.floorField?.label || 'Floors'} ${idx + 1}`,
                }))}
                readOnly={readOnly}
                onOpen={(id) => controller.onViewFloor?.(id)}
                onRemove={(id) => controller.onRemoveFloor?.(id)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
