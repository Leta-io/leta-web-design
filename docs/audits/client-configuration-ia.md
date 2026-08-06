# Admin Configuration — Information Architecture

**Date:** 2026-08-05 · **Phase 2 of 3** (audit → **IA** → build) · **revision 4 — APPROVED**
**Input:** [coverage audit](client-configuration-coverage-audit.md) + Ifeanyi's rulings across four
review rounds, now reconciled into Doc 1 (v3.4) / Doc 2 (v1.5) / Doc 5 (v1.5).
**Status:** **approved 2026-08-05** — ready to build.
**Module:** sidebar **Admin** (renamed from Settings, matching the Figma wireframes).

---

## 1. Where configuration lives — switches above, dials below

The review rounds landed on a two-tier split, divided by **kind of decision** rather than by
subject:

| Tier | Owns | Surface |
|---|---|---|
| **Client** | Whether a capability exists at all · platform-wide **defaults** | **Admin module** — this document |
| **Depot** | How that capability behaves **operationally**, per location | **Depots module** (deferred phase) |

This is why the Admin page does not reproduce the broadcast dials. The client answers *"do we
broadcast?"*; each depot answers *"in what order, to whom, for how long."* Same for SLA: the client
authors the five stage durations once, every depot inherits them, and a depot may override.

**Consequence for this page — the "Manage in Depots" affordance.** Where a capability is enabled
here but configured per depot, the card carries a link out rather than duplicating the controls.
This is the pattern in the Tailscale reference (Image 1): *Funnel → "Manage in Access Controls →"*,
*Tailnet lock → "Manage in Device management →"* — the setting is acknowledged where you'd look for
it, and its real home is one click away.

This also answers the earlier depot-switcher question: **there is no depot switcher on this page.**
Depot configuration is reached *through* the Depots module, so Phase 3 stands alone and doesn't
depend on the deferred module.

---

## 2. Tabs

Three tabs, one empty for now:

| Tab | Covers |
|---|---|
| **Order Management** | Everything about an order's life — creation, service levels, dispatch, delivery proof, returns |
| **Fleet Management** | The drivers behind it — availability, and (later) earnings: rate cards and payouts |
| **Notifications** | *Empty placeholder — deferred to a future session* |

*Why Fleet Management and not "Driver Availability":* the tab will also hold driver earnings —
rate cards and payouts — so naming it after suspension alone would mis-scope it within a session
or two.

---

## 3. Tab 1 · Order Management

Notation: **`T`** toggle card · **`N`** nested section revealed by that toggle · **`C`** card with
an inline control, no on/off · **`RO`** read-only · **`→`** links out to another module.

| Sub-section | Setting | Card | Nested / notes |
|---|---|---|---|
| **Order Creation** | `items.enabled` | T | **N** — `items.mode` (Manual / Product), `items.valueRequired` |
| | `products.enabled` | T | **N** — catalogue summary + **→ Manage in Products**. Prerequisite for `items.mode: product` |
| | `payment.enabled` | T | — |
| **Service Levels** | `sla.phase1.*` (assignment · arrive at depot · pickup) | C | Three duration inputs — Doc 4 Phase 1 |
| | `sla.phase2.*` (arrive at destination · complete) | C | Two duration inputs — Doc 4 Phase 2 |
| | Expected fulfilment time | RO | **Sum of the five.** Replaces today's hardcoded `30m` |
| | Depot inheritance | RO | "All depots inherit these unless overridden" + **→ Manage in Depots** |
| **Dispatch & Broadcasting** | `dispatch.fleetType` | RO | Platform-provisioned; decides whether priority groups exist at all |
| | `scheduling.autoBroadcast.enabled` (**Smart Dispatch**) | T | **N** — explainer + **→ Manage in Depots** for the sequence, groups, acceptance windows, retries, order wait time |
| | `dispatch.enRoutePickup.enabled` | T | — |
| **Delivery Confirmation** | `pickup.confirmation.enabled` | T | Client default + "depots may override" note *(`depot.pickupConfirmation.override`)* |
| | `delivery.pod.signature.enabled` + `delivery.pod.photo.enabled` | T | **N** — **checkbox group** (Recipient signature · Delivery photo) + "depots may override" note *(client default + `depot.pod.override`, ruled 2026-08-05)* |
| **Returns** | `returns.driverInitiated.enabled` | T | — |
| | `returns.management.enabled` | T | Dispatch + Reschedule on Returned orders. **Never gates Edit** |
| | `returns.compensation.enabled` | T | **N** — explainer + **→ Manage in Driver Earnings**. The toggle decides *whether* return trips are paid; the model (`none` / `fixed` → amount / `percentage` → rate) is set **per rate card** *(ruled 2026-08-05)* |

**Groupings that are spec-driven, not preference:**

- **POD is one card with a checkbox group**, not two toggles — signature and photo are a
  non-exclusive multi-select of one concept (your ruling; Doc 2 §3).
- **Smart Dispatch is the master switch for broadcasting** (Doc 2 §4). Off ⇒ no broadcast
  sequence *and* no Dispatch Logs tab on the order detail view.
- **Priority Driver Groups do not appear here at all** — they're depot-scoped (Doc 5 §5), reached
  via the affordance.
- **Both ends of custody behave identically** — pickup confirmation and POD are each a client
  default with a depot override, so both are editable here with an override note. An interim
  reading had pickup confirmation as a link-out; that asymmetry was withdrawn for symmetry.
- **Return compensation is a switch, not a picker.** *Whether* returns are paid is one client
  decision; *how much* belongs to each rate card, so a client running several cards can differ per
  card — which a single enum here could not express.

---

## 4. Tab 2 · Fleet Management

| Sub-section | Setting | Card | Nested / notes |
|---|---|---|---|
| **Driver Availability** | `broadcast.suspension.default` | T | **N** — X orders in Y days · **`broadcast.suspension.autoReinstate.enabled` checkbox** (Doc 5 §3.2 requires it beside the criteria) · read-only note on the fixed reinstatement mechanic |
| **Driver Earnings** | *rate cards · payouts* | — | **Deferred** — depends on the Rate Card PRD, not in this repo |

**Auto-reinstatement is deliberately not its own card:** Doc 5 §3.2 specifies it as a checkbox on
the same surface as the criteria it reuses. Separating them would hide that they share one
threshold.

**No per-driver-group override** (ruled 2026-08-05). Doc 5 v1.0–v1.3 specified one; it was never
confirmed and is withdrawn, so suspension is a **single client-level threshold**. This leaves the
tab with one live card until rate cards land — thin, but honest, and it's the tab that grows next.

**Copy rule:** "suspension", never "deactivation" (Doc 5 §3) — the account stays active; only
broadcast eligibility pauses.

---

## 5. Coverage & deferrals

**In Phase 3:** **13 configurable settings** + 2 read-only + 1 derived + 4 links-out, across two
live tabs (+ an empty Notifications tab).

Four nested-disclosure archetypes, each built once and reused:

| Archetype | Example |
|---|---|
| reveal a **sub-mode** | `items.enabled` → mode + value-required |
| reveal a **checkbox group** | POD → signature · photo |
| reveal **numeric criteria** | suspension → X orders / Y days + auto-reinstate checkbox |
| reveal an **explainer + link-out** | smart dispatch → Depots · return compensation → Driver Earnings |

| Deferred | Why | Phase |
|---|---|---|
| Depot records + all depot dials (broadcast sequence, order wait time, `depot.maxOrdersPerTrip`, geofences, SLA / POD / pickup-confirmation overrides) | Record CRUD + the operational tier. Legacy form = Images 1–2; **all legacy fields carry forward** | **Depots** |
| Product records (code · name · price · unit weight · dimensions) | Record CRUD, gated on `products.enabled` | **Products** |
| `roles.custom.definitions` | A permission matrix, not toggle cards | **Roles** |
| Rate cards · payouts | Rate Card PRD not in repo | **Fleet earnings** |
| Notifications | Empty tab now; **on the task checklist** | **Notifications** |

**Explicitly not configuration** (your ruling): auto-refresh · rows-per-page · default column set.

---

## 6. Two card shapes

The template is built around toggle cards, but **2 cards aren't on/off** — the two SLA duration
cards (Phase 1 and Phase 2). Forcing them into toggles would mean inventing a meaningless
"enable SLAs" switch.

*(Return compensation was the third such case until it became a toggle + link-out — a good sign
the two shapes are sufficient rather than the start of a proliferation.)*

So Phase 3 ships **two shapes**: the template's **toggle card**, and an identical **control card**
minus the switch, carrying its input inline. Plus the **read-only row** for fleet type and derived
OFT. I'll build one of each in the first pass for you to confirm before replication.

---

## 7. Resolved rulings (2026-08-05, round 3)

1. **`pickup.confirmation.enabled` → "Manage in Depots" link.** It is depot-scoped, so the Admin
   page carries no toggle for it — just the explainer and the link out, the same treatment as the
   broadcast sequence. Three links out on this page now: Products, Depots (×2 — Service Levels and
   Dispatch), and Depots again for pickup confirmation.
2. **Smart Dispatch off ⇒ hide the affordance.** Nothing to configure downstream, so the
   "Manage in Depots" link is hidden rather than disabled. `enRoutePickup` stays visible.
3. **`delivery.pod.*` → client default + depot override** (`depot.pod.override`) — editable toggle
   + checkbox group here, with a "depots may override" note.
4. **`broadcast.suspension.default` → client only**, per-group override **withdrawn**.
5. **`pickup.confirmation.enabled` → client default + depot override too** (round 4), restoring
   symmetry with POD. Supersedes ruling 1 above, which had made it a link-out.
6. **`returns.compensation.model` → `returns.compensation.enabled` + "Manage in Driver Earnings"**
   (round 4). The model moves per-rate-card.

## 8. Still open

**Nothing.** All tier questions are closed (Doc 2 §11) and the grouping is approved. Phase 3 starts
from §3–§4 as written.
