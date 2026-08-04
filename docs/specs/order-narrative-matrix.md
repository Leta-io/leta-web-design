# Order Narrative Matrix — Overview × Activity × Dispatch Logs

> **Leta · Dispatcher Platform**
> The authoritative cross-tab behaviour reference for the View Order drawer. Every row states what **all three tabs** show for one (client type × depot config × order origin × status) combination, so no tab can be built or reviewed in isolation.
> **Status:** v1.0 — derived from the shipped implementation (2026-08-04), not aspirational.
> **Source of truth in code:** `apps/playground/src/lib/dispatchNarrative.ts` (the single provenance derivation) + `detailModel.ts` (Overview) + `activityModel.ts` (Activity) + `broadcastModel.ts` / `liveBroadcast.ts` (Dispatch Logs).

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

- **Real SLA stage clocks** await the Configuration spec (Doc 2). Duration and SLA state are currently deterministic mocks.
- **Activity "Order Edited"** variant exists in Figma (`1487:173235`) but is not emitted — no edit-history model yet.
- **`Dispatcher Activity (Return Order)`** ("{dispatcher} marked the order for return") is distinct from `Driver Activity (Failed)`; only the driver-failed path is currently emitted.
