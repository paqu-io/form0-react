// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { FormRenderer } from '../dist/index.js';
import { NavigationTree } from '../src/navigation-tree.jsx';
vi.mock('../src/navigation-tree.css.js', () =>
  Object.fromEntries(
    [
      'navigationContainer',
      'navigationTabs',
      'navigationTabButton',
      'navigationTabBadge',
      'navigationTabPanel',
      'navigationTabButtonActive',
      'validationList',
      'validationEmptyState',
      'validationItem',
      'validationButton',
      'validationHeader',
      'validationField',
      'validationMessage',
      'validationPager',
      'validationPageButton',
      'validationPageCount',
    ].map((key) => [key, key])
  )
);
import { field } from './fixtures/diagnostic-conformance.js';

afterEach(cleanup);
const schema = (count) => ({
  form: {
    name: 'Findings',
    elements: Array.from({ length: count }, (_, index) =>
      field('NumericField', `answer_${index + 1}`, { min: 0 })
    ),
  },
});
async function open(count) {
  render(
    <FormRenderer
      schema={schema(count)}
      initialValues={Object.fromEntries(
        Array.from({ length: count }, (_, index) => [`answer_${index + 1}`, -1])
      )}
      onSubmit={vi.fn()}
      engineOptions={{ events: { lifecycle: false } }}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'Submit', exact: true }));
  const sidebar = within(await screen.findByRole('navigation', { name: 'Form sidebar' }));
  await sidebar.findAllByText(`answer_1`);
  return sidebar;
}
it('hides pagination when all fifteen findings fit', async () => {
  const sidebar = await open(15);
  expect(sidebar.queryByRole('button', { name: 'Previous' })).toBeNull();
  expect(sidebar.queryByRole('button', { name: 'Next' })).toBeNull();
});
it('pages fifteen findings at a time through the form sidebar', async () => {
  const sidebar = await open(24);
  expect(sidebar.getByText('1–15 of 24')).toBeTruthy();
  expect(sidebar.queryAllByText('answer_16')).toHaveLength(0);
  fireEvent.click(sidebar.getByRole('button', { name: 'Next' }));
  expect(sidebar.getByText('16–24 of 24')).toBeTruthy();
  fireEvent.click(sidebar.getByRole('button', { name: 'Previous' }));
  expect(sidebar.getByText('1–15 of 24')).toBeTruthy();
});
it('keeps the selected page across updated finding arrays and clamps when the last page disappears', () => {
  const findings = Array.from({ length: 24 }, (_, index) => ({
    id: String(index),
    label: `Answer ${index + 1}`,
    fieldName: `answer_${index + 1}`,
    messages: ['Please provide a value.'],
  }));
  const { rerender } = render(
    <NavigationTree sections={[]} validationEnabled validationIssues={findings} />
  );
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  rerender(<NavigationTree sections={[]} validationEnabled validationIssues={[...findings]} />);
  expect(screen.getByText('16–24 of 24')).toBeTruthy();
  rerender(<NavigationTree sections={[]} validationEnabled validationIssues={findings.slice(1)} />);
  expect(screen.getByText('16–23 of 23')).toBeTruthy();
  expect(screen.queryByText('Answer 2')).toBeNull();
  rerender(<NavigationTree sections={[]} validationEnabled validationIssues={findings.slice(9)} />);
  expect(screen.getByText('Answer 10')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
});
