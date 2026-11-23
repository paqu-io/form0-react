import { useBuildingPlanPresentation } from './building-plan/presentation.jsx';
import React, { useMemo, useState } from 'react';
import { Info, Image, AlertTriangle, Lock, Link2, RotateCcw } from 'lucide-react';
import * as styles from './field-renderer.css.js';
import { PlanFieldTag } from './building-plan/plan-field-tag.jsx';
import {
  DescriptionDialog,
  ImageViewerDialog,
  SupportingImageFigure,
  supportingImageSrc,
  useModalDialog,
} from './field-help.jsx';
import { useFieldRegistry } from './field-registry-context.jsx';
import { useEngineField } from './engine-store.js';

const LABEL_SIDE = 'side';

const FieldRendererBase = React.forwardRef(function FieldRenderer(
  {
    field,
    value,
    onChange,
    readOnly,
    required,
    error,
    labelPosition = 'top',
    labelWidthPercent = 30,
    onKeyDown,
    onFocus,
    eventInteractions,
    engineStore = null,
    storeMode = 'snapshot',
    showError = true,
    // Building plan fields only. All optional and presentational.
    labelTag = null, // where the field sits, e.g. "Room side"
    labelTagNote = null, // { title, body }: the tag opens it (a shared wall's whole-wall field)
    sourceMode = null, // 'inherit' | 'override'
    sourceLabel = null, // e.g. "Floor default" or "This wall"
    onResetSource = null, // present when an overridden value can return to the inherited one
  },
  ref
) {
  const presentation = useBuildingPlanPresentation();
  field = presentation.field(field);
  const registry = useFieldRegistry();
  const FieldComponent = registry.getFieldComponent(field.type);
  const elementKey = field.key || field.data_name;
  const isLabelField = field.type === 'LabelField';
  const selectorEnabled =
    storeMode === 'selector' && engineStore && typeof field?.data_name === 'string';
  const fieldSlice = useEngineField(engineStore, selectorEnabled ? field.data_name : '');
  const resolvedValue = selectorEnabled && value === undefined ? fieldSlice?.value : value;
  const resolvedReadOnly =
    selectorEnabled && fieldSlice && Object.prototype.hasOwnProperty.call(fieldSlice, 'read_only')
      ? Boolean(readOnly || fieldSlice.read_only)
      : readOnly;
  const resolvedRequired =
    selectorEnabled && fieldSlice && Object.prototype.hasOwnProperty.call(fieldSlice, 'required')
      ? Boolean(fieldSlice.required)
      : required;
  const resolvedError =
    selectorEnabled && fieldSlice && Object.prototype.hasOwnProperty.call(fieldSlice, 'error')
      ? fieldSlice.error
      : error;
  const currentError = selectorEnabled ? resolvedError : error;

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
    (isLabelField ? 'top' : labelPosition) === LABEL_SIDE ? styles.labelSide : styles.labelTop;
  const effectiveLabelPosition = isLabelField ? 'top' : labelPosition;
  const labelClass =
    labelPosition === LABEL_SIDE ? `${styles.label} ${styles.labelSideFixed}` : styles.label;
  const wrapperStyle =
    labelPosition === LABEL_SIDE ? { '--label-width': `${labelWidthPercent}%` } : undefined;

  const baseId = field.key || field.data_name;
  const labelId = `${baseId}-label`;
  const isSignatureField = field.type === 'SignatureField';
  const isGroupedControl =
    (field.type === 'SingleChoiceField' && field.display === 'radio') ||
    (field.type === 'MultiChoiceField' && field.display === 'checkbox') ||
    field.type === 'BooleanField' ||
    isSignatureField ||
    field.type === 'PhotoField' ||
    field.type === 'VideoField';
  const shouldRenderLabelElement = !isLabelField;

  const labelledById = isGroupedControl ? `${labelId}-legend` : labelId;

  const inputProps = shouldRenderLabelElement
    ? {
        name: field.data_name,
        lang: presentation.locale,
        readOnly: resolvedReadOnly,
        required: resolvedRequired,
        disabled: resolvedReadOnly,
        id: baseId,
        'aria-invalid': showError && currentError ? true : undefined,
        autoComplete: field?.autocomplete ?? 'off',
        'aria-labelledby': labelledById,
        ...(onFocus || eventInteractions
          ? {
              onFocus: (event) => {
                onFocus?.(event);
                if (['TextField', 'NumericField'].includes(field.type))
                  eventInteractions?.('focus', field.data_name);
              },
            }
          : {}),
        ...(eventInteractions && ['TextField', 'NumericField'].includes(field.type)
          ? {
              onBlur: (event) => eventInteractions('blur', field.data_name, event),
            }
          : {}),
      }
    : {};

  const handleChange =
    onChange &&
    ((nextValue) => {
      onChange(presentation.fromDisplay(field, nextValue));
    });

  const supportingImage = useMemo(() => {
    if (!field.supporting_image) return null;
    if (!field.supporting_image_path) return null;
    const displayMode = field.supporting_image_display || 'default';
    return { path: field.supporting_image_path, displayMode };
  }, [field.supporting_image, field.supporting_image_path, field.supporting_image_display]);

  const [isDescriptionOpen, setDescriptionOpen] = useState(false);
  const [isImageOpen, setImageOpen] = useState(false);
  const [isFormLinkOpen, setFormLinkOpen] = useState(false);

  const descriptionMode = field.description_mode || 'default';
  const hasDialogDescription =
    field.description && descriptionMode !== 'subtext' && typeof field.description === 'string';
  const hasSubtextDescription =
    field.description && descriptionMode === 'subtext' && typeof field.description === 'string';

  const hasDialogImage = supportingImage && supportingImage.displayMode === 'dialog';
  const showInlineImage = supportingImage && supportingImage.displayMode !== 'dialog';
  const supportingImageUrl = supportingImage ? supportingImageSrc(supportingImage.path) : null;
  const helpTitle = field.label || field.data_name;

  const { dialogRef: formLinkDialogRef } = useModalDialog(isFormLinkOpen, setFormLinkOpen);

  const [isFormLinkTooltipOpen, setIsFormLinkTooltipOpen] = useState(false);

  const renderLabelControls = () => {
    const controls = [];
    if (labelTag) {
      controls.push(
        <PlanFieldTag
          key="label-tag"
          text={labelTag}
          note={labelTagNote}
          className={styles.labelTag}
        />
      );
    }

    if (field.type === 'FormLinkField') {
      controls.push(
        <button
          key="form-link-info"
          type="button"
          className={styles.infoIconButton}
          aria-label="Form link field info"
          onClick={() => setFormLinkOpen(true)}
        >
          <AlertTriangle size={16} strokeWidth={2} />
        </button>
      );
    }

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
          <Image size={16} strokeWidth={2} />
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
          <Info size={16} strokeWidth={2} />
        </button>
      );
    }

    return controls;
  };

  // Where a building plan value comes from. Inherited: a tag naming the source. Set here: the
  // same place holds the button that returns it to the inherited value.
  const sourceNode = !sourceMode ? null : sourceMode === 'override' && onResetSource ? (
    <button
      type="button"
      className={styles.sourceResetButton}
      onClick={onResetSource}
      aria-label="Reset to inheritance"
      title="Reset to inheritance"
    >
      <RotateCcw size={12} strokeWidth={2} aria-hidden="true" />
      Reset
    </button>
  ) : (
    <span
      className={styles.sourceChip}
      title={`${sourceMode === 'inherit' ? 'Inherited from' : 'Set on'} ${String(sourceLabel || '').toLowerCase()}`}
    >
      {sourceMode === 'inherit' ? <Link2 size={12} strokeWidth={2} aria-hidden="true" /> : null}
      {sourceLabel}
    </span>
  );
  // Inside a dropdown's frame the tag sits before the clear button (ChoiceDropdown's slot).
  const sourceInDropdown =
    Boolean(sourceNode) &&
    !isGroupedControl &&
    (field.type === 'SingleChoiceField' || field.type === 'MultiChoiceField');

  const fieldInput = (
    <FieldComponent
      field={field}
      value={presentation.toDisplay(field, selectorEnabled ? resolvedValue : value)}
      onChange={handleChange}
      onKeyDown={onKeyDown}
      readOnly={resolvedReadOnly}
      inputProps={inputProps}
      className={isLabelField ? undefined : styles.input}
      {...(sourceInDropdown ? { endAdornment: sourceNode } : {})}
    />
  );

  // Marks at the right edge of the control. The lock is shown only for fields that are
  // read-only by their own attribute, not for every field of a form opened in View mode.
  const adornment =
    field.type === 'CalculatedField'
      ? 'calculated'
      : field.read_only === true && ['TextField', 'NumericField'].includes(field.type)
        ? 'locked'
        : null;
  const sourceFitsInside = ['TextField', 'NumericField'].includes(field.type);

  const fieldControl = sourceInDropdown ? (
    fieldInput
  ) : sourceNode && sourceFitsInside ? (
    <div className={styles.inputAdorned} data-adornment="source" data-source={sourceMode}>
      {fieldInput}
      <span className={styles.sourceSlot}>{sourceNode}</span>
    </div>
  ) : sourceNode ? (
    <>
      {fieldInput}
      <div className={styles.sourceRow}>{sourceNode}</div>
    </>
  ) : adornment ? (
    <div className={styles.inputAdorned} data-adornment={adornment}>
      {fieldInput}
      {adornment === 'calculated' ? (
        <span className={styles.inputAdornmentLead} aria-hidden="true">
          ƒ
        </span>
      ) : null}
      <span className={styles.inputAdornment} aria-hidden="true">
        {adornment === 'calculated' ? 'Calculated' : <Lock size={14} strokeWidth={2} />}
      </span>
    </div>
  ) : (
    fieldInput
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

  const labelContent = (
    <>
      {field.label}
      {(selectorEnabled ? resolvedRequired : required) ? ' *' : ''}
    </>
  );

  const labelNode = shouldRenderLabelElement ? (
    isGroupedControl ? (
      <div className={labelClassNames.join(' ')} id={labelId} role="presentation">
        {labelContent}
      </div>
    ) : (
      <label className={labelClassNames.join(' ')} id={labelId} {...labelProps}>
        {labelContent}
      </label>
    )
  ) : (
    <div className={labelClassNames.join(' ')} id={labelId} role="presentation">
      {labelContent}
    </div>
  );

  const legendNode = isGroupedControl ? (
    <legend className={styles.legendSrOnly} id={`${labelId}-legend`}>
      {labelContent}
    </legend>
  ) : null;

  const inlineImage = showInlineImage ? (
    <SupportingImageFigure
      src={supportingImageUrl}
      label={helpTitle}
      expanded={isImageOpen}
      onOpen={() => setImageOpen(true)}
    />
  ) : null;

  const content = isLabelField ? (
    <div className={styles.labelOnly}>
      <div className={styles.labelRow}>
        {labelNode}
        {renderLabelControls()}
      </div>
      {hasSubtextDescription && <div className={styles.subtext}>{field.description}</div>}
      {inlineImage}
    </div>
  ) : effectiveLabelPosition === LABEL_SIDE ? (
    <div className={styles.labelInputRow}>
      <div className={styles.labelColumn}>
        <div className={styles.labelRow}>
          {labelNode}
          {renderLabelControls()}
        </div>
        {hasSubtextDescription && <div className={styles.subtext}>{field.description}</div>}
      </div>
      <div className={styles.inputWrapper}>
        {inlineImage}
        {fieldControl}
        {showError ? <div className={styles.error}>{currentError || '\u00A0'}</div> : null}
      </div>
    </div>
  ) : (
    <>
      <div className={styles.labelRow}>
        {labelNode}
        {renderLabelControls()}
      </div>
      {hasSubtextDescription && <div className={styles.subtext}>{field.description}</div>}
      {inlineImage}
      {fieldControl}
      {showError ? <div className={styles.error}>{currentError || '\u00A0'}</div> : null}
    </>
  );

  const dialogs = (
    <>
      {hasDialogDescription && (
        <DescriptionDialog
          open={isDescriptionOpen}
          setOpen={setDescriptionOpen}
          titleId={`${labelId}-desc-title`}
          title={helpTitle}
          description={field.description}
        />
      )}

      {field.type === 'FormLinkField' && (
        <dialog
          ref={formLinkDialogRef}
          className={styles.descriptionDialog}
          aria-labelledby={`${labelId}-form-link-title`}
        >
          <div className={styles.descriptionDialogContent}>
            <div className={styles.dialogHeader}>
              <h3 id={`${labelId}-form-link-title`} className={styles.dialogTitle}>
                <span className={styles.dialogTitleIcon}>
                  <AlertTriangle size={18} />
                </span>
                Warning
              </h3>
              <button
                type="button"
                className={styles.dialogCloseButton}
                onClick={() => formLinkDialogRef.current?.close()}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <p>
              The feature "FormLinkField" is not supported in form0-react. Full support available in
              reform platform only.
              <br />
              Want to learn more?{' '}
              <a
                href="https://docs.form0.dev/unsupported-features/form-link-field"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.formLinkTooltipLink}
              >
                https://docs.form0.dev/unsupported-features/form-link-field
              </a>
              .
            </p>
          </div>
        </dialog>
      )}

      {supportingImage && (
        <ImageViewerDialog
          open={isImageOpen}
          setOpen={setImageOpen}
          titleId={`${labelId}-img-title`}
          title={helpTitle}
          src={supportingImageUrl}
        />
      )}
    </>
  );

  const containerClassName = `${styles.fieldWrapper} ${wrapperClass}`;

  if (isGroupedControl) {
    return (
      <fieldset
        ref={ref}
        tabIndex={-1}
        className={`${containerClassName} ${styles.fieldsetReset}`}
        style={wrapperStyle}
        aria-labelledby={`${labelId}-legend`}
      >
        {legendNode}
        {content}
        {dialogs}
      </fieldset>
    );
  }

  return (
    <div ref={ref} tabIndex={-1} className={containerClassName} style={wrapperStyle}>
      {content}
      {dialogs}
    </div>
  );
});

export const FieldRenderer = React.memo(FieldRendererBase, (prev, next) => {
  if (prev.storeMode !== next.storeMode) return false;
  if (prev.storeMode === 'selector') {
    return (
      prev.field === next.field &&
      prev.engineStore === next.engineStore &&
      prev.onChange === next.onChange &&
      prev.labelPosition === next.labelPosition &&
      prev.labelWidthPercent === next.labelWidthPercent &&
      prev.onKeyDown === next.onKeyDown &&
      prev.onFocus === next.onFocus &&
      prev.eventInteractions === next.eventInteractions &&
      prev.value === next.value &&
      prev.readOnly === next.readOnly &&
      prev.required === next.required &&
      prev.error === next.error &&
      prev.showError === next.showError &&
      prev.labelTag === next.labelTag &&
      prev.labelTagNote?.title === next.labelTagNote?.title &&
      prev.labelTagNote?.body === next.labelTagNote?.body &&
      prev.sourceMode === next.sourceMode &&
      prev.sourceLabel === next.sourceLabel &&
      prev.onResetSource === next.onResetSource
    );
  }
  return (
    prev.field === next.field &&
    prev.value === next.value &&
    prev.readOnly === next.readOnly &&
    prev.required === next.required &&
    prev.error === next.error &&
    prev.engineStore === next.engineStore &&
    prev.onChange === next.onChange &&
    prev.labelPosition === next.labelPosition &&
    prev.labelWidthPercent === next.labelWidthPercent &&
    prev.onKeyDown === next.onKeyDown &&
    prev.onFocus === next.onFocus &&
    prev.eventInteractions === next.eventInteractions &&
    prev.showError === next.showError &&
    prev.labelTag === next.labelTag &&
    prev.labelTagNote?.title === next.labelTagNote?.title &&
    prev.labelTagNote?.body === next.labelTagNote?.body &&
    prev.sourceMode === next.sourceMode &&
    prev.sourceLabel === next.sourceLabel &&
    prev.onResetSource === next.onResetSource
  );
});
