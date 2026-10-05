process.env.TZ = 'America/New_York';

import { describe, expect, it } from 'vitest';

import { formatCalendarDate } from '../src/helpers/format-calendar-date.js';

describe('formatCalendarDate', () => {
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
