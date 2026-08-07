import * as React from 'react';
import type { IconName } from '@leta-io/icons';

/**
 * Shared "searching for signal" micro-animation — cycles 1→2→3 signal bars while a
 * broadcast is live. Used by both the Priority Driver Groups card (the group
 * currently being broadcast to) and the Broadcast Logs timeline's live "Broadcasting"
 * badge, so the two surfaces read as the same animation rather than one static and
 * one live (corrections pass, 2026-08-03).
 */
export const SIGNAL_ICONS: IconName[] = ['Signal-1-Bar', 'Signal-2-Bars', 'Signal-3-Bars'];
const SIGNAL_STEP_MS = 500;

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/**
 * The shared "waiting on a response" spinner — a rotating `Icon/Loading` in
 * `--icons-information-default`. Figma uses the identical treatment in two places
 * (Driver Group Card's live header meta `1707:120008`, and every still-awaiting
 * driver row inside an Active Broadcast Event Accordion `569:61190`), so the
 * keyframes live here rather than being re-declared per component — two copies
 * would be free to drift out of sync.
 *
 * Apply the class AND the colour: `<span className={SPINNER_CLASS} style={{ display: 'flex',
 * color: 'var(--icons-information-default)' }}><Icon name="Loading" size={16} /></span>`.
 */
export const SPINNER_CLASS = 'leta-broadcast-spinner';

let spinnerInjected = false;
export function ensureSpinnerStyles(): void {
  if (spinnerInjected || typeof document === 'undefined') return;
  spinnerInjected = true;
  const el = document.createElement('style');
  el.setAttribute('data-leta', 'broadcast-spinner');
  el.textContent = `
@keyframes leta-broadcast-spin { to { transform: rotate(360deg); } }
.${SPINNER_CLASS} { animation: leta-broadcast-spin 1s linear infinite; }
@media (prefers-reduced-motion: reduce) { .${SPINNER_CLASS} { animation: none; } }`;
  document.head.appendChild(el);
}

/** Returns the current signal-bar icon, cycling while `active`. Settles on the full
 *  3-bar icon when inactive or under `prefers-reduced-motion`. */
export function useBroadcastSignalIcon(active: boolean): IconName {
  const [idx, setIdx] = React.useState(() => (active && !prefersReducedMotion() ? 0 : SIGNAL_ICONS.length - 1));
  React.useEffect(() => {
    if (!active || prefersReducedMotion()) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % SIGNAL_ICONS.length), SIGNAL_STEP_MS);
    return () => clearInterval(t);
  }, [active]);
  return SIGNAL_ICONS[idx]!;
}
