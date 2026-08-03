import * as React from 'react';
import type { IconName } from '@leta/icons';

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
