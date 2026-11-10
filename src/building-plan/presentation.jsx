import React, { createContext, useContext, useMemo } from 'react';
import { createBuildingPlanPresentation, expandBuildingPlanSchema } from 'form0-core';

const PresentationContext = createContext(createBuildingPlanPresentation());

/** Locale updates repaint controls without changing any engine/session inputs. */
export function BuildingPlanPresentationProvider({ schema, locale = 'en', children }) {
  const metadata = useMemo(() => expandBuildingPlanSchema(schema).buildingPlanMeta, [schema]);
  const measurementSystem = schema?.form?.measurement_system || 'si';
  const presentation = useMemo(
    () => createBuildingPlanPresentation({ metadata, measurementSystem, locale }),
    [metadata, measurementSystem, locale]
  );
  return (
    <PresentationContext.Provider value={presentation}>{children}</PresentationContext.Provider>
  );
}

export const useBuildingPlanPresentation = () => useContext(PresentationContext);

export function BuildingPlanFieldLabel({ field }) {
  return <>{useBuildingPlanPresentation().field(field).label}</>;
}
