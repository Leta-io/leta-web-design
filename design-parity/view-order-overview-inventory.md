# View Order Drawer / Overview — wireframe inventory (node `320:99590`)

Scanned 2026-07-20 (figma-wireframe-parity Step 1). File `xVa4kZAArZWWvl6QsfID8S` (LETA Playground).
Sources: Dev-MCP metadata (full XML cached at scratchpad `view-order-metadata.xml`), bridge text-dumps
of all 12 drawers + all footer dropdowns/dialogs/expanded maps, screenshots of header / summary card /
Pickup From / footer / footer-⋯ (Scheduled Ov1), driver+trip cards, POD section, Returned More-Info,
expanded map (dispatched), Recipient Signature dialog.

## Screens (12 sections, one Large Modal drawer each, 768×2603)

| # | Section | Node (drawer) | Scenario |
|---|---|---|---|
| 1 | Scheduled Ov1 | 271:36342 | Scheduled, >60 min to broadcast (static date card); auto-created (online store) |
| 2 | Scheduled Ov2 | 516:62836 | Scheduled, ≤60 min (live "2 minutes until broadcast."); auto-created (connected app) |
| 3 | Pending Ov1 | 363:47940 | Pending, auto-broadcast client ≤60 min — "Order broadcasting soon" / "2 minutes to broadcast." |
| 4 | Pending Ov2 | 363:47090 | Pending, manual client — "Dispatch Now" / "Items ready for delivery." / Dispatch CTA; Payment = N/A variant (no Total) |
| 5 | Broadcasted | 1094:86647 | "Order broadcast started" / "10 seconds elapsed." / View Logs CTA |
| 6 | Assigned | 357:46171 | Auto-assign highlight banner; driver+trip cards; At Risk 27m20s |
| 7 | In Transit | 1094:89389 | Driver cards; Proof of Pickup row; no Pickup Code |
| 8 | Arrived | 1272:86622 | Same as In Transit, "Driver has arrived" |
| 9 | Returning | 1213:82967 | "Total fulfilment time"; "Est drop-off"; footer = Add Comment only |
| 10 | Delivered | 318:61697 | Delayed 50m20s; Proof of Delivery section (recipient details + POD image + signature); empty footer |
| 11 | Returned | 1213:84582 | 0s + "Prev: 30m 23s"; fresh-order shape (no driver/pickup-code/POP); More-Info banner + View Activity; footer = Ready set, ⋯ = Reschedule·Add Comment (matches OM v2.8) |
| 12 | Cancelled | 1237:86145 | Cancelled-after-assignment scenario (driver cards); empty footer |

Floating overlays in the section: 3 header-icon tooltips (Calendar → "Scheduled: 09 Jun 2027, 12:30 PM";
Integration → "Auto-create via online store"; Manual-Touch → "Created manually"); 3 Modal Dialog viewers
(Recipient Signature / Proof of Pickup / Proof of Delivery — image + Close); 2 Expanded mini map frames
(768×768): undispatched (banner "Dispatch now to generate a delivery route." + Dispatch CTA) and
dispatched (banner "Michael Kariuki is on the way to the depot." + View Activity; red route polyline,
depot + drop-off info cards, driver marker, MapZoomControl, collapse button top-right).

## Drawer anatomy (common skeleton)

1. **Modal Headers** — title = order ID (`test001-qPRQYUs-j2k2k2`), close ×; Secondary Content =
   Delivery badge (status) + provenance icons (Integration/Manual-Touch, Calendar when scheduled-origin;
   each with HoverTip) | Header CTAs: "Order ID" (copy, leading Copy icon) + "Tracking Link" (leading Link
   icon), both Secondary Small (32px); Page Tabs = Overview (active) · Activity · Dispatch Logs.
2. **Order Overview Card** (168 tall, bordered, split 368/368): left = mini map (MapView; depot pin +
   drop-off pin (+driver/route per state, §7.2 map matrix); expand button top-right 32×32 Secondary
   icon-only); right = SLA block ("Elapsed/Total fulfilment time" + ⓘ HoverTip; counter `Ns / 30m SLA`
   with elapsed **bold dark** + ` / 30m SLA` grey; optional SLA badge On-Time/At Risk/Delayed;
   Returned = grey "Prev: 30m 23s" badge) — divider — summary CP (main copy + sub copy + trailing CTA
   button, per §7.2 copy matrix; wireframe supersedes: Pending auto-bcast = "Order broadcasting soon" /
   "2 minutes to broadcast.").
3. **Pickup Code card** (76; Ready states + Assigned only) — Lock icon + "Pickup Code" / "Share with the
   driver at pickup" + 4 digit boxes (32×32, grey bg) + copy button (Plain icon-only 16).
4. **Driver + Trip Content Cards** (84; Assigned→Arrived, Returning, Delivered, Cancelled-after-assign) —
   card 1: Avatar + driver name + phone + trailing change-driver ↔ + call buttons (Secondary icon-only 32);
   card 2: Featured Icon (Proceed) + trip ID + "N orders" + trailing open ↗ (icon-only).
5. **Pickup From** List Section (136; collapsible) — Depot / Pickup address rows. From In Transit onward
   +Proof of Pickup row (thumb + "Image.png" + View button, 216 tall).
6. **Proof of Delivery** List Section (280; Delivered only) — Recipient Name / Phone / ID-Passport /
   Payment reference rows + demarcator + POD image row + Recipient Signature row (View buttons → dialogs).
7. **Deliver To** List Section (348) — Recipient name / Delivery address / Phone / Email / Delivery date /
   Order reference / Delivery instructions (spans row).
8. **Items (15)** List Section (444) — 5 rows per page (FeaturedIcon box + name + "N Units") + Pagination
   (combobox variant: ‹ 1 2 3 ›).
9. **Payment Information** List Section (276) — Payment type ("Payment on Delivery") / Payment Type
   (MPESA) / Product total / Delivery fee + demarcator + Total row ("Total"/"VAT Incl." + KES 2,800).
   Pending Ov2 variant (200): Payment method / Reference number / Product total / Delivery fee all N/A,
   no Total row.
10. **More Information** List Section (264) — Created / Created By (· source, w/ auto-create icon or
    person icon) / Dispatched / Dispatched By / Delivered / Weight. Returned variant (336): + subtle info
    banner "Check the activity tab for more information on the last delivery attempt." + View Activity.
11. **Footer Frame** (72) — per status (matches OM §12.7 + v2.8):
    Ready+Returned: **Cancel Order** (ghost-error, Delete icon, far left) | Add To Trip · Edit Order ·
    Dispatch · ⋯; Assigned/At Depot: Cancel | Add To Trip · Change Driver · Edit Order · ⋯;
    In Transit/Arrived: **Return Order** · Update Status · ⋯(Add Comment); Returning: Add Comment (no ⋯);
    Delivered/Cancelled: footer EMPTY (no action bar).
    ⋯ contents: Ready = Update Status │ Reschedule Order · Add Comment; Assigned same;
    Returned = Reschedule Order · Add Comment (no Update Status — OM v2.8 ✓).

## Inventory classification

**(a) Library components:** ModalShell/LargeModal drawer chrome, ModalHeaders, PageTabsControl+PageTab,
FooterFrame, Desktop Button (secondary small header CTAs; ghost/ghost-error footer; icon-only variants),
Badge (Delivery badges), NotificationBanner (highlight auto-assign, subtle info in Returned More-Info,
map-overlay banner w/ CTA), ContentCard (driver/trip), ContentPrimitives (utility rows, summary card,
section headings), FeaturedIcon (items, trip), Avatar, Pagination (combobox), DesktopMenuOptions +
MenuPanel/Popover (footer ⋯), Tooltip/HoverTip (header icons, SLA ⓘ), ModalDialog (image viewers),
MapView + MapZoomControl + MapIcon/DeliveryMapIcons (mini + expanded maps), Icons.

**(b) Ad-hoc (local to playground):** SLA Visibility block (eyebrow+counter+badge), Pickup Code digit
boxes, POD/POP image-thumb rows ("Base Card" pattern), Order Overview Card split layout, expanded-map
info cards (white pill cards w/ icon + name + address).

**(c) Plain elements:** demarcators/dividers, split-grid layout of list rows (2-col), digit boxes.

## Known copy conflicts (wireframe = ground truth)

- §7.2 matrix row 2 says Pending pre-broadcast main copy = the date; wireframe Pending Ov1 shows
  **"Order broadcasting soon" / "2 minutes to broadcast."** (Scheduled Ov2 matches the matrix).
- Expanded-map banner: spec "Dispatch this order to generate its delivery route" → wireframe
  **"Dispatch now to generate a delivery route."**
- Est-delivery sub copy has no trailing period in wireframes.
- Pending Ov2's More Information shows Dispatched/Delivered values while still Pending — treated as a
  designer copy slip; values derive from order state.

## Build outcome (Step 4 parity — 2026-07-20)

Implemented as ONE state-driven `OrderDetailDrawer`
(`apps/playground/src/components/orderDetail/` — `OrderDetailDrawer.tsx`,
`OrderDetailMap.tsx`, `detailModel.ts`; shared mocks in `lib/orderMeta.ts`).
Verified live per status: Scheduled (static date card), Pending (row-2b
countdown "Order broadcasting soon"), In Transit (POP row, Return/Update
footer, live Delayed counter), Delivered (POD section, no footer, planned+
actual routes), Returned (Prev badge, More-Info banner, ⋯ without Update
Status), Assigned (auto-assign banner, driver/trip cards, Change Driver
footer). Row click (Table gained `onRowClick`, §3.1 guard) + toast "View
Order" CTA both open it; footer actions route to the real Cancel/Update
Status/Reschedule/Edit/Dispatch handlers; proof viewers (ModalDialog gained
`showConfirm={false}`), expanded map overlay, items pagination, section
collapse, header copy CTAs + provenance HoverTips all working.

**Known deviations (intentional):**
- The mini/expanded maps are live `MapView` (Leaflet/OSM) per the project's
  map standard — not the wireframe's static screenshot; routes are mock
  polylines (planned red, actual/trail grey-dashed).
- CP Utility's Featured-Icon anchor renders 44px (DS sizing) vs Figma's 40.
- The expanded-map banner composes `NotificationBanner` (subtle) inside a
  white floating card; Figma draws a bespoke white pill.
- At Depot has no wireframe screen — renders the Assigned shape with its
  matrix row-6 copy ("Driver is at the depot").
- Delivered/Cancelled render NO footer (user ruling; wireframe frame carries
  an empty Footer Frame).
- Activity + Dispatch Logs tabs are EmptyState placeholders (user ruling)
  until their wireframes (383:103970 / 384:106688) are built.
- Est-window copy renders "12:30 - 12:40 PM" (single shared meridiem).

**DS changes made for this build:** `Table.onRowClick` (§3.1 row target with
interactive-element guard) · `ModalDialog.showConfirm` (Close-only viewers) +
`DOORSTEP_DELIVERY_IMAGE`/`SIGNATURE_IMAGE` exported · `ContentPrimitives.text/
subtext` widened to ReactNode + `vertical-list-row` values wrap (Figma Subtext
frames wrap) · asset consts typed `string` (kept base64 out of the d.ts).

## Corrections round 2 (2026-07-20) — re-enumeration after designer componentization

The designer **componentized** the drawer regions since the first build (they are now real
Figma components, which is why the ad-hoc reproduction drifted). Verified via Dev MCP +
figma-console bridge against the current nodes (Scheduled Ov1 `1094:86645`):

- **Order Overview Card** is now component `1452:181082` (instance in Scheduled Ov1 `1452:182257`).
- **Pickup Code** is now component `Pickup Code Banner` `1454:207769` (renamed from the
  earlier "Picup Code Banner" typo, corrected in Figma 2026-07-27).
- **Body sections** are now `Order Detail Accordions` (instances `1454:196201` etc.).

Applied corrections (playground `OrderDetailDrawer.tsx`):

1. **Drawer body background** → `--surface-neutral-bg-default` (white `#fefefe`); was grey
   `--surface-neutral-bg-muted`. `Main Body` pad `[24,16,0,16]`; inner Container vertical, gap 20,
   pad-bottom 40 → overview body wrapper padding now `24px 16px 40px`. Section cards stay white
   `--surface-neutral-card-idle` + 1px border + radius 12 (bordered cards on a white body).
2. **Pickup Code Banner** rebuilt to the real component: `--surface-secondary-bg-raised` (`#f1f3f9`)
   card, radius `lg`, padding `16px 20px`, gap 64; title `--text-secondary-label`; **four 32×32
   digit boxes filled `--surface-secondary-bg` (`#192037`, navy), radius `md`, text
   `--text-on-color-label` (white)**; Lock icon `--icons-secondary-default`; copy = Plain Copy-Outline.
   (Was a white ContentCard with grey digit boxes + dark text — wrong.)
3. **Order Status Summary** (right half of the Order Overview Card): padding `16px 20px` (py16/px20)
   kept, **gap 12 → 20**, added `justify-content: center` (Figma `items-start justify-center`). SLA
   metric `/ 30m SLA` recolored `--text-default-sub-body` → **`--text-default-helper`** (neutral-400
   `#808080`) to match Figma.

Reschedule Order modal (`RescheduleModal.tsx`): suggestion-card **grid gap 16 → 8** (Figma Options
GRID `gridRowGap`/`gridColumnGap` = 8; the `itemSpacing:16` was a misleading legacy value). Card
internal padding was already correct 16px (the reported hug was a stale dist, fixed by rebuild).

Route micro-animation (`OrderDetailMap.tsx`): every displayed route now renders a 60%-opacity base
+ a 100%-opacity comet segment (SVG `stroke-dashoffset` via Web Animations API, 40% segment, 2s
linear infinite loop) sweeping depot→drop-off; setup deferred to rAF until `getTotalLength()` is
measured (it's 0 on the first tick); `prefers-reduced-motion` renders a static full-opacity route;
handles cancelled on cleanup.

## Per-screen pass across all 13 (2026-07-21)

Text-dumped every drawer via the bridge and diffed against the running drawer. Result:
footers, section sets, copy, driver/trip cards, Pickup-Code presence, Proof-of-Pickup rows,
badges, and summary copy all matched — including **At Depot (`1454:208173`) being structurally
identical to Assigned** (same footer Cancel · Add To Trip · Change Driver · Edit + ⋯; copy
"Driver is at the depot"), Delivered/Cancelled having **no footer**, and Returning being a
single **Add Comment** footer (no ⋯). Two genuine misses found + fixed:

1. **More Information's 5th field is labeled "Completed", not "Delivered"** (confirmed on all 13;
   value is the delivery timestamp when delivered, else N/A). Fixed the `Field label`.
2. **Delivered's "Proof of Delivery" section renders FIRST** — right after the driver cards and
   **before** Pickup From (my drawer had it after Pickup From). Reordered.

Per-screen footer + section confirmation:
- Scheduled ×2 / Pending ×2 / Broadcasted / Returned: Cancel · Add To Trip · Edit · Dispatch (+⋯);
  Pickup Code + [Pickup From · Deliver To · Items · Payment · More Info]; no driver cards.
- Assigned / At Depot: Cancel · Add To Trip · Change Driver · Edit (+⋯); Pickup Code + driver cards.
- In Transit / Arrived: Return Order · Update Status (+⋯ Add Comment); driver cards + Proof of Pickup;
  no Pickup Code.
- Returning: Add Comment only; driver cards + Proof of Pickup.
- Delivered: no footer; driver cards + **Proof of Delivery (first)** + Proof of Pickup.
- Cancelled: no footer; driver cards (dispatched-then-cancelled), no proof sections.

## Per-status parity pass round 2 (2026-07-22) — against the newer section nodes

Re-ran the full 13-screen pass against the current wireframe section IDs (Returned
`1213:84581`, Scheduled Ov1 `1094:86645` / Ov2 `1094:86464`, Pending Ov1 `1094:86388` /
Ov2 `1094:86313`, Broadcasted `1094:86646`, Assigned `1094:83942`, At Depot `1454:208173`,
In Transit `1094:89388`, Returning `1213:82966`, Arrived `1272:86621`, Delivered
`1094:83886`, Cancelled `1237:86144`). Confirmed the Scheduled/Pending pair semantics per
§7.2: Scheduled Ov1 = Row 1 (>60m, "Scheduled delivery date"), Ov2 = Row 2 ("N minutes
until broadcast."); Pending Ov1 = Row 2b (auto-broadcast, "Order broadcasting soon" + **no
Calendar icon**), Ov2 = Row 3 (scheduled-but-non-auto-broadcast → manual, "Dispatch Now" +
**Calendar icon**). Bodies/footers/sections all matched the prior pass.

**Four fixes applied (playground only — no DS component change, no dist rebuild):**
1. **`detailModel.ts` — auto-broadcast Pending never scheduled-origin.** `scheduledOrigin`
   now gated `&& !(status === 'pending' && config.autoBroadcast)` so the Row-2b Pending
   state never renders a stray Calendar icon (the contradictory state §7.2 rules out).
2. **Header Broadcast icon (was missing).** §7.2/§7.3: header icons mirror the table's
   Order-ID cell. Added `showBroadcast: autoBroadcastFor(order)` to the model + a
   `Broadcast` HoverTip ("Auto-broadcast", `--icons-highlight-default`) in the header,
   matching the table's cell exactly.
3. **Returning delivery *badge* leading `Return` icon (user-reported).** The Return glyph
   is the Returning badge's own leading icon (DS Delivery Badges `68:36703` / Storybook
   confirms), **not** an Order-ID-cell icon. Added `ORDER_STATUS_BADGE_ICON` (`returning →
   Return` only) and passed `leadingIcon` to the badge in the table Status cell, the
   sub-status filter pill, and the drawer header. Live-verified in all three.
4. **Terminal driver card = single "View driver" Open button.** Delivered/Cancelled render
   the driver ContentCard in read-only mode (one `Open` button) instead of the active
   Change-driver + Call buttons (verified `1094:83886` / `1237:86144`). Live-verified.

Unchanged/confirmed: At Depot ≡ Assigned, Arrived ≡ In Transit; Delivered POD-first;
Returning = Add Comment-only footer; Returned ⋯ without Update Status (v2.8). All
playground typecheck-clean; live-verified via Claude Preview on the alt server.
