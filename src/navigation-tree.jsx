import React, { useState, useCallback, useMemo } from 'react';
import * as styles from './navigation-tree.css.js';

function NavigationTreeNode({ node, activeSection, onNavigate, level = 0 }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const isActive = activeSection === node.id;

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
        <a className={linkClassName} onClick={handleClick} role="button" tabIndex={0}>
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
              onNavigate={onNavigate}
              level={level + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function NavigationTree({ sections, activeSection, onNavigate }) {
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
            onNavigate={onNavigate}
          />
        ))}
      </ul>
    </nav>
  );
}

