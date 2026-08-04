# Table Column Layout Specification

> **Leta · Design System · Dispatcher Platform**
> How columns are classified, sized, prioritised, and shrunk — so every table in the platform behaves the same way.

> **How to read this document**
> **Part I — The Table System** defines the rules every table obeys: classification, the width model, floors, shrink behaviour, and priority.
> **Part II — Table Instances** declares individual tables (Order, Unassigned, All, User Management) against that system. Each instance only states its columns and widths.
> Adding or changing a table means writing a new instance — not redesigning the system.

---

# Part I — The Table System

## 1. Philosophy

- Tables optimise for information density and scanability, not visual symmetry.
- Column widths reflect the importance of their content, not equal distribution. A Driver, Route, or Recipient column needs more horizontal room than a Status badge or a timestamp.
- The aim is to show the most useful information without forcing excessive truncation.
- **Never make all columns equal width.**

## 2. Column Classification

Every column belongs to one of five categories.

| Category | Role | Examples |
|---|---|---|
| **1 · Primary** | Identifies the record; scanned first. Often multi-line, may host inline actions. Receives remaining width and expands by weight. | Driver, Recipient, Route, Customer, Vehicle, Company, User (Created By) |
| **2 · Primary Identifier** | Uniquely identifies the record but gains nothing from growing wider. Copied, searched, or clicked. Truncates safely. Fixed width by default. | Order ID, Trip ID, Batch ID, Invoice No., Tracking No. |
| **3 · Secondary** | Adds context without being the focus. Predictable length. Fixed width. | Depot, Service Type, Region, Vehicle Type |
| **4 · Utility** | Metadata or status. Small; sized to content. Fixed width. | Status, Priority, Delay, Duration, Created, Updated |
| **5 · Control** | Interactions, not information. Smallest columns; fixed width. The control column carries no header. | Checkbox, Expand, Overflow, Action buttons, Dispatch |

> **One exception for identifiers.** A Primary Identifier may be promoted to a **low-weight flexible** column in a specific instance (§3.3). Its floor plus its deliberately low weight are the governor — it can never starve the priority columns, because their floors are satisfied first and their higher weights always win the surplus. *(Revised 2026-07-05: this exception previously imposed a hard max — "bounded flexible". The cap was removed after wide-monitor review: it produced IDs truncating beside visibly free space, and the weight system already provides the protection the cap was for.)*

## 2.1 Control-column width scale *(added 2026-07-06)*

Control (Actions) column width derives from the **content the cell carries**, not from the view or instance it appears in — the same buttons cost the same width everywhere on the platform:

| Cell content | Width |
|---|---|
| Icon-only button (e.g. overflow ⋯) | 64px |
| Labelled button (e.g. "View Logs") | 126px |
| Labelled button + icon-only button (e.g. Dispatch + ⋯) | 154px |

An instance declares which content its rows carry; the width follows from this scale. New tables inherit widths for free.

> **Shipped 2026-07-09:** the Order Table's Delivered/Cancelled (Finished) rows render a single "View Logs" button with no ⋯ menu — `ORDER_TABLE_COLUMNS_FINISHED` (126px, `ACTIONS_VIEW_LOGS`), distinct from every other dispatched state which stays on `ORDER_TABLE_COLUMNS` (64px, `ACTIONS_OVERFLOW`).

## 2.2 Created By cell — human vs automated source *(added 2026-07-06)*

The Created By (User) cell has two variants, same two-line shape so the column reads evenly:

| Variant | Avatar | Line 1 (14px semibold) | Line 2 (14px regular, muted) |
|---|---|---|---|
| Human creator | Initials/photo | Full name | Email (truncates) |
| Storefront order | Neutral system avatar + glyph | Auto-created | From online store |
| API order | Neutral system avatar + glyph | Auto-created | From connected app |

Line 1 stays "Auto-created" for both automated sources so the scan-answer (a person did not create this) is identical and instant; Line 2 carries the channel in plain language for non-technical dispatchers. The automated variant does not alter the ~200px floor. Sorting and the Created By filter still treat Storefront and API as distinct first-class values.

> **Shipped 2026-07-09:** renders via two Cell types — `user-cell` (human) and `api-cell` (Storefront/API). Both automated sources use the **same** Featured Icon (`api-cell`'s default `apiIcon="Integration"`) — only the subtext (`apiSubtext`) names the channel ("From online store" vs "From connected app"); the glyph never varies.

## 2.3 SLA-state indicators on Status and Duration *(added 2026-07-09; corrected 2026-07-09 — in-progress vs completed orders behave differently, see below)*

The Status and Duration cells react to the order's SLA state (defined in Doc 4 — SLA & Fulfilment-Time Specification, §3) — but the mechanism and the state set both change once an order concludes, because **At Risk is a prediction about the future, and a completed order has no future left to predict.** In-progress orders get a three-state signal doubled across two cells; completed orders get a binary outcome shown once, in one cell.

### 2.3.1 In-progress orders (Instance A: Assigned/At Depot/In Transit/Arrived/Returning; Instance B: Pending/Broadcasted) — three states, two cells

| SLA state | Status cell | Duration cell |
|---|---|---|
| On-Time | No added icon | Default text color |
| **At Risk** | Orange warning icon, trailing edge of the badge | `text/warning` color token applied to the duration label |
| **Delayed** | Red error icon, trailing edge of the badge | `text/error` color token applied to the duration label |

### 2.3.2 Completed orders (Instance A: Delivered, Cancelled) — binary outcome, Duration cell only

- **Status cell carries no trailing icon at all** — not for either outcome. The order is finished; there's nothing left to flag on the identity read.
- **Duration cell becomes a self-contained icon + label badge** (not a text-color change): a circular status icon beside the duration, both in the outcome's color, using the `text/disabled/label` color variable for the label text.

| Outcome | Trigger | Duration cell |
|---|---|---|
| **Within OFT** | Actual fulfilment time ≤ Expected OFT | Green check-circle icon + duration label |
| **Beyond OFT** | Actual fulfilment time > Expected OFT | Red error-circle icon + duration label |

Only two outcomes exist here — On-Time or Delayed — because At Risk cannot apply retroactively to a finished order.

Neither 2.3.1 nor 2.3.2 applies where Duration is absent entirely (Scheduled, Returned — no running or concluded SLA to show). See Instance A/B column notes.

## 2.4 Distance column *(added 2026-08-04)*

**Present on every order table**, in every status view — dispatchers use depot → drop-off distance to plan routes, decide whom to assign, and judge fulfilment feasibility. It is **not** an optional toggle like Last Updated or Created By.

| Property | Value |
|---|---|
| Category | **Utility** — fixed width, never flexible |
| Width | **90px** |
| Position | After **Recipient**, before **Duration** |
| Cell value | `"{n.n} Km"` — one decimal (e.g. `"4.2 Km"`) |
| Sort | Numeric dimension: **Low to High** / **High to Low** |

**Why 90px and not narrower:** the *header word* sets the width, not the value — `"Distance"` needs ~70px + 12px padding each side, while `"12.4 Km"` is far narrower. 90px is the minimum that renders the header without truncating.

**Position rationale:** placing it after Recipient keeps the three flexible primaries (Driver · Route · Recipient) contiguous and groups Distance with the other fixed fulfilment metrics (Duration, Created), so the fixed/flexible blocking stays clean. It is *not* placed beside Route (its semantic pair) because a fixed column mid-block splits the flexible group.

**Value must derive from the same coordinates the map draws.** Distance is computed from the order's own pickup/drop-off coordinates (great-circle × a road factor), never from an independent source — otherwise the column and the route drawn in the order-detail map can disagree about the same trip.

### 2.4.1 Accepted consequence — the two densest views scroll

Adding a fixed 90px column raises **every** table's minimum width by 90, which pushes two shapes past the 1320px design canvas:

| View | Min before | Min with Distance | At the 1320 canvas |
|---|---|---|---|
| Scheduled / Returned | 986 | 1076 | flex-fills |
| Pending | 1096 | 1186 | flex-fills |
| Broadcasted | 1186 | 1276 | flex-fills |
| All | 890 | 980 | flex-fills |
| **Dispatched** (Instance A) | 1256 | **1346** | **horizontal scroll** |
| **Finished** | 1266 | **1356** | **horizontal scroll** |

This is **accepted, not a defect** (ruled 2026-08-04): §4.3 already chose scroll-with-pinned-anchors over column-dropping precisely for this, so the dispatched and finished views scroll below their minimums with Order ID pinned left and Actions pinned right.

**Reducing the flexible floors to avoid the scroll was explicitly rejected** — the Recipient floor exists so the recipient phone never truncates (§6), so trimming it to buy 26px would violate a higher-priority rule.

> **Shipped 2026-08-04** — `DISTANCE` in `columnPresets.ts` (`{ label: 'Distance', role: 'utility', width: 90 }`), spliced after Recipient in all six order presets; `distanceKmFor` / `distanceLabelFor` derive from `order.pickup`/`order.dropoff` (the same coordinates `OrderDetailMap` uses); `Distance` added to the `DesktopDropdowns` default sort options with Low-to-High / High-to-Low. Verified live: header cell measures exactly 90px, values span 0.2–16.9 Km, both sort directions order correctly, and the dispatched view enters scroll mode (scrollWidth 1401 > clientWidth 1158) with Actions pinned.

> **Shipped 2026-07-09** (verified against wireframe rows `1295:89475` / `1295:89501` / `1295:95052` / `1295:94737` / `1295:93661`):
> - **§2.3.1** — `Cell` gained `statusIcon?: 'warning' | 'error'`: a trailing 16px filled `Icon/Warning` (`--icons-warning-default`) / `Icon/Error` (`--icons-error-default`) after the badge at the cell's 8px gap. Duration renders `DurationLabel variant="active"` — the `status` prop colors the time (`on-target` → `--text-default-label`, `at-risk` → `--text-warning-label`, `delayed` → `--text-error-label`).
> - **§2.3.2** — exactly the pre-existing `DurationLabel variant="finished"`: `Icon/Check-Circle` (`--icons-success-default`) for Within OFT, `Icon/Cancel-Circle` (`--icons-error-default`) for Beyond OFT, time always `--text-disabled-label`. Status cell gets no `statusIcon`.
> - SLA values are mock/deterministic in the playground until the Configuration spec (Doc 2) lands.

## 3. Width Model

### 3.1 Fixed vs flexible

- **Fixed columns** have predictable content width and hold it regardless of screen size (checkbox, identifiers by default, Duration, Created, Status, Actions).
- **Flexible columns** carry the primary information and share all remaining width after the fixed columns are allocated. Never give these fixed pixel widths — distribute by weight.

### 3.2 Flexible weighting

- Assign weight to the **flexible space only**, not to the whole table.
- The percentage split is the source of truth; weights are the same ratio expressed for `flex-grow` or grid `fr` units, with Recipient as the 1.00 base.

| Primary flexible column | Share | Weight (Recipient = 1.00) |
|---|---|---|
| Route | 40% | 1.48 |
| Driver | 33% | 1.22 |
| Recipient | 27% | 1.00 |

If a primary flexible column is removed, redistribute its share **proportionally** across the survivors (see Instance B).

### 3.3 Low-weight flexible identifiers *(revised 2026-07-05 — formerly "Bounded flexible columns")*

An identifier can flex with a **floor and a deliberately low weight** so it looks balanced beside the primary columns without competing with them for width.

- Sits at its **floor** on constrained screens.
- Grows slowly (low weight) once every primary floor is satisfied — the primaries always gain more from the same surplus (Route gains ~3× at the confirmed weights).
- **No hard max.** On wide viewports it keeps its small proportional share, eventually rendering long IDs without truncation. The low weight is the governor; a cap is not needed to protect the primaries and only manufactures truncation beside free space.

Applied to **Order ID** in the Order Table: min 150px, weight 0.5 (vs Route 1.48 / Driver 1.22 / Recipient 1.00).

The same low-weight technique sizes the optional **Created By (User)** column (§ instances): a Primary *content* column — not an identifier — deliberately given a low weight (0.5) and a ~200px floor, so that when the user toggles it on it takes only a small share of the surplus and never outcompetes Route/Recipient. No cap; on wide viewports it grows enough to show the full name + email.

> **History.** Through 2026-07-04 this section specified a min–max band (150–224px) with surplus past the max ceded to Route. Wide-monitor review showed the cap forcing ellipsis on ~25–30-char IDs while Route held conspicuous empty space — the cap was removed; floors + weights alone provide the balance the band was designed for.

### 3.4 Minimum widths (floors)

Every flexible column has a floor: the smallest width that avoids truncating its protected content. Base the name portion of a floor on a representative-long name (about the p90 length), not the longest name that could ever occur — otherwise every row pays for one outlier.

| Column | Floor is set by | Protected content |
|---|---|---|
| Driver | Avatar + name + inline actions | Avatar and name; phone is a call action, not text |
| Recipient | Name + full phone | Name and full phone — must not truncate |
| Route | Stacked composite (see 3.5) | Enough of each line to distinguish locations |
| Order ID | 150px (also its low-weight-flex floor) | ~18–24 visible characters at the floor |
| Created By (User) | Avatar + name + email | ~200px — the avatar, a p90-length name, and enough of the email to be useful |

### 3.5 Route is a composite cell

Route is not a single line of text. It stacks the **depot** and **pickup** with a connecting line, plus the drop-off. This is why **Depot is not a separate column** in the Order Table — it lives inside the Route cell. Size Route as a stacked block; sized as one line, its floor comes out too low.

## 4. Allocation & Responsive Behaviour

### 4.1 Allocation order

Space is handed out in this order:

1. Give every **fixed** column its set width.
2. Satisfy every **flexible floor**, including the identifier's floor.
3. Distribute surplus among all **flexible** columns by weight — the low-weight identifier grows slowly, the primaries take the lion's share (§3.3).

### 4.2 On shrink — freeze & redistribute

- Flexible columns shrink proportionally.
- When a column reaches its floor it **freezes**; the remaining shrink redistributes across the columns still above their floors.
- Recipient carries the strictest rule (full phone) and the smallest share, so it reaches its floor first, freezes, and forces Route and Driver to absorb the rest.

### 4.3 When the table doesn't fit — horizontal scroll

The table's **minimum width** is the sum of its fixed columns, its flexible floors, and any optional column the user has switched on. Behaviour follows the viewport against that minimum:

- **Viewport at or above the minimum:** flexible columns absorb the surplus by weight (§4.1). No scroll.
- **Viewport shrinking toward the minimum:** flexible columns shrink proportionally and freeze at their floors (§4.2). Still no scroll.
- **Viewport below the minimum:** the table **scrolls horizontally.**

Two things push the viewport below the minimum, and both resolve the same way — one behaviour, two triggers: the user **narrows the browser window**, or the user **switches on an optional column** (Last Updated or Created By — either raises the minimum above the current width). Turning one on only scrolls when the flexible columns, already at their floors, cannot make room for it.

When the table scrolls, **pin the anchors**: Order ID fixed on the left, Actions fixed on the right. Pinning is per instance — the All view has no Actions column, so it pins Order ID only. Scroll **replaces column-dropping**: no column is hidden, only scrolled to, and the pinned Order ID keeps every row identifiable while the middle scrolls.

### 4.4 Wide viewports — scale the design *(confirmed 2026-07-04)*

The allocation in §4.1 governs widths **up to the design width** — the 1320px content canvas the instances are declared at (1440 screen − 72 collapsed sidebar − 48 page padding). Beyond it, handing every surplus pixel to the primary columns stops serving balance: on a sparse instance (All — two primaries) the primaries balloon and the row degrades into content islands separated by voids, with too much empty space between the elements of a row. So past the design width **the approved layout scales instead of stretching its primaries**:

- Re-derive each column's **design width** by running §4.1 at 1320.
- Distribute the full available width across all **information columns** (primary, primary-identifier, secondary, utility) **proportionally to those design widths** — the table renders as the approved design, scaled.
- **Control columns** (checkbox, actions) never scale — interactions gain nothing from width.
- A **low-weight identifier scales with the rest** (§3.3): its design width is small (low weight), so its proportional share of a wide viewport stays small — but it does grow, un-truncating long IDs. *(Revised 2026-07-05: previously the identifier held its 224px max here and ceded its share to the other information columns.)*
- No information column ever renders below its design width in this mode; there is still **no dead gap**.

One rule below the design width (shrink → freeze → scroll, §4.2–4.3), one above (scale). The two agree exactly **at** the design width, so the handoff is seamless.

## 5. Two Priority Lists

Width Allocation (§5.1) is the active rule — it decides which flexible columns get surplus space. The Column-Drop Order (§5.2) is reference-only now that scroll (§4.3) handles overflow; it is kept for instances that opt out of scroll.

### 5.1 Width Allocation Priority

Which columns receive surplus width, in order. **Flexible columns only** — fixed columns do not negotiate for space.

| # | Column | Why |
|---|---|---|
| 1 | Route | Longest and most variable content |
| 2 | Driver | Avatar, name, phone |
| 3 | Recipient | Name and protected phone |
| 4 | Order ID (low weight) | Grows slowly by its low weight, after the primary floors |
| 5 | Created By (User) | Optional column; lowest priority — a deliberately low weight (0.5), only present when toggled on |

### 5.2 Column-Drop Order (reference)

Superseded by horizontal scroll (§4.3) as the overflow behaviour — columns are not dropped by default. This priority is retained only if a specific instance opts out of scroll and hides its lowest-value columns instead. Runs opposite to allocation.

- **Drop first:** Secondary columns — Depot, Service Type, Region.
- **Then:** lower-priority Utility columns.
- **Never drop:** Status, Checkbox, Actions.

## 6. Truncation Rules

**Route** — preserve enough of each stacked line to tell locations apart.

| | Example |
|---|---|
| **GOOD** | `Arc Kitisuru Depot` / `3B Mango Lane, Kilimani…` |
| **AVOID** | `Arc…` / `3B…` |

- **Driver** — always show avatar and name. The phone is a call button, not displayed text.
- **Recipient** — always show name. Phone must not truncate.
- **Order ID** — on constrained viewports, show ~18–24 characters before ellipsis; full value via copy, tooltip, or detail view. Example: `v3q2k2-j2k2k2-qPR…`. On wide viewports the column grows past this (§3.3, §4.4) and long IDs render in full.
- **Created By (User)** — always show the avatar (the user's photo, or an empty-teal avatar carrying their initials) and the user's name; the email may truncate with ellipsis.

## 7. Interaction Model

Two table types, distinguished by whether the row is a target.

| Type | Row behaviour | States |
|---|---|---|
| Static (e.g. Logs) | Read-only. The row is not clickable. | No hover, no pressed |
| Dynamic (e.g. Orders) | Clicking the row opens the record drawer. | Hover + pressed |

Inside a dynamic table:

- The **checkbox column is the only selection target** — clicking it selects the row; it does not open the drawer.
- **Inline buttons within a cell** (copy in the Order ID cell, change-driver) act independently of the row and **must stop event propagation**, so a mis-aimed tap never opens the drawer.

> Recommendation (not yet locked): because hover is the main signifier of a clickable row and hover does not exist on touch, dynamic rows should also carry a persistent affordance — a cursor change plus a trailing signifier — so clickability never depends on a mouse-over. Relevant for the 50+ PBL dispatchers.

## 8. General Rules

- Never distribute all columns evenly.
- Allocate space by information density.
- Fixed columns are only as wide as their content requires.
- Flexible columns absorb all remaining space.
- Route is always the widest flexible column.
- Keep column widths consistent across similar tables to reduce layout shift.
- Showing or hiding a column must not require redesigning the table — that is why the system and its instances are kept separate.
- The action / control column carries **no visible header label** — the icons already read as interactive, and a label only adds noise. The header cell still exists with a screen-reader-only accessible name (e.g. "Actions"), so the column is never announced as empty. Same for the checkbox column.
- Balance comes from important information having room to breathe, not from equal widths.

## 9. Implementation Rules

1. Classify every column: Primary, Primary Identifier, Secondary, Utility, Control.
2. Assign fixed widths to all non-primary columns, unless an instance promotes an identifier to low-weight flex (§3.3).
3. Allocate remaining width among the flexible columns by weight; a low-weight identifier grows slowly, the primaries take the lion's share.
4. Use weighted distribution, never equal widths.
5. Satisfy floors before distributing surplus. On shrink, freeze a column at its floor and redistribute (§4.2).
6. If a primary flexible column is removed, redistribute its share proportionally among the survivors.
7. Keep widths consistent across similar table types.
8. Inline cell actions stop propagation; the checkbox is the only selection target.

---

# Part II — Table Instances

Each instance declares its columns against the system in Part I, **in display order (left to right)**. This list is the contract an implementation can diff against.

> **Created By (User) — optional, on every Order-family instance (A / B / C).** Off by default; toggled from the Columns control; spliced **between Last Updated and Status**. It renders the **User cell** — an avatar (the user's photo, or an empty-teal avatar carrying their initials) + the user's name + their email. Sized as a **low-weight Primary** column (weight 0.5, ~200px floor, no cap — §3.3), so it never outcompetes Route/Recipient; toggling it on raises the table minimum and can trigger horizontal scroll (§4.3). It is listed in each instance's column table below.

## A. Order Table — dispatched & finished states

The full-column shape, used for any state where a driver and a trip exist: Assigned, At Depot, In Transit, Arrived, **Returning**, Delivered, Cancelled. *(Returned does **not** belong here — it has no driver or trip; see Instance B. Returning ≠ Returned: Returning is the in-motion Dispatched-group status, still driver/trip-bearing.)*

| Column (in order) | Width | Notes |
|---|---|---|
| Checkbox | 52px | Selection target. **Dispatched states only** — **dropped for Delivered/Cancelled** (see below) |
| Order ID | 150px+ flex 0.5 | Low-weight flexible (§3.3, no cap); pinned left on scroll |
| Trip | 90px | Primary Identifier |
| Driver | flex 33% | Primary flexible |
| Route | flex 40% | Primary flexible; always widest |
| Recipient | flex 27% | Primary flexible |
| Duration | 110px | Text-colored per §2.3.1 for in-progress rows (Assigned/At Depot/In Transit/Arrived/Returning); becomes an icon+label outcome badge per §2.3.2 for Delivered/Cancelled |
| Created | 120px | Shown by default |
| Last Updated | 120px | Toggle — off by default |
| Created By | 200px+ flex 0.5 | Toggle — off by default; low-weight flexible Primary (§3.3), floor ~200, no cap; renders the User cell (avatar + name + email) |
| Status | 140px | Trailing SLA icon when At Risk/Delayed, **in-progress rows only** (§2.3.1). **No icon on Delivered/Cancelled** (§2.3.2) |
| Actions | per §2.1 | ⋯ only (64px) for Assigned/At Depot/In Transit/Arrived/Returning; single labelled **View Logs** button (126px) for Delivered and Cancelled — no ⋯ menu in those views. No header; pinned right on scroll |

- **Delivered/Cancelled drop the Checkbox column (ruled 2026-07-09).** The two terminal states carry **no bulk actions** — there is nothing to select a finished order *for* — so like the All view (§C) they omit the Checkbox entirely. This is the same "no selection target on a read-only-outcome row" reasoning. So Instance A is really two width shapes that share a column *order*: the **10-column dispatched shape** (with Checkbox, Actions 64) and the **9-column finished shape** (no Checkbox, Actions 126 — see below). At the 1320 design canvas the finished shape resolves to **Order ID 156 · Trip 90 · Driver 176 · Route 219 · Recipient 183 · Duration 110 · Created 120 · Status 140 · Actions 126** (floors-first, surplus by weight; Route widest). Code: consume `ORDER_TABLE_COLUMNS_FINISHED` with `<Table selectable={false}>`.
- **Actions width follows the content scale (§2.1):** 64px where rows carry only ⋯; 126px for the Delivered and Cancelled views (single labelled View Logs button); 154px in Instance B (Dispatch + ⋯).
- **Depot is shown inside the Route cell**, not as its own column.

> **Worked example (assumptions stated).** 1440px screen, sidebar ~240px → content ~1200px. Fixed budget ≈ 576px (Last Updated off, Actions 64px). Remaining ~624px across Order ID + Route + Driver + Recipient. Order ID sits near its 150px floor when constrained → Route ≈ 190px, Driver ≈ 156px, Recipient ≈ 128px. On 1920px, Order ID grows by its 0.5 weight toward ~240px+ (enough for a full ~30-char ID) while Route ≈ 350px+ — the primaries still take the lion's share of the surplus. The 64px Actions column (down from 154px) is what buys Route its breathing room on dense laptops.

## B. Unassigned Orders Table (Scheduled, Pending, Broadcasted, Returned)

An unassigned order has no driver and no trip, so **both columns are removed** — not shown empty, removed. Actions is wider here because the row carries a Dispatch button.

> **Why Returned lives here (inlined rule, ruled 2026-07-07):** Returned is not a true terminal state — it's a pseudo-terminal holding bay. A returned order is functionally a fresh order awaiting redispatch, carrying the history of a failed attempt: no current driver, no current trip, and its fulfilment-time counter **resets to 0s** the moment it returns (the prior attempt is preserved separately as "Prev: {duration}," not carried in the live Duration cell). Because it has neither driver, trip, nor a running duration, it takes the Unassigned shape, not the driver/trip shape. Its detail-view footer carries the full Unassigned action set (Dispatch, Add to Trip, Edit, Cancel), which is why its Actions column matches every other B view at 154px, not the 64px overflow-only width used where a driver/trip already exists.

| Column (in order) | Width | Notes |
|---|---|---|
| Checkbox | 52px | Selection target |
| Order ID | 150px+ flex 0.5 | Low-weight flexible (§3.3, no cap); pinned left on scroll |
| Batch ID | 90px | Broadcasted view only |
| Route | flex 60% | Primary flexible; always widest |
| Recipient | flex 40% | Primary flexible |
| Duration | 110px | Pending & Broadcasted only; absent for Scheduled (not yet queued) and Returned (counter resets on return, see rule above) |
| Created | 120px | Shown by default |
| Last Updated | 120px | Toggle — off by default |
| Created By | 200px+ flex 0.5 | Toggle — off by default; low-weight flexible Primary (§3.3), floor ~200, no cap; renders the User cell (avatar + name + email) |
| Status | 140px | Trailing SLA icon when At Risk/Delayed (§2.3.1) — Pending and Broadcasted rows only; Scheduled/Returned have no running SLA to flag |
| Actions | 154px | Dispatch + overflow; pinned right on scroll |

Route/Recipient are re-weighted **60 / 40** — Driver's 33-point share redistributed proportionally per Rule 6. The four views differ only as below:

| View | Vs the full set above | Flexible split |
|---|---|---|
| Pending | no Batch ID | Route 60% · Recipient 40% |
| Broadcasted | Batch ID present | Route 60% · Recipient 40% |
| Scheduled | no Batch ID, no Duration | Route 60% · Recipient 40% |
| Returned | no Batch ID, no Duration | Route 60% · Recipient 40% |

> **Shipped:** one shared preset — `SCHEDULED_ORDER_COLUMNS` covers both Scheduled and Returned (identical shape), not a separately named `RETURNED_ORDER_COLUMNS` constant (a naming/DRY choice, not a functional gap).

## C. All — search / triage view

Its job: the dispatcher does not know which group an order is in, so they open **All** (which collapses the sub-status dropdowns) and search. The primary interaction is search plus the Status column — not the columns themselves.

| Column (in order) | Width | Notes |
|---|---|---|
| Order ID | 150px+ flex 0.5 | Low-weight flexible (§3.3, no cap); pinned left on scroll; the row you searched for |
| Route | flex 60% | Primary flexible; always widest |
| Recipient | flex 40% | Primary flexible |
| Duration | 110px | "—" for Scheduled rows |
| Created | 120px | Shown by default |
| Last Updated | 120px | Toggle — off by default |
| Created By | 200px+ flex 0.5 | Toggle — off by default; low-weight flexible Primary (§3.3), floor ~200, no cap; renders the User cell (avatar + name + email) |
| Status | 140px | The anchor column that makes a mixed list legible |

- **Absent:** Checkbox, Driver, Trip, Batch ID, Actions.
- **No Actions column** — every row opens the drawer on click, and the drawer footer carries the status-appropriate actions. This is why heterogeneous inline actions don't need to reconcile.
- **No Checkbox** — no bulk actions across mixed statuses.
- On scroll, pin **Order ID only** (there is no Actions column to pin).

## D. User Management Table — illustrative

Included to show the system generalises beyond orders. Here there is no Route cell, so **Depot appears as its own Secondary fixed column**. Columns to be finalised when this table is specced.

| Column | Category |
|---|---|
| Checkbox | Control |
| User | Primary flexible |
| Role | Secondary |
| Depot | Secondary |
| Status | Utility |
| Actions | Control |

## E. Modal / embedded tables

A table inside a modal, drawer, or panel (e.g. the broadcast-to-drivers dialog) carries a **reduced column set** — fewer columns, focused on the data relevant to that context. It does **not** replicate the full page-table columns. But it obeys the **same System rules** (Part I) at its own content width:

- **Reduce, don't redesign.** Drop the columns that context doesn't need; keep the survivors classified as they were (Primary flexible / Identifier / Utility / Control). Never add columns to match a page table, and never fall back to equal widths.
- **Same width model at the modal's width.** Sum the fixed columns; the primary columns share the remainder by the same weights (Route widest); apply the same floors and the low-weight Order ID model (§3.3). Resolve the flex to the modal's content width (e.g. 736px), not the page's ~1320px.
- **Order of significance holds.** Route → Driver → Recipient → Order ID → Secondary → Utility → Control (§5.1). No dead gap on the right — the primary columns absorb the surplus.
- **Static wireframe caveat.** Because Figma auto-layout can't express weighted fill, the modal wireframe realises "weighted, no gap" as **computed FIXED px that sum to the modal content width**; in code it's still `flex` weights on the primary columns.

The takeaway: a modal table is the same system at a smaller width with fewer columns — not a special case.

---

*Order ID is low-weight flexible with a 150px floor and no cap (§3.3, revised 2026-07-05); the Driver cell exposes the phone as a call action, not text (§3.4, §6). Returned is Instance B's fourth view, not Instance A (§B, ruled 2026-07-07 — see the inlined rule for why). Status/Duration carry SLA-state indicators per §2.3, split between in-progress (§2.3.1, three-state, both cells) and completed (§2.3.2, binary, Duration-only) orders (2026-07-09). Delivered/Cancelled drop the Checkbox (§A, ruled 2026-07-09 — terminal, no bulk actions). All decisions in this document are confirmed in review.*

**Revision note (2026-07-09):** consolidation pass against an agent-held copy surfaced and corrected: Returned incorrectly still listed under Instance A (intro sentence + Actions row) — removed, now Instance B-only with 154px Actions (not 64px); Returning was missing entirely from Instance A — added (Returning ≠ Returned: Returning is the in-motion Dispatched-group status, still driver/trip-bearing); external "OM spec" citations for the Returned rule and SLA-reset rule inlined so this document is self-contained; new §2.3 added for the Status/Duration SLA-indicator correlation, previously undocumented in any spec.

**Revision note (2026-07-09, later):** Figma table-parity audit ruled and applied — Delivered/Cancelled (Finished) tables **drop the Checkbox column** (terminal, no bulk actions; matches the All view's reasoning) and their widths were corrected to the 9-column finished shape at 1320 (Order ID 156 · Trip 90 · Driver 176 · Route 219 · Recipient 183 · Duration 110 · Created 120 · Status 140 · Actions 126). Every other Order Table already matched spec. Code: playground Finished tab now renders `<Table selectable={false}>`; `ORDER_TABLE_COLUMNS_FINISHED` JSDoc documents the no-checkbox contract. **This document is now the authoritative source of truth for the table column layout** (ahead of the design-copilot copy).
