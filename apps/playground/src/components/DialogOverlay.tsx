import * as React from 'react';
import { createPortal } from 'react-dom';

/**
 * Shared scrim + animated panel wrapper for the centered confirmation dialogs
 * (Cancel Order / Update Status / Reschedule) — previously each rendered its
 * own static `position:fixed` scrim + panel with **no** enter/exit animation
 * at all, unlike the AddOrderDrawer / View Order drawer's slide. Mirrors that
 * same enter/exit choreography (interruptible CSS transitions, ease-out in /
 * ease-in out, per the `make-interfaces-feel-better` skill) so every overlay
 * in the app opens and closes the same way.
 *
 * The dialog's own `onCancel`/`onClose`/`onConfirm` must call the `close` (or
 * `closeAnd`) helper handed to the render-prop children — NOT the `onClose`
 * prop directly — so the exit animation plays before the parent actually
 * unmounts this component (the parent clears its own state synchronously on
 * confirm/close, which would otherwise skip the exit entirely).
 */

const EXIT_MS = 160;

let stylesInjected = false;
function ensureStyles(): void {
  if (stylesInjected || typeof document === 'undefined') return;
  stylesInjected = true;
  const el = document.createElement('style');
  el.setAttribute('data-leta', 'dialog-overlay');
  el.textContent = `
.leta-dialog-scrim { opacity: 0; transition: opacity 220ms ease-out; }
.leta-dialog-scrim.open { opacity: 1; }
.leta-dialog-scrim.closing { transition: opacity ${EXIT_MS}ms ease-in; opacity: 0; }
.leta-dialog-panel { opacity: 0; transform: translate(-50%, -50%) scale(0.96); transition: opacity 220ms cubic-bezier(0.2, 0, 0, 1), transform 220ms cubic-bezier(0.2, 0, 0, 1); }
.leta-dialog-panel.open { opacity: 1; transform: translate(-50%, -50%) scale(1); }
.leta-dialog-panel.closing { transition: opacity ${EXIT_MS}ms ease-in, transform ${EXIT_MS}ms ease-in; opacity: 0; transform: translate(-50%, -50%) scale(0.96); }
@media (prefers-reduced-motion: reduce) {
  .leta-dialog-scrim, .leta-dialog-scrim.open, .leta-dialog-scrim.closing,
  .leta-dialog-panel, .leta-dialog-panel.open, .leta-dialog-panel.closing { transition: none; }
}`;
  document.head.appendChild(el);
}

export interface DialogOverlayHelpers {
  /** Plays the exit animation, then calls the parent's `onClose`. */
  close: () => void;
  /** Plays the exit animation, then calls `fn` (e.g. the parent's `onConfirm`). */
  closeAnd: (fn: () => void) => void;
}

export function DialogOverlay({
  onClose,
  children,
  extra,
}: {
  onClose: () => void;
  children: (helpers: DialogOverlayHelpers) => React.ReactNode;
  /** Additional portal content rendered as a sibling of the animated panel
   *  (e.g. RescheduleModal's date/time picker popover) — not itself animated. */
  extra?: React.ReactNode;
}): React.ReactElement {
  ensureStyles();
  const [closing, setClosing] = React.useState(false);
  // Double rAF: a single frame often lands in the same paint as the initial
  // (offscreen) render, skipping the transition entirely (confirmed live on
  // the drawer slide-in — the same root cause applies here).
  const [entered, setEntered] = React.useState(false);
  React.useEffect(() => {
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, []);

  const closeAnd = (fn: () => void) => {
    if (closing) return;
    setClosing(true);
    setTimeout(fn, EXIT_MS);
  };
  const close = () => closeAnd(onClose);
  const stateClass = closing ? 'closing' : entered ? 'open' : '';

  return createPortal(
    <>
      <div aria-hidden onClick={close} className={`leta-dialog-scrim ${stateClass}`} style={{ position: 'fixed', inset: 0, background: 'rgba(16,16,16,0.4)', zIndex: 1600 }} />
      <div className={`leta-dialog-panel ${stateClass}`} style={{ position: 'fixed', top: '50%', left: '50%', zIndex: 1601 }}>
        {children({ close, closeAnd })}
      </div>
      {extra}
    </>,
    document.body,
  );
}
