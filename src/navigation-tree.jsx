import React, { useState, useCallback, useMemo, useEffect } from 'react';
import * as styles from './navigation-tree.css.js';
import { getValidationPage, VALIDATION_PAGE_SIZE } from './utils/validation-pagination.js';

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
        {!hasChildren && <span className={styles.navigationToggleSpacer} aria-hidden="true" />}
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
  onResolveHiddenValue,
  forceRender = false,
}) {
  const [issueOffset, setIssueOffset] = useState(0);
  const page = getValidationPage(issueOffset, validationIssues.length);
  useEffect(() => setIssueOffset(page.offset), [page.offset]);
  const sectionTree = useMemo(() => {
    if (!sections || sections.length === 0) return [];
    return sections;
  }, [sections]);

  const hasSections = sectionTree && sectionTree.length > 0;
  const hasValidationIssues = Array.isArray(validationIssues) && validationIssues.length > 0;
  const shouldRenderNavigation =
    forceRender || hasSections || validationEnabled || hasValidationIssues;
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
        {validationIssues.slice(page.offset, page.end).map((issue) => (
          <li key={issue.id} className={styles.validationItem}>
            <ValidationFinding
              issue={issue}
              onSelect={onSelectValidationIssue}
              onResolve={onResolveHiddenValue}
            />
          </li>
        ))}
        {page.hasPages && (
          <li className={styles.validationPager}>
            <button
              type="button"
              className={styles.validationPageButton}
              aria-label="Previous"
              title="Previous findings"
              disabled={!page.hasPrevious}
              onClick={() => setIssueOffset(page.offset - VALIDATION_PAGE_SIZE)}
            >
              <span aria-hidden="true">‹</span>
            </button>
            <span className={styles.validationPageCount} aria-live="polite">
              {page.offset + 1}–{page.end} of {validationIssues.length}
            </span>
            <button
              type="button"
              className={styles.validationPageButton}
              aria-label="Next"
              title="Next findings"
              disabled={!page.hasNext}
              onClick={() => setIssueOffset(page.offset + VALIDATION_PAGE_SIZE)}
            >
              <span aria-hidden="true">›</span>
            </button>
          </li>
        )}
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

function ValidationFinding({ issue, onSelect, onResolve }) {
  const [busy, setBusy] = useState(false);
  const content = (
    <>
      <div className={styles.validationHeader}>
        <span>{issue.label}</span>
        <span className={styles.validationField}>
          {[issue.recordPathLabel, issue.fieldName || 'Record'].filter(Boolean).join(' · ')}
        </span>
      </div>
      <div className={styles.validationMessage}>
        {(issue.messages?.length ? issue.messages : ['Validation error']).map((message, index) => (
          <span key={index}>{message}</span>
        ))}
      </div>
    </>
  );
  if (!issue.hidden)
    return (
      <button type="button" className={styles.validationButton} onClick={() => onSelect?.(issue)}>
        {content}
      </button>
    );
  return (
    <div className={styles.validationButton}>
      {content}
      <p>
        This value is hidden. Make the field visible to correct it, or ask the application to
        resolve it.
      </p>
      {onResolve ? (
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onResolve(issue);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? 'Resolving…' : 'Resolve hidden value'}
        </button>
      ) : null}
    </div>
  );
}
