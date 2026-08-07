import * as React from 'react';
import {
  AccordionChevron,
  AccordionContent,
  AccordionHeader,
  Avatar,
  Badge,
  Button,
  Chip,
  ContentPrimitives,
  useAccordion,
  type BadgeColor,
} from '@leta-io/components';
import { Icon, type IconName } from '@leta-io/icons';
import { ensureSpinnerStyles, SPINNER_CLASS } from './broadcastSignal.js';

/**
 * Broadcast Event Accordion (Figma `569:61191`, "Broadcast Logs Tab
 * components") — the SaaS/managed-fleet Dispatch Logs shape: a single
 * broadcast event, expandable to a filterable list of the drivers it was
 * offered to. Playground-local (matches the OrderOverviewCard / Picup Code
 * Banner / Order Detail Accordions precedent) — not promoted to
 * `@leta-io/components`.
 *
 * `type="active"` (still broadcasting) buckets drivers into No response /
 * Declined; `type="completed"` (concluded) buckets into Timed out / Declined
 * — mirroring the two Figma `Type` variants. Header chip counts are derived
 * from `drivers`, never passed separately, so they can't drift.
 *
 * ## What a row's duration means (verified against `569:61190` / `569:61192`)
 *
 * The number beside a driver is **not** a per-row timer. Two of the three
 * statuses read the *leg's* clock and therefore all show the same value —
 * exactly as both Figma variants render them (four No-response rows at 40s;
 * two Timed-out rows at 40s):
 *
 * | Status | Duration | Spinner |
 * |---|---|---|
 * | `no-response` | {@link broadcastSeconds} — the live elapsed time of the broadcast to this leg | yes |
 * | `timed-out` | {@link broadcastSeconds} — the leg's full course (`acceptanceWindow × retries`) | no |
 * | `declined` | the driver's own {@link BroadcastDriver.seconds} — when they declined | no |
 *
 * A **timed out** badge means the broadcast to this driver ran its full course with
 * no answer either way; **declined** means they actively refused at `seconds`.
 */

export type DriverResponseStatus = 'no-response' | 'declined' | 'timed-out';

export interface BroadcastDriver {
  id: string;
  name: string;
  phone: string;
  status: DriverResponseStatus;
  /**
   * Seconds into the leg at which this driver **declined**. Only read for
   * `status: 'declined'` — the awaiting/timed-out statuses share the leg's own
   * clock (see {@link broadcastSeconds}) rather than carrying a value each.
   */
  seconds?: number;
}

const STATUS_META: Record<
  DriverResponseStatus,
  { label: string; color: BadgeColor; headerIcon: IconName; iconColor: string }
> = {
  'no-response': { label: 'No response', color: 'highlight', headerIcon: 'Clock', iconColor: 'var(--icons-highlight-default)' },
  declined: { label: 'Declined', color: 'error', headerIcon: 'Cancel', iconColor: 'var(--icons-error-default)' },
  'timed-out': { label: 'Timed out', color: 'caution', headerIcon: 'Hourglass', iconColor: 'var(--icons-caution-default)' },
};

/**
 * Which two statuses each accordion Type buckets drivers into, **in Figma's header
 * order** — which is also the list's sort order (`569:61190` leads with No response,
 * `569:61192` with Timed out; Declined is last in both).
 */
const TYPE_STATUSES: Record<'active' | 'completed', [DriverResponseStatus, DriverResponseStatus]> = {
  active: ['no-response', 'declined'],
  completed: ['timed-out', 'declined'],
};

let stylesInjected = false;
function ensureStyles(): void {
  if (stylesInjected || typeof document === 'undefined') return;
  stylesInjected = true;
  const el = document.createElement('style');
  el.setAttribute('data-leta', 'broadcast-event-accordion');
  // The whole header row (not just the chevron) tints on hover per Figma —
  // distinct from the shared AccordionBehaviour's chevron-only hover rule.
  el.textContent = `
.leta-broadcast-accordion-header { background-color: var(--surface-neutral-bg-subtle); transition: background-color 120ms cubic-bezier(0.2, 0, 0, 1); }
.leta-broadcast-accordion-header:hover { background-color: var(--surface-neutral-bg-muted); }
@media (prefers-reduced-motion: reduce) { .leta-broadcast-accordion-header { transition-duration: 0.01ms; } }`;
  document.head.appendChild(el);
}

function HeaderChip({ status, count }: { status: DriverResponseStatus; count: number }): React.ReactElement {
  const meta = STATUS_META[status];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-8px)' }}>
      <span style={{ display: 'flex', color: meta.iconColor }}>
        <Icon name={meta.headerIcon} outlined size={16} />
      </span>
      <span className="text-label-m-medium" style={{ color: 'var(--text-default-label)', whiteSpace: 'nowrap' }}>
        {meta.label} ({count})
      </span>
    </div>
  );
}

export function BroadcastEventAccordion({
  type,
  drivers,
  broadcastSeconds,
  showCallButton = true,
  defaultOpen = true,
}: {
  /** Active = still broadcasting (No response/Declined); Completed = concluded (Timed out/Declined). */
  type: 'active' | 'completed';
  drivers: BroadcastDriver[];
  /**
   * The leg's own clock — live elapsed while broadcasting, or the full course
   * (`acceptanceWindow × retries`) once concluded. Shared by every awaiting and
   * timed-out row, which is why they all read the same number in Figma. Declined
   * rows ignore it in favour of their own `seconds`.
   */
  broadcastSeconds: number;
  /**
   * Whether each row offers a Call button (plus the divider that precedes it).
   *
   * **Not derivable from `type`** — verified across the wireframes: Exhausted
   * (`552:57340`) and Manually Dispatched after exhausted (`1728:124762`) both render
   * an open **Completed** accordion, yet the first shows the button and the second
   * hides it. The difference is whether the order already has a driver: once it does,
   * chasing the drivers who passed on it is pointless. The caller passes that signal
   * (`DispatchNarrative.method !== 'none'`) — see `DispatchLogsTab`.
   */
  showCallButton?: boolean;
  defaultOpen?: boolean;
}): React.ReactElement {
  ensureStyles();
  ensureSpinnerStyles();
  const { open, toggle } = useAccordion(defaultOpen);
  const [filter, setFilter] = React.useState<'all' | DriverResponseStatus>('all');
  const statuses = TYPE_STATUSES[type];

  const counts = React.useMemo(() => {
    const c = {} as Record<DriverResponseStatus, number>;
    for (const s of statuses) c[s] = drivers.filter((d) => d.status === s).length;
    return c;
  }, [drivers, statuses]);

  /** The duration this row displays — see the table in the component JSDoc. */
  const secondsFor = (d: BroadcastDriver): number =>
    d.status === 'declined' ? (d.seconds ?? 0) : broadcastSeconds;

  /**
   * Figma's ordering (`569:61192`: Timed out 40s, 40s → Declined 38s, 32s, 30s):
   * **bucket first** in header order — the drivers the broadcast is still waiting on
   * (or that ran out the clock) lead, the ones who actively said no sink to the
   * bottom — **then longest duration first** inside each bucket.
   */
  const sorted = React.useMemo(() => {
    const rank = (d: BroadcastDriver) => {
      const i = statuses.indexOf(d.status);
      return i === -1 ? statuses.length : i;
    };
    return [...drivers].sort((a, b) => rank(a) - rank(b) || secondsFor(b) - secondsFor(a));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drivers, statuses, broadcastSeconds]);

  const filtered = filter === 'all' ? sorted : sorted.filter((d) => d.status === filter);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        borderRadius: 'var(--rounding-lg)',
        overflow: 'hidden',
        border: 'var(--stroke-xs) solid var(--border-neutral-default)',
      }}
    >
      <AccordionHeader open={open} onToggle={toggle}>
        <div
          className="leta-broadcast-accordion-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--spacing-20px)',
            padding: 'var(--padding-12px)',
            // Only draw this stroke while Open, where it's the divider between the
            // header and the revealed driver list. While Closed the header sits
            // flush against the outer wrapper's own bottom border — drawing both
            // produced a visible double stroke along that edge.
            borderBottom: open ? 'var(--stroke-xs) solid var(--border-neutral-default)' : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-8px)' }}>
            <HeaderChip status={statuses[0]} count={counts[statuses[0]]} />
            <div style={{ width: 0, height: 20, borderLeft: 'var(--stroke-xs) solid var(--border-neutral-default)' }} />
            <HeaderChip status={statuses[1]} count={counts[statuses[1]]} />
          </div>
          <AccordionChevron variant="plain" size={20} open={open} onToggle={toggle} />
        </div>
      </AccordionHeader>
      <AccordionContent open={open} gap="var(--spacing-24px)" topGap="0">
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-24px)',
            width: '100%',
            padding: 'var(--padding-16px)',
            backgroundColor: 'var(--surface-neutral-bg-default)',
          }}
        >
          <div style={{ display: 'flex', gap: 'var(--spacing-8px)' }}>
            <Chip label="All" active={filter === 'all'} onClick={() => setFilter('all')} />
            {statuses.map((s) => (
              <Chip key={s} label={STATUS_META[s].label} active={filter === s} onClick={() => setFilter(s)} />
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-16px)', width: '100%' }}>
            {filtered.map((driver, i) => (
              <React.Fragment key={driver.id}>
                {i > 0 && <div style={{ height: 0, borderTop: 'var(--stroke-xs) solid var(--border-neutral-default)', width: '100%' }} />}
                <ContentPrimitives
                  type="utility"
                  text={
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-8px)' }}>
                      <span>{driver.name}</span>
                      <Badge label={STATUS_META[driver.status].label} color={STATUS_META[driver.status].color} />
                    </span>
                  }
                  subtext={driver.phone}
                  showVisualAnchor
                  showLeadingIcon={false}
                  showAvatar
                  avatarName={driver.name}
                  showTrailingContent
                  showPassiveElements
                  passiveElements={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-8px)' }}>
                      {/* Still waiting on this driver → the live blue spinner, leading the
                          time (Figma `Metadata Text`: H, gap 8, icon first). Declined and
                          timed-out rows have nothing left to wait for, so no spinner. */}
                      {driver.status === 'no-response' && (
                        <span className={SPINNER_CLASS} style={{ display: 'flex', color: 'var(--icons-information-default)' }}>
                          <Icon name="Loading" size={16} />
                        </span>
                      )}
                      <span
                        className="text-label-s-regular"
                        style={{ color: 'var(--text-default-label-idle)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}
                      >
                        {secondsFor(driver)}s
                      </span>
                      {/* The divider belongs to the Call button — both disappear together
                          once the order has a driver (see `showCallButton`). */}
                      {showCallButton && (
                        <div style={{ width: 0, height: 20, borderLeft: 'var(--stroke-xs) solid var(--border-neutral-default)' }} />
                      )}
                    </div>
                  }
                  showInteractiveElements={showCallButton}
                  interactiveElements={
                    // Inert per project decision — no call-integration flow exists yet.
                    showCallButton ? (
                      <Button variant="secondary" size="medium" iconOnly="Phone" iconOutlined aria-label={`Call ${driver.name}`} />
                    ) : undefined
                  }
                />
              </React.Fragment>
            ))}
          </div>
        </div>
      </AccordionContent>
    </div>
  );
}
