import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import * as styles from '../field-renderer.css.js';

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 150;
const PNG_DATA_PREFIX = /^data:image\/png;base64,/;

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
    const signatureId = value.signature_id ?? null;
    const rawData = typeof value.data === 'string' ? value.data : '';
    const trimmed = rawData.replace(PNG_DATA_PREFIX, '').trim();
    if (!trimmed) {
      return null;
    }
    return {
      signature_id: signatureId,
      data: trimmed,
    };
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

  useEffect(() => {
    signatureIdRef.current = normalizedValue?.signature_id ?? null;
  }, [normalizedValue?.signature_id]);

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

    const payload = {
      signature_id: signatureIdRef.current ?? null,
      data: base64Data,
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
    const dataUrl = normalizedValue ? `data:image/png;base64,${normalizedValue.data}` : null;
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
