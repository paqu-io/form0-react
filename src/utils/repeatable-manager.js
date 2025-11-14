import { createFormEngine, buildRepeatableMetadata } from 'form0-core';
import { uuidv4, uuidv7 } from './uuid.js';

function pickStateSlice(stateMap, fieldNames, { omitFalsy = false } = {}) {
  const result = {};
  if (!stateMap) return result;
  fieldNames.forEach((name) => {
    if (!Object.prototype.hasOwnProperty.call(stateMap, name)) {
      return;
    }
    const value = stateMap[name];
    if (omitFalsy && !value) {
      return;
    }
    result[name] = value;
  });
  return result;
}

export function evaluateRepeatableInstance({
  schema,
  repInfo,
  instance,
  parentValues,
  engineOptions = {},
}) {
  if (!repInfo) {
    throw new Error('form0-react: repeatable metadata is required to evaluate instances');
  }

  const fieldNames = Array.from(repInfo.fields.keys());

  const mergedValues = {
    ...parentValues,
    ...(instance?.values || {}),
  };

  const engine = createFormEngine({
    schema,
    initialValues: mergedValues,
    helpers: engineOptions.helpers,
    security: engineOptions.security,
  });

  engine.eval();
  const evaluatedState = engine.getState();

  const valuesSlice = pickStateSlice(evaluatedState.values, fieldNames);
  const errorsSlice = pickStateSlice(evaluatedState.errors, fieldNames, { omitFalsy: true });
  const visibleSlice = pickStateSlice(evaluatedState.visible, fieldNames);
  const requiredSlice = pickStateSlice(evaluatedState.required, fieldNames);
  const readOnlySlice = pickStateSlice(evaluatedState.read_only, fieldNames);

  const nextParentValues = { ...parentValues, ...valuesSlice };

  const nestedRepeatable = {};
  for (const [, childRepInfo] of repInfo.children) {
    const childInstances = instance?.repeatable?.[childRepInfo.preferredKey] || [];
    if (!Array.isArray(childInstances) || childInstances.length === 0) {
      continue;
    }

    const evaluatedChildren = childInstances.map((childInstance) =>
      evaluateRepeatableInstance({
        schema,
        repInfo: childRepInfo,
        instance: childInstance,
        parentValues: nextParentValues,
        engineOptions,
      })
    );

    if (evaluatedChildren.length > 0) {
      nestedRepeatable[childRepInfo.preferredKey] = evaluatedChildren;
    }
  }

  return {
    ...instance,
    id: instance?.id ?? instance?.record_id ?? uuidv7(),
    values: valuesSlice,
    errors: errorsSlice,
    visible: visibleSlice,
    required: requiredSlice,
    read_only: readOnlySlice,
    repeatable: nestedRepeatable,
  };
}

export function evaluateRepeatableState({
  schema,
  repeatableInput,
  metadata,
  baseValues = {},
  engineOptions,
}) {
  if (!metadata?.repeatableSectionTree) {
    return {};
  }

  const result = {};

  for (const [, repInfo] of metadata.repeatableSectionTree) {
    if (repInfo.parentPath.length > 0) {
      continue;
    }

    const instances = repeatableInput?.[repInfo.preferredKey] || [];
    if (!Array.isArray(instances) || instances.length === 0) {
      continue;
    }

    const evaluatedInstances = instances.map((instance) =>
      evaluateRepeatableInstance({
        schema,
        repInfo,
        instance,
        parentValues: baseValues,
        engineOptions,
      })
    );

    if (evaluatedInstances.length > 0) {
      result[repInfo.preferredKey] = evaluatedInstances;
    }
  }

  return result;
}

export function buildRepeatableInfo(elements) {
  return buildRepeatableMetadata(elements || []);
}

export function createEmptyRepeatableInstance(repInfo) {
  const values = {};
  if (repInfo?.fields) {
    for (const [fieldDataName] of repInfo.fields) {
      values[fieldDataName] = null;
    }
  }
  return {
    id: uuidv7(),
    values,
    errors: {},
    visible: {},
    required: {},
    read_only: {},
    repeatable: {},
    attachments: [],
  };
}

export function cloneRepeatableState(state) {
  if (!state) return {};
  if (typeof structuredClone === 'function') {
    return structuredClone(state);
  }
  return JSON.parse(JSON.stringify(state));
}

export function ensureRepeatableEntryIds(instances = []) {
  instances.forEach((instance) => {
    if (!instance.id) {
      instance.id = uuidv7();
    }
    if (!instance.record_id) {
      instance.record_id = uuidv4();
    }
  });
  return instances;
}
