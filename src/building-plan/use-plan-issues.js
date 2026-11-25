import { useCallback, useMemo, useState } from 'react';
import { usePlanFindings } from './plan-findings-context.jsx';
import { findingsInScope, indexPathOf, isFindingFixed, planIssueView } from './plan-findings.js';
import { planProblemView } from './plan-problems.js';
import { pickMetaEntry } from './canvas-adapters.js';

const NONE = Object.freeze({ items: [], markers: [] });
const NO_PROBLEMS = Object.freeze([]);

/**
 * What a plan canvas lists in its "n issues" and marks on its elements: the plan's problems to
 * fix before saving (bands 4a), live from the canvas snapshot and listed first, then the root
 * form's validation findings in its scope (1e, M2), minus those a dialog's draft has fixed since.
 * @param {{
 *   findingScope: Array<{ key: string, id: string }> | null,
 *   buildingPlanMeta: object[],
 *   section: object,
 *   floorTabs: { tabs: Array<{ active: boolean, rowId: string | null }> },
 *   repeatable: object,
 *   draft: boolean,
 * }} input `findingScope`: an entry's floor or room (without it, the floor shown); `repeatable`:
 *   the record the canvas shows; `draft`: a dialog's, whose edits the root hasn't validated yet
 * @returns {{ items: object[], markers: object[], reportProblems: (problems: object[]) => void }}
 *   `reportProblems` takes the canvas snapshot's problems on each update
 */
export function usePlanIssues({
  findingScope,
  buildingPlanMeta,
  section,
  floorTabs,
  repeatable,
  draft,
}) {
  const findings = usePlanFindings();
  const [problems, setProblems] = useState(NO_PROBLEMS);
  // A list equal to the last keeps it, so a canvas update that changes none redraws nothing.
  const reportProblems = useCallback(
    (next = NO_PROBLEMS) =>
      setProblems((current) => (JSON.stringify(current) === JSON.stringify(next) ? current : next)),
    []
  );
  const floorsKey = useMemo(
    () =>
      pickMetaEntry(buildingPlanMeta, section?.data_name)?.repeatablesByNodeKey?.floors
        ?.preferredKey || null,
    [buildingPlanMeta, section]
  );
  const shownFloor = floorTabs.tabs.find((tab) => tab.active);
  const scopePath =
    findingScope ||
    (floorsKey && shownFloor?.rowId ? [{ key: floorsKey, id: shownFloor.rowId }] : null);
  const scopeKey = JSON.stringify(scopePath);
  const view = useMemo(() => {
    if (!scopePath) return NONE;
    const shown = findingsInScope(findings, scopePath).filter(
      (finding) => !(draft && isFindingFixed(finding, repeatable))
    );
    const found = shown.length
      ? planIssueView(shown, { scopeDepth: scopePath.length, repeatable })
      : NONE;
    const plan = planProblemView(problems, indexPathOf(repeatable, scopePath));
    if (!plan.items.length) return found;
    const markers = new Map(
      [...plan.markers, ...found.markers].map((path) => [JSON.stringify(path), path])
    );
    return { items: [...plan.items, ...found.items], markers: [...markers.values()] };
    // scopePath is compared by value (scopeKey).
  }, [findings, scopeKey, repeatable, draft, problems]);
  return useMemo(() => ({ ...view, reportProblems }), [view, reportProblems]);
}
