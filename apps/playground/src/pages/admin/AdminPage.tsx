import * as React from 'react';
import {
  EmptyState,
  NotificationBanner,
  PageTabsControl,
  Sidetab,
  Title,
  type PageTabsControlItem,
} from '@leta-io/components';
import {
  FLEET_MANAGEMENT_SECTIONS,
  ORDER_MANAGEMENT_SECTIONS,
  type AdminSection,
} from './adminSections.js';

/**
 * Admin — the client-configuration module (wireframe `1791:200950`).
 *
 * Structure, straight from the wireframe: a page `Title`, a `PageTabsControl`
 * across the three top-level areas, an info `NotificationBanner`, then a
 * Container (row, gap 60) of a fixed 160px `Sidetab` beside a scrolling column
 * of `ConfigurationCard`s (gap 16, 100px bottom padding). The Sidetab **switches**
 * the visible section rather than scrolling one long column.
 *
 * **Scope (IA §1 — "switches above, dials below").** Everything here is
 * client-tier: whether a capability exists at all, plus platform-wide defaults.
 * How a capability *behaves* per location is depot-tier and lives on the depot
 * record — which is why several cards link out rather than carrying controls,
 * and why this page has no depot switcher.
 *
 * **Two card shapes (IA §6).** The template's toggle card and an identical
 * control card minus the switch, for the settings that aren't on/off (the two
 * SLA duration cards). Plus read-only rows for fleet type and the derived
 * expected fulfilment time. See `adminCards.tsx`.
 *
 * **Nested disclosure.** A toggle that needs further configuration reveals it
 * *inside the same card* on the lighter `ConfigurationCardRow` surface — never a
 * second card and never a separate page. Collapsing hides the section but keeps
 * the values (the rows stay mounted; the values themselves live in the store).
 */

type AdminTab = 'order-management' | 'fleet-management' | 'notifications';

const TABS: { id: AdminTab; label: string; sections: AdminSection[] }[] = [
  // Tab id/internal section-list name stay "order-management" (matching the IA
  // doc's §3 heading); only the user-facing label changed to "Deliveries" to
  // match the product area it configures (ruled 2026-08-07).
  { id: 'order-management', label: 'Deliveries', sections: ORDER_MANAGEMENT_SECTIONS },
  { id: 'fleet-management', label: 'Fleet Management', sections: FLEET_MANAGEMENT_SECTIONS },
  // Deferred to its own session (IA §2) — the tab exists so the shape of the
  // module is honest, and it says what will live here.
  { id: 'notifications', label: 'Notifications', sections: [] },
];

const TAB_ITEMS: PageTabsControlItem[] = TABS.map((t) => ({ label: t.label }));

export function AdminPage(): React.ReactElement {
  const [tabIndex, setTabIndex] = React.useState(0);
  const [sectionByTab, setSectionByTab] = React.useState<Record<number, number>>({});
  const [bannerDismissed, setBannerDismissed] = React.useState(false);

  const tab = TABS[tabIndex]!;
  const sectionIndex = sectionByTab[tabIndex] ?? 0;
  const section = tab.sections[sectionIndex];

  // Each section is its own panel, so it opens at the top — otherwise a section
  // switched into while the previous one was scrolled down starts mid-column,
  // with its first card cut off above the fold.
  const columnRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (columnRef.current) columnRef.current.scrollTop = 0;
  }, [tabIndex, sectionIndex]);

  return (
    // Config Table Page Body — Figma pad [24,24,0,24], gap 24. Fills the
    // viewport and never scrolls itself; scrolling lives in the card column.
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-24px)',
        padding: '24px 24px 0',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <Title text="Admin" variant="page-dialog" style={{ flexShrink: 0 }} />

      <PageTabsControl
        variant="basic"
        tabs={TAB_ITEMS}
        value={tabIndex}
        onChange={setTabIndex}
        style={{ flexShrink: 0 }}
      />

      {!bannerDismissed && (
        <NotificationBanner
          type="info"
          variant="filled"
          title="These settings apply across your whole account"
          description="Depot-specific behaviour — broadcast sequences, geofences, and overrides of the defaults set here — is configured on each depot record."
          onDismiss={() => setBannerDismissed(true)}
          style={{ flexShrink: 0 }}
        />
      )}

      {section ? (
        // Container — fixed Sidetab beside the scrolling Configurations List.
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'row', gap: 60 }}>
          <Sidetab
            tabs={tab.sections.map((s) => ({ label: s.label }))}
            value={sectionIndex}
            onChange={(i) => setSectionByTab((prev) => ({ ...prev, [tabIndex]: i }))}
            style={{ flexShrink: 0, height: '100%' }}
          />
          <div
            ref={columnRef}
            style={{
              flex: 1,
              minWidth: 0,
              minHeight: 0,
              overflowY: 'auto',
              overscrollBehavior: 'contain',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-16px)',
                paddingBottom: 100,
              }}
            >
              <section.Body />
            </div>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <EmptyState
            type="new-update"
            size="desktop"
            heading="Notifications"
            description="Choose which alerts and updates your team receives. Coming soon."
          />
        </div>
      )}
    </div>
  );
}
