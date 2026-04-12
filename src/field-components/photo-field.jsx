import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import * as styles from '../field-renderer.css.js';

function createClientMediaId(prefix) {
  const randomId =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${randomId}`;
}

function fileCapturedAt(file, fallback) {
  return file?.lastModified ? new Date(file.lastModified).toISOString() : fallback;
}

function normalizePhotos(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry, index) => {
      const filename = entry.filename || entry.name || `photo-${index + 1}`;
      const caption = entry.caption ?? null;
      const previewUrl =
        entry.previewUrl ||
        entry.url ||
        entry.thumbnail_url ||
        entry.preview_url ||
        entry.file_url ||
        null;
      const mediaId = entry.media_id || entry.photo_id || entry.asset_id || null;

      return {
        key: entry._localId || mediaId || `${filename}-${index}`,
        photo_id: entry.photo_id ?? mediaId,
        media_id: mediaId,
        filename,
        caption,
        previewUrl,
        file: entry.file || null,
        _localId: entry._localId || mediaId || null,
        original: entry,
      };
    });
}

function mapToValue(items) {
  return items.map((item) => ({
    ...(item.original && typeof item.original === 'object' ? { ...item.original } : {}),
    photo_id: item.photo_id ?? null,
    media_id: item.media_id ?? item.photo_id ?? null,
    filename: item.filename || 'photo',
    caption: item.caption ?? null,
    previewUrl: item.previewUrl || null,
    url: item.previewUrl || item.original?.url || item.original?.file_url || null,
    _localId: item._localId || null,
    ...(item.file ? { file: item.file } : {}),
  }));
}

export function PhotoFieldComponent({
  field,
  value,
  onChange,
  readOnly,
  inputProps = {},
  className,
}) {
  const objectUrlRef = useRef(new Set());

  const items = useMemo(() => {
    const normalized = normalizePhotos(value);
    return normalized.map((item) => {
      if (!item.previewUrl && item.file instanceof File) {
        const url = URL.createObjectURL(item.file);
        objectUrlRef.current.add(url);
        return { ...item, previewUrl: url };
      }
      return item;
    });
  }, [value]);

  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    const activeUrls = new Set(
      items
        .map((item) => item.previewUrl)
        .filter((url) => typeof url === 'string' && url.startsWith('blob:'))
    );

    objectUrlRef.current.forEach((url) => {
      if (!activeUrls.has(url)) {
        URL.revokeObjectURL(url);
        objectUrlRef.current.delete(url);
      }
    });
  }, [items]);

  const emitChange = useCallback(
    (nextItems) => {
      if (typeof onChange === 'function' && !readOnly) {
        onChange(mapToValue(nextItems));
      }
    },
    [onChange, readOnly]
  );

  const handleFilesSelected = useCallback(
    (event) => {
      if (readOnly) return;
      const fileList = event.target.files;
      if (!fileList || fileList.length === 0) return;

      const current = itemsRef.current;
      const nextItems = [...current];

      Array.from(fileList).forEach((file) => {
        if (!file) return;
        const localId = createClientMediaId('photo');
        const attachedAtClient = new Date().toISOString();
        const objectUrl = URL.createObjectURL(file);
        objectUrlRef.current.add(objectUrl);
        nextItems.push({
          key: localId,
          photo_id: localId,
          media_id: localId,
          filename: file.name || localId,
          caption: null,
          previewUrl: objectUrl,
          file,
          _localId: localId,
          original: {
            photo_id: localId,
            media_id: localId,
            filename: file.name || localId,
            caption: null,
            previewUrl: objectUrl,
            _localId: localId,
            file,
            field_key: field.key || field.data_name || null,
            field_data_name: field.data_name || field.key || null,
            attached_at_client: attachedAtClient,
            captured_at_client: fileCapturedAt(file, attachedAtClient),
            mime_type: file.type || null,
            size: file.size || null,
            size_bytes: file.size || null,
            upload_status: 'local',
          },
        });
      });

      emitChange(nextItems);
      event.target.value = '';
    },
    [emitChange, field.data_name, field.key, readOnly]
  );

  const handleRemove = useCallback(
    (itemKey) => {
      if (readOnly) return;
      const currentItems = itemsRef.current;
      const target = currentItems.find((item) => item.key === itemKey);
      if (target?.previewUrl && objectUrlRef.current.has(target.previewUrl)) {
        URL.revokeObjectURL(target.previewUrl);
        objectUrlRef.current.delete(target.previewUrl);
      }
      const filtered = currentItems.filter((item) => item.key !== itemKey);
      emitChange(filtered);
    },
    [emitChange, readOnly]
  );

  const handleCaptionChange = useCallback(
    (itemKey, caption) => {
      if (readOnly) return;
      const currentItems = itemsRef.current;
      const nextCaption = caption || null;
      const nextItems = currentItems.map((item) =>
        item.key === itemKey
          ? {
              ...item,
              caption: nextCaption,
              original: {
                ...(item.original && typeof item.original === 'object' ? item.original : {}),
                caption: nextCaption,
              },
            }
          : item
      );
      emitChange(nextItems);
    },
    [emitChange, readOnly]
  );

  const minMaxInfo = useMemo(() => {
    const parts = [];
    if (field.min_length != null) {
      parts.push(`Min: ${field.min_length} photo${field.min_length === 1 ? '' : 's'}`);
    }
    if (field.max_length != null) {
      parts.push(`Max: ${field.max_length} photo${field.max_length === 1 ? '' : 's'}`);
    }
    return parts.length > 0 ? parts.join(' · ') : null;
  }, [field.max_length, field.min_length]);

  if (readOnly) {
    if (items.length === 0) {
      return <div className={styles.photoFieldReadOnlyEmpty}>No photos uploaded.</div>;
    }

    return (
      <div className={`${styles.photoField} ${className || ''}`}>
        {items.map((item) => (
          <figure key={item.key} className={styles.photoPreview}>
            <div className={styles.photoThumbWrapper}>
              {item.previewUrl ? (
                <img
                  src={item.previewUrl}
                  alt={item.caption || item.filename}
                  className={styles.photoThumb}
                />
              ) : (
                <div className={styles.photoThumbPlaceholder} aria-hidden="true">
                  📷
                </div>
              )}
            </div>
            {item.caption && (
              <figcaption className={styles.photoCaptionStatic}>{item.caption}</figcaption>
            )}
          </figure>
        ))}
      </div>
    );
  }

  const {
    readOnly: _ignoredReadOnly,
    required: _ignoredRequired,
    id,
    name,
    ...otherInputProps
  } = inputProps;

  return (
    <div className={`${styles.photoField} ${className || ''}`}>
      <div className={styles.photoFieldControls}>
        <input
          id={id}
          name={name || field.data_name || 'photo_upload'}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFilesSelected}
          disabled={readOnly}
          {...otherInputProps}
        />
        {minMaxInfo && <div className={styles.photoFieldInfo}>{minMaxInfo}</div>}
      </div>

      {items.length > 0 ? (
        <div className={styles.photoPreviewList}>
          {items.map((item) => (
            <div key={item.key} className={styles.photoPreview}>
              <div className={styles.photoThumbWrapper}>
                {item.previewUrl ? (
                  <img
                    src={item.previewUrl}
                    alt={item.caption || item.filename}
                    className={styles.photoThumb}
                  />
                ) : (
                  <div className={styles.photoThumbPlaceholder} aria-hidden="true">
                    📷
                  </div>
                )}
              </div>
              <input
                id={`${id || field.data_name || 'photo'}_${item.key}_caption`}
                name={`${name || field.data_name || 'photo_upload'}[${item.key}][caption]`}
                type="text"
                className={`${styles.photoCaptionInput} ${styles.input}`}
                placeholder="Add caption…"
                value={item.caption || ''}
                onChange={(event) => handleCaptionChange(item.key, event.target.value)}
                autoComplete="off"
              />
              <button
                type="button"
                className={styles.photoRemoveButton}
                onClick={() => handleRemove(item.key)}
                aria-label={`Remove ${item.filename}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.photoPlaceholder}>No photos selected.</div>
      )}
    </div>
  );
}
