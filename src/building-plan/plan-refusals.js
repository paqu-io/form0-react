import { planText } from './plan-text.js';

/**
 * Typed values core refused (decided 2026-11-25, after the bands 4a hand test): a value the plan
 * can't take (a band's underside above its wall) stayed in its field with no mark, its message
 * only in the canvas status line, and Save did nothing visible. Now it is the field's error at
 * once, like the engine's, and once Save was tried a Validation finding (a click focuses the
 * field); Save stops while it is there. Core names the fields (`refusedFields`); a refusal it
 * can't tie to a field is listed under "Plan" (key '').
 */

export const NO_PLAN_REFUSALS = Object.freeze({});

/**
 * The refusals a plan completion leaves: by field on a refusal; none once the row applied or is
 * back to its values; unchanged otherwise (a draft being typed, a value the form rejects itself).
 * @param {Record<string, string[]>} current
 * @param {{ status: string, issues?: object[], refusedFields?: object[] } | null} result
 */
export function nextPlanRefusals(current, result) {
  if (!result) return current;
  if (['applied', 'unchanged'].includes(result.status)) return NO_PLAN_REFUSALS;
  if (result.status !== 'conflict') return current;
  const messages = (issues = []) => issues.map((issue) => issue.message).filter(Boolean);
  const fields = result.refusedFields || [];
  if (!fields.length) return { '': messages(result.issues) };
  return Object.fromEntries(fields.map(({ dataName, issues }) => [dataName, messages(issues)]));
}

/** The entry's field errors with the refused fields' messages in front of their own. */
export function withPlanRefusals(errors, refusals) {
  const names = Object.keys(refusals).filter(Boolean);
  if (!names.length) return errors;
  const merged = { ...(errors || {}) };
  for (const name of names) merged[name] = refusals[name].join(' ');
  return merged;
}

/**
 * The Validation panel's items for the refusals, in the shape of the form's own
 * (`formatValidationIssues`): the field's label as the plan presents it, its section to open.
 * @param {Record<string, string[]>} refusals
 * @param {{
 *   fieldLookup?: { byDataName?: Map<string, object> },
 *   presentField?: (field: object) => { label?: string } | null,
 *   fieldToSectionPath?: Record<string, string[]>,
 * }} form
 */
export function planRefusalIssues(refusals, { fieldLookup, presentField, fieldToSectionPath }) {
  return Object.entries(refusals).map(([dataName, messages]) => {
    const field = dataName ? fieldLookup?.byDataName?.get(dataName) : null;
    return {
      id: `plan-refusal:${dataName}`,
      fieldName: dataName || null,
      hidden: false,
      instancePath: [],
      label: dataName
        ? (field && presentField?.(field)?.label) || field?.label || dataName
        : planText('plan.problem.tag'),
      planField: true,
      sectionPath: (dataName && fieldToSectionPath?.[dataName]) || [],
      messages,
    };
  });
}
