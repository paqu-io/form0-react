// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

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
    elements: [createTextField('name', 'Name', 'name'), createRepeatableSection()],
  },
};

const FLAT_SCHEMA = {
  form: {
    name: 'Flat Form',
    id: 'flat-form',
    status_field: null,
    elements: [createTextField('flat_name', 'Flat Name', 'flat_name')],
  },
};

afterEach(() => {
  cleanup();
});

describe('FormRenderer snapshot contract', () => {
  it('renders a mode-aware header accessory between the summary header and form body', async () => {
    render(
      <FormRenderer
        schema={FLAT_SCHEMA}
        mode="readonly"
        headerAccessory={({ mode }) => (
          <div data-testid="header-accessory">Accessory mode: {mode}</div>
        )}
      />
    );

    const accessory = screen.getByTestId('header-accessory');
    expect(accessory.textContent).toBe('Accessory mode: readonly');
    expect(accessory.parentElement?.previousElementSibling?.getAttribute('aria-label')).toBe(
      'Form summary'
    );
    expect(accessory.parentElement?.nextElementSibling?.querySelector('form')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    await waitFor(() => {
      expect(accessory.textContent).toBe('Accessory mode: edit');
    });
  });

  it('includes external dirty state in the root discard confirmation', async () => {
    const onRequestClose = vi.fn();

    render(
      <FormRenderer
        schema={FLAT_SCHEMA}
        formPlacement="form-modal"
        externalDirty={true}
        onRequestClose={onRequestClose}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(
      await screen.findByRole('dialog', { name: 'This record has unsaved changes' })
    ).toBeTruthy();
    expect(onRequestClose).not.toHaveBeenCalled();
  });

  it('blocks header and native submission with an accessible reason', async () => {
    const onSubmit = vi.fn();

    const { container } = render(
      <FormRenderer
        schema={FLAT_SCHEMA}
        onSubmit={onSubmit}
        submitBlockedReason="A location is required."
      />
    );

    const submitButton = screen.getByRole('button', { name: 'Submit' });
    expect(submitButton.disabled).toBe(true);
    expect(submitButton.getAttribute('title')).toBe('A location is required.');

    fireEvent.submit(container.querySelector('form'));
    expect(onSubmit).not.toHaveBeenCalled();
  });
  it('does not render statically hidden inline or drilldown sections', async () => {
    const hiddenSection = (display, key) => ({
      type: 'Section',
      key,
      data_name: key,
      label: `${display} hidden section`,
      display,
      description: null,
      description_mode: null,
      visible: false,
      visible_conditions: null,
      elements: [createTextField(`${key}_field`, `${display} hidden field`, `${key}_field`)],
    });

    render(
      <FormRenderer
        schema={{
          form: {
            ...FLAT_SCHEMA.form,
            elements: [
              hiddenSection('inline', 'hidden_inline'),
              hiddenSection('drilldown', 'hidden_drilldown'),
              {
                ...createRepeatableSection(),
                key: 'hidden_repeatable',
                data_name: 'hidden_repeatable',
                label: 'hidden repeatable section',
                visible: false,
              },
              createTextField('shown', 'Shown field', 'shown'),
            ],
          },
        }}
      />
    );

    expect(await screen.findByLabelText('Shown field')).toBeTruthy();
    expect(screen.queryByText('inline hidden section')).toBeNull();
    expect(screen.queryByText('drilldown hidden section')).toBeNull();
    expect(screen.queryByText('hidden repeatable section')).toBeNull();
    expect(screen.queryByLabelText('inline hidden field')).toBeNull();
    expect(screen.queryByLabelText('drilldown hidden field')).toBeNull();
  });

  it('exits an active drilldown when a visibility condition hides it', async () => {
    const trigger = createTextField('trigger', 'Trigger', 'trigger');
    const conditionalSection = {
      type: 'Section',
      key: 'conditional_section',
      data_name: 'conditional_section',
      label: 'Conditional section',
      display: 'drilldown',
      description: null,
      description_mode: null,
      visible: false,
      visible_conditions: {
        and: [{ field_id: 'trigger', operator: 'equal_to', value: 'show' }],
      },
      elements: [createTextField('conditional_value', 'Conditional value', 'conditional_value')],
    };

    const { rerender } = render(
      <FormRenderer
        schema={{
          form: {
            ...FLAT_SCHEMA.form,
            elements: [trigger, conditionalSection],
          },
        }}
        initialValues={{ trigger: 'show' }}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: 'View' }));
    expect(await screen.findByLabelText('Conditional value')).toBeTruthy();
    rerender(
      <FormRenderer
        schema={{
          form: {
            ...FLAT_SCHEMA.form,
            elements: [
              trigger,
              { ...conditionalSection, visible_conditions: null, visible: false },
            ],
          },
        }}
        initialValues={{ trigger: 'hide' }}
      />
    );
    await waitFor(() => {
      expect(screen.queryByText('Conditional section')).toBeNull();
      expect(screen.queryByLabelText('Conditional value')).toBeNull();
    });
  });

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
      />
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
      />
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

  it('does not re-seed when a consumer echoes live snapshots back into initialSnapshot', async () => {
    const events = [];

    function EchoSnapshotHarness() {
      const [snapshot, setSnapshot] = React.useState({
        raw_values: {
          name: 'Echo Seed',
          status: 'pending',
        },
        repeatable: {},
        timestamps: {
          created_at_client: '2026-03-29T10:00:00.000Z',
          updated_at_client: '2026-03-29T10:05:00.000Z',
          created_at_server: null,
          updated_at_server: null,
        },
      });

      return (
        <FormRenderer
          schema={BASE_SCHEMA}
          initialSnapshot={snapshot}
          onSnapshotChange={(nextSnapshot, meta) => {
            events.push(meta);
            setSnapshot(nextSnapshot);
          }}
        />
      );
    }

    render(<EchoSnapshotHarness />);

    const input = await screen.findByLabelText('Name');
    expect(input.value).toBe('Echo Seed');

    await waitFor(() => {
      expect(events.some((event) => event?.kind === 'seed')).toBe(true);
    });

    const settledSeedCount = events.filter((event) => event?.kind === 'seed').length;
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(events.filter((event) => event?.kind === 'seed')).toHaveLength(settledSeedCount);

    fireEvent.change(input, { target: { value: 'Echo Updated' } });

    await waitFor(() => {
      expect(screen.getByLabelText('Name').value).toBe('Echo Updated');
    });

    await waitFor(() => {
      expect(events.some((event) => event?.kind === 'change' && event?.dirty === true)).toBe(true);
    });
  });

  it('renders external record metadata fields and includes changes in raw snapshots', async () => {
    const events = [];

    render(
      <FormRenderer
        schema={BASE_SCHEMA}
        recordMetadataFields={[createTextField('project_name', 'Project', 'metadata_project')]}
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
      />
    );

    const input = await screen.findByLabelText('Project');
    expect(input.value).toBe('Project A');

    fireEvent.change(input, { target: { value: 'Project B' } });

    await waitFor(() => {
      expect(events.at(-1)?.snapshot.raw_values.project_name).toBe('Project B');
    });
  });

  it('renders direct metadata display values without adding them to snapshots', async () => {
    const events = [];
    const submissions = [];
    const latitudeField = {
      ...createTextField('__record_latitude', 'Latitude', 'metadata_latitude'),
      read_only: true,
      displayValue: '48.856600',
    };

    render(
      <FormRenderer
        schema={FLAT_SCHEMA}
        recordMetadataFields={[latitudeField]}
        initialSnapshot={{
          raw_values: { flat_name: 'Alpha' },
          repeatable: {},
          timestamps: {
            created_at_client: '2026-03-29T10:00:00.000Z',
            updated_at_client: '2026-03-29T10:05:00.000Z',
            created_at_server: null,
            updated_at_server: null,
          },
        }}
        onSnapshotChange={(snapshot) => events.push(snapshot)}
        onSubmit={(record) => submissions.push(record)}
      />
    );

    expect((await screen.findByLabelText('Latitude')).value).toBe('48.856600');
    await waitFor(() => expect(events.length).toBeGreaterThan(0));
    expect(events.at(-1)?.raw_values).not.toHaveProperty('__record_latitude');

    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(submissions).toHaveLength(1);
    expect(submissions[0]?.form_values).not.toHaveProperty('__record_latitude');
  });

  it('can force the sidebar visible even when the form has no sections yet', async () => {
    render(<FormRenderer schema={FLAT_SCHEMA} forceShowNavigationPanel={true} />);

    expect(screen.getByRole('navigation', { name: 'Form sidebar' })).toBeTruthy();
    expect(
      screen.getByText('Submit or validate the form to view validation results.')
    ).toBeTruthy();
  });

  it('opens a repeatable create modal from drilldown add without crashing', async () => {
    render(
      <FormRenderer
        schema={BASE_SCHEMA}
        forceShowNavigationPanel={true}
        headerAccessory={<div data-testid="static-accessory">Static accessory</div>}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'View' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Add' })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => {
      expect(screen.getByRole('group', { name: 'Repeatable entry summary' })).toBeTruthy();
    });

    expect(screen.getAllByRole('navigation', { name: 'Form sidebar' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
    expect(screen.getAllByTestId('static-accessory')).toHaveLength(1);
  });
});
