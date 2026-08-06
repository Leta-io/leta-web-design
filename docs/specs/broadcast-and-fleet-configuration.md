# Broadcast & Fleet Configuration

> **Leta · Dispatcher Platform (Doc 5)**
> Defines how an order is offered to drivers once dispatch begins: the broadcast lifecycle, priority driver groups, acceptance windows and retries, fallback rules, and driver broadcast suspension/reinstatement. Consumed by *Order Management — Foundations & Logic* (§9 Broadcast & Manual Dispatch, §7.5 Dispatch Logs tab) and indexed by the *Configuration Reference* (Doc 2).
> **Status:** v1.5 — broadcast dials ruled **depot-scoped** with the smart-dispatch switch and suspension threshold at **client**; order wait time unified; **driver-group suspension override withdrawn** (2026-08-05).
> **Scope tiers:** **Client** (smart-dispatch switch, suspension threshold) → **Depot** (all broadcast dials). Rate cards extend below depot into Driver Group → Driver (§6).
>
> **Broadcast dials are depot-scoped; the on/off switch is client-scoped (ruled 2026-08-05).**
> The client answers *"do we broadcast?"* once (`scheduling.autoBroadcast.enabled`, Doc 2 §4).
> Every operational dial in §4 — driver-group prioritisation and therefore the broadcast sequence,
> acceptance windows, retries, rounds, order wait time, fallback — is set **per depot**, on the
> depot record. A client may broadcast from one depot and dispatch manually from another.
> Rows in §4 still reading "Client" are superseded — treat **Depot** as authoritative for dials.
> **Two things stay at client level:** the smart-dispatch switch itself and the driver-suspension
> threshold (§3.1) — the latter's per-group override is **withdrawn** (never confirmed).
>
> **Consequence for the Admin UI:** the client configuration page does **not** reproduce these
> dials. It carries the smart-dispatch switch and a **"Manage in Depots"** affordance pointing at
> the depot record where the sequence is actually built (Doc 2 §11).

---

## 1. The broadcast lifecycle

Every order dispatched through the marketplace path moves through this sequence. It's the mental model behind every screen that reports on it (OM §7.5 Dispatch Logs).

1. **Order wait time.** When an order is queued, it waits for a configured period
   (`broadcast.orderWaitTime`, seconds, depot-scoped — e.g. 60s) before anything is broadcast. The
   dispatcher can edit, cancel, or manually dispatch while it runs. Order status is Pending. One
   setting, one countdown, surfaced in both the Overview row-2b copy and the Dispatch Logs On Hold
   state.

   > **Naming (ruled 2026-08-05):** this is **"order wait time"** everywhere — spec, UI, and
   > copy. "Hold window" is retired: admins already know this setting by its legacy name, and
   > two names for one dial is how the three-way naming conflict arose in the first place. Copy that read
   > *"When the hold window closes…"* now reads *"When the order wait time expires…"*.
2. **Pre-offer.** When the window closes, the order is first offered to drivers already on a compatible route — a quiet, high-efficiency pass before the wider broadcast.
3. **Priority groups.** The order then broadcasts to the client's priority driver groups in strict order: **In-house (P1) → Suppliers (P2) → Floaters (P3)**. Each group has its own acceptance window, driver pool, max-orders cap, and retry count. A group escalates to the next only after its window × retries elapses with no acceptance.
4. **Fallback.** If every priority group is exhausted without acceptance, the order falls back to all nearby drivers regardless of group.
5. **Acceptance.** The order is assigned to whichever driver accepts first; the order status becomes Assigned.

## 2. Priority driver groups

Configured **per depot** (§5). Default three-tier structure:

| Group | Priority | Typical composition |
|---|---|---|
| **In-house** | P1 | The client's own dedicated/employed drivers |
| **Suppliers** | P2 | Contracted third-party driver pools |
| **Floaters** | P3 | Leta's roaming marketplace pool — the fallback tier by definition |

Each group carries its own configuration:

| Setting | Description |
|---|---|
| Acceptance window | How long the group is offered the order before escalating |
| Max orders | Cap on concurrent orders offered to the group |
| Driver pool | Which drivers belong to this group |
| Retries | How many times the window repeats within the group before escalating |
| Escalation rule | Auto-derived: "Escalates to {next group} after {window × retries}s if unaccepted" |

Groups are strictly ordered — a client can reorder or disable a group, but cannot run two groups in parallel within the standard flow.

## 3. Driver broadcast suspension

> **Naming note:** this is **suspension**, not deactivation — "deactivation" implies the driver's account itself is disabled, which is not the case. A suspended driver's account remains fully active; they are simply excluded from receiving new order broadcasts until reinstated. This distinction is load-bearing for copy across the dispatcher platform and the Driver App — never use "deactivate/deactivation" for this feature.

**Purpose:** prevent order allocation from wasting cycles on drivers who have gone inactive, by automatically excluding them from receiving new broadcasts until reinstated.

### 3.1 Automatic suspension

- **Logic:** if a driver has completed fewer than **X orders** in the past **Y days**, they are automatically suspended from broadcast.
- **Scope: client-level only (ruled 2026-08-05).** One X/Y threshold for the whole tenant. Unlike the broadcast dials, this is **not** depot-scoped: an activity bar measures whether a driver is still working at all, which isn't a per-location question.

> **Driver-group-level override withdrawn (2026-08-05).** v1.0–v1.3 of this document specified a
> per-group X/Y override (`broadcast.suspension.groupOverride`) with the rationale that Floaters
> would otherwise have nowhere to configure a threshold. **That scoping was never confirmed by the
> product owner** and is removed: suspension is a single client-level threshold. Do not reintroduce
> per-group thresholds without an explicit ruling — the complexity it adds (an override matrix, an
> inheritance rule, and a per-group editing surface) was not asked for.
- **Applies to both marketplace and managed-fleet clients** — a managed-fleet roster being curated at onboarding doesn't mean it stays current; drivers on any fleet type can go quiet.
- Suspended drivers are excluded from all priority groups and the fallback pool until reinstated.

### 3.2 Reinstatement — manual (current) and automatic (new)

- **Manual bulk reinstatement** is the existing capability, currently available to **managed-fleet clients only**, via the Fleet module: a dispatcher/admin reviews suspended drivers and reinstates them in bulk.
- **Automatic reinstatement (new, this session):** since marketplace clients now gain automatic *suspension* too, reinstatement gains the same asymmetry problem manual-only reinstatement always had — a driver who requalifies stays suspended until a human happens to check. The fix: on the same screen where the dispatcher sets suspension criteria (X/Y), a **checkbox** lets them opt in to automatic reinstatement using the same criteria the driver failed to meet — if a suspended driver now meets the X-orders-in-Y-days threshold, they're reinstated automatically. Off by default; suspension and reinstatement are independently toggleable (a client can auto-suspend without auto-reinstating, but not the reverse in a meaningful way).

**Reinstatement mechanics — ruled 2026-07-09:**

1. **Fresh-window re-qualification** (not a hysteresis margin). Once suspended, the clock resets: reinstatement requires the driver to complete X orders in a genuinely new Y-day window starting from the suspension date, not merely tip the old rolling window back over the line. **Why not hysteresis:** a margin (e.g. suspend below 5, reinstate only above 8) reduces flapping but doesn't eliminate it — a driver can still bounce back on a single lucky burst of activity that happens to clear the higher bar. Fresh-window forces a genuine, sustained return to activity before status changes again, which is the actual intent of the feature — a slower reinstatement that means something, rather than a fast one that doesn't.
2. **Checked once daily**, not per-order. **Why not per-order:** re-evaluating on every completed delivery means a driver's status could theoretically flip mid-day, which is more machinery than the feature needs and reintroduces the exact noisy back-and-forth the fresh-window rule exists to prevent. A daily batch check is simple to build, easy to reason about, and "reinstated as of this morning" is a legible thing to tell both a dispatcher and a driver.

### 3.3 Driver-facing surface — appeal flow (new requirement, Driver App scope)

Suspension is not silent to the driver:

- A suspended driver sees their suspension status and reason **on their profile** in the Driver App.
- The driver has a path to **appeal** the suspension.

This is a **Driver App design requirement**, not something this document specifies further — the Driver App has its own design surface and prior work (see the Driver App design deck in project knowledge). Doc 5 states the requirement exists and must be honoured by whatever suspends/reinstates a driver; the appeal UI/flow itself is out of scope here.

## 4. Configuration flags (stored in Doc 2)

| Flag | Meaning | Level |
|---|---|---|
| `broadcast.orderWaitTime` | **Order wait time** — how long a queued order waits before broadcasting begins. **Canonical name**; `broadcast.holdWindow.duration` and `dispatch.orderWaitTime` are retired aliases. Unit: **seconds**. **User-facing label is always "Order wait time", never "hold window"** (ruled 2026-08-05) | **Depot** |
| `broadcast.preOffer.enabled` | Whether the compatible-route pre-offer pass runs before priority groups | **Depot** |
| `broadcast.priorityGroups.config` | Per-group acceptance window, max orders, driver pool, retries (§2) | **Depot** |
| `broadcast.rounds` | How many **typical rounds** through the full priority ladder one sequence runs, before any fallback round. Distinct from per-group `retries`, which repeats a *single* group's window within a round (added 2026-08-05, absorbing Doc 1's `dispatch.broadcast.rounds`) | **Depot** |
| `broadcast.fallback.enabled` | Whether exhausted priority groups fall back to all nearby drivers | **Depot** |
| `broadcast.suspension.default` | The X orders / Y days threshold (§3.1) | **Client** — one threshold tenant-wide (ruled 2026-08-05) |
| ~~`broadcast.suspension.groupOverride`~~ | ~~Per-group X/Y override~~ | **Withdrawn 2026-08-05** — never confirmed; see §3.1 |
| `broadcast.suspension.autoReinstate.enabled` | Whether drivers who requalify are reinstated automatically, using the suspension criteria (§3.2) | Client, checkbox alongside suspension criteria |
| `broadcast.suspension.reinstate.mode` | Reinstatement mechanic — fixed to fresh-window re-qualification, evaluated daily (§3.2) | Client — fixed platform behaviour, not admin-configurable |

## 5. Where broadcast configuration lives (revised 2026-08-05)

**Every operational dial lives on the depot.** The client owns only two things: whether smart
dispatch is on at all, and the driver-suspension threshold. It does **not** own a shadow copy of
the dials for depots to inherit — a depot either has a broadcast configuration or it doesn't.

| Level | What it owns |
|---|---|
| **Platform** | `dispatch.fleetType` — managed-fleet vs. marketplace, set by LETA internal admin, read-only to the tenant. Decides *who* a broadcast reaches (priority groups vs. open pool), never whether broadcasting happens |
| **Depot** | The dials: order wait time, pre-offer, rounds, priority-group config, fallback |
| **Client** | `scheduling.autoBroadcast.enabled` (the smart-dispatch switch, Doc 2 §4) and `broadcast.suspension.default` — one driver-activity threshold tenant-wide (§3.1) |

**Smart dispatch is the entry point.** A depot with `scheduling.autoBroadcast.enabled` off (Doc 2
§4) dispatches manually only: none of §4's dials apply, and the order's Dispatch Logs tab is absent
(OM §7.5). Everything in this document is downstream of that one switch.

## 6. Rate cards — pointer, not restated

Driver earnings and client costs are governed by a separate, previously-specified system (Rate Card Specifications PRD, in project knowledge). Summary only — **the PRD is the source of truth, not this section:**

- **Hierarchy:** Client → Depot → Driver Group → Driver. Priority order (most specific wins): Driver > Driver Group > Depot > Client. An unconfigured level inherits from the one above it. **The PRD has been corrected (v1.1, 2026-07-09)** to reflect this — see the pointer below.
- **Rate card models:** Flat Rate, Distance-Based Tiered, Order Volume-Based, and (Phase 2) Advanced — time-based surge, zone-based pricing, SLA incentives.
- **Return compensation is a per-rate-card setting (added 2026-08-05).** Whether return trips are paid at all is a client switch (`returns.compensation.enabled`, Doc 2 §5); the **model** — none / fixed amount / percentage of initial payout — is configured **on each rate card** here, so a client running several cards can treat returns differently per card. The Admin page links out to Driver Earnings rather than carrying an enum.
- Full field-level detail (base fare, per-km tiers, min/max, etc.) lives in the PRD.

## 7. Open items

- **Depot-level override toggle** for priority-group configuration (§4, `broadcast.priorityGroups.config`) needs a formal flag name and default state — currently inferred from the depot-record discussion in Doc 2 scoping, not independently confirmed.
- **Appeal flow UI** (§3.3) is Driver App scope — not designed here, needs its own spec pass.
- **Rate Card PRD Depot phasing** — the PRD's original phasing table never assigned a phase to Depot (it didn't exist as a tier). Needs a phase decision (Phase 1, alongside Client, or Phase 2 alongside Driver Group) — flagged in the PRD itself, carried here for visibility.
- **Rate Card Dashboard redesign** — the Main Rate Card Dashboard needs a level selector (Client/Depot/Driver Group/Driver) now that four tiers exist; not designed yet.

## Revision history

| Version | Date | Changes |
|---|---|---|
| 1.5 | 2026-08-05 | **`broadcast.suspension.groupOverride` withdrawn** (§3.1, §4) — the per-driver-group X/Y override specified in v1.0–v1.3 was never confirmed by the product owner and is removed; suspension is **one client-level threshold**. **`broadcast.suspension.default` re-tiered Depot → Client.** §2 corrected to depot-scoped (the stale `broadcast.depot.override.enabled` reference removed); §5 tier table and the header scope line corrected to show the client keeping exactly two things — the smart-dispatch switch and the suspension threshold |
| 1.4 | 2026-08-05 | **Broadcast configuration ruled depot-scoped** — §4 flags migrated Client → Depot; §5 rewritten, withdrawing the client-default / depot-override inheritance model. **Hold window unified with Doc 1's "order wait time"** into one depot-scoped `broadcast.holdWindow.duration` in **seconds** (matching the legacy depot form's "Order Wait Time (seconds)"); `dispatch.orderWaitTime` retired as an alias. **New `broadcast.rounds`** absorbing Doc 1's `dispatch.broadcast.rounds`, with the rounds-vs-retries distinction stated. Smart dispatch documented as the entry point gating this whole document |
| 1.3 | Jul 2026 | Reinstatement mechanics ruled and locked: fresh-window re-qualification (not hysteresis) evaluated daily (not per-order), each with an explicit "why not the alternative" note per Ifeanyi's request. Flag table and open items updated — both mechanics moved from open to decided |
| 1.2 | Jul 2026 | Rate Card PRD pulled from source and corrected (now v1.1, Depot tier inserted) — §6 pointer and open items updated accordingly; two new open items surfaced by that edit (Depot's phase assignment, dashboard level-selector redesign) |
| 1.1 | Jul 2026 | **Renamed "deactivation" → "suspension"** platform-wide (deactivation implies account disablement; the driver's account stays active, only broadcast eligibility is paused). New §3.2 automatic reinstatement — checkbox alongside suspension criteria, same X/Y threshold; two open mechanics flagged (flapping prevention, evaluation cadence). New §3.3 states the driver-facing appeal-flow requirement (Driver App scope, not designed here). Flag table and open items updated to match |
| 1.0 | Jul 2026 | Initial specification, reconstructed from the Dispatch Logs tab design work and the driver-suspension settings panel design, plus this session's scoping questionnaire (suspension scope, managed-fleet applicability, depot/client relationship) |
