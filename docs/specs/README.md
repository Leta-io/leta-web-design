# LETA Playground — Design Specs (source of truth)

This directory is the **single source of truth** for the specs driving the LETA
On-Demand dispatcher **interactive playground** (`apps/playground`). It is
tracked in git and meant to be shared with the design co-pilot — edit the docs
here directly; do not maintain separate isolated copies. When design intent
changes, update the relevant file here and the implementation is reconciled
against it.

Figma design file (wireframes): **LETA Playground** — `xVa4kZAArZWWvl6QsfID8S`.
Figma component library: `Kxbgc2KoJSmTxvSV3PwNEu`.

## Documents

| File | Doc | Covers |
|---|---|---|
| [order-management-foundations-and-logic.md](order-management-foundations-and-logic.md) | **Doc 1** | Orders table + row anatomy, Add Order drawer, field config (Items/Payment), validation, Order Detail View (§7), edit matrix (§8), broadcast/dispatch visibility (§9), reassignment — Change Driver / Add to Trip (§10), disruption — Cancel / Reschedule / Return (§11), the table interaction layer — filters/sort/pagination/overflow menus/Update Status modal (§12), capacity ceiling (§10.7). **Version 3.4.** |
| [configuration-reference.md](configuration-reference.md) | **Doc 2** | Every tenant-configurable setting: order fields (+ `products.enabled`), delivery confirmation, scheduling/dispatch, returns, roles & permissions, depot administration. Pointers to Doc 4 (SLA), Doc 5 (broadcast/fleet), Rate Card PRD. **Switches above, dials below** — client owns enablement + defaults, depot owns operational behaviour (§11). **v1.5.** |
| [broadcast-and-fleet-configuration.md](broadcast-and-fleet-configuration.md) | **Doc 5** | Broadcast lifecycle, priority driver groups, acceptance windows/retries/rounds, fallback, driver broadcast **suspension** + reinstatement. Dials depot-scoped; smart-dispatch switch + suspension threshold client-scoped. **v1.5.** |
| [interaction-and-component-patterns.md](interaction-and-component-patterns.md) | **Doc 3** | Generic component behaviour reused everywhere: dropdown/popover primitive, loading, empty states, toasts, confirmation, pagination, date-range picker, search, filters, keyboard & focus. **v1.1.** |
| [sla-and-fulfilment-time-specification.md](sla-and-fulfilment-time-specification.md) | **Doc 4** | The five-SLA two-phase fulfilment-time model, the constant-Expected-OFT-with-paused-clocks counter, On-Time / At Risk / Delayed badge precedence, multi-attempt reporting rollup. |
| [table-column-layout-specification.md](table-column-layout-specification.md) | Table spec | Column classification (Primary/Identifier/Secondary/Utility/Control), fixed vs weighted-flexible sizing, floors, freeze-and-redistribute, horizontal-scroll-with-pinned-anchors, per-instance column presets. |
| [changelog-bulk-actions-and-reschedule-suggestions.md](changelog-bulk-actions-and-reschedule-suggestions.md) | Changelog | Bulk cancel/reschedule brought into scope + the reschedule suggestion chips (folded into Doc 1 §11.1/§11.2/§11.2.1/§11.5 v2.7). |

### Referenced but not yet in this repo

- **Rate Card Specifications PRD:** driver earnings / client cost calculation,
  hierarchy Depot → Driver Group → Driver. Pointed to by Doc 2 §8 and Doc 5 §6;
  `depot.rateCard.override` depends on it. Add it here when available.

> **Docs 2 and 5 landed 2026-08-05** and were reconciled against Ifeanyi's rulings across four
> review rounds that day — **switches above, dials below** (client owns enablement + defaults,
> depot owns operational behaviour), `dispatch.fleetType` is platform-provisioned, smart dispatch
> gates the broadcasting feature set, and "hold window" is retired in favour of **order wait time**.
> See each doc's revision history, and
> [`docs/audits/client-configuration-coverage-audit.md`](../audits/client-configuration-coverage-audit.md)
> for the coverage audit that surfaced the conflicts.

## Note on the Table Column spec

`table-column-layout-specification.md` here is the shareable copy. A working copy
also lives at `.claude/skills/table-column-layout/references/spec.md` (the
`table-column-layout` skill loads it during table work). Keep the two in sync —
edit here, then mirror into the skill's `references/spec.md` (they should be
byte-identical).
