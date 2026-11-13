/**
 * Opens a row in the BuildingPlan editor. The editor opens the row's scope and then publishes; if
 * a subscriber throws, the scope would stay open and its parent could neither save nor cancel
 * ("Save or cancel the child editor"). The scope is cancelled before the error propagates.
 * @param {{ openRow: Function, hasEditor: (scopeId: string) => boolean, cancelRow: Function }} editor
 * @param {{ path: object[], scopeId: string, parentScopeId: string | null, row: object }} request
 * @returns {ReturnType<typeof editor.openRow>}
 */
export function openBuildingPlanEditorRow(editor, request) {
  try {
    return editor.openRow(request);
  } catch (error) {
    if (editor.hasEditor(request.scopeId)) editor.cancelRow(request.scopeId);
    throw error;
  }
}
