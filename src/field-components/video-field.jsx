import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import * as styles from '../field-renderer.css.js';

const PLACEHOLDER_ICON = '🎬';

function normalizeVideos(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry, index) => {
      const filename = entry.filename || entry.name || `video-${index + 1}`;
      const caption = entry.caption ?? null;
      const durationRaw = entry.duration ?? entry.duration_seconds ?? entry.length ?? 0;
      const duration =
        typeof durationRaw === 'number' && Number.isFinite(durationRaw) && durationRaw >= 0
          ? durationRaw
          : 0;
      const previewUrl =
        entry.previewUrl ||
        entry.url ||
        entry.file_url ||
        entry.thumbnail_url ||
        entry.asset_url ||
        null;

      return {
        key: entry._localId || entry.video_id || `${filename}-${index}`,
        video_id: entry.video_id ?? null,
        filename,
        caption,
        duration,
        previewUrl,
        file: entry.file || null,
        _localId: entry._localId || null,
        original: entry,
      };
    });
}

function mapToValue(items) {
  return items.map((item) => {
    const base = item.original && typeof item.original === 'object' ? { ...item.original } : {};

    const duration =
      typeof item.duration === 'number' && Number.isFinite(item.duration) && item.duration >= 0
        ? item.duration
        : 0;

    return {
      ...base,
      video_id: item.video_id ?? null,
      filename: item.filename || item.original?.filename || 'video',
      caption: item.caption ?? null,
      duration,
      previewUrl: item.previewUrl || base.previewUrl || null,
      url: item.previewUrl || base.url || base.file_url || null,
      _localId: item._localId || null,
      ...(item.file ? { file: item.file } : {}),
    };
  });
}

function formatDuration(durationSeconds) {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return '0:00';
  }
  const totalSeconds = Math.round(durationSeconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function canUseBrowserAPIs() {
  return (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined' &&
    typeof URL !== 'undefined' &&
    typeof URL.createObjectURL === 'function'
  );
}

function revokeObjectUrlSafe(url) {
  if (
    typeof url === 'string' &&
    url.startsWith('blob:') &&
    typeof URL !== 'undefined' &&
    typeof URL.revokeObjectURL === 'function'
  ) {
    URL.revokeObjectURL(url);
  }
}

export function VideoFieldComponent({
  field,
  value,
  onChange,
  readOnly,
  inputProps = {},
  className,
}) {
  const items = useMemo(() => normalizeVideos(value), [value]);
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const objectUrlRef = useRef(new Set());

  const revokeAllObjectUrls = useCallback(() => {
    objectUrlRef.current.forEach((url) => revokeObjectUrlSafe(url));
    objectUrlRef.current.clear();
  }, []);

  useEffect(() => {
    return () => {
      revokeAllObjectUrls();
    };
  }, [revokeAllObjectUrls]);

  useEffect(() => {
    const activeBlobUrls = new Set(
      items
        .map((item) => item.previewUrl)
        .filter((url) => typeof url === 'string' && url.startsWith('blob:'))
    );

    objectUrlRef.current.forEach((url) => {
      if (!activeBlobUrls.has(url)) {
        revokeObjectUrlSafe(url);
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

  const extractMetadataForFile = useCallback(async (file) => {
    if (!file || !canUseBrowserAPIs()) {
      return { objectUrl: null, duration: 0 };
    }

    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current.add(objectUrl);

    return new Promise((resolve) => {
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      tempVideo.muted = true;

      const finalize = (duration) => {
        tempVideo.onloadedmetadata = null;
        tempVideo.onerror = null;
        tempVideo.removeAttribute('src');
        tempVideo.load?.();
        tempVideo.remove();
        resolve({ objectUrl, duration });
      };

      tempVideo.onloadedmetadata = () => {
        const rawDuration = Number(tempVideo.duration);
        const duration = Number.isFinite(rawDuration) && rawDuration >= 0 ? rawDuration : 0;
        finalize(duration);
      };

      tempVideo.onerror = () => {
        finalize(0);
      };

      tempVideo.src = objectUrl;
    });
  }, []);

  const handleFilesSelected = useCallback(
    async (event) => {
      if (readOnly) return;
      const fileList = event.target.files;
      if (!fileList || fileList.length === 0) return;

      const files = Array.from(fileList).filter(Boolean);
      if (files.length === 0) {
        event.target.value = '';
        return;
      }

      const currentItems = itemsRef.current;
      const nextItems = [...currentItems];

      const metadata = await Promise.all(files.map((file) => extractMetadataForFile(file)));

      files.forEach((file, index) => {
        const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const filename = file.name || localId;
        const { objectUrl, duration } = metadata[index] || {};

        nextItems.push({
          key: localId,
          video_id: null,
          filename,
          caption: null,
          duration: typeof duration === 'number' && Number.isFinite(duration) ? duration : 0,
          previewUrl: objectUrl || null,
          file,
          _localId: localId,
          original: {
            video_id: null,
            filename,
            caption: null,
            duration: typeof duration === 'number' && Number.isFinite(duration) ? duration : 0,
            previewUrl: objectUrl || null,
            _localId: localId,
            file,
          },
        });
      });

      emitChange(nextItems);
      event.target.value = '';
    },
    [emitChange, extractMetadataForFile, readOnly]
  );

  const handleRemove = useCallback(
    (itemKey) => {
      if (readOnly) return;
      const currentItems = itemsRef.current;
      const target = currentItems.find((item) => item.key === itemKey);
      if (target?.previewUrl && objectUrlRef.current.has(target.previewUrl)) {
        revokeObjectUrlSafe(target.previewUrl);
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
      const nextCaption = caption?.trim() ? caption.trim() : null;
      const updated = currentItems.map((item) =>
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
      emitChange(updated);
    },
    [emitChange, readOnly]
  );

  const minMaxInfo = useMemo(() => {
    const parts = [];
    if (field.min_length != null) {
      parts.push(`Min duration: ${field.min_length} minute${field.min_length === 1 ? '' : 's'}`);
    }
    if (field.max_length != null) {
      parts.push(`Max duration: ${field.max_length} minute${field.max_length === 1 ? '' : 's'}`);
    }
    return parts.length > 0 ? parts.join(' · ') : null;
  }, [field.max_length, field.min_length]);

  const totalDurationLabel = useMemo(() => {
    const total = items.reduce((sum, item) => {
      if (typeof item.duration !== 'number' || !Number.isFinite(item.duration)) {
        return sum;
      }
      return sum + Math.max(0, item.duration);
    }, 0);
    if (total <= 0) return null;
    return `Total duration: ${formatDuration(total)}`;
  }, [items]);

  const { readOnly: _ignoredReadOnly, required: _ignoredRequired, ...otherInputProps } =
    inputProps;

  if (readOnly) {
    if (items.length === 0) {
      return <div className={styles.videoFieldReadOnlyEmpty}>No videos uploaded.</div>;
    }

    return (
      <div className={`${styles.videoField} ${className || ''}`}>
        {items.map((item) => (
          <figure key={item.key} className={styles.videoPreview}>
            <div className={styles.videoThumbWrapper}>
              {item.previewUrl ? (
                <video
                  className={styles.videoThumb}
                  src={item.previewUrl}
                  controls
                  preload="metadata"
                />
              ) : (
                <div className={styles.videoThumbPlaceholder} aria-hidden="true">
                  {PLACEHOLDER_ICON}
                </div>
              )}
            </div>
            <figcaption className={styles.videoMeta}>
              <div className={styles.videoFilename} title={item.filename}>
                {item.filename}
              </div>
              <div className={styles.videoDuration}>{formatDuration(item.duration)}</div>
              {item.caption && <div className={styles.videoCaptionStatic}>{item.caption}</div>}
            </figcaption>
          </figure>
        ))}
        {totalDurationLabel && (
          <div className={styles.videoFieldInfo} aria-live="polite">
            {totalDurationLabel}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`${styles.videoField} ${className || ''}`}>
      <div className={styles.videoFieldControls}>
        <input
          type="file"
          accept="video/*"
          multiple
          onChange={handleFilesSelected}
          disabled={readOnly}
          {...otherInputProps}
        />
        {minMaxInfo && <div className={styles.videoFieldInfo}>{minMaxInfo}</div>}
        {totalDurationLabel && <div className={styles.videoFieldInfo}>{totalDurationLabel}</div>}
      </div>

      {items.length > 0 ? (
        <div className={styles.videoPreviewList}>
          {items.map((item) => (
            <div key={item.key} className={styles.videoPreview}>
              <div className={styles.videoThumbWrapper}>
                {item.previewUrl ? (
                  <video
                    className={styles.videoThumb}
                    src={item.previewUrl}
                    controls
                    preload="metadata"
                  />
                ) : (
                  <div className={styles.videoThumbPlaceholder} aria-hidden="true">
                    {PLACEHOLDER_ICON}
                  </div>
                )}
              </div>
              <div className={styles.videoMeta}>
                <span className={styles.videoFilename} title={item.filename}>
                  {item.filename}
                </span>
                <span className={styles.videoDuration}>{formatDuration(item.duration)}</span>
              </div>
              <input
                type="text"
                className={styles.videoCaptionInput}
                placeholder="Add caption…"
                value={item.caption || ''}
                onChange={(event) => handleCaptionChange(item.key, event.target.value)}
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
        <div className={styles.videoPlaceholder}>No videos selected.</div>
      )}
    </div>
  );
}
