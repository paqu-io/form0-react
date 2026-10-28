import { it, expect } from 'vitest';
import { FIELD_SPECS, createFormEngine } from 'form0-core';
import { attachAuditEvents, fieldFixture } from './fixtures/consumer-compatibility.js';

for (const security of [undefined, { mode: 'safe' }]) {
  it(`generated audit events preserve embedded JavaScript literals (${security?.mode || 'trusted'})`, () => {
    const fixture = fieldFixture(FIELD_SPECS);
    const literal = '</script><script>"\'\\\n\r\t\b\f\0\u2028\u2029😀';
    fixture.snapshot.values.text = literal;
    fixture.snapshot.values.photos[0][literal] = literal;
    attachAuditEvents(FIELD_SPECS, fixture);
    expect(fixture.schema.form.events.code).not.toMatch(/[<>\u2028\u2029]/u);
    const engine = createFormEngine({
      schema: fixture.schema,
      initialValues: fixture.snapshot.values,
      security,
      diagnostics: { console: false },
    });
    for (const [stage, values] of [
      [1, fixture.changed],
      [2, fixture.cleared],
      [0, fixture.snapshot.values],
    ]) {
      engine.getState().values.stage = stage;
      const result = engine.triggerDetailed('change', 'stage');
      expect(result.issues).toEqual([]);
      expect(result.operations).toEqual(
        Object.entries(values)
          .filter(([name]) => !['section_note', 'stage'].includes(name))
          .map(([fieldDataName, valueToSet]) => ({
            type: 'FIELD_OPERATION',
            operation: 'SETVALUE',
            params: { fieldDataName, valueToSet },
          }))
      );
    }
  });
}
