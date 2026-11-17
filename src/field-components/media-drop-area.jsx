import React, { useState } from 'react';
import { Film, ImagePlus } from 'lucide-react';
import * as styles from '../field-renderer.css.js';

/**
 * The add area of photo and video fields: a label that wraps the field's own file input (so a
 * click opens the file picker as before) and also accepts dropped files. Dropped files go
 * through the same handler as picked ones.
 */
export function MediaDropArea({ kind, readOnly, info, onFiles, children }) {
  const [dragging, setDragging] = useState(false);
  const Icon = kind === 'video' ? Film : ImagePlus;
  const dropHandlers = readOnly
    ? {}
    : {
        onDragOver: (event) => {
          event.preventDefault();
          setDragging(true);
        },
        onDragLeave: () => setDragging(false),
        onDrop: (event) => {
          event.preventDefault();
          setDragging(false);
          const files = event.dataTransfer?.files;
          if (files && files.length > 0) onFiles({ target: { files, value: '' } });
        },
      };
  return (
    <label
      className={styles.mediaDrop}
      data-dragging={dragging ? 'true' : undefined}
      aria-disabled={readOnly ? 'true' : undefined}
      {...dropHandlers}
    >
      {children}
      <Icon size={20} strokeWidth={2} aria-hidden="true" />
      <span className={styles.mediaDropTitle}>
        {kind === 'video' ? 'Add videos' : 'Add photos'}
      </span>
      <span className={styles.mediaDropHint}>or drop them here{info ? ` · ${info}` : ''}</span>
    </label>
  );
}
