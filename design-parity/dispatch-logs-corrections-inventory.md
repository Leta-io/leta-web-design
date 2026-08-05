# Dispatch Logs corrections — Figma inventory (2026-08-05)

Scanned via Desktop Bridge. Sources:
- `569:61920` — section "Broadcast Logs Tab components" (holds both component sets below)
- `569:61191` — **Broadcast Event Accordion** component set (Type × Size × State = 8 variants)
- `1707:120011` — **Driver Group Cards** component set (State × Type = 6 variants)
- `1707:121735` — **Content Card** instance: the *accepted-broadcast* timeline entry
- Wireframe screens: `526:52830` On Hold · `526:54608` Broadcasting · `536:59220` Completed ·
  `548:148566` Fallback · `552:57340` Exhausted · `548:150265` Manual ·
  `1728:124762` Manual (after exhausted)

---

## (a) Library components in use

| Region | Library component | Variant / properties in Figma | Code status |
|---|---|---|---|
| Accordion header chip | *(plain frame, not Desktop Chips)* | icon 16 + Label/M | ✓ matches |
| Filter row | `Desktop Chips` | All / bucket-1 / bucket-2 | ✓ `Chip` |
| Driver row | `Content Primitives` type=utility | Avatar 40, Title+Badge, Subtext, Passive + Interactive slots | ✓ |
| Row status badge | `Desktop Badges` | **no leading icon**, label only | ✓ |
| Row call button | `Desktop Button` | Secondary / Medium / Icon Only, `Icon/Phone-Outline` | ✓ |
| Accepted leg badge | `Desktop Badges` | leading **`Icon/Check`** (12×12, filled), label "Accepted" | ✗ code uses `Check-Circle` |
| Accepted driver row | **`Content Card`** (nested, 672×76) wrapping a `Content Primitives` | pad 16, radius 12, 1px `Border/neutral/default`, fill `Surface/neutral/bg-default` | ✗ code renders a bare `ContentPrimitives`, no card |
| Group-card metric rows | `Content Primitives` horizontal-list-row | leading icons `Timer-Outline` · **`Icon/Refresh`** · `Orders-Outline` · `Account-Outline` | ✗ Retries uses `Redo` |
| Group-card escalation | `Notification Banners` neutral/filled | `Icon/Info` | ✓ |
| Group-card live meta | `Icon/Loading` + text | spinner `Icons/information/default` | ✓ |

## (b) Ad-hoc (wireframe-local) components

| Name | Node | Note |
|---|---|---|
| Broadcast Event Accordion | `569:61191` | already built as `BroadcastEventAccordion.tsx` — added to registry this pass |
| Driver Group Cards | `1707:120011` | already built as `DriverGroupCard.tsx` — added to registry this pass |

## (c) Plain elements

Root wrapper (radius 8 `--rounding-lg`, 1px border) · Accordion Header
(H, gap 20, pad 12; fill `Surface/neutral/bg-subtle` idle → `bg-muted` hover; 1px bottom
border when Open) · header chip divider (1px vertical, 20 tall) · `Filters + Drivers List`
(V, gap 24, pad 16, fill `Surface/neutral/bg-default`) · `Filters` (H, gap 8) ·
`Drivers List` (V, gap 16) · per-row `Demarcator` VECTOR (1px full-width) ·
`Metadata Text` (H, gap 8, cross CENTER — **icon leads the text**).

---

## Findings that drive the four corrections

### (i) Sorting + live indicator — `569:61190` / `569:61192`

**Type=Active, Size=Open** (`569:61190`) — buckets *No response* / *Declined*:

| # | Driver | Badge | Metadata icon | Time |
|---|---|---|---|---|
| 1 | Ethan Mwangi | No response | **`Icon/Loading`** visible | 40s |
| 2 | Liam Otieno | No response | `Icon/Loading` visible | 40s |
| 3 | Ethan Karanja | No response | `Icon/Loading` visible | 40s |
| 4 | Liam Okoth | No response | `Icon/Loading` visible | 40s |
| 5 | John Mwangi | Declined | *hidden* | 33s |

**Type=Completed, Size=Open** (`569:61192`) — buckets *Timed out* / *Declined*:

| # | Driver | Badge | Metadata icon | Time |
|---|---|---|---|---|
| 1 | Liam Okoth | Timed out | *hidden* | 40s |
| 2 | John Mwangi | Timed out | *hidden* | 40s |
| 3 | Ethan Mwangi | Declined | *hidden* | 38s |
| 4 | Liam Otieno | Declined | *hidden* | 32s |
| 5 | Ethan Karanja | Declined | *hidden* | 30s |

Conclusions:
- **Sort = bucket first** (no-response / timed-out on top, declined at the bottom),
  **then duration descending** within each bucket (38 → 32 → 30).
- **Awaiting-response rows share ONE duration** (all 40s) = the elapsed time of the
  broadcast *to that leg*, not a per-row timer. Timed-out rows likewise share the leg's
  full run. Declined rows carry their own decline moment.
- The **spinner is `Icon/Loading` tinted `Icons/information/default`** (#0883ff) —
  identical to the Driver Group Card's live spinner. Only shown on **no-response**
  (still-awaiting) rows; hidden for declined and timed-out.
- Metadata text colour is **`Text/default/label idle`** (`--text-default-label-idle`),
  not `--text-default-sub-body`.
- Header chip icons: Active = `Clock-Outline` + `Cancel` (filled — `Cancel` has no
  outline glyph); Completed = `Hourglass-Outline` + `Cancel`.

### (ii) Retries icon — `1707:120008`

Leading icon is **`Icon/Refresh`** (filled; registry `outline: null`). Code has `Redo`.
The other three metric icons (`Timer-Outline`, `Orders-Outline`, `Account-Outline`) already
match. Nothing else in the group card drifted (geometry, badge, spinner, banner all match).

### (iii) Call-button gate — decisive cross-screen evidence

| Wireframe | Order has a driver? | Accordion | Passive / Interactive |
|---|---|---|---|
| Broadcasting `526:54608` | no | Active + Completed, Open | `PI` — **visible** |
| Exhausted `552:57340` | no | Completed, Open | `PI` — **visible** |
| Manual after exhausted `1728:124762` | **yes** (manual) | Completed, Open | `P-` — **hidden** |
| Completed `536:59220` | yes | all **Closed** (no rows shown) | — |

Exhausted and Manual-after-exhausted use the **same `Type=Completed` accordion** and differ
only in whether a driver is assigned. So `type === 'completed'` is **NOT** the gate — the gate
is **"the order already has a driver"**, i.e. `DispatchNarrative.method !== 'none'`. That maps
onto every data point above.

The **accepting driver's own row** inside `1707:121735` keeps its call button
(`Icon/Phone-Outline` visible) — you call the driver who took the job.

### (iv) Accepted-state Content Card — `1707:121735`

Outer `Content Card` 712×236, pad 20, Container SLOT vertical gap 16, three children:

1. `Content Primitives` (672×44) — "Suppliers [P2]" + Badge **`Icon/Check`** "Accepted",
   subtext "Ran for 20s · 6 drivers found", passive "9 Jun 2027, 12:01 PM",
   Interactive Elements hidden.
2. **`Content Card` (672×76, nested)** — pad 16, radius 12, 1px border, white fill —
   wrapping the accepting driver's `Content Primitives` (Avatar 40, "Peter Paka", phone,
   passive "5s", Interactive Elements = call button **visible**).
3. `Broadcast Event Accordion` — Type=Completed, Size=**Closed**.

Code deviations: badge icon (`Check-Circle` → `Check`) and the **missing nested Content Card**
around the accepting driver row.

---

## Decisions taken (2026-08-05)

| Conflict | Ruling |
|---|---|
| Escalation banner copy — Figma's "Escalates to X (P2) after Ns if the broadcast is unaccepted." vs the code's condition-first rewrite | **Keep the code, update Figma.** The rewrite was a deliberate earlier improvement; the copy was written into all 6 Driver Group Card variants via `setProperties` on their `Text#3811:3` banner property. Each variant keeps the branch it already illustrated (P1/P2 escalate, P3 re-runs from P1). *Playground file only — the Library was not touched, so no publish is needed.* |
| Timed-out row duration — Figma's mock shows 40s, but a 40s-window / 2-retry group's full course is 80s | **Full course (`acceptanceWindow × retries`).** Figma's 40s reads as mock data from a single-retry group. The leg's own "Ran for Ns" subtext now uses the same number, so a leg can never report a shorter run than the rows beneath it. |
| Escalation banner priority format — `(P2)` vs `[P2]` | **Bracket form `[P2]`**, matching the card titles and leg titles. Changed in the code (`escalationCopy`) *and* in the 4 escalating Figma variants. |
| Status-card prose sentences — `(P1)` vs `[P1]` | **Follow-up ruling (same session): unify onto brackets everywhere.** The file had carried a two-form convention (`[Pn]` for label/title text, `(Pn)` inside prose sentences) — the user asked to switch the remaining prose instances too. Fixed 3 more spots: `broadcastModel.ts`'s `completed`-state subtext ("accepted after the broadcast to X was unaccepted." / "accepted the broadcast at X.") now uses the leg title verbatim (which already carries brackets) instead of regex-rewriting it into parens; the Completed screen `536:59220`'s literal sentence ("…broadcast to In-house drivers (P1) was unaccepted.") via `Subtext#6961:9` on instance `1707:130820`; and the Broadcasting screen `526:54608`'s status-card title ("Broadcasting to In-house drivers (P1)") via `Text#6961:8` on instance `526:52844` — code already rendered this one with brackets, Figma's copy was just stale. A scoped `findAllWithCriteria` TEXT scan across the section + all 7 screens confirms zero `(Pd)` occurrences remain anywhere. |

## Bug found during verification (not in the original brief)

Declined rows **crept upward with the live clock** (6s → 8s → 13s), re-reporting "declined just
now" on every tick, because their moment was derived from `broadcastSeconds` — which for a live
leg *is* the ticking elapsed time. Two fixes, in order:

1. Anchor decline moments to the leg's **fixed** full course (`declineAnchor`), not the clock.
2. Clamping the anchor to `elapsed` still crept while `elapsed < anchor`. The honest model:
   a driver whose anchor is still in the future simply **hasn't answered yet** — they stay
   `no-response` until the clock reaches it, then flip to `declined` and freeze. Header counts
   are derived, so they follow automatically (a freshly-started leg correctly reads
   `Declined (0)`).

## Batched Orders drill-down — table fills its panel (2026-08-05, follow-up)

The embedded table grew to its content height, so the whole `ModalShell` body scrolled and the
**Pagination footer sat below the fold** — reachable only by scrolling past every row. Fixed to
the same model the main Orders table uses in `Page`: the body is pinned to the shell height and
never scrolls itself; the table `fillHeight`s into it and scrolls its rows internally, so
Pagination stays put.

- New **`BODY_TABLE`** style in `DispatchLogsDrillDowns.tsx` — `BODY` plus `height: 100%`,
  `boxSizing: border-box`, `minHeight: 0`, `overflow: hidden`, and bottom padding **16**
  (down from the list screens' 24) so the table stops short of the panel edge.
- `<Table … fillHeight>` on the Batched Orders table.
- **Deliberately NOT applied to the other two drill-downs.** Priority Driver Groups and
  Notified Drivers are card/row lists with no pagination — they should keep growing and
  scrolling the shell body, so they still use the unchanged `BODY` (verified: `overflow:
  visible`, pad `24px 16px`, shell body scrolls 846 → 1173).

**Bug this surfaced:** `Table`'s `countLabel` and `pageCount` default to *placeholder* values
(`'Showing 10 of 180'`, 10 pages) and this table never passed real ones — invisible while the
footer was off-screen, glaringly wrong the moment it wasn't. `Table` renders Pagination but does
**not** slice (the host owns paging, as `OrdersPage` does), so the screen now slices to
`BATCH_PAGE_SIZE` (10, matching the Orders default) and passes real `page` / `pageCount` /
`onPageChange` / `rowsPerPage` / `countLabel`. A narrowed search resets to page 1, and `current`
is clamped so a shrinking result set can't leave the view on an out-of-range page.

| Check | Result |
|---|---|
| Panel body padding | `24px 16px 16px` |
| Panel body scrolls itself | **no** (clientH 846 = scrollH 846) |
| Table rows scroll internally | yes — `leta-table-noscrollbar`, 647 visible / 809 content |
| Pagination fully visible | yes, 17px above the panel bottom (16 padding + 1px border) |
| Pagination content | "Showing 10 of 10", single page — was "Showing 10 of 180" over 10 pages |
| Header vs footer count | both read 10, previously contradicted each other |

## Live verification (playground, port 5180)

| Check | Result |
|---|---|
| Header chip order | `Timed out (2) \| Declined (3)` — timed-out first, matching `569:61192` |
| Sort | bucket first, then duration desc — e.g. `80s, 80s → 53s, 48s, 43s` |
| Timed-out = full course | 80s on a 40s × 2-retry group; 25s, 20s (pre-offer), 40s (fallback) elsewhere |
| Awaiting rows share the leg clock | leg subtext 10s → 14s, all four rows 10s → 14s in lockstep |
| Declines freeze | held at 21s while the leg clock ran on to 79s |
| Fresh leg | 5 × No response, `Declined (0)` — nobody's anchor passed yet |
| Spinner | `.leta-broadcast-spinner`, `rgb(8,131,255)` = `--icons-information-default`, 1s linear, **no-response rows only** |
| Call buttons — Exhausted (unassigned) | 37 rows / **37 buttons** |
| Call buttons — Completed (assigned) | 31 rows / **0 buttons**; the accepting driver keeps his |
| Accepted badge | 12px, 237-char tick path (plain `Check`, no circle arc) |
| Nested accepted card | 670×78, pad 16, radius 12, 1px `#e3e3e3`, bg `#fefefe` (Figma 672×76 ± the border-box vs outside-stroke difference) |
| Retries icon | rendered path matches the registry's `Refresh` glyph exactly |
