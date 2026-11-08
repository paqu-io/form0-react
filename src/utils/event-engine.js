import { completeEventOperations, copyEventData } from './managed-events.js';

/** Capture one engine lifetime, never following a replacement engine through a ref. */
export function createEventEngineBinding({
  getEngine,
  getScope,
  getOptions,
  applyDefault,
  reduceState = (state) => state,
  ownedNames,
  endScope,
}) {
  const engine = getEngine();
  const scope = getScope();
  if (!engine || !scope) return null;
  const isCurrent = () => getEngine() === engine && getScope()?.scopeId === scope.scopeId;
  const read = async () => {
    if (!isCurrent()) throw new Error('Event engine has ended.');
    const state =
      typeof engine.readState === 'function' ? await engine.readState() : engine.getState();
    if (!isCurrent()) throw new Error('Event engine has ended.');
    return copyEventData(reduceState(state));
  };
  return {
    recordCoordinator: engine.recordCoordinator,
    endScope: () => {
      Promise.resolve(engine.cancelUIRequests?.()).catch(() => {});
      endScope?.();
    },
    scopeId: scope.scopeId,
    instancePath: copyEventData(scope.instancePath),
    isCurrent,
    readableValues: () =>
      Object.fromEntries(
        Object.entries(reduceState(engine.getState())?.values || {}).filter(
          ([name]) => !ownedNames || ownedNames.includes(name)
        )
      ),
    refreshReads: async (values) => {
      if (!isCurrent()) throw new Error('Event engine has ended.');
      if (typeof engine.syncEventReads === 'function') await engine.syncEventReads(values);
      else Object.assign(engine.getState().values, copyEventData(values));
    },
    read,
    settle: read,
    snapshot: () => copyEventData(reduceState(engine.getState())),
    trigger: (type, fieldKey, metadata) =>
      engine.triggerDetailed(type, fieldKey, copyEventData(metadata)),
    async process(operations, meta, targetCurrent) {
      const operationMode = engine.getMode?.();
      const operationCurrent = () =>
        isCurrent() && targetCurrent() && engine.getMode?.() === operationMode;
      const questions = operations.filter((op) => op?.operation === 'MESSAGEBOX');
      const immediate = operations.filter((op) => op?.operation !== 'MESSAGEBOX');
      await completeEventOperations(immediate, meta, {
        delegate: getOptions()?.onOperations,
        isCurrent: operationCurrent,
        applyDefault: async (selected, selectedMeta) => {
          await applyDefault(selected, selectedMeta);
          await read();
        },
      });
      await read();
      for (const question of questions) {
        if (!operationCurrent()) throw new Error('Question target has ended.');
        const present = getOptions()?.onMessageBox;
        if (typeof present !== 'function')
          throw new Error('MESSAGEBOX requires an onMessageBox presenter.');
        const response = await present(copyEventData(question.params), {
          ...meta,
          isCurrent: operationCurrent,
        });
        if (!operationCurrent()) {
          await engine.cancelUIRequests?.();
          throw new Error('Question target has ended.');
        }
        const result = await engine.resolveUIRequest(question.params.requestId, response);
        if (result.issues?.length) throw new Error(result.issues[0].message);
        if (result.operations?.length) await this.process(result.operations, meta, targetCurrent);
      }
    },
  };
}
