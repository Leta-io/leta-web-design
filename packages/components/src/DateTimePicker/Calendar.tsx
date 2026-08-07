import * as React from 'react';
import { Icon } from '@leta-io/icons';
import { Button } from '../Button/Button.js';
import { DesktopMenuOptions } from '../DesktopMenuOptions/DesktopMenuOptions.js';
import { MobileMenuOptions } from '../MobileMenuOptions/MobileMenuOptions.js';
import { WEEKDAYS, monthMatrix, formatMonthYear, isSameDay, type DayCell } from './dateUtils.js';

export interface CalendarProps {
  /** Displayed year. */
  year: number;
  /** Displayed month (0–11). */
  month: number;
  platform?: 'desktop' | 'mobile';
  /** Single selected day (simple / date-time). */
  selected?: Date | null;
  /** Range endpoints (date-range). */
  rangeStart?: Date | null;
  rangeEnd?: Date | null;
  onSelectDay?: (date: Date) => void;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  onPrevYear?: () => void;
  onNextYear?: () => void;
  style?: React.CSSProperties;
}

const RANGE_BG = 'var(--surface-neutral-bg-muted)';

/**
 * Calendar — the shared month grid used by every Date & Time Picker type. A
 * Month & Year header (navigation + label), a Monday-first weekday row, and a
 * weekday-aligned grid of day cells (reusing the Day Cell menu-option). Selected
 * days / range endpoints render `active`; in-between range days get a light fill;
 * leading/trailing days from adjacent months are muted and non-interactive.
 */
export const Calendar = React.forwardRef<HTMLDivElement, CalendarProps>(function Calendar(
  { year, month, platform = 'desktop', selected, rangeStart, rangeEnd, onSelectDay, onPrevMonth, onNextMonth, onPrevYear, onNextYear, style },
  ref,
) {
  const isMobile = platform === 'mobile';
  const weeks = monthMatrix(year, month);

  // Month/year nav. Mobile uses the touch-first Mobile Button (Secondary, Small,
  // Icon Only — idle/pressed only, no hover) per Figma; desktop uses the Secondary
  // Small Icon-Only desktop button.
  const navBtn = (icon: 'Backward' | 'Chevron-Left' | 'Chevron-Right' | 'Forward', onClick?: () => void, label?: string) =>
    isMobile ? (
      <Button variant="secondary" size="small" platform="mobile" iconOnly={icon} aria-label={label ?? icon} onClick={onClick} />
    ) : (
      <Button variant="secondary" size="small" iconOnly={icon} aria-label={label ?? icon} onClick={onClick} />
    );

  const header = (
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--spacing-8px)', width: '100%' }}>
      {isMobile ? (
        navBtn('Chevron-Left', onPrevMonth, 'Previous month')
      ) : (
        <div style={{ display: 'flex', gap: 'var(--spacing-8px)' }}>
          {navBtn('Backward', onPrevYear, 'Previous year')}
          {navBtn('Chevron-Left', onPrevMonth, 'Previous month')}
        </div>
      )}
      <span className="text-label-l-semibold" style={{ color: 'var(--text-default-heading)', whiteSpace: 'nowrap' }}>
        {formatMonthYear(year, month, !isMobile)}
      </span>
      {isMobile ? (
        navBtn('Chevron-Right', onNextMonth, 'Next month')
      ) : (
        <div style={{ display: 'flex', gap: 'var(--spacing-8px)' }}>
          {navBtn('Chevron-Right', onNextMonth, 'Next month')}
          {navBtn('Forward', onNextYear, 'Next year')}
        </div>
      )}
    </div>
  );

  const CELL = 32;
  // Desktop: a fixed 272px grid (7×32 cells + 6×8 gaps), left-aligned.
  // Mobile uses its own 7-equal-flex-column rows (below) to FILL the 328px width.
  const ROW: React.CSSProperties = { display: 'flex', flexDirection: 'row', gap: 'var(--spacing-8px)', alignItems: 'center' };
  // Mobile cell column — equal flex share, centred content (so the grid fills width).
  const mobileCol: React.CSSProperties = { flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' };

  // Desktop "Days of the Week" frame is 32px tall — the 16px label text with 8px
  // top/bottom padding (Figma pad [8,0,8,0]); this keeps the desktop calendar a full
  // 272 tall so the gap below the last week matches Figma (16px in Date & Time).
  // Mobile's row has no padding (Figma pad [0,0,0,0]).
  const weekdayRow = isMobile ? (
    <div style={{ display: 'flex', width: '100%' }}>
      {WEEKDAYS.map((d) => (
        <div key={d} style={mobileCol}>
          <span className="text-label-s-regular" style={{ color: 'var(--text-default-sub-body)' }}>{d}</span>
        </div>
      ))}
    </div>
  ) : (
    <div style={{ ...ROW, padding: 'var(--padding-8px) 0' }}>
      {WEEKDAYS.map((d) => (
        <span key={d} className="text-label-s-regular" style={{ width: CELL, flexShrink: 0, textAlign: 'center', color: 'var(--text-default-sub-body)' }}>{d}</span>
      ))}
    </div>
  );

  // ─── range helpers ───
  const isActive = (d: Date) => isSameDay(d, selected) || isSameDay(d, rangeStart) || isSameDay(d, rangeEnd);
  const stripped = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const lo = rangeStart && rangeEnd ? Math.min(stripped(rangeStart), stripped(rangeEnd)) : null;
  const hi = rangeStart && rangeEnd ? Math.max(stripped(rangeStart), stripped(rangeEnd)) : null;
  const inRangeIncl = (d: Date) => lo != null && hi != null && stripped(d) >= lo && stripped(d) <= hi;

  // A normal day cell (active dark when selected / endpoint). Leading/trailing days
  // from the adjacent months render as an EMPTY slot (no number) — the grid keeps the
  // cell so alignment holds, but adjacent-month dates are not shown (matches the
  // common date-picker pattern of blank cells outside the current month).
  const dayCell = (date: Date, inMonth: boolean) => {
    const day = date.getDate();
    if (!inMonth) {
      return <span aria-hidden="true" style={{ width: CELL, height: CELL, flexShrink: 0 }} />;
    }
    return isMobile ? (
      <MobileMenuOptions type="mobile-day-cell" label={String(day)} active={isActive(date)} onSelect={() => onSelectDay?.(date)} />
    ) : (
      <DesktopMenuOptions type="day-cell" label={String(day)} active={isActive(date)} onSelect={() => onSelectDay?.(date)} />
    );
  };

  // An in-range MIDDLE cell — transparent so the band shows through (the day-cell
  // idle surface is opaque white, which would mask the band).
  const middleCell = (date: Date) => (
    <button
      type="button"
      onClick={() => onSelectDay?.(date)}
      className="text-label-m-regular"
      style={{ width: CELL, height: CELL, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-default-label)', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
    >
      {date.getDate()}
    </button>
  );

  // Mobile: 7 equal-flex columns (fills width). The in-range band is drawn as a
  // per-column background that touches its neighbours → a CONTINUOUS band (like
  // desktop). Endpoints get a HALF band (from the cell centre outward, rounded on the
  // outer cap) so the band connects into the dark endpoint with no stray nub.
  const renderWeekMobile = (week: DayCell[], wi: number) => (
    <div key={wi} style={{ display: 'flex', width: '100%' }}>
      {week.map((cell, j) => {
        const inR = cell.inMonth && inRangeIncl(cell.date);
        const isStart = isSameDay(cell.date, rangeStart);
        const isEnd = isSameDay(cell.date, rangeEnd);
        const single = isStart && isEnd;
        return (
          <div key={j} style={{ ...mobileCol, position: 'relative' }}>
            {inR && !single && (
              <div style={{
                position: 'absolute', top: 0, bottom: 0,
                left: isStart ? '50%' : 0,
                right: isEnd ? '50%' : 0,
                backgroundColor: RANGE_BG,
                borderTopLeftRadius: isStart ? 8 : 0,
                borderBottomLeftRadius: isStart ? 8 : 0,
                borderTopRightRadius: isEnd ? 8 : 0,
                borderBottomRightRadius: isEnd ? 8 : 0,
              }} />
            )}
            <div style={{ position: 'relative' }}>
              {inR && !isStart && !isEnd ? middleCell(cell.date) : dayCell(cell.date, cell.inMonth)}
            </div>
          </div>
        );
      })}
    </div>
  );

  // Desktop: group consecutive in-range cells into a continuous band
  // (mirrors Figma's "Selected" frame: bg-tertiary, gap 8, corner 8 on rows that
  // contain a range endpoint, 0 on full middle rows).
  const renderWeek = (week: DayCell[], wi: number) => {
    if (isMobile) return renderWeekMobile(week, wi);
    const items: React.ReactNode[] = [];
    let i = 0;
    while (i < week.length) {
      const cell = week[i]!;
      if (!(cell.inMonth && inRangeIncl(cell.date))) {
        items.push(<React.Fragment key={i}>{dayCell(cell.date, cell.inMonth)}</React.Fragment>);
        i++;
        continue;
      }
      const seg: DayCell[] = [];
      while (i < week.length && week[i]!.inMonth && inRangeIncl(week[i]!.date)) { seg.push(week[i]!); i++; }
      const containsEndpoint = seg.some((c) => isSameDay(c.date, rangeStart) || isSameDay(c.date, rangeEnd));
      items.push(
        <div key={`band-${i}`} style={{ display: 'flex', flexDirection: 'row', flexShrink: 0, gap: 'var(--spacing-8px)', backgroundColor: RANGE_BG, borderRadius: containsEndpoint ? 8 : 0 }}>
          {seg.map((c, j) => {
            const ep = isSameDay(c.date, rangeStart) || isSameDay(c.date, rangeEnd);
            return <React.Fragment key={j}>{ep ? dayCell(c.date, true) : middleCell(c.date)}</React.Fragment>;
          })}
        </div>,
      );
    }
    return <div key={wi} style={ROW}>{items}</div>;
  };

  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 'var(--spacing-16px)' : 'var(--spacing-8px)', width: '100%', boxSizing: 'border-box', ...style }}>
      {header}
      {weekdayRow}
      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 'var(--spacing-12px)' : 'var(--spacing-8px)' }}>
        {weeks.map((week, wi) => renderWeek(week, wi))}
      </div>
    </div>
  );
});
