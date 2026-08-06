# Client Configuration — Spec Coverage Audit

**Date:** 2026-08-05 · **Phase 1 of 3** (audit → IA → build)
**Version:** **v2** — rebaselined on **Doc 2 (Configuration Reference v1.0/1.2)** and
**Doc 5 (Broadcast & Fleet Configuration v1.1/1.3)**, received after v1, plus four rulings
from Ifeanyi (§7).
**Scope:** every client-admin-configurable setting named in the specs vs. what
`apps/playground` implements.

**Method.** Spec side: every flag table across Doc 1 App A (17), Doc 2 §2–§5/§9/§10 (17),
Doc 4 §5 (5), Doc 5 §4 (8), de-duplicated into a canonical set of **30 configurable
settings** (+1 fixed platform behaviour that is deliberately *not* configurable).
Implementation side: all 19 distinct `config.*` / `fleetType` read sites in the playground,
traced to the behaviour they gate.

---

## 0. What changed from v1

| v1 finding | Status now |
|---|---|
| **H1** — Doc 2 missing, so no defaults/types/scopes | **Resolved.** Doc 2 supplies type, default, scope, surfaces, and a tier-gate column for every flag it owns. |
| **H5** — Doc 5 missing | **Resolved.** Doc 5 adds 8 broadcast/fleet flags, incl. an entire **driver-suspension** subsystem absent from both v1's inventory and the playground. |
| **C4** — "add a *company-level* driver groups section" | **Withdrawn — I had this wrong.** Doc 2 §11 rules explicitly that **no Company tier exists** (confirmed 2026-07-06); Doc 1's "admin-created at company level" is loose phrasing for *client*. The correct model is **Client-level defaults + optional Depot override** (Doc 5 §5). See **X4**/**X6**. |
| **C1** — POD collapsed to one boolean | **Confirmed by Doc 2 §3** ("independent toggles… either, both, or neither") **and ruled by Ifeanyi**: two independent settings, presented as a **checkbox group**. |
| **C2** — 30m SLA vs 40m "spec value" | **Half-withdrawn.** 40 min is a *reference example*, not a target; the real rule is **OFT = sum of the 5 stage SLAs**. The defect is only that 30m is hardcoded and not derived. |
| Config universe | **22 → 30 settings.** Newly in scope: roles & permissions, depot administration, driver suspension, rate-card/SLA depot overrides. |

**The headline is no longer "the spec is missing".** It's that the three broadcast-related
documents now describe **the same settings under different names, at different scope tiers** —
and the playground implements a third variant again. That has to be reconciled before the IA
(§6 **X4**, **X5**), because it decides whether broadcast config lives on the client page, the
depot record, or both.

---

## 1. Coverage — canonical set of 30 settings

**Behaviour:** ✅ built & config-driven · ⚠️ built but diverges · ❌ not built.
No editable UI exists for any of them (`/settings` → `ComingSoonPage`), so Phase 3 owes all 30.

### A · Order fields — Doc 2 §2

| Flag | Scope | Type · Default | Playground | B |
|---|---|---|---|---|
| `items.enabled` | Client | Bool · Off | `config.items.enabled` | ✅ |
| `items.mode` | Client | `manual` \| `product` · `manual` | `config.items.mode` | ✅ |
| `items.valueRequired` | Client | Bool · Off | `config.items.valueRequired` | ✅ |
| `payment.enabled` | Client | Bool · Off | `config.payment.enabled` | ✅ |

### B · Delivery confirmation — Doc 2 §3

| Flag | Scope | Type · Default | Playground | B |
|---|---|---|---|---|
| `pickup.confirmation.enabled` | **Client only**, no depot override | Bool · Off | `config.pickupConfirmation` | ✅ |
| `delivery.pod.signature.enabled` | Client | Bool · Off | merged → `proofOfDelivery` | ⚠️ **C1** |
| `delivery.pod.photo.enabled` | Client | Bool · Off | merged → `proofOfDelivery` | ⚠️ **C1** |

### C · Scheduling & dispatch — Doc 2 §4

| Flag | Scope | Type · Default | Playground | B |
|---|---|---|---|---|
| `scheduling.autoBroadcast.enabled` | Client | Bool · Off | `config.autoBroadcast` | ✅ |
| `dispatch.fleetType` | **Disputed — X1** | `marketplace` \| `managedFleet` · set at onboarding | `client.fleetType` (`managed-fleet`, kebab — **X3**) | ✅ |
| `dispatch.enRoutePickup.enabled` | Client | Bool · Off | *absent* | ❌ |

### D · Returns — Doc 2 §5

| Flag | Scope | Type · Default | Playground | B |
|---|---|---|---|---|
| `returns.driverInitiated.enabled` | Client | Bool · Off | *absent* | ❌ |
| `returns.compensation.model` | Client | `none` \| `fixed` \| `percentage` · `none` | *absent* | ❌ |

### E · SLA — Doc 4 §5

| Flag | Scope | Ref. | Playground | B |
|---|---|---|---|---|
| `sla.phase1.assignment` | Client | 5 min | *absent* | ❌ |
| `sla.phase1.arriveAtDepot` | Client | 10 min | *absent* | ❌ |
| `sla.phase1.pickup` | Client | 5 min | *absent* | ❌ |
| `sla.phase2.arriveAtDestination` | Client | 15 min | *absent* | ❌ |
| `sla.phase2.completeAtDestination` | Client | 5 min | *absent* | ❌ |

Expected OFT = **sum of the five**, displayed derived. Today `/ 30m SLA` is a literal in
`OrderOverviewCard.tsx:67` (**C2**), and badge state is hash-mocked, not clock-derived (**C3**).

### F · Broadcast & fleet — Doc 5 §4 (+ Doc 1 App A overlap)

| Setting | Doc 5 name · scope | Doc 1 name · scope | Playground | B |
|---|---|---|---|---|
| Hold window before broadcast | `broadcast.holdWindow.duration` · Client (e.g. 10**s**) | `dispatch.orderWaitTime` · Client (min) | `orderWaitMinutes` · Client | ⚠️ **X5** |
| Pre-offer pass | `broadcast.preOffer.enabled` · **Client** | `dispatch.broadcast.preOfferEnabled` · **Depot** | depot only | ⚠️ **X4** |
| Fallback round | `broadcast.fallback.enabled` · **Client** | `dispatch.broadcast.fallbackEnabled` · **Depot** | depot only | ⚠️ **X4** |
| Priority groups | `broadcast.priorityGroups.config` · **Client + depot override** | `dispatch.broadcast.groups` · **Depot** | depot only | ⚠️ **X4** |
| Rounds per sequence | *(no counterpart)* | `dispatch.broadcast.rounds` · Depot | `depot.broadcast.rounds` | ✅ |
| Auto-suspension threshold (X orders / Y days) | `broadcast.suspension.default` · Client | — | *absent* | ❌ |
| Per-group suspension override | `broadcast.suspension.groupOverride` · **Driver Group** | — | *absent* | ❌ |
| Auto-reinstatement | `broadcast.suspension.autoReinstate.enabled` · Client (checkbox beside criteria) | — | *absent* | ❌ |
| *Reinstatement mechanic* | `broadcast.suspension.reinstate.mode` — **fixed platform behaviour, explicitly not admin-configurable** | — | n/a | **excluded from UI** |

### G · Roles & permissions — Doc 2 §9

| Flag | Scope | Type · Default | Playground | B |
|---|---|---|---|---|
| `roles.custom.definitions` | Client | Structured: role → {category → [permissions]} · empty (Admin only) | *absent* | ❌ |

One fixed **Admin** role (not configurable) + unlimited custom roles. Permissions are
**granular within a category**, rendered as checkbox groups (e.g. Order Management → View /
Edit / Cancel independently). Gates sidebar visibility — the **Management** group is
Admin-only. *The playground already has a `Management` sidebar group (Depots · Settings ·
Integrations), so the structure Doc 2 assumes exists.*

### H · Depot administration — Doc 2 §10

| Flag | Scope | Type · Default | Playground | B |
|---|---|---|---|---|
| `depot.rateCard.override` | Depot | Bool + rate-card ref · Off (inherits client) | *absent* | ❌ |
| `depot.sla.override` | Depot | Bool + 5 SLA values · Off (inherits client) | *absent* | ❌ |
| `depot.broadcast.override` | Depot | Bool + broadcast config · Off (inherits client) | implicit only (`depot.broadcast` present/absent) | ⚠️ |

Doc 2 §10 also specifies depot **record** field groups, most of which don't exist in
`DepotOption {id, name, address, broadcast?}`: **operating hours / capacity**, **default rate
card**, **SLA overrides**, **assigned drivers / vehicles**. See **X8** for the old-UI fields.

### I · Ruled in this session (Ifeanyi, §7)

| Item | Status | Notes |
|---|---|---|
| **Depots module** (`/depots`) — list + add/edit | ❌ route is `ComingSoonPage` | Order-table-like, **no top-level status filters**. Form reference: Leta's legacy Add Depot drawer (Images 1–2). |
| **Products module** (`/products`) — list + add/edit | ❌ doesn't exist | Sidebar item "Products", `Inventory` icon (exists in registry). Fields: **code · name · price (opt) · unit weight (opt) · dimensions (opt)**. Order-table-like, no top-level filters. |
| **Products-module enablement flag** | ❌ **no spec home** | Ifeanyi: "first requires the admin turning on the configuration for managing products." No Doc 2 flag covers this — `items.mode: 'product'` is the closest but governs *order-drawer behaviour*, not module access. **Needs a name + ruling — X10.** |
| Auto-refresh · rows-per-page · default column set | **not configuration** | Ruled out of scope. Removes v1 U3/U4/U5. |

**Totals:** ✅ 8 · ⚠️ 6 · ❌ 16 · editable UI **0 / 30**.

---

## 2. Gaps — spec'd, not built (16)

| ID | Cluster | Settings | Note |
|---|---|---|---|
| **G1** | **SLA model** | 5 stage durations | Highest-value: feeds Duration column, drawer summary, badge logic. 5 numeric inputs → **derived OFT total**. |
| **G2** | **Driver suspension** (Doc 5 §3) | `suspension.default`, `suspension.groupOverride`, `autoReinstate.enabled` | Entire subsystem missing. Client X/Y baseline + per-driver-group override + auto-reinstate checkbox *on the same screen as the criteria* (Doc 5 §3.2). Copy rule: **"suspension", never "deactivation"**. |
| **G3** | **Roles & permissions** | `roles.custom.definitions` | Structured, not a toggle — role list + per-category permission checkbox matrix. Largest single UI. |
| **G4** | **Depot overrides** | `rateCard.override`, `sla.override`, `broadcast.override` | Each is *boolean + payload* → textbook nested disclosure. |
| **G5** | **Returns** | `driverInitiated.enabled`, `compensation.model` | `model` enum has dependent fields (`fixed` → amount, `percentage` → rate). |
| **G6** | **En-route pickup** | `dispatch.enRoutePickup.enabled` | Behaviour depends on Add to Trip (a stub); flag can land first. |
| **G7** | **Client-level broadcast defaults** | pre-offer, fallback, priority groups at Client tier | Playground has *only* the depot layer; Doc 5 §5's parent-switch/child-dial model needs both. Blocked on **X4**. |
| **G8** | **Depot record fields** | operating hours/capacity, rate card, SLA overrides, assigned drivers/vehicles | Doc 2 §10 field groups absent from `DepotOption`. |

---

## 3. Conflicts

### Spec vs. spec (new — these need your ruling)

| ID | Sev | Conflict | My recommendation |
|---|---|---|---|
| **X1** | **High** | **`dispatch.fleetType` tier.** Doc 1 §2.2 + App A: **platform-provisioned**, set by LETA internal admin, **read-only to the tenant**, and explicitly instructs *"Doc 2 must scope it as platform-provisioned, not a tenant toggle."* Doc 2 §4 lists it as a plain **Client** flag with **no** read-only marking — that instruction was never carried out. | **Doc 1 wins** (v3.3, later, with explicit tier reasoning). Render read-only or omit. Patch Doc 2 §4. |
| **X2** | **High** | **`fleetType` semantics.** Doc 2 §4 glosses it *"Marketplace (auto-broadcast) vs. managed-fleet (manual)"* — implying fleet type *determines* auto-broadcast. But `scheduling.autoBroadcast.enabled` is a separate Client flag; the playground has a **managed-fleet client with auto-broadcast on** (Acme); and Doc 5 §3.1 treats both types as broadcast-capable. | Doc 2's parenthetical is wrong — the two are **independent**. Fix the gloss. |
| **X3** | Low | **Enum casing.** Doc 2 `managedFleet` vs Doc 1 + playground `managed-fleet`. | Pick one; kebab matches the code. |
| **X4** | **High** | **Broadcast namespace + scope collision.** Three settings, two names, two tiers (table §1F). Doc 5 §5 states the intent — client fixes the shape, **depot tunes locally, no-override depots inherit** — but Doc 1 flattens them to Depot-only and the playground implements Depot-only, with no client defaults. | Adopt **Doc 5's namespace + two-tier model**; retire the `dispatch.broadcast.*` aliases; add the client tier. Decides where these live in the IA. |
| **X5** | **High** | **Hold window: three names, two units, two tiers.** `dispatch.orderWaitTime` (Doc 1, Client, unit unstated) · `broadcast.holdWindow.duration` (Doc 5, Client, "e.g. 10s") · `orderWaitMinutes` (playground, Client, minutes) — and the legacy UI (Image 2) had **"Order Wait Time (seconds)" at depot level, value 60**. | One flag, unit **seconds** (matches Doc 5 + legacy), Client with depot override under **X4**. Surface the unit in the label. |
| **X6** | Medium | **Phantom "company" tier.** Doc 1 App A: groups "admin-created at **company** level". Doc 2 §11: **"No Company tier exists"** (confirmed 2026-07-06). | Doc 1 phrasing is stale — read as *client*. Patch Doc 1. (Corrects my own v1 C4.) |
| **X7** | Low | **Pickup PIN scope vs legacy UI.** Doc 2 §3: **Client only, no depot override** (ruled 2026-07-09). Legacy Add Depot form (Image 1) has *"Require PIN Confirmation at Pickup"* as a **depot** checkbox. | Spec wins — the **new depot form must not include it**. Called out because the legacy form is our layout reference. |

### Spec vs. implementation

| ID | Sev | Conflict | Action |
|---|---|---|---|
| **C1** | High | POD collapsed into one `proofOfDelivery` boolean; Doc 2 §3 + your ruling require two independent settings. | **Split into two, presented as a checkbox group** (your ruling). Detail view already renders signature and photo as separate proof rows. |
| **C2** | Medium | `/ 30m SLA` hardcoded; must be the derived sum of the five stage SLAs. | Derive from G1. (30m was an arbitrary prototype value — not a spec conflict, just un-configurable.) |
| **C3** | Medium | SLA badge state from `idHash % 5`, not stage clocks vs. stage SLAs (Doc 4 §3). | Accept as known mock; the config UI must not imply the thresholds are live. |
| **C6** | Low | `orderWaitMinutes: 0` on a non-auto-broadcast client, with a `Math.max(…, 2)` magic floor compensating. | Nest hold-window *inside* auto-broadcast — removes the meaningless state by construction. |

### Open — no spec home

| ID | Item | Needed |
|---|---|---|
| **X8** | **Legacy depot fields with no spec coverage** (Images 1–2): depot **Code**, **Latitude/Longitude**, **Restricted Radius (m)**, **Show Order Ready for Pickup**, **Maximum Distance between Orders (m)**, **Pickup/Dropoff Geofence Radius (m)**, **Pickup/Dropoff Geofence Type** (`soft`/…). None appear in Doc 2 §10 or any flag table. | Which survive into the new Depots module? |
| **X9** | **Rate Card PRD** — pointed to by Doc 2 §8 and Doc 5 §6; `depot.rateCard.override` depends on it. Not in this repo. | Out of Phase 3 scope unless provided. |
| **X10** | **Products-module enablement flag** — required by your ruling, no Doc 2 flag exists. | Name + scope + default (suggest `products.enabled`, Client, Off). |

---

## 4. Structural observations for Phase 2

1. **Four scope tiers, not one.** Platform-provisioned (`fleetType`) · **Client** (majority) ·
   **Depot** (overrides + broadcast tuning) · **Driver Group** (`suspension.groupOverride`).
   Doc 2 §11 rules Client → Depot as the only *platform-wide* hierarchy; Driver Group is a
   narrower fleet-specific extension. A single flat page cannot express this.
2. **Two distinct UI archetypes.** (a) **Toggle-card settings** — the template in Image 1,
   ~20 settings. (b) **Record-management modules** — Depots and Products: table + add/edit
   drawer, no status filters. These are different pages, not different tabs of one page.
3. **Real dependency chains** (the nested-disclosure requirement maps onto genuine structure):
   `items.enabled → mode → (product → catalogue)` · `autoBroadcast → holdWindow` ·
   `compensation.model → amount|rate` · `suspension.default → X/Y + autoReinstate` ·
   `depot.*.override → payload` · 5 SLA durations → derived OFT.
4. **Only ~6 of 30 are plain booleans with no payload.** The majority need the nested section.
5. **Existing fixtures are good Phase 3 test data:** Acme (multi-depot · product items ·
   payment · auto-broadcast · managed-fleet) · Naivas (single depot · manual items · no
   auto-broadcast) · Java House (items **off** · payment **off** · marketplace).

---

## 5. Recommended Phase 3 scope

Building all 30 settings **plus** two record-management modules is well beyond one pass. Suggested split:

- **3a — Client Settings page** (the Image-1 template): order fields, delivery confirmation,
  scheduling & dispatch, returns, SLA, client-level broadcast, suspension. ~22 settings,
  every nested-disclosure archetype represented.
- **3b — Depots module**: table + add/edit drawer with depot overrides. Depends on **X4/X5/X8**.
- **3c — Products module**: table + add/edit drawer, gated on **X10**.
- **3d — Roles & permissions**: its own surface (permission matrix, not toggle cards).

I'd propose **3a only** for Phase 3 as originally briefed, with 3b–3d as follow-on phases.

---

## 6. Blocking questions

1. **X1 / X2 / X4 / X5** — the four High spec-vs-spec conflicts. My recommendations are in the
   table; confirm or overrule. **X4 and X5 decide where broadcast settings live in the IA**, so
   they must be settled before Phase 2.
2. **X10** — name/default for the products-module enablement flag.
3. **X8** — which legacy depot fields carry forward.
4. **Phase 3 scope** — 3a only (recommended), or wider?

Non-blocking (I'll proceed on these unless told otherwise): **X3** kebab-case · **X6** patch
Doc 1's "company" wording · **X7** omit pickup-PIN from the depot form · **C1** split POD into
a checkbox group · **C3** leave the SLA mock as-is.

---

## 7. Rulings received — 2026-08-05 (Ifeanyi) · Phase 1 closed

| Q | Ruling | Consequence |
|---|---|---|
| **X4 / X5** + all scope questions | **Configuration is strictly depot-level. "Everything is at the depot level."** Hold window is the same thing as the standard order wait time. | Largest structural change in this audit. **No client configuration tier exists** — Doc 2's Client → Depot parent-default model is withdrawn (Doc 2 §11 rewritten, Doc 5 §5 rewritten). Hold window unified into one depot-scoped `broadcast.holdWindow.duration` in **seconds**; `dispatch.orderWaitTime` retired as an alias. Doc 5's namespace wins; `broadcast.rounds` absorbs `dispatch.broadcast.rounds`. **Also makes `depot.sla.override` / `depot.broadcast.override` obsolete** — nothing left to override (raised in the IA §1b). |
| **X1 / X2** | `dispatch.fleetType` **is platform-provisioned** (LETA internal admin). Doc 2's *"Marketplace (auto-broadcast) vs managed-fleet (manual)"* gloss is **outdated — ignore it**; managed-fleet clients can auto-broadcast. **New rule:** smart dispatch via automated broadcasts is what unlocks broadcasting for SaaS clients — so a client not using it (e.g. Java House) has **no Dispatch Logs tab** in the Order Detail view. | Doc 1 §2.2 upheld; Doc 2 §4 patched to mark it platform-provisioned/read-only and to withdraw the gloss. **New finding — C7 below.** |
| **X7** | **Overruled.** *"Require PIN Confirmation at Pickup" is depot-scoped. Update the specs accordingly.* | The 2026-07-09 "Client only, no depot override" ruling is withdrawn in Doc 2 §3 and Doc 1 App A. The legacy depot form was right; it **does** carry forward. My v2 recommendation was wrong. |
| **Phase 3 scope** | Approved: settings page first, Depots / Products / Roles as follow-ons. | IA §5. |
| **X8** | **All legacy depot fields carry forward** (code · lat/lng · restricted radius · geofence radius & type · max distance between orders · show-order-ready-for-pickup). | Depots module (deferred phase). |
| **X10** | `products.enabled` approved. | Added to Doc 2 §2, depot-scoped, default Off, gating the Products module and prerequisite to `items.mode: product`. |

### C7 — new conflict from the X2 ruling

**The Dispatch Logs tab is currently unconditional.**
`OrderDetailDrawer.tsx:1129` renders `tabs={[Overview, Activity, Dispatch Logs]}` with no gate.
Per the ruling it must be **absent when smart dispatch is off**. Two follow-ups:

1. **Code:** gate the third tab on `scheduling.autoBroadcast.enabled`.
2. **Fixture:** Java House was named as the example of a client *without* the feature, but its
   mock profile is `autoBroadcast: true` (and `fleetType: 'marketplace'`). To make the ruling
   demonstrable, Java House should become the no-smart-dispatch fixture — **worth confirming**,
   since it also currently exercises `items: off` / `payment: off`.

*Not fixed in this pass* — it's order-management behaviour, not configuration UI. Logged so it
isn't lost.

### Specs reconciled this pass

Docs 2 and 5 were **added to `docs/specs/`** (the README asked for exactly this) and patched:

- **Doc 2 → v1.3** — depot-scoping principle (§11); pickup confirmation Client → **Depot** (§3);
  `dispatch.fleetType` marked platform-provisioned + gloss withdrawn (§4); smart dispatch
  established as the broadcasting master switch gating the Dispatch Logs tab (§4); POD specified
  as a **checkbox group** (§3); new `products.enabled` + product record fields (§2).
- **Doc 5 → v1.4** — §4 flags migrated to **Depot**; §5 rewritten to withdraw the
  client-default/depot-override model; hold window unified (seconds); new `broadcast.rounds`.
- **Doc 1** — App A: pickup-confirmation scope, "company level" phrasing withdrawn (**X6**),
  `dispatch.orderWaitTime` marked a retired alias, smart-dispatch gating note added.
- **README** — both docs indexed; "referenced but not yet in this repo" now lists only the
  Rate Card PRD.
