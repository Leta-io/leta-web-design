# Order Overview Card — updated component inventory (Figma `1452:181083`, Playground file)

Scanned 2026-07-29 via figma-console bridge. Local (ad-hoc) component set, 13 variants,
each **736×172**. Root = HORIZONTAL: `Order Mini Map View` (FIXED **320**) + `Order Status
Summary` (FILL, ~416). Drawer body pad `24/16/40` on a 768 shell ⇒ card renders at 736,
so map=320 fixed / content=flex is exact.

## Structural change vs current inline impl
The card was **flipped**. OLD (current code): SLA block on top + divider + `utility` CP
summary (with a Secondary no-icon CTA) at bottom. NEW:
1. **Top** = `ContentPrimitives type="section-heading"` — Title (Body/L/SemiBold, heading
   color) + Subtext (Body/M/Regular, sub-body), `showVisualAnchor=false` (no leading icon),
   with the CTA button in the **Interactive Elements** trailing slot.
2. **Demarcator** (full-width 1px divider).
3. **Bottom** = `Metrics Section > SLA Visibility` (VERTICAL gap 8):
   - Eyebrow row (SPACE_BETWEEN): "Total fulfilment time" + ⓘ (Question-Outline 16) **|** SLA badge
   - Metric row: "{elapsed} / 30m SLA" ("{elapsed}" bold heading-s-semibold, "/ 30m SLA" light).

Eyebrow text is **"Total fulfilment time" for ALL states now** (old code used "Elapsed…"
for live states — that's gone).

## (a) Library components used
- **ContentPrimitives** `type="section-heading"`, `showInteractiveElements`, `showVisualAnchor=false`, `showPassiveElements=false`.
- **Desktop Button** (CTA): Secondary / Medium / **Leading Icon**. Icon varies (see matrix).
- **Desktop Badges** (SLA badge): Leading Icon. Color varies.
- **Icon** Question-Outline (eyebrow ⓘ, 16).
- Map half = existing `OrderMiniMap` (composes `MapView`) — unchanged; expand button = Secondary/Small/Icon-Only (Expand icon).

## (b) Ad-hoc: "Order Overview Card" itself (the wireframe local component we're mirroring).

## Per-variant data matrix (title / subtext / CTA / SLA badge / metric)
| Variant | Title | Subtext | CTA (Secondary+LeadingIcon) | SLA badge | Metric |
|---|---|---|---|---|---|
| Scheduled 1 | 9 Jun 2027, 12:30 PM | Scheduled delivery date | View Activity · History | **Prev: 30m 23s** (Neutral·History) | 0s / 30m SLA |
| Scheduled 2 | 9 Jun 2027, 12:30 PM | 2 minutes until broadcast. | View Activity · History | **none** | 0s / 30m SLA |
| Pending 1 | Order broadcasting soon | 2 minutes until broadcast. | View Activity · History | On-Time (Green·Check-Circle) | 9m 24s / 30m SLA |
| Pending 2 | Dispatch Now | Items ready for delivery. | **Dispatch · Proceed** | On-Time | 9m 24s / 30m SLA |
| Broadcasted | Order broadcast started | 10 seconds elapsed. | **View Logs · Document-Outline** | On-Time | 9m 24s / 30m SLA |
| Assigned | Driver is on the way | Est delivery: 12:30 - 12:40 PM | View Activity · History | At Risk (Orange·Warning) | 27m 20s / 30m SLA |
| At Depot | Driver is at the depot | Est delivery: … | View Activity · History | At Risk | 27m 20s / 30m SLA |
| In Transit | Driver is in transit | Est delivery: … | View Activity · History | At Risk | 27m 20s / 30m SLA |
| Arrived | Driver has arrived | Est delivery: … | View Activity · History | At Risk | 27m 20s / 30m SLA |
| Returning | Driver is returning | Est drop-off: … | View Activity · History | On-Time | 28m 20s / 30m SLA |
| Delivered | Order delivered | Delivered at 12:50 PM | View Activity · History | Delayed (Fire Red·Error) | 50m 20s / 30m SLA |
| Cancelled | Order cancelled | Cancelled at 12:50 PM | View Activity · History | On-Time | 28m 20s / 30m SLA |
| Returned | Order returned | Returned at 12:50 PM | View Activity · History | **Prev: 30m 23s** (Neutral·History) | 0s / 30m SLA |

## Mapping to existing `detailModel.ts`
Already produces: `summary.{main,sub,cta,ctaLabel}` (matches Title/Subtext/CTA exactly),
`slaBadge` ({label,color,icon}|null — Prev for returned, On-Time/At-Risk/Delayed, null for scheduled),
`elapsedBase`/`ticks` (metric). Needs: CTA leading-icon map (view-activity→History,
dispatch→Proceed, view-logs→Document outlined); eyebrow → static "Total fulfilment time";
badge relocated eyebrow row.

### Open ambiguity
- Base-scheduled (variant 1, "Scheduled delivery date") shows **Prev: 30m 23s**, but the
  current model returns `null` for scheduled (a fresh scheduled order has no prior attempt).
  Scheduled-2 (about-to-broadcast) shows none. → confirm with user.

## Correction pass (2026-07-29, re-enumerated per user report of styling bugs)

Re-scanned with exact per-text-node style extraction (font size/weight/line-height/
letter-spacing + per-range fill color), not just component-property text content.
Found two real bugs in the first pass's `SlaBlock` metric row:

1. **Wrong typography class for the elapsed number.** Used `text-heading-s-semibold`
   (20px) — the real Figma run is **`text-body-l-semibold` (16px SemiBold, lineHeight
   24)**, color `--text-default-label` (`#101010`) — confirmed via `getRangeFontSize`/
   `getRangeFontName` on the live text node (bridge), not assumed from a prior build.
2. **Double-spacing between the number and "/ 30m SLA".** The metric is **ONE Figma
   text node with two style runs** (`Metric` frame has `childCount: 1`) — "27m 20s "
   (trailing space in the 16px run) + "/ 30m SLA" (14px Regular, `--text-default-helper`
   `#808080`, no leading space). The code wrapped both halves in a flex row with
   `gap: var(--spacing-4px)` AND kept a leading space on the second span — stacking a
   flex gap on top of the space character already provided a real gap once. Fixed:
   plain inline nested `<span>`s (no flex/gap), trailing space moved onto the first
   (16px) run to match the exact Figma run split.

Both confirmed via live computed-style extraction in the running app (not just visual
comparison): `"27m 20s "` → 16px/600/rgb(16,16,16)/lineHeight 24;
`"/ 30m SLA"` → 14px/400/rgb(128,128,128)/lineHeight 20 — byte-for-byte match to the
bridge-read Figma runs. Eyebrow/title/subtext were already correct (ContentPrimitives
+ existing `text-label-m-regular` class) — no change needed there.

## Re-enumeration pass (2026-07-29, second re-scan per user request)

Full deep scan via figma-console bridge of all 13 variants. Confirmed:
- All 13 share identical structure: CP + Demarcator + Metrics Section
- Typography: all per-run styles confirmed correct (body-l-semibold / body-m-regular metric,
  label-m-regular eyebrow, section-heading CP)
- Badges: Scheduled 1+2 = **no badge** (null), not "Prev: 30m 23s" as the first inventory
  erroneously stated; Returned = Prev badge; rest per existing model
- CTA buttons confirmed: View Activity·History, Dispatch·Proceed, View Logs·Document-Outline

**One layout discrepancy found and fixed:**

3. **Child order was reversed.** Figma root children: `[Order Status Summary, Order Mini Map View]`
   = Summary LEFT, Map RIGHT. Code had Map first (left), Summary second (right). Fixed:
   swapped children; moved the 1px vertical divider border from the Map's `borderRight` to the
   Summary's `borderRight` (Figma: the Summary frame carries a 1px stroke; the Map has none).
