import * as React from 'react';
import { Badge, Button, ContentPrimitives, HoverTip } from '@leta/components';
import { Icon, type IconName } from '@leta/icons';
import type { Order } from '../../store/types.js';
import { fmtClock, type OrderDetailModel } from './detailModel.js';
import { OrderMiniMap } from './OrderDetailMap.js';

/**
 * **Order Overview Card** — the status-summary card at the top of the View Order
 * drawer's Overview tab. Mirrors the Playground local component `1452:181083`
 * (13 lifecycle variants), re-enumerated 2026-07-29 via the figma-wireframe-parity
 * skill — see `design-parity/order-overview-card-inventory.md`.
 *
 * Layout (HORIZONTAL): a fixed **320px** mini-map (`OrderMiniMap` → `MapView`) +
 * a flexible `Order Status Summary` column (`--padding-16px`/`20px`, gap 20):
 *  1. `ContentPrimitives type="section-heading"` — Title (a per-state headline or
 *     the scheduled date/time) + Subtext, with the per-state **CTA** button in the
 *     `interactiveElements` trailing slot (Secondary/Medium/Leading-Icon):
 *     View Activity·History · Dispatch·Proceed · View Logs·Document(outlined).
 *  2. a full-width demarcator.
 *  3. `SLA Visibility` — eyebrow "Total fulfilment time" + ⓘ on the left, the SLA
 *     **badge on that same eyebrow row** (right, SPACE_BETWEEN), then the
 *     "{elapsed} / 30m SLA" metric row below.
 *
 * Presentational: the drawer owns the live ticker and passes the current `elapsed`
 * seconds + resolved `summarySub`; the model supplies title/CTA/badge.
 */

const CTA_ICON: Record<OrderDetailModel['summary']['cta'], { icon: IconName; outlined: boolean }> = {
  'view-activity': { icon: 'History', outlined: false },
  dispatch: { icon: 'Proceed', outlined: false },
  'view-logs': { icon: 'Document', outlined: true },
};

/**
 * SLA Visibility block — eyebrow row ("Total fulfilment time" + ⓘ | SLA badge) over
 * the "{elapsed} / 30m SLA" metric. The badge sits on the **eyebrow** row now (not
 * beside the counter). Eyebrow copy is "Total fulfilment time" for every state.
 */
function SlaBlock({ model, elapsed }: { model: OrderDetailModel; elapsed: number }): React.ReactElement {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-8px)', width: '100%' }}>
      {/* Content > Eyebrow — label + ⓘ (left) | SLA badge (right) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--spacing-8px)', width: '100%' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4px)', minWidth: 0 }}>
          <span className="text-label-m-regular" style={{ color: 'var(--text-default-eyebrow-text)', whiteSpace: 'nowrap' }}>
            Total fulfilment time
          </span>
          <HoverTip label="Time spent fulfilling this order, against its SLA.">
            <span style={{ display: 'flex', color: 'var(--icons-neutral-idle)' }}>
              <Icon name="Question" outlined size={16} />
            </span>
          </HoverTip>
        </span>
        {model.slaBadge && (
          <Badge color={model.slaBadge.color} label={model.slaBadge.label} leadingIcon={model.slaBadge.icon} />
        )}
      </div>
      {/* Metric — "{elapsed} / 30m SLA" */}
      <span style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--spacing-4px)', minWidth: 0 }}>
        <span className="text-heading-s-semibold" style={{ color: 'var(--text-default-heading)' }}>{fmtClock(elapsed)}</span>
        <span className="text-body-m-regular" style={{ color: 'var(--text-default-helper)' }}> / 30m SLA</span>
      </span>
    </div>
  );
}

export interface OrderOverviewCardProps {
  order: Order;
  model: OrderDetailModel;
  depotName: string;
  depotAddress: string;
  /** Live fulfilment counter (seconds) — the drawer ticks it. */
  elapsed: number;
  /** Resolved (possibly live-updating) summary sub-copy. */
  summarySub: string;
  onExpandMap: () => void;
  /** CTA click — View Activity → Activity tab, View Logs → Dispatch Logs, Dispatch → dispatch. */
  onCta: () => void;
}

export function OrderOverviewCard({
  order,
  model,
  depotName,
  depotAddress,
  elapsed,
  summarySub,
  onExpandMap,
  onCta,
}: OrderOverviewCardProps): React.ReactElement {
  const cta = CTA_ICON[model.summary.cta];
  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: 172,
        borderRadius: 'var(--rounding-xl)',
        border: 'var(--stroke-xs) solid var(--border-neutral-default)',
        overflow: 'hidden',
        backgroundColor: 'var(--surface-neutral-bg-default)',
        flexShrink: 0,
      }}
    >
      {/* Order Mini Map View — FIXED 320px (Figma), own right border = the divider. */}
      <div style={{ flex: '0 0 320px', maxWidth: 320, borderRight: 'var(--stroke-xs) solid var(--border-neutral-default)' }}>
        <OrderMiniMap order={order} depotName={depotName} depotAddress={depotAddress} onExpand={onExpandMap} />
      </div>
      {/* Order Status Summary — fills; section-heading + divider + SLA. */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1, minWidth: 0, padding: 'var(--padding-16px) var(--padding-20px)', gap: 'var(--spacing-20px)' }}>
        <ContentPrimitives
          type="section-heading"
          text={model.summary.main}
          /* One-line sub-copy — the fixed 172px card can't absorb a wrap. */
          subtext={<span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{summarySub}</span>}
          showVisualAnchor={false}
          showPassiveElements={false}
          showInteractiveElements
          interactiveElements={
            <Button variant="secondary" size="medium" iconLeft={cta.icon} iconOutlined={cta.outlined} onClick={onCta}>
              {model.summary.ctaLabel}
            </Button>
          }
        />
        <div style={{ height: 0, borderTop: 'var(--stroke-xs) solid var(--border-neutral-default)', width: '100%' }} />
        <SlaBlock model={model} elapsed={elapsed} />
      </div>
    </div>
  );
}
