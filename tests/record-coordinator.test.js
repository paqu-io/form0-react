import { expect, it, vi } from 'vitest';
import { createRecordCoordinator, createRecordBackend } from '../src/utils/record-coordinator.js';
import { field, repeatable } from './fixtures/diagnostic-conformance.js';

const schema = (extra = {}) => ({
  form: {
    name: 'Submission',
    ...extra,
    elements: [
      field('NumericField', 'tax', { format: 'float' }),
      field('CalculatedField', 'grand', { calculate: "REPEATABLESUM($lines, 'total')" }),
      repeatable('lines', [
        field('NumericField', 'amount'),
        field('CalculatedField', 'total', { calculate: '$amount * (1 + $tax)' }),
      ]),
    ],
  },
});
function fixture(extra = {}, policy = {}) {
  let tree = {
    values: { tax: 0.2, grand: 330 },
    repeatable: {
      lines: [
        { id: 0, values: { amount: 100, total: 110 } },
        { id: 'B', values: { amount: 200, total: 220 } },
      ],
    },
  };
  const coordinator = createRecordCoordinator({
    schema: schema(extra),
    getOptions: () => ({ submissionOptions: policy }),
  });
  coordinator.bind([], {
    read: () => tree,
    apply: (next) => {
      tree = next;
    },
  });
  const serialize = async (selected, _intent, validationSummary) => ({
    payload: structuredClone(selected),
    meta: { validationSummary },
  });
  return {
    coordinator,
    serialize,
    get tree() {
      return tree;
    },
  };
}

it('automatic selection and acknowledgement preserve the exact selected tree', async () => {
  const fixture = fixtureFactory();
  const result = await fixture.coordinator.prepare(
    { intent: 'submit' },
    { serialize: fixture.serialize }
  );
  expect(result.eligible).toBe(true);
  expect(result.payload.values.grand).toBe(360);
  expect(fixture.tree.repeatable.lines.map((row) => row.values.total)).toEqual([120, 240]);
  expect(result.meta.freshness.status).toBe('current');
  expect(fixture.coordinator.acknowledgeSave({ preparationId: result.preparationId }).status).toBe(
    'completed'
  );
  expect(fixture.coordinator.getSaveChanges({ preparationId: result.preparationId }).status).toBe(
    'failed'
  );
});
const fixtureFactory = fixture;

it('confirmation retains 330, pages changes defensively and rejects stale/reused decisions', async () => {
  const instance = fixture({ repeatable_recalculation: 'confirm' }, { allowRetain: true });
  const review = await instance.coordinator.prepare(
    { intent: 'submit' },
    { serialize: instance.serialize }
  );
  expect(review.status).toBe('requires_decision');
  expect(review.payload).toBe(null);
  expect(instance.tree.values.grand).toBe(330);
  const page = instance.coordinator.getSaveChanges({
    preparationId: review.preparationId,
    limit: 1,
  });
  expect(page.total).toBe(3);
  expect(page.changes).toHaveLength(1);
  page.changes[0].after = 'tampered';
  expect(
    instance.coordinator.getSaveChanges({ preparationId: review.preparationId }).changes[0].after
  ).toBe(360);
  const kept = await instance.coordinator.prepare(
    { intent: 'submit', decision: { reviewId: review.reviewId, action: 'retain' } },
    { serialize: instance.serialize }
  );
  expect(kept.payload.values.grand).toBe(330);
  expect(kept.meta.freshness.status).toBe('pending');
  expect(
    instance.coordinator.acknowledgeSave({ preparationId: kept.preparationId }).freshness.status
  ).toBe('pending');
  expect(
    (
      await instance.coordinator.prepare(
        { intent: 'submit', decision: { reviewId: review.reviewId, action: 'retain' } },
        { serialize: instance.serialize }
      )
    ).issues[0].code
  ).toBe('stale_review');
});

it('save-hook changes require another review without running the hook twice', async () => {
  const instance = fixture({ repeatable_recalculation: 'confirm' });
  let calls = 0;
  const adapter = {
    serialize: instance.serialize,
    managedEvents: true,
    saveHook: async () => {
      calls++;
      instance.tree.values.tax = 0.3;
      return { issues: [] };
    },
  };
  const first = await instance.coordinator.prepare({ intent: 'submit' }, adapter);
  const second = await instance.coordinator.prepare(
    { intent: 'submit', decision: { reviewId: first.reviewId, action: 'refresh' } },
    adapter
  );
  expect(second.status).toBe('requires_decision');
  expect(calls).toBe(1);
  const final = await instance.coordinator.prepare(
    { intent: 'submit', decision: { reviewId: second.reviewId, action: 'refresh' } },
    adapter
  );
  expect(final.eligible).toBe(true);
  expect(calls).toBe(1);
  expect(final.payload.values.grand).toBe(390);
});

it('invalid drafts remain eligible, cancellation applies nothing and pending editors block preparation', async () => {
  const instance = fixture({
    repeatable_recalculation: 'confirm',
    events: { code: "ON('validate-record', () => INVALID('Draft error'));" },
  });
  const draft = await instance.coordinator.prepare(
    { intent: 'draft' },
    { serialize: instance.serialize, managedEvents: true }
  );
  expect(draft.eligible).toBe(true);
  expect(draft.validationSummary.hasErrors).toBe(true);
  expect(draft.meta.freshness.status).toBe('pending');
  expect(draft.payload.values.grand).toBe(330);
  const review = await instance.coordinator.prepare(
    { intent: 'submit' },
    { serialize: instance.serialize }
  );
  const cancelled = await instance.coordinator.prepare(
    { intent: 'submit', decision: { reviewId: review.reviewId, action: 'cancel' } },
    { serialize: instance.serialize }
  );
  expect(cancelled.status).toBe('cancelled');
  expect(instance.tree.values.grand).toBe(330);
  const release = instance.coordinator.bind(
    [{ repeatableKey: 'lines', instanceId: 0, identity: 'id', index: 0 }],
    { read: () => instance.tree.repeatable.lines[0] }
  );
  expect(
    (await instance.coordinator.prepare({ intent: 'submit' }, { serialize: instance.serialize }))
      .issues[0].code
  ).toBe('pending_editor');
  release();
});

it('a blocked selected snapshot remains editable and older acknowledgements cannot clear newer inputs', async () => {
  const instance = fixture({
    events: { code: "ON('validate-record', () => INVALID('Required note'));" },
  });
  const result = await instance.coordinator.prepare(
    { intent: 'submit' },
    { serialize: instance.serialize, managedEvents: true }
  );
  expect(result.eligible).toBe(false);
  expect(instance.tree.values.grand).toBe(360);
  const next = fixture();
  const prepared = await next.coordinator.prepare(
    { intent: 'submit' },
    { serialize: next.serialize }
  );
  next.tree.values.tax = 0.4;
  expect(next.coordinator.acknowledgeSave({ preparationId: prepared.preparationId }).status).toBe(
    'failed'
  );
  next.coordinator.dispose();
});

it('preparation identities are unique across sessions and input invalidation releases old reports', async () => {
  const first = fixtureFactory(),
    second = fixtureFactory();
  const a = await first.coordinator.prepare({ intent: 'submit' }, { serialize: first.serialize });
  const b = await second.coordinator.prepare({ intent: 'submit' }, { serialize: second.serialize });
  expect(a.preparationId).not.toBe(b.preparationId);
  expect(second.coordinator.acknowledgeSave({ preparationId: a.preparationId }).status).toBe(
    'failed'
  );
  expect(second.coordinator.acknowledgeSave({ preparationId: b.preparationId }).status).toBe(
    'completed'
  );
  const reviewFixture = fixture({ repeatable_recalculation: 'confirm' });
  const review = await reviewFixture.coordinator.prepare(
    { intent: 'submit' },
    { serialize: reviewFixture.serialize }
  );
  reviewFixture.tree.values.tax = 0.5;
  expect(
    reviewFixture.coordinator.getSaveChanges({ preparationId: review.preparationId }).status
  ).toBe('failed');
  expect(
    (
      await reviewFixture.coordinator.prepare(
        { intent: 'submit', decision: { reviewId: review.reviewId, action: 'refresh' } },
        { serialize: reviewFixture.serialize }
      )
    ).issues[0].code
  ).toBe('stale_review');
});

it('asynchronous serialization cannot deliver changed, cancelled or replaced preparations', async () => {
  for (const action of ['change', 'cancel', 'abort']) {
    const instance = fixtureFactory();
    const abort = new AbortController();
    const result = await instance.coordinator.prepare(
      { intent: 'submit', signal: abort.signal },
      {
        serialize: async (...args) => {
          const serialized = await instance.serialize(...args);
          if (action === 'change') instance.tree.values.tax = 0.5;
          if (action === 'cancel') instance.coordinator.cancelPreparation();
          if (action === 'abort') abort.abort();
          return serialized;
        },
      }
    );
    expect(result.eligible).toBe(false);
    expect(result.payload ?? null).toBe(null);
    expect(instance.coordinator.freshness()).toBe(null);
    instance.coordinator.dispose();
  }
});

it('changed host policy invalidates an existing review and releases its change report', async () => {
  const policy = { allowRetain: true };
  const instance = fixture({ repeatable_recalculation: 'confirm' }, policy);
  const review = await instance.coordinator.prepare(
    { intent: 'submit' },
    { serialize: instance.serialize }
  );
  policy.allowRetain = false;
  expect(instance.coordinator.getSaveChanges({ preparationId: review.preparationId }).status).toBe(
    'failed'
  );
  const result = await instance.coordinator.prepare(
    { intent: 'submit', decision: { reviewId: review.reviewId, action: 'retain' } },
    { serialize: instance.serialize }
  );
  expect(result.eligible).toBe(false);
  expect(instance.tree.values.grand).toBe(330);
  instance.coordinator.dispose();
});

it('host yielding stays cooperative, preserves custom scheduling and supports cancellation', async () => {
  const yieldToHost = vi.fn(async () => {});
  vi.stubGlobal('scheduler', { postTask: yieldToHost });
  const instance = fixtureFactory();
  const backend = createRecordBackend({ schema: schema(), diagnostics: { console: false } });
  try {
    const scoped = await backend.evaluateScope(instance.tree, { budgetMs: 0 });
    expect(scoped.status).toBe('evaluated');
    expect(yieldToHost).toHaveBeenCalledWith(expect.any(Function), { priority: 'user-visible' });
    yieldToHost.mockClear();
    const abort = new AbortController();
    const custom = vi.fn(async () => {
      abort.abort();
    });
    const cancelled = await backend.prepare(instance.tree, {
      budgetMs: 0,
      yieldToHost: custom,
      signal: abort.signal,
    });
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.snapshot).toBe(null);
    expect(custom).toHaveBeenCalled();
    expect(yieldToHost).not.toHaveBeenCalled();
    expect(instance.tree.values.grand).toBe(330);
  } finally {
    backend.dispose();
    instance.coordinator.dispose();
    vi.unstubAllGlobals();
  }
});
