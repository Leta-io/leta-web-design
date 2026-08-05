import * as React from 'react';
import { Badge, ContentPrimitives, NotificationBanner } from '@leta/components';
import { Icon, type IconName } from '@leta/icons';
import type { DriverGroup } from '../../store/types.js';
import { ensureSpinnerStyles, prefersReducedMotion, SPINNER_CLASS, useBroadcastSignalIcon } from './broadcastSignal.js';

/**
 * Driver Group Card (Figma `1707:120011`, "Driver Group Cards") — one card per
 * priority tier of a depot's driver-group ladder (In-house [P1] / Suppliers [P2] /
 * Floaters [P3] …), showing the group's acceptance window, capacity, and escalation
 * rule. Rendered in the Dispatch Logs **Priority Driver Groups** drill-down, which
 * only exists for `managed-fleet` tenants (marketplace tenants have no groups).
 * Playground-local (matches the OrderOverviewCard / Picup Code Banner precedent) —
 * not promoted to `@leta/components`.
 *
 * `broadcasting` swaps in the live "Broadcasting" badge + elapsed/found meta line +
 * top-pinned accent bar (Figma `State=Broadcasting`); otherwise the card shows its
 * static queued metrics (`State=Default`).
 *
 * Data comes from the depot's {@link DriverGroup} config, so the ladder is whatever
 * the tenant admin configured — not a hardcoded three-tier assumption.
 */

/**
 * The escalation footnote — depends on where this group sits in the ladder.
 * The window a group broadcasts for is `acceptanceWindow × retries` (each retry
 * re-runs the same acceptance window). Copy is phrased condition-first and in
 * active voice ("If no driver accepts within Ns, …") — clearer and friendlier
 * than the old passive "Escalates to … after Ns if the broadcast is unaccepted."
 *
 * The next group is named in the **bracket form** — `Suppliers [P2]`, matching the
 * card titles and the timeline's leg titles. (Ruled 2026-08-05; the banner previously
 * used the parenthesised prose form. The status card's *sentence* copy in
 * `broadcastModel.ts` still says "…to In-house drivers (P1) was unaccepted." because
 * Figma writes that one in prose form — don't unify the two without a ruling.)
 */
function escalationCopy(group: DriverGroup, ladder: DriverGroup[], fallbackEnabled: boolean): string {
  const next = ladder.find((g) => g.priority === group.priority + 1);
  const seconds = group.acceptanceWindowSeconds * Math.max(1, group.retries);
  if (next) {
    return `If no driver accepts within ${seconds} seconds, the order escalates to ${next.name} [P${next.priority}].`;
  }
  // Last group in the ladder: either the fallback sweep or a re-run from P1.
  return fallbackEnabled
    ? `If no driver accepts within ${seconds} seconds, the order is broadcast to all available drivers near the depot.`
    : `If no driver accepts within ${seconds} seconds, the broadcast re-runs from P1.`;
}

function MetricRow({ label, value, icon }: { label: string; value: string; icon?: IconName }): React.ReactElement {
  return (
    <ContentPrimitives
      type="horizontal-list-row"
      titleName={label}
      listRowText={value}
      showDescriptionLeadingIcon={!!icon}
      descriptionLeadingIcon={icon}
      showInteractiveElements={false}
    />
  );
}

export function DriverGroupCard({
  group,
  ladder,
  fallbackEnabled = true,
  broadcasting = false,
  driversFound = 3,
  elapsedSeconds = 0,
  attemptPct = 0,
  attempt = 1,
}: {
  /** The group this card describes (from the depot's configured ladder). */
  group: DriverGroup;
  /** The full ladder, so the escalation footnote can name the next group. Defaults to just this group. */
  ladder?: DriverGroup[];
  /** Whether the depot closes its sequence with a fallback round (drives the last group's footnote). */
  fallbackEnabled?: boolean;
  /** State=Broadcasting (live badge + meta + accent bar) vs State=Default (queued). */
  broadcasting?: boolean;
  /** "M drivers found" — only shown while broadcasting. */
  driversFound?: number;
  /**
   * Seconds this group's leg has been running, from the shared broadcast clock
   * (`liveBroadcast.resolveLive`). The card no longer keeps its own interval:
   * doing so let it drift from the timeline and, once past
   * `acceptanceWindow × retries`, pin the bar at 100% forever — the stuck bar on
   * Floaters [P3]. Escalation is the caller's decision now, driven by the clock.
   */
  elapsedSeconds?: number;
  /**
   * 0–100 fill of the CURRENT retry attempt. Restarts at zero on each retry
   * rather than continuing or holding full.
   */
  attemptPct?: number;
  /** 1-based retry currently running, for the "try N of M" meta. */
  attempt?: number;
}): React.ReactElement {
  ensureSpinnerStyles();
  const meta = {
    number: group.priority,
    title: `${group.name} [P${group.priority}]`,
    acceptanceWindow: `${group.acceptanceWindowSeconds} seconds`,
    acceptanceWindowSeconds: group.acceptanceWindowSeconds,
    maxOrders: group.maxOrders,
    totalDrivers: group.totalDrivers,
    retries: group.retries,
    escalation: escalationCopy(group, ladder ?? [group], fallbackEnabled),
  };

  // "Searching for signal" illusion — cycles 1→2→3 bars while broadcasting. Shared
  // with the timeline's live "Broadcasting" badge so both read as one animation.
  const signalIcon = useBroadcastSignalIcon(broadcasting);

  const elapsed = Math.round(elapsedSeconds);
  const progressPct = attemptPct;
  // The bar restarts each retry, so suppress the width transition on the
  // wrap-around — otherwise it visibly slides backwards from 100% to 0%.
  const wrapping = progressPct < 4;

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        backgroundColor: 'var(--surface-neutral-bg-default)',
        border: 'var(--stroke-xs) solid var(--border-neutral-default)',
        borderRadius: 'var(--rounding-xl)',
        overflow: 'hidden',
      }}
    >
      {/* Accent bar — a rounded loading bar pinned to the top edge. Fills over ONE
          acceptance window then restarts for the next retry (never sticks full);
          when the group's last retry ends the caller moves `broadcasting` to the
          next group and this card goes back to its queued state. */}
      {broadcasting && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: 4,
            width: `${progressPct}%`,
            backgroundColor: 'var(--icons-information-default)',
            borderRadius: 'var(--rounding-round)',
            transition: wrapping || prefersReducedMotion() ? 'none' : 'width 500ms linear',
          }}
        />
      )}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--spacing-8px)',
            padding: 'var(--padding-20px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-8px)', minWidth: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 24,
                height: 24,
                flexShrink: 0,
                borderRadius: 'var(--rounding-md)',
                backgroundColor: 'var(--surface-neutral-bg-raised)',
                border: 'var(--stroke-xs) solid var(--border-neutral-default)',
              }}
            >
              <span className="text-label-s-medium" style={{ color: 'var(--text-default-label)' }}>{meta.number}</span>
            </div>
            <span className="text-label-m-semibold" style={{ color: 'var(--text-default-heading)', whiteSpace: 'nowrap' }}>
              {meta.title}
            </span>
            {broadcasting && (
              <Badge color="information" label="Broadcasting" leadingIcon={signalIcon} />
            )}
          </div>
          {broadcasting && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-8px)', flexShrink: 0 }}>
              <span className={SPINNER_CLASS} style={{ display: 'flex', color: 'var(--icons-information-default)' }}>
                <Icon name="Loading" size={16} />
              </span>
              {/* tabular-nums: the elapsed/found counts tick live — fixed-width digits
                  keep the text from jittering as it grows from 9s to 10s etc. */}
              <span
                className="text-label-s-regular"
                style={{ color: 'var(--text-default-sub-body)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}
              >
                {elapsed}s elapsed · {driversFound} drivers found
                {meta.retries > 1 ? ` · try ${attempt} of ${meta.retries}` : ''}
              </span>
            </div>
          )}
        </div>
        <div style={{ height: 0, borderTop: 'var(--stroke-xs) solid var(--border-neutral-default)', width: '100%' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-16px)', padding: 'var(--padding-20px)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-16px)' }}>
          <MetricRow label="Acceptance window" value={meta.acceptanceWindow} icon="Timer" />
          {/* `Refresh` per Figma (`Icon/Refresh`) — the retry glyph, not `Redo`. It has no
              outline sibling in the registry, so it renders filled exactly as Figma shows,
              unlike its three `-Outline` neighbours below. */}
          <MetricRow label="Retries" value={String(meta.retries)} icon="Refresh" />
          <MetricRow label="Max orders" value={String(meta.maxOrders)} icon="Orders" />
          <MetricRow label="Total drivers" value={String(meta.totalDrivers)} icon="Account" />
        </div>
        <NotificationBanner type="neutral" variant="filled" description={meta.escalation} />
      </div>
    </div>
  );
}
