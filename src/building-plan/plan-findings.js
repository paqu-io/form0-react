/**
 * Validation findings on building plan rows, for the canvas (1e, M2). They are the root form's
 * findings, the Validation tab's list (shown after a Save attempt), as id paths from the floor.
 * A canvas shows those in its scope; a dialog drops the ones its draft has fixed since, because
 * its edits reach the root record only when the floor is saved.
 */

/**
 * @typedef {{ key: string, id: string }} RowRef
 * @typedef {{
 *   id: string,
 *   idPath: RowRef[],
 *   fieldName: string | null,
 *   label: string,
 *   names: string[],
 *   messages: string[],
 * }} PlanFinding
 */

const rowId = (row) => row?.id ?? row?.record_id;

/**
 * The findings that lie in a plan floor or below it.
 * @param {{ metadata: object[], record: object, issues: object[] }} input `issues` as
 *   `formatValidationIssues` gives them ({ id, fieldName, instancePath, label, recordPathLabel,
 *   messages, hidden })
 * @returns {PlanFinding[]}
 */
export function buildingPlanFindings({ metadata = [], record, issues = [] }) {
  const floorKeys = new Set(
    metadata.map((meta) => meta.repeatablesByNodeKey?.floors?.preferredKey).filter(Boolean)
  );
  const findings = [];
  for (const issue of issues || []) {
    if (!issue || issue.hidden) continue;
    const path = issue.instancePath || [];
    const located = locatePlanRow(record, path, floorKeys);
    if (!located) continue;
    const { idPath, floorDepth } = located;
    // The record path label has one title per row ("Ground Floor / Bedroom / W2").
    const titles = String(issue.recordPathLabel || '').split(' / ');
    findings.push({
      id: issue.id,
      idPath,
      fieldName: issue.fieldName || null,
      label: issue.label || '',
      names: titles.length === path.length ? titles.slice(floorDepth) : titles.slice(-1),
      messages: issue.messages || [],
    });
  }
  return findings;
}

/**
 * The plan row a validation finding names (its instance path, from the record's root): its id
 * path from the floor, the floor's depth in the instance path, and the floors that hold it.
 * @param {object} record
 * @param {Array<{ repeatableKey: string, instanceId?: string, identity: 'id' | 'index',
 *   index?: number }>} instancePath
 * @param {Set<string>} floorKeys the plans' floors keys
 * @returns {{ idPath: RowRef[], floorDepth: number, floors: object[] } | null}
 */
export function locatePlanRow(record, instancePath, floorKeys) {
  const floorDepth = instancePath.findIndex((part) => floorKeys.has(part.repeatableKey));
  if (floorDepth < 0) return null;
  let row = record;
  let floors = null;
  const idPath = [];
  for (const [depth, part] of instancePath.entries()) {
    const rows = row?.repeatable?.[part.repeatableKey] || [];
    if (depth === floorDepth) floors = rows;
    row =
      part.identity === 'id'
        ? rows.find((item) => rowId(item) === part.instanceId)
        : rows[part.index];
    if (!row) return null;
    if (depth >= floorDepth) idPath.push({ key: part.repeatableKey, id: rowId(row) });
  }
  return { idPath, floorDepth, floors };
}

/**
 * For a finding on the outside copy of a wall field (`finish_outside` next to `finish`: both
 * have the same label), the field state that says which face the copy is on, the exterior or
 * the room across, as the form tags it. Read through an editor of the plan, made once per plan
 * and only when such a finding comes. Other findings: null.
 * @param {{
 *   metadata: object[],
 *   record: object,
 *   createEditor: (meta: object, repeatable: object) => { fieldState: Function },
 * }} input `createEditor` gets the plan's metadata and `{ [floorsKey]: floors }`
 * @returns {(dataName: string, instancePath: object[]) => object | null}
 */
export function planSideStates({ metadata = [], record, createEditor }) {
  const plans = new Map();
  for (const meta of metadata)
    for (const node of meta.repeatables || [])
      for (const field of node.fields || [])
        if (field.binding?.outside) plans.set(field.dataName, meta);
  if (!plans.size) return () => null;
  const editors = new Map();
  return (dataName, instancePath = []) => {
    const meta = plans.get(dataName);
    const floorsKey = meta?.repeatablesByNodeKey?.floors?.preferredKey;
    const located = floorsKey && locatePlanRow(record, instancePath, new Set([floorsKey]));
    if (!located) return null;
    try {
      if (!editors.has(located.floors))
        editors.set(located.floors, createEditor(meta, { [floorsKey]: located.floors }));
      return editors.get(located.floors).fieldState(located.idPath, dataName) || null;
    } catch {
      return null;
    }
  };
}

/**
 * The findings at or below `scopePath` (an id path from the floor).
 * @param {PlanFinding[]} findings
 * @param {RowRef[]} scopePath
 */
export function findingsInScope(findings, scopePath) {
  return findings.filter(
    (finding) =>
      scopePath.length <= finding.idPath.length &&
      scopePath.every(
        (part, index) =>
          part.key === finding.idPath[index].key && part.id === finding.idPath[index].id
      )
  );
}

const isBlank = (value) =>
  value == null ||
  value === '' ||
  (Array.isArray(value) && value.length === 0) ||
  (typeof value === 'object' &&
    !Array.isArray(value) &&
    Array.isArray(value.choice) &&
    value.choice.length === 0 &&
    !(value.other || []).length);

/**
 * Whether a dialog's draft has fixed the finding since the root validated it: its row is gone,
 * or the row's evaluated state (`editor.evaluate` writes `required` and `errors` on each row)
 * shows the field without error and, if required, filled. No evaluated state yet: not fixed.
 * @param {PlanFinding} finding
 * @param {object} repeatable the draft record's `repeatable`, from the floors down
 */
export function isFindingFixed(finding, repeatable) {
  let rows = repeatable;
  let row = null;
  for (const part of finding.idPath) {
    row = (rows?.[part.key] || []).find((item) => rowId(item) === part.id);
    if (!row) return true;
    rows = row.repeatable;
  }
  const field = finding.fieldName;
  if (!field || !row.required) return false;
  if (row.errors?.[field]) return false;
  return !(row.required[field] && isBlank(row.values?.[field]));
}

/**
 * What a canvas shows of its findings: a list item per finding, named by the rows below the
 * scope, innermost first ("Window 1 · W1"), and the rows to mark (one per row, as index paths;
 * the canvas finds their elements, a floor has none).
 * @param {PlanFinding[]} findings
 * @param {{ scopeDepth?: number, repeatable: object }} options `repeatable` is the record the
 *   canvas shows, from the floors down; a row it no longer has is dropped
 */
export function planIssueView(findings, { scopeDepth = 0, repeatable }) {
  const items = [];
  const markers = new Map();
  for (const finding of findings) {
    const indexPath = indexPathOf(repeatable, finding.idPath);
    if (!indexPath) continue;
    const below = finding.names.slice(Math.min(scopeDepth, finding.names.length - 1));
    items.push({
      key: finding.id,
      title: [...below].reverse().join(' · '),
      detail: [finding.label, finding.messages.join(' ')].filter(Boolean).join(': '),
      indexPath,
    });
    markers.set(JSON.stringify(indexPath), indexPath);
  }
  return { items, markers: [...markers.values()] };
}

/**
 * The index path of a row, as canvas entries and `focusRow` use it, from its id path.
 * @param {object} repeatable the record's `repeatable`, from the floors down
 * @param {RowRef[]} idPath
 */
export function indexPathOf(repeatable, idPath) {
  let rows = repeatable;
  const indexPath = [];
  for (const part of idPath) {
    const list = rows?.[part.key] || [];
    const index = list.findIndex((item) => rowId(item) === part.id);
    if (index < 0) return null;
    indexPath.push({ key: part.key, index });
    rows = list[index].repeatable;
  }
  return indexPath;
}
