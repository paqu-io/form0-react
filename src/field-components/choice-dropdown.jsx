// The dropdown of single and multiple choice fields (display "default"), searchable or not
// (review of 2026-11-18).
//
// - The field looks like the form's inputs and shows the chosen label; multiple choice shows as
//   many labels as fit, then "+n". An × clears the choice.
// - It opens a panel under the field (above it when there is no room below): a search box when
//   the field is searchable (matches anywhere in the label, ignoring case and accents), the
//   options, then "Other" when the field allows it, never filtered.
// - Keys: ↓ ↑ Enter or Space open; in the panel ↓ ↑ move, Enter picks (Space too without the
//   search box), Escape closes and returns to the field, Tab closes. Without the search box,
//   typing jumps to the first option that starts with the letters typed.
// - Single choice closes on pick; multiple choice stays open and toggles.
// - The panel is rendered in place, not in a portal, so it also works inside a host's <dialog>.
import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import * as styles from '../choice-dropdown.css.js';
import { filterOptions, typeAheadIndex } from '../utils/choice-search.js';
import { ChoiceDropdownPanel } from './choice-dropdown-panel.jsx';
import {
  DROPDOWN_ATTRIBUTE,
  OPEN_ATTRIBUTE,
  OTHER_VALUE,
  placementFor,
  useFittingCount,
} from './choice-dropdown-layout.js';

export { OTHER_VALUE, isDropdownEvent, isOpenDropdownEvent } from './choice-dropdown-layout.js';

const TYPE_AHEAD_MS = 700;

/**
 * @param {object} props
 * @param {string} props.id the field's id (its label points at the trigger)
 * @param {string} [props.labelledBy] the label's id
 * @param {{ value: string, label: string }[]} props.options
 * @param {{ value: string, label: string } | null} [props.otherOption] "Other", when allowed
 * @param {string[]} props.selected chosen values, OTHER_VALUE included when "Other" is chosen
 * @param {boolean} [props.multiple]
 * @param {boolean} [props.searchable]
 * @param {string} props.placeholder
 * @param {boolean} [props.disabled] read-only
 * @param {boolean} [props.required]
 * @param {boolean} [props.invalid]
 * @param {(value: string) => void} props.onPick single: choose; multiple: toggle
 * @param {() => void} props.onClear
 * @param {(event: FocusEvent) => void} [props.onFocus]
 * @param {(event: KeyboardEvent) => void} [props.onKeyDown] keys the closed field does not use
 */
export function ChoiceDropdown({
  id,
  labelledBy,
  options,
  otherOption = null,
  selected,
  multiple = false,
  searchable = false,
  placeholder,
  disabled = false,
  required = false,
  invalid = false,
  onPick,
  onClear,
  onFocus,
  onKeyDown,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [placement, setPlacement] = useState('bottom');
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);
  const areaRef = useRef(null);
  const measureRef = useRef(null);
  const typed = useRef({ text: '', at: 0 });
  const uid = useId();
  const listId = `${uid}-list`;
  const valueId = `${uid}-value`;
  const optionId = (index) => `${uid}-option-${index}`;

  const chosen = new Set(selected);
  const matches = searchable ? filterOptions(options, query) : options;
  const rows = otherOption ? [...matches, otherOption] : matches;
  const chosenLabels = [
    ...options.filter((option) => chosen.has(option.value)).map((option) => option.label),
    ...(otherOption && chosen.has(otherOption.value) ? [otherOption.label] : []),
  ];
  const fitting = useFittingCount(multiple ? chosenLabels : [], areaRef, measureRef);
  const hasValue = chosenLabels.length > 0;
  const visibleLabels = multiple ? chosenLabels.slice(0, Math.max(fitting, 1)) : chosenLabels;
  const moreCount = chosenLabels.length - visibleLabels.length;

  const close = (focusTrigger = true) => {
    setOpen(false);
    setQuery('');
    if (focusTrigger) triggerRef.current?.focus();
  };
  const openPanel = () => {
    if (disabled) return;
    const all = otherOption ? [...options, otherOption] : options;
    const firstChosen = all.findIndex((row) => chosen.has(row.value));
    setQuery('');
    setActive(firstChosen >= 0 ? firstChosen : 0);
    setPlacement(placementFor(rootRef.current));
    setOpen(true);
  };
  const toggle = () => (open ? close() : openPanel());
  const pick = (index) => {
    const row = rows[index];
    if (!row) return;
    onPick(row.value);
    if (multiple) setActive(index);
    // "Other" leaves the focus to the text input that appears under the field.
    else close(row.value !== OTHER_VALUE);
  };

  // Focus moves into the panel when it opens.
  useEffect(() => {
    if (open) (searchable ? searchRef.current : listRef.current)?.focus();
  }, [open, searchable]);

  // A press outside closes it.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) close(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  });

  useEffect(() => {
    if (open) document.getElementById(optionId(active))?.scrollIntoView?.({ block: 'nearest' });
    // optionId only depends on the stable uid.
  }, [open, active]);

  const onTriggerKeyDown = (event) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      openPanel();
      return;
    }
    onKeyDown?.(event);
  };

  const typeAhead = (character) => {
    const now = Date.now();
    const text =
      now - typed.current.at < TYPE_AHEAD_MS ? typed.current.text + character : character;
    typed.current = { text, at: now };
    const found = typeAheadIndex(rows, text);
    if (found >= 0) setActive(found);
  };

  const onPanelKeyDown = (event) => {
    const last = rows.length - 1;
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault();
        setActive((index) =>
          event.key === 'ArrowDown' ? Math.min(index + 1, last) : Math.max(index - 1, 0)
        );
        return;
      case 'Home':
      case 'End':
        if (searchable) return;
        event.preventDefault();
        setActive(event.key === 'Home' ? 0 : last);
        return;
      case 'Enter':
        event.preventDefault();
        pick(active);
        return;
      case 'Escape':
        event.preventDefault();
        close();
        return;
      case 'Tab':
        close(false);
        return;
      case ' ':
        if (searchable) return;
        event.preventDefault();
        pick(active);
        return;
      default:
        if (!searchable && event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
          if (!event.altKey) typeAhead(event.key);
        }
    }
  };

  return (
    <div
      ref={rootRef}
      className={styles.root}
      {...{ [DROPDOWN_ATTRIBUTE]: '' }}
      {...(open ? { [OPEN_ATTRIBUTE]: '' } : {})}
    >
      <div
        className={styles.field}
        data-open={open ? 'true' : undefined}
        data-invalid={invalid ? 'true' : undefined}
        data-disabled={disabled ? 'true' : undefined}
      >
        <button
          ref={triggerRef}
          type="button"
          id={id}
          className={styles.trigger}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-labelledby={labelledBy ? `${labelledBy} ${valueId}` : valueId}
          aria-required={required || undefined}
          aria-invalid={invalid || undefined}
          onClick={toggle}
          onKeyDown={onTriggerKeyDown}
          onFocus={onFocus}
        >
          <span ref={areaRef} className={styles.valueArea} aria-hidden="true">
            <span className={hasValue ? styles.value : styles.placeholder}>
              {hasValue ? visibleLabels.join(', ') : placeholder}
            </span>
            {moreCount > 0 ? <span className={styles.more}>+{moreCount}</span> : null}
            <span ref={measureRef} className={styles.measure} />
          </span>
          <span id={valueId} className={styles.srOnly}>
            {hasValue ? chosenLabels.join(', ') : placeholder}
          </span>
        </button>
        {hasValue && !disabled ? (
          <button
            type="button"
            className={styles.clear}
            aria-label="Clear"
            onClick={() => {
              onClear();
              close();
            }}
          >
            <X size={14} strokeWidth={2} aria-hidden="true" />
          </button>
        ) : null}
        <span className={styles.chevron} aria-hidden="true" onClick={toggle}>
          <ChevronDown size={16} strokeWidth={2} />
        </span>
      </div>

      {open ? (
        <ChoiceDropdownPanel
          listId={listId}
          optionId={optionId}
          placement={placement}
          searchable={searchable}
          multiple={multiple}
          query={query}
          onQuery={(next) => {
            setQuery(next);
            setActive(0);
          }}
          rows={rows}
          matchCount={matches.length}
          chosen={chosen}
          active={active}
          onActive={setActive}
          onPick={pick}
          onKeyDown={onPanelKeyDown}
          labelledBy={labelledBy}
          chosenCount={chosenLabels.length}
          searchRef={searchRef}
          listRef={listRef}
        />
      ) : null}
    </div>
  );
}
