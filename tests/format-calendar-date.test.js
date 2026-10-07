process.env.TZ = 'America/New_York';

import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';

import { formatCalendarDate } from '../src/helpers/format-calendar-date.js';

describe('formatCalendarDate', () => {
  for (const timezone of ['UTC', 'America/New_York']) {
    it(`preserves early-year calendar dates in ${timezone}`, () => {
      const formatterUrl = new URL('../src/helpers/format-calendar-date.js', import.meta.url);
      execFileSync(
        process.execPath,
        [
          '--input-type=module',
          '-e',
          `import assert from 'node:assert/strict';
           import { formatCalendarDate } from ${JSON.stringify(formatterUrl.href)};
           for (const value of ['0001-01-07', '0099-12-31', '0004-02-29']) {
             // ISO local-noon parsing is independent of the formatter's date construction.
             const expected = new Date(value + 'T12:00:00');
             assert.equal(expected.getFullYear(), Number(value.slice(0, 4)));
             assert.equal(formatCalendarDate(value), expected.toLocaleDateString());
           }`,
        ],
        { env: { ...process.env, TZ: timezone }, stdio: 'pipe' }
      );
    });
  }

  it('keeps the calendar day west of UTC', () => {
    expect(formatCalendarDate('2027-01-07')).toBe(new Date(2027, 0, 7).toLocaleDateString());
    expect(formatCalendarDate('2027-01-07')).not.toBe(new Date(2027, 0, 6).toLocaleDateString());
  });

  it('keeps the previous handling for non-calendar values', () => {
    const timestamp = '2027-01-07T15:00:00Z';
    expect(formatCalendarDate(timestamp)).toBe(new Date(timestamp).toLocaleDateString());
    expect(formatCalendarDate('not a date')).toBe('not a date');
  });
});
