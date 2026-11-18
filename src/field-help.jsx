// The help a field gives besides its label: a description and a supporting image.
//
// - An inline image is a framed figure at the field's width; clicking it opens the image larger,
//   in the same viewer as the image button after the label.
// - The description and image dialogs are titled with the field's label. Escape, the close
//   button and a click on the backdrop close them; focus returns to what opened them.
import React, { useEffect, useRef } from 'react';
import { Maximize2, X } from 'lucide-react';
import * as styles from './field-help.css.js';

/**
 * Where a supporting image is loaded from: URLs as they are, other paths from the host's
 * `/supporting-images/` folder.
 * @param {string} path
 * @returns {string}
 */
export function supportingImageSrc(path) {
  return path.startsWith('http') ? path : `/supporting-images/${path}`;
}

/**
 * Opens a native `<dialog>` as modal while `open` is true. Its `close` event (Escape, the close
 * button, `dialog.close()`) sets `open` back to false and returns focus to the element that
 * had it before.
 * @param {boolean} open
 * @param {(open: boolean) => void} setOpen
 * @param {{ closeOnBackdrop?: boolean }} [options] with `closeOnBackdrop`, spread the returned
 *   `backdropProps` on the dialog; it must have no padding of its own, so that a click whose
 *   target is the dialog element landed on the backdrop.
 * @returns {{ dialogRef: React.RefObject<HTMLDialogElement>, backdropProps: object }}
 */
export function useModalDialog(open, setOpen, { closeOnBackdrop = false } = {}) {
  const dialogRef = useRef(null);
  const pressedOnBackdrop = useRef(false);

  useEffect(() => {
    const previousActiveElement = typeof document !== 'undefined' ? document.activeElement : null;
    const dialog = dialogRef.current;
    if (dialog && open) {
      dialog.showModal();
      dialog.addEventListener(
        'close',
        () => {
          setOpen(false);
          previousActiveElement?.focus?.();
        },
        { once: true }
      );
    }
    return () => {
      if (dialog && dialog.open) dialog.close();
    };
  }, [open]);

  // Both the press and the release on the backdrop: selecting text in the dialog and releasing
  // outside it does not close it.
  const backdropProps = closeOnBackdrop
    ? {
        onPointerDown: (event) => {
          pressedOnBackdrop.current = event.target === event.currentTarget;
        },
        onClick: (event) => {
          if (event.target === event.currentTarget && pressedOnBackdrop.current) {
            event.currentTarget.close();
          }
          pressedOnBackdrop.current = false;
        },
      }
    : {};

  return { dialogRef, backdropProps };
}

function HelpDialog({ open, setOpen, className, titleId, title, children }) {
  const { dialogRef, backdropProps } = useModalDialog(open, setOpen, { closeOnBackdrop: true });
  return (
    <dialog ref={dialogRef} className={className} aria-labelledby={titleId} {...backdropProps}>
      <div className={styles.dialogContent}>
        <div className={styles.dialogHeader}>
          <h3 id={titleId} className={styles.dialogTitle}>
            {title}
          </h3>
          <button
            type="button"
            className={styles.dialogCloseButton}
            onClick={() => dialogRef.current?.close()}
            aria-label="Close"
          >
            <X size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

/**
 * @param {{ open: boolean, setOpen: (open: boolean) => void, titleId: string, title: string,
 *   description: string }} props
 */
export function DescriptionDialog({ open, setOpen, titleId, title, description }) {
  return (
    <HelpDialog
      open={open}
      setOpen={setOpen}
      className={styles.descriptionDialog}
      titleId={titleId}
      title={title}
    >
      <p className={styles.descriptionText}>{description}</p>
    </HelpDialog>
  );
}

/**
 * @param {{ open: boolean, setOpen: (open: boolean) => void, titleId: string, title: string,
 *   src: string }} props
 */
export function ImageViewerDialog({ open, setOpen, titleId, title, src }) {
  return (
    <HelpDialog
      open={open}
      setOpen={setOpen}
      className={styles.imageDialog}
      titleId={titleId}
      title={title}
    >
      <div className={styles.imageFrame}>
        <img src={src} alt={title} className={styles.viewerImage} />
      </div>
    </HelpDialog>
  );
}

/**
 * The inline image: a framed figure that opens the viewer.
 * @param {{ src: string, label: string, expanded: boolean, onOpen: () => void }} props
 */
export function SupportingImageFigure({ src, label, expanded, onOpen }) {
  return (
    <figure className={styles.figure}>
      <button
        type="button"
        className={styles.figureButton}
        onClick={onOpen}
        aria-label={`View supporting image for ${label}`}
        aria-haspopup="dialog"
        aria-expanded={expanded}
      >
        <img src={src} alt={label} className={styles.figureImage} />
        <span className={styles.figureExpand} aria-hidden="true">
          <Maximize2 size={14} strokeWidth={2} />
        </span>
      </button>
    </figure>
  );
}
