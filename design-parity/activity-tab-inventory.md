# Activity Tab — Figma inventory (re-enumerated 2026-07-30)

Source: LETA Playground file `xVa4kZAArZWWvl6QsfID8S`
- Timeline Activity component set: `1487:173235` (20 variants, "TImeline Activity")
- Stacking + full-tab wireframe: `1489:181978` → parent Large Modal `1489:181972`

## Modal shell (`1489:181972`, 768 × 2140, V, gap 0, pad 0, stroke 1 INSIDE all)

```
Large Modal (768, V, gap 0, pad 0)
├─ Modal Headers  INSTANCE "With Tabs"  768 × 168  V gap 20  pad [20,20,0,20]  FILL×HUG
│    strokeSides [0,0,1,0]   ← FULL-WIDTH (768) bottom stroke on the header ROOT
│    ├─ Container 728 × 88  V gap 16
│    │    ├─ Top Content 728 × 40  H gap 20
│    │    └─ Secondary Content SLOT 728 × 32  H gap 10 SPACE_BETWEEN
│    └─ Page Tabs Control INSTANCE "Basic" 728 × 40  V gap 0
│         ├─ Tab Container SLOT 728 × 40  H gap 16  pad [0,40,0,0]
│         └─ Demarcator 728 × 1     ← only 728 wide (inset by the header's 20px pad)
│
├─ Main Body  768 × 1900  V  gap 24  pad [24,16,24,16]  cross CENTER  FILL×FILL
│    ├─ Top Filter Section INSTANCE "Basic"  736 × 40  FILL×HUG
│    └─ Container  736  V  gap 20  pad 0  FILL×FILL
│         ├─ Scroll Frame  736 × 1612  FILL×FILL
│         │    strokeSides [0,0,1,0]  ← composer demarcator, 736 wide (NOT edge-to-edge)
│         │    └─ Timeline Activity  736  V  **gap 0**  pad 0  FIXED×HUG
│         │         └─ 13 × TImeline Activity instances (FILL×HUG)
│         └─ Comment  736 × 156  V  gap 16  pad 0  FILL×HUG
│              ├─ Data Entry INSTANCE  Type=Text Area  Variant=Rich  State=Idle
│              │    736 × 120  FILL×FIXED   (Show Label/Helper false, Show Counter true)
│              │    ├─ Field  736 × 72  V gap 8  pad [10,12,10,12]
│              │    └─ Footer 736 × 48  H gap 8  pad [8,12,8,12] SPACE_BETWEEN
│              │         ├─ Formatting Buttons 112 × 32 (3 × Toggle Button 32×32 Idle)
│              │         └─ Trailing Buttons (Desktop Button Primary/Icon Only/Small
│              │              **State = Disabled**)  ← disabled while the field is empty
│              └─ Notification Banners  Neutral/Subtle  736 × 20  FILL×HUG
│
└─ Footer Frame INSTANCE "Tertiary Action" 768 × 72  H gap 10  pad [16,16,16,16] SPACE_BETWEEN
```

### Two distinct demarcators (the fix that mattered)
| Line | Node | Width | Meaning |
|---|---|---|---|
| Header ↔ body | `Modal Headers` root bottom stroke | **768 (full)** | edge-to-edge |
| Scroll ↔ composer | `Scroll Frame` bottom stroke | **736 (inset 16)** | NOT edge-to-edge |

The Page Tabs Control's own `Demarcator` is 728 and sits coincident with the header's
768 stroke — so the visible full-width line comes from the **header root**, never from
widening the tabs control.

## Timeline Activity row (e.g. `1487:173224` Driver Activity (In Transit), 736 × 132)

```
Variant (H, gap 40, pad 0, FIXED×HUG)       ← gap 40 irrelevant: single child
└─ Details  736  H  gap 12  pad 0  FILL×HUG
   ├─ Branch  32  V  gap 0  pad 0  cross CENTER  HUG × **FILL**
   │    ├─ Avatar / Featured Icon  32 × 32  FIXED
   │    └─ Line  VECTOR  w 0  szV FILL  grow 1
   │         strokeWeight **1**   dashPattern **[6, 6]**   strokeAlign CENTER   x = 16
   └─ Timeline Details  692  V  gap 8  pad **[0, 0, 40, 0]**  FILL×HUG
        ├─ Title + Date  692 × 32  H  gap 10  cross CENTER  main SPACE_BETWEEN
        │    ├─ Title  H gap 8 cross CENTER
        │    │    ├─ Action  H gap 8 (the title text/segments)
        │    │    └─ Desktop Button  16 × 16
        │    │         **Variant=Plain, Type=Icon Only, Size=Small, State=Idle**
        │    └─ TEXT timestamp
        └─ body block(s) — e.g. Status Update  FILL  pad 16  gap 8  stroke 1 INSIDE  radius 12
```

### Why the branch line was breaking (red circle)
The 40px inter-row gap is **`Timeline Details`' own `paddingBottom`, not the row root's**.
`Branch` is `szV: FILL` of `Details`, so it stretches the row's *full* height — the
dashed `Line` (`grow 1`) therefore runs **through** that 40px gap and meets the next
row's icon (the stacking frame has `gap: 0`). Putting the padding on the row root makes
`align-self: stretch` stop at the row's content box → the line ends early → visible gap.

## Update 2026-07-30 — Main Body padding + Editing state

- **Main Body `1489:181974` padding changed** for the Activity tab: `[24,16,24,16]` →
  **`[24,16,8,16]`** (bottom 24 → 8). The composer's own bottom breathing room is now
  8px — applied to `BottomRegion`'s `paddingBottom` (both the composer and the
  completed-order notice use it).

- **New variant: Dispatcher Comment (Editing) `1685:119878`** — the state after the
  user clicks **Edit** on their OWN comment (`editable: true` only; never another
  dispatcher's `editable: false` comment). The comment card + Edit section is replaced
  by, inside `Timeline Details` (V, gap 8):
  1. A **Rich Data Entry** (`Type=Text Area, Variant=Rich, State=Active`), pre-filled
     with the comment, **Send button hidden** (`Trailing Buttons` `visible:false`) — so
     the field footer shows only the B/I/U formatting toggles.
  2. A **Footer Frame** `Property 1 = Card Footer`, `Show Leading Content=false`, whose
     Trailing Content is **Cancel** (Secondary / Medium / No Icon) + **Save** (Primary /
     Medium / No Icon), right-aligned, gap 8.
  Implemented as `CommentEditor` (composes `TextArea variant="rich" showSend={false}` +
  `FooterFrame variant="card"`), swapped in by `ActivityRow` when `editingId === item.id`.
  Save commits the new text and bumps "N Edits"; Cancel discards.

## Update 2026-07-31 — Comment Field (idle⇆active) + editing reflow + padding revert

- **Main Body `1489:181974` padding reverted** to `[24,16,24,16]` (bottom 8 → 24).
  `BottomRegion` `paddingBottom` back to 24.

- **New component: Comment Field `1691:120714`** (docked composer, replaces the
  always-rich composer). Sibling of the Scroll Frame at the bottom of the Container
  (gap 20). Two variants:
  - **Idle** (h 76): the dispatcher **Avatar** (40, Medium, `Empty-Teal`, "AS") +
    a single-line **Input Field / Basic** placeholder "Leave a comment"
    (`--surface-neutral-input-field`, 1px `--border-neutral-default`, radius 8, pad
    10/12) + the "Comments are editable within 5 minutes." Notification Banner.
  - **Active** (h 208): same, single-line swapped for the **Text Area / Rich**
    (auto-focused). Rich footer = B/I/U toggles + **Cancel (Secondary) + Save
    (Primary), Small** in the `Trailing Buttons` SLOT.
  Click the idle field OR the footer **Add Comment** button → Active (auto-focus).
  Cancel discards + collapses; Save posts + collapses. Idle↔active height animates
  (interruptible; `make-interfaces-feel-better`). Implemented as `CommentField` +
  `AnimatedHeight` in `ActivityTab.tsx`; `commentActive` lifted to `OrderDetailDrawer`
  so **Add Comment** (`runAction('addComment')` → `setTab(1)` + activate) expands it.

- **Editing `1685:119878` reflowed** (h 300 → 252): the separate **Card Footer** with
  Cancel/Save is **removed**; Cancel + Save (Small) now live in the rich footer's
  **Trailing Buttons SLOT** (same as the composer). `CommentEditor` now uses the DS
  default trailing (`onCancel`/`onSave`/`saveDisabled`) + `autoFocus`, no FooterFrame.

- **DS `TextArea variant="rich"` gained `autoFocus`** — focuses the field + places the
  caret at the end of seeded content on mount (used by both composer-active and edit).

### Last row
The creation variants (`1487:173217` / `1487:173234`, h = 72) have **no `Line` child** in
their `Branch` — but still carry `Timeline Details` `pad [0,0,40,0]`. So: no line on the
last row, 40px bottom pad on **every** row (which also supplies the end-of-scroll margin).
