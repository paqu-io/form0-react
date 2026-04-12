import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import * as styles from '../field-renderer.css.js';

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 150;
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

export function SignatureFieldComponent({
  field,
  value,
  onChange,
  readOnly,
  inputProps = {},
  className,
}) {
  const normalizedValue = useMemo(() => normalizeSignatureValue(value), [value]);
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const isDrawingRef = useRef(false);
  const pointerMovedRef = useRef(false);
  const lastPointRef = useRef({ x: 0, y: 0 });
  const hasStrokesRef = useRef(false);
  const appliedValueKeyRef = useRef(null);
  const signatureIdRef = useRef(normalizedValue?.signature_id ?? null);
  const signatureMetaRef = useRef(normalizedValue);

  useEffect(() => {
    signatureIdRef.current = normalizedValue?.signature_id ?? null;
    signatureMetaRef.current = normalizedValue;
  }, [normalizedValue]);

  const emitValue = useCallback(() => {
    if (typeof onChange !== 'function' || readOnly) {
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!hasStrokesRef.current) {
      appliedValueKeyRef.current = 'null';
      onChange(null);
      return;
    }

    const dataUrl = canvas.toDataURL('image/png');
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
  }, [onChange, readOnly]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    hasStrokesRef.current = false;
    pointerMovedRef.current = false;
  }, []);

  const handleClear = useCallback(() => {
    if (readOnly) return;
    clearCanvas();
    if (typeof onChange === 'function') {
      appliedValueKeyRef.current = 'null';
      onChange(null);
      signatureIdRef.current = null;
      signatureMetaRef.current = null;
    }
  }, [clearCanvas, onChange, readOnly]);

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
      if (readOnly) return;
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

      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
    },
    [getRelativePoint, readOnly]
  );

  const handlePointerMove = useCallback(
    (event) => {
      if (readOnly || !isDrawingRef.current) return;
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
    },
    [getRelativePoint, readOnly]
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
      }

      canvas.releasePointerCapture?.(event?.pointerId);
      isDrawingRef.current = false;
      pointerMovedRef.current = false;
      emitValue();
    },
    [emitValue]
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
    if (readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#222';
    ctx.fillStyle = '#222';
    contextRef.current = ctx;
    clearCanvas();
  }, [clearCanvas, readOnly]);

  useEffect(() => {
    if (readOnly) return;
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (!canvas || !ctx) return;

    const key = computeValueKey(normalizedValue);
    if (appliedValueKeyRef.current === key) {
      return;
    }

    appliedValueKeyRef.current = key;
    clearCanvas();

    if (normalizedValue && normalizedValue.data) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        hasStrokesRef.current = true;
      };
      img.src = `data:image/png;base64,${normalizedValue.data}`;
    }
  }, [clearCanvas, normalizedValue, readOnly]);

  if (readOnly) {
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

  return (
    <div className={`${styles.signatureField} ${className || ''}`}>
      {field.agreement_text && (
        <div className={styles.signatureAgreement}>{field.agreement_text}</div>
      )}
      <canvas
        ref={canvasRef}
        className={styles.signatureCanvas}
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
          className={styles.signatureClearButton}
          onClick={handleClear}
          disabled={readOnly}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
