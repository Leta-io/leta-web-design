import * as React from 'react';
import {
  Badge,
  Button,
  ContentCard,
  ContentPrimitives,
  EmptyState,
  NotificationBanner,
} from '@leta/components';
import { Icon } from '@leta/icons';
import { BroadcastEventAccordion } from './BroadcastEventAccordion.js';
import type { BroadcastLeg, BroadcastModel } from './broadcastModel.js';

/**
 * Dispatch Logs tab — the main screen (OM §7.5). Renders all seven wireframed
 * shapes from one component, driven by {@link BroadcastModel}:
 *
 * | State | Wireframe |
 * |---|---|
 * | On Hold | `526:52830` |
 * | Broadcasting | `526:54608` |
 * | Completed | `536:59220` |
 * | Fallback | `548:148566` |
 * | Exhausted | `552:57340` |
 * | Manually Dispatched (before broadcast) | `548:150265` |
 * | Manually Dispatched (after exhausted) | `1728:124762` |
 *
 * Structure per the wireframes' `Main Body` (V, gap 24, pad 24/16):
 * optional banner → Broadcast Status Card → demarcator → Broadcast Logs
 * (section heading + `Notified Drivers ›` over the timeline, or an empty state).
 */

const DEMARCATOR: React.CSSProperties = {
  height: 0,
  borderTop: 'var(--stroke-xs) solid var(--border-neutral-default)',
  width: '100%',
};

/**
 * Animates `el.scrollTop` to `top` over `duration` using rAF.
 *
 * Deliberately hand-rolled rather than `scrollIntoView({ behavior: 'smooth' })` or CSS
 * `scroll-behavior: smooth`: both are **no-ops in some renderers** (verified — a
 * scripted smooth scroll left `scrollTop` untouched while the instant form moved
 * correctly), which would leave the round chevrons silently dead. A rAF tween always
 * lands, and collapses to an instant jump under `prefers-reduced-motion`.
 */
function animateScrollTop(el: HTMLElement, top: number, duration = 320): void {
  const start = el.scrollTop;
  const delta = top - start;
  if (delta === 0) return;
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    el.scrollTop = top;
    return;
  }
  const t0 = performance.now();
  const step = (now: number) => {
    const p = Math.min(1, (now - t0) / duration);
    // ease-out cubic — decelerates into the target, matching the project's motion feel.
    el.scrollTop = start + delta * (1 - Math.pow(1 - p, 3));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  // Guaranteed landing. rAF does not fire in an occluded/background tab (nor in some
  // headless renderers — verified), which would otherwise leave the jump half-done or
  // dead. Once the tween's window has passed, force the final position: a no-op when
  // the animation already completed, the whole effect when rAF never ran.
  setTimeout(() => {
    if (Math.abs(el.scrollTop - top) > 1) el.scrollTop = top;
  }, duration + 40);
}

/** Plain / trailing-chevron drill-down link ("Priority Driver Groups ›"). */
function DrillLink({ label, onClick }: { label: string; onClick: () => void }): React.ReactElement {
  return (
    <Button variant="plain" size="medium" iconRight="Chevron-Right" showUnderline={false} onClick={onClick}>
      {label}
    </Button>
  );
}

/** One icon + text pair in the Broadcast summary triplet. */
function SummaryStat({ icon, text }: { icon: 'Account' | 'Timer' | 'Inventory'; text: string }): React.ReactElement {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-8px)' }}>
      <span style={{ display: 'flex', color: 'var(--icons-neutral-default)' }}>
        <Icon name={icon} outlined size={16} />
      </span>
      <span className="text-label-m-medium" style={{ color: 'var(--text-default-label)', whiteSpace: 'nowrap' }}>
        {text}
      </span>
    </div>
  );
}

/**
 * Broadcast Status Card — the wireframes' `Broadcast Status Card` frame (pad 20,
 * gap 16, white, radius xl, 1px border). Composes, top to bottom: an optional
 * Manual Assignment row, the broadcast status row (title + badge + subtext +
 * `Priority Driver Groups ›` + progress bar), an optional in-card notice, then the
 * Broadcast summary row with `Batched Orders ›`.
 */
function BroadcastStatusCard({
  model,
  onViewActivity,
  onPriorityGroups,
  onBatchedOrders,
  onRebroadcast,
}: {
  model: BroadcastModel;
  onViewActivity: () => void;
  onPriorityGroups: () => void;
  onBatchedOrders: () => void;
  onRebroadcast: () => void;
}): React.ReactElement {
  // Exhausted splices a "Re-broadcast" Plain button inline into the sentence.
  const subtextNode = model.showRebroadcastLink ? (
    <>
      {model.subtext}{' '}
      <Button variant="plain" size="medium" onClick={onRebroadcast}>
        Re-broadcast
      </Button>{' '}
      to try again.
    </>
  ) : (
    model.subtext
  );

  return (
    <div
      style={{
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-16px)',
        width: '100%',
        padding: 'var(--padding-20px)',
        backgroundColor: 'var(--surface-neutral-bg-default)',
        border: 'var(--stroke-xs) solid var(--border-neutral-default)',
        borderRadius: 'var(--rounding-xl)',
      }}
    >
      {/* Manual Assignment row — both manual states (`548:150265` / `1728:124762`). */}
      {model.manualAssignment && (
        <>
          <ContentPrimitives
            type="utility"
            text="Manual Assignment"
            subtext={`${model.manualAssignment.driverName} was manually assigned to deliver this order at ${model.manualAssignment.time}`}
            showVisualAnchor={false}
            showTrailingContent
            showPassiveElements={false}
            showInteractiveElements
            interactiveElements={
              <Button variant="secondary" size="medium" iconLeft="History" onClick={onViewActivity}>
                View Activity
              </Button>
            }
          />
          <div style={DEMARCATOR} />
        </>
      )}

      {/* Broadcast status row. The manual-before-broadcast state has no broadcast to
          report, so it shows only the Manual Assignment row above. */}
      {model.state !== 'manual-before-broadcast' && (
        <>
          <ContentPrimitives
            type={model.progressPct != null ? 'progress-indicator' : 'utility'}
            text={
              model.badge ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-8px)' }}>
                  <span>{model.title}</span>
                  <Badge color="neutral" label={model.badge} />
                </span>
              ) : (
                model.title
              )
            }
            subtext={subtextNode}
            progressValue={model.progressPct ?? 0}
            // The wireframe's instance binds `Type: System Process` — the blue bar.
            progressVariant="system-process"
            showProgressHelperText={false}
            showVisualAnchor={false}
            showTrailingContent
            showPassiveElements={false}
            showInteractiveElements={model.showPriorityGroupsLink}
            interactiveElements={
              model.showPriorityGroupsLink ? <DrillLink label="Priority Driver Groups" onClick={onPriorityGroups} /> : undefined
            }
          />
          {/* Fallback's subtle in-card notice (`548:148566`). */}
          {model.inCardNotice && (
            <NotificationBanner type="neutral" variant="subtle" description={model.inCardNotice} />
          )}
          <div style={DEMARCATOR} />
        </>
      )}

      {/* Broadcast summary */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 'var(--spacing-20px)', width: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-8px)', minWidth: 0 }}>
          <span className="text-label-m-semibold" style={{ color: 'var(--text-default-heading)' }}>
            Broadcast summary
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-8px)', flexWrap: 'wrap' }}>
            <SummaryStat icon="Account" text={`${model.summary.notifiedDrivers} notified drivers`} />
            <div style={{ width: 0, height: 20, borderLeft: 'var(--stroke-xs) solid var(--border-neutral-default)' }} />
            <SummaryStat icon="Timer" text={model.summary.elapsedLabel} />
            <div style={{ width: 0, height: 20, borderLeft: 'var(--stroke-xs) solid var(--border-neutral-default)' }} />
            <SummaryStat icon="Inventory" text={`${model.summary.batchedOrders} batched orders`} />
          </div>
        </div>
        <div style={{ flexShrink: 0 }}>
          <DrillLink label="Batched Orders" onClick={onBatchedOrders} />
        </div>
      </div>
    </div>
  );
}

/** Outcome badge per leg — matches the wireframes' Desktop Badge instances. */
const OUTCOME_BADGE: Record<BroadcastLeg['outcome'], { label: string; color: 'information' | 'success' | 'neutral'; icon?: 'Signal-3-Bars' | 'Check-Circle' | 'Clock' }> = {
  broadcasting: { label: 'Broadcasting', color: 'information', icon: 'Signal-3-Bars' },
  accepted: { label: 'Accepted', color: 'success', icon: 'Check-Circle' },
  unaccepted: { label: 'Unaccepted', color: 'neutral', icon: 'Clock' },
};

/**
 * Round marker — the wireframes' `Broadcast Round` frame: chevron-down + label +
 * chevron-up (Secondary / Extra Small / Icon Only). These are **scroll navigation**,
 * not a pager: chevron-up jumps to the newest entry of the *next newer* round,
 * chevron-down to the newest entry of the *next older* one. Each is disabled when
 * there's no round in that direction, exactly as the wireframes show.
 */
function RoundMarker({
  label,
  onOlder,
  onNewer,
}: {
  label: string;
  onOlder: (() => void) | null;
  onNewer: (() => void) | null;
}): React.ReactElement {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--spacing-8px)', paddingBottom: 'var(--padding-16px)' }}>
      <Button
        variant="secondary"
        size="extra-small"
        iconOnly="Chevron-Down"
        aria-label={`Jump to the previous round`}
        disabled={!onOlder}
        onClick={() => onOlder?.()}
      />
      <span className="text-label-m-medium" style={{ color: 'var(--text-default-label)', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <Button
        variant="secondary"
        size="extra-small"
        iconOnly="Chevron-Up"
        aria-label={`Jump to the next round`}
        disabled={!onNewer}
        onClick={() => onNewer?.()}
      />
    </div>
  );
}

/** The accepting driver's row, shown above the non-responder accordion on an Accepted leg. */
function AcceptedRow({ acceptedBy }: { acceptedBy: NonNullable<BroadcastLeg['acceptedBy']> }): React.ReactElement {
  return (
    <ContentPrimitives
      type="utility"
      text={acceptedBy.name}
      subtext={acceptedBy.phone}
      showVisualAnchor
      showLeadingIcon={false}
      showAvatar
      avatarName={acceptedBy.name}
      showTrailingContent
      showPassiveElements
      passiveElements={
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-8px)' }}>
          <span className="text-label-s-regular" style={{ color: 'var(--text-default-sub-body)', whiteSpace: 'nowrap' }}>
            {acceptedBy.seconds}s
          </span>
          <div style={{ width: 0, height: 20, borderLeft: 'var(--stroke-xs) solid var(--border-neutral-default)' }} />
        </div>
      }
      showInteractiveElements
      interactiveElements={
        // Inert — no call-integration flow exists yet (VOIP-gated per the designer's note).
        <Button variant="secondary" size="medium" iconOnly="Phone" iconOutlined aria-label="Call driver" />
      }
    />
  );
}

/**
 * One timeline entry. Mirrors the Activity tab's `ActivityRow` exactly — a 12px
 * Branch column (12px grey dot + dashed [6,6] line) beside a content column whose
 * own `paddingBottom: 40` supplies the inter-row gap, so the dashed line runs
 * *through* that gap into the next row's dot (rows stack with gap 0).
 */
function TimelineEntry({
  leg,
  isLast,
  legIndex,
}: {
  leg: BroadcastLeg;
  isLast: boolean;
  /** Marks this entry as the scroll target for round-marker navigation. */
  legIndex: number;
}): React.ReactElement {
  const badge = OUTCOME_BADGE[leg.outcome];
  return (
    <div style={{ display: 'flex', gap: 'var(--spacing-12px)', alignItems: 'flex-start', width: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', alignSelf: 'stretch', flexShrink: 0, width: 12, gap: 4 }}>
        <span style={{ display: 'flex', color: 'var(--icons-neutral-idle)', flexShrink: 0 }}>
          <Icon name="Circle-Medium" size={12} />
        </span>
        {!isLast && (
          <div
            style={{
              flex: '1 0 0',
              width: 1,
              minHeight: 12,
              backgroundImage:
                'repeating-linear-gradient(to bottom, var(--border-neutral-default) 0 6px, transparent 6px 12px)',
            }}
          />
        )}
      </div>
      <div data-leg-index={legIndex} style={{ display: 'flex', flexDirection: 'column', flex: '1 0 0', minWidth: 0, paddingBottom: 'var(--padding-40px)' }}>
        <ContentCard>
          <ContentPrimitives
            type="utility"
            text={
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-8px)' }}>
                <span>{leg.title}</span>
                <Badge color={badge.color} label={badge.label} leadingIcon={badge.icon} />
              </span>
            }
            subtext={leg.subtext}
            showVisualAnchor={false}
            showTrailingContent
            showPassiveElements
            passiveElements={
              <span className="text-label-s-regular" style={{ color: 'var(--text-default-label-idle)', whiteSpace: 'nowrap' }}>
                {leg.timestamp}
              </span>
            }
            showInteractiveElements={false}
          />
          {leg.acceptedBy && <AcceptedRow acceptedBy={leg.acceptedBy} />}
          <BroadcastEventAccordion type={leg.accordionType} drivers={leg.drivers} defaultOpen={leg.defaultOpen} />
          {leg.footnote && <NotificationBanner type="neutral" variant="subtle" description={leg.footnote} />}
        </ContentCard>
      </div>
    </div>
  );
}

/** Round label for a leg — "Fallback Round" or "Round N". */
function roundLabel(leg: BroadcastLeg): string {
  return leg.round == null ? 'Fallback Round' : `Round ${leg.round}`;
}

export function DispatchLogsTab({
  model,
  onViewActivity,
  onPriorityGroups,
  onBatchedOrders,
  onNotifiedDrivers,
  onRebroadcast,
  onDispatch,
}: {
  model: BroadcastModel;
  onViewActivity: () => void;
  onPriorityGroups: () => void;
  onBatchedOrders: () => void;
  onNotifiedDrivers: () => void;
  onRebroadcast: () => void;
  onDispatch: () => void;
}): React.ReactElement {
  // Scroll target for the round markers. Resolved from the DOM by `data-leg-index`
  // rather than a ref map: `setAnchor(i)` would be a fresh closure every render, so
  // React detaches/re-attaches every ref on each of the drawer's 1s ticker renders —
  // a lifecycle the navigation shouldn't depend on. A scoped query is stable.
  const rootRef = React.useRef<HTMLDivElement>(null);

  // Group boundaries: a marker renders above the newest leg of each round. Legs are
  // newest-first, so the group order is e.g. Fallback → Round 2 → Round 1.
  const markerAt = new Map<number, string>();
  const groupStarts: number[] = [];
  if (model.fleetType !== 'marketplace') {
    let prev: string | null = null;
    model.legs.forEach((leg, i) => {
      const label = roundLabel(leg);
      if (label !== prev) {
        markerAt.set(i, label);
        groupStarts.push(i);
        prev = label;
      }
    });
  }

  /** Jump to the newest entry of a neighbouring round (see {@link animateScrollTop}). */
  const scrollTo = (legIndex: number) => () => {
    const el = rootRef.current?.querySelector<HTMLElement>(`[data-leg-index="${legIndex}"]`);
    if (!el) return;
    // Walk to the nearest ancestor that actually scrolls (overflow auto/scroll AND
    // overflowing) — intermediate wrappers are overflow:visible and ignore scrollTop.
    let scroller: HTMLElement | null = el.parentElement;
    while (scroller && scroller.scrollHeight <= scroller.clientHeight) scroller = scroller.parentElement;
    if (!scroller) return;
    const delta = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
    // 16px breathing room so the entry isn't flush against the header.
    animateScrollTop(scroller, scroller.scrollTop + delta - 16);
  };

  return (
    <div ref={rootRef} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-24px)', padding: 'var(--padding-24px) var(--padding-16px)' }}>
      {/* On Hold's neutral nudge / Exhausted's info failure notice. */}
      {model.banner && (
        <NotificationBanner
          type={model.banner.kind === 'assign-driver' ? 'neutral' : 'info'}
          variant="filled"
          description={model.banner.text}
          cta={
            <Button
              variant={model.banner.kind === 'assign-driver' ? 'secondary' : 'primary'}
              size="small"
              iconLeft="Proceed"
              onClick={onDispatch}
            >
              Dispatch
            </Button>
          }
        />
      )}

      <BroadcastStatusCard
        model={model}
        onViewActivity={onViewActivity}
        onPriorityGroups={onPriorityGroups}
        onBatchedOrders={onBatchedOrders}
        onRebroadcast={onRebroadcast}
      />

      <div style={DEMARCATOR} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-20px)', width: '100%' }}>
        <ContentPrimitives
          type="section-heading"
          text="Broadcast Logs"
          showSubtext={false}
          showVisualAnchor={false}
          showTrailingContent={model.showNotifiedDriversLink}
          showPassiveElements={false}
          showInteractiveElements={model.showNotifiedDriversLink}
          interactiveElements={
            model.showNotifiedDriversLink ? <DrillLink label="Notified Drivers" onClick={onNotifiedDrivers} /> : undefined
          }
        />

        {model.legs.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 'var(--padding-24px)' }}>
            <EmptyState
              type="no-broadcast-logs"
              size="desktop"
              description={model.emptyDescription ?? undefined}
            />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, width: '100%' }}>
            {model.legs.map((leg, i) => {
              const marker = markerAt.get(i);
              // Neighbouring round groups, for the marker's scroll targets.
              const pos = groupStarts.indexOf(i);
              const newer = pos > 0 ? groupStarts[pos - 1]! : null;
              const older = pos >= 0 && pos < groupStarts.length - 1 ? groupStarts[pos + 1]! : null;
              return (
                <React.Fragment key={leg.id}>
                  {marker && (
                    <RoundMarker
                      label={marker}
                      onNewer={newer != null ? scrollTo(newer) : null}
                      onOlder={older != null ? scrollTo(older) : null}
                    />
                  )}
                  <TimelineEntry leg={leg} isLast={i === model.legs.length - 1} legIndex={i} />
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
