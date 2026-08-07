import * as React from 'react';
import { useParams } from 'react-router-dom';
import { Title, NotificationBanner, Badge } from '@leta-io/components';
import { useStore } from '../store/useStore.js';
import { ORDER_STATUS_BADGE, ORDER_STATUS_LABEL } from '../store/types.js';

/**
 * Phase-0 placeholder for a functional flow route. Confirms the store wiring +
 * token cascade work; replaced by the real screen once the wireframe Figma + PRD
 * are available (Phase 1).
 */
export function FlowPlaceholder({ section }: { section: string }): React.ReactElement {
  const params = useParams();
  const orders = useStore((s) => s.orders);

  const heading = params.id ? `${section} · ${params.id.toUpperCase()}` : section;

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-20px)',
        padding: 'var(--padding-24px)',
      }}
    >
      <Title variant="page-dialog" text={heading} />
      <NotificationBanner
        type="info"
        variant="subtle"
        title="Pending wireframes"
        description="This screen will be built against the wireframe Figma file + PRD in Phase 1. The shell, routing, tokens, and session store are live."
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-8px)' }}>
        <span className="text-label-l-semibold" style={{ color: 'var(--text-default-heading)' }}>
          Store check — {orders.length} orders loaded
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-8px)' }}>
          {orders.map((o) => (
            <Badge key={o.id} color={ORDER_STATUS_BADGE[o.status]} label={`${o.id} · ${ORDER_STATUS_LABEL[o.status]}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
