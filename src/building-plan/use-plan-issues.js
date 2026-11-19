import { useMemo } from 'react';
import { usePlanFindings } from './plan-findings-context.jsx';
import { findingsInScope, isFindingFixed, planIssueView } from './plan-findings.js';

const NONE = Object.freeze({ items: [], markers: [] });

/**
 * The validation findings a plan canvas shows (1e, M2): the root form's findings in its scope,
 * minus those a dialog's draft has fixed since, as list items and rows to mark.
 * @param {{
 *   scopePath: Array<{ key: string, id: string }> | null,
 *   repeatable: object,
 *   draft: boolean,
 * }} input `scopePath`: the floor shown (plan page), the floor or room of an entry; `repeatable`:
 *   the record the canvas shows; `draft`: a dialog's, whose edits the root hasn't validated yet
 */
export function usePlanIssues({ scopePath, repeatable, draft }) {
  const findings = usePlanFindings();
  const scopeKey = JSON.stringify(scopePath || null);
  return useMemo(() => {
    if (!findings.length || !scopePath) return NONE;
    const shown = findingsInScope(findings, scopePath).filter(
      (finding) => !(draft && isFindingFixed(finding, repeatable))
    );
    if (!shown.length) return NONE;
    return planIssueView(shown, { scopeDepth: scopePath.length, repeatable });
    // scopePath is compared by value (scopeKey).
  }, [findings, scopeKey, repeatable, draft]);
}
