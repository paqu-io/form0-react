import { describe, expect, it } from 'vitest';
import {
  buildingPlanFindings,
  findingsInScope,
  indexPathOf,
  isFindingFixed,
  locatePlanRow,
  planIssueView,
  planSideStates,
} from '../src/building-plan/plan-findings.js';
import {
  drawFindingMarkers,
  elementAtPath,
  findingMarkerAnchors,
} from '../src/building-plan/draw/issue-markers.js';
import { BuildingPlanCanvas } from '../src/building-plan/legacy/building-plan-canvas.js';

const metadata = [{ repeatablesByNodeKey: { floors: { preferredKey: 'floors' } } }];
const record = {
  repeatable: {
    floors: [
      {
        id: 'f1',
        repeatable: {
          rooms: [
            {
              id: 'r1',
              repeatable: {
                walls: [
                  { id: 'w1', values: {} },
                  { id: 'w2', values: {}, repeatable: { windows: [{ id: 'o1', values: {} }] } },
                ],
              },
            },
          ],
        },
      },
    ],
  },
};
const part = (repeatableKey, instanceId, index) => ({
  repeatableKey,
  instanceId,
  identity: 'id',
  index,
});
const issues = [
  {
    id: 'a',
    fieldName: 'window_height',
    label: 'Height [m]',
    instancePath: [
      part('floors', 'f1', 0),
      part('rooms', 'r1', 0),
      part('walls', 'w2', 1),
      part('windows', 'o1', 0),
    ],
    recordPathLabel: 'Ground Floor / Kitchen / W2 / Window 1',
    messages: ['This field is required'],
  },
  {
    id: 'b',
    fieldName: 'wall_note',
    label: 'Wall note',
    instancePath: [
      part('floors', 'f1', 0),
      part('rooms', 'r1', 0),
      { repeatableKey: 'walls', identity: 'index', index: 0 },
    ],
    recordPathLabel: 'Ground Floor / Kitchen / W1',
    messages: ['This field is required'],
  },
  { id: 'c', fieldName: 'title', instancePath: [], messages: ['Required'] },
  { id: 'd', hidden: true, instancePath: [part('floors', 'f1', 0)], messages: ['x'] },
];

const findings = buildingPlanFindings({ metadata, record, issues });

describe('findings', () => {
  it('keeps the plan rows, as id paths from the floor, with one name per row', () => {
    expect(findings.map((finding) => finding.id)).toEqual(['a', 'b']);
    expect(findings[1].idPath).toEqual([
      { key: 'floors', id: 'f1' },
      { key: 'rooms', id: 'r1' },
      { key: 'walls', id: 'w1' },
    ]);
    expect(findings[0].names).toEqual(['Ground Floor', 'Kitchen', 'W2', 'Window 1']);
  });

  it('keeps those in a scope: the floor shown, an entry floor or room', () => {
    expect(findingsInScope(findings, [{ key: 'floors', id: 'f1' }])).toHaveLength(2);
    expect(
      findingsInScope(findings, [
        { key: 'floors', id: 'f1' },
        { key: 'rooms', id: 'r2' },
      ])
    ).toEqual([]);
  });

  it('names an item by the rows below the scope, innermost first, and marks each row once', () => {
    const view = planIssueView([...findings, findings[0]], {
      scopeDepth: 2,
      repeatable: record.repeatable,
    });
    expect(view.items.map((item) => item.title)).toEqual(['Window 1 · W2', 'W1', 'Window 1 · W2']);
    expect(view.items[0].detail).toBe('Height [m]: This field is required');
    expect(view.items[1].indexPath).toEqual([
      { key: 'floors', index: 0 },
      { key: 'rooms', index: 0 },
      { key: 'walls', index: 0 },
    ]);
    expect(view.markers).toHaveLength(2);
    // The room of a room entry is named by itself.
    const room = {
      ...findings[1],
      idPath: findings[1].idPath.slice(0, 2),
      names: ['Ground Floor', 'Kitchen'],
    };
    expect(
      planIssueView([room], { scopeDepth: 2, repeatable: record.repeatable }).items[0].title
    ).toBe('Kitchen');
  });

  it('drops a row the record no longer has', () => {
    expect(indexPathOf(record.repeatable, [{ key: 'floors', id: 'gone' }])).toBeNull();
    expect(planIssueView(findings, { repeatable: { floors: [] } }).items).toEqual([]);
  });

  it("counts a finding fixed when the dialog's draft shows the field filled, or the row gone", () => {
    const [finding] = findings;
    const draft = (window) => ({
      floors: [
        {
          id: 'f1',
          repeatable: {
            rooms: [
              {
                id: 'r1',
                repeatable: {
                  walls: [{ id: 'w2', repeatable: { windows: window ? [window] : [] } }],
                },
              },
            ],
          },
        },
      ],
    });
    // Not evaluated yet: kept.
    expect(isFindingFixed(finding, draft({ id: 'o1', values: {} }))).toBe(false);
    const evaluated = (value, extra = {}) => ({
      id: 'o1',
      values: { window_height: value },
      required: { window_height: true },
      ...extra,
    });
    expect(isFindingFixed(finding, draft(evaluated(null)))).toBe(false);
    expect(isFindingFixed(finding, draft(evaluated(1.2)))).toBe(true);
    expect(
      isFindingFixed(finding, draft(evaluated(1.2, { errors: { window_height: 'Too tall' } })))
    ).toBe(false);
    expect(
      isFindingFixed(
        { ...finding, fieldName: 'kind' },
        draft({ id: 'o1', values: { kind: { choice: [], other: [] } }, required: { kind: true } })
      )
    ).toBe(false);
    expect(isFindingFixed(finding, draft(null))).toBe(true);
  });
});

describe('outside copies', () => {
  const sided = [
    {
      ...metadata[0],
      repeatables: [
        {
          fields: [
            { dataName: 'finish', binding: { scope: 'wall_face' } },
            { dataName: 'finish_outside', binding: { scope: 'wall_face', outside: true } },
          ],
        },
      ],
    },
  ];
  const wallPath = issues[1].instancePath;

  it('finds the row of a finding from the floor, and the floors holding it', () => {
    expect(locatePlanRow(record, wallPath, new Set(['floors']))).toEqual({
      idPath: findings[1].idPath,
      floorDepth: 0,
      floors: record.repeatable.floors,
    });
    expect(locatePlanRow(record, wallPath, new Set(['other']))).toBeNull();
  });

  it('reads the state of an outside copy through one editor per plan, nothing for the rest', () => {
    const made = [];
    const states = planSideStates({
      metadata: sided,
      record,
      createEditor: (meta, repeatable) => {
        made.push(repeatable);
        return { fieldState: (path, dataName) => ({ path, dataName, outside: true }) };
      },
    });
    expect(states('finish', wallPath)).toBeNull();
    expect(states('finish_outside', wallPath)).toEqual({
      path: findings[1].idPath,
      dataName: 'finish_outside',
      outside: true,
    });
    states('finish_outside', wallPath);
    expect(made).toEqual([{ floors: record.repeatable.floors }]);
    // A plan without outside copies makes no editor.
    const plain = planSideStates({ metadata, record, createEditor: () => made.push('plain') });
    expect(plain('finish_outside', wallPath)).toBeNull();
    expect(made).toHaveLength(1);
  });
});

describe('markers', () => {
  const plan = {
    zoomLevel: 1,
    rooms: [
      {
        id: 'r1',
        path: [
          { key: 'floors', index: 0 },
          { key: 'rooms', index: 0 },
        ],
        rect: { x: 0, y: 0, width: 100, height: 80 },
        _labelRect: { x: 30, y: 30, width: 40, height: 20 },
      },
    ],
    walls: [
      {
        id: 'face',
        path: [
          { key: 'floors', index: 0 },
          { key: 'rooms', index: 0 },
          { key: 'walls', index: 0 },
        ],
        points: [
          { x: 0, y: 0 },
          { x: 60, y: 0 },
          { x: 60, y: 40 },
        ],
      },
    ],
  };

  it('finds the element of a row by its index path, none for a floor', () => {
    expect(elementAtPath(plan, plan.walls[0].path)).toMatchObject({ collection: 'walls' });
    expect(elementAtPath(plan, [{ key: 'floors', index: 0 }])).toBeNull();
  });

  it("hangs a wall's marker halfway along its face and a room's at its name", () => {
    expect(findingMarkerAnchors(plan, [plan.walls[0].path, plan.rooms[0].path])).toEqual([
      { x: 50, y: 0 },
      { x: 70, y: 30 },
    ]);
  });

  it('draws a disc per marker in the colour given', () => {
    const fills = [];
    const ctx = new Proxy(
      {},
      {
        get: (target, name) =>
          name in target
            ? target[name]
            : name === 'fill'
              ? () => fills.push(target.fillStyle)
              : () => {},
        set: (target, name, value) => ((target[name] = value), true),
      }
    );
    drawFindingMarkers(
      ctx,
      [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ],
      { color: 'red', ground: 'white' }
    );
    expect(fills).toEqual(['red', 'red']);
  });
});

it('selects the element of a row from outside, as a click does', () => {
  const selections = [];
  const c = Object.assign(Object.create(BuildingPlanCanvas.prototype), {
    rooms: [{ id: 'r1', path: [{ key: 'rooms', index: 0 }] }],
    walls: [
      {
        id: 'face',
        roomId: 'r1',
        path: [
          { key: 'rooms', index: 0 },
          { key: 'walls', index: 0 },
        ],
      },
    ],
    doors: [],
    windows: [],
    columns: [],
    beams: [],
    selectedDoorId: 'd',
    onSelect: (selection) => selections.push(selection),
    updateButtonStates() {},
    render() {
      this.reportSelection();
    },
  });
  expect(
    c.selectRow([
      { key: 'rooms', index: 0 },
      { key: 'walls', index: 0 },
    ])
  ).toBe(true);
  expect(c.selectedWallId).toBe('face');
  expect(c.selectedDoorId).toBeNull();
  expect(c.selectedRoomId).toBe('r1');
  expect(selections.at(-1)).toMatchObject({ collection: 'walls', entry: { id: 'face' } });
  expect(c.selectRow([{ key: 'rooms', index: 3 }])).toBe(false);
});
