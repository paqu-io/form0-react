import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { ChevronRight, ChevronsRight } from 'lucide-react';
import * as styles from './navigation-tree.css.js';
import { ValidationPanel } from './validation-panel.jsx';

const NAVIGATION_INDENT_STEP = 14;

// Sections that open separately get a mark; inline sections get none.
function sectionKind(node) {
  // One chevron: opens separately. Two: opens separately and holds several entries.
  if (node.type === 'RepeatableSection') return { Icon: ChevronsRight, text: 'repeatable section' };
  if (node.display === 'drilldown') return { Icon: ChevronRight, text: 'opens separately' };
  return null;
}

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
  const kind = sectionKind(node);

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
          // A description, not part of the name: the link is still found by its label alone.
          aria-description={kind ? kind.text : undefined}
        >
          <span className={styles.navigationLinkLabel}>{truncatedLabel}</span>
          {kind && (
            <span className={styles.navigationLinkKind} title={kind.text} aria-hidden="true">
              <kind.Icon size={14} strokeWidth={2} />
            </span>
          )}
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
  // Counts the Saves or Submits that validation stopped (4a hand test, 2026-11-25).
  failedAttempt = 0,
}) {
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
    if (!hasSections) {
      setActiveTab('validation');
    } else if (activeTab === 'validation' && !validationEnabled && hasSections) {
      setActiveTab('navigation');
    }
  }, [activeTab, hasSections, validationEnabled]);

  // A Save or Submit validation stopped: the Validation tab opens, its first finding takes the
  // focus, and screen readers hear why. Once per attempt, when its findings are there.
  const [focusFirst, setFocusFirst] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const handledAttempt = useRef(failedAttempt);
  useEffect(() => {
    if (failedAttempt === handledAttempt.current || !hasValidationIssues) return;
    handledAttempt.current = failedAttempt;
    const count = validationIssues.length;
    setActiveTab('validation');
    setFocusFirst(true);
    setAnnouncement(`Not saved: ${count} ${count === 1 ? 'issue' : 'issues'} to fix.`);
  }, [failedAttempt, hasValidationIssues]);

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
        {/* Disabled without sections, like Validation before validation (was hidden). */}
        <button
          type="button"
          className={`${styles.navigationTabButton} ${
            activeTab === 'navigation' ? styles.navigationTabButtonActive : ''
          }`}
          onClick={() => setActiveTab('navigation')}
          disabled={!hasSections}
          data-active={activeTab === 'navigation' ? 'true' : 'false'}
        >
          <span>Navigation</span>
        </button>
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
          <span
            className={styles.navigationTabBadge}
            data-tone={validationEnabled && validationCount > 0 ? 'error' : undefined}
          >
            {validationCount}
          </span>
        </button>
      </div>
      <div className={styles.navigationTabPanel}>
        {activeTab === 'validation' ? (
          <ValidationPanel
            issues={validationIssues}
            enabled={validationEnabled}
            onSelect={onSelectValidationIssue}
            onResolve={onResolveHiddenValue}
            focusFirst={focusFirst}
            onFocused={() => setFocusFirst(false)}
          />
        ) : (
          renderNavigation()
        )}
      </div>
      <div className={styles.visuallyHidden} role="status">
        {announcement}
      </div>
    </nav>
  );
}
