import React, { createContext, useContext } from 'react';

const NONE = Object.freeze([]);
const PlanFindingsContext = createContext(NONE);

/**
 * The root form's validation findings on building plan rows (`plan-findings.js`), for every plan
 * canvas below it: the plan page's and the entry dialogs'. Empty until a Save attempt.
 * @param {{ findings: import('./plan-findings.js').PlanFinding[], children: React.ReactNode }} props
 */
export function PlanFindingsProvider({ findings, children }) {
  return (
    <PlanFindingsContext.Provider value={findings || NONE}>{children}</PlanFindingsContext.Provider>
  );
}

export const usePlanFindings = () => useContext(PlanFindingsContext);
