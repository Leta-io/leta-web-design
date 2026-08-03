import * as React from 'react';
import { Badge, ContentPrimitives, NotificationBanner } from '@leta/components';
import { Icon, type IconName } from '@leta/icons';
import type { DriverGroup } from '../../store/types.js';
import { prefersReducedMotion, useBroadcastSignalIcon } from './broadcastSignal.js';

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

/** The escalation footnote — depends on where this group sits in the ladder. */
function escalationCopy(group: DriverGroup, ladder: DriverGroup[], fallbackEnabled: boolean): string {
  const next = ladder.find((g) => g.priority === group.priority + 1);
  const seconds = group.acceptanceWindowSeconds * Math.max(1, group.retries);
  if (next) {
    return `Escalates to ${next.name} (P${next.priority}) after ${seconds} seconds if the broadcast is unaccepted.`;
  }
  // Last group in the ladder: either the fallback sweep or a re-run from P1.
  return fallbackEnabled
    ? `All available drivers near the depot will receive the broadcast after ${seconds} seconds if unaccepted.`
    : `Broadcast will re-run from P1 after ${seconds} seconds if unaccepted.`;
}

let stylesInjected = false;
function ensureStyles(): void {
  if (stylesInjected || typeof document === 'undefined') return;
  stylesInjected = true;
  const el = document.createElement('style');
  el.setAttribute('data-leta', 'driver-group-card');
  el.textContent = `
@keyframes leta-driver-group-spin { to { transform: rotate(360deg); } }
.leta-driver-group-spinner { animation: leta-driver-group-spin 1s linear infinite; }
@media (prefers-reduced-motion: reduce) { .leta-driver-group-spinner { animation: none; } }`;
  document.head.appendChild(el);
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
  initialElapsedSeconds = 10,
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
  initialElapsedSeconds?: number;
}): React.ReactElement {
  ensureStyles();
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

  const [elapsed, setElapsed] = React.useState(initialElapsedSeconds);
  React.useEffect(() => {
    if (!broadcasting) return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [broadcasting]);

  // "Searching for signal" illusion — cycles 1→2→3 bars while broadcasting. Shared
  // with the timeline's live "Broadcasting" badge so both read as one animation.
  const signalIcon = useBroadcastSignalIcon(broadcasting);

  // Progress bar fills linearly over one full acceptance window, then loops —
  // each loop reads as one retry attempt (Retries: N in the metrics below).
  const progressPct = Math.min(100, ((elapsed % meta.acceptanceWindowSeconds) / meta.acceptanceWindowSeconds) * 100);

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
      {/* Accent bar — pinned to the very top edge of the card, full width,
          filling in step with `elapsed` (not a decorative pulse). */}
      {broadcasting && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: 4,
            width: `${progressPct}%`,
            backgroundColor: 'var(--icons-information-default)',
            transition: 'width 1s linear',
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
              <span className="leta-driver-group-spinner" style={{ display: 'flex', color: 'var(--icons-information-default)' }}>
                <Icon name="Loading" size={16} />
              </span>
              {/* tabular-nums: the elapsed/found counts tick live — fixed-width digits
                  keep the text from jittering as it grows from 9s to 10s etc. */}
              <span
                className="text-label-s-regular"
                style={{ color: 'var(--text-default-sub-body)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}
              >
                {elapsed}s elapsed · {driversFound} drivers found
              </span>
            </div>
          )}
        </div>
        <div style={{ height: 0, borderTop: 'var(--stroke-xs) solid var(--border-neutral-default)', width: '100%' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-16px)', padding: 'var(--padding-20px)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-16px)' }}>
          <MetricRow label="Acceptance window" value={meta.acceptanceWindow} icon="Timer" />
          <MetricRow label="Max orders" value={String(meta.maxOrders)} icon="Orders" />
          <MetricRow label="Total drivers" value={String(meta.totalDrivers)} icon="Account" />
          <MetricRow label="Retries" value={String(meta.retries)} />
        </div>
        <NotificationBanner type="neutral" variant="filled" description={meta.escalation} />
      </div>
    </div>
  );
}
