// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { FormRenderer } from '../dist/index.js';

const createTextField = (dataName, label, key) => ({
  type: 'TextField',
  data_name: dataName,
  label,
  display: 'default',
  description: null,
  description_mode: null,
  required: false,
  required_conditions: null,
  visible: true,
  visible_conditions: null,
  read_only: false,
  read_only_conditions: null,
  default_value: null,
  pattern: null,
  pattern_description: null,
  supporting_image: false,
  supporting_image_path: null,
  supporting_image_display: null,
  key,
});

const createRepeatableSection = () => ({
  type: 'RepeatableSection',
  data_name: 'rooms',
  key: 'rooms',
  label: 'Rooms',
  display: 'drilldown',
  description: null,
  description_mode: null,
  visible: true,
  visible_conditions: null,
  location_enabled: false,
  location_required: false,
  elements: [createTextField('room_name', 'Room Name', 'room_name')],
});

const BASE_SCHEMA = {
  form: {
    name: 'Snapshot Test Form',
    id: 'snapshot-test-form',
    status_field: {
      type: 'StatusField',
      key: '@status',
      data_name: 'status',
      label: 'Status',
      display: 'default',
      enabled: true,
      visible: true,
      visible_conditions: null,
      read_only: false,
      read_only_conditions: null,
      default_value: 'pending',
      choices: [
        {
          value: 'pending',
          label: 'Pending',
          color: '#888888',
        },
      ],
    },
    elements: [
      createTextField('name', 'Name', 'name'),
      createRepeatableSection(),
    ],
  },
};

afterEach(() => {
  cleanup();
});

describe('FormRenderer snapshot contract', () => {
  it('seeds from initialSnapshot and ignores initialValues when both are provided', async () => {
    const events = [];

    render(
      <FormRenderer
        schema={BASE_SCHEMA}
        initialValues={{
          name: 'Initial Values',
          status: 'pending',
        }}
        initialSnapshot={{
          raw_values: {
            name: 'Snapshot Value',
            status: 'pending',
          },
          repeatable: {
            rooms: [
              {
                id: 'room-1',
                values: {
                  room_name: 'Kitchen',
                },
                repeatable: {},
              },
            ],
          },
          timestamps: {
            created_at_client: '2026-03-29T10:00:00.000Z',
            updated_at_client: '2026-03-29T10:05:00.000Z',
            created_at_server: null,
            updated_at_server: null,
          },
        }}
        onSnapshotChange={(snapshot, meta) => {
          events.push({ snapshot, meta });
        }}
      />,
    );

    await waitFor(() => {
      expect(events.length).toBeGreaterThan(0);
    });

    const seedEvent = events.at(-1);
    expect(seedEvent?.meta).toEqual({
      kind: 'seed',
      dirty: false,
    });
    expect(seedEvent?.snapshot.raw_values.name).toBe('Snapshot Value');
    expect(seedEvent?.snapshot.repeatable).toEqual({
      rooms: [
        expect.objectContaining({
          id: 'room-1',
          values: {
            room_name: 'Kitchen',
          },
        }),
      ],
    });
    expect(seedEvent?.snapshot.timestamps).toEqual({
      created_at_client: '2026-03-29T10:00:00.000Z',
      updated_at_client: '2026-03-29T10:05:00.000Z',
      created_at_server: null,
      updated_at_server: null,
    });
  });

  it('emits seed then change snapshots and tracks dirty against the seed baseline', async () => {
    const events = [];

    render(
      <FormRenderer
        schema={BASE_SCHEMA}
        initialSnapshot={{
          raw_values: {
            name: 'Alpha',
            status: 'pending',
          },
          repeatable: {},
          timestamps: {
            created_at_client: '2026-03-29T10:00:00.000Z',
            updated_at_client: '2026-03-29T10:05:00.000Z',
            created_at_server: null,
            updated_at_server: null,
          },
        }}
        onSnapshotChange={(snapshot, meta) => {
          events.push({ snapshot, meta });
        }}
      />,
    );

    await waitFor(() => {
      expect(events.some((event) => event.meta?.kind === 'seed')).toBe(true);
    });

    const input = screen.getByLabelText('Name');
    fireEvent.change(input, { target: { value: 'Beta' } });

    await waitFor(() => {
      expect(events.at(-1)?.meta).toEqual({
        kind: 'change',
        dirty: true,
      });
    });

    fireEvent.change(input, { target: { value: 'Alpha' } });

    await waitFor(() => {
      expect(events.at(-1)?.meta).toEqual({
        kind: 'change',
        dirty: false,
      });
    });
  });

  it('renders external record metadata fields and includes changes in raw snapshots', async () => {
    const events = [];

    render(
      <FormRenderer
        schema={BASE_SCHEMA}
        recordMetadataFields={[
          createTextField('project_name', 'Project', 'metadata_project'),
        ]}
        initialSnapshot={{
          raw_values: {
            name: 'Alpha',
            status: 'pending',
            project_name: 'Project A',
          },
          repeatable: {},
          timestamps: {
            created_at_client: '2026-03-29T10:00:00.000Z',
            updated_at_client: '2026-03-29T10:05:00.000Z',
            created_at_server: null,
            updated_at_server: null,
          },
        }}
        onSnapshotChange={(snapshot, meta) => {
          events.push({ snapshot, meta });
        }}
      />,
    );

    const input = await screen.findByLabelText('Project');
    expect(input).toHaveValue('Project A');

    fireEvent.change(input, { target: { value: 'Project B' } });

    await waitFor(() => {
      expect(events.at(-1)?.snapshot.raw_values.project_name).toBe('Project B');
    });
  });

});
