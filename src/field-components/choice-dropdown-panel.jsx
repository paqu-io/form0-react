// The panel of the choice dropdown: the search box (searchable fields), the options, "Other"
// after a separator, and a footer with the keys. Keyboard handling stays in ChoiceDropdown,
// which passes it in as onKeyDown.
import React from 'react';
import { Check, Search } from 'lucide-react';
import * as styles from '../choice-dropdown-panel.css.js';

/**
 * @param {object} props
 * @param {string} props.listId
 * @param {(index: number) => string} props.optionId
 * @param {'top' | 'bottom'} props.placement
 * @param {boolean} props.searchable
 * @param {boolean} props.multiple
 * @param {string} props.query
 * @param {(query: string) => void} props.onQuery
 * @param {{ value: string, label: string }[]} props.rows the options shown, then "Other"
 * @param {number} props.matchCount how many rows are options (the rest is "Other")
 * @param {Set<string>} props.chosen
 * @param {number} props.active
 * @param {(index: number) => void} props.onActive
 * @param {(index: number) => void} props.onPick
 * @param {(event: KeyboardEvent) => void} props.onKeyDown
 * @param {string} [props.labelledBy]
 * @param {number} props.chosenCount
 * @param {{ current: HTMLInputElement | null }} props.searchRef
 * @param {{ current: HTMLUListElement | null }} props.listRef
 */
export function ChoiceDropdownPanel({
  listId,
  optionId,
  placement,
  searchable,
  multiple,
  query,
  onQuery,
  rows,
  matchCount,
  chosen,
  active,
  onActive,
  onPick,
  onKeyDown,
  labelledBy,
  chosenCount,
  searchRef,
  listRef,
}) {
  const key = (text) => <kbd className={styles.key}>{text}</kbd>;
  const footer = multiple ? (
    <span>{chosenCount} selected</span>
  ) : searchable ? (
    <span>
      {key('↑')} {key('↓')} move · {key('Enter')} pick
    </span>
  ) : (
    <span>Type to jump · {key('Enter')} pick</span>
  );

  return (
    <div className={styles.panel} data-placement={placement}>
      {searchable ? (
        <div className={styles.search}>
          <span className={styles.searchIcon}>
            <Search size={15} strokeWidth={2} aria-hidden="true" />
          </span>
          <input
            ref={searchRef}
            type="text"
            className={styles.searchInput}
            role="combobox"
            aria-expanded="true"
            aria-autocomplete="list"
            aria-controls={listId}
            aria-activedescendant={rows.length ? optionId(active) : undefined}
            aria-label="Search the options"
            placeholder="Search..."
            autoComplete="off"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            onKeyDown={onKeyDown}
          />
        </div>
      ) : null}
      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        className={styles.list}
        aria-multiselectable={multiple || undefined}
        aria-labelledby={labelledBy}
        tabIndex={searchable ? -1 : 0}
        aria-activedescendant={!searchable && rows.length ? optionId(active) : undefined}
        onKeyDown={searchable ? undefined : onKeyDown}
      >
        {matchCount === 0 ? (
          <li className={styles.empty} role="presentation">
            No results
          </li>
        ) : null}
        {rows.map((row, index) => {
          const isOther = index >= matchCount;
          const isChosen = chosen.has(row.value);
          return (
            <React.Fragment key={row.value}>
              {isOther ? <li className={styles.separator} role="presentation" /> : null}
              <li
                id={optionId(index)}
                role="option"
                aria-selected={isChosen}
                data-active={index === active ? 'true' : undefined}
                className={styles.option}
                onMouseMove={() => (index === active ? null : onActive(index))}
                // Keeps the focus in the search box or the list.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onPick(index)}
              >
                {multiple ? (
                  <span className={styles.box} aria-hidden="true">
                    {isChosen ? <Check size={12} strokeWidth={3} /> : null}
                  </span>
                ) : null}
                <span className={isOther ? styles.otherLabel : styles.optionLabel}>
                  {row.label}
                </span>
                {!multiple ? (
                  <span className={styles.check} aria-hidden="true">
                    {isChosen ? <Check size={14} strokeWidth={2.5} /> : null}
                  </span>
                ) : null}
              </li>
            </React.Fragment>
          );
        })}
      </ul>
      <div className={styles.footer} aria-hidden="true">
        {footer}
        <span>{key('Esc')} close</span>
      </div>
    </div>
  );
}
