import React, { useMemo, useState, useRef, useEffect } from 'react';
import * as styles from './field-renderer.css.js';
import { useFieldRegistry } from './field-registry-context.jsx';

const LABEL_SIDE = 'side';
const INFO_ICON = 'ℹ️';
const IMAGE_ICON = '🖼️';

export function FieldRenderer({
  field,
  value,
  onChange,
  readOnly,
  required,
  error,
  labelPosition = 'top',
  labelWidthPercent = 30,
  onKeyDown,
}) {
  const registry = useFieldRegistry();
  const FieldComponent = registry.getFieldComponent(field.type);
  const elementKey = field.key || field.data_name;
  const isLabelField = field.type === 'LabelField';

  if (!FieldComponent) {
    return (
      <div
        className={`${styles.fieldWrapper} ${styles.labelTop}`}
        role="group"
        aria-labelledby={`${elementKey}-label`}
      >
        <label id={`${elementKey}-label`} className={styles.label}>
          {field.label}
        </label>
        <div className={styles.error}>Unsupported field type: {field.type}</div>
      </div>
    );
  }

  const wrapperClass =
    labelPosition === LABEL_SIDE ? styles.labelSide : styles.labelTop;
  const labelClass =
    labelPosition === LABEL_SIDE
      ? `${styles.label} ${styles.labelSideFixed}`
      : styles.label;
  const wrapperStyle =
    labelPosition === LABEL_SIDE
      ? { '--label-width': `${labelWidthPercent}%` }
      : undefined;

  const baseId = field.key || field.data_name;
  const labelId = `${baseId}-label`;
  const isSignatureField = field.type === 'SignatureField';
  const isGroupedControl =
    (field.type === 'SingleChoiceField' && field.display === 'radio') ||
    (field.type === 'MultiChoiceField' && field.display === 'checkbox') ||
    field.type === 'BooleanField' ||
    isSignatureField;
  const shouldRenderLabelElement = !isLabelField;

  const inputProps = shouldRenderLabelElement
    ? {
        name: field.data_name,
        readOnly,
        required,
        disabled: readOnly,
        id: baseId,
        ...(isGroupedControl ? { 'aria-labelledby': labelId } : {}),
      }
    : {};

  const handleChange =
    onChange &&
    ((nextValue) => {
      onChange(nextValue);
    });

  const supportingImage = useMemo(() => {
    if (!field.supporting_image) return null;
    if (!field.supporting_image_path) return null;
    const displayMode = field.supporting_image_display || 'default';
    return { path: field.supporting_image_path, displayMode };
  }, [field.supporting_image, field.supporting_image_path, field.supporting_image_display]);

  const [isDescriptionOpen, setDescriptionOpen] = useState(false);
  const [isImageOpen, setImageOpen] = useState(false);

  const descriptionMode = field.description_mode || 'default';
  const hasDialogDescription =
    field.description && descriptionMode !== 'subtext' && typeof field.description === 'string';
  const hasSubtextDescription =
    field.description && descriptionMode === 'subtext' && typeof field.description === 'string';

  const hasDialogImage =
    supportingImage && supportingImage.displayMode === 'dialog';
  const showInlineImage =
    supportingImage && supportingImage.displayMode !== 'dialog';

  const descriptionDialogRef = useRef(null);
  const imageDialogRef = useRef(null);

  useEffect(() => {
    const previousActiveElement = typeof document !== 'undefined' ? document.activeElement : null;
    const dialog = descriptionDialogRef.current;
    if (dialog && isDescriptionOpen) {
      dialog.showModal();
      dialog.addEventListener(
        'close',
        () => {
          setDescriptionOpen(false);
          previousActiveElement?.focus?.();
        },
        { once: true }
      );
    }
    return () => {
      if (dialog && dialog.open) {
        dialog.close();
      }
    };
  }, [isDescriptionOpen]);

  useEffect(() => {
    const previousActiveElement = typeof document !== 'undefined' ? document.activeElement : null;
    const dialog = imageDialogRef.current;
    if (dialog && isImageOpen) {
      dialog.showModal();
      dialog.addEventListener(
        'close',
        () => {
          setImageOpen(false);
          previousActiveElement?.focus?.();
        },
        { once: true }
      );
    }
    return () => {
      if (dialog && dialog.open) {
        dialog.close();
      }
    };
  }, [isImageOpen]);

  const renderLabelControls = () => {
    const controls = [];

    if (supportingImage && supportingImage.displayMode === 'dialog') {
      controls.push(
        <button
          key="supporting-image"
          type="button"
          className={styles.infoIconButton}
          onClick={() => setImageOpen(true)}
          aria-label={`View supporting image for ${field.label || field.data_name}`}
          aria-haspopup="dialog"
          aria-expanded={isImageOpen}
        >
          {IMAGE_ICON}
        </button>
      );
    }

    if (hasDialogDescription) {
      controls.push(
        <button
          key="description"
          type="button"
          className={styles.infoIconButton}
          onClick={() => setDescriptionOpen(true)}
          aria-label={`View description for ${field.label || field.data_name}`}
          aria-haspopup="dialog"
          aria-expanded={isDescriptionOpen}
        >
          {INFO_ICON}
        </button>
      );
    }

    return controls;
  };

  const fieldInput = (
    <FieldComponent
      field={field}
      value={value}
      onChange={handleChange}
      onKeyDown={onKeyDown}
      readOnly={readOnly}
      inputProps={inputProps}
      className={isLabelField ? undefined : styles.input}
    />
  );

  const labelClassNames = [labelClass, styles.labelText];
  if (isLabelField) {
    labelClassNames.push(styles.labelFieldLabel);
  }

  const labelProps = {};
  if (!isGroupedControl) {
    labelProps.htmlFor = baseId;
  }
  if (isSignatureField) {
    labelProps.onClick = (event) => {
      if (typeof document === 'undefined') return;
      event.preventDefault();
      const target = document.getElementById(baseId);
      target?.focus?.();
    };
  }

  const labelNode = shouldRenderLabelElement ? (
    <label
      className={labelClassNames.join(' ')}
      id={labelId}
      {...labelProps}
    >
      {field.label}
      {required ? ' *' : ''}
    </label>
  ) : (
    <div className={labelClassNames.join(' ')} id={labelId} role="presentation">
      {field.label}
    </div>
  );

  return (
    <div
      className={`${styles.fieldWrapper} ${wrapperClass}`}
      style={wrapperStyle}
    >
      {labelPosition === LABEL_SIDE ? (
        <div className={styles.labelInputRow}>
          <div className={styles.labelRow}>
            {labelNode}
            {renderLabelControls()}
          </div>
          <div className={styles.inputWrapper}>{fieldInput}</div>
        </div>
      ) : (
        <>
          <div className={styles.labelRow}>
            {labelNode}
            {renderLabelControls()}
          </div>
          {fieldInput}
        </>
      )}

      {hasSubtextDescription && (
        <div className={styles.subtext}>{field.description}</div>
      )}

      {showInlineImage && (
        <img
          src={
            supportingImage.path.startsWith('http')
              ? supportingImage.path
              : `/supporting-images/${supportingImage.path}`
          }
          alt={field.label || field.data_name}
          className={styles.supportingImage}
        />
      )}

      {hasDialogDescription && (
        <dialog
          ref={descriptionDialogRef}
          className={styles.descriptionDialog}
          aria-labelledby={`${labelId}-desc-title`}
        >
          <div className={styles.descriptionDialogContent}>
            <button
              type="button"
              className={styles.dialogCloseButton}
              onClick={() => descriptionDialogRef.current?.close()}
              aria-label="Close"
            >
              ×
            </button>
            <h3 id={`${labelId}-desc-title`}>
              {field.label || field.data_name}
            </h3>
            <p>{field.description}</p>
          </div>
        </dialog>
      )}

      {hasDialogImage && (
        <dialog
          ref={imageDialogRef}
          className={styles.supportingImageDialog}
          aria-labelledby={`${labelId}-img-title`}
        >
          <div className={styles.supportingImageDialogContent}>
            <button
              type="button"
              className={styles.dialogCloseButton}
              onClick={() => imageDialogRef.current?.close()}
              aria-label="Close"
            >
              ×
            </button>
            <h3 id={`${labelId}-img-title`}>
              {field.label || field.data_name}
            </h3>
            <img
              src={
                supportingImage.path.startsWith('http')
                  ? supportingImage.path
                  : `/supporting-images/${supportingImage.path}`
              }
              alt={field.label || field.data_name}
              className={styles.supportingImage}
              style={{ height: 'auto' }}
            />
          </div>
        </dialog>
      )}

      <div className={styles.error}>{error}</div>
    </div>
  );
}
