import * as React from 'react';
import { useLocation } from 'react-router-dom';
import { EmptyState } from '@leta-io/components';

/** Decorative nav destinations (Dashboard, Drivers, Customers, Settings). */
export function ComingSoonPage(): React.ReactElement {
  const { pathname } = useLocation();
  const section =
    pathname.replace('/', '').replace(/^\w/, (c) => c.toUpperCase()) || 'Module';

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--padding-24px)' }}>
      <EmptyState
        type="new-update"
        size="desktop"
        heading={`${section} — coming soon`}
        description="This module isn't part of the interactive prototype yet."
      />
    </div>
  );
}
