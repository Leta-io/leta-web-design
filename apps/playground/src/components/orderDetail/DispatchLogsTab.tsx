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
import { formatDuration, type BroadcastLeg, type BroadcastModel } from './broadcastModel.js';
import { useBroadcastSignalIcon } from './broadcastSignal.js';
import { DashedLine } from '../DashedLine.js';

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

/** Ticks a counter up once per second while `active` (Broadcast summary's "elapsed"
 *  reading + the status-card sequence bar, live only while a broadcast is running).
 *  Bumping `resetKey` restarts the count from `initialSeconds` — used when the
 *  dispatcher re-broadcasts (the sequence, and its progress bar, start over). */
function useElapsedTicker(initialSeconds: number, active: boolean, resetKey = 0): number {
  const [n, setN] = React.useState(initialSeconds);
  React.useEffect(() => {
    setN(initialSeconds);
    if (!active) return;
    const t = setInterval(() => setN((s) => s + 1), 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, resetKey]);
  return n;
}

/** Plain / trailing-chevron drill-down link ("Priority Driver Groups ›"). */
function DrillLink({ label, onClick }: { label: string; onClick: () => void }): React.ReactElement {
  return (
    <Button variant="plain" size="medium" iconRight="Chevron-Right" showUnderline={false} onClick={onClick}>
      {label}
    </Button>
  );
}

/** One icon + text pair in the Broadcast summary triplet. The value (the number)
 *  is semibold, its label regular — two separate spans, not one uniform-weight
 *  string. `value` carries tabular-nums since the elapsed stat ticks live and
 *  digit-width jitter is otherwise disorienting to watch update. */
function SummaryStat({
  icon,
  value,
  label,
}: {
  icon: 'Account' | 'Timer' | 'Inventory';
  value: string;
  label: string;
}): React.ReactElement {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-8px)' }}>
      <span style={{ display: 'flex', color: 'var(--icons-neutral-default)' }}>
        <Icon name={icon} outlined size={16} />
      </span>
      <span style={{ whiteSpace: 'nowrap' }}>
        <span className="text-label-m-semibold" style={{ color: 'var(--text-default-label)', fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </span>{' '}
        <span className="text-label-m-regular" style={{ color: 'var(--text-default-label)' }}>
          {label}
        </span>
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
  holdMinutesRemaining,
  onViewActivity,
  onPriorityGroups,
  onBatchedOrders,
  onRebroadcast,
}: {
  model: BroadcastModel;
  /** Live minutes-remaining for On Hold, computed by the drawer from the SAME
   *  base + elapsed-since-open the Overview tab's "{N} minutes to broadcast."
   *  row uses, so the two tabs always show the same number (OM Appendix A). */
  holdMinutesRemaining: number | null;
  onViewActivity: () => void;
  onPriorityGroups: () => void;
  onBatchedOrders: () => void;
  onRebroadcast: () => void;
}): React.ReactElement {
  // Re-broadcast restarts the sequence → its elapsed clock (and the status-card
  // progress bar) start over. `rebroadcastNonce` bumps the ticker's reset key.
  const [rebroadcastNonce, setRebroadcastNonce] = React.useState(0);
  // Live ticking — the summary's elapsed reading + the sequence progress bar
  // (only while a broadcast is actually running; concluded states stay static).
  // On Hold's countdown isn't ticked here — it's handed down from the drawer.
  const elapsedSeconds = useElapsedTicker(model.summary.elapsedSeconds, model.liveElapsed, rebroadcastNonce);
  const holdMinutes = holdMinutesRemaining ?? model.holdMinutesBase ?? 1;
  const displayTitle =
    model.state === 'on-hold' ? `Broadcast starts in ${holdMinutes} minute${holdMinutes === 1 ? '' : 's'}` : model.title;

  // The status-card bar is the WHOLE-SEQUENCE progress (round 1 → round N →
  // fallback), advancing as the sequence elapses. When the model exposes the
  // sequence total, drive the bar live off `elapsed / total`; otherwise fall
  // back to the model's static fill.
  const progressPct =
    model.sequenceTotalSeconds != null
      ? Math.min(100, (elapsedSeconds / model.sequenceTotalSeconds) * 100)
      : model.progressPct;

  const handleRebroadcast = () => {
    setRebroadcastNonce((n) => n + 1); // restart the sequence clock + bar
    onRebroadcast();
  };

  // Exhausted splices a "Re-broadcast" Plain button inline into the sentence.
  const subtextNode = model.showRebroadcastLink ? (
    <>
      {model.subtext}{' '}
      <Button variant="plain" size="medium" onClick={handleRebroadcast}>
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
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{displayTitle}</span>
                  <Badge color="neutral" label={model.badge} />
                </span>
              ) : (
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{displayTitle}</span>
              )
            }
            subtext={subtextNode}
            progressValue={progressPct ?? 0}
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

      {/* Broadcast summary — centered against the whole leading block (title + stats), not bottom-aligned. */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--spacing-20px)', width: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-8px)', minWidth: 0 }}>
          <span className="text-label-m-semibold" style={{ color: 'var(--text-default-heading)' }}>
            Broadcast summary
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-8px)', flexWrap: 'wrap' }}>
            <SummaryStat icon="Account" value={String(model.summary.notifiedDrivers)} label="notified drivers" />
            <div style={{ width: 0, height: 20, borderLeft: 'var(--stroke-xs) solid var(--border-neutral-default)' }} />
            <SummaryStat icon="Timer" value={formatDuration(elapsedSeconds)} label="elapsed" />
            <div style={{ width: 0, height: 20, borderLeft: 'var(--stroke-xs) solid var(--border-neutral-default)' }} />
            <SummaryStat icon="Inventory" value={String(model.summary.batchedOrders)} label="batched orders" />
          </div>
        </div>
        <div style={{ flexShrink: 0 }}>
          <DrillLink label="Batched Orders" onClick={onBatchedOrders} />
        </div>
      </div>
    </div>
  );
}

/** Outcome badge per leg — matches the wireframes' Desktop Badge instances.
 *  Unaccepted uses the outlined **Deactivate** icon (Figma); Broadcasting's signal bars
 *  and Accepted's **plain `Check`** are filled. (Accepted is `Icon/Check`, verified on
 *  the accepted-leg card `1707:121735` — not the circled `Check-Circle`.) */
const OUTCOME_BADGE: Record<
  BroadcastLeg['outcome'],
  { label: string; color: 'information' | 'success' | 'neutral'; icon?: 'Signal-3-Bars' | 'Check' | 'Deactivate'; outlined?: boolean }
> = {
  broadcasting: { label: 'Broadcasting', color: 'information', icon: 'Signal-3-Bars' },
  accepted: { label: 'Accepted', color: 'success', icon: 'Check' },
  unaccepted: { label: 'Unaccepted', color: 'neutral', icon: 'Deactivate', outlined: true },
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

/**
 * The accepting driver's row, shown above the non-responder accordion on an Accepted leg.
 *
 * Wrapped in its **own nested `ContentCard`** — the accepted-leg card `1707:121735` puts a
 * second, inset Content Card (672×76, pad 16, radius 12, 1px border) around this row, which
 * is what visually lifts the driver who took the job out of the surrounding card. It keeps
 * its Call button even when the rest of the log hides them: this is the assigned driver, the
 * one person worth phoning.
 *
 * The padding override is deliberate: `ContentCard`'s own 20px is the *outer* card's
 * padding, but Figma insets this nested one at 16 (hence 672×**76**, not 86).
 */
function AcceptedRow({ acceptedBy }: { acceptedBy: NonNullable<BroadcastLeg['acceptedBy']> }): React.ReactElement {
  return (
    <ContentCard style={{ padding: 'var(--padding-16px)' }}>
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
            <span className="text-label-s-regular" style={{ color: 'var(--text-default-label-idle)', whiteSpace: 'nowrap' }}>
              {acceptedBy.seconds}s
            </span>
            <div style={{ width: 0, height: 20, borderLeft: 'var(--stroke-xs) solid var(--border-neutral-default)' }} />
          </div>
        }
        showInteractiveElements
        interactiveElements={
          // Inert — no call-integration flow exists yet (VOIP-gated per the designer's note).
          <Button variant="secondary" size="medium" iconOnly="Phone" iconOutlined aria-label={`Call ${acceptedBy.name}`} />
        }
      />
    </ContentCard>
  );
}

/**
 * One timeline entry. Per Figma `518:63890` ("Timeline Activity"), the Branch column
 * (dot + dashed line) runs beside the row's **full** content — the optional round
 * marker *and* the card — not just beside the card. That's what keeps the dash
 * continuous across a round boundary: the marker sits inside the same right-hand
 * column the branch is stretched against, instead of floating above it with no
 * branch alongside.
 *
 * The dot's vertical offset from the row top is fixed by what precedes it in that
 * column: 24px when the card is the first thing in the row (padding-20 + half the
 * 20px title line, minus half the 12px dot), 64px when a round marker (40px) comes
 * first (40 + 24). Every row renders a spacer of that exact height before the dot —
 * transparent for the very first row in the whole timeline (nothing to connect to
 * above it), dashed for every other row so the line runs unbroken through the gap
 * left by the previous row's `paddingBottom: 40`.
 */
function TimelineEntry({
  leg,
  marker,
  onMarkerOlder,
  onMarkerNewer,
  isFirst,
  isLast,
  legIndex,
  showCallButton,
}: {
  leg: BroadcastLeg;
  /** Round-marker label for this entry, if it opens a new round group. */
  marker: string | null;
  onMarkerOlder: (() => void) | null;
  onMarkerNewer: (() => void) | null;
  /** The very first entry in the whole timeline gets no incoming connector. */
  isFirst: boolean;
  isLast: boolean;
  /** Marks this entry as the scroll target for round-marker navigation. */
  legIndex: number;
  /** Passed down to the accordion — see `BroadcastModel.driverAssigned`. */
  showCallButton: boolean;
}): React.ReactElement {
  const outcomeBadge = OUTCOME_BADGE[leg.outcome];
  // The live leg's badge cycles signal bars — same animation as the Priority Driver
  // Groups card for the group currently being broadcast to.
  const signalIcon = useBroadcastSignalIcon(leg.outcome === 'broadcasting');
  const badgeIcon = leg.outcome === 'broadcasting' ? signalIcon : outcomeBadge.icon;
  const circleOffset = marker ? 64 : 24;

  return (
    <div style={{ display: 'flex', gap: 'var(--spacing-12px)', alignItems: 'flex-start', width: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', alignSelf: 'stretch', flexShrink: 0, width: 12, gap: 4 }}>
        {!isFirst ? (
          <DashedLine style={{ height: circleOffset - 4 }} />
        ) : (
          <div style={{ width: 0, height: circleOffset - 4 }} />
        )}
        <span style={{ display: 'flex', color: 'var(--icons-neutral-idle)', flexShrink: 0 }}>
          <Icon name="Circle-Large" size={12} />
        </span>
        {!isLast && <DashedLine style={{ flex: '1 0 0', minHeight: 12 }} />}
      </div>
      <div data-leg-index={legIndex} style={{ display: 'flex', flexDirection: 'column', flex: '1 0 0', minWidth: 0, paddingBottom: 'var(--padding-40px)' }}>
        {marker && <RoundMarker label={marker} onOlder={onMarkerOlder} onNewer={onMarkerNewer} />}
        <ContentCard>
          <ContentPrimitives
            type="utility"
            text={
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-8px)' }}>
                <span>{leg.title}</span>
                <Badge color={outcomeBadge.color} label={outcomeBadge.label} leadingIcon={badgeIcon} iconOutlined={leg.outcome === 'broadcasting' ? false : outcomeBadge.outlined} />
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
          <BroadcastEventAccordion
            type={leg.accordionType}
            drivers={leg.drivers}
            broadcastSeconds={leg.broadcastSeconds}
            showCallButton={showCallButton}
            defaultOpen={leg.defaultOpen}
          />
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
  holdMinutesRemaining,
  onViewActivity,
  onPriorityGroups,
  onBatchedOrders,
  onNotifiedDrivers,
  onRebroadcast,
  onDispatch,
}: {
  model: BroadcastModel;
  /** See {@link BroadcastStatusCard}'s prop of the same name. */
  holdMinutesRemaining: number | null;
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
      {/* On Hold's neutral nudge / Exhausted's error failure notice — the
          unsuccessful broadcast reads as an error, not information (Figma
          `1707:131951`, restyled Info → Error 2026-08-06). */}
      {model.banner && (
        <NotificationBanner
          type={model.banner.kind === 'assign-driver' ? 'neutral' : 'error'}
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
        holdMinutesRemaining={holdMinutesRemaining}
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
              style={{ width: 480 }}
            />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, width: '100%' }}>
            {model.legs.map((leg, i) => {
              const marker = markerAt.get(i) ?? null;
              // Neighbouring round groups, for the marker's scroll targets.
              const pos = groupStarts.indexOf(i);
              const newer = pos > 0 ? groupStarts[pos - 1]! : null;
              const older = pos >= 0 && pos < groupStarts.length - 1 ? groupStarts[pos + 1]! : null;
              return (
                <TimelineEntry
                  key={leg.id}
                  leg={leg}
                  marker={marker}
                  onMarkerNewer={newer != null ? scrollTo(newer) : null}
                  onMarkerOlder={older != null ? scrollTo(older) : null}
                  isFirst={i === 0}
                  isLast={i === model.legs.length - 1}
                  legIndex={i}
                  // Once the order has a driver, the drivers who passed on it aren't
                  // worth calling — so their Call buttons (and dividers) go away.
                  showCallButton={!model.driverAssigned}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
