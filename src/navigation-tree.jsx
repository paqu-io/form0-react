import React, { useState, useCallback, useMemo, useEffect } from 'react';
import * as styles from './navigation-tree.css.js';
import { TableOfContents } from 'lucide-react';

const NAVIGATION_INDENT_STEP = 14;

function NavigationTreeNode({ node, highlightedSections, activeSectionId, onNavigate, level = 0 }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const isHighlighted = highlightedSections && highlightedSections.includes(node.id);
  const isActive = activeSectionId === node.id;

  const handleToggle = useCallback((e) => {
    e.stopPropagation();
    setIsExpanded((prev) => !prev);
  }, []);

  const handleClick = useCallback(() => {
    if (onNavigate) {
      onNavigate(node.id);
    }
  }, [node.id, onNavigate]);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleClick();
      }
    },
    [handleClick]
  );

  useEffect(() => {
    if (isActive) {
      setIsExpanded(true);
    }
  }, [isActive]);

  const linkClassName = [
    styles.navigationLink,
    isHighlighted ? styles.navigationLinkHighlight : null,
    isActive ? styles.navigationLinkActive : null,
  ]
    .filter(Boolean)
    .join(' ');

  const indentValue = level > 0 ? level * NAVIGATION_INDENT_STEP : 0;
  const indentStyle = indentValue > 0 ? { paddingLeft: `${indentValue}px` } : undefined;
  const nestedId = `${node.id}-children`;

  return (
    <li className={styles.navigationItem}>
      <div className={styles.navigationItemWithChildren} style={indentStyle}>
        {hasChildren && (
          <button
            type="button"
            className={styles.navigationToggle}
            onClick={handleToggle}
            aria-expanded={isExpanded}
            aria-controls={nestedId}
          >
            <span
              className={styles.navigationToggleIcon}
              data-expanded={isExpanded ? 'true' : 'false'}
              aria-hidden="true"
            />
            <span className={styles.visuallyHidden}>
              {isExpanded ? 'Collapse' : 'Expand'} {node.label}
            </span>
          </button>
        )}
        {!hasChildren && (
          <span className={styles.navigationToggleSpacer} aria-hidden="true" />
        )}
        <a
          className={linkClassName}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          role="button"
          tabIndex={0}
          aria-current={isActive ? 'true' : undefined}
        >
          {node.label}
        </a>
      </div>
      {hasChildren && isExpanded && (
        <ul className={styles.navigationNested} id={nestedId}>
          {node.children.map((child) => (
            <NavigationTreeNode
              key={child.id}
              node={child}
              highlightedSections={highlightedSections}
              activeSectionId={activeSectionId}
              onNavigate={onNavigate}
              level={level + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function NavigationTree({ sections, highlightedSections, activeSectionId, onNavigate }) {
  const sectionTree = useMemo(() => {
    if (!sections || sections.length === 0) return [];
    return sections;
  }, [sections]);

  if (!sectionTree || sectionTree.length === 0) {
    return null;
  }

  return (
    <nav className={styles.navigationContainer} aria-label="Form sections navigation">
      <div className={styles.navigationTitle}>
        <TableOfContents size={18} strokeWidth={2} />
        Navigation Tree
      </div>
      <ul className={styles.navigationTree}>
        {sectionTree.map((section) => (
          <NavigationTreeNode
            key={section.id}
            node={section}
            highlightedSections={highlightedSections}
            activeSectionId={activeSectionId}
            onNavigate={onNavigate}
          />
        ))}
      </ul>
    </nav>
  );
}
