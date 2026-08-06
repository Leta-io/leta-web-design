# Configuration Reference

> **Leta · On Demand Platform (Doc 2)**
> The single source of truth for every client-admin-configurable setting across the platform — order fields, scheduling/dispatch, delivery confirmation, returns, permissions, and depot administration. Referenced by name from *Order Management — Foundations & Logic*, the *Table Column Layout Specification*, and *SLA & Fulfilment-Time Specification*. Broadcast/fleet mechanics and rate cards are detailed in their own documents and indexed here, not restated.
> **Status:** v1.5 — **switches above, dials below** (ruled 2026-08-05): the client owns capability
> enablement and platform defaults; the depot owns operational behaviour. Pickup confirmation **and**
> POD → client default with depot override (symmetric). `dispatch.fleetType` → platform-provisioned.
> Order wait time unified. `products.enabled` added. Suspension → client only. Return compensation
> reshaped to a client switch + per-rate-card model.
> **Scope tiers:** **Client → Depot**, split by *kind of decision*:
>
> | Tier | Owns | Set in |
> |---|---|---|
> | **Client** | Whether a capability exists at all, plus platform-wide **defaults** | **Admin** module |
> | **Depot** | How that capability behaves **operationally**, per location | **Depots** module (depot record) |
>
> A client turns *on* items, payment, returns, smart dispatch, and authors the **default SLA**,
> **default POD** and **default pickup-confirmation** requirements. Each depot then carries the
> operational detail: its broadcast ladder, acceptance windows, retries, order wait time,
> orders-per-trip ceiling, and optional SLA / POD / pickup-confirmation overrides of those defaults.
>
> Two attributes sit outside both tiers — **`dispatch.fleetType`** (platform-provisioned, read-only
> to the tenant, §4) and **`roles.custom.definitions`** (tenant-wide identity construct, §9).
>
> > **Correction history.** An initial reading of the 2026-08-05 session recorded this as *"all
> > configuration is depot-scoped, there is no client tier"* (v1.3). That was too strong — true of
> > the broadcast dials, not of the enablement switches or the defaults. A follow-on reading briefly
> > left **pickup confirmation** depot-only while POD kept a client default; that asymmetry was
> > withdrawn in v1.5 for symmetry. See §11.

---

## 1. Schema

Every flag in this document is recorded with the same seven fields, so an agent or engineer can parse any row identically:

| Field | Meaning |
|---|---|
| **Flag** | The setting's identifier |
| **Gates** | What it turns on/off or determines |
| **Scope** | Client, Depot, Driver Group, or Order — the level at which it's set |
| **Type & values** | Boolean, enum, number, etc., with the valid set |
| **Default** | Its value before anyone touches it |
| **Surfaces affected** | Which screens/behaviours change |
| **Tier-gate candidate?** | Whether this flag is a plausible future subscription-tier gate. No tiering system exists yet (§7) — this column is a seatbelt, populated mostly "No" today, so retrofitting tiering later doesn't require re-auditing every flag. |

---

## 2. Order fields

| Flag | Gates | Scope | Type & values | Default | Surfaces affected | Tier-gate? |
|---|---|---|---|---|---|---|
| `items.enabled` | Whether the Items section appears in the Add Order drawer | Client | Boolean | Off | Order creation drawer (OM §5) | No |
| `items.mode` | Manual free-text vs. Product-list selection | Client | Enum: `manual`, `product` | `manual` | Order creation drawer, Items cell | No |
| `items.valueRequired` | Whether an items value is mandatory | Client | Boolean | Off | Order creation validation | No |
| `payment.enabled` | Whether the Payment section appears in the drawer | Client | Boolean | Off | Order creation drawer (OM §6) | No |
| `products.enabled` | **Product management.** Whether the tenant maintains a product catalogue — gates the **Products module** in the sidebar (added 2026-08-05) | Client | Boolean | Off | Products module visibility; prerequisite for `items.mode: product` | No |

> **`products.enabled` is the prerequisite for `items.mode: product` (added 2026-08-05).**
> Product-list item selection has nothing to select from until a catalogue exists, so
> `items.mode` may only be set to `product` while `products.enabled` is on. Turning product
> management **off** while `items.mode` is `product` must either be blocked or fall the mode
> back to `manual` — never leave the drawer pointing at an unavailable catalogue.
>
> **Scope note:** the *switch* is client-level (one decision: do we run a catalogue?); the
> *catalogue contents* are records in the Products module.
>
> **Product record fields:** code · name · price *(optional)* · unit weight *(optional)* ·
> dimensions *(optional)*. Managed in the Products module (table + add/edit), which mirrors the
> orders table minus the top-level status filters.

## 3. Delivery confirmation

| Flag | Gates | Scope | Type & values | Default | Surfaces affected | Tier-gate? |
|---|---|---|---|---|---|---|
| `pickup.confirmation.enabled` | Whether Pickup PIN + Proof of Pickup are required and shown | **Client default, depot may override** (ruled 2026-08-05 — supersedes both the 2026-07-09 "Client only, no depot override" ruling and the interim depot-only scoping) | Boolean | Off | Order detail drawer Pickup From section, Driver App pickup flow | No |
| `delivery.pod.signature.enabled` | Whether recipient signature is captured/shown as proof of delivery | **Client default, depot may override** (ruled 2026-08-05) | Boolean | Off | Order detail drawer, Driver App delivery flow | No |
| `delivery.pod.photo.enabled` | Whether a delivery photo is captured/shown as proof of delivery | **Client default, depot may override** (ruled 2026-08-05) | Boolean | Off | Order detail drawer, Driver App delivery flow | No |

> Signature and photo are **independent settings** — a depot may enable either, both, or neither (ruled 2026-07-09). Because they are non-exclusive multi-select rather than two unrelated switches, they are presented as a **checkbox group**, not two separate toggles (ruled 2026-08-05).

> **Both ends of custody are scoped identically (ruled 2026-08-05).** Pickup confirmation and
> proof of delivery are each a **client default a depot may override**
> (`depot.pickupConfirmation.override`, `depot.pod.override` — §10). An interim reading briefly
> made pickup confirmation depot-only while POD kept a client default; that asymmetry is
> **withdrawn** in favour of symmetry — both are company-level promises about how custody is
> evidenced, and both allow a site that needs more (or less) to deviate.
>
> Consequence for the Admin UI: both are **directly editable** on the Admin page, each with a
> "depots may override" note. Neither is a link-out.

## 4. Scheduling & dispatch

| Flag | Gates | Scope | Type & values | Default | Surfaces affected | Tier-gate? |
|---|---|---|---|---|---|---|
| `scheduling.autoBroadcast.enabled` | **Smart dispatch.** Whether the depot broadcasts automatically: Scheduled orders auto-transition to Broadcasted at T−1h (else → Pending for manual dispatch), and non-scheduled orders auto-broadcast after the order wait time. **This is the master switch for all broadcasting features** — see the gating note below | Client | Boolean | Off | Order status transitions (OM §2.3), summary card copy (OM §7.2), **Dispatch Logs tab presence** (OM §7.5) | No |
| `dispatch.fleetType` | Managed-fleet vs. marketplace — whether the tenant manages its own drivers (and therefore has priority driver groups, Doc 5 §2) | **Platform-provisioned account attribute** — set by LETA internal admin from the master account, fixed at onboarding, **read-only to the tenant Admin at every level**. Not depot-scoped, not a tenant toggle (ruled 2026-08-05, aligning with Doc 1 §2.2) | Enum: `managed-fleet`, `marketplace` | — (set at onboarding) | Dispatch Logs tab *content* (round/group timeline vs. flat log), Priority Driver Groups drill-down, Doc 5 §1 | No |
| `dispatch.enRoutePickup.enabled` | En-route pickup extension of Add to Trip | Client | Boolean | Off | Add to Trip target eligibility (OM §10.3, DES-280/265) | No |

> **Fleet type does not determine auto-broadcast (ruled 2026-08-05).** The former gloss
> *"Marketplace (auto-broadcast) vs. managed-fleet (manual)"* is **withdrawn as outdated**.
> `dispatch.fleetType` and `scheduling.autoBroadcast.enabled` are **independent**: managed-fleet
> (SaaS) tenants can and do auto-broadcast. Fleet type decides *who* a broadcast reaches
> (priority driver groups vs. an open marketplace pool) — never *whether* broadcasting happens.

> **Smart dispatch gates the broadcasting feature set (ruled 2026-08-05).**
> `scheduling.autoBroadcast.enabled` is the entry point to broadcasting: a client with it **off**
> dispatches manually only and therefore has **no Dispatch Logs tab** in the Order Detail view
> (OM §7.5) — there is no broadcast history to report. A SaaS/managed-fleet tenant that doesn't
> use smart dispatch is a normal configuration, not an edge case.

> Depot-level broadcast tuning (radius, priority-group behaviour, acceptance windows, retries) is specified in **Doc 5, §5**.

## 5. Returns

| Flag | Gates | Scope | Type & values | Default | Surfaces affected | Tier-gate? |
|---|---|---|---|---|---|---|
| `returns.driverInitiated.enabled` | Whether drivers can trigger a return from the Driver App (vs. dispatch-platform only) | Client | Boolean | Off | Driver App, OM §11.3 | No |
| `returns.compensation.enabled` | **Whether return trips are compensated at all** — the system-level decision. *Reshaped 2026-08-05 from the former `returns.compensation.model` enum* | Client | Boolean | Off | Driver earnings, OM §11.3 | No |
| ~~`returns.compensation.model`~~ | ~~`none` / `fixed` / `percentage`~~ | **Moved to the rate card 2026-08-05** — see the note below |
| `returns.management.enabled` | Whether a dispatcher can **act on** returned orders — the **Dispatch** and **Reschedule** actions on the Returned table and detail view (added 2026-08-05) | Client | Boolean | On | Returned table Actions cell, Returned detail footer, bulk actions (OM §11.3, §12.5, §12.7) | No |

> **Return compensation: switch here, model in the rate card (reshaped 2026-08-05).**
> `returns.compensation.enabled` answers one system-level question — *do we pay drivers for return
> trips at all?* **How much** they're paid (`none` / `fixed` amount / `percentage` of initial payout)
> is **not** a single client-wide value: it is set **per rate card**, alongside every other earnings
> rule, in **Driver Earnings** (Doc 5 §6 / Rate Card PRD). A client running several rate cards can
> therefore compensate returns differently per card, which a single client-level enum could not
> express.
>
> Consequence for the Admin UI: this is a **toggle plus a "Manage in Driver Earnings" affordance**,
> not an enum picker.

> **Not every client re-dispatches returned orders (added 2026-08-05).** Some treat a return as
> the end of the attempt and handle recovery outside the platform. `returns.management.enabled`
> off removes **Dispatch** and **Reschedule** from the Returned order's action set, leaving the
> holding bay read-through: view, **edit**, comment, and cancel.
>
> **Editing a Returned order is NOT gated by this flag.** Editing stays available regardless
> (OM §2.3 / §8: *"do not treat Returned as read-only"*) — most redelivery failures are bad-data
> failures, and correcting the record has value even for a client that won't retry in-platform.
> Only the two *act-on-it* verbs are gated.

## 6. Broadcast & fleet — pointer

Priority driver groups, acceptance windows, retries, fallback rules, and driver broadcast suspension/reinstatement are fully specified in **Doc 5 — Broadcast & Fleet Configuration**. Not restated here; see Doc 5 §4 for its flag table.

## 7. SLA — pointer

The five stage-SLA durations and their scope are specified in **Doc 4 — SLA & Fulfilment-Time Specification, §5**. Not restated here.

## 8. Rate cards — pointer

Driver earnings / client cost calculation is specified in the **Rate Card Specifications PRD** (project knowledge), hierarchy Client → Depot → Driver Group → Driver. See Doc 5 §6 for the pointer and the Depot-tier correction note.

## 9. Roles & permissions

**Structure:** one fixed role (**Admin** — full access, not configurable) plus unlimited **custom roles** defined at the client admin's discretion.

- A custom role is built from **permission categories**, each rendered as its own group of checkboxes — e.g. Order Management, Driver Management, Depot Management, User Management, Reports.
- **Within a category, permissions are granular**, not one flat on/off — e.g. Order Management separately exposes *View orders*, *Edit orders*, *Cancel orders* as independent checkboxes. Multiple permissions within a category can be active simultaneously.
- The **Management** section of the sidebar (which contains Depots and other admin surfaces) is **only visible to Admin** — custom roles see it only if explicitly granted the relevant permission(s).

| Flag | Gates | Scope | Type & values | Default | Surfaces affected | Tier-gate? |
|---|---|---|---|---|---|---|
| `roles.custom.definitions` | The set of custom roles a client has defined, each with its category/permission matrix | Client | Structured (role name → {category → [permissions]}) | Empty (Admin only) | Sidebar visibility, all gated actions platform-wide | No |

> **Open item:** the full permission-category list (beyond the five named as examples) needs to be enumerated per module as each module's spec is written — this table will grow as Table/OM-style docs are produced for Drivers, Depots, Users, Reports, etc.

## 10. Depot administration

Depots live under **Management → Depots**, visible to Admin only (§9). A depot record is not a simple CRUD entry — it configures:

| Field group | Contents |
|---|---|
| Identity | Name, address, contact (base CRUD) |
| Operating hours / capacity | When the depot is active; throughput limits |
| Default rate card | Overrides the client rate card for this depot (Doc 5 §6) |
| SLA overrides | Depot-specific stage-SLA targets, overriding the client's Doc 4 defaults |
| Assigned drivers/vehicles | Which drivers and vehicles are attached to this depot |
| Order broadcast configuration | Depot-level radius, driver-group priority, acceptance windows, max orders, retries (Doc 5 §5) |

| Flag | Gates | Scope | Type & values | Default | Surfaces affected | Tier-gate? |
|---|---|---|---|---|---|---|
| `depot.maxOrdersPerTrip` | **Maximum orders one driver may carry per trip.** Set at depot creation; varies depot to depot (added 2026-08-05) | Depot | Number | — (required at creation) | Dispatch selection cap, Change Driver, Add to Trip, bulk dispatch (OM §10.2–§10.3, §12.9) | No |
| `depot.rateCard.override` | Whether this depot uses its own rate card instead of the client default | Depot | Boolean + rate card reference | Off (inherits client) | Depot admin, order cost/earnings calculation | No |
| `depot.sla.override` | Whether this depot uses its own SLA durations instead of the client-level defaults (§7 / Doc 4) | Depot | Boolean + 5 SLA values | Off (inherits client) | Depot admin, Doc 4 counters/badges | No |
| `depot.pickupConfirmation.override` | Whether this depot uses its own pickup-confirmation requirement instead of the client default (§3). *Flag named 2026-08-05, following the `depot.sla.override` convention* | Depot | Boolean + value | Off (inherits client) | Depot admin, order detail drawer, Driver App | No |
| `depot.pod.override` | Whether this depot uses its own proof-of-delivery requirements instead of the client defaults (§3). *Flag named 2026-08-05, following the `depot.sla.override` convention* | Depot | Boolean + signature/photo pair | Off (inherits client) | Depot admin, order detail drawer, Driver App | No |
| `depot.broadcast.override` | Retained as the depot's broadcast-config record. **Not an override in the inheritance sense** — broadcast dials have no client-level defaults (§4, Doc 5 §5); a depot either has a broadcast configuration or does not | Depot | Broadcast config | — | Depot admin, Doc 5 §5 | No |

### 10.1 Maximum orders per trip (added 2026-08-05)

`depot.maxOrdersPerTrip` is a **capacity ceiling**, not a preference — it is enforced, not advisory,
and it constrains three surfaces:

| Surface | Enforcement |
|---|---|
| **Dispatch selection** | Caps how many orders a dispatcher may select at once to dispatch to one driver |
| **Change Driver** (OM §10.2) | A driver already at the ceiling cannot receive another order |
| **Add to Trip** (OM §10.3) | A trip already at the ceiling is not an eligible target |

> **Distinct from `broadcast.priorityGroups.config`'s per-group "max orders"** (Doc 5 §2). That
> caps how many orders are *offered* to a driver group concurrently during a broadcast. This caps
> how many an individual driver can *physically carry* on one trip. A depot can offer widely and
> still carry three per trip.

> **Why depot-level:** capacity is a function of the depot's vehicle mix and order profile — a
> bike depot moving hot food and a van depot moving pallets have genuinely different ceilings.

## 11. Scope-tier principle — switches above, dials below

**Two tiers, split by *kind of decision* rather than by subject area** (ruled 2026-08-05):

| Tier | Owns | Set in |
|---|---|---|
| **Client** | **Whether a capability exists at all**, plus platform-wide **defaults** | Admin module |
| **Depot** | **How that capability behaves operationally**, per location | Depot record (Depots module) |

**Worked example — SLA.** The client sets the five stage durations once in *Service Levels*; every
depot **inherits** them. A depot may override at creation or later via its record
(`depot.sla.override`). One authoring surface, many inheritors, explicit local deviation.

**Worked example — proof of delivery.** Same shape: the client sets the default signature/photo
requirements; a depot may deviate via `depot.pod.override` (§3, §10).

**Worked example — broadcasting.** The client answers *"do we broadcast?"*
(`scheduling.autoBroadcast.enabled`). It does **not** answer *"in what order, to whom, for how
long"* — those are per-depot and live on the depot record (Doc 5 §5). The Admin page therefore
carries a **"Manage in Depots"** affordance rather than duplicating the dials.

**The exception that proves the split — pickup confirmation.** It is **depot-only**, no client
default, because requiring a PIN is a property of the *site* handing goods over, not a company
promise. It appears on the Admin page only as a link out.

> **Correction history.** An initial reading of the 2026-08-05 session recorded this as *"all
> configuration is depot-scoped, there is no client tier"*, and v1.3 briefly said so. Too strong:
> true of the broadcast dials and pickup confirmation, not of the enablement switches or the
> defaults. The 2026-07-06 "Client → Depot" framing was closer to right than its withdrawal —
> restored here with the switches/dials distinction made explicit, which the earlier version lacked.

Two attributes sit outside both tiers:

| Attribute | Tier | Why |
|---|---|---|
| `dispatch.fleetType` | **Platform** | Provisioned by LETA internal admin from the master account; read-only to the tenant at every level (§4) |
| `roles.custom.definitions` | **Tenant** | A role is an identity construct spanning the whole tenant — a user isn't granted "Dispatcher at Depot A" by this mechanism (§9) |

Rate cards extend *below* depot into Driver Group and Driver — a narrower hierarchy specific to
earnings (Doc 5 §6), not a general tier system.

> **All per-flag tier questions are closed** as of 2026-08-05. `delivery.pod.*` → client default
> with depot override. `broadcast.suspension.default` → **client only**; its proposed
> per-driver-group override is **withdrawn as unconfirmed** (Doc 5 §3.1).

## 12. Open items

- Full permission-category enumeration beyond the five named examples (§9).

- Depot-level broadcast override flag formalisation (Doc 5 §7).
- Rate Card PRD needs its Depot tier reflected at the source (Doc 5 §6).
- No subscription-tier system exists yet; §1's Tier-gate column is a seatbelt for when one is introduced — volume/overage billing (e.g. order caps with per-order overage pricing) was discussed as a future direction, not yet designed.

## Revision history

| Version | Date | Changes |
|---|---|---|
| 1.5 | 2026-08-05 | **Pickup confirmation re-tiered to client default + `depot.pickupConfirmation.override`** (§3, §10) — restoring symmetry with POD after an interim depot-only reading; both ends of custody now behave identically. **`returns.compensation.model` reshaped** (§5): the client-level enum becomes a boolean `returns.compensation.enabled`, with the none/fixed/percentage model moving **per rate card** into Driver Earnings (Doc 5 §6) |
| 1.4 | 2026-08-05 | **Switches/dials split formalised** (§11 + header): client owns enablement + defaults, depot owns operational behaviour — correcting v1.3's over-broad "all depot-scoped" reading. Order-field, returns, smart-dispatch and en-route-pickup scopes set to **Client**; pickup confirmation stays **Depot**; **POD → client default + `depot.pod.override`** (§3, §10); **`broadcast.suspension.default` → Client only**, its per-group override withdrawn (Doc 5 §3.1). All per-flag tier questions closed |
| 1.3 | 2026-08-05 | **Configuration ruled depot-scoped** (§11) — supersedes the Client → Depot parent-default framing; two documented exceptions (`dispatch.fleetType` platform, `roles.custom.definitions` tenant). **`pickup.confirmation.enabled` corrected Client → Depot** (§3), withdrawing the 2026-07-09 "no depot override" ruling — legacy Leta already modelled it per-depot. **`dispatch.fleetType` marked platform-provisioned / read-only** (§4), carrying out the instruction Doc 1 §2.2 issued and v1.0 never applied; its **"Marketplace (auto-broadcast) vs. managed-fleet (manual)" gloss withdrawn as outdated** — fleet type and auto-broadcast are independent, and managed-fleet tenants can auto-broadcast. **Smart dispatch (`scheduling.autoBroadcast.enabled`) established as the master switch for broadcasting**, gating the Dispatch Logs tab (§4). **POD signature/photo specified as a checkbox group** (§3). **New `products.enabled` flag** + product record fields, gating the Products module and prerequisite to `items.mode: product` (§2). Order-field and returns scopes migrated to Depot |
| 1.2 | Jul 2026 | Reinstatement mechanics open item removed — ruled in Doc 5 v1.3 |
| 1.1 | Jul 2026 | "Deactivation" renamed "suspension" throughout, matching Doc 5 v1.1 |
| 1.0 | Jul 2026 | Initial scaffold: schema with Tier-gate seatbelt column; order fields, delivery confirmation, scheduling/dispatch, returns sections populated from flags already referenced in OM/Table/Doc 4; new sections for roles & permissions and depot administration from this session's scoping pass; pointers to Doc 4, Doc 5, and the Rate Card PRD rather than restating their internals; Client→Depot scope-tier principle formalised |
