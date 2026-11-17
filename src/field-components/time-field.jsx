import React, { useEffect, useRef, useState } from 'react';
import { Clock } from 'lucide-react';
import * as styles from '../field-renderer.css.js';
import { formatMaskedEntry } from '../utils/masked-entry.js';

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
    // ":" is added while digits are typed ("1430" shows "14:30"); see utils/masked-entry.js.
    const nextText = formatMaskedEntry(text, event.target.value, 'time');
    setText(nextText);
    const nextValue = nextText === '' ? null : completeTime(nextText);
    if (nextValue !== value) pendingValues.current.push(nextValue);
    onChange(nextValue);
  };

  // The browser's own time picker, opened from the clock button. It writes through the same
  // path as typing; typing itself is unchanged.
  const pickerRef = useRef(null);
  const openPicker = () => {
    try {
      pickerRef.current?.showPicker?.();
    } catch {
      // showPicker is unavailable or refused: typing still works.
    }
  };
  const handlePicked = (event) => {
    const picked = event.target.value;
    if (!picked) return;
    handleChange({ target: { value: completeTime(picked) } });
  };
  const pickerValue = /^\d{2}:\d{2}(:\d{2})?$/.test(text) ? text.slice(0, 5) : '';

  const handleBlur = (event) => {
    if (!readOnly) setText(completeTime(text));
    inputOnBlur?.(event);
  };

  return (
    <div className={styles.pickerControl}>
      <input
        type="text"
        placeholder="HH:MM"
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
      {readOnly ? null : (
        <>
          <button
            type="button"
            className={styles.pickerButton}
            onClick={openPicker}
            aria-label="Choose a time"
            title="Choose a time"
          >
            <Clock size={16} strokeWidth={2} aria-hidden="true" />
          </button>
          <input
            ref={pickerRef}
            type="time"
            className={styles.pickerNative}
            value={pickerValue}
            onChange={handlePicked}
            tabIndex={-1}
            aria-hidden="true"
          />
        </>
      )}
    </div>
  );
}
