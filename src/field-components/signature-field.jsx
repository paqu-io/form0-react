import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as styles from '../field-renderer.css.js';

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 150;
const SIGNATURE_STROKE_WIDTH = 2;
const SIGNATURE_EXPORT_PADDING = 18;
const SIGNATURE_MIN_EXPORT_WIDTH = 120;
const SIGNATURE_MIN_EXPORT_HEIGHT = 72;
const PNG_DATA_PREFIX = /^data:image\/png;base64,/;

function createClientMediaId(prefix) {
  const randomId =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${randomId}`;
}

function copyMediaFields(value, output) {
  [
    'asset_id',
    'upload_id',
    'upload_status',
    'mime_type',
    'size',
    'size_bytes',
    'checksum_sha256',
    'thumbnail_url',
    'preview_url',
    'url',
    'field_key',
    'field_data_name',
    'attached_at_client',
    'captured_at_client',
    'signed_at_client',
    'uploaded_at_server',
    'ready_at_server',
    'error',
  ].forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      output[key] = value[key];
    }
  });
  return output;
}

function normalizeSignatureValue(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.replace(PNG_DATA_PREFIX, '').trim();
    return trimmed
      ? {
          signature_id: null,
          data: trimmed,
        }
      : null;
  }

  if (typeof value === 'object') {
    const signatureId = value.signature_id ?? value.media_id ?? value.asset_id ?? null;
    const rawData = typeof value.data === 'string' ? value.data : '';
    const trimmed = rawData.replace(PNG_DATA_PREFIX, '').trim();
    if (!trimmed && !value.asset_id) {
      return null;
    }
    return copyMediaFields(value, {
      signature_id: signatureId,
      media_id: value.media_id ?? signatureId,
      data: trimmed,
    });
  }

  return null;
}

function computeValueKey(value) {
  if (!value) return 'null';
  const id = value.signature_id ?? '';
  const data = typeof value.data === 'string' ? value.data : '';
  return `${id}:${data.length}:${data.slice(0, 16)}`;
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}

function extendBounds(bounds, x, y, radius = 0) {
  const pointRadius = Number.isFinite(radius) ? Math.max(radius, 0) : 0;
  const minX = x - pointRadius;
  const maxX = x + pointRadius;
  const minY = y - pointRadius;
  const maxY = y + pointRadius;

  if (!bounds) {
    return { minX, maxX, minY, maxY };
  }

  return {
    minX: Math.min(bounds.minX, minX),
    maxX: Math.max(bounds.maxX, maxX),
    minY: Math.min(bounds.minY, minY),
    maxY: Math.max(bounds.maxY, maxY),
  };
}

function expandRangeToMinimum(min, max, minSize, limit) {
  const safeLimit = Math.max(Number.isFinite(limit) ? limit : 0, 1);
  let start = clamp(min, 0, safeLimit);
  let end = clamp(max, 0, safeLimit);

  if (end <= start) {
    end = Math.min(safeLimit, start + 1);
  }

  const targetSize = Math.min(Math.max(Math.ceil(minSize), 1), safeLimit);
  const currentSize = end - start;
  if (currentSize >= targetSize) {
    return { start, end };
  }

  const center = (start + end) / 2;
  let nextStart = center - targetSize / 2;
  let nextEnd = center + targetSize / 2;

  if (nextStart < 0) {
    nextEnd = Math.min(safeLimit, nextEnd - nextStart);
    nextStart = 0;
  }

  if (nextEnd > safeLimit) {
    const overflow = nextEnd - safeLimit;
    nextStart = Math.max(0, nextStart - overflow);
    nextEnd = safeLimit;
  }

  return {
    start: clamp(nextStart, 0, safeLimit),
    end: clamp(nextEnd, 0, safeLimit),
  };
}

function buildSignatureExportCanvas(sourceCanvas, bounds) {
  if (!sourceCanvas || !bounds) {
    return null;
  }

  const safeWidth = Math.max(Math.round(sourceCanvas.width || 0), 1);
  const safeHeight = Math.max(Math.round(sourceCanvas.height || 0), 1);
  const left = clamp(bounds.minX - SIGNATURE_EXPORT_PADDING, 0, safeWidth);
  const right = clamp(bounds.maxX + SIGNATURE_EXPORT_PADDING, 0, safeWidth);
  const top = clamp(bounds.minY - SIGNATURE_EXPORT_PADDING, 0, safeHeight);
  const bottom = clamp(bounds.maxY + SIGNATURE_EXPORT_PADDING, 0, safeHeight);
  const horizontalRange = expandRangeToMinimum(
    left,
    right,
    SIGNATURE_MIN_EXPORT_WIDTH,
    safeWidth
  );
  const verticalRange = expandRangeToMinimum(
    top,
    bottom,
    SIGNATURE_MIN_EXPORT_HEIGHT,
    safeHeight
  );
  const exportWidth = Math.max(Math.ceil(horizontalRange.end - horizontalRange.start), 1);
  const exportHeight = Math.max(Math.ceil(verticalRange.end - verticalRange.start), 1);
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = exportWidth;
  exportCanvas.height = exportHeight;
  const exportContext = exportCanvas.getContext('2d');
  if (!exportContext) {
    return null;
  }

  exportContext.drawImage(
    sourceCanvas,
    horizontalRange.start,
    verticalRange.start,
    exportWidth,
    exportHeight,
    0,
    0,
    exportWidth,
    exportHeight
  );

  return exportCanvas;
}

export function SignatureFieldComponent({
  field,
  value,
  onChange,
  readOnly,
  inputProps = {},
  className,
}) {
  const normalizedValue = useMemo(() => normalizeSignatureValue(value), [value]);
  const isReadOnly = readOnly || inputProps.readOnly;
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const isDrawingRef = useRef(false);
  const pointerMovedRef = useRef(false);
  const lastPointRef = useRef({ x: 0, y: 0 });
  const hasStrokesRef = useRef(false);
  const strokeBoundsRef = useRef(null);
  const appliedValueKeyRef = useRef(null);
  const signatureIdRef = useRef(normalizedValue?.signature_id ?? null);
  const signatureMetaRef = useRef(normalizedValue);
  const [isPadOpen, setIsPadOpen] = useState(false);
  const [padStrokeCount, setPadStrokeCount] = useState(0);

  useEffect(() => {
    signatureIdRef.current = normalizedValue?.signature_id ?? null;
    signatureMetaRef.current = normalizedValue;
  }, [normalizedValue]);

  useEffect(() => {
    if (!isPadOpen || typeof document === 'undefined') {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isPadOpen]);

  const emitValue = useCallback(() => {
    if (typeof onChange !== 'function' || isReadOnly) {
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!hasStrokesRef.current) {
      appliedValueKeyRef.current = 'null';
      onChange(null);
      return;
    }

    const exportCanvas = buildSignatureExportCanvas(canvas, strokeBoundsRef.current);
    const dataUrl = (exportCanvas || canvas).toDataURL('image/png');
    const base64Data = dataUrl.replace(PNG_DATA_PREFIX, '');
    if (!base64Data) {
      appliedValueKeyRef.current = 'null';
      onChange(null);
      return;
    }

    const signatureId = signatureIdRef.current ?? createClientMediaId('signature');
    const signedAtClient =
      signatureMetaRef.current?.signed_at_client ?? new Date().toISOString();
    signatureIdRef.current = signatureId;
    const payload = {
      ...(signatureMetaRef.current && typeof signatureMetaRef.current === 'object'
        ? { ...signatureMetaRef.current }
        : {}),
      signature_id: signatureId,
      media_id: signatureMetaRef.current?.media_id ?? signatureId,
      data: base64Data,
      signed_at_client: signedAtClient,
      attached_at_client: signatureMetaRef.current?.attached_at_client ?? signedAtClient,
      mime_type: 'image/png',
      upload_status: signatureMetaRef.current?.upload_status ?? 'local',
    };
    appliedValueKeyRef.current = computeValueKey(payload);
    onChange(payload);
  }, [isReadOnly, onChange]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    hasStrokesRef.current = false;
    pointerMovedRef.current = false;
    strokeBoundsRef.current = null;
    setPadStrokeCount(0);
  }, []);

  const handleClear = useCallback(() => {
    if (isReadOnly) return;
    clearCanvas();
    if (typeof onChange === 'function') {
      appliedValueKeyRef.current = 'null';
      onChange(null);
      signatureIdRef.current = null;
      signatureMetaRef.current = null;
    }
  }, [clearCanvas, isReadOnly, onChange]);

  const handleOpenPad = useCallback(() => {
    if (isReadOnly) {
      return;
    }
    setIsPadOpen(true);
  }, [isReadOnly]);

  const handleClosePad = useCallback(() => {
    isDrawingRef.current = false;
    pointerMovedRef.current = false;
    clearCanvas();
    setIsPadOpen(false);
  }, [clearCanvas]);

  const handleSavePad = useCallback(() => {
    if (!hasStrokesRef.current) {
      return;
    }

    emitValue();
    setIsPadOpen(false);
  }, [emitValue]);

  const getRelativePoint = useCallback((event) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }, []);

  const handlePointerDown = useCallback(
    (event) => {
      if (isReadOnly) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      const canvas = canvasRef.current;
      const ctx = contextRef.current;
      if (!canvas || !ctx) return;
      const point = getRelativePoint(event);
      if (!point) return;

      canvas.setPointerCapture?.(event.pointerId);
      isDrawingRef.current = true;
      pointerMovedRef.current = false;
      lastPointRef.current = point;
      hasStrokesRef.current = true;
      strokeBoundsRef.current = extendBounds(
        strokeBoundsRef.current,
        point.x,
        point.y,
        SIGNATURE_STROKE_WIDTH
      );
      setPadStrokeCount(1);

      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
    },
    [getRelativePoint, isReadOnly]
  );

  const handlePointerMove = useCallback(
    (event) => {
      if (isReadOnly || !isDrawingRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      const ctx = contextRef.current;
      if (!ctx) return;
      const point = getRelativePoint(event);
      if (!point) return;
      const lastPoint = lastPointRef.current;
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      lastPointRef.current = point;
      pointerMovedRef.current = true;
      strokeBoundsRef.current = extendBounds(
        strokeBoundsRef.current,
        point.x,
        point.y,
        SIGNATURE_STROKE_WIDTH
      );
    },
    [getRelativePoint, isReadOnly]
  );

  const finishDrawing = useCallback(
    (event) => {
      if (!isDrawingRef.current) return;
      event?.preventDefault?.();
      event?.stopPropagation?.();
      const canvas = canvasRef.current;
      const ctx = contextRef.current;
      if (!canvas || !ctx) return;

      if (!pointerMovedRef.current) {
        const lastPoint = lastPointRef.current;
        ctx.beginPath();
        ctx.arc(lastPoint.x, lastPoint.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
        strokeBoundsRef.current = extendBounds(
          strokeBoundsRef.current,
          lastPoint.x,
          lastPoint.y,
          1.5 + SIGNATURE_STROKE_WIDTH
        );
      }

      canvas.releasePointerCapture?.(event?.pointerId);
      isDrawingRef.current = false;
      pointerMovedRef.current = false;
    },
    []
  );

  const handlePointerUp = useCallback(
    (event) => {
      finishDrawing(event);
    },
    [finishDrawing]
  );

  const handlePointerLeave = useCallback(
    (event) => {
      finishDrawing(event);
    },
    [finishDrawing]
  );

  useEffect(() => {
    if (isReadOnly || !isPadOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(Math.round(rect.width), CANVAS_WIDTH);
    canvas.height = Math.max(Math.round(rect.height), CANVAS_HEIGHT);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#222';
    ctx.fillStyle = '#222';
    contextRef.current = ctx;
    clearCanvas();
  }, [clearCanvas, isPadOpen, isReadOnly]);

  useEffect(() => {
    if (isReadOnly || !isPadOpen) return;
    clearCanvas();
  }, [clearCanvas, isPadOpen, isReadOnly]);

  if (isReadOnly) {
    const dataUrl = normalizedValue?.data
      ? `data:image/png;base64,${normalizedValue.data}`
      : normalizedValue?.preview_url || normalizedValue?.thumbnail_url || normalizedValue?.url || null;
    return (
      <div className={`${styles.signatureReadOnly} ${className || ''}`}>
        {field.agreement_text && (
          <div className={styles.signatureAgreement}>{field.agreement_text}</div>
        )}
        {dataUrl ? (
          <div className={styles.signatureImageWrapper}>
            <img
              src={dataUrl}
              alt={field.label ? `${field.label} signature` : 'Signature'}
              className={styles.signatureImage}
            />
          </div>
        ) : (
          <div className={styles.signaturePlaceholder}>No signature captured.</div>
        )}
      </div>
    );
  }

  const {
    readOnly: _ignored,
    required: requiredAttr,
    disabled: disabledAttr,
    name,
    id,
    ...restInputProps
  } = inputProps;
  const hiddenValue =
    normalizedValue && normalizedValue.data
      ? JSON.stringify({
          signature_id: normalizedValue.signature_id ?? null,
          media_id: normalizedValue.media_id ?? normalizedValue.signature_id ?? null,
          asset_id: normalizedValue.asset_id ?? null,
          upload_id: normalizedValue.upload_id ?? null,
          upload_status: normalizedValue.upload_status ?? null,
          signed_at_client: normalizedValue.signed_at_client ?? null,
          attached_at_client: normalizedValue.attached_at_client ?? null,
          mime_type: normalizedValue.mime_type ?? 'image/png',
          data: normalizedValue.data,
        })
      : '';
  const dataUrl = normalizedValue?.data
    ? `data:image/png;base64,${normalizedValue.data}`
    : normalizedValue?.preview_url || normalizedValue?.thumbnail_url || normalizedValue?.url || null;
  const primaryButtonLabel = normalizedValue ? 'Replace signature' : 'Add signature';

  return (
    <div className={`${styles.signatureField} ${className || ''}`}>
      {field.agreement_text && (
        <div className={styles.signatureAgreement}>{field.agreement_text}</div>
      )}
      <div className={styles.signaturePreviewSurface}>
        {dataUrl ? (
          <div className={styles.signatureImageWrapper}>
            <img
              src={dataUrl}
              alt={field.label ? `${field.label} signature` : 'Signature'}
              className={styles.signatureImage}
            />
          </div>
        ) : (
          <div className={styles.signaturePlaceholder}>
            Open the signature pad to capture a signature.
          </div>
        )}
      </div>
      <input
        type="hidden"
        value={hiddenValue}
        name={name}
        id={id ? `${id}-hidden` : undefined}
        aria-hidden="true"
        readOnly
        required={requiredAttr}
        disabled={disabledAttr}
      />
      <div className={styles.signatureControls}>
        <button
          type="button"
          className={styles.signaturePrimaryButton}
          onClick={handleOpenPad}
          disabled={disabledAttr}
        >
          {primaryButtonLabel}
        </button>
        <button
          type="button"
          className={styles.signatureClearButton}
          onClick={handleClear}
          disabled={disabledAttr || !normalizedValue}
        >
          Clear signature
        </button>
      </div>
      {isPadOpen ? (
        <div
          className={styles.signatureModalOverlay}
          role="dialog"
          aria-modal="true"
          aria-label={field.label ? `${field.label} signature pad` : 'Signature pad'}
        >
          <div className={styles.signatureModalCard}>
            <div className={styles.signatureModalHeader}>
              <button
                type="button"
                className={styles.signatureClearButton}
                onClick={handleClosePad}
              >
                Cancel
              </button>
              <p className={styles.signatureModalTitle}>
                {field.label || 'Capture signature'}
              </p>
              <button
                type="button"
                className={styles.signaturePrimaryButton}
                onClick={handleSavePad}
                disabled={padStrokeCount === 0}
              >
                Save
              </button>
            </div>
            <div className={styles.signatureModalHint}>
              Draw your signature below. Saving replaces the current signature.
            </div>
            <canvas
              ref={canvasRef}
              className={styles.signatureModalCanvas}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              role="img"
              aria-label={field.label ? `${field.label} signature capture` : 'Signature capture'}
              tabIndex={0}
              id={id}
              aria-labelledby={id ? `${id}-label` : undefined}
              aria-disabled={disabledAttr || undefined}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerLeave}
              onPointerLeave={handlePointerLeave}
              {...restInputProps}
            />
            <div className={styles.signatureControls}>
              <button
                type="button"
                className={styles.signatureClearButton}
                onClick={clearCanvas}
              >
                Clear pad
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
