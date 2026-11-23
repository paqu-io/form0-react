// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { buildingPlanFieldNote, buildingPlanFieldTag } from '../src/building-plan/field-tag.js';
import { PlanFieldTag } from '../src/building-plan/plan-field-tag.jsx';

// Its styles need the build's vanilla-extract step: class names stand in for them here.
vi.mock('../src/building-plan/plan-field-tag.css.js', () => ({
  root: 'root',
  shared: 'shared',
  note: 'note',
  noteTitle: 'note-title',
  noteBody: 'note-body',
}));

// A shared wall shown as shared (2026-11-23, decided with a mockup): a whole-wall field says
// "Whole wall", or "Shared wall" when other rooms share the wall, its tag then a button opening a
// note that names them. A side's field keeps "Room side"; a free wall's own fields no tag.

const whole = (sharedWith = []) => ({
  scope: 'physical_wall',
  source: { mode: 'inherit', scope: 'room' },
  sharedWith,
});
const room = (name) => ({ roomId: name, name });

describe('a building plan field’s tag', () => {
  it('names a whole-wall field shared or not; a side’s field and the outside as before', () => {
    expect(buildingPlanFieldTag(whole())).toBe('Whole wall');
    expect(buildingPlanFieldTag(whole([room('Bedroom (room 2)')]))).toBe('Shared wall');
    expect(buildingPlanFieldTag({ scope: 'wall_face', source: { mode: 'inherit' } })).toBe(
      'Room side'
    );
    expect(buildingPlanFieldTag({ scope: 'wall_face', outside: true })).toBe('Exterior');
    // A free wall's own field: no tag (nothing shares it).
    expect(buildingPlanFieldTag(whole(), () => true)).toBeNull();
  });

  it('opens a note naming the rooms that share the wall, and only then', () => {
    expect(buildingPlanFieldNote(whole([room('Bedroom (room 2)')]))).toEqual({
      title: 'Shared with Bedroom (room 2)',
      body: 'This wall stands between both rooms, so a value set here applies to Bedroom (room 2) too.',
    });
    expect(buildingPlanFieldNote(whole([room('Kitchen'), room('Hall'), room('Bath')]))).toEqual({
      title: 'Shared with Kitchen, Hall and Bath',
      body: 'This wall stands between these rooms, so a value set here applies to Kitchen, Hall and Bath too.',
    });
    expect(buildingPlanFieldNote(whole())).toBeNull();
    expect(buildingPlanFieldNote({ scope: 'wall_face', source: {}, sharedWith: [] })).toBeNull();
  });
});

describe('the tag on screen', () => {
  afterEach(cleanup);
  const note = { title: 'Shared with Kitchen', body: 'A value set here applies to Kitchen too.' };

  it('is plain text without a note', () => {
    render(<PlanFieldTag text="Whole wall" className="tag" />);
    expect(screen.getByText('Whole wall').tagName).toBe('SPAN');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('opens its note on a click; Esc and a click elsewhere close it', () => {
    render(
      <div>
        <PlanFieldTag text="Shared wall" note={note} className="tag" />
        <p>Elsewhere</p>
      </div>
    );
    const tag = screen.getByRole('button', { name: 'Shared wall: Shared with Kitchen' });
    expect(tag.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(tag);
    expect(tag.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('status').textContent).toBe(note.title + note.body);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(tag.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(tag);
    fireEvent.pointerDown(screen.getByText('Elsewhere'));
    expect(tag.getAttribute('aria-expanded')).toBe('false');
  });
});
