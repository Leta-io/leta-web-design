import * as React from 'react';
import { Badge, ConfigurationCardRow, DesktopSegmentControl } from '@leta-io/components';
import { useStore } from '../../store/useStore.js';
import { SLA_STAGES, expectedOftMinutes, type ClientConfig, type SlaConfig } from '../../store/types.js';
import {
  CheckboxRow,
  ControlCard,
  LinkOutCard,
  LinkOutRow,
  NoteRow,
  ReadOnlyCard,
  SettingCard,
  StepperRow,
} from './adminCards.js';

/**
 * The Admin module's settings, section by section (IA §3 Order Management, §4
 * Fleet Management). Each section is one entry in its tab's `Sidetab`, and each
 * setting is one card.
 *
 * Everything here writes to the active client's {@link ClientConfig} through the
 * store, so a change takes effect immediately on the surfaces it governs — the
 * Add Order drawer, the Order Detail view, dispatch behaviour.
 */

export interface AdminSection {
  label: string;
  Body: () => React.ReactElement;
}

/** Where a setting is enabled here but configured in another module. */
export type LinkOutTarget = 'depots' | 'products' | 'driver-earnings';

const LINK_OUT_COPY: Record<LinkOutTarget, { title: string; subtitle: string }> = {
  depots: { title: 'Depots', subtitle: 'Depot records and their operational settings arrive in a later phase.' },
  products: { title: 'Products', subtitle: 'The product catalogue module arrives in a later phase.' },
  'driver-earnings': { title: 'Driver Earnings', subtitle: 'Rate cards and payouts arrive in a later phase.' },
};

/** Handler for every "Manage in …" affordance on the page. */
function useLinkOut(): (target: LinkOutTarget) => void {
  const pushToast = useStore((s) => s.pushToast);
  return (target) => pushToast({ type: 'success', ...LINK_OUT_COPY[target] });
}

/** Convenience: read the active config and patch it with an updater. */
function useConfig(): [ClientConfig, (patch: (c: ClientConfig) => Partial<ClientConfig>) => void] {
  const config = useStore((s) => s.client.config);
  const update = useStore((s) => s.updateClientConfig);
  return [config, update];
}

/* ════════════════════════════════════════════════════════════════════════
 * Tab 1 · Order Management
 * ══════════════════════════════════════════════════════════════════════ */

/** Order Creation — what a dispatcher records when raising an order (Doc 2 §2). */
function OrderCreationSection(): React.ReactElement {
  const [config, update] = useConfig();
  const linkOut = useLinkOut();
  const { items, products, payment } = config;

  return (
    <>
      {/* Reveal-a-sub-mode: the switch decides whether orders carry items at all;
          the nested rows decide how they are entered. */}
      <SettingCard
        title="Order items"
        description="Record what is being delivered. Adds an Items section to the Add Order drawer."
        enabled={items.enabled}
        onToggle={(enabled) => update((c) => ({ items: { ...c.items, enabled } }))}
      >
        <ConfigurationRowItemEntry />
        <CheckboxRow
          title="Require an item value"
          description="Dispatchers must enter what the items are worth before an order can be created."
          checked={items.valueRequired}
          onChange={(valueRequired) => update((c) => ({ items: { ...c.items, valueRequired } }))}
        />
      </SettingCard>

      {/* Reveal-an-explainer-plus-link: the catalogue itself is a records module. */}
      <SettingCard
        title="Product management"
        description="Keep a catalogue of the products you deliver, and add the Products module to the sidebar."
        enabled={products.enabled}
        onToggle={(enabled) =>
          update((c) => ({
            products: { ...c.products, enabled },
            // Product-list item entry has nothing to select from without a
            // catalogue, so switching product management off falls the item mode
            // back to manual rather than leaving the drawer pointing at nothing
            // (Doc 2 §2).
            items: !enabled && c.items.mode === 'product' ? { ...c.items, mode: 'manual' } : c.items,
          }))
        }
      >
        <LinkOutRow
          title="Catalogue"
          description={
            products.catalogue.length === 1
              ? '1 product. Codes, prices, weights, and dimensions live on each product record.'
              : `${products.catalogue.length} products. Codes, prices, weights, and dimensions live on each product record.`
          }
          label="Manage in Products"
          onClick={() => linkOut('products')}
        />
      </SettingCard>

      <SettingCard
        title="Payments"
        description="Record what an order costs and how it is paid. Adds a Payment Info section to the Add Order drawer."
        enabled={payment.enabled}
        onToggle={(enabled) => update((c) => ({ payment: { ...c.payment, enabled } }))}
      />
    </>
  );
}

/**
 * The Item entry sub-mode row. Product list is only a valid mode while product
 * management is on (Doc 2 §2), so when it is off the row says so and the choice
 * stays on Manual.
 */
function ConfigurationRowItemEntry(): React.ReactElement {
  const [config, update] = useConfig();
  const { items, products } = config;

  return (
    <ConfigurationCardRow
      title="Item entry"
      description={
        products.enabled
          ? 'Manual lets a dispatcher type any item. Product list restricts them to your catalogue.'
          : 'Manual lets a dispatcher type any item. Turn on Product management to restrict them to a catalogue.'
      }
      trailing={
        <DesktopSegmentControl
          variant="view"
          segments={[{ label: 'Manual' }, { label: 'Product list' }]}
          value={items.mode === 'product' ? 1 : 0}
          onChange={(i) => {
            const mode = i === 1 ? 'product' : 'manual';
            if (mode === 'product' && !products.enabled) return;
            update((c) => ({ items: { ...c.items, mode } }));
          }}
        />
      }
    />
  );
}

/** Service Levels — the five stage SLAs and what they add up to (Doc 4). */
function ServiceLevelsSection(): React.ReactElement {
  const [config, update] = useConfig();
  const linkOut = useLinkOut();

  const stageRow = (key: keyof SlaConfig) => {
    const stage = SLA_STAGES.find((s) => s.key === key)!;
    return (
      <StepperRow
        key={key}
        title={stage.label}
        description={stage.span}
        value={config.sla[key]}
        onChange={(value) => update((c) => ({ sla: { ...c.sla, [key]: value } }))}
        unit="min"
      />
    );
  };

  return (
    <>
      {/* Control cards: service levels are durations, not an on/off capability —
          there is no "enable SLAs" switch to invent. */}
      <ControlCard
        title="Pickup service levels"
        description="Stage targets from the moment an order is ready until the driver has collected it."
      >
        {SLA_STAGES.filter((s) => s.phase === 1).map((s) => stageRow(s.key))}
      </ControlCard>

      <ControlCard
        title="Delivery service levels"
        description="Stage targets from the moment the driver leaves the depot until the order is closed."
      >
        {SLA_STAGES.filter((s) => s.phase === 2).map((s) => stageRow(s.key))}
      </ControlCard>

      <ReadOnlyCard
        title="Expected fulfilment time"
        description="The sum of the five stage targets. Every order is measured against it, wherever it falls on a trip."
        value={`${expectedOftMinutes(config.sla)} min`}
      />

      <LinkOutCard
        title="Depot overrides"
        description="Every depot inherits these targets unless it sets its own."
        label="Manage in Depots"
        onClick={() => linkOut('depots')}
      />
    </>
  );
}

/** Dispatch & Broadcasting — how an order reaches a driver (Doc 2 §4, Doc 5). */
function DispatchSection(): React.ReactElement {
  const [config, update] = useConfig();
  const fleetType = useStore((s) => s.client.fleetType);
  const linkOut = useLinkOut();

  return (
    <>
      <ReadOnlyCard
        title="Fleet type"
        description="Set by LETA when your account was created. Decides who a broadcast reaches — your own priority driver groups, or the open marketplace."
        value={
          <Badge
            color="neutral"
            label={fleetType === 'managed-fleet' ? 'Managed fleet' : 'Marketplace'}
            leadingIcon={fleetType === 'managed-fleet' ? 'Truck' : 'Broadcast'}
          />
        }
      />

      {/* Reveal-an-explainer-plus-link. Smart dispatch is the master switch for
          broadcasting; with it off there is no sequence to configure, so the
          affordance is hidden rather than offered and disabled. */}
      <SettingCard
        title="Smart dispatch"
        description="Broadcast orders to drivers automatically. Off means every order is dispatched by hand, and orders carry no broadcast history."
        enabled={config.autoBroadcast}
        onToggle={(autoBroadcast) => update(() => ({ autoBroadcast }))}
      >
        <LinkOutRow
          title="Broadcast sequence"
          description="Which driver groups an order reaches and in what order, how long each has to accept, retries, and the order wait time are set per depot."
          label="Manage in Depots"
          onClick={() => linkOut('depots')}
        />
      </SettingCard>

      <SettingCard
        title="En-route pickup"
        description="Let Add to Trip offer an order to a driver already on the road, not only one still at the depot."
        enabled={config.enRoutePickup}
        onToggle={(enRoutePickup) => update(() => ({ enRoutePickup }))}
      />
    </>
  );
}

/** Delivery Confirmation — how custody is evidenced at both ends (Doc 2 §3). */
function DeliveryConfirmationSection(): React.ReactElement {
  const [config, update] = useConfig();

  return (
    <>
      <SettingCard
        title="Pickup confirmation"
        description="Require a pickup code and proof of pickup before a driver leaves the depot. Individual depots can override this."
        enabled={config.pickupConfirmation}
        onToggle={(pickupConfirmation) => update(() => ({ pickupConfirmation }))}
      />

      {/* Reveal-a-checkbox-group: signature and photo are one concept with two
          non-exclusive requirements, not two unrelated switches. */}
      <SettingCard
        title="Proof of delivery"
        description="Require evidence that an order reached its recipient. Individual depots can override this."
        enabled={config.pod.signature || config.pod.photo}
        onToggle={(enabled) =>
          update((c) => ({
            // Turning the section on with nothing selected would promise proof and
            // collect none, so it opens on signature; turning it off clears both.
            pod: enabled
              ? { signature: !c.pod.photo || c.pod.signature, photo: c.pod.photo }
              : { signature: false, photo: false },
          }))
        }
      >
        <CheckboxRow
          title="Recipient signature"
          description="The recipient signs for the order on the driver's device."
          checked={config.pod.signature}
          onChange={(signature) => update((c) => ({ pod: { ...c.pod, signature } }))}
        />
        <CheckboxRow
          title="Delivery photo"
          description="The driver photographs the delivered order."
          checked={config.pod.photo}
          onChange={(photo) => update((c) => ({ pod: { ...c.pod, photo } }))}
        />
      </SettingCard>
    </>
  );
}

/** Returns — what happens when an order comes back (Doc 2 §5). */
function ReturnsSection(): React.ReactElement {
  const [config, update] = useConfig();
  const linkOut = useLinkOut();

  return (
    <>
      <SettingCard
        title="Driver-initiated returns"
        description="Let a driver start a return from the Driver App, rather than only a dispatcher starting one here."
        enabled={config.returns.driverInitiated}
        onToggle={(driverInitiated) => update((c) => ({ returns: { ...c.returns, driverInitiated } }))}
      />

      <SettingCard
        title="Act on returned orders"
        description="Show Dispatch and Reschedule on returned orders. Editing a returned order stays available either way."
        enabled={config.returns.management}
        onToggle={(management) => update((c) => ({ returns: { ...c.returns, management } }))}
      />

      {/* Reveal-an-explainer-plus-link: whether returns are paid is one decision
          here; how much they pay belongs to each rate card. */}
      <SettingCard
        title="Pay for return trips"
        description="Compensate drivers for bringing an order back."
        enabled={config.returns.compensation}
        onToggle={(compensation) => update((c) => ({ returns: { ...c.returns, compensation } }))}
      >
        <LinkOutRow
          title="How much a return pays"
          description="A fixed amount or a percentage of the original payout, set on each rate card — so it can differ between them."
          label="Manage in Driver Earnings"
          onClick={() => linkOut('driver-earnings')}
        />
      </SettingCard>
    </>
  );
}

export const ORDER_MANAGEMENT_SECTIONS: AdminSection[] = [
  { label: 'Order Creation', Body: OrderCreationSection },
  { label: 'Service Levels', Body: ServiceLevelsSection },
  { label: 'Dispatch', Body: DispatchSection },
  { label: 'Delivery Proof', Body: DeliveryConfirmationSection },
  { label: 'Returns', Body: ReturnsSection },
];

/* ════════════════════════════════════════════════════════════════════════
 * Tab 2 · Fleet Management
 * ══════════════════════════════════════════════════════════════════════ */

/**
 * Driver Availability — automatic broadcast suspension (Doc 5 §3).
 *
 * "Suspension", never "deactivation": a suspended driver's account stays fully
 * active, only their broadcast eligibility pauses.
 */
function DriverAvailabilitySection(): React.ReactElement {
  const [config, update] = useConfig();
  const { suspension } = config;

  return (
    <SettingCard
      title="Suspend inactive drivers"
      description="Stop broadcasting to drivers who have gone quiet, so order allocation doesn't spend its rounds on them. Their accounts stay active."
      enabled={suspension.enabled}
      onToggle={(enabled) => update((c) => ({ suspension: { ...c.suspension, enabled } }))}
    >
      {/* Reveal-numeric-criteria — the threshold and the auto-reinstatement that
          reuses it share one surface, because they share one number. */}
      <StepperRow
        title="Minimum completed orders"
        description="A driver who completes fewer than this in the window is suspended from broadcasts."
        value={suspension.minOrders}
        onChange={(minOrders) => update((c) => ({ suspension: { ...c.suspension, minOrders } }))}
        unit="orders"
      />
      <StepperRow
        title="Activity window"
        description="How far back the platform counts completed orders."
        value={suspension.withinDays}
        onChange={(withinDays) => update((c) => ({ suspension: { ...c.suspension, withinDays } }))}
        unit="days"
        max={90}
      />
      <CheckboxRow
        title="Reinstate drivers automatically"
        description="A suspended driver who meets the threshold again comes back without anyone reviewing them."
        checked={suspension.autoReinstate}
        onChange={(autoReinstate) => update((c) => ({ suspension: { ...c.suspension, autoReinstate } }))}
      />
      <NoteRow
        title="How reinstatement is measured"
        description="The window restarts on the day of suspension, so a driver has to genuinely return to activity rather than tip an old window back over the line. Checked once a day."
      />
    </SettingCard>
  );
}

export const FLEET_MANAGEMENT_SECTIONS: AdminSection[] = [
  { label: 'Driver Availability', Body: DriverAvailabilitySection },
];
