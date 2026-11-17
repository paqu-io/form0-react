// Same cases as form0-react-native's tests/masked-entry.test.mjs.
import { expect, it as test } from 'vitest';
import { formatMaskedEntry } from '../src/utils/masked-entry.js';

test('dates gain separators as digits are typed', () => {
  expect(formatMaskedEntry('', '2', 'date')).toBe('2');
  expect(formatMaskedEntry('2026', '20261', 'date')).toBe('2026-1');
  expect(formatMaskedEntry('2026-1', '2026-11', 'date')).toBe('2026-11');
  expect(formatMaskedEntry('2026-11', '2026-111', 'date')).toBe('2026-11-1');
  expect(formatMaskedEntry('2026-11-1', '2026-11-12', 'date')).toBe('2026-11-12');
  expect(formatMaskedEntry('2026-11-12', '2026-11-123', 'date')).toBe('2026-11-12');
});

test('times gain separators, with optional seconds', () => {
  expect(formatMaskedEntry('14', '143', 'time')).toBe('14:3');
  expect(formatMaskedEntry('14:3', '14:30', 'time')).toBe('14:30');
  expect(formatMaskedEntry('14:30', '14:301', 'time')).toBe('14:30:1');
  expect(formatMaskedEntry('14:30:1', '14:30:15', 'time')).toBe('14:30:15');
});

test('a pasted run of digits is grouped', () => {
  expect(formatMaskedEntry('', '20261112', 'date')).toBe('2026-11-12');
  expect(formatMaskedEntry('', '1430', 'time')).toBe('14:30');
});

test('deleting keeps the text as typed', () => {
  expect(formatMaskedEntry('2026-1', '2026-', 'date')).toBe('2026-');
  expect(formatMaskedEntry('2026-', '2026', 'date')).toBe('2026');
  expect(formatMaskedEntry('14:3', '14:', 'time')).toBe('14:');
});

test('other formats are never rewritten', () => {
  expect(formatMaskedEntry('12/11', '12/11/', 'date')).toBe('12/11/');
  expect(formatMaskedEntry('', 'today', 'date')).toBe('today');
  expect(formatMaskedEntry('', '2:30 pm', 'time')).toBe('2:30 pm');
});

test('a separator typed after a complete group is kept', () => {
  expect(formatMaskedEntry('11', '11:', 'time')).toBe('11:');
  expect(formatMaskedEntry('11:30', '11:30:', 'time')).toBe('11:30:');
  expect(formatMaskedEntry('2026', '2026-', 'date')).toBe('2026-');
});

test('a separator typed after one digit pads it', () => {
  expect(formatMaskedEntry('1', '1:', 'time')).toBe('01:');
  expect(formatMaskedEntry('9', '9:', 'time')).toBe('09:');
  expect(formatMaskedEntry('09:3', '09:30', 'time')).toBe('09:30');
  expect(formatMaskedEntry('12:5', '12:5:', 'time')).toBe('12:05:');
  expect(formatMaskedEntry('2026-1', '2026-1-', 'date')).toBe('2026-01-');
  expect(formatMaskedEntry('', '9:30', 'time')).toBe('09:30');
});

test('a year in progress is not padded', () => {
  expect(formatMaskedEntry('202', '202-', 'date')).toBe('202');
});

test('another order and separator, such as a locale date', () => {
  const us = { groups: [2, 2, 4], separator: '/' };
  expect(formatMaskedEntry('', '11122001', us)).toBe('11/12/2001');
  expect(formatMaskedEntry('1', '1/', us)).toBe('01/');
  expect(formatMaskedEntry('01/5', '01/5/', us)).toBe('01/05/');
  expect(formatMaskedEntry('', '1/5/2026', us)).toBe('01/05/2026');
  const de = { groups: [2, 2, 4], separator: '.' };
  expect(formatMaskedEntry('1112', '11122', de)).toBe('11.12.2');
  expect(formatMaskedEntry('', '11-12', de)).toBe('11-12');
});
