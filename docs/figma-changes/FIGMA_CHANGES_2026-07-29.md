# Figma → Code Sync Report

**Scan date**: 2026-07-29
**Previous baseline**: 2026-07-17 (Notification Banner) / 2026-07-16 (illustrations)
**Figma file**: `Kxbgc2KoJSmTxvSV3PwNEu` ("Library")
**Scope**: full sync (per user) — token collections + component catalog diff + the three described component updates

## Summary

| Category | Added | Removed | Changed |
|---|---:|---:|---:|
| Tokens (Mapped Colors) | 8 | 0 | 0 |
| Components (catalog) | 1 | 0 | 2 internal (leaf-level) |
| Component descriptions | 1 | 0 | 0 |

**Headline**: One new atom (**Toggle Button**) with 8 new `--*-toggle-button-*` colour tokens; the **Rich Text Area** formatting buttons and the **Table Data Control** column-control group were updated to compose it / a switch. No other token, component, or structural drift.

---

## Tokens — 8 new (Mapped Colors)

All resolve light + dark. Added to `mapped-colors.json` (432 → 440 vars) + regenerated (`tokens:check` clean):

| Token | CSS var |
|---|---|
| Surface/neutral/toggle-button-idle | `--surface-neutral-toggle-button-idle` |
| Surface/neutral/toggle-button-hover | `--surface-neutral-toggle-button-hover` |
| Surface/neutral/toggle-button-pressed | `--surface-neutral-toggle-button-pressed` |
| Surface/secondary/toggle-button-selected | `--surface-secondary-toggle-button-selected` |
| Border/neutral/toggle-button-idle | `--border-neutral-toggle-button-idle` |
| Border/neutral/toggle-button-hover | `--border-neutral-toggle-button-hover` |
| Border/neutral/toggle-button-pressed | `--border-neutral-toggle-button-pressed` |
| Border/secondary/toggle-button-selected | `--border-secondary-toggle-button-selected` |

The other 6 collections (Brand / Alias / Mapped Type / Mapped Sizes / text-styles / effect-styles) were re-fetched and are **byte-identical** to the committed snapshots — no other variable changes.

---

## Components

### Added — Toggle Button (`10900:15545`, Atoms)

Icon-only 32×32 binary switch, radius 8, 16px icon, 6 states (Idle / Hover / Pressed / Selected / Focus / Disabled). Same press/hover micro-animations as `Button` (`scale(0.96)` on press + 150ms transitions). On/off state exposed via `aria-pressed`. **Built** as `packages/components/src/ToggleButton/` + `Atoms/Toggle Button` stories. Figma description written (user-provided copy). **Status: `code-implemented`.**

### Changed (internal / leaf-level — not catalog-visible)

- **Data Entry → Text Area / Rich (`38:42`)** — the 3 formatting buttons (Bold / Italic / Underline) are now **Toggle Button** instances (Attachment + Send stay regular Buttons). `TextArea.tsx` rich footer swapped Ghost icon-only Buttons → `ToggleButton`; `onBold/onItalic/onUnderline` now receive the pressed state. **Status: `code-implemented`.**
- **Table Data Control (`7575:36637`)** — across Search + Column Control, Search + Column Control (Active), and Top Level Filters + Column Control, the **Refresh** icon-only button was removed and replaced by an **Auto-refresh Selection Control (switch)** left of the Columns button. Semantics: when on, orders auto-refresh into the table (no manual refresh needed). `TableDataControl.tsx` dropped `onRefreshClick`/Refresh button, added `autoRefresh` + `onAutoRefreshChange` + the `SelectionControl variant="switch"` labeled "Auto-refresh". **Status: `code-implemented`.**

The two catalog axis deltas the diff flagged (Desktop Dropdowns +`Combobox (Empty)`, Empty State +`Error`) were **stale baseline metadata** from earlier minimal patches — both already in code; baseline `variantGroupProperties` corrected this round.

---

## Playground

- **Auto-refresh wired (functional, default OFF** — per user). `OrdersPage.tsx` passes `autoRefresh`/`onAutoRefreshChange` to the populated-table `filters-column` control. When on, an interval (~9s) injects a fresh pending order (capped at 12) + flashes the table, simulating live incoming orders; toggling off / unmounting clears it. The manual Refresh handler was removed.

---

## Verification

- **Storybook (live):** Toggle Button (idle/selected/disabled + interactive toggle), Rich Text Area (B/I/U toggle buttons — confirmed selecting Bold shows the selected state), Table Data Control (Auto-refresh switch present, Refresh gone, Columns retained).
- typecheck clean (components + playground); `@leta/components` dist rebuilt; `tokens:check` clean.
- ⚠ Figma library dirtied (Toggle Button description write) → **publish**.
