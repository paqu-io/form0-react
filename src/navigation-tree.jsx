import React, { useState, useCallback, useMemo, useEffect } from 'react';
import * as styles from './navigation-tree.css.js';

const NAVIGATION_INDENT_STEP = 14;

function NavigationTreeNode({ node, highlightedSections, activeSectionId, onNavigate, level = 0 }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const isHighlighted = highlightedSections && highlightedSections.includes(node.id);
  const isActive = activeSectionId === node.id;
  const truncatedLabel =
    typeof node.label === 'string' && node.label.length > 42
      ? `${node.label.slice(0, 42)}…`
      : node.label;

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
          title={node.label || undefined}
        >
          {truncatedLabel}
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

export function NavigationTree({
  sections,
  highlightedSections,
  activeSectionId,
  onNavigate,
  validationIssues = [],
  validationEnabled = false,
  onSelectValidationIssue,
}) {
  const sectionTree = useMemo(() => {
    if (!sections || sections.length === 0) return [];
    return sections;
  }, [sections]);

  const hasSections = sectionTree && sectionTree.length > 0;
  const hasValidationIssues = Array.isArray(validationIssues) && validationIssues.length > 0;
  const shouldRenderNavigation = hasSections || validationEnabled || hasValidationIssues;
  const [activeTab, setActiveTab] = useState(hasSections ? 'navigation' : 'validation');

  useEffect(() => {
    if (!hasSections && validationEnabled) {
      setActiveTab('validation');
    } else if (activeTab === 'validation' && !validationEnabled && hasSections) {
      setActiveTab('navigation');
    }
  }, [activeTab, hasSections, validationEnabled]);

  if (!shouldRenderNavigation) {
    return null;
  }

  const renderNavigation = () => {
    if (!hasSections) {
      return <div className={styles.validationEmptyState}>This form has no sections.</div>;
    }
    return (
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
    );
  };

  const renderValidation = () => {
    if (!validationEnabled) {
      return (
        <div className={styles.validationEmptyState}>
          Submit or validate the form to view validation results.
        </div>
      );
    }
    if (!hasValidationIssues) {
      return <div className={styles.validationEmptyState}>No validation issues.</div>;
    }
    return (
      <ul className={styles.validationList}>
        {validationIssues.map((issue) => (
          <li key={issue.id} className={styles.validationItem}>
            <button
              type="button"
              className={styles.validationButton}
              onClick={() => onSelectValidationIssue?.(issue)}
            >
              <div className={styles.validationHeader}>
                <span>{issue.label}</span>
                <span className={styles.validationField}>{issue.fieldName}</span>
              </div>
              <div className={styles.validationMessage}>
                {(issue.messages && issue.messages.length > 0
                  ? issue.messages
                  : ['Validation error']
                ).map((message, idx) => (
                  <span key={`${issue.id}-message-${idx}`}>{message}</span>
                ))}
              </div>
            </button>
          </li>
        ))}
      </ul>
    );
  };

  const validationCount = validationIssues.length;
  const handleValidationTabClick = () => {
    if (!validationEnabled) {
      return;
    }
    setActiveTab('validation');
  };

  return (
    <nav className={styles.navigationContainer} aria-label="Form sidebar">
      <div className={styles.navigationTabs}>
        {hasSections && (
          <button
            type="button"
            className={`${styles.navigationTabButton} ${
              activeTab === 'navigation' ? styles.navigationTabButtonActive : ''
            }`}
            onClick={() => setActiveTab('navigation')}
            data-active={activeTab === 'navigation' ? 'true' : 'false'}
          >
            <span>Navigation</span>
          </button>
        )}
        <button
          type="button"
          className={`${styles.navigationTabButton} ${
            activeTab === 'validation' ? styles.navigationTabButtonActive : ''
          }`}
          onClick={handleValidationTabClick}
          disabled={!validationEnabled}
          data-active={activeTab === 'validation' ? 'true' : 'false'}
        >
          <span>Validation</span>
          <span className={styles.navigationTabBadge}>{validationCount}</span>
        </button>
      </div>
      <div className={styles.navigationTabPanel}>
        {activeTab === 'validation' ? renderValidation() : renderNavigation()}
      </div>
    </nav>
  );
}
