// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { FormRenderer } from '../dist/index.js';
import { field } from './fixtures/diagnostic-conformance.js';

afterEach(cleanup);

// Every SingleChoiceField / MultiChoiceField dropdown is ChoiceDropdown (review of 2026-11-18):
// search when is_searchable, type-to-jump otherwise, "Other" at the end, an × to clear.
const sites = [
  { value: 'bertinoro', label: 'Bertinoro – Colle di Polenta' },
  { value: 'cesena', label: 'Cesena – Ippodromo' },
  { value: 'forli', label: 'Forlì – Parco Urbano' },
  { value: 'forlimpopoli', label: 'Forlimpopoli – Rocca' },
  { value: 'meldola', label: 'Meldola – Lago di Quarto' },
];
const searchable = { is_searchable: true, is_searchable_mode: 'default' };
const schema = {
  form: {
    name: 'Dropdowns',
    elements: [
      field('SingleChoiceField', 'site', {
        label: 'Observation site',
        choices: sites,
        allow_other: true,
        ...searchable,
      }),
      field('SingleChoiceField', 'weather', {
        label: 'Weather',
        choices: ['Clear', 'Cloudy', 'Rain', 'Snow', 'Sunny'].map((label) => ({
          value: label.toLowerCase(),
          label,
        })),
        allow_other: false,
        is_searchable: false,
        is_searchable_mode: null,
      }),
      field('MultiChoiceField', 'visited', {
        label: 'Sites visited',
        choices: sites,
        allow_other: true,
        ...searchable,
      }),
    ],
  },
};

function renderForm(props = {}) {
  const onUpdate = vi.fn();
  render(
    <FormRenderer
      schema={schema}
      engineOptions={{ events: { recordKind: 'new' }, diagnostics: { console: false }, onUpdate }}
      {...props}
    />
  );
  return () => onUpdate.mock.calls.at(-1)?.[0]?.values || {};
}

const trigger = (label) => screen.findByRole('button', { name: new RegExp(`^${label}`) });
const options = () => screen.getAllByRole('option').map((option) => option.textContent);

it('searches ignoring case and accents, picks with the keyboard and clears with the ×', async () => {
  const values = renderForm();
  const site = await trigger('Observation site');
  expect(site.getAttribute('aria-expanded')).toBe('false');
  fireEvent.click(site);

  const search = screen.getByRole('combobox', { name: 'Search the options' });
  expect(document.activeElement).toBe(search);
  fireEvent.change(search, { target: { value: 'forli' } });
  // "Other" stays at the end, never filtered.
  expect(options()).toEqual(['Forlì – Parco Urbano', 'Forlimpopoli – Rocca', 'Other']);

  fireEvent.keyDown(search, { key: 'ArrowDown' });
  fireEvent.keyDown(search, { key: 'Enter' });
  await waitFor(() => expect(values().site?.choice?.[0]?.value).toBe('forlimpopoli'));
  expect(screen.queryByRole('listbox')).toBeNull();
  expect(document.activeElement).toBe(site);
  expect(site.textContent).toContain('Forlimpopoli – Rocca');

  fireEvent.click(screen.getAllByRole('button', { name: 'Clear' })[0]);
  await waitFor(() => expect(values().site?.choice ?? []).toEqual([]));
  expect(screen.getByRole('button', { name: /^Observation site/ }).textContent).toContain(
    'Select an option...'
  );
});

it('shows "No results" and keeps "Other", whose text input takes the focus', async () => {
  const values = renderForm();
  fireEvent.click(await trigger('Observation site'));
  fireEvent.change(screen.getByRole('combobox', { name: 'Search the options' }), {
    target: { value: 'ravenna' },
  });
  expect(screen.getByText('No results')).toBeTruthy();
  expect(options()).toEqual(['Other']);
  fireEvent.click(screen.getByRole('option', { name: 'Other' }));

  const other = await screen.findByPlaceholderText('Please specify...');
  expect(document.activeElement).toBe(other);
  fireEvent.change(other, { target: { value: 'Fiumana' } });
  await waitFor(() => expect(values().site?.other?.[0]?.label).toBe('Fiumana'));
});

it('without search, typing jumps to the first match and Space picks', async () => {
  const values = renderForm();
  fireEvent.click(await trigger('Weather'));
  expect(screen.queryByRole('combobox', { name: 'Search the options' })).toBeNull();
  const list = screen.getByRole('listbox');
  expect(document.activeElement).toBe(list);

  fireEvent.keyDown(list, { key: 's' });
  expect(document.getElementById(list.getAttribute('aria-activedescendant')).textContent).toBe(
    'Snow'
  );
  fireEvent.keyDown(list, { key: 'u' });
  expect(document.getElementById(list.getAttribute('aria-activedescendant')).textContent).toBe(
    'Sunny'
  );
  fireEvent.keyDown(list, { key: ' ' });
  await waitFor(() => expect(values().weather?.choice?.[0]?.value).toBe('sunny'));
});

it('multiple choice toggles, stays open, checks "Other" with its input, and clears all', async () => {
  const values = renderForm();
  fireEvent.click(await trigger('Sites visited'));
  const chosenValues = () => values().visited?.choices?.map((choice) => choice.value);
  fireEvent.click(screen.getByRole('option', { name: 'Cesena – Ippodromo' }));
  await waitFor(() => expect(chosenValues()).toEqual(['cesena']));
  fireEvent.click(screen.getByRole('option', { name: 'Meldola – Lago di Quarto' }));
  await waitFor(() => expect(chosenValues()).toEqual(['cesena', 'meldola']));
  fireEvent.click(screen.getByRole('option', { name: 'Other' }));
  await waitFor(() =>
    expect(screen.getByRole('option', { name: 'Other' }).getAttribute('aria-selected')).toBe('true')
  );
  expect(screen.getByRole('listbox')).toBeTruthy();
  expect(screen.getByPlaceholderText('Please specify...')).toBeTruthy();
  expect(screen.getByPlaceholderText('Please specify...')).toBeTruthy();

  // Unchecking a choice keeps the others.
  fireEvent.click(screen.getByRole('option', { name: 'Cesena – Ippodromo' }));
  await waitFor(() =>
    expect(values().visited?.choices?.map((choice) => choice.value)).toEqual(['meldola'])
  );

  fireEvent.keyDown(screen.getByRole('combobox', { name: 'Search the options' }), {
    key: 'Escape',
  });
  const visited = screen.getByRole('button', { name: /^Sites visited/ });
  expect(visited.textContent).toContain('Meldola – Lago di Quarto, Other');
  fireEvent.click(within(visited.parentElement).getByRole('button', { name: 'Clear' }));
  await waitFor(() => expect(values().visited?.choices ?? []).toEqual([]));
  expect(values().visited?.other ?? []).toEqual([]);
});

it('quick toggles in multiple choice do not undo each other', async () => {
  const values = renderForm();
  fireEvent.click(await trigger('Sites visited'));
  // No wait between the clicks: the engine's value has not come back yet.
  fireEvent.click(screen.getByRole('option', { name: 'Cesena – Ippodromo' }));
  fireEvent.click(screen.getByRole('option', { name: 'Meldola – Lago di Quarto' }));
  fireEvent.click(screen.getByRole('option', { name: 'Bertinoro – Colle di Polenta' }));
  await waitFor(() =>
    expect(
      values()
        .visited?.choices?.map((choice) => choice.value)
        .sort()
    ).toEqual(['bertinoro', 'cesena', 'meldola'])
  );
});

it('Escape in an open panel closes the panel, not the form', async () => {
  const onRequestClose = vi.fn();
  renderForm({ formPlacement: 'form-modal', onRequestClose });
  const site = await trigger('Observation site');
  fireEvent.click(site);
  const search = screen.getByRole('combobox', { name: 'Search the options' });
  fireEvent.keyDown(search, { key: 'Escape' });
  expect(screen.queryByRole('listbox')).toBeNull();
  expect(document.activeElement).toBe(site);
  expect(onRequestClose).not.toHaveBeenCalled();
});

it('a read-only dropdown does not open and has no ×', async () => {
  renderForm({ mode: 'readonly' });
  const site = await trigger('Observation site');
  expect(site.disabled).toBe(true);
  expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
});
