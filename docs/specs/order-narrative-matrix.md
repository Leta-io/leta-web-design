# Order Narrative Matrix — Overview × Activity × Dispatch Logs

> **Leta · Dispatcher Platform**
> The authoritative cross-tab behaviour reference for the View Order drawer. Every row states what **all three tabs** show for one (client type × depot config × order origin × status) combination, so no tab can be built or reviewed in isolation.
> **Status:** v1.1 — derived from the shipped implementation, not aspirational.
> **Source of truth in code:** `apps/playground/src/lib/dispatchNarrative.ts` (the single provenance derivation) + `detailModel.ts` (Overview) + `activityModel.ts` (Activity) + `broadcastModel.ts` / `liveBroadcast.ts` (Dispatch Logs).
>
> **v1.1 correction (2026-08-07):** v1.0's "not aspirational" claim had quietly
> stopped being true — a genuine implementation bug (the status-card title
> reading a fixture's pinned `broadcastState` instead of the live sequence's
> actual active leg, §3.2 below) had crept in since 2026-08-04 without anyone
> re-walking this matrix against the running app to catch it. Fixed in
> `broadcastModel.ts`; see the revision history at the bottom. This is the
> reason a full re-audit (§9) followed rather than trusting the "shipped
> implementation" label at face value.

---

## 0. Why this document exists

The three tabs used to derive "how did this order get its driver?" from five different signals and contradicted each other on screen (an order read *manually assigned* in Dispatch Logs and *automatically dispatched* in Activity, simultaneously). They now all read one derivation. This matrix is that derivation written out per scenario, so a reviewer can check any cell against the running app.

---

## 1. The three input axes

### 1.1 Client type (`fleetType` + `config.autoBroadcast`)

`fleetType` is platform-provisioned and sits **outside** `config` — it is never client-editable.

| Profile | `fleetType` | `autoBroadcast` | Mock client | Dispatch Logs shape |
|---|---|---|---|---|
| **A. SAAS, broadcasting** | `managed-fleet` | `true` | Acme Corp | Full round/group ladder |
| **B. SAAS, manual only** | `managed-fleet` | `false` | Naivas Group | Never broadcasts — always manual |
| **C. Marketplace** | `marketplace` | `true` | Java House | **Single flat responder log** — no groups, no rounds, no fallback, no Priority Driver Groups drill-down |

### 1.2 Depot broadcast config (`DepotOption.broadcast`)

Broadcast config is **depot-scoped, not client-scoped**: a SAAS tenant can have some depots configured and others not.

| Depot kind | Example | Effect |
|---|---|---|
| **Full ladder** | Arc Kitisuru / Westlands — 2 rounds, pre-offer, fallback, P1(40s×2)/P2(25s)/P3(25s) → **320s** | Full escalation |
| **Short ladder** | CBD Pickup Point — 1 round, no pre-offer, no fallback, P1(40s)/P2(25s) → **65s** | Escalates then exhausts fast |
| **Unconfigured** | Kilimani Dispatch Hub — no `broadcast` key | **Never auto-broadcasts**, even on client profile A |

> `broadcastCapable = config.autoBroadcast && !!depot.broadcast`. Both must hold. An order on an unconfigured depot behaves like profile B regardless of the client.

### 1.3 Order origin

| Origin | Meaning | Consequence |
|---|---|---|
| **Scheduled** | Created with a future delivery slot | On profile A it broadcasts **straight out of Scheduled** at T−1h and **never passes through Pending** |
| **Not scheduled** | Immediate order | Rests in Pending for `orderWaitMinutes` (`dispatch.orderWaitTime`), then broadcasts |

**This is why a Pending order on profile A is never scheduled-origin** — the two paths are mutually exclusive, so the Calendar provenance icon is suppressed for that case (`scheduledOrigin && !(pending && autoBroadcast)`).

---

## 2. Dispatch method — "config decides, manual is the exception"

| Condition | `method` | `wasBroadcast` |
|---|---|---|
| Not dispatched (no driver) | `none` | true only if a sequence ran (`status === 'broadcasted'` or a `batchId` exists) |
| `!broadcastCapable` + dispatched | `manual` / *before-broadcast* | false |
| Dispatcher intervened in the hold window | `manual` / *before-broadcast* | false |
| Dispatcher rescued after the sequence failed | `manual` / *after-exhausted* | **true** |
| Otherwise + dispatched | `broadcast` | true |

**A later reassignment never makes an order manual.** Reassignment is an Activity-only event; the broadcast logs keep crediting whoever accepted.

---

## 3. The worked example asked for

> *SAAS client that uses broadcast (profile A) · configured depot · Pending order that was **not** scheduled — what happens in Activity and Dispatch Logs when it starts broadcasting?*

### 3.1 While Pending (before the hold window closes)

| Tab | Shows |
|---|---|
| **Header** | `Pending` badge + creation-provenance icon only. **No Calendar** (not scheduled-origin), **no Broadcast icon** (no driver yet) |
| **Overview** | "**Order broadcasting soon**" / "*{N} minutes to broadcast.*" — a live countdown from `orderWaitMinutes`. CTA: View Activity |
| **Activity** | Creation entry **only**. No broadcast step — nothing has broadcast yet |
| **Dispatch Logs** | **On Hold**: "Broadcast starts in {N} minutes" · banner "*Assign a driver to this order before broadcast begins.*" · empty state "*Dispatch manually now to bypass auto-broadcast. Once the hold window closes, drivers will receive order broadcasts.*" |

Both countdowns read the **same** base (`orderWaitMinutes`, hashed per order), so Overview and Dispatch Logs always agree and tick together regardless of which tab is mounted.

### 3.2 The moment it starts broadcasting (Pending → Broadcasted)

| Tab | Shows |
|---|---|
| **Header** | `Broadcasted` badge. Still no Broadcast provenance icon (that appears only once a driver holds it) |
| **Overview** | "**Order broadcast started**" / "*{N} drivers notified*" — N sourced from the Dispatch Logs model so the two can't drift. CTA: **View Logs** |
| **Activity** | **+ "Automatic order broadcast"** · `Pending → Broadcasted`. From-status is **Pending** here; it would be **Scheduled** for a scheduled-origin order |
| **Dispatch Logs** | **Broadcasting** — live: "Broadcasting to In-house drivers [P1]" · badge "Round 1 of 2" · sequence progress bar · timeline legs accumulate as each group concludes |

### 3.3 As the live sequence runs

The clock (`liveBroadcast.ts`) drives everything from `elapsed`:

| Elapsed | Active leg | Group card bar |
|---|---|---|
| 0–20s | Pre-Offer | — |
| 20–60s | In-house [P1], **try 1 of 2** | fills 0→100% |
| 60–100s | In-house [P1], **try 2 of 2** | **restarts at 0%**, fills again |
| 100–125s | Suppliers [P2] | P1 card reverts to queued, P2 goes live |
| 125–150s | Floaters [P3] | — |
| 150–280s | Round 2 (P1 ×2, P2, P3) | same pattern |
| 280–320s | All nearby drivers [Fallback] | — |
| ≥ 320s | **Exhausted** | order returns to **Pending** |

### 3.4 If nobody accepts (Broadcasted → Pending, exhausted)

| Tab | Shows |
|---|---|
| **Overview** | "**Broadcast unaccepted**" / "*Re-broadcast or dispatch manually.*" · CTA **View Logs** |
| **Activity** | **+ "Broadcasted unaccepted."** · `Broadcasted → Pending` |
| **Dispatch Logs** | **Exhausted**: "Broadcasts unaccepted" + inline **Re-broadcast** link · banner "*Broadcast unsuccessful. Try dispatching manually.*" · full failed timeline |

**Re-broadcast lives only on Dispatch Logs** — the row/footer ⋯ menu deliberately has no such item, which is why the Overview CTA is *View Logs*: it routes the dispatcher to the tab that owns the action.

### 3.5 If the dispatcher re-broadcasts

| Tab | Shows |
|---|---|
| **Activity** | **+ "{dispatcher} rebroadcasted the order"** · `Pending → Broadcasted`, paired **above** the "Broadcasted unaccepted." entry that caused it |
| **Dispatch Logs** | A new live sequence; its rounds continue the same timeline with **no sequence demarcation** |

### 3.6 If a driver accepts

| Tab | Shows |
|---|---|
| **Header** | `Assigned` + **Broadcast provenance icon** (now a driver holds it via broadcast) |
| **Overview** | Auto-assign banner "*This order was automatically assigned to {driver}.*" + "Driver is on the way" |
| **Activity** | **+ "Automatic order dispatch to {acceptor}"** · `Broadcasted → Assigned` |
| **Dispatch Logs** | **Completed**: "Broadcast Resolved at {group}" · "{acceptor} accepted…" |

---

## 4. Full status matrix — profile A (SAAS broadcasting, configured depot)

| Status | Overview main / sub | Activity (newest first, above creation) | Dispatch Logs | Header extras |
|---|---|---|---|---|
| **Scheduled** | `{date}` / "Scheduled delivery date" — or "*N minutes until broadcast.*" when ≤60min | *(none)* | **On Hold** | Calendar |
| **Pending** *(not scheduled)* | "Order broadcasting soon" / "*N minutes to broadcast.*" | *(none)* | **On Hold** | — |
| **Pending** *(exhausted)* | "Broadcast unaccepted" / "*Re-broadcast or dispatch manually.*" · View Logs | Broadcasted unaccepted. ← Automatic order broadcast | **Exhausted** + Re-broadcast | — |
| **Broadcasted** | "Order broadcast started" / "*N drivers notified*" · View Logs | Automatic order broadcast | **Broadcasting** (live ladder) | — |
| **Assigned** | "Driver is on the way" / Est delivery | Auto dispatch to {acceptor} ← broadcast | **Completed** | Broadcast · banner |
| **At Depot** | "Driver is at the depot" / Est delivery | + "{driver} is at the depot" | **Completed** | Broadcast |
| **In Transit** | "Driver is in transit" / Est delivery | + picked up (PIN + POP) → in transit | **Completed** | Broadcast |
| **Arrived** | "Driver has arrived" / Est delivery | + "{driver} arrived at drop-off" | **Completed** | Broadcast |
| **Returning** | "Driver is returning" / Est drop-off | + "{driver} failed the order" + reason | **Completed** | Broadcast |
| **Delivered** | "Order delivered" / "Delivered at {t}" | + delivered (+ POD attachments) | **Completed** | Broadcast |
| **Returned** | "Order returned" / "Returned at {t}" | + returning → returned | **On Hold** (SLA reset) | Broadcast |
| **Cancelled** | "Order cancelled" / "Cancelled at {t}" | + "{dispatcher} cancelled the order" + reasons | **Completed** | Broadcast |

**Manual exceptions on profile A** (dispatcher intervened):

| Case | Activity | Dispatch Logs |
|---|---|---|
| **Manual before broadcast** | "Order dispatched to {driver} by {dispatcher}" · `Pending → Assigned`. **No broadcast entry at all** | **Manual Assignment** + empty state "*…dispatched manually, so no drivers were notified through broadcast.*" |
| **Manual after exhausted** | broadcast → unaccepted → "Order dispatched to {driver} by {dispatcher}" | **Manual Assignment** card **stacked above** the failed-broadcast summary. No Re-broadcast link, no banner |

No Broadcast provenance icon and no auto-assign banner in either case.

---

## 5. Profile B — SAAS, manual only (`autoBroadcast: false`), or any unconfigured depot

| Status | Overview main / sub | Activity | Dispatch Logs |
|---|---|---|---|
| **Scheduled** | `{date}` / "Scheduled delivery date" | *(none)* | **On Hold** |
| **Pending** | "**Dispatch now**" / "*Items ready for delivery.*" · CTA **Dispatch** | *(none)* | **On Hold** |
| **Assigned →Delivered** | as profile A | "Order dispatched to {driver} by {dispatcher}" · `Pending → Assigned` | **Manual Assignment** |

Never any broadcast entry, Broadcast icon, or auto-assign banner. `Broadcasted` is unreachable.

---

## 6. Profile C — Marketplace

Marketplace tenants don't manage drivers, so **driver groups don't exist**.

| Surface | Difference from profile A |
|---|---|
| **Dispatch Logs** | **One flat leg** listing every responder — no rounds, no round markers, no "Round N of M" badge, no fallback, **no Priority Driver Groups drill-down** |
| Status card | "Broadcasting to all nearby drivers" (no group name, no round badge) |
| Notified Drivers | Drops the group chip, group suffix, phone line, and call button + divider |
| **Overview / Activity** | Identical to profile A — the difference is confined to Dispatch Logs |

---

## 7. Invariants (assert these in review)

1. **One provenance answer.** Header icon, Overview banner, Activity dispatch entry and Dispatch Logs state all derive from `buildDispatchNarrative`. If any two disagree, that is a bug, not a variant.
2. **The Broadcast provenance icon means "dispatched by broadcast"** — and only appears once a driver holds the order (never on Scheduled/Pending/Broadcasted/Returned).
3. **The auto-assign banner describes the CURRENT driver.** Suppressed after a reassignment, and on any manual dispatch.
4. **You cannot reassign an order to the driver who already holds it.**
5. **The broadcast acceptor is a real driver** — the order's current driver, or the previous one when a reassignment followed. Never an unrelated name.
6. **The initial-dispatch Activity entry names the acceptor**, not the current driver, so it reconciles with both the reassignment below it and the Dispatch Logs credit.
7. **Every status transition chains.** Reading Activity bottom-to-top, each entry's *from* equals the previous entry's *to* — e.g. `Scheduled → Broadcasted → Pending → Broadcasted`. A re-broadcast is always preceded by the unaccepted event that caused it.
8. **A manual-before-broadcast order logs no broadcast**, anywhere.
9. **Countdowns share one base.** The Overview "N minutes to broadcast" and the Dispatch Logs On-Hold countdown are the same number.
10. **The group card's bar restarts each retry** and never holds at 100%; when a group's last retry ends, the next priority group becomes live.

---

## 8. Open / deferred

- **Real SLA stage clocks — partially resolved (2026-08-07).** The Admin module
  (`/settings`, Doc 2 §11) now holds a live, client-editable `sla` config —
  the five stage durations are no longer hardcoded, and the Overview "{elapsed}
  / {N}m SLA" denominator is genuinely derived from it (`expectedOftMinutes`).
  **Still mocked:** each order's actual per-stage elapsed time and its
  On-Time/At-Risk/Delayed state (`slaStateFor`/`durationSecondsFor` in
  `orderMeta.ts`) are deterministic hashes of the order id, unrelated to the
  configured durations — changing a client's SLA targets in Admin moves the
  *denominator* every order is measured against, but not where any individual
  order actually sits against it. Real per-order stage clocks remain future work.
- ~~**Activity "Order Edited"** variant exists in Figma (`1487:173235`) but is not emitted — no edit-history model yet.~~
  **Built 2026-08-07.** `Order.edits[]` (real, session-only) is appended
  whenever the Edit Order drawer's save actually changes a field
  (`recordOrderEdit`, `OrdersPage.tsx`'s `handleOrderEdited`), and rendered as
  an "Order edited by {dispatcher}" entry — reusing the existing `actor` title
  segment and `field` body block verbatim, no new types needed (Figma
  `1487:173233` turned out to already match the `Driver changed from X to Y`
  shape byte-for-byte). Merged into the trail at its real timestamp, then the
  whole array is re-sorted chronologically — see §4a below.
- ~~**`Dispatcher Activity (Return Order)`**~~ (`"{dispatcher} marked the order
  for return"`) is distinct from `Driver Activity (Failed)`; only the
  driver-failed path is currently emitted.
  **Built 2026-08-07.** The Return Order action (row ⋯ menu, bulk toolbar, and
  the drawer footer for `in-transit`/`arrived` orders) now opens a reason-capture
  modal (`ReturnOrderModal`, mirroring `CancelOrderModal`'s shape) and calls a
  new `returnOrder(id, reason)` store action, which sets `Order.returnInfo`
  before transitioning to `returning`. The Activity trail branches on
  `order.returnInfo`: present → the dispatcher-attributed shape (avatar +
  "marked the order for return" + the typed reason, Figma `1489:183266`);
  absent → the original driver-failed shape, unchanged, so every existing
  seeded fixture (none of which set `returnInfo`) renders exactly as before.

### 8a. Real edit / return history — precedence over the synthesized trail

Two entries in the Activity trail are no longer synthesized from status alone:

| Entry | Trigger | Data lives on |
|---|---|---|
| "Order edited by {dispatcher}" | Edit Order save with ≥1 changed field | `Order.edits[]` |
| "{dispatcher} marked the order for return" | Return Order modal confirmed | `Order.returnInfo` |

Both use the entry's **real** `Date` (`new Date()`/`new Date(edit.at)`), not the
synthesized mock cursor the rest of the trail walks forward from a historical
`createdAt`. `buildActivityTrail` appends them last and re-sorts the whole
array by timestamp before returning, so a live edit or return correctly lands
in chronological order relative to the synthesized history — in practice
always at the top, since the mock trail's timestamps sit within roughly an
hour of a `createdAt` that is usually days in the past, while a real action
happens "now."

---

## 9. Re-audit (2026-08-07) — what prompted the v1.1 correction

A direct code read of `broadcastModel.ts`/`liveBroadcast.ts` against §3/§4/§6,
plus targeted live checks of what it surfaced, rather than a full click-through
of every cell (an earlier attempt at scripting that through the UI proved too
unreliable in this headless setup to trust its results either way).

### 9.1 Confirmed and fixed this session

**Dispatch Logs title ignored the real clock (Invariant #1 violation).** The
status-card title's `onFallback` check was `leg?.kind === 'fallback' || state
=== 'fallback'` — the `|| state === 'fallback'` half read the fixture's
*pinned* review-shape label, not where the live sequence actually was. Any
order pinned to the `fallback` shape said "Broadcasting to all nearby drivers
[Fallback Round]" from the moment the drawer opened, even while the real clock
was still on In-house [P1] — contradicting the Broadcast Logs timeline and
Priority Driver Groups drill-down below it in the same render, which both read
the clock correctly. Separately, `buildManagedLegs` only knew "which round
have we reached," not "which leg within it," so it always marked the round's
**last** group as live regardless of the clock's actual position, fabricating
"already declined" history for groups that hadn't been reached yet. Both fixed
in `broadcastModel.ts` (see its own history for the diff).

### 9.2 Confirmed, not yet fixed

**Manual Dispatch always routes through `broadcasted`, regardless of
`broadcastCapable` — directly contradicts §5's "Broadcasted is unreachable."**
`canDispatch()` (`OrdersPage.tsx`) gates on status group only; `dispatchOrder`
unconditionally calls `updateOrderStatus(id, 'broadcasted')`. Verified live: a
Naivas (profile B — `autoBroadcast: false`, its one depot has no `broadcast`
ladder) Pending order, after clicking the Overview's "Dispatch" CTA, landed on:

- Overview: *"Order broadcast started" / "0 drivers notified"* — claims an
  automatic broadcast that this client's config says can never run.
- Dispatch Logs: *On Hold* — *"Assign a driver to this order before broadcast
  begins."* / *"Broadcast starts in 1 minute"* / *"When the order wait time
  expires, the broadcast will run through all priority groups."* — describing
  a sequence with no ladder to run through, plus a fabricated "10 batched
  orders" count.

Both tabs still *agree* with each other (Invariant #1 technically holds — this
isn't a repeat of §9.1's bug), but what they agree on is incoherent for a
client that cannot broadcast. Manual Dispatch needs its own path — most likely
assigning a driver directly into `assigned` rather than passing through
`broadcasted` at all — which is a real design decision (who gets picked, does
it prompt a driver picker), not a one-line fix, so it's reported rather than
guessed at here.

**"Mark as Pending" (Update Status) doesn't free the driver, and can silently
drop broadcast history.** `updateOrderStatus`'s terminal-state driver release
only covers `delivered`/`cancelled`/`returned` — `pending` isn't in that list,
so marking an Assigned+ order back to Pending leaves `driverId` set and the
driver permanently `busy`, unreachable for new work. Separately,
`resolveBroadcastState`'s `pending` branch reads `wasBroadcast = broadcastCapable
&& (status === 'broadcasted' || !!order.batchId)` — a **broadcast**-dispatched
order keeps its `batchId` and correctly resolves to `exhausted` (history
preserved), but a **manually**-dispatched order (no `batchId`) resolves to
`on-hold`, i.e. a fresh countdown as if it had never been touched — losing the
fact that a driver already tried and failed. Doc 1's Update Status spec (v2.8,
§10.1/§12.5–§12.9) doesn't currently say what should reset on this
transition; worth a ruling before fixing.

### 9.3 Verified correct

- **Every §4 status row's Overview main/sub copy** (`detailModel.ts`) matches
  the matrix text verbatim, including the exhausted-pending and profile-B
  Pending variants.
- **`scheduledOrigin`** (`dispatchNarrative.ts`) implements §1.3's rule exactly:
  `scheduledOriginFor(order) && !(status === 'pending' && config.autoBroadcast)`.
- **The Broadcast provenance icon** (`BROADCAST_ICON_ELIGIBLE`) excludes
  `pending`/`scheduled`/`broadcasted`/`returned` exactly per Invariant #2 — this
  directly answers the question that opened this audit: **no, the icon does
  not reappear or persist once an order is back in Pending, even if a driver
  had already accepted it.** The icon is a pure function of current status; it
  has no memory.
- **Profile C's isolation** — `fleetType` has zero references in
  `detailModel.ts` / `activityModel.ts` / `dispatchNarrative.ts`; only
  `broadcastModel.ts` reads it. §6's "Overview / Activity identical to profile
  A" claim holds structurally, not by coincidence.

## Revision history

| Version | Date | Changes |
|---|---|---|
| 1.1 | 2026-08-07 | §8 SLA item corrected to reflect the Admin module's now-editable `client.config.sla` (§8's OFT-derivation nuance); Order Edited and Dispatcher Activity (Return Order) built, §8 items resolved, new §8a documents how real edit/return history merges into the synthesized trail. New §9 re-audit: the `broadcastModel.ts` title/timeline bug fixed; two new confirmed-but-unfixed gaps reported (manual Dispatch bypassing `broadcastCapable`; Mark as Pending not freeing the driver / dropping manual-dispatch history) |
| 1.0 | 2026-08-04 | Initial matrix, derived from the shipped implementation |
