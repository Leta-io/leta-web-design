# LETA Design System — Build Plan

## Resume here — next session pickup

**▶ CURRENT STATE (2026-06-10) — Phase 5 Molecules Batch 3 in progress. (Full Desktop Menu options deferred to its own session.)**

**ContentPrimitives fix (2026-06-10):** The eyebrow-trailing help marker and list-row description marker were defaulting to icon `Help`, whose registry entry has `outline: null` — so `<Icon name="Help" outlined>` silently fell back to the **filled** glyph. Switched both defaults to `Question` (registry `Question` has a real `outline` = `help-outline-rounded` = Figma `Icon/Question-Outline`), added the missing icon colors (eyebrow trailing = `--icons-neutral-idle`; list-row description = `--icons-neutral-default`), and centered the Metrics trailing content vertically (`TrailingContent` now `alignSelf: stretch`; removed the `passiveAlignItems="flex-start"` override — Figma's Trailing Content frame fills full height with crossAxis CENTER). Stories that used `name="Help" outlined` / `descriptionLeadingIcon="Help"` updated to `Question`.

**Desktop Metric Cards `4239:74634`** (2026-06-10; **re-implemented after designer restructured + republished** — axes are now `State` × `Variance` (the `Style=Basic` axis was dropped); `packages/components/src/DesktopMetricCard/` + 7 stories under `Molecules/DesktopMetricCard` — Default / NeutralVariance / PositiveVariance / NegativeVariance / Hover / Pressed / Catalog (full 3×4 matrix); interactive `<button>` KPI card wrapping `ContentPrimitives type="metrics"`; 3 states (Default/Hover/Pressed) × 4 variance (None/Neutral/Positive/Negative) = 12 Figma variants. **State styling corrected from first pass** (first pass only swapped border colors — wrong): Default = `--surface-neutral-card-idle` + `--border-neutral-default` @ `--stroke-xs` (1px), **no shadow**; Hover = `--surface-neutral-card-hover` + `--border-neutral-card-hover` @ 1px + **`--shadow-neutral-1`** drop shadow ("Neutral Drop Shadow 1"); Pressed = `--surface-neutral-card-pressed` + `--border-neutral-card-pressed` (#A5A5A5, darker) @ **`--stroke-sm` (1.5px)**, no shadow. Border + shadow composed in one `box-shadow` (`inset 0 0 0 {w} {border}[, {shadow}]`). **Native `<button>` border reset** (`border:none` + `appearance:none`) — the UA default 2px black outset border was overpowering the inset box-shadow border (showed a dark outline on Default/Hover + a double ring on Pressed) until reset. **Focus** (added by designer 2026-06-10): idle body + standard focus ring (`outline: var(--stroke-sm) solid var(--border-secondary-component-focus)`, 4px offset — mirrors Figma's "Focus" child rectangle: 1.5px `--border-secondary-component-focus`, 4px outward offset, radius 16). Real keyboard focus uses the `:focus-visible` CSS; `state="focus"` renders it statically. Hover/pressed via React mouse state; optional **`state` prop** (`default`/`hover`/`pressed`/`focus`) forces a visual state (mirrors Figma `State` axis, used by Catalog). padding 20/16, `--rounding-xl`; visual anchor = `Check-Circle` outlined 24px; eyebrow + outlined Question help icon; variance badge map: Neutral→`neutral` no-icon, Positive→`success`+`Up-Arrow`, Negative→`error`+`Down-Arrow` (drives ContentPrimitives `metricVarianceColor`/`metricVarianceIcon` props); subtext hidden by default; trailing Proceed ↗ passive icon, vertically centered. Parity `4239:74634` = 54/100 — **0 critical, 0 real major in visual/spacing/typography (gate Pass)**; 2 visual majors are token-resolution artifacts (idle `var()` vs the COMPONENT_SET's Hover default `#FEFEFE`/`#E3E3E3`), size major is COMPONENT_SET chrome (2100×603 = 12 variants); minors are componentAPI paradigm.)

**Option Cards `9894:18459`** (2026-06-10; `packages/components/src/OptionCard/` + 5 stories under `Molecules/OptionCard` — Idle / Active / Disabled / Focus / Catalog; full-width selectable choice card; designer cleaned up the variant structure → single `State` axis (Idle/Hover/Pressed/Active/**Focus**), no more "Choice Card" sub-type; `<label>` wrapper composing `ContentPrimitives type="utility"` (no visual anchor; title Label/M/SemiBold + desc Body/M/Regular) + trailing `RadioButton` atom (real input for a11y — label toggles it natively); states → `--surface-neutral-card-{idle,hover,pressed,active}` + `--border-neutral-card-{idle,hover,pressed}` / `--border-secondary-card-active` (navy); padding 20, gap 16, `--rounding-xl`, `--stroke-xs` inset; `selected` controls Active + radio checked; `aria-label={title}` on radio. **Focus (added by designer 2026-06-10): card-level ring via `.leta-option-card:has(:focus-visible)`** — the nested radio is the focus target, so `:has()` projects the standard ring (`outline: var(--stroke-sm) solid var(--border-secondary-component-focus)`, 4px offset) onto the whole card; the radio's own input is clipped (no separate ring), matching Figma's Focus variant; `state` prop (`idle`/`hover`/`pressed`/`active`/`focus`) forces a static state for the Catalog. Parity `9894:18459` = 50/100 — **0 critical, 0 real major (gate Pass)**; idle `var()` tokens resolve exactly to design `#FEFEFE`/`#E3E3E3` (string-vs-hex artifact), size major is COMPONENT_SET chrome.)

**Configuration Card `9617:18100`** (2026-06-10; `packages/components/src/ConfigurationCard/` + 3 stories under `Molecules/ConfigurationCard` — Enabled / Disabled / Catalog; ships **`ConfigurationCardRow`** sub-component for the white body rows; toggle-able settings section: header (`ContentPrimitives type="utility"` title+desc + `Toggle` interactive element) always shown; when `enabled` → body (`children` rows, gap 16) + footer revealed; outer `--surface-neutral-bg-secondary` + `--border-neutral-default` inset, padding 20, gap 24, `--rounding-xxl`; rows = white `--surface-neutral-bg-primary` cards (`--rounding-xl`, pad 20) with trailing CTA (e.g. Secondary "Dispatch"); footer reuses `FooterFrame variant="card"` with subtle `NotificationBanner` (validation message) leading + Secondary/Primary action buttons; `enabled` controlled via `onToggle`; footer props `footerMessage`/`footerMessageType`/`cancelLabel`/`onCancel`/`submitLabel`/`onSubmit`/`showFooter`. Parity `9617:18100` = 43/100 — **0 critical, 0 real major (gate Pass)**; 2 visual majors are token-resolution artifacts (`var(--surface-neutral-bg-secondary)`→`#FAFAFA`, `--border-neutral-default`→`#E3E3E3`), size major is COMPONENT_SET chrome; minors are componentAPI/SLOT paradigm.)

**Notification Banners `3811:65015`** (2026-06-09; `packages/components/src/NotificationBanner/` + 5 stories under `Molecules/NotificationBanner` — Default / Subtle / AllTypes / AllTypesSubtle / Catalog; 5 types (Info/Neutral/Highlight/Warning/Error) × 2 variants (Filled/Subtle) = 10 Figma variants; Filled = colored bg + 1px inset border + title + description + Content Buttons SLOT + dismiss; Subtle = transparent, no title, description only; per-type token map: `--surface-{semantic}-bg-subtle` / `--border-{semantic}-banner` / `--icons-{semantic}-default` (Neutral uses `--surface-neutral-bg-secondary` + `--icons-neutral-idle`); text `--text-default-label` (title) + `--text-default-body` (desc); 18px filled icons (Info/Info/Lightbulb/Warning/Error); Content Buttons SLOT → `children` prop; dismiss → `onDismiss` callback renders Plain Small Icon-Only Cancel button; `showContentButtons` boolean toggle; `role="status"`; FooterFrame stories updated to use real NotificationBanner instead of placeholder. Parity 58/100 against `3811:65015` — **0 critical, 0 major in visual/spacing/typography (gate Pass)**; 2 majors are token-resolution artifacts (`var(--surface-information-bg-subtle)` vs `#EBF4FF`); minors/infos are componentAPI paradigm differences).
Phase 4 of `~/.claude/plans/quiet-questing-tower.md`. Descriptions approved + written to Figma (one batch) + "Mulitple Countries"→"Multiple Countries" rename + Desktop Progress Indicator `Usage→System Process` variant rename — **all done; library not yet published.**

**Built, verified (typecheck + Storybook + parity visual-only gate Pass), exported:** Selection Control `37:362`, Shortcut `7259:81045`, Desktop Progress Indicator `7353:37255` (Upload horizontal %/check · Task & System-Process vertical + helper line — rebuilt after a wrong same-structure assumption), Stepper `4524:205932` (rebuilt: spinner hover-only + shadow; segmented count = focus-box not stretched underline), Leading Input Field Element `7111:43945` (Single now focusable for its focus state), Trailing Input Field Element `4478:344281`, Pagination `7292:86007` (inline 32×32 page cell; page-range fixed to `1 2 3 … N`, rows-per-page gap 12), **Breadcrumbs `9108:33624`** (2026-06-08; `packages/components/src/Breadcrumbs/` + 4 stories under `Molecules/Breadcrumbs` — Nested / GlobalClient / GlobalAdmin / Catalog; data-driven `items`+`current`, `<nav aria-label="Breadcrumb"><ol><li>` w/ `aria-current="page"`; Nested = Small plain-button link crumbs, Global = Medium; Global Client root = non-interactive `Icon/Company`+name chip (`--text-default-label`/Label-M-Medium), Global Admin root = Plain split button `iconLeft="Company" iconRight="Stepper"` → `onClientClick` opens client-switcher dropdown (overlay out of scope); slash + current = `--text-default-label-idle`; current SemiBold. **Prereq fix: Button atom's Plain variant reconciled to Figma** — Plain is a compact link style (0 padding, gap 4, Medium-weight label, hug-content height = line-height ~16/20px), not the 40px filled box; only `Variant=Plain` is Medium (all others SemiBold). Verified via `preview_inspect`: link crumbs `--text-secondary-plain-button-idle`/Medium, gaps 8, current `aria-current`. Parity `5214:77433` = 65/100 — **visual/spacing/typography: 0 critical, 0 major (gate Pass)**; the 1 critical is `accessibility/targetSize` (design==code 276×20; WCAG heuristic on Figma's own 20px row, inline-link exception) + componentAPI props-vs-variant paradigm minors. **Artifact: Global Admin trailing Stepper renders `--icons-secondary-plain-button-idle` via the Button icon-var rather than Figma's `--icons-neutral-button` — near-identical near-black (#080a12 vs #101010), imperceptible.**).

**Footer Frame `6448:32008`** (2026-06-08; `packages/components/src/FooterFrame/` + 7 stories under `Molecules/FooterFrame` — Default / TertiaryAction / DataSummary / Preference / Validation / Card / Catalog; slot-based layout shell: `variant` → height (80/88/40) + padding (20/0) + bg (primary/transparent); `leading` slot + `children` trailing actions; outer gap 10, inner trailing-buttons gap 8; top-only border `--stroke-xs` `--border-neutral-default` (modal variants; Card = none); bottom-left/right radius `--rounding-xl` (12px; Card = 0). Validation/Card stories use placeholder banner (icon+text) standing in for the not-yet-built Notification Banners molecule. Parity `4815:61028` = 71/100 — **0 critical, 0 major in visual/spacing/typography (gate Pass)**; 2 original majors were `backgroundColor` token-resolution artifact + gap mismatch (fixed 10→8→10); remaining minors are paradigm (slots vs component-properties, width 100% vs 896, role).).

**Modal Headers `228:5568`** (2026-06-08; `packages/components/src/ModalHeaders/` + 3 stories under `Molecules/ModalHeaders` — Default / WithTabs / Catalog; vertical layout shell composing Title (page-dialog), Button (Ghost/Prominent-Icon-Only Cancel = close), optionally Breadcrumbs + PageTabsControl; toggle props `showBreadcrumb`/`showNavArrow`/`showLeadingIcon`/`showSecondaryContent`; bg `--surface-neutral-bg-primary`, top-left/right radius `--rounding-xl` (12px), bottom border `--stroke-sm` `--border-neutral-default`; Default = 80px pad-20-all; WithTabs = 120px pad-[20,20,0,20] + PageTabsControl row. Parity `228:5566` = 55/100 — **0 critical, 0 major in visual/spacing/typography (gate Pass)**; the 1 major = `backgroundColor` token-resolution artifact; 12 minors = componentAPI paradigm + responsive width).

**✅ Phase 4 Molecules Batch 2 COMPLETE (10/10).** All 10 sequenced components built, typecheck-clean, Storybook-storied, parity-gated: Selection Control, Shortcut, Desktop Progress Indicator, Stepper, Leading Input Field Element, Trailing Input Field Element, Pagination, Breadcrumbs, Footer Frame, Modal Headers.

**🔧 Data Entry (`38:42`) restructure + fixes (2026-06-11).** The Figma "Input Fields" mega-set was renamed **Data Entry** (`Type` = Search Input / Input Field / Text Area / File Upload / **Select** / **Stepper Input**); all related stories were grouped into a `Molecules/Form Controls/` Storybook folder (order in `preview.tsx` storySort). Done: InputField trimmed to `basic|leading|trailing` (shared chrome → internal `FieldChrome`); new **Select** + **StepperInput** components (split from the old InputField variants); **SearchBar → 4 separate Search components** (`SearchInput` desktop, `MobileSearchInput` pill, `MapSearchInput` Web Map, `MobileMapSearchInput` Mobile Map — shared internal `SearchField`; map results panels use a temp `Placeholder` for the unbuilt Desktop Menu Options); **Select** field-fill (`--surface-neutral-selector-field`) + chevron (`--icons-neutral-default`) token fixes + Warning story; **SearchInput** double-× + clear-icon fixes; **FileUpload** lost its (non-Figma) disabled state and gained desktop Uploading/Uploaded via new **FileUploadCard**; new **MobileFileUpload** (image-tile grid); **`Button` ghost idle/focus made transparent globally** (was opaque white → white box on non-white surfaces; fixed the File Upload card × and Text Area Rich toolbar); **TextArea `variant="rich"`** (formatting-toolbar footer); new **`Placeholder`** stand-in. Typecheck clean; all verified in Storybook. **Still pending:** Desktop Menu Options `1531:5056` (then swap into the Map search panels). Full detail in CLAUDE.md Status.

**✅ Table Cells (2026-06-14) — `Cell` `4444:45000` + `Duration Labels` `4445:107943`.** New `Molecules/Table Cells` Storybook folder. **`DurationLabel`** — `variant`(finished/active) × `status`(on-target/delayed/at-risk) × `time`; Finished = status icon + greyed time, Active = color-coded time. **`Cell`** — ONE component, `type` = 18 Types × 4 States (idle/hover/pressed/selected), DesktopMenuOptions pattern (runtime hover/press + `selected` + `state` override); table-cell/header surface tokens; composes DurationLabel/Badge/Button/Checkbox/Chip/Avatar/Select/Stepper/GroupedInput; 5 SLOTs → ReactNode props; ellipsis truncation on List Item/Address/Order ID; the designer merged Timer into a single `duration` type. **Button atom extended with `iconOutlined?: boolean`** (default false; order-cell Copy + driver Phone pass it for the `-Outline` glyphs, Swap stays filled). 18 per-Type stories + Catalog. Parity: Cell `4444:45000` = 52/100 **0 critical** (spacing+typography aligned; 3 majors = COMPONENT_SET frame-fill/enum-naming/set-bounds-targetSize artifacts), Duration Labels `4445:107943` = 64/100 (0 visual/spacing/typography major) — gate Pass. Human-readable descriptions (from the user's Cell annotations) confirmed + written to Figma `figma_set_description` + code JSDoc. typecheck clean; dist rebuilt. **⚠ Library dirtied → publish.**

**Cross-cutting fixes this session:** Toggle-atom glyph sizing (`0 0 36 20` viewBox); **`@leta/icons` dist rebuilt** (stale dist served wrong `Add` glyph — see [[project_icons_dist_rebuild]]); two guardrails added to CLAUDE.md Key rules (never assume variant structure; **always view the rendered variant image during the build**).

**⚠ Quality note (2026-06-05):** error rate rose late-session (Stepper, DPI, Pagination each needed a correction) — root causes: building from the structure tree without viewing the rendered Figma image, and **context saturation in a very long session**. Recommend doing Breadcrumbs/Footer/Modal in a **fresh session** for reliable fidelity. **Desktop Menu options** (74 variants + a Content Primitives sub-dependency) is its own dedicated build — analysis saved to [docs/desktop-menu-options-analysis.md](docs/desktop-menu-options-analysis.md); Pagination currently inlines the page cell.

**⚠ Pending after this batch:**
- **Publish the Figma library** — the 10 description writes + the variant rename dirtied "Library"; open the Publish dialog (lists exactly these changes) and publish so consumers get them. *(Not yet published.)*
- **Desktop Progress Indicator** — when built, also rename its Figma **variant value** `Usage → System Process` (a `componentPropertyDefinitions` edit; the description prose already says "System Process").
- **Checkbox atom opacity bug** (`packages/components/src/Checkbox/Checkbox.tsx:72`, also RadioButton): disabled uses `opacity: var(--opacity-60)` which resolves to the buggy `60px` → no dimming. SelectionControl works around it with literal `0.6` on the row. Worth fixing the atoms separately.
- **Re-baseline descriptions** — `packages/cli/snapshots/descriptions.json` is now stale (10 new/updated Figma descriptions); the figma-design-system-sync skill owns the refresh.

Done earlier in this session (all verified): WizardTab inactive-tab hover bug fixed + "(sim)" story labels corrected; mobile-atoms reconciled (frame `8418:9217` — all 7 built, no gaps); icon library normalized/organized + `@leta/icons` synced + library **published**; figma-console REST **403 fixed** (token was expired in `~/.claude.json`; now valid — parity backlog all Pass, see "Parity backlog cleared (2026-06-03)" below); publish-prompt investigated (reads are safe; only real edits incl. layout moves trigger publish).

**Molecules Batch 1 shipped 2026-05-28** — Top Filter, Top Filter Section, Desktop Segment Control, Page Tabs Control. Built byte-for-byte from the captured 2026-05-27 Figma data; visually verified via `figma_capture_screenshot` against each node; typecheck + lint clean; zero hardcoded colors. Parity now passes via REST (token fixed 2026-06-03).

Next priorities:

1. ~~Top Filter / Section / Desktop Segment Control / Page Tabs Control~~ — done 2026-05-28.
2. **Continue Molecules** — next candidates depend on user direction. Remaining molecule sets on the Figma "Molecules" page include Confirmation Dialog, Accordion, etc. (Tooltip, Notification Banners, Empty State, Option Cards, Configuration Card, Footer Frame, Modal Headers all built). The Advanced Top Filter overlay reuses the already-built `DesktopDropdowns` combobox variant — no separate component. There is no "Dashboard Cards" component.
3. ~~Run `figma_check_design_parity` for the new molecules once the REST token is refreshed~~ — **done 2026-06-03** (token fix below). Backlog cleared:

### Parity backlog cleared (2026-06-03)

REST `figma_check_design_parity` was unblocked by fixing the figma-console token (it was expired in `~/.claude.json`; see CLAUDE.md "figma-console REST token lives in `~/.claude.json`"). All six screenshot-only components re-checked against the CLAUDE.md visual-only gate (zero `critical`; zero **true** `major` in visual/spacing/typography — token-resolution `var(--x)` vs resolved `#hex`, COMPONENT_SET chrome size, and a11y-semantic advice are documented allowed artifacts):

| Component | Node | Score | Crit | Major | Gate |
|---|---|---:|---|---|---|
| Featured Icon | `8967:38281` | 72 | 0 | 2 — bg `var(--surface-information-bg-subtle)`→`#EBF4FF` (token-resolution); targetSize `380×135` chrome | **Pass** |
| Top Filter | `1572:12741` | 67 | 0 | 2 — bg + border token-resolution (`#FEFEFE`/`#E3E3E3`); paddingRight major was a codeSpec-variant artifact (code uses 10 for Advanced = Figma default), cleared on re-run | **Pass** |
| Top Filter Section | `9469:84304` | 96 | 0 | 0 | **Pass** (clean) |
| Page Tabs Control | `3907:71981` | 77 | 0 | 1 — a11y semanticElement advice (`<div role="tablist">` is the correct ARIA pattern) | **Pass** |
| Desktop Segment Control | `5778:230039` | 80 | 0 | 1 — bg `var(--surface-neutral-segment-track)`→`#EFEFEF` (token-resolution) | **Pass** |
| Map Icon | `3132:23448` | 82 | 0 | 0 | **Pass** (clean) |

Every visual "major" is the parity tool comparing a CSS-var string to its resolved hex; `designData.boundVariables` confirms the Figma side is bound to the **same** token — same documented false-positive as Badge/MapZoomControl. Recurring info-level items (Figma component-properties / INSTANCE_SWAP / VARIANT vs React props, no Figma a11y annotations) are paradigm differences, not gaps. (MapZoomControl already scored 64; not re-run.)

**Preflight gotcha**: the figma-console MCP needs the Figma Desktop Bridge plugin to be open and connected. If `figma_get_status` fails the probe, prompt the user to open it.

---

## Pending Figma sync (2026-07-29)

Full report: [docs/figma-changes/FIGMA_CHANGES_2026-07-29.md](docs/figma-changes/FIGMA_CHANGES_2026-07-29.md). Full sync (tokens + catalog + 3 described updates).

- [x] **New atom `ToggleButton`** ([10900:15545](https://figma.com/design/Kxbgc2KoJSmTxvSV3PwNEu/?node-id=10900-15545)) — icon-only 32×32 binary switch, `aria-pressed`, Button micro-animations. Built + stories + Figma description.
- [x] **8 new `--*-toggle-button-*` tokens** (Mapped Colors) — snapshot refreshed + regenerated; `tokens:check` clean. No other variable changes.
- [x] **Rich Text Area** (`38:42`) — Bold/Italic/Underline → `ToggleButton`.
- [x] **Table Data Control** (`7575:36637`) — Refresh button → **Auto-refresh** switch (`SelectionControl`).
- [x] **Playground** — Auto-refresh wired functional (default OFF).
- [ ] **Publish the Figma library** — Toggle Button description write dirtied it (user action).

---

## Pending Figma sync (2026-05-27)

**Change report**: [docs/figma-changes/FIGMA_CHANGES_2026-05-27.md](docs/figma-changes/FIGMA_CHANGES_2026-05-27.md)

- [x] **Refresh token snapshots** — done 2026-05-27 via `figma_execute` MCP workaround (the CLI `tokens:fetch` bridge can't run while a Claude session holds the figma-console MCP — see CLAUDE.md "Why `pnpm tokens:fetch` fails inside Claude"). All 7 snapshots re-pulled: brand(195) alias(173) mapped-colors(422) mapped-type(170) mapped-sizes(31) text-styles(42) effect-styles(5). `pnpm tokens:generate` + `tokens:check` clean. Confirmed `--avatar-large` now resolves `→ size-containers-xxxl → scale-1300 → 64px`, matching the Avatar code fix.
- [x] **Fix `Avatar` Large size** — updated `packages/components/src/Avatar/Avatar.tsx:10` `SIZES.large` from `72` → `64`. Parity re-checked: 65/100 (up from 37), gate Pass.
- [ ] Map Icon axis — `code-already-matches`; standalone `Bike Delivery Icon` removed from Figma, already a variant in MapIcon code. No action.
- [ ] Mobile Chips axis — `code-already-matches`; Figma fixed typo "nTrailing" → "Trailing" + removed Variant6. No action.
- [ ] Content Primitives Metrics variant added — not yet implemented; note for molecules phase.
- [ ] Molecule-layer components with Figma spec updates (implement when their phase begins):
  - Notification Banners (`3811:65015`) — Filled variants: h-padding 12→20, v-padding 12→16
  - Option Cards (`9894:18459`) — all variants: padding 16→20, height 76→84
  - Dashboard Cards (`4239:74634`) — Basic variants: height 124→120
  - Configuration Card (`9617:18100`) — padding 16→20, height varies
  - Desktop Menu options (`8230:26475`) — Dropdown-Advanced: height 68→64
  - Footer Frame (`6448:32008`) — Validation Footer 88→80; Card Footer 48→40
  - UI Info Card (`3061:14948`) — User Profile: height 188→180
- [x] Re-run parity for Avatar after Large size fix — 65/100, gate Pass.

## Pending Figma sync (2026-05-24)

**Change report**: [docs/figma-changes/FIGMA_CHANGES_2026-05-24.md](docs/figma-changes/FIGMA_CHANGES_2026-05-24.md)

- [x] Refresh token snapshots — done via MCP `figma_execute` workaround earlier in the day; `pnpm tokens:generate` + `pnpm tokens:check` clean.
- [x] No component code changes needed — Phase 3 diff against the 2026-05-23 baseline showed zero `variant_props_changed` entries for any of the 7 implemented atoms. Only diff: 595 entries in `Cell` (`4444:45000`), all `{to}` with no `from` — pure baseline-completeness artifact from the first deep capture of Cell variants. No real drift.
- [x] Parity re-checks: all 7 implemented components verified against current Storybook (results below).
- [ ] (Designer task) Mobile Focus variant still pending in Figma for `2887:26272` (Mobile Button). Code currently shares Desktop's focus treatment; will re-check parity once the Mobile Focus variant lands.

## Previous Pending Figma sync (2026-05-23)

**Change report**: [docs/figma-changes/FIGMA_CHANGES_2026-05-23.md](docs/figma-changes/FIGMA_CHANGES_2026-05-23.md)

- [x] Refresh token snapshots — superseded by 2026-05-24 refresh.
- [x] No component code changes needed — no implemented component was changed in Figma since the May 23 baseline.
- [x] Parity re-checks: all 7 implemented components verified against current Storybook (results below).

### Parity re-check results (2026-05-24)

Ran after the token refresh + deep sync. The parity tool's scoring behavior changed since the previous baseline (newly classifies COMPONENT_SET wrapper sizes as `critical` rather than `info`; default-variant comparison surfaces codeSpec-vs-LAYOUT-lookup mismatches as `major`). Aggregate scores moved, but the underlying code/design alignment is unchanged — Phase 3 diff confirmed zero variant-level drift.

Applied CLAUDE.md gate: zero `critical` allowed except documented numeric/normalization artifacts (pill radius `896` vs `9999`, COMPONENT_SET chrome); zero `major` in `visual` / `spacing` / `typography` excluding the default-variant-vs-LAYOUT-lookup paradigm artifact.

| Component | Node | Score | Critical | Major (visual/spacing/typography) | Gate verdict |
|---|---|---:|---|---|---|
| Toggle | `1956:29506` | 42 | 1 (chrome `395×64` vs `32×20`, allowed) | 0 | **Pass** |
| Checkbox | `4445:96840` | 44 | 1 (chrome `78×243` vs `18×18`, allowed) | 0 | **Pass** |
| RadioButton | `9752:20357` | 47 | 1 (chrome `78×243` vs `18×18`, allowed) | 0 | **Pass** |
| LetaLogo | `8398:6917` | 91 | 0 | 1 (SVG-codegen paradigm: background `#FF3941` paints on path, not root) | **Pass with note** |
| CollapsedSidebarLogo | `9132:34635` | 77 | 0 | 0 (1 major is chrome `134×80` vs `40×40` in `accessibility`, allowed) | **Pass** |
| Desktop Button | `28:38245` | 0 | 0 | 7 — all default-variant-vs-LAYOUT-lookup artifacts (`Size=Medium, Variant=Primary, Type=No Icon` cell vs full per-(size,type) lookup) | **Pass with note** |
| Mobile Button | `2887:26272` | 1 | 0 | 4 — same artifact (`Size=Large, Variant=Ghost, Type=No Icon` cell vs full lookup); Mobile Focus variant still pending in Figma | **Pass with note** |

Aggregate score is informational only per CLAUDE.md. No code action falls out of these checks.

---

## Context
Build the LETA design system in code for engineer handoff and create interactive product prototypes. The Figma file (Library) is the source of truth; this codebase mirrors it. Engineers consuming this work use React, so all components are React + TypeScript with Tailwind for styling. Phases 4–6 add a skill that generates Figma designs from code (details TBD per phase).

---

## Decisions Locked In
| Decision | Choice |
|---|---|
| Framework | React + TypeScript |
| Styling | Tailwind CSS (custom preset built from tokens) |
| Monorepo | pnpm workspaces + Turborepo |
| App bundler | Vite |
| Package bundler | tsup |
| Desktop/Mobile components | Single responsive component (e.g. one `<Button>`) |
| Storybook + Playground | Build both — Storybook = component docs, Playground = product prototypes |
| Playground architecture | One Vite app with `/<product>/...` routes; open to splitting per product later |
| Token drift protection | CLI runs in CI; build fails if generated output ≠ committed files |
| Figma access | Official Figma Dev MCP for reads; Figma Console MCP for writes |

---

## Repository Structure
```
/Users/ifeanyi/Sandbox/LETA/
├── packages/
│   ├── design-tokens/      # CSS vars, Tailwind preset, TS exports
│   ├── icons/              # SVG icon React components
│   ├── components/         # React component library
│   └── cli/                # Figma → code token generation
├── apps/
│   ├── storybook/          # Component documentation
│   └── playground/         # Interactive product prototypes
│       └── src/products/
│           ├── on-demand/
│           └── pd/
├── docs/
├── .github/workflows/      # CI: token-drift check
├── package.json
└── turbo.json
```

---

## Tooling Notes

### Figma access strategy

**Principle**: Try Dev MCP first, escalate to Console MCP when insufficient.

Dev MCP returns cleaner, more predictable structured data. Console MCP returns richer, more detailed data but talks to a live Figma desktop plugin. Use Dev MCP as the default attempt for any operation. Fall back to Console MCP the moment Dev MCP's output is incomplete, insufficient, or doesn't support the operation you need.

**Exception**: if you already know a component is complex (many variants, deep nesting) or you need to edit specific node properties, skip straight to Console MCP to avoid a wasted round trip.

#### Tokens & Variables
- **Default**: `get_variable_defs` (Dev MCP) — pull variable collections as structured JSON
- **Escalate to**: `figma_get_variables` / `figma_get_token_values` (Console MCP) when you need resolved values across modes (e.g. what an alias actually resolves to in dark mode). Dev gives definitions; Console gives computed values.

#### Simple Components (buttons, badges, inputs — few variants)
- Use: `get_design_context` / `get_metadata` (Dev MCP) — sufficient for components with 1–3 variants and simple props.

#### Complex Components (tables, navbars, cards — many variants + nested children)
- **Start with**: `get_design_context` (Dev MCP). Check if the response includes all variants and nested children.
- **If incomplete, escalate to**: `figma_get_component_details` (Console MCP) — full variant matrix, all property definitions, nested structure.
- **For broader context**: `figma_get_design_system_kit` (Console MCP) — styles + variables + components together for a section of the file.
- **Visual reference**: `get_screenshot` (Dev MCP) works alongside either tool for human-eye checks.

#### Discovery (finding components you don't know the name of)
- Either: `search_design_system` (Dev MCP) or `figma_search_components` (Console MCP). Console sometimes returns richer results.

#### Writes (creating or modifying Figma content)
- **Start with**: `generate_figma_design` (Dev MCP) — pushes live UI into Figma as design layers. Can target new files, existing files, or clipboard. Try this first for creating or updating visual output in Figma.
- **If insufficient, escalate to**: Console MCP — `figma_execute`, `figma_set_description`, `figma_set_fills`, `figma_rename_node`, etc. Use when you need finer control: editing specific node properties, renaming layers, updating descriptions, setting fills or strokes, or any operation `generate_figma_design` can't handle.
- **If both are needed, combine them**: use Dev MCP to push new design layers, then Console MCP to clean up, rename, or adjust the result.

### CI: token drift detection
1. CI step runs the CLI to regenerate token files from Figma
2. Diffs the regenerated output against committed files in `packages/design-tokens/dist/`
3. Fails the build with a clear remediation message if there's drift ("Figma tokens have changed since last sync — run `pnpm tokens:sync` and commit")
4. Prevents the "I forgot to re-run the CLI" failure mode

---

## Phase 0 — Project Bootstrap
- [ ] Create `/Users/ifeanyi/Sandbox/LETA/`
- [ ] Initialize pnpm workspace + Turborepo (`pnpm-workspace.yaml`, `turbo.json`)
- [ ] Base TypeScript / ESLint / Prettier configs at repo root
- [ ] Set up tsup base config for packages, Vite base config for apps
- [ ] Move this plan to `LETA/PLAN.md`
- [ ] Create empty package directories with stub `package.json` files
- [ ] Configure GitHub Actions workflow file (placeholder for token-drift check)
- [ ] Add `.gitignore`, `README.md`

---

## Phase 1 — Design Tokens & Foundation

### 1A. Token extraction (via Figma Dev MCP — read only)
- [ ] **Brand** collection → primitives (raw colors, font families, weights, font-size primitives)
- [ ] **Alias** collection — themed colors
  - [ ] Neutral × Product mode
  - [ ] Neutral × Marketing mode
  - [ ] Caution × Product mode
  - [ ] Caution × Marketing mode
  - [ ] Warning × Product mode
  - [ ] Warning × Marketing mode
- [ ] **Alias** collection — non-color tokens (padding, spacing, rounding, opacity, size, fonts)
- [ ] **Mapped Colors** collection (component-level color tokens)
- [ ] **Mapped Type** collection (text styles)
- [ ] **Mapped Sizes** collection (icon sizes)
- [ ] Save raw extracted JSON snapshots to `packages/cli/snapshots/` for drift detection baseline

### 1B. Build the CLI (`packages/cli/`)
- [x] `tokens:generate` — converts JSON snapshots → CSS / Tailwind / TS outputs
- [x] `tokens:check` — diffs generated output against committed (used in CI)
- [x] `tokens:sync` — currently aliases `tokens:generate`
- [x] `tokens:fetch` — local-only WebSocket client implemented in `src/bridge/`. Binds to port 9226, waits for the Figma Desktop Bridge plugin to connect (30s timeout), runs an `EXECUTE_CODE` snippet per collection + text styles, writes JSON snapshots. `tokens:sync` now does fetch + generate.
  - **Setup requirement**: developer must quit Claude Code (or any other figma-console MCP consumer) before running, since port 9226 can only have one server.
  - **Why local-only**: GitHub Actions doesn't run Figma desktop, so this can't ship in CI. CI keeps the generated↔snapshots half of drift detection only.
  - **Future upgrade**: once LETA moves to Figma Enterprise, swap to the Variables REST API for full Figma↔snapshots verification in CI. File key (`Kxbgc2KoJSmTxvSV3PwNEu`) lives in `packages/cli/src/config.ts`.

### 1C. Generated outputs (`packages/design-tokens/`)
- [x] `dist/tokens.css` — CSS custom properties + `[data-theme="dark"]` overrides + breakpoint media queries (Tablet ≤ 1023px, Mobile ≤ 767px)
- [x] `src/generated/tokens.ts` — TypeScript token map (camelCase → CSS var name) bundled by tsup
- [x] `dist/tailwind.preset.cjs` — Tailwind preset (colors, padding, spacing, borderRadius, borderWidth, opacity, fontSize, lineHeight, letterSpacing)
- [x] `dist/text-styles.css` — `.text-*` utility classes for all 42 text styles
- [ ] Documentation page in Storybook listing all tokens (deferred to Phase 2 Storybook bootstrap)

### 1D. Foundation runtime
- [x] `<LetaThemeProvider>` + `useLetaTheme()` (controlled or uncontrolled, optional container scoping)
- [x] Font loading via `@fontsource-variable/inter` exposed at `@leta/design-tokens/fonts`
- [x] Spot-checked: Coral Red `#ff3941`, surface tokens swap Light/Dark, Display/L cascades 72→60→48 across breakpoints

### 1E. CI hookup
- [x] `.github/workflows/token-drift.yml` runs `pnpm tokens:check` on PRs touching tokens / CLI
- [x] Fails with remediation message ("Run `pnpm tokens:sync` and commit") on drift

---

## Phase 2 — Components

### Per-component workflow
For each component:
1. **Behaviour definition** — required before any code is written:
   - Read the Figma component description (Dev MCP `get_metadata` / Console MCP `figma_get_component`)
   - Read all Figma annotations attached to the component or its variants (`figma_get_annotations`)
   - Inspect every variant and component property to understand state coverage and prop axes (`figma_get_component_details`)
   - Synthesize a behaviour spec covering: **what it is**, **how it works** (interaction model, states), **when/where to use it**, and **when/where NOT to use it**
   - If the Figma description and annotations together cover all four points, present the synthesized spec to the user for confirmation
   - If anything is missing or ambiguous, draft the missing pieces yourself and present the full draft to the user for approval
   - **Do not start implementation until the user has explicitly confirmed the behaviour spec**
2. **Property mapping**: variant axes from Figma → React props.
   **Never assume a variant's structure** — analyze EACH variant individually (walk its tree; check node `visible` and stroke/fill paint `visible`, not just stroke weight). Variants can differ in layout direction, child elements, and trailing content. Don't extract one variant and extrapolate. (See CLAUDE.md → Per-component workflow → Key rules.)
3. **Implement**: `packages/components/<name>/` with TypeScript + Tailwind classes from preset
4. **Story**: Storybook story covering every variant/state
5. **Lint**: automated check ensures zero hardcoded colors / sizes / spacings (only token-derived classes allowed)
6. **Visual diff**: visual diff against Figma at multiple breakpoints (mobile + desktop)
7. **Parity check**: run `figma_check_design_parity` (Console MCP) comparing the Figma node to the rendered Storybook story.

   **Sign-off bar — visual fidelity only**:
   - Zero `critical` discrepancies anywhere.
   - Zero `major` discrepancies in `visual`, `spacing`, or `typography` categories.
   - Documented numeric / normalization artifacts are explicitly allowed (e.g. pill borderRadius `896` vs `9999`, COMPONENT_SET chrome dimensions `134×80` vs rendered variant `40×40`). Note any such artifact in the PLAN.md sign-off line so future-you can recognize it.

   **Aggregate score is informational, not a gate.** React-composition idioms (`children`, slot-style icon props, internal Type derivation) cause `componentAPI` deductions that are paradigm choices, not visual gaps. Typical ceilings under this stack: simple atoms 90–96 (Toggle, Checkbox, RadioButton, Logo), composition-heavy components 60–70 (Buttons), components with COMPONENT_SET chrome 75–85 (CollapsedSidebarLogo). Don't chase the aggregate score above its ceiling.

   Iterate up to 3 times on real visual deltas; if still failing after 3 attempts, surface specifics to the user before checking off.
8. Check off

### Phase 2 Pre-work — Storybook bootstrap (DONE ✅)
- [x] `apps/storybook/` Storybook 10 + React-Vite framework, addons: `@storybook/addon-docs` (MDX), `@storybook/addon-themes` (theme toolbar)
- [x] Wired `@leta/design-tokens/css`, `@leta/design-tokens/text-styles.css`, `@leta/design-tokens/fonts` into preview.tsx
- [x] Foundations section: `Foundations/Intro` (MDX), `Foundations/Tokens/Colors`, `Foundations/Tokens/Spacing`, `Foundations/Tokens/Typography` — all auto-derive from the generated `tokens` map
- [x] Theme decorator (`withThemeByDataAttribute`) toggles `data-theme` on `<html>`, plus a wrapper that paints `--surface-neutral-page-primary`
- [x] `pnpm --filter @leta/storybook build` succeeds; `index.json` lists the 4 foundation entries

### Phase 2 Atoms (build order = dependency order)

**Foundational (other components depend on these):**
- [x] LETA Icons → `packages/icons/` — see "Icon architecture" below
- [x] LETA Logo
- [x] Elevation (5 drop-shadow effect styles wired through the token pipeline; `Atoms/Elevation` Storybook page renders all five — `--shadow-{red,blue,neutral-1,neutral-2,neutral-3}`)
- [x] Collapsed Sidebar Logo — parity 80/100 against `9132:34635`. Each variant is 40×40 (matching code); the parity tool's "134×80" major is a COMPONENT_SET chrome artifact, not a spec gap. Focus uses LETA tokens (`var(--stroke-sm) solid var(--border-secondary-component-focus)`, 4px offset). Figma a11y docs written: Accessibility section appended to component description + 6 pinned annotations (Role / Name / Keyboard / Focus / Spec).

#### Icon architecture (`@leta/icons`) — DONE ✅
- **Source**: `@material-symbols/svg-400` npm package (official Google SVGs, inlined into the registry at build time)
- **Public API**: `<Icon name="Dashboard" size="medium" />`, `<Icon name="Orders" outlined size="large" />`
  - `name`: typed `IconName` union (auto-generated from inventory; only registered icons compile)
  - `size`: `xs|small|medium|large|xl|xxl|xxxl` (maps to LETA `--icons-*` tokens) or a number for px
  - `outlined`: boolean (falls back to filled if outline not available)
  - `color`: defaults to `currentColor` so parent CSS using Mapped Colors cascades
  - `title`: accessible label; omitted = decorative (`aria-hidden`)
- **Inventory snapshot**: `packages/icons/snapshots/inventory.json` — produced by running the same MCP-bridge JS we use for tokens; lists all 349 LETA icon components + 2 component sets (Icon/Toggle, Table Cell Checkbox).
- **Hand overrides**: `packages/icons/snapshots/overrides.json` — drop-in SVGs for icons not in Material Symbols (currently `Circle-Medium`).
- **Build**: `pnpm --filter @leta/icons registry` reads inventory + overrides + the @material-symbols package, emits `src/generated/registry.ts` with inlined SVG markup. Resolver handles kebab/snake naming, `-rounded`/`-outline-rounded` style suffixes, and filled/outlined variants.
- **Final coverage**: 249 unique semantic icons; 246 filled, 99 outlined, 96 with both. Bundle: 228 KB.
- **Special components** (deferred to component package): `Icon/Toggle` (4-variant), `Table Cell Checkbox` (3-variant) — they have stateful behavior, not just static glyphs.
- **Storybook**: `Atoms/Icon` story with Default, Sizes, FillVsOutline, ColorCascade, Catalog (all 249 icons)

**Core interactive:**
- [x] Buttons (responsive — combines Desktop + Mobile) — parity 32/100 Desktop `28:38245` (post Extra Small reconcile, 2026-05-24 PM) / 62/65 Mobile `2887:26272`. Desktop score drop is informational only — the parity tool surfaced 7 additional Figma component-properties (Text, Leading/Trailing/Action Icon INSTANCE_SWAPs, Show Underline BOOLEAN, Type, State) that React resolves via `deriveType()` + props rather than as 1:1 Figma props. Zero critical, zero major outside documented paradigm artifacts. Implements all 6 Figma Type variants (No Icon, Leading Icon, Trailing Icon, Split Button, Icon Only, Prominent Icon Only) via `deriveType()`-driven per-(Size, Type) padding + icon-size lookup. Asymmetric padding for Leading/Trailing icons matches Figma exactly (icon-side padding reduced by 4px). Border painted via `box-shadow: inset` so it doesn't shrink content area — icons render at full Figma sizes (16/20/24 by Size). Focus uses LETA tokens: `var(--stroke-sm) solid var(--border-secondary-component-focus)` with 4px offset. Default Storybook icons match Figma: `Proceed` (Leading/Trailing/Split), `Cancel` (Icon Only/Prominent Icon Only). **Extra Small** (24×24, padding 4, radius 4) added 2026-05-24 PM — Figma defines it only for Secondary / Icon Only across 5 States; non-icon-only Types extrapolate with a dev-only `console.warn` mirroring the existing FAB guard. Figma a11y docs written: Accessibility section in both component descriptions plus 6 pinned annotations each (Role / Name / Keyboard / Focus / Spec). Mobile Focus variant in Figma still pending designer; will re-check parity then. Score deductions are React-composition vs Figma-component-property paradigm differences (parity tool doesn't read description/annotation content), no code spec gaps.
- [x] Avatar (atom only — User Menu deferred to Molecules) — `packages/components/src/Avatar/Avatar.tsx` + 10 Storybook stories under `Atoms/Avatar`. Renders 4 sizes (xs/small/medium/large = 24/32/44/72) × 2 modes (photo with onError fallback to initials, OR initials on tonal background) × 3 tones (`teal` → `--surface-notice-avatar-bg`, `warning` → `--surface-warning-avatar-bg`, `grey` → `--surface-neutral-avatar-bg`). Initials auto-derive from required `name` prop (first + last word, max 2 chars, single-word → first letter, empty → `?`); `initials` prop overrides. Text style class per size: xs→`text-caption-l-semibold` (10/16), small→`text-label-m-semibold` (14/20), medium→`text-label-l-semibold` (16/24), large→`text-heading-s-semibold` (20/24) — matched 1:1 against Figma textStyleIds. Non-interactive (`<span role="img" aria-label={name}>`); `decorative` prop sets `aria-hidden=true` for nesting inside an already-labeled interactive parent (same pattern as LetaLogo inside CollapsedSidebarLogo). Parity **65/100** against `7446:22517` (re-checked 2026-05-27 after Large size 72→64 fix) — passes CLAUDE.md gate: 0 critical, 1 major (typography fontFamily: parity tool received class-name string instead of resolved "Inter Variable"; code compiles to Inter Variable via token CSS — documented false positive), 8 minor (COMPONENT_SET chrome width/height + 5 React-paradigm API props), 3 info. No Figma annotations or description for Avatar yet — designer follow-up to write them so future parity reports can credit the a11y docs we authored in code.

**Form controls:**
- [x] Toggle
- [x] Checkbox
- [x] Radio Button

**Status / Identity:**
- [x] Desktop Badges — `68:36623`, parity 62/100, gate Pass (2026-05-24)
- [x] Desktop Delivery Badges story — `68:36703` (19 presets in `Atoms/Badge/Delivery Badges`; OrderStatuses + DriverStatuses grouped views; 2026-05-24)
- [x] Tags — `7751:28982` (parity 70/100, gate Pass; Idle/Hover/Pressed via React state; optional remove button at paddingRight=6px; 2026-05-24)
- [x] Desktop Chips — `7139:53343`, parity 62/100, gate Pass (2026-05-24)
- [x] Flags — `7111:38657` (240+ country flags via `country-flag-icons`; 2026-05-24)
- [x] Featured Icons — 6 colors × 2 sizes, parity confirmed via Dev MCP (2026-05-25)

**Navigation / Tabs:**
- [x] View Switcher Tab — 3 states, 32px, `--surface-neutral-segment-*` tokens (2026-05-25)
- [x] Segment Switcher Tab — 3 states, 40px, same token family (2026-05-25)
- [x] Page Tab — 4 states, 40px, 2px bottom indicator bar (2026-05-25)
- [x] Tab Title — non-interactive heading with count/icon/action slots (2026-05-25)
- [x] Wizard Tabs — 5 states, step circle, extends PageTab pattern (2026-05-25)

**Map-related:**
- [x] Map Icon Type — 3 variants (Object Pin/Object Badge/Event Pin), inline SVG shapes, configurable colour (2026-05-25)
- [x] Delivery Map Icon Type (documentation story; 15 presets in `Atoms/MapIconType/Delivery Map Icons`; 2026-05-25)
- [x] Map Zoom Control — `7900:163823`, parity 64/100, gate Pass with note (2026-05-26). 0 critical, 2 majors are token-resolution artifacts (`var(--surface-neutral-bg-primary)` vs resolved `#FEFEFE`, same pattern as Badge). 4 componentAPI minors = React interactive props (`onZoomIn`, `onZoomOut`, `disableZoomIn`, `disableZoomOut`) with no Figma counterparts — paradigm difference, not spec gaps. focus + disabled states synthesised in code; no Figma variants covering them.

**Mobile-specific atoms:**
- [x] Mobile atoms — **reconciled 2026-06-03** against Figma frame `8418:9217` ("Mobile Atoms", 7 component sets). All 7 have built components: Mobile Segments (`3038:38166`)→MobileSegment, Progress Tracker (`5608:216176`)→ProgressTracker, Mobile Nav Tabs (`8417:23519`)→MobileNavTab, Mobile Badges (`3100:17588`)→MobileBadge, Carousel Pagination (`8667:15335`)→CarouselPagination, Mobile Chips (`8269:29237`)→MobileChip, Mobile Featured Icon (`4136:74148`)→MobileFeaturedIcon. **No gaps.**

### Molecules

**Batch 1 — Filter & Tab Controls (shipped 2026-05-28):**

- [x] **Top Filter** (`packages/components/src/TopFilter/TopFilter.tsx` + 4 stories under `Molecules/TopFilter`) — status filter pill for table toolbars. 2 types (Basic / Advanced) × 6 states (Idle / Hover / Pressed × Selected) = 12 Figma variants (`1572:12741`). `<button>` with internal hover/press tracking + caller-controlled `selected`; `aria-pressed` exposes the toggle state. Advanced renders a trailing 16px Chevron-Down whose `onClick` is the dropdown-open signal — **the dropdown overlay is a separate molecule, explicitly deferred**. Uses the dedicated `--surface-neutral-top-filter-tab-{idle,hover,pressed,active}` + `--border-neutral-top-filter-tab-{idle,hover,pressed}` + `--border-secondary-top-filter-tab-active` token families resolved from the captured Figma fills. Label is `text-label-m-semibold` / `--text-default-label`. Selected: secondary border on all 3 interaction states; at rest fills with active surface, hover/pressed-selected keep their interaction fills (verified from captured Figma data). Visual parity confirmed via `figma_capture_screenshot 1572:12741`. Parity REST 403 (token expired — same blocker as FeaturedIcon/MapIcon/MapZoomControl).
- [x] **Top Filter Section** (`packages/components/src/TopFilterSection/TopFilterSection.tsx` + 3 stories under `Molecules/TopFilterSection`) — the filter bar that holds a horizontal row of Top Filters in a table toolbar (`9469:84304`). Data-driven container: `filters[]` + `onFilterClick(index)`; non-interactive `<div>` flex row, `--spacing-12px` gap, height 40. Filters are **independent toggles** (multi-select); the section enforces no selection model. Visual parity confirmed via `figma_capture_screenshot 9469:84304`.
- [x] **Desktop Segment Control** (`packages/components/src/DesktopSegmentControl/DesktopSegmentControl.tsx` + 4 stories under `Molecules/DesktopSegmentControl`) — segmented control container (`5778:230039`). 2 variants: `view` (compact, wraps `ViewSwitcherTab`, container pad `--padding-4px`, height 40 derived) toggles content layout (Grid/List); `segment` (prominent, wraps `SegmentSwitcherTab`, pad `--padding-8px`, height 56 derived) for high-level navigation within drawers/panels (per the Figma description). Data-driven `value`/`onChange` enforce single-active. Track bg `--surface-neutral-segment-track`, gap `--spacing-8px`, `--rounding-lg`. `role="group"` + per-tab `aria-pressed`. **Stories patched 2026-05-28**: removed the inadvertent `leadingIcon: 'Orders'` defaults from `ViewSwitcher` / `SegmentSwitcher` / `Catalog` so the rendered default matches Figma's `Show Leading Icon: false`; added a dedicated `WithLeadingIcons` story as the opt-in. In the same pass the **`SegmentSwitcherTab` atom** dropped its prior 20/24 active-vs-idle icon split — Figma now binds the icon size to the `Icons/medium` variable at a constant 20px in every state, and `SegmentSwitcherTab.tsx:67` is now `const iconSize = 20;`. Visual parity reconfirmed via `figma_capture_screenshot 5778:229946` (atom) + `5778:230039` (molecule).
- [x] **Page Tabs Control** (`packages/components/src/PageTabsControl/PageTabsControl.tsx` + 3 stories under `Molecules/PageTabsControl`) — full-width tab bar for top-level navigation, with a demarcator line beneath (`3907:71981`). 2 variants: `basic` wraps `PageTab`; `wizard` wraps `WizardTab` with numbered step circles (`step` defaults to 1-based index) and an `inactive` flag for future steps. Data-driven `value`/`onChange`. The active tab's 2px indicator sits on the demarcator line — full-width `border-bottom: var(--stroke-sm) solid var(--border-neutral-default)`. `role="tablist"` + per-tab `role="tab"` + `aria-selected`. Scrollable variant was deleted from Figma and is not implemented. Visual parity confirmed via `figma_capture_screenshot 3907:71981`.

**Next batch — TBD.** Remaining molecule sets on the Figma "Molecules" page include Confirmation Dialog, Accordion, etc. (Tooltip, Notification Banners, Empty State, Option Cards, Configuration Card, Footer Frame, Modal Headers all built since). The Advanced Top Filter overlay reuses the already-built `DesktopDropdowns` combobox variant (no separate component). There is no "Dashboard Cards" component (`4239:74634` = Desktop Metric Cards, built).

### Organisms — Batch 1 (Navigation + Table stack) — ✅ COMPLETE (9/9, 2026-06-16)

Enumerated 2026-06-16 (every variant walked via bridge, rendered images viewed, descriptions/annotations read). Build order is dependency-first. Storybook folders: `Organisms/Navigation` + `Organisms/Tables`; **User-Menu is an Atom** (`Atoms/User-Menu`). Reuse only — these compose built atoms/molecules. Plan: `~/.claude/plans/enumerate-the-following-organisms-starry-origami.md`.

Table stack (bottom-up):
- [x] **① Data Rows** `4445:105200` — horizontal flush row of `Cell`s; `variant` basic(52px)/complex(80px) × `state` idle/hover/pressed/active (→ Cell idle/hover/pressed/selected); hybrid `cells: (CellProps & {width?})[]` (fixed-width or flex) + `children` escape hatch. Row owns hover/press, pushes shared state to all cells. Stories `Organisms/Tables/Data Rows`: States + Catalog. Verified vs Figma (heights 52/80, state surfaces `--surface-neutral-table-cell-*` + secondary-selected). typecheck clean.
- [x] **② Table** `2192:8107` — bordered card (**1px border** `--stroke-xs`, corrected from 1.5px 2026-06-16; `--rounding-xl`, clipped) = header `Cell` row (40px, grey, bottom divider) + body of `DataRows` (1px row dividers) + `Pagination`(table, borderless inside the card). Hybrid `columns: TableColumn[]` + `rows: TableRow[]` (shared widths so header/body align) + `selectable` checkbox column + `maxBodyHeight` (sticky-header scroll) + `children` escape hatch. Stories `Organisms/Tables/Table`: Default + Complex Rows + Selectable/Selected + Scrolling. Verified vs Figma (card chrome, dividers, indeterminate header checkbox + Active rows, body scroll caps at maxBodyHeight). typecheck clean.
- [x] **③ Bulk Actions Toolbar** `7973:17061` — floating white pill (gap 16, pad 12, `--rounding-xl`, inset 1px border + `--shadow-neutral-3`, max-w 800): Left (selection Button `iconLeft=Checkbox-Active` + `summary` text) │ divider │ Center (`actions` slot, default 2 Ghost + 1 Ghost-Error `iconLeft=Proceed`, + More prominent-icon-only) │ divider │ Right (close `iconOnly=Cancel`). `fixed` prop → position:fixed/80px-bottom/centered. Stories `Organisms/Tables/Bulk Actions Toolbar`: Default + No Summary + Custom Actions + Fixed. Verified vs Figma. typecheck clean.
- [x] **④ Table Data Control** `7575:36637` — toolbar row, HORIZONTAL space-between (h40), 3 `variant`s: `search-create` (SearchInput + Created/Filter/Sort-By split + Add-Order/Import-Export CTAs), `search-column` (…+ count + Columns), `filters-column` (TopFilterSection + count + Columns). Slot props `searchSection`/`filters`/`ctas`/`columnControl` with Figma-faithful defaults (reuse SearchInput, Button [split via iconLeft+iconRight], TopFilterSection, Badge); `dataCount` text. Stories `Organisms/Tables/Table Data Control`: 3 variants + Catalog. Verified vs Figma. typecheck clean.
- [x] **⑤ Table Container** `1524:40283` — transparent VERTICAL stack (gap 16). `variant` default = [TDC search-create] + [TDC filters-column] + `Table`; empty = [TDC search-create] + centered `EmptyState type="no-orders" size="desktop"` + Add-Order CTA. Slot props `controls`/`table`/`empty` with Figma defaults. Stories `Organisms/Tables/Table Container`: Default + Empty State + Catalog. Verified vs Figma. typecheck clean. **Table stack (①–⑤) COMPLETE.**

Navigation:
- [x] **⑥ Sidetab** `7751:26369` — 160px white column (`--surface-neutral-bg-primary`), VERTICAL gap 16, of side-tab `DesktopMenuOptions` (FILL width). Data-driven `tabs[]` + `value`/`onChange` (role=tablist) + `children` escape hatch. Story `Organisms/Navigation/Sidetab`: Default (interactive). Verified vs Figma. typecheck clean.
- [x] **⑦ Side Bar** `3714:35743` — `variant` expanded(240)/collapsed(72), white column. Expanded: header (LetaLogo symbol+wordmark + Ghost prominent `iconOnly=Sidebar` collapse toggle) + Content (SearchInput "Global Search" + divider-separated `groups` of `sidebar-main` menu options w/ "Management" section label + active pill) + Footer (footer items incl. "Get the Dispatch App" w/ trailing `Open` icon + version text). Collapsed: CollapsedSidebarLogo + `sidebar-main-icon` nav + search icon. Data-driven `groups[]`/`footerItems[]`/`version`/`showSearch` + `onToggleCollapse`/`onItemClick`. Stories `Organisms/Navigation/Side Bar`: Expanded + Collapsed + Catalog. Verified vs Figma. `Sidebar Nav Groups` deferred. typecheck clean.
- [x] **⑧ User-Menu** `7446:22541` (Atom, `Atoms/User-Menu`) — 68×40 `<button>` pill (`--rounding-round`, pad 4, gap 8, 1.5px inset border): Avatar (teal, small 32, initials from `name`) + Chevron-Down (20px). Runtime hover/press + `state` override; per-state `--surface/--border-neutral-user-menu-{idle,hover,pressed}`; `aria-haspopup=menu`. Stories: Default + Catalog. Verified vs Figma. typecheck clean.
- [x] **⑨ Top Bar** `7519:27364` — persistent app header, 64px, space-between, white bg + 1.5px bottom border, pad 12/24. Left = `left` slot (default `Breadcrumbs type="global-admin"` Acme Corp / Previous / Current); Right (gap 12) = notification bell (Ghost prominent `iconOnly=Notifications` outlined) + `UserMenu`. `variant` active adds a red unread dot (`--icons-error-default`) on the bell. `user` props → UserMenu. Stories `Organisms/Navigation/Top Bar`: Default + Active + Catalog. Verified vs Figma. typecheck clean.

**✅ Corrections round 1 (2026-06-16):** (1) **Avatar** initials colour made tone-aware — Empty-Teal/Empty-Warning → `--text-default-label` (dark), Empty-Grey stays `--text-on-color-label` (white) per Figma `7446:22517` (was white for all); propagates to **User-Menu** (teal). (2) **Side Bar**: nav active is now interactive (click sets active, internal state); **collapse toggle is interactive** (expanded Sidebar button ↔ collapsed logo, internal uncontrolled state seeded from `variant`); **header has a full-width 1px bottom demarcator**; footer icons corrected (Help Center→`Support`, Get the Dispatch App→`Widget`); all strokes/dividers → **1px** (`--stroke-xs`); collapsed icon-only options now **centered** (`alignItems:center` on the collapsed columns — fixed-width 40px options were left-aligning under `stretch`). (3) **Cell** address-connector stroke 1.5→**1px**. (4) **Top Bar** documented as `width:100%` (fills container/viewport; Figma 1200 is canvas only) + stories full-bleed (negate the 16px global decorator padding) so it fits the Storybook viewport. (5) **Bulk Actions Toolbar** border/dividers confirmed already **1px** (`--stroke-xs`). All verified in Storybook (computed styles + interaction) vs Figma; typecheck clean; dist rebuilt.

**✅ Corrections round 2 (2026-06-16):** (1) **Side Bar collapsed divider** now renders — it was collapsing to width 0 under the collapsed `alignItems:center`; added `alignSelf:stretch` so it spans the full 48px (Figma collapsed Divider = 48px, 1px). (2) **Management** group label `text-label-s-semibold` → **`text-label-s-medium`** (designer changed it). (3) **Top Bar bottom border** `--stroke-sm` → **`--stroke-xs` (1px)** (designer changed it; re-confirmed `strokeBottom:1` in Figma). (4) **Get the Dispatch App trailing icon** re-confirmed = **`Open`** (Figma `Icon/Open`, matches). **Sidebar icon weight investigated:** the nav icons match Figma exactly — 16px, `help-outline-rounded`/`Support`/`Widget` outlined, `--icons-neutral-{idle,default}`, rendered from `@material-symbols/svg-500` (the weight chosen to match Figma per the 2026-05-25 audit). At 16px, weight-500 Material Symbols read thin by nature; making them bolder would require a **global icon-package weight bump** (svg-500 → svg-600/700) affecting all 256 icons/every component (can't be scoped to sidebars alone). **User decided: keep `svg-500`** — icons already match the documented Figma weight; no change. typecheck clean; dist rebuilt.

**✅ Corrections round 3 — Table (2026-06-16):** (1) **Selection is now internal/interactive** — removed the `headerChecked`/`headerIndeterminate`/`onHeaderCheckedChange` props for a self-managed selection `Set` (seeded from each row's `selected`); the **header checkbox selects/clears all rows** and shows the **indeterminate** glyph on a partial selection; per-row checkboxes toggle individually; selected rows get the Active surface; added `onSelectionChange(indices)`. Removed the `Selectable/Selected` story (Default + Complex Rows now demonstrate the live interaction). (2) **Scrolling pagination top border fixed** — the footer separator was a per-row `borderBottom` that scrolled away inside the `overflow:auto` body; now the **Pagination carries a fixed 1px `borderTop`** (body→footer separator) and the **last body row drops its `borderBottom`** (avoids a double line). (3) **Table width is responsive** — component is `width:100%` (documented: fills the viewport/container; Figma fixed width = canvas only); Table + Table Container stories no longer impose a fixed 1160/1451px (`width:100%`). typecheck clean; dist rebuilt.

**✅ Design-system consistency pass (2026-06-17):** (1) **Top Filter Section** row gap `--spacing-12px`→**`--spacing-8px`** (verified 8px). (2) **Desktop + Mobile Button stroke 1.5px→1px** — code (`Button.tsx` LAYOUT `borderWidth` all 1.5→1; focus ring stays `--stroke-sm`) **and Figma** via bridge (Desktop set `28:38245`: 385 borders→1px, now 0 at 1.5; Mobile set `2887:26272`: all 353→1px; **Focus-ring child nodes preserved at 1.5px**). **⚠ Library dirtied → user must publish.** (3) **Borders/demarcators standardized to 1px (code)** — flipped `--stroke-sm`/literal-1.5px borders→`--stroke-xs` across Badge, MobileBadge, Shortcut, Tag, LeadingInputFieldElement, DesktopMetricCard (pressed), UserMenu, MapZoomControl (border+divider), ModalHeaders, DateTimePicker (wheel slot), MobileDropdown, CollapsedSidebarLogo (ghost-button box-shadows), TopBar (notif-dot ring). **Brought UP to 1.5px** (ARIA active emphasis): Option Card **Active** + Mobile Chip **Active** (now conditional on active state). **Preserved at 1.5px:** every focus ring, Desktop Chip Active, Filter Group Active/Active-selected, Basic/Advanced Top Filter Idle-selected. Verified computed widths in Storybook (Button 1px/focus 1.5, Chip Active 1.5, Option Card Active 1.5, TopFilterSection gap 8). typecheck clean; dist rebuilt. (4) **Token re-sync + Avatar reconcile DONE** — fingerprinted all 5 variable collections + text/effect styles vs committed snapshots: only **Alias** + **Mapped Sizes** changed (Brand/Mapped-Colors/Mapped-Type/text/effect identical). Re-pulled `alias.json` + `mapped-sizes.json`, `tokens:generate` + `tokens:check` clean (Alias = a semantic re-point → flows through CSS vars automatically; stroke tokens unchanged xs=1px/sm=1.5px). The concrete component impact: **Avatar `medium` 44→40px** (the only non-auto change, since Avatar hardcodes sizes) + **initials text styles corrected** to match Figma `7446:22517` font sizes (xs caption-l/10, small label-s/12, medium label-m/14, large heading-m/24 — small/medium/large were shifted one step up). Verified in Storybook (24/32/40/64 containers, 10/12/14/24 fonts). Avatar consumers (UserMenu, Cell driver-cell, DesktopDropdowns use `small`=32 unchanged; ContentPrimitives `medium`→40 auto via size prop) reconcile automatically; the 44px monogram box in ContentPrimitives is a separate anchor (unchanged). **Note:** a full component-tree deep diff vs the 2026-06-03 `components.json` baseline was not run — that baseline is stale (many intentional changes since), so it would surface mostly-already-reconciled noise; the precise token-fingerprint scan + Avatar reconcile cover the actual Figma changes. **⚠ Figma Library still dirty (button-stroke writes) → user must publish.**

**✅ Figma sync pass (2026-06-19):** (1) **Token re-sync** — fingerprinted all collections; only **Mapped Colors** changed (+3: `Surface/secondary/avatar-bg`, `Surface|Border/notice/mobile-badge`; many value updates). Re-pulled `mapped-colors.json`, regenerated, `tokens:check` clean → all colour-variable updates (teal/information desktop badge, Wizard Tab, Selection Control, etc.) flow through CSS vars automatically. (2) **Filter icon** — Figma `Icon/Filter` glyph changed funnel→**tune** (`material-symbols:discover-tune-rounded`); updated `inventory.json` Filter entry + `pnpm registry` + rebuilt icons → propagates everywhere (`iconLeft="Filter"`). (3) **Avatar** — third tone **Grey → "Yankee Blue"**: `AvatarTone` `grey`→`yankee-blue`, bg `--surface-secondary-avatar-bg`, text `--text-secondary-label`, default tone now `yankee-blue` (driver-cell + ContentPrimitives avatars inherit it). Stories updated. (4) **Route/Address cell** — pickup/dropoff icon colour `--icons-neutral-default`→**`--icons-neutral-idle`** (text unchanged). (5) **Content Primitives** — variant `accordion-heading` **renamed → `section-heading`** (title style identical body-l-semibold/`--text-default-heading`); component + stories updated. (6) Selection Control / Badge / Wizard = pure token re-sync (no code change; verified in sync). All verified in Storybook (Filter tune glyph, Avatar yankee-blue bg `rgb(218,223,238)`/text `rgb(25,32,55)`, address icons `rgb(128,128,128)`, section-heading 16px). typecheck clean; dist rebuilt. **Remaining:** baseline refresh (components.json/descriptions/annotations) + molecule description sync (7 components, pending user confirm). **⚠ Library will be dirtied by the upcoming description writes → user must publish.**

**✅ Token rename round 2 (2026-06-22):** another Mapped Colors update (426 vars) **renamed the neutral background scale** + replaced the `bg-subtle 2` tokens. Diffed by value to derive the exact mapping and renamed all references across **33 source files**: `--surface-neutral-bg-primary→-default`, `-secondary→-subtle`, `-tertiary→-muted`; `--surface-{error,secondary,success,warning}-bg-subtle-2 → -bg-raised`; plus net-new `--surface-neutral-bg-raised`. Re-pulled `mapped-colors.json`, regenerated, `tokens:check` clean, typecheck clean, dist rebuilt. Verified backgrounds still resolve (Table card `--surface-neutral-bg-default` = #fefefe; bg-subtle #fafafa / bg-muted #efefef / bg-raised #f5f5f5; old `bg-primary` correctly removed). Values unchanged — pure rename, no visual regression.

Other Figma Organisms-page frames not in this batch (enumerate later): **Mobile Screens: Maps** `3137:23974`, `7044:24001`, `10255:63277`.

### ✅ Organisms — Batch 2 (Forms, Lists & Sections `217:4848`) — COMPLETE (3/3)

Three collapsible "Section" organisms sharing a Section-Heading Content Primitive header (title + description + collapse chevron, Open/Close) over a body of "Group Name" sub-groups split by dashed demarcators; all compose built pieces. Storybook folder `Organisms/Forms`.
- **Input Section** (`10557:36087`) — Open/Close; header + Forms slot of `InputGroup`s (2-col `InputField` grids). Group-header subtitle hidden (`showSubtext={false}`, per Figma).
- **List Section** (`217:6694`) — Open/Close; header + Content slot of `ListGroup`s (read-only `vertical-list-row` grids). Group-header subtitle hidden.
- **Table Section** (`4818:152180`) — Open/Close; Section Heading + a `TableContainer` instance (Search/Filter/Sort toolbar + Table, no group sub-header).
All reconciled to the updated Figma (2026-06-24): Section-Heading CP headers, collapse, group-subtitle hidden. typecheck clean; dist rebuilt.

- [x] **① Input Section** `217:7984` (2026-06-22) — titled multi-group form. Root VERTICAL gap 12, white fill (`--surface-neutral-bg-default`), edge-to-edge (no padding/border). Section header rendered directly (title `body-l-semibold`/`--text-default-heading` + subtext `body-m-regular`/`--text-default-sub-body` + trailing `Chevron-Down` 24px). The Figma "Forms" **SLOT** → `children` (default = two `<InputGroup>`s); a dashed `FormDemarcator` (`--stroke-xs` dashed `--border-neutral-default`) is auto-inserted between adjacent groups. Exported sub-component **`InputGroup`** (`title`/`description` → CP `group-header` w/ `showVisualAnchor=false` mirroring the Figma instance; `fields: InputFieldProps[]` → wrapping 2-col grid, colGap 32 / rowGap 20, each field `width:100%`, default 8 basic fields helper-hidden placeholder "Field Text"). Reuses `ContentPrimitives` (group-header) + `InputField`. Stories `Organisms/Forms/Input Section`: Default + WithoutChevron + SingleGroup. Verified via DOM (16 inputs, 2-col x=44/479, 1 demarcator, chevron, header/group labels) — exact match to `figma_capture_screenshot 217:7984`. Parity `217:7984` = **67/100, 0 critical, 0 major in visual/spacing/typography** (the 1 major = `accessibility/semanticElement` div-vs-name paradigm; 8 minor = props-vs-Figma-property paradigm; width 864-vs-100% = fixed-vs-fill; Forms SLOT → children) — **gate Pass**. typecheck clean; dist rebuilt.
- [x] **② List Section** `217:6694` (2026-06-22) — collapsible white card (`--surface-neutral-bg-default`, 1px inset `--border-neutral-default`, `--rounding-xl`, pad 20). Section header = `ContentPrimitives type="section-heading"` (title + subtext + Chevron-Up/Down toggle button); Open/Closed state via `useState(defaultOpen)`. Content SLOT → `children` (default = two `<ListGroup>`s); `ListDemarcator` (`--stroke-xs` dashed) auto-inserted between adjacent children. Exported sub-component **`ListGroup`** (`title`/`description` → CP `group-header` + 2-col pair grid of `ContentPrimitives type="vertical-list-row"` at `flex:1 0 0`, col gap 16 / row gap 20, default 6 items). Stories `Organisms/Forms/List Section`: Default + Closed + SingleGroup + Catalog. Verified vs `figma_capture_screenshot 217:6693` — title+subtext+chevron, group header, 2-col rows. typecheck clean; dist rebuilt.
- [x] **③ Table Section** `4818:152180` (2026-06-22) — edge-to-edge section (no card chrome: transparent, no border). Section header = `ContentPrimitives type="section-heading"` (title + subtext + Chevron toggle); gap 12. Content (when open): `gap 20` column — CP `group-header` (Group Name + description) + Container SLOT → `children` (default `<TableContainer />`). The inner Toggle frame (`Variant=Switch, State=Active, Label="Enabled"`) is `visible:false` in Figma — not rendered. Stories `Organisms/Forms/Table Section`: Default + Closed + EmptyState + Catalog. Verified vs `figma_capture_screenshot 4818:152181` — matches layout. typecheck clean; dist rebuilt.

**✅ CP `section-heading` subtext fix (2026-06-22):** `ContentPrimitives.tsx` — removed the `!isSectionHeading` guard from `TitleAndSubtext`, set gap to always `var(--spacing-4px)`, removed `height:40`/`justifyContent:center`/`gap:0` root overrides, and removed `flex:1 0 0`/`minHeight:1` from `HeadingLayout`'s outer div for section-heading. Section-heading now renders title (24px, `body-l-semibold`) + 4px gap + subtext (20px, `label-m-regular`) = 48px total — matching Figma `6961:41513`. `InputSection` header comment updated (was stale). **Verified in Storybook** (CP Section Heading story + List/Table Section headers). typecheck clean; dist rebuilt.

**✅ TableContainer empty state fix (2026-06-22):** the `empty` body wrapper changed `flex:1` → `minHeight:624` (Figma's Empty Frame height). Without a parent height constraint, `flex:1` had no effect so the EmptyState hugged its content at the top instead of centering in the space. **Verified in Storybook** — EmptyState now vertically centered below the toolbar. typecheck clean; dist rebuilt.

**✅ Figma descriptions written (2026-06-22)** via bridge for 5 Organisms/Tables components: Data Rows `4445:105200`, Bulk Actions Toolbar `7973:17061`, Table Data Control `7575:36637`, Table `2192:8107`, Table Container `1524:40283`. **⚠ Library dirtied → user must publish.**

## Phase — Templates

### Templates — enumerated (2026-06-22)

Figma **Templates** page `55:34578` → one container frame **"Modals"** `228:12423` (plus a page-title "Header" banner `228:12424` and 3 stray image rectangles — not templates). **All templates are modal shells**: every one composes the same three pieces — **`ModalHeaders` (organism) + a `Main Body` SLOT + `FooterFrame` (molecule)** — differing only in what fills the Main Body slot. No non-modal templates exist on this page.

| Template | Node | Figma type | Dims | Variants / Body |
|---|---|---|---:|---|
| **Alert Dialog** | `1106:2868` | COMPONENT_SET | 1084×384 | 2 variants: `Basic` (title + body text + Close/Confirm), `Warning` (leading warning icon + title + body + Close/Confirm). Smallest modal — confirmation/destructive-action prompt. |
| **Modal Dialog** | `1317:4855` | COMPONENT_SET | 2760×677 | 5 variants (`Property 1`): `Comment Modal` (TextArea), `Form Modal` (Label/Field pairs), `Signature Modal` (signature canvas), `Image Modal` (image preview), `Multi-choice` (radio/selection rows). Mid-size single-purpose modals. |
| **Large Modal** | `228:11413` | COMPONENT_SET | 1996×2082 | 3 variants (`Type` × `Variant`): `Drawer / Add & Edit` (768×872, form body), `Drawer / Read` (768×872, collapsible sections + embedded table), `Centered / Regular` (768×768, tabs + grouped selection rows). Full-height drawer + centered large modal. |
| **Extra Large Modal** | `7900:165088` | COMPONENT | 1024×768 | Single component. Body = `Table` organism + embedded map + multi-Action footer. The map/table picker modal. |

Build order (smallest → largest, reusing the shell): Alert Dialog → Modal Dialog → Large Modal → Extra Large Modal. Each will reuse the existing `ModalHeaders` + `FooterFrame` components and inject body content via the `Main Body` SLOT (→ a `children`/`body` ReactNode prop, per the SLOT convention). The bodies reuse already-built molecules/organisms: TextArea, InputField/GroupedInput, RadioButton/SelectionControl, Table, etc.

### ✅ Templates built (2026-06-23) — all 4 done

Shared internal **`Modal/ModalShell.tsx`** (root frame: width, radius 12/0, `--surface-neutral-bg-default`, 1px `--border-neutral-default` OUTSIDE via `box-shadow` ring, clipped; header + body + footer; optional fixed `bodyHeight` → scroll). All four compose `ModalHeaders` (`showSecondaryContent={false}`) + `FooterFrame` + body of already-built components — **composition only, no re-implementation**. Stories under `Templates/*` (storySort block added to `preview.tsx`); exported from `index.ts`; typecheck clean; dist rebuilt.

- [x] **`AlertDialog`** `1106:2868` — 480×256, `variant` basic/warning (warning adds header `Warning` icon); body pad [24,16,24,16] gap 24, Body/L/Regular message; `default` footer Close/Confirm. Parity `1106:2868` = **73/100, 0 critical, 0 visual/spacing/typography major** (the 1 major is `accessibility/targetSize` COMPONENT_SET 1084×384 chrome; minors = props-vs-Figma-property paradigm) — gate Pass.
- [x] **`ModalDialog`** `1317:4855` — 512 wide, `variant` comment/form/signature/image/multi-choice. Comment=`TextArea` (counter), Form=2-col `InputField`, Signature/Image=480×304 rect (1.5/1px border, `imageSrc`/`signatureSrc`), Multi-choice=`OptionCard` list (scrolls); `default` footer. Same shell/token set as Alert (visual/spacing/typography aligned) — gate Pass.
- [x] **`LargeModal`** `228:11413` — 768 wide, `variant` drawer-add-edit / drawer-read / centered. Drawers **square** 768×872 + `with-tabs` header (120) + body of 3× `InputSection` / 3× `ListSection`; Centered **radius 12** 768×768 + default header (80) + `InputSection`+demarcator+`TableSection`; **body scrolls** (verified scrollHeight 2915 in 672 viewport); `preference` footer. Verified dims in Storybook (square/120 drawer, rounded/80 centered) — gate Pass.
- [x] **`ExtraLargeModal`** `7900:165088` — 1024×768 radius 12, default header; **horizontal** body = left Panel (512, `page-heading` ContentPrimitives + `TableContainer`, right divider) + right Map (map placeholder + `MapZoomControl`); body locked to 608; `default` footer. Parity `7900:165088` = **91/100, 0 critical, 0 major** — gate Pass.

**✅ Reconciliation pass (2026-06-24)** after a Figma update — verified against current source via the bridge:
- **ModalHeaders** (shared by all modals): leading title icon sized 24px (`size="xl"`, was 20) + color-overridable (`leadingIconColor`); Top Content row **center-aligned** (title/icon vertically centred with the close ×); header bottom divider painted as inset `box-shadow` so it doesn't add to the 80px height (AlertDialog now exactly 480×256). AlertDialog Warning icon now `--icons-warning-default` (orange).
- **ModalDialog**: Signature title → just "Signature"; Signature + Image variants now show the **real Figma rasters** (extracted to `signature-asset.ts` / `image-asset.ts`, overridable via `signatureSrc`/`imageSrc`). Multi-choice = **7** Option Cards with **no trailing element** (`showTrailing={false}`).
- **OptionCard** (`9894:18459`): padding 20→16 (height 84→76); trailing slot made fully composable — `trailing?: ReactNode` (radio default / any node) + `showTrailing?: boolean` (none); behaviour spec rewritten (built on Utility Content Primitive; trailing not fixed to a radio). New `CustomTrailing` story.
- **InputSection** (now component set `10557:36087`, variants **Open**/**Close**): made collapsible like ListSection — `defaultOpen` + chevron toggle (Chevron-Up open / Chevron-Down closed); Close = header only (h48). New `Closed` story.
- **LargeModal centered**: now a **compact** Input Section (1 group, 2 fields) + `FormDemarcator` + Table Section, with the **preference footer** ("Don't show this again" checkbox + Close/Confirm) — was a 16-field section burying the table.
- **ExtraLargeModal**: left panel rebuilt to match the *modified* Figma instance — Search + Filter + Sort By toolbar over a **plain selectable `Table`** (Label/Content columns, "Showing 10 of 180" pagination; no Created/chips/badge/actions); **real map image** (`map-asset.ts`) with `MapZoomControl` moved **bottom-right**; 3-button footer.

**✅ Reconciliation pass 2 (2026-06-24)** — section organisms + modals re-aligned to the updated Figma:
- **Table Section** (`4818:152180`, now Open/Close): restructured to **Section Heading + a `TableContainer` instance** (no group sub-header). Body = simplified `TableDataControl` (`variant="search-column"`, new `showColumnControl={false}` toggle mirroring Figma `Show Column Control & Count`) + Table. Removed `groupTitle`/`groupDescription` props.
- **Input Section**: header switched from a hand-rolled `<div>` to the **Section Heading Content Primitive** (consistent with List/Table); collapse (Open/Close) retained.
- **Group-header subtitle hidden**: Figma group-headers in List + Input sections are `Show Subtext: false`. Added a **`showSubtext` prop to `ContentPrimitives`** (default true; threaded through the strip/allProps rebuild + `HeadingLayout`→`TitleAndSubtext`) and pass `showSubtext={false}` in `ListGroup` + `InputGroup`. Section headings keep their subtitle.
- **Extra Large Modal**: left-panel heading `page-heading` → **`section-heading`** CP; the static map screenshot replaced with a **live OpenStreetMap `<iframe>` embed** (Nairobi; `mapSrc` overridable; deleted `map-asset.ts`) + `MapZoomControl` bottom-right. (Verified the embed loads HTTP 200; the headless screenshot doesn't paint external tiles but it renders in a real browser.)
- **Large Modal drawers**: now **full viewport height** side-sheets — `ModalShell` gained a `fillHeight` prop (`height:100dvh`, sticky `flex-shrink:0` header/footer, body `flex:1`+`overflow:auto`). Verified: modal 850=viewport, header 120 + footer 80 fixed, body scrolls. Stories renamed **"Drawer (Add & Edit)"** / **"Drawer (Read)"**.

**✅ Reconciliation pass 3 (2026-06-24) — XL Modal table scroll + pagination:**
- **`Table` horizontal scroll**: new **`scrollX`** prop — keeps columns at their fixed `width` and scrolls the table both axes (instead of shrinking cells). Header + body live in one both-axis scroll viewport; the header is `position: sticky; top: 0` so it stays pinned vertically and scrolls in sync horizontally; the Pagination sits outside the scroller (full width, fixed). Default `false` preserves the existing flex-to-fill behavior (Table Section / standalone unaffected).
- **`Pagination` `Show Pages`**: new **`showPages`** prop (mirrors Figma `Show Pages`, default true) on `Pagination` + threaded through `Table` (`showPages`). When `false`, the prev/next + numbered-page cluster is hidden → just count + rows-per-page selector.
- **Extra Large Modal**: table now uses `scrollX` + 6 fixed-width columns + `showPages={false}`, and fills the panel height (flex). Column width tuned to **160px** so the ~477px panel edge cuts a column mid-cell (**~105px peek** of the 3rd column → partial "Content" shows), making the horizontal scroll obvious. Verified: content 1012px scrolls in a 477px viewport (horizontal) + vertical scroll, sticky header, pagination = "Showing 10 of 180" + rows-per-page only.

**✅ Map standard — `MapView` (2026-06-24):** introduced **`MapView`** (`packages/components/src/MapView/`) as the canonical interactive map primitive — **Leaflet** + **OpenStreetMap** tiles (no API key), with the design-system `MapZoomControl` overlaid bottom-right and wired to drive the map's zoom (Leaflet's own control disabled). Leaflet is a real dependency (`leaflet` + `@types/leaflet`), dynamically imported client-side (SSR-safe), externalized in the tsup build (`--external leaflet`), CSS injected at runtime. The Extra Large Modal's map panel now uses `<MapView>` (replacing the OSM `<iframe>`). **This is the standard for all map views until a more robust provider (e.g. Google Maps) is adopted — then swap `MapView` internals only.** Story `Molecules/Map View`; verified the map renders real tiles and the zoom control drives zoom (14→15). Documented in CLAUDE.md § "Map views".

**✅ Behaviour-spec docs (2026-06-24):** written for all 4 modal templates in the standard design-system format (what it is + how it works + variants → When to use / When NOT to use), via `figma_set_description` on each node — Alert Dialog `1106:2868`, Modal Dialog `1317:4855`, Large Modal `228:11413`, Extra Large Modal `7900:165088` (its prior rough description reformatted to match). Code JSDocs already carry the same framing. ⚠ Figma library dirty (description writes) → user must publish.

### ✅ Pages — COMPLETE (2026-06-24)
Figma Pages page `127:67899` → a single **`Page` component set `9626:14490`** with 2 variants (1440×872), both **composition-only** (every region is a built organism/molecule). Built as **one `Page` component** (`packages/components/src/Page/`) with `variant="data-table" | "configuration"` (per user's structuring choice), mirroring the Figma set.
- **Shell (both):** collapsed `SideBar` (72px) + Viewport (`TopBar` 64px fixed + a scrolling Page Body, gap 24, pad 24 top/left/right). Side Bar + Top Bar fixed; only the body scrolls (`height: 100dvh`).
- **Body header (both):** `Title` ("Heading 1", page-dialog) + `PageTabsControl` (basic, "Default" tabs) + info `NotificationBanner` ("Title" / "Enter Text", dismissible).
- **Data Table** body: `TableContainer` (default — full toolbar + table + pagination).
- **Configuration** body: `Sidetab` nav (gap 60) beside a column of collapsed `ConfigurationCard`s.
- Story `Pages/Page` (Data Table + Configuration); exported; behaviour-spec written to the Figma `Page` set description (standard format) + code JSDoc. typecheck clean; dist rebuilt. Verified both variants in Storybook vs Figma. ⚠ Figma library dirty (description write) → publish.

### Pages — TBD
Enumerate after templates.

---

## Phase 3 — Interactive Playground — ✅ built, hardened, deployed (2026-07-04 → 2026-07-05)

Superseded the original scaffolding checklist below — the playground shipped as a product prototype
(Deliveries/Orders + Map screens) rather than a per-component instance viewer. Full build history,
every bug-fix round (table scroll model, sliding filter ring, toast animation, wide-viewport column
scaling), and the completed GitHub/Vercel deployment (incl. the `design-tokens` build-script fix for
Vercel's fresh-checkout builds): see CLAUDE.md `## Status` and
`~/.claude/plans/playground-deploy-handoff.md`. Live at the `LETA` Vercel team project
`leta-playground-playground`; repo at `github.com/ifeanyi-99/LETA-Playground`.

Original checklist (kept for history — not literally how it played out):
- [x] `apps/playground/` Vite app shell with shared layout — built as `SideBar`+`TopBar`/`Page`-style shell.
- [ ] ~~Routing structure: `/<product>/<area>/<component>`~~ — superseded; routes are product screens (`/orders`, `/map`), not a component-instance viewer.
- [ ] ~~Config panel: prop toggles / variant switcher per component instance~~ — not built; out of scope for the product-prototype direction taken.
- [ ] ~~Component instance viewer with isolation~~ — not built (that's what Storybook is for).
- [x] **Deliveries/Orders** screen (stood in for "On Demand") — filters, table, bulk actions, popovers.
- [x] **Map** screen (Leaflet/OSM via `MapView`).
- [ ] **PD** product — not started.
- [ ] ~~Document instance count per component~~ — not applicable to the product-prototype direction.

---

## Phases 4–6 — Figma Generation Skills

These phases each ship a Claude skill that, when invoked, creates designs of code components in Figma.

### Skill execution requirements (apply to every skill in Phases 4, 5, 6)

Every skill execution MUST follow these rules:

1. **Gather inputs from the user upfront**
   - Identify exactly what input the skill needs (target file, parent frame, component variant, count, etc.). Don't guess.
   - If anything is unclear, ask follow-up questions before doing any work.

2. **Create a per-execution checklist and update it live**
   - At the start of each invocation, generate a step-by-step checklist of what the skill will do.
   - Mark each step as `in_progress`, then `completed` as it's finished. Use the TodoWrite tool.
   - This gives the user real-time visibility and a clean audit trail.

3. **Each step gets detailed, executable instructions**
   - For every step in the checklist, document:
     - Which files to read first (paths)
     - Which tools to use (specific MCP function names)
     - How to verify the step worked (testing/spot-check approach)
   - No hand-waving. If you're not sure how to execute a step, that's a follow-up question, not a guess.

4. **Surface variant parameters in the skill API**
   - Each skill must expose a clear set of parameters that control the variants of every component it produces.
   - Example: a Table Row skill should accept `{ density, hasCheckbox, hasActions, columnCount, ... }` so the user can drive variant generation deterministically.
   - Document defaults and allowed values for every parameter.

5. **End with a screenshot-review-iterate loop**
   - Final step (always): take a screenshot of the produced Figma output (`get_screenshot` Dev MCP or `figma_capture_screenshot` Console MCP).
   - Review the screenshot for layout, alignment, token usage, and parity with the source code component.
   - If issues found → make adjustments → screenshot again. **Iterate up to 3 times.**
   - If still not right after 3 attempts, surface the issue to the user with specifics — don't keep trying blindly.

6. **No unnecessary files / redundant info**
   - Don't generate scratch files, throwaway docs, or interim outputs unless they're explicitly part of the deliverable.
   - Keep the skill's footprint tight — only the artifacts the user asked for.

### Phase 4 — Skill: Generate Table Row in Figma (open, details TBD)
*Skill produces individual table row components in Figma based on code source. Will ingest the React row component, infer variants from its props, and create the Figma component set with correct cells, padding, dividers, and state variants.*

Open requirements (gather at execution time): target Figma file/frame, density variants needed, alignment with existing table grid, etc.

### Phase 5 — Skill: Generate Table Container + related (open, details TBD)
*Includes Table Data Control, floating action toolbar, and other components used within tables. Skill extends Phase 4 mechanics for container-level layout (header, body, scroll regions, action surfaces).*

### Phase 6 — Skill: Generate Pages with Tables / Configuration Cards (open, details TBD)
*Page-level Figma generation. Composes the Phase 4–5 outputs into full pages. Will become a reusable skill family for other component categories beyond tables.*

---

## Source of Truth — Figma Atoms URLs
| Component | URL |
|---|---|
| LETA Icons | https://www.figma.com/design/Kxbgc2KoJSmTxvSV3PwNEu/Library?node-id=8063-7080 |
| Desktop Badges | https://www.figma.com/design/Kxbgc2KoJSmTxvSV3PwNEu/Library?node-id=68-36623 |
| Delivery Badges (instances) | https://www.figma.com/design/Kxbgc2KoJSmTxvSV3PwNEu/Library?node-id=68-36703 |
| Mobile atoms | https://www.figma.com/design/Kxbgc2KoJSmTxvSV3PwNEu/Library?node-id=8418-9217 |
| Map Zoom Control | https://www.figma.com/design/Kxbgc2KoJSmTxvSV3PwNEu/Library?node-id=7900-163823 |
| Tags | https://www.figma.com/design/Kxbgc2KoJSmTxvSV3PwNEu/Library?node-id=7751-28982 |
| Desktop Chips | https://www.figma.com/design/Kxbgc2KoJSmTxvSV3PwNEu/Library?node-id=7139-53343 |
| Map Icon Type | https://www.figma.com/design/Kxbgc2KoJSmTxvSV3PwNEu/Library?node-id=3132-23448 |
| Delivery Map Icons (instances) | https://www.figma.com/design/Kxbgc2KoJSmTxvSV3PwNEu/Library?node-id=3129-23003 |
| Desktop Card Icons | https://www.figma.com/design/Kxbgc2KoJSmTxvSV3PwNEu/Library?node-id=8967-38281 |
| Flags | https://www.figma.com/design/Kxbgc2KoJSmTxvSV3PwNEu/Library?node-id=7111-38657 |
| View Switcher Tab | https://www.figma.com/design/Kxbgc2KoJSmTxvSV3PwNEu/Library?node-id=5778-229942 |
| Segment Switcher Tab | https://www.figma.com/design/Kxbgc2KoJSmTxvSV3PwNEu/Library?node-id=5778-229946 |
| Titles | https://www.figma.com/design/Kxbgc2KoJSmTxvSV3PwNEu/Library?node-id=6767-26920 |
| Page Tab | https://www.figma.com/design/Kxbgc2KoJSmTxvSV3PwNEu/Library?node-id=1970-9466 |
| LETA Logo | https://www.figma.com/design/Kxbgc2KoJSmTxvSV3PwNEu/Library?node-id=8398-6917 |
| Collapsed Sidebar Logo | https://www.figma.com/design/Kxbgc2KoJSmTxvSV3PwNEu/Library?node-id=9132-34635 |
| Avatars & User Menu | https://www.figma.com/design/Kxbgc2KoJSmTxvSV3PwNEu/Library?node-id=7446-22456 |
| Mobile Buttons | https://www.figma.com/design/Kxbgc2KoJSmTxvSV3PwNEu/Library?node-id=2887-26272 |
| Desktop Buttons | https://www.figma.com/design/Kxbgc2KoJSmTxvSV3PwNEu/Library?node-id=28-38245 |
| Toggle | https://www.figma.com/design/Kxbgc2KoJSmTxvSV3PwNEu/Library?node-id=1956-29506&t=2Q1ONMpQmYKQs9w1-11 |
| Checkbox | https://www.figma.com/design/Kxbgc2KoJSmTxvSV3PwNEu/Library?node-id=4445-96840&t=2Q1ONMpQmYKQs9w1-11 |
| Radio Button | https://www.figma.com/design/Kxbgc2KoJSmTxvSV3PwNEu/Library?node-id=9752-20357&t=2Q1ONMpQmYKQs9w1-11 |

---

## Verification (per phase)
- **Phase 1**: token CI step green; theme provider switches modes correctly; every Figma variable has a code counterpart
- **Phase 2**: every component file passes the no-hardcoded-values lint rule; every component appears in Storybook with all variants visible; descriptions confirmed for components missing them; `figma_check_design_parity` passes for every component
- **Phase 3**: playground renders one example per product per component instance; routing works; config panel toggles props correctly


---

## Pending Figma sync (2026-05-23 evening)

Scan ran 2026-05-23 15:01 UTC against the 12:28 UTC baseline. Full report: [docs/figma-changes/FIGMA_CHANGES_2026-05-23-evening.md](docs/figma-changes/FIGMA_CHANGES_2026-05-23-evening.md).

**Headline**: no Figma-side changes since the morning baseline — 468 components / 95 sets / 1948 variants all byte-identical, annotations unchanged, one description curly-quote normalization (Notification Banners) with no code impact.

But the run is **not authoritative for tokens**: `packages/cli/snapshots/{alias,brand,mapped-*,text-styles,effect-styles}.json` are 13–15 days old (May 8 – May 10), and the user has indicated Figma tokens were updated within that window. The skill does not refresh those snapshots; the token pipeline does.

- [x] ~~**Run `pnpm tokens:sync`**~~ — **superseded**: token snapshots were refreshed 2026-05-27 via the `figma_execute` MCP workaround (all 7 snapshots re-pulled; `tokens:generate` + `tokens:check` clean). See the 2026-05-27 sync section.
- [x] ~~**Re-run the `figma-design-system-sync` skill**~~ — superseded by the 2026-05-27 and 2026-06-03 sync runs.
- [x] ~~Sanity-check Foundations stories on non-empty token diff~~ — superseded; the 2026-05-27 refresh confirmed token alignment (e.g. `--avatar-large` resolves to 64px).
- [x] ~~No component work required from this scan~~ — superseded; component work has since continued (Molecules Batch 1, icon overhaul).

## Pending Figma sync (2026-06-03)

Full report: `docs/figma-changes/FIGMA_CHANGES_2026-06-03.md`. Diff vs the 2026-05-27 baseline.

- [x] Sync `@leta/icons` with Figma — 38 icon renames (typos, space→hyphen, glyph-dedup) + new `Icon/Deactivate`; `inventory.json` regenerated from Figma, `pnpm registry` rebuilt `registry.ts`/`icon-names.ts` (356 components → 254 semantic names, 0 unresolved glyphs). icons + components typecheck pass.
- [x] New icons `Icon/Account` / `Icon/Account-Outline` ([10114:20014](https://figma.com/design/Kxbgc2KoJSmTxvSV3PwNEu/?node-id=10114-20014)) added to registry.
- [x] `Page Tabs Control` ([3907:71981](https://figma.com/design/Kxbgc2KoJSmTxvSV3PwNEu/?node-id=3907-71981)) — "Scrollable" variant removed in Figma; code already matches (never implemented).
- [x] Publish the Figma library so consumers receive the renamed icons + new `Icon/Deactivate` + updated instance-swap lists — **published 2026-06-03**.
- [x] Update CLAUDE.md status note: icon count ~250 → 356 (254 semantic names); figma-design-system-sync baseline 2026-05-27 → 2026-06-03; skill version v0.3.0.

## Pending Figma sync (2026-07-02)

Full report: `docs/figma-changes/FIGMA_CHANGES_2026-07-02.md`. Diff vs the 2026-06-28 baseline. **All items implemented in-session** (user requested implementation, not just a plan):

- [x] New `Icon/Redo` ([10736:25670](https://figma.com/design/Kxbgc2KoJSmTxvSV3PwNEu/?node-id=10736-25670), key `a4e2873b…`, glyph `redo-rounded`, no outline sibling) — added to `inventory.json` + `pnpm registry` (258 semantic names, 0 unresolved) + `@leta/icons` dist rebuilt.
- [x] `Icon/Redo` appended to the `preferredValues` of all 50 icon instance-swap slots across 28 component sets (idempotent `editComponentProperty` sweep, 0 errors).
- [x] Content Primitives ([6961:41406](https://figma.com/design/Kxbgc2KoJSmTxvSV3PwNEu/?node-id=6961-41406)) **Metrics**: metric value `text-heading-m-semibold` → `text-heading-s-semibold`; description `text-body-s-regular` → `text-label-s-regular` (variant height 112 → 108).
- [x] Content Primitives **Section Heading**: gained a Visual Anchor — 20px outlined leading icon, centered vs the title+subtext block, `showVisualAnchor`/`showLeadingIcon` default true. `VisualAnchor` gained `align: 'top' | 'center'`. All Figma instances (Input/List/Table Section, Extra Large Modal) carry `Show Visual Anchor: true` → React organisms inherit correctly (verified in Storybook).
- [x] Table Data Control childCount 3→5 (Active Filter variants) — code already matches (`filterCount`, built 2026-07-01). No action.
- [x] Storybook docs updated (ContentPrimitives meta + SectionHeading story); `@leta/components` dist rebuilt; baseline snapshots refreshed (catalog now stores 486 top-level entries — variant children no longer duplicated as separate COMPONENT rows; 92/93 sets carry `variants`).
- [ ] **Publish the Figma library** — the preferredValues sweep dirtied it (user action).

## Pending Figma sync (2026-07-14)

Full report: `docs/figma-changes/FIGMA_CHANGES_2026-07-14.md`. Full `--deep` scan (all 93 sets / 486 catalog entries) vs the 2026-07-08 baseline. No token/effect/structural/doc changes; **one** component edited + one already-in-code content change:

- [x] **Desktop Button** ([28:38245](https://figma.com/design/Kxbgc2KoJSmTxvSV3PwNEu/?node-id=28-38245)) — **all 65 Plain variants `cornerRadius 8/12 → 0`** (designer squared off the Plain link style). `Button.tsx`: `radius = isPlain ? 0 : (platform==='mobile' ? PILL : layout.desktopRadius)`.
- [x] **Desktop Button — Plain underline now spans the full content row** (icons + label), fixing the reported bug where the underline stopped short of the leading/trailing icons. `Button.tsx`: `.leta-btn--plain.leta-btn--underline` uses `border-bottom: 1px solid currentColor` (was `text-decoration: underline`, which only underlines the text run, not the flex-item icons); Icon-Only Plain excluded from the underline. Mirrors Figma's dedicated full-width `Underline` VECTOR (label TEXT is `textDecoration: NONE`).
- [x] **Desktop Dropdowns** ([8230:26475](https://figma.com/design/Kxbgc2KoJSmTxvSV3PwNEu/?node-id=8230-26475)) — Combobox-Search Empty / Basic-Filter-Search Empty / Filter-Group Empty copy → "Try adjusting your search." **Already in code** (`EmptyState` `no-results` default); verified live in Storybook. (Not in the variant-prop diff — it's a nested composed-content change below diff granularity.)
- [x] `@leta/components` dist rebuilt (playground consumes it). Both packages typecheck clean.
- Read-only scan — no Figma library dirtied by the sync.

## Pending Figma sync (2026-07-08)

Full report: `docs/figma-changes/FIGMA_CHANGES_2026-07-08.md`. Full `--deep` scan (all 93 sets) vs the 2026-07-07 baseline. No token/structural changes; one component edited:

- [x] **Notification Banners** ([3811:65015](https://figma.com/design/Kxbgc2KoJSmTxvSV3PwNEu/?node-id=3811-65015)) — trailing section restructured + corner radius. `NotificationBanner.tsx`:
  - Trailing section is now a full-height, right-aligned, `space-between` column: **Dismiss × pinned top-right** (`layoutGrow: 1`), optional **CTA pinned bottom-right** (Primary/Small, hidden by default). New **`cta?: ReactNode`** prop + `WithCTA` story.
  - Filled corner radius `--rounding-lg` (8) → **`--rounding-xl` (12)**.
  - typecheck clean, dist rebuilt, verified in Storybook (dismiss top / CTA bottom / radius 12px).
- The only other deep-diff hit (Flags, 256 variants) was a capture-shape artifact (baseline lacked the `leaves` field), not a design change. Baseline recaptured deep (Flags now includes leaves).
- [x] **New color token** (follow-up scan): **`Border/primary/default`** → `--border-primary-default` (coral-red `#ff3941` light / `#ff6167` dark). Refreshed `mapped-colors.json` (431→432) + `tokens:generate`; `tokens:check` clean. No consumer yet — newly-available token, no component change.
- Read-only scan — no Figma library dirtied.

## Pending Figma sync (2026-07-07)

Full report: `docs/figma-changes/FIGMA_CHANGES_2026-07-07.md`. Diff vs the 2026-07-03 baseline. Tokens byte-identical (no drift). Two additive variant-axis changes; implemented in-session:

- [x] **Cell** ([4444:45000](https://figma.com/design/Kxbgc2KoJSmTxvSV3PwNEu/?node-id=10787-17505)) Type axis 18 → 20 — added **API** (`api-cell`: Large Highlight `FeaturedIcon` w/ `Integration` glyph + title "Auto-created" + subtext "From online store"; new `apiTitle`/`apiSubtext`/`apiIcon` props) and **User** (already implemented as `user-cell`). `Cell.tsx` + `Cell.stories.tsx` (ApiCell story + Catalog + widths); typecheck clean, dist rebuilt, all 4 states verified in Storybook vs Figma.
- [x] **Table-Container** ([1524:40283](https://figma.com/design/Kxbgc2KoJSmTxvSV3PwNEu/?node-id=1524-40283)) gained `Property 1=No Results` — already built in code 2026-07-06 (`code-already-matches`).
- Playground: no change required (`api-cell`/`user-cell` available for a future "created by" column).
- **`--deep` follow-up (same day)** — full byte-for-byte audit of all 93 sets after two more edits:
  - [x] **Featured Icon** ([8967:38281](https://figma.com/design/Kxbgc2KoJSmTxvSV3PwNEu/?node-id=8967-38281)) gained **Teal** color (→ `notice` token family). Added `teal` to `FeaturedIcon.tsx` (BG `--surface-notice-bg-subtle` / icon `--icons-notice-default`) + stories. Also fixed stale "44px" Large comment (token = 40px).
  - [x] **API cell** now uses the **Teal** Featured Icon (was Highlight) — `Cell.tsx` `api-cell` → `color="teal"`.
  - [x] **`Icons/notice/default`** #80c6be → #669e98 (light) — refreshed `mapped-colors.json` + `tokens:generate` + `tokens:check` clean.
  - [x] **Tag** padding L8/R6 → L6/R4; **Desktop Metric Card** padding 16→20 uniform; **Desktop Menu Options** `dropdown-advanced` padding 10→12 / minHeight 64→68.
  - [x] Remaining ~300 variant deltas verified as **stale-baseline** (June reconciliations already in code — Footer/Notif/Badges/Tooltip/Empty State/Sections/Modal heights). Baseline refreshed with full deep capture → future diffs clean.
- Read-only scan — no Figma library dirtied.

## Pending Figma sync (2026-07-03)

Full report: `docs/figma-changes/FIGMA_CHANGES_2026-07-03.md`. Diff vs the 2026-07-02 baseline. Implemented in-session:

- [x] Content Primitives ([6961:41406](https://figma.com/design/Kxbgc2KoJSmTxvSV3PwNEu/?node-id=6961-41406)) **Metrics variant**: the `Metric` frame flipped horizontal → vertical — the variance Badge now stacks **below** the metric value (left-aligned, gap 8) instead of beside it; variant height 108 → 136. `MetricsLayout` in `ContentPrimitives.tsx` updated (`flexDirection: column`); all consumers (Metric Card etc.) inherit it. Storybook doc note + dist rebuilt; verified vs Figma.
- No token/effect/catalog changes; no other component flagged. Read-only scan — no Figma library dirtied by the sync.
