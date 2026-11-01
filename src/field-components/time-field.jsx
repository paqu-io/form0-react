import React, { useEffect, useRef, useState } from 'react';
import * as styles from '../field-renderer.css.js';

const timeText = (value) => (typeof value === 'string' ? value : '');
const completeTime = (value) => (/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value) ? `${value}:00` : value);

export function TimeFieldComponent({ value, onChange, onKeyDown, readOnly, inputProps = {} }) {
  const [text, setText] = useState(() => timeText(value));
  const pendingValues = useRef([]);
  const { onBlur: inputOnBlur, ...restInputProps } = inputProps;

  useEffect(() => {
    // Worker replies can acknowledge earlier keystrokes after newer ones have been typed.
    // Consume those echoes without rewriting the text or caret; external writes still replace it.
    const echo = pendingValues.current.lastIndexOf(value);
    if (echo >= 0) {
      pendingValues.current.splice(0, echo + 1);
    } else {
      pendingValues.current = [];
      setText(timeText(value));
    }
  }, [value]);

  const handleChange = (event) => {
    if (typeof onChange !== 'function' || readOnly) return;
    const nextText = event.target.value;
    setText(nextText);
    const nextValue = nextText === '' ? null : completeTime(nextText);
    if (nextValue !== value) pendingValues.current.push(nextValue);
    onChange(nextValue);
  };

  const handleBlur = (event) => {
    if (!readOnly) setText(completeTime(text));
    inputOnBlur?.(event);
  };

  return (
    <input
      type="text"
      placeholder="HH:MM[:SS]"
      spellCheck={false}
      value={text}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={onKeyDown}
      readOnly={readOnly}
      disabled={readOnly}
      className={styles.input}
      {...restInputProps}
    />
  );
}
