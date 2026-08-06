# Configuration — deferred task checklist

Carried out of the 2026-08-05 configuration session. Companion to the
[coverage audit](client-configuration-coverage-audit.md) and
[IA](client-configuration-ia.md).

## Phase 3 (next, approved scope)

- [x] **Admin → Order Management + Fleet Management tabs** — 13 settings, two card shapes
      (toggle + control), four nested-disclosure archetypes. One card first for pattern confirmation.
      *Built 2026-08-06 at `/settings` (`apps/playground/src/pages/admin/`), from wireframe
      `1791:200950`. Sidetab **switches** the visible section (confirmed, not scroll-anchors).*
- [x] **Notifications tab** — create it **empty**; content deferred to a future session.

## Follow-on module phases (agreed)

- [ ] **Depots module** — table (orders-table shape, **no top-level status filters**) + add/edit.
      All legacy form fields carry forward: code · name · contact · location/lat-lng · restricted
      radius · pickup & dropoff geofence radius + type · max distance between orders · show order
      ready for pickup · **require PIN confirmation at pickup**.
      Plus the operational tier: **broadcast configuration** (driver-group prioritisation →
      sequence, acceptance windows, retries, rounds, fallback, pre-offer, **order wait time**),
      **`depot.maxOrdersPerTrip`**, and **overrides** of the client-default SLA, POD, and
      pickup-confirmation settings.
- [ ] **Products module** — sidebar nav item, **Inventory** icon, gated on `products.enabled`.
      Table + add/edit: code · name · price *(opt)* · unit weight *(opt)* · dimensions *(opt)*.
- [ ] **Roles & permissions** — `roles.custom.definitions`; per-category granular checkbox matrix.
      Management section visible to Admin only (Doc 2 §9).
- [ ] **Fleet earnings** — rate cards + payouts in the Fleet Management tab. **Blocked:** Rate Card
      PRD is not in this repo (Doc 2 §8, Doc 5 §6).

## Order-management follow-ups surfaced by this audit

- [ ] **C7 — gate the Dispatch Logs tab on smart dispatch.** `OrderDetailDrawer.tsx:1129` renders
      the third tab unconditionally; a depot/client without smart dispatch has no broadcast history
      (Doc 1 §7.5, Doc 2 §4). *Approved 2026-08-05.*
- [ ] **C7b — make Java House the no-smart-dispatch fixture** so the rule above is demonstrable.
      Note it currently also exercises `items: off` / `payment: off`. *Approved 2026-08-05.*
- [ ] **Enforce `depot.maxOrdersPerTrip`** (Doc 1 §10.7) on dispatch selection, Change Driver, and
      Add to Trip — with an at-capacity reason, never a silent truncation.
- [x] **Implement `returns.compensation.enabled`** as a switch; the none/fixed/percentage model
      belongs per rate card in Driver Earnings, not to a client-level enum. *Configurable
      2026-08-06 (Admin → Returns). Nothing consumes it yet — earnings are out of the prototype.*
- [ ] **Implement `returns.management.enabled`** — gate Dispatch + Reschedule on Returned orders
      (table, detail footer, bulk). Must **not** gate Edit Order. *The flag is configurable as of
      2026-08-06; the **gating** is still to do.*
- [x] **Split POD into two independent settings** in `ClientConfig` (signature / photo), replacing
      the single `proofOfDelivery` boolean. Detail view already renders them as separate rows.
      *Done 2026-08-06 — `config.pod.{signature,photo}`; detail + activity read either.*
- [x] **Make Expected OFT derived** from the five stage SLAs, replacing the hardcoded `30m` string
      in `OrderOverviewCard.tsx`. *Done 2026-08-06 — `expectedOftMinutes(config.sla)`, verified
      live in the View Order drawer.*

## Follow-ups surfaced by the Phase 3 build (2026-08-06)

- [ ] **Give the control card a Figma counterpart.** IA §6's second card shape ships as a
      `variant="control"` on the design-system `ConfigurationCard`; the Figma component
      (`9617:18100`) still has only Enabled/Disabled states. Needs a designer pass so code and
      library agree.
- [ ] **Enforce the newly-configurable flags.** `enRoutePickup`, `returns.management`,
      `returns.compensation`, and `suspension.*` are now authored in Admin but not yet read by the
      surfaces they govern.
- [ ] **Item entry vs. product management.** Selecting "Product list" while product management is
      off is currently a no-op with explanatory copy on the row. If a disabled-segment treatment is
      wanted instead, `DesktopSegmentControl` needs a per-segment `disabled`.

## Done this session

- [x] Docs 2 + 5 added to `docs/specs/` and reconciled with all rulings.
- [x] Doc 1 → v3.4 · Doc 2 → v1.3 · Doc 5 → v1.4 · specs README indexed.
- [x] **Returned orders are editable again** — `EDITABLE_STATUSES` was missing `'returned'`,
      contradicting Doc 1 §2.3/§8/§12.7. *(Bug, not policy.)*
- [x] **"Hold window" → "Order wait time"** in user-facing copy + specs.
- [x] **Sidebar "Settings" → "Admin"**.
