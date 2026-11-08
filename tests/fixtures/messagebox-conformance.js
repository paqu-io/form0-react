import { createFormEngine } from 'form0-core';
import { createEventEngineBinding } from '../../src/utils/event-engine.js';
import { field } from './diagnostic-conformance.js';

export function messageBoxConformance(test, assert) {
  for (const mode of ['trusted', 'safe'])
    test(`managed questions settle writes, fresh reads and queued replies (${mode})`, async () => {
      const engine = createFormEngine({
        schema: {
          form: {
            name: 'Question',
            elements: [field('NumericField', 'input')],
            events: {
              code: `
      ON('blur','input',function(){
        MESSAGEBOX({buttons:[{id:'apply',label:'Apply'}],context:{original:$input}},function(reply){
          if(!reply.cancelled) {
            SETVALUE('input',$input+reply.context.original);
            MESSAGEBOX({buttons:['Next']},function(){SETVALUE('input',$input+1);});
          }
        });
        SETVALUE('input',10);
      });`,
            },
          },
        },
        initialValues: { input: 4 },
        eventScope: { scopeId: 'question-scope', instancePath: [] },
        security: { mode },
      });
      engine.eval();
      const seen = [];
      const binding = createEventEngineBinding({
        getEngine: () => engine,
        getScope: () => ({ scopeId: 'question-scope', instancePath: [] }),
        getOptions: () => ({
          onMessageBox: async (options, lifetime) => {
            seen.push({ value: engine.getState().values.input, options });
            assert.equal(lifetime.isCurrent(), true);
            return { value: options.buttons[0].id };
          },
        }),
        applyDefault: (operations) => {
          for (const operation of operations)
            if (operation.operation === 'SETVALUE')
              engine.setValue(operation.params.fieldDataName, operation.params.valueToSet);
          engine.eval();
        },
      });
      const result = engine.triggerDetailed('blur', 'input');
      await binding.process(result.operations, {}, () => true);
      assert.deepEqual(
        seen.map((entry) => entry.value),
        [10, 14]
      );
      assert.equal(engine.getState().values.input, 15);
      assert.equal('context' in seen[0].options, false);
    });
  test('closing the originating managed binding rejects a late reply', async () => {
    const engine = createFormEngine({
      schema: {
        form: {
          name: 'Question',
          elements: [field('NumericField', 'input')],
          events: {
            code: `ON('blur','input',function(){MESSAGEBOX({buttons:['OK']},function(){SETVALUE('input',99);});});`,
          },
        },
      },
      initialValues: { input: 4 },
      eventScope: { scopeId: 'scope', instancePath: [] },
    });
    let resolve,
      scope = 'scope',
      presented;
    const wait = new Promise((done) => (presented = done));
    const binding = createEventEngineBinding({
      getEngine: () => engine,
      getScope: () => ({ scopeId: scope, instancePath: [] }),
      getOptions: () => ({
        onMessageBox: () =>
          new Promise((done) => {
            resolve = done;
            presented();
          }),
      }),
      applyDefault: (operations) => assert.equal(operations.length, 0, 'No late write may apply'),
    });
    const processing = binding.process(
      engine.triggerDetailed('blur', 'input').operations,
      {},
      () => true
    );
    await wait;
    scope = 'replacement';
    binding.endScope();
    resolve({ value: 'OK' });
    await assert.rejects(processing, /ended/);
    assert.equal(engine.getState().values.input, 4);
  });
  test('mode changes retire a question while the engine binding remains usable', async () => {
    const engine = createFormEngine({
      schema: {
        form: {
          name: 'Modes',
          elements: [field('NumericField', 'input')],
          events: {
            code: `ON('blur','input',function(){MESSAGEBOX({buttons:['OK']},function(){SETVALUE('input',99);});});`,
          },
        },
      },
      initialValues: { input: 4 },
    });
    let respond, lifetime, started;
    const presented = new Promise((resolve) => (started = resolve));
    const binding = createEventEngineBinding({
      getEngine: () => engine,
      getScope: () => ({ scopeId: 'modes', instancePath: [] }),
      getOptions: () => ({
        onMessageBox: (_question, current) =>
          new Promise((resolve) => {
            respond = resolve;
            lifetime = current;
            started();
          }),
      }),
      applyDefault: () => {},
    });
    const pending = binding.process(
      engine.triggerDetailed('blur', 'input').operations,
      {},
      () => true
    );
    await presented;
    engine.setMode('readonly');
    assert.equal(lifetime.isCurrent(), false);
    respond({ value: 'OK' });
    await assert.rejects(pending, /ended/);
    assert.equal(engine.getState().values.input, 4);
    engine.setMode('edit');
    assert.equal(binding.isCurrent(), true);
    assert.equal((await binding.read()).values.input, 4);
  });
}
