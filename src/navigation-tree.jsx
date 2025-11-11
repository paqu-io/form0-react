import React, { useState, useCallback, useMemo } from 'react';
import * as styles from './navigation-tree.css.js';

function NavigationTreeNode({ node, activeSection, highlightedSections, onNavigate, level = 0 }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const isActive = highlightedSections && highlightedSections.includes(node.id);

  const handleToggle = useCallback((e) => {
    e.stopPropagation();
    setIsExpanded((prev) => !prev);
  }, []);

  const handleClick = useCallback(() => {
    if (onNavigate) {
      onNavigate(node.id);
    }
  }, [node.id, onNavigate]);

  const linkClassName = isActive
    ? `${styles.navigationLink} ${styles.navigationLinkActive}`
    : styles.navigationLink;

  const linkStyle = level > 0 ? { paddingLeft: `${8 + level * 12}px` } : undefined;

  return (
    <li className={styles.navigationItem}>
      <div className={styles.navigationItemWithChildren}>
        {hasChildren && (
          <button
            type="button"
            className={styles.navigationToggle}
            onClick={handleToggle}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        )}
        <a className={linkClassName} onClick={handleClick} role="button" tabIndex={0} style={linkStyle}>
          {node.label}
        </a>
      </div>
      {hasChildren && isExpanded && (
        <ul className={styles.navigationNested}>
          {node.children.map((child) => (
            <NavigationTreeNode
              key={child.id}
              node={child}
              activeSection={activeSection}
              highlightedSections={highlightedSections}
              onNavigate={onNavigate}
              level={level + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function NavigationTree({ sections, activeSection, highlightedSections, onNavigate }) {
  const sectionTree = useMemo(() => {
    if (!sections || sections.length === 0) return [];
    return sections;
  }, [sections]);

  if (!sectionTree || sectionTree.length === 0) {
    return null;
  }

  return (
    <nav className={styles.navigationContainer} aria-label="Form sections navigation">
      <div className={styles.navigationTitle}>Sections</div>
      <ul className={styles.navigationTree}>
        {sectionTree.map((section) => (
          <NavigationTreeNode
            key={section.id}
            node={section}
            activeSection={activeSection}
            highlightedSections={highlightedSections}
            onNavigate={onNavigate}
          />
        ))}
      </ul>
    </nav>
  );
}

