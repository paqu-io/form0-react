// @vitest-environment jsdom
import React, { useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { getFieldComponent } from '../dist/index.js';

afterEach(cleanup);
const Time = getFieldComponent('TimeField');
function Editor({ initial = null, onChange = () => {}, readOnly = false, ...props }) {
  const [value, setValue] = useState(initial);
  return (
    <Time
      value={value}
      readOnly={readOnly}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
      inputProps={{ 'aria-label': 'Time' }}
      {...props}
    />
  );
}
it('retains partial typed times without discarding digits or rewriting completed minutes', () => {
  const changed = vi.fn();
  render(<Editor onChange={changed} />);
  const input = screen.getByLabelText('Time');
  for (const value of ['1', '11', '11:', '11:3', '11:30']) {
    fireEvent.change(input, { target: { value } });
    expect(input.value).toBe(value);
  }
  expect(changed).toHaveBeenLastCalledWith('11:30:00');
  fireEvent.blur(input);
  expect(input.value).toBe('11:30:00');
});
it('supports seconds, clearing, and invalid text that the engine can validate', () => {
  const changed = vi.fn();
  render(<Editor initial="11:30:00" onChange={changed} />);
  const input = screen.getByLabelText('Time');
  for (const value of ['11:30:', '11:30:4', '11:30:45', '99:99']) {
    fireEvent.change(input, { target: { value } });
    expect(input.value).toBe(value);
  }
  expect(changed).toHaveBeenLastCalledWith('99:99');
  fireEvent.change(input, { target: { value: '' } });
  expect(changed).toHaveBeenLastCalledWith(null);
});
it('reflects external values and reset while preserving blur callbacks and read-only behavior', () => {
  const blur = vi.fn(),
    changed = vi.fn();
  const { rerender } = render(
    <Time value="08:00:00" onChange={changed} inputProps={{ 'aria-label': 'Time', onBlur: blur }} />
  );
  const input = screen.getByLabelText('Time');
  fireEvent.change(input, { target: { value: '1' } });
  rerender(
    <Time value="12:40:00" onChange={changed} inputProps={{ 'aria-label': 'Time', onBlur: blur }} />
  );
  expect(input.value).toBe('12:40:00');
  fireEvent.blur(input);
  expect(blur).toHaveBeenCalledOnce();
  rerender(<Time value={null} onChange={changed} readOnly inputProps={{ 'aria-label': 'Time' }} />);
  expect(input.value).toBe('');
  expect(input.disabled).toBe(true);
  const calls = changed.mock.calls.length;
  fireEvent.change(input, { target: { value: '14:00' } });
  expect(changed.mock.calls).toHaveLength(calls);
});

it('does not let delayed worker echoes overwrite more recent keystrokes', () => {
  const onChange = vi.fn();
  const props = { onChange, inputProps: { 'aria-label': 'Time' } };
  const { rerender } = render(<Time value={null} {...props} />);
  const input = screen.getByLabelText('Time');
  for (const value of ['1', '11', '11:', '11:3', '11:30'])
    fireEvent.change(input, { target: { value } });
  for (const value of ['1', '11', '11:', '11:3', '11:30:00']) {
    rerender(<Time value={value} {...props} />);
    expect(input.value).toBe('11:30');
  }
  rerender(<Time value="08:15:00" {...props} />);
  expect(input.value).toBe('08:15:00');
  rerender(<Time value="1" {...props} />);
  expect(input.value).toBe('1');
});
