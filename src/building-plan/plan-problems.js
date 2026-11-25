import { getBuildingPlanProblems } from 'form0-core';
import { planText } from './plan-text.js';

/**
 * Problems to fix in the plan before saving its floor (bands unit 4a, 2026-11-25): an opening and
 * a band reaching into each other, bands overlapping, a band beyond its wall. Core lists them
 * (`getBuildingPlanProblems`, and the canvas snapshot's `problems`), each with the rows that
 * show it; no edit is refused for them. Every plan canvas marks them live and lists them first
 * in its "n issues"; the floor entry lists them first in its Validation panel, and its Save waits
 * until none is left (room and wall entries save, so a problem can be fixed across entries).
 *
 * @typedef {{
 *   id: string,
 *   code: string,
 *   message: string,
 *   wallName: string,
 *   elements: Array<{ type: string, id: string, name: string }>,
 *   paths?: Array<Array<{ key: string, index: number }>>,
 *   markPaths?: Array<Array<{ key: string, index: number }>>,
 * }} PlanProblem
 */

/** "Window 1 and Lintel band · Plan": both elements, then the tag. */
export function planProblemLabel(problem) {
  const names = problem.elements.map((element) => element.name);
  const named =
    names.length === 2
      ? planText('plan.problem.pair', { first: names[0], second: names[1] })
      : names[0];
  return `${named} · ${planText('plan.problem.tag')}`;
}

/**
 * The problems of a floor entry's floor, read from its editor (after the entry's own values are
 * applied, so Save sees what it saves). Other entries: none.
 * @param {object | null} context the entry's plan context (`buildingPlanModalContext`)
 * @returns {PlanProblem[]}
 */
export function floorPlanProblems(context) {
  const editor = context?.repeatableApi?.editor;
  if (context?.mode !== 'floor-modal' || !editor || !context.scope?.floorId) return [];
  try {
    return getBuildingPlanProblems(editor.getSnapshot(), context.scope.floorId, {
      meta: context.metaEntry,
      record: editor.getRecord(),
    });
  } catch {
    return [];
  }
}

/**
 * The floor entry's Validation panel items for its problems, in the shape of the form's own
 * (`formatValidationIssues`); `planProblem` lets a click select it on the canvas.
 * @param {PlanProblem[]} problems
 */
export function planProblemIssues(problems) {
  return problems.map((problem) => ({
    id: `plan-problem:${problem.id}`,
    fieldName: null,
    hidden: false,
    instancePath: [],
    label: planProblemLabel(problem),
    recordPathLabel: problem.wallName,
    planField: true,
    sectionPath: [],
    messages: [problem.message],
    planProblem: problem,
  }));
}

const startsWith = (path, prefix) =>
  prefix.every((part, index) => path[index]?.key === part.key && path[index]?.index === part.index);

/**
 * A canvas's "n issues" items and markers for the problems in its scope: those with a row under
 * it; an item selects the first (a band, D1c), the markers stand on its `markPaths` (where an
 * opening runs into it; else the band).
 * @param {PlanProblem[]} problems the canvas snapshot's
 * @param {Array<{ key: string, index: number }> | null} scope the index path of the entry's floor
 *   or room (the plan page: its floor)
 */
export function planProblemView(problems, scope) {
  const items = [];
  const markers = [];
  if (!scope) return { items, markers };
  for (const problem of problems) {
    const paths = (problem.paths || []).filter((path) => startsWith(path, scope));
    if (!paths.length) continue;
    items.push({
      key: `plan-problem:${problem.id}`,
      title: planProblemLabel(problem),
      detail: [problem.wallName, problem.message].filter(Boolean).join(': '),
      indexPath: paths[0],
      fieldName: null,
    });
    const marks = (problem.markPaths || problem.paths).filter((path) => startsWith(path, scope));
    markers.push(...marks);
  }
  return { items, markers };
}
