import * as React from 'react';
import { Icon, type IconName } from '@leta-io/icons';
import { Button } from '../Button/Button.js';
import { InputField } from '../InputField/InputField.js';
import { GroupedInput } from '../GroupedInput/GroupedInput.js';
import { DesktopMenuOptions } from '../DesktopMenuOptions/DesktopMenuOptions.js';
import { FooterFrame } from '../FooterFrame/FooterFrame.js';
import { NotificationBanner } from '../NotificationBanner/NotificationBanner.js';
import { Calendar } from './Calendar.js';
import { addMonths, diffDaysInclusive, formatMonthYear, isSameDay, timeOptions, MONTHS_ABBR } from './dateUtils.js';

export type DateTimePickerType = 'simple' | 'date-range' | 'date-time';

export interface DateTimePickerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Which picker. Default `simple`. */
  type?: DateTimePickerType;
  platform?: 'desktop' | 'mobile';
  /** Initial displayed month. Default: the current month. */
  defaultMonth?: { year: number; month: number };
  /** Mobile bottom-sheet header title / subtitle. */
  title?: string;
  subtitle?: string;
  /** Fired when the user applies a single date / range / time. `preset` is set for date-range presets and Custom. `explicit` is true only when the user clicked the Apply button (not a preset auto-apply). */
  onApply?: (value: { date?: Date | null; start?: Date | null; end?: Date | null; time?: string | null; preset?: string; explicit?: boolean }) => void;
  onCancel?: () => void;
}

const RANGE_PRESETS = ['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'Custom'] as const;
type Preset = (typeof RANGE_PRESETS)[number];

function startOfToday(): Date { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
function presetRange(name: Preset): { start: Date; end: Date } | null {
  const today = startOfToday();
  const minus = (n: number) => { const d = new Date(today); d.setDate(d.getDate() - n); return d; };
  switch (name) {
    case 'Today': return { start: today, end: today };
    case 'Yesterday': return { start: minus(1), end: minus(1) };
    case 'Last 7 Days': return { start: minus(6), end: today };
    case 'Last 30 Days': return { start: minus(29), end: today };
    default: return null;
  }
}
function fmt(d: Date | null | undefined): string { return d ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}` : ''; }
// Parse a typed `dd/mm/yyyy` string into a Date (null if not a valid calendar date).
function parseDMY(s: string): Date | null {
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const d = +m[1]!, mo = +m[2]! - 1, y = +m[3]!;
  const date = new Date(y, mo, d);
  return date.getFullYear() === y && date.getMonth() === mo && date.getDate() === d ? date : null;
}

// The Time of Day scroll list shows no scrollbar chrome — same convention as the
// Table body / popover lists (the scroll affordance is the clipped last row, not a
// bar). `scrollbar-width: none` covers Firefox, `::-webkit-scrollbar { display:
// none }` covers WebKit/Blink (incl. macOS "always show scroll bars").
const DTP_STYLE_ID = 'leta-datetimepicker-scroll';
const DTP_CSS = `
.leta-dtp-noscrollbar { scrollbar-width: none; -ms-overflow-style: none; }
.leta-dtp-noscrollbar::-webkit-scrollbar { display: none; width: 0; height: 0; }
`;
function ensureDateTimePickerStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(DTP_STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = DTP_STYLE_ID;
  el.textContent = DTP_CSS;
  document.head.appendChild(el);
}

const Demarcator = ({ vertical }: { vertical?: boolean }) =>
  vertical
    ? <div style={{ width: 'var(--stroke-xs)', alignSelf: 'stretch', backgroundColor: 'var(--border-neutral-default)', flexShrink: 0 }} />
    : <div style={{ height: 'var(--stroke-xs)', width: '100%', backgroundColor: 'var(--border-neutral-default)' }} />;

// ─── Mobile "Time of Day" wheel (Figma `8446:7759`) — three scroll columns
// (Hours 1–12 · Minutes 00–59 · AM/PM). The centred value is dark, neighbours grey;
// a bordered 40px slot marks the selection. Matches the mobile Date & Time picker. ───
const WHEEL_HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const WHEEL_MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const WHEEL_PERIODS = ['AM', 'PM'];
const WHEEL_H = 151;
const WHEEL_ROW = 40;

function WheelColumn({ values, value, onChange }: { values: string[]; value: string; onChange: (v: string) => void }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const idx = Math.max(0, values.indexOf(value));
  React.useEffect(() => { if (ref.current) ref.current.scrollTop = idx * WHEEL_ROW; }, [idx]);
  return (
    <div style={{ position: 'relative', flex: 1, minWidth: 0, height: WHEEL_H, overflow: 'hidden' }}>
      {/* Centred selection slot — 1px bordered 40px row (Figma highlight). */}
      <div style={{ position: 'absolute', left: 8, right: 8, top: '50%', transform: 'translateY(-50%)', height: WHEEL_ROW, border: 'var(--stroke-xs) solid var(--border-neutral-default)', borderRadius: 'var(--rounding-lg)', pointerEvents: 'none' }} />
      <div ref={ref} style={{ height: '100%', overflowY: 'auto', overscrollBehavior: 'none', scrollSnapType: 'y mandatory', padding: `${(WHEEL_H - WHEEL_ROW) / 2}px 0` }}>
        {values.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className="text-label-l-regular"
            style={{ width: '100%', height: WHEEL_ROW, display: 'flex', alignItems: 'center', justifyContent: 'center', scrollSnapAlign: 'center', cursor: 'pointer', border: 'none', background: 'transparent', padding: 0, color: v === value ? 'var(--text-default-label)' : 'var(--text-default-label-idle)' }}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Date & Time Pickers (`1182:17579`) — `simple` (one calendar), `date-range`
 * (preset list + dual calendars), and `date-time` (calendar + time column), on
 * desktop or mobile. Desktop calendars show the abbreviated month ("Nov 2024");
 * mobile shows the full month. Range selection paints a continuous grey band
 * across the in-between days.
 *
 * **Footer (desktop)** — a Footer Frame (Card Footer) with a Notification Banner
 * on the left + Clear / Apply on the right. The banner message is contextual:
 * - **Date & Time**: while *not both* a date and a time are selected (none, only
 *   the date, or only the time) it reads **"Select date & time"**; once **both**
 *   are selected it shows the chosen value, e.g. **"Nov 5 2024, 12:30 AM"**.
 * - **Date Range**: it reads **"{N} days selected"**.
 */
export const DateTimePicker = React.forwardRef<HTMLDivElement, DateTimePickerProps>(function DateTimePicker(
  { type = 'simple', platform = 'desktop', defaultMonth, title = 'Select Date', subtitle = 'Pick a date', onApply, onCancel, style, ...rest },
  ref,
) {
  ensureDateTimePickerStyles();
  const isMobile = platform === 'mobile';
  const init = defaultMonth ?? { year: new Date().getFullYear(), month: new Date().getMonth() };
  const [view, setView] = React.useState(init);
  const [selected, setSelected] = React.useState<Date | null>(null);
  const [range, setRange] = React.useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const [preset, setPreset] = React.useState<Preset>('Custom');
  const [time, setTime] = React.useState<string | null>(null);
  // Mobile time-wheel parts (Hours / Minutes / AM-PM). Default 1:00 AM (Figma).
  const [tH, setTH] = React.useState('1');
  const [tM, setTM] = React.useState('00');
  const [tPer, setTPer] = React.useState('AM');
  const composeTime = (h: string, m: string, p: string) => `${h}:${m} ${p}`;

  // ─── Editable range fields (Start / End) ───
  // The fields show the selected range AND accept typed `dd/mm/yyyy` input. Text is
  // kept in local state, synced from the range when it changes via the calendar /
  // presets, and committed (parsed) on blur / Enter. An invalid entry reverts.
  const [startText, setStartText] = React.useState('');
  const [endText, setEndText] = React.useState('');
  React.useEffect(() => { setStartText(fmt(range.start)); }, [range.start]);
  React.useEffect(() => { setEndText(fmt(range.end)); }, [range.end]);
  const commitStart = () => {
    const d = parseDMY(startText);
    if (!d) { setStartText(fmt(range.start)); return; }
    setPreset('Custom');
    setRange((r) => (r.end && d > r.end ? { start: r.end, end: d } : { start: d, end: r.end }));
    setView({ year: d.getFullYear(), month: d.getMonth() });
  };
  const commitEnd = () => {
    const d = parseDMY(endText);
    if (!d) { setEndText(fmt(range.end)); return; }
    setPreset('Custom');
    setRange((r) => (r.start && d < r.start ? { start: d, end: r.start } : { start: r.start, end: d }));
    setView({ year: d.getFullYear(), month: d.getMonth() });
  };
  const editableField = (text: string, setText: (s: string) => void, commit: () => void) => ({
    value: text,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setText(e.target.value),
    onBlur: commit,
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { commit(); (e.currentTarget as HTMLInputElement).blur(); } },
  });

  const prevMonth = () => setView((v) => addMonths(v.year, v.month, -1));
  const nextMonth = () => setView((v) => addMonths(v.year, v.month, 1));
  const prevYear = () => setView((v) => addMonths(v.year, v.month, -12));
  const nextYear = () => setView((v) => addMonths(v.year, v.month, 12));
  const next = addMonths(view.year, view.month, 1);

  const pickRangeDay = (date: Date) => {
    setPreset('Custom');
    setRange((r) => {
      if (!r.start || (r.start && r.end)) return { start: date, end: null };
      return date < r.start ? { start: date, end: r.start } : { start: r.start, end: date };
    });
  };
  const applyPreset = (name: Preset) => {
    setPreset(name);
    const pr = presetRange(name);
    if (pr) {
      setRange(pr);
      setView({ year: pr.start.getFullYear(), month: pr.start.getMonth() });
      // Preset states have no Apply button in Figma — selecting one applies immediately.
      onApply?.({ start: pr.start, end: pr.end, preset: name });
    } else {
      setRange({ start: null, end: null });
    }
  };

  const daysCount = diffDaysInclusive(range.start, range.end);
  const hasRange = !!(range.start && range.end);

  // "Nov 5 2024, 12:30 AM" — the selected date + time for the Date & Time banner.
  const formatDateTime = (d: Date, t: string) => `${MONTHS_ABBR[d.getMonth()]} ${d.getDate()} ${d.getFullYear()}, ${t}`;

  // ─── Desktop footer — a Footer Frame (Card Footer) with a Notification Banner
  // on the left (the contextual message + icon) and Clear / Apply on the right.
  // The footer carries a 1px top divider (Figma stroke INSIDE → drawn with an inset
  // box-shadow so it doesn't add to the 72px footer height) + 16px padding. ───
  const cardFooter = (message: string, bannerIcon: IconName | undefined, applyEnabled: boolean, onClear: () => void) => (
    <div style={{ boxShadow: 'inset 0 var(--stroke-xs) 0 var(--border-neutral-default)', padding: 'var(--padding-16px)' }}>
      <FooterFrame
        variant="card"
        leading={<NotificationBanner type="neutral" variant="subtle" icon={bannerIcon} description={message} showContentButtons={false} />}
      >
        <Button variant="secondary" size="medium" onClick={onClear}>Clear</Button>
        <Button variant="primary" size="medium" disabled={!applyEnabled} onClick={() => onApply?.({ date: selected, start: range.start, end: range.end, time, preset, explicit: true })}>Apply</Button>
      </FooterFrame>
    </div>
  );

  // ─── Time column (date-time) ───
  // The time column stretches to the calendar-driven row height; the scroll list
  // is absolutely positioned so its (tall) content doesn't drive the row height
  // (which would otherwise blow the card up). Figma Time Picker is szV FILL.
  const timeColumn = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-8px)', flex: 1, minWidth: 0, alignSelf: 'stretch', minHeight: 0 }}>
      <span className="text-label-l-semibold" style={{ color: 'var(--text-default-heading)', textAlign: 'center', whiteSpace: 'nowrap' }}>Time of Day</span>
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        {/* The scroll viewport clips overflow on both axes, which would crop a focused
            row's focus ring (outline-offset 2px + 1.5px). Bleed the viewport out 4px on
            top/left/right (those zones are empty — the title gap and side gutters) so the
            ring has room there, while keeping the BOTTOM flush with the footer boundary so
            a partially-scrolled row never pokes through the (transparent) footer divider.
            `scroll-padding-block` keeps a keyboard-focused row 4px off the bottom edge so
            its ring still fits. Padding offsets the bleed → rows keep their full Figma
            column width + position. */}
        <div className="leta-dtp-noscrollbar" style={{ position: 'absolute', inset: 0, margin: '-4px -4px 0', boxSizing: 'border-box', padding: '4px 4px 0', scrollPaddingBlock: 4, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-8px)', overflowY: 'auto', overscrollBehavior: 'contain' }}>
          {timeOptions(30).map((t) => (
            <DesktopMenuOptions key={t} type="time-picker" label={t} active={time === t} onSelect={() => setTime(t)} style={{ width: '100%' }} />
          ))}
        </div>
      </div>
    </div>
  );

  const cardBase: React.CSSProperties = {
    boxSizing: 'border-box',
    backgroundColor: 'var(--surface-neutral-bg-default)',
    display: 'flex',
    flexDirection: 'column',
  };

  // ════════ MOBILE ════════
  if (isMobile) {
    const calendar = (
      <Calendar
        platform="mobile"
        year={view.year}
        month={view.month}
        selected={type === 'date-range' ? undefined : selected}
        rangeStart={type === 'date-range' ? range.start : undefined}
        rangeEnd={type === 'date-range' ? range.end : undefined}
        onSelectDay={type === 'date-range' ? pickRangeDay : setSelected}
        onPrevMonth={prevMonth}
        onNextMonth={nextMonth}
      />
    );
    // Figma bottom-sheet heights (header 88 + scroll content + footer 104).
    const mobileHeight = { simple: 500, 'date-range': 568, 'date-time': 632 }[type];
    const sectionHeading = (t: string) => (
      <span className="text-label-l-semibold" style={{ color: 'var(--text-default-heading)' }}>{t}</span>
    );
    return (
      <div ref={ref} style={{ ...cardBase, width: 360, height: mobileHeight, borderRadius: 'var(--rounding-xxl)', overflow: 'hidden', border: 'var(--stroke-xs) solid var(--border-neutral-default)', ...style }} {...rest}>
        {/* Header (Mobile Modal) — title/subtitle + circular close button.
            Figma pad [24,16,16,16] + bottom divider. */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 'var(--spacing-8px)', padding: 'var(--padding-24px) var(--padding-16px) var(--padding-16px)', borderBottom: 'var(--stroke-xs) solid var(--border-neutral-default)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4px)', flex: 1, minWidth: 0 }}>
            <span className="text-heading-s-semibold" style={{ color: 'var(--text-default-heading)' }}>{title}</span>
            {subtitle ? <span className="text-body-m-regular" style={{ color: 'var(--text-default-sub-body)' }}>{subtitle}</span> : null}
          </div>
          <button type="button" aria-label="Close" onClick={onCancel} style={{ flexShrink: 0, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--rounding-round)', border: 'none', background: 'var(--surface-neutral-bg-muted)', cursor: 'pointer', padding: 0 }}>
            <Icon name="Cancel" size={16} style={{ color: 'var(--icons-neutral-default)' }} />
          </button>
        </div>
        {/* Content (scrolls between header + footer). Figma pad [16,16,40,16], gap 20. */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-20px)', padding: 'var(--padding-16px) var(--padding-16px) var(--padding-40px)' }}>
          {type === 'date-range' && (
            <GroupedInput
              variant="range-input"
              from={<InputField placeholder="dd/mm/yyyy" showLabel={false} showHelper={false} {...editableField(startText, setStartText, commitStart)} style={{ width: '100%' }} />}
              to={<InputField placeholder="dd/mm/yyyy" showLabel={false} showHelper={false} {...editableField(endText, setEndText, commitEnd)} style={{ width: '100%' }} />}
            />
          )}
          {type === 'date-time' && sectionHeading('Date')}
          {calendar}
          {type === 'date-time' && (
            <>
              <Demarcator />
              {sectionHeading('Time')}
              <div style={{ display: 'flex', gap: 'var(--spacing-8px)' }}>
                <WheelColumn values={WHEEL_HOURS} value={tH} onChange={(v) => { setTH(v); setTime(composeTime(v, tM, tPer)); }} />
                <WheelColumn values={WHEEL_MINUTES} value={tM} onChange={(v) => { setTM(v); setTime(composeTime(tH, v, tPer)); }} />
                <WheelColumn values={WHEEL_PERIODS} value={tPer} onChange={(v) => { setTPer(v); setTime(composeTime(tH, tM, v)); }} />
              </div>
            </>
          )}
        </div>
        {/* Footer (Mobile Modal) — Clear/Apply (Apply-only for Simple) + home indicator.
            Figma pad [16,16,0,16] + top divider; gap 20; buttons gap 16. */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-20px)', padding: 'var(--padding-16px) var(--padding-16px) 0', borderTop: 'var(--stroke-xs) solid var(--border-neutral-default)' }}>
          <div style={{ display: 'flex', gap: 'var(--spacing-16px)' }}>
            {type !== 'simple' && (
              <Button variant="secondary" size="medium" style={{ flex: 1, borderRadius: 'var(--rounding-round)' }} onClick={() => { setSelected(null); setRange({ start: null, end: null }); setTime(null); }}>Clear</Button>
            )}
            <Button variant="primary" size="medium" style={{ flex: 1, borderRadius: 'var(--rounding-round)' }} disabled={type === 'date-range' ? !hasRange : type === 'date-time' ? !(selected && time) : !selected} onClick={() => onApply?.({ date: selected, start: range.start, end: range.end, time })}>Apply</Button>
          </div>
          {/* Home indicator (Figma Nav Bar) — 108×4 dark bar centred in a 24px row. */}
          <div style={{ height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <div style={{ width: 108, height: 4, borderRadius: 'var(--rounding-round)', backgroundColor: 'var(--icons-neutral-default)' }} />
          </div>
        </div>
      </div>
    );
  }

  // ════════ DESKTOP ════════
  // Figma root stroke is 1px OUTSIDE — drawn as a non-inset box-shadow ring so the
  // inner content area keeps its full Figma width (a CSS border-box border would
  // eat 2px off the inner content). Drop shadow stacks after the ring.
  const desktopCard: React.CSSProperties = { ...cardBase, borderRadius: 'var(--rounding-xxl)', overflow: 'hidden', boxShadow: '0 0 0 var(--stroke-xs) var(--border-neutral-default), var(--shadow-neutral-3)', ...style };

  if (type === 'simple') {
    return (
      <div ref={ref} style={{ ...desktopCard, width: 304 }} {...rest}>
        <div style={{ padding: 'var(--padding-16px)' }}>
          <Calendar year={view.year} month={view.month} selected={selected} onSelectDay={setSelected} onPrevMonth={prevMonth} onNextMonth={nextMonth} onPrevYear={prevYear} onNextYear={nextYear} />
        </div>
      </div>
    );
  }

  if (type === 'date-time') {
    return (
      <div ref={ref} style={{ ...desktopCard, width: 418 }} {...rest}>
        {/* Content is 304px tall for the 5-row months Figma mocks (Content szV:FIXED h304;
            card = 304 + 72 footer = 376), but it must be a MINIMUM, not a fixed height: a
            month that spans six week rows (one starting on a Saturday, e.g. Aug 2026) makes
            the calendar 40px taller, and a hard height let that sixth row paint outside the
            content box and over the footer. Growing keeps Figma's exact geometry for every
            4- and 5-row month and only gives up 40px when the month genuinely needs it.
            Bottom pad stays 0 (Figma 16/16/0/16) so the time list runs flush to the footer
            divider; the calendar's own padding-bottom owns the 16px gap below the grid. */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: 'var(--spacing-12px)', minHeight: 304, boxSizing: 'border-box', padding: 'var(--padding-16px) var(--padding-16px) 0' }}>
          {/* Date Picker is a fixed 272px frame in Figma (7×32 cells + 6×8 gaps) — keep
              it fixed so the day grid aligns exactly; the time column flexes the rest.
              The 16px below the grid is explicit padding rather than leftover slack in the
              304, so a six-row month keeps the same breathing room above the footer. */}
          <div style={{ width: 272, flexShrink: 0, paddingBottom: 'var(--padding-16px)' }}>
            <Calendar year={view.year} month={view.month} selected={selected} onSelectDay={setSelected} onPrevMonth={prevMonth} onNextMonth={nextMonth} onPrevYear={prevYear} onNextYear={nextYear} />
          </div>
          <Demarcator vertical />
          {timeColumn}
        </div>
        {cardFooter(selected && time ? formatDateTime(selected, time) : 'Select date & time', selected && time ? 'Calendar' : undefined, !!(selected && time), () => { setSelected(null); setTime(null); })}
      </div>
    );
  }

  // date-range — Figma shows the dual calendars in EVERY state (Today / Last 30 /
  // Custom). Only the Custom state adds the Start/End fields (top) + footer
  // (bottom); the preset states are just [preset list | dual calendars].
  const isCustom = preset === 'Custom';
  const rangeCalendars = (
    <div style={{ display: 'flex', flexDirection: 'row', gap: 'var(--spacing-12px)', padding: isCustom ? '0 var(--padding-16px) var(--padding-16px)' : 'var(--padding-16px)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Calendar year={view.year} month={view.month} rangeStart={range.start} rangeEnd={range.end} onSelectDay={pickRangeDay} onPrevMonth={prevMonth} onNextMonth={nextMonth} onPrevYear={prevYear} onNextYear={nextYear} />
      </div>
      <Demarcator vertical />
      <div style={{ flex: 1, minWidth: 0 }}>
        <Calendar year={next.year} month={next.month} rangeStart={range.start} rangeEnd={range.end} onSelectDay={pickRangeDay} onPrevMonth={prevMonth} onNextMonth={nextMonth} onPrevYear={prevYear} onNextYear={nextYear} />
      </div>
    </div>
  );
  return (
    <div ref={ref} style={{ ...desktopCard, width: 764 }} {...rest}>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch' }}>
        {/* preset list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-8px)', padding: 'var(--padding-8px)', width: 164, flexShrink: 0, borderRight: 'var(--stroke-xs) solid var(--border-neutral-default)' }}>
          {RANGE_PRESETS.map((p) => (
            <DesktopMenuOptions key={p} type="combobox" label={p} active={preset === p} onSelect={() => applyPreset(p)} style={{ width: '100%' }} />
          ))}
        </div>
        {/* content */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          {isCustom && (
            <div style={{ display: 'flex', flexDirection: 'row', gap: 'var(--spacing-16px)', padding: 'var(--padding-16px)' }}>
              <div style={{ flex: 1, minWidth: 0 }}><InputField label="Start" placeholder="dd/mm/yyyy" showHelper={false} {...editableField(startText, setStartText, commitStart)} style={{ width: '100%' }} /></div>
              <div style={{ flex: 1, minWidth: 0 }}><InputField label="End" placeholder="dd/mm/yyyy" showHelper={false} {...editableField(endText, setEndText, commitEnd)} style={{ width: '100%' }} /></div>
            </div>
          )}
          {rangeCalendars}
          {isCustom && cardFooter(`${daysCount} day${daysCount === 1 ? '' : 's'} selected`, 'Calendar', hasRange, () => { setRange({ start: null, end: null }); })}
        </div>
      </div>
    </div>
  );
});
