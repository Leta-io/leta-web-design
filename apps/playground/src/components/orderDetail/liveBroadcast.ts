import type { DepotBroadcastConfig } from '../../store/types.js';

/**
 * The **live broadcast clock** — one derivation of "where is this sequence right
 * now?", shared by the Dispatch Logs status card, the Broadcast Logs timeline and
 * the Priority Driver Groups drill-down.
 *
 * ## What this replaced (2026-08-04)
 *
 * There was no time model at all. `reachedRounds` was a hash of the order id, so
 * the sequence was a frozen snapshot: the active group never advanced. And
 * `DriverGroupCard` ran its own local `setInterval`, filling one sawtooth per
 * acceptance window and then **holding at 100% forever** — the "progress bar just
 * got stuck there" on Floaters [P3], with no escalation to the next tier.
 *
 * ## The timeline
 *
 * A sequence is a flat list of **legs** laid end to end:
 *
 * ```
 * [pre-offer]? → round 1: group P1, P2, P3… → round 2: P1, P2, P3… → [fallback]?
 * ```
 *
 * Each **group leg** lasts `acceptanceWindow × retries` seconds and is internally
 * divided into `retries` **attempts** of `acceptanceWindow` each. That division is
 * what the group card's bar renders: it fills over one acceptance window, then
 * **restarts from zero for the next retry** — it never regresses mid-attempt and
 * never sticks at 100%. When the last attempt ends the leg is over and the next
 * leg (the next priority group, or the fallback sweep) becomes the active one.
 *
 * Everything is a pure function of `elapsedSeconds`, so every surface reading the
 * same clock necessarily agrees, and there is no per-component interval to drift.
 */

/** Round-1 pre-offer lead + fallback-sweep windows. */
export const PRE_OFFER_SECONDS = 20;
export const FALLBACK_SECONDS = 40;

export interface LiveLeg {
  kind: 'pre-offer' | 'group' | 'fallback';
  /** Index into `config.groups` for a group leg; null otherwise. */
  groupIndex: number | null;
  /** 1-based typical-round number; null for the fallback leg. */
  round: number | null;
  /** Seconds from sequence start when this leg begins / ends. */
  startSec: number;
  endSec: number;
  /** How many acceptance-window attempts this leg contains (`retries`). */
  attempts: number;
  /** Length of ONE attempt — the span the group card's bar fills. */
  attemptSeconds: number;
}

export interface LiveSequence {
  legs: LiveLeg[];
  totalSeconds: number;
  /** Index into `legs` of the leg running now; null once the sequence is spent. */
  activeIndex: number | null;
  /** 1-based attempt within the active leg (`1` … `attempts`). */
  attempt: number;
  /** 0–100 progress through the CURRENT attempt — restarts on each retry. */
  attemptPct: number;
  /** Seconds since the active leg began (the group card's "Ns elapsed"). */
  legElapsedSeconds: number;
  /** 0–100 progress through the whole sequence (the status card's bar). */
  sequencePct: number;
  /** The sequence ran to the end with nobody accepting. */
  exhausted: boolean;
  /** How many typical rounds have been reached so far (1-based, ≥1). */
  reachedRounds: number;
  /** Whether the fallback sweep has been reached. */
  reachedFallback: boolean;
}

/** Lays the legs of one sequence end to end. */
export function buildTimeline(config: DepotBroadcastConfig): LiveLeg[] {
  const legs: LiveLeg[] = [];
  let t = 0;
  const push = (
    kind: LiveLeg['kind'],
    groupIndex: number | null,
    round: number | null,
    attempts: number,
    attemptSeconds: number,
  ) => {
    const span = attempts * attemptSeconds;
    legs.push({ kind, groupIndex, round, startSec: t, endSec: t + span, attempts, attemptSeconds });
    t += span;
  };

  const rounds = Math.max(1, config.rounds);
  for (let round = 1; round <= rounds; round++) {
    // The pre-offer leads round 1 only — it is not a group and never repeats.
    if (round === 1 && config.preOfferEnabled) push('pre-offer', null, 1, 1, PRE_OFFER_SECONDS);
    config.groups.forEach((g, i) => {
      push('group', i, round, Math.max(1, g.retries), g.acceptanceWindowSeconds);
    });
  }
  if (config.fallbackEnabled) push('fallback', null, null, 1, FALLBACK_SECONDS);
  return legs;
}

/** Total wall-clock seconds one sequence runs. */
export function sequenceTotalSeconds(config: DepotBroadcastConfig): number {
  const legs = buildTimeline(config);
  return Math.max(1, legs.length ? legs[legs.length - 1]!.endSec : 1);
}

/**
 * Resolves the sequence position at `elapsedSeconds`.
 *
 * Past the end the sequence is **exhausted** (nobody accepted) — `activeIndex` is
 * null and the caller is expected to drop the order back to Pending.
 */
export function resolveLive(config: DepotBroadcastConfig, elapsedSeconds: number): LiveSequence {
  const legs = buildTimeline(config);
  const totalSeconds = legs.length ? legs[legs.length - 1]!.endSec : 1;
  const elapsed = Math.max(0, elapsedSeconds);

  const activeIndex = legs.findIndex((l) => elapsed < l.endSec);
  const exhausted = activeIndex === -1;
  const active = exhausted ? null : legs[activeIndex]!;

  let attempt = 1;
  let attemptPct = 100;
  let legElapsedSeconds = 0;
  if (active) {
    legElapsedSeconds = Math.max(0, elapsed - active.startSec);
    // Which retry we're on, and how far through it — the modulo is what makes the
    // bar restart at zero on each retry instead of continuing or sticking.
    attempt = Math.min(active.attempts, Math.floor(legElapsedSeconds / active.attemptSeconds) + 1);
    attemptPct = ((legElapsedSeconds % active.attemptSeconds) / active.attemptSeconds) * 100;
  }

  // Rounds/fallback actually reached — drives how much timeline history exists.
  const reached = exhausted ? legs : legs.slice(0, activeIndex + 1);
  const reachedRounds = Math.max(1, ...reached.map((l) => l.round ?? 1));
  const reachedFallback = reached.some((l) => l.kind === 'fallback');

  return {
    legs,
    totalSeconds,
    activeIndex: exhausted ? null : activeIndex,
    attempt,
    attemptPct,
    legElapsedSeconds,
    sequencePct: Math.min(100, (elapsed / totalSeconds) * 100),
    exhausted,
    reachedRounds,
    reachedFallback,
  };
}

/**
 * Seconds a seeded fixture's sequence should already be into its run when the app
 * loads, so review sessions open onto a *mid-sequence* order rather than one that
 * has only just started. Deterministic per order id, and re-derived on every load
 * — which is what keeps demos repeatable while the sequence still genuinely
 * progresses while you watch it.
 */
export function seededOffsetSeconds(config: DepotBroadcastConfig, hash: number): number {
  const total = sequenceTotalSeconds(config);
  // Land somewhere in the first ~70% so there is always visible runway left.
  return Math.floor((hash % 100) / 100 * total * 0.7);
}
