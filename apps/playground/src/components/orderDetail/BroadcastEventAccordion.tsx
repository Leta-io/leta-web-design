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
} from '@leta/components';
import { Icon, type IconName } from '@leta/icons';

/**
 * Broadcast Event Accordion (Figma `569:61191`, "Broadcast Logs Tab
 * components") — the SaaS/managed-fleet Dispatch Logs shape: a single
 * broadcast event, expandable to a filterable list of the drivers it was
 * offered to. Playground-local (matches the OrderOverviewCard / Picup Code
 * Banner / Order Detail Accordions precedent) — not promoted to
 * `@leta/components`.
 *
 * `type="active"` (still broadcasting) buckets drivers into No response /
 * Declined; `type="completed"` (concluded) buckets into Declined / Timed out
 * — mirroring the two Figma `Type` variants. Header chip counts are derived
 * from `drivers`, never passed separately, so they can't drift.
 */

export type DriverResponseStatus = 'no-response' | 'declined' | 'timed-out';

export interface BroadcastDriver {
  id: string;
  name: string;
  phone: string;
  status: DriverResponseStatus;
}

const STATUS_META: Record<
  DriverResponseStatus,
  { label: string; color: BadgeColor; headerIcon: IconName; iconColor: string }
> = {
  'no-response': { label: 'No response', color: 'highlight', headerIcon: 'Clock', iconColor: 'var(--icons-highlight-default)' },
  declined: { label: 'Declined', color: 'error', headerIcon: 'Cancel', iconColor: 'var(--icons-error-default)' },
  'timed-out': { label: 'Timed out', color: 'caution', headerIcon: 'Hourglass', iconColor: 'var(--icons-caution-default)' },
};

// Which two statuses each accordion Type buckets drivers into, in header order.
const TYPE_STATUSES: Record<'active' | 'completed', [DriverResponseStatus, DriverResponseStatus]> = {
  active: ['no-response', 'declined'],
  completed: ['declined', 'timed-out'],
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
  defaultOpen = true,
}: {
  /** Active = still broadcasting (No response/Declined); Completed = concluded (Declined/Timed out). */
  type: 'active' | 'completed';
  drivers: BroadcastDriver[];
  defaultOpen?: boolean;
}): React.ReactElement {
  ensureStyles();
  const { open, toggle } = useAccordion(defaultOpen);
  const [filter, setFilter] = React.useState<'all' | DriverResponseStatus>('all');
  const statuses = TYPE_STATUSES[type];

  // Live elapsed response-window counter (shared across rows, per Figma's
  // uniform "5s" reading) — only ticks while the broadcast is still active.
  const [elapsed, setElapsed] = React.useState(5);
  React.useEffect(() => {
    if (type !== 'active') return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [type]);

  const counts = React.useMemo(() => {
    const c = {} as Record<DriverResponseStatus, number>;
    for (const s of statuses) c[s] = drivers.filter((d) => d.status === s).length;
    return c;
  }, [drivers, statuses]);

  const filtered = filter === 'all' ? drivers : drivers.filter((d) => d.status === filter);

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
                      <span
                        className="text-label-s-regular"
                        style={{ color: 'var(--text-default-sub-body)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}
                      >
                        {elapsed}s
                      </span>
                      <div style={{ width: 0, height: 20, borderLeft: 'var(--stroke-xs) solid var(--border-neutral-default)' }} />
                    </div>
                  }
                  showInteractiveElements
                  interactiveElements={
                    // Inert per project decision — no call-integration flow exists yet.
                    <Button variant="secondary" size="medium" iconOnly="Phone" iconOutlined aria-label="Call driver" />
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
