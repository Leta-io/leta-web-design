import * as React from 'react';
import {
  AccordionChevron,
  AccordionContent,
  AccordionHeader,
  Avatar,
  Badge,
  Button,
  FeaturedIcon,
  NotificationBanner,
  TextArea,
  TopFilterSection,
  htmlToPlainText,
  useAccordion,
} from '@leta/components';
import { Icon, type IconName } from '@leta/icons';
import { ORDER_STATUS_BADGE, ORDER_STATUS_BADGE_ICON, ORDER_STATUS_LABEL } from '../../store/types.js';
import { activityTimestamp, DISPATCHER_NAME, type ActivityBodyBlock, type ActivityItem, type TitleSegment } from './activityModel.js';
import type { ProofFile } from './detailModel.js';
import { renderRichText } from '../../lib/richText.js';

/**
 * Activity tab (Order Detail drawer) — the local "Activity" entry component
 * (Figma `1487:173235`, LETA Playground file, 20 variants) rendered generically
 * from the data model in `activityModel.ts`. Every entry is a timeline row:
 * a leading Avatar (actor) or FeaturedIcon (system/automatic action), a rich
 * title, a timestamp, and — when it carries detail — an expandable bordered
 * card (Accordion Behaviour: click-anywhere-on-header toggles, chevron rotates,
 * smooth reveal) holding one or more stacked blocks (status-change badges,
 * bold-value field change, quoted comment, or proof/attachment links).
 */

const FILLED_ICONS = new Set<IconName>(['Swap', 'Lock', 'Update', 'Proceed']);

function EntryIcon({ icon, size = 16, color }: { icon: IconName; size?: number; color?: string }): React.ReactElement {
  return <Icon name={icon} outlined={!FILLED_ICONS.has(icon)} size={size} style={color ? { color } : undefined} />;
}

function TitleRow({ segments }: { segments: TitleSegment[] }): React.ReactElement {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-8px)', flexWrap: 'wrap', minWidth: 0 }}>
      {segments.map((seg, i) => {
        if (seg.kind === 'text') {
          return (
            <span key={i} className="text-label-m-medium" style={{ color: 'var(--text-default-label)', whiteSpace: 'nowrap' }}>
              {seg.text}
            </span>
          );
        }
        if (seg.kind === 'name') {
          return (
            <span key={i} className="text-label-m-semibold" style={{ color: 'var(--text-default-label)', whiteSpace: 'nowrap' }}>
              {seg.text}
            </span>
          );
        }
        return (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-8px)' }}>
            <Avatar name={seg.name} src={seg.src} tone={seg.tone} size="xs" decorative />
            <span className="text-label-m-semibold" style={{ color: 'var(--text-default-label)', whiteSpace: 'nowrap' }}>
              {seg.name}
            </span>
          </span>
        );
      })}
    </div>
  );
}

function StatusBlock({ block }: { block: Extract<ActivityBodyBlock, { kind: 'status' }> }): React.ReactElement {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--spacing-8px)', padding: 'var(--padding-16px)', width: '100%', boxSizing: 'border-box' }}>
      <span style={{ display: 'flex', alignItems: 'center', paddingTop: 'var(--padding-2px)', color: 'var(--icons-neutral-idle)' }}>
        <EntryIcon icon={block.icon} />
      </span>
      <span className="text-label-m-regular" style={{ color: 'var(--text-default-label-idle)' }}>{block.lead}</span>
      <Badge color={ORDER_STATUS_BADGE[block.from]} label={ORDER_STATUS_LABEL[block.from]} leadingIcon={ORDER_STATUS_BADGE_ICON[block.from]} />
      <span className="text-label-m-regular" style={{ color: 'var(--text-default-label-idle)' }}>to</span>
      <Badge color={ORDER_STATUS_BADGE[block.to]} label={ORDER_STATUS_LABEL[block.to]} leadingIcon={ORDER_STATUS_BADGE_ICON[block.to]} />
    </div>
  );
}

function FieldBlock({ block }: { block: Extract<ActivityBodyBlock, { kind: 'field' }> }): React.ReactElement {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-8px)', padding: 'var(--padding-16px)', width: '100%', boxSizing: 'border-box' }}>
      <span style={{ display: 'flex', alignItems: 'center', paddingTop: 'var(--padding-2px)', flexShrink: 0, color: 'var(--icons-neutral-idle)' }}>
        <EntryIcon icon={block.icon} />
      </span>
      <p className="text-label-m-regular" style={{ margin: 0, color: 'var(--text-default-sub-body)', flex: '1 0 0', minWidth: 0 }}>
        {block.lead}{' '}
        <span className="text-label-m-medium" style={{ color: 'var(--text-default-heading)' }}>{block.from}</span>
        {' to '}
        <span className="text-label-m-medium" style={{ color: 'var(--text-default-heading)' }}>{block.to}</span>
      </p>
    </div>
  );
}

function CommentBlock({ block, bare }: { block: Extract<ActivityBodyBlock, { kind: 'comment' }>; bare?: boolean }): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-16px)',
        alignItems: 'flex-start',
        padding: 'var(--padding-16px)',
        width: '100%',
        boxSizing: 'border-box',
        background: 'var(--surface-secondary-bg-subtle)',
        borderRadius: bare ? 'var(--rounding-xl)' : undefined,
      }}
    >
      <p className="text-label-m-regular" style={{ margin: 0, color: 'var(--text-default-body)', width: '100%' }}>
        &ldquo;{renderRichText(block.text)}&rdquo;
      </p>
      {block.edits != null && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <span className="text-label-m-regular" style={{ color: 'var(--text-default-label-idle)', fontStyle: 'normal' }}>{block.edits} Edits</span>
          {block.editable && (
            <Button variant="plain" size="medium" iconLeft="Edit">Edit</Button>
          )}
        </div>
      )}
    </div>
  );
}

function AttachmentsBlock({
  block,
  onView,
}: {
  block: Extract<ActivityBodyBlock, { kind: 'attachments' }>;
  onView: (thumbnailSrc: string, label: string) => void;
}): React.ReactElement {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-12px)', padding: 'var(--padding-16px)', width: '100%', boxSizing: 'border-box' }}>
      {block.items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && <div style={{ alignSelf: 'stretch', width: 0, borderLeft: 'var(--stroke-xs) solid var(--border-neutral-default)' }} />}
          {item.kind === 'text' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-8px)' }}>
              <span style={{ display: 'flex', alignItems: 'center', paddingTop: 'var(--padding-2px)', color: 'var(--icons-neutral-idle)' }}>
                <EntryIcon icon={item.icon ?? 'Lock'} />
              </span>
              <span className="text-label-m-regular" style={{ color: 'var(--text-default-label-idle)', whiteSpace: 'nowrap' }}>{item.label}</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-8px)' }}>
              {item.thumbnailSrc && (
                <img
                  src={item.thumbnailSrc}
                  alt=""
                  style={{ width: 20, height: 20, objectFit: 'cover', borderRadius: 'var(--rounding-sm)', border: '1px solid rgba(227,227,227,0.6)', flexShrink: 0 }}
                />
              )}
              <Button variant="plain" size="small" onClick={() => item.thumbnailSrc && onView(item.thumbnailSrc, item.label)}>
                {item.label}
              </Button>
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function EntryBody({ blocks, onView }: { blocks: ActivityBodyBlock[]; onView: (thumbnailSrc: string, label: string) => void }): React.ReactElement | null {
  if (blocks.length === 0) return null;
  if (blocks.length === 1 && blocks[0]!.kind === 'comment') {
    return <CommentBlock block={blocks[0] as Extract<ActivityBodyBlock, { kind: 'comment' }>} bare />;
  }
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        width: '100%',
        border: 'var(--stroke-xs) solid var(--border-neutral-default)',
        borderRadius: 'var(--rounding-xl)',
        overflow: 'hidden',
        background: 'var(--surface-neutral-bg-default)',
      }}
    >
      {blocks.map((block, i) => {
        const bordered = i < blocks.length - 1;
        const inner =
          block.kind === 'status' ? (
            <StatusBlock block={block} />
          ) : block.kind === 'field' ? (
            <FieldBlock block={block} />
          ) : block.kind === 'comment' ? (
            <CommentBlock block={block} />
          ) : (
            <AttachmentsBlock block={block} onView={onView} />
          );
        return (
          <div key={i} style={{ width: '100%', borderBottom: bordered ? 'var(--stroke-xs) solid var(--border-neutral-default)' : undefined }}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}

function EntryLeading({ item }: { item: ActivityItem }): React.ReactElement {
  if (item.leading.kind === 'avatar') {
    return <Avatar name={item.leading.name!} src={item.leading.src} tone={item.leading.tone} size="small" decorative />;
  }
  return <FeaturedIcon icon={item.leading.icon!} color="neutral" outlined={!FILLED_ICONS.has(item.leading.icon!)} />;
}

function ActivityRow({
  item,
  isLast,
  onView,
}: {
  item: ActivityItem;
  isLast: boolean;
  onView: (thumbnailSrc: string, label: string) => void;
}): React.ReactElement {
  const { open, toggle } = useAccordion(true);
  const hasBody = item.blocks.length > 0;

  // Figma `Title + Date`: H, gap 10, cross CENTER, main SPACE_BETWEEN, h 32. The
  // chevron is a Plain / Icon Only / Small Button at 16×16 (not the section
  // organisms' Ghost / Prominent one) — hence `variant="plain"`.
  const header = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, width: '100%', minHeight: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-8px)', minWidth: 0 }}>
        <TitleRow segments={item.title} />
        {hasBody && <AccordionChevron open={open} onToggle={toggle} size={16} variant="plain" />}
      </div>
      <span className="text-body-s-regular" style={{ color: 'var(--text-default-label-idle)', whiteSpace: 'nowrap', flexShrink: 0 }}>
        {activityTimestamp(item.timestamp)}
      </span>
    </div>
  );

  // Row structure mirrors Figma `1487:173235` → `Details` (H, gap 12):
  //   Branch (HUG × FILL, cross CENTER) | Timeline Details (V, gap 8, pad [0,0,40,0])
  //
  // The 40px inter-row gap is the CONTENT column's own paddingBottom — never the
  // row root's. `Branch` stretches the row's full height, so its dashed line runs
  // *through* that gap and meets the next row's icon (the list stacks with gap 0),
  // producing one continuous timeline. Putting the padding on the row root instead
  // makes `align-self: stretch` stop at the row's content box, so the line ends
  // early and each row shows a visible break.
  //
  // Every row carries the 40px pad, including the last (Figma's creation variants
  // are 72 = 32 title + 40 pad) — which doubles as the end-of-scroll breathing room.
  return (
    <div style={{ display: 'flex', gap: 'var(--spacing-12px)', alignItems: 'flex-start', width: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', alignSelf: 'stretch', flexShrink: 0, width: 32 }}>
        <EntryLeading item={item} />
        {/* Figma `Line`: VECTOR, strokeWeight 1, dashPattern [6, 6], centered in the
            32px column. A repeating gradient reproduces the exact 6/6 rhythm — CSS
            `border-left: dashed` would use the browser's own dash length instead.
            Omitted on the last row (Figma's creation variants have no Line child). */}
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
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-8px)',
          flex: '1 0 0',
          minWidth: 0,
          paddingBottom: 'var(--spacing-40px)',
        }}
      >
        {hasBody ? <AccordionHeader open={open} onToggle={toggle}>{header}</AccordionHeader> : header}
        {hasBody && (
          <AccordionContent open={open} topGap="0px" gap="0px">
            <EntryBody blocks={item.blocks} onView={onView} />
          </AccordionContent>
        )}
      </div>
    </div>
  );
}

type ActivityFilter = 'all' | 'comments' | 'events';

const FILTERS: { key: ActivityFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'comments', label: 'Comments' },
  { key: 'events', label: 'Events' },
];

/**
 * The scrollable timeline region of the Activity tab — filter bar + timeline
 * entries only. The comment composer and terminal notice are separate exports
 * rendered in the ModalShell footer region (fixed, outside scroll).
 *
 * Items are expected to be pre-merged and pre-reversed (newest first) by the
 * caller (OrderDetailDrawer).
 */
export function ActivityTimeline({
  items,
  onViewProof,
}: {
  items: ActivityItem[];
  onViewProof: (file: ProofFile) => void;
}): React.ReactElement {
  const [filter, setFilter] = React.useState<ActivityFilter>('all');

  const onView = (thumbnailSrc: string, label: string) => {
    onViewProof({ src: thumbnailSrc, title: label, label, fileName: 'Image.png', viewer: label.toLowerCase().includes('signature') ? 'signature' : 'image' });
  };

  const visible = filter === 'all' ? items : items.filter((i) => (filter === 'comments' ? i.kind === 'comment' : i.kind === 'event'));

  // Figma `Main Body`: pad [24,16,24,16], gap 24 between the filter row and the
  // scroll frame. Horizontal padding is 16 — the composer section below uses the
  // same inset so its demarcator lines up.
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', padding: '0 var(--padding-16px)', boxSizing: 'border-box' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--surface-neutral-bg-default)', paddingTop: 'var(--padding-24px)', paddingBottom: 'var(--padding-24px)' }}>
        <TopFilterSection
          filters={FILTERS.map((f) => ({ label: f.label, selected: f.key === filter }))}
          onFilterClick={(i) => setFilter(FILTERS[i]!.key)}
          animatedSelection
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        {visible.length === 0 ? (
          <div className="text-label-m-regular" style={{ color: 'var(--text-default-label-idle)', padding: 'var(--padding-24px) 0' }}>
            No {filter} yet.
          </div>
        ) : (
          visible.map((item, i) => <ActivityRow key={item.id} item={item} isLast={i === visible.length - 1} onView={onView} />)
        )}
      </div>
    </div>
  );
}

/**
 * Shared chrome for the two fixed bottom regions (composer / terminal notice).
 *
 * Both sit in the ModalShell footer region, outside the scrollable body. In Figma
 * the divider above them is the **Scroll Frame's** bottom stroke, which is 736 wide
 * — i.e. inset by the Main Body's 16px horizontal padding, NOT edge-to-edge (unlike
 * the header divider, which is full-bleed). So the border is drawn on an inner
 * element within the 16px inset rather than on the full-width root.
 *
 * Spacing: `Container` gap 20 (divider → content), `Main Body` pad-bottom 24.
 */
function BottomRegion({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <div
      style={{
        width: '100%',
        boxSizing: 'border-box',
        padding: '0 var(--padding-16px)',
        background: 'var(--surface-neutral-bg-default)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-16px)',
          width: '100%',
          boxSizing: 'border-box',
          borderTop: 'var(--stroke-xs) solid var(--border-neutral-default)',
          paddingTop: 'var(--padding-20px)',
          paddingBottom: 'var(--padding-24px)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Fixed comment-composer section — the Figma `Comment` frame (V, gap 16): a Rich
 * Data Entry that fills the width, plus the editable-notice banner.
 */
export function ActivityComposerSection({ onPost }: { onPost: (html: string) => void }): React.ReactElement {
  // `html` is sanitized rich text (bold/italic/underline/line-breaks only —
  // see `sanitizeRichText`); emptiness is checked on visible text, not the
  // markup string, so e.g. an empty bolded span doesn't count as content.
  const [html, setHtml] = React.useState('');
  const send = () => {
    if (htmlToPlainText(html).trim().length === 0) return;
    onPost(html);
    setHtml('');
  };
  return (
    <BottomRegion>
      <TextArea
        variant="rich"
        showLabel={false}
        showHelper={false}
        showCounter={false}
        placeholder="Leave a comment"
        value={html}
        onChange={setHtml}
        onSend={send}
        // TextArea's root is a fixed `width: 350` by default; Figma's instance here
        // is `szH: FILL`, so it must be stretched to the region width. The Send
        // button self-disables until there's text (see TextArea).
        style={{ width: '100%' }}
      />
      <NotificationBanner type="neutral" variant="subtle" description="Comments are editable within 5 minutes." />
    </BottomRegion>
  );
}

/**
 * Terminal-status notice — rendered in the ModalShell footer region for
 * Delivered and Cancelled orders (no composer, no action buttons).
 */
export function ActivityTerminalNotice(): React.ReactElement {
  return (
    <BottomRegion>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-8px)' }}>
        <Icon name="Info" outlined size={16} style={{ color: 'var(--icons-neutral-idle)', flexShrink: 0 }} />
        <span className="text-label-m-regular" style={{ color: 'var(--text-default-label-idle)' }}>
          Comments are not available for completed orders.
        </span>
      </div>
    </BottomRegion>
  );
}

/** @deprecated Use {@link ActivityTimeline} + {@link ActivityComposerSection} instead. */
export const ActivityList = ActivityTimeline;
