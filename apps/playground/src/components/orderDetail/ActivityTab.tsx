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
import { activityTimestamp, type ActivityBodyBlock, type ActivityItem, type TitleSegment } from './activityModel.js';
import { CURRENT_USER } from '../../store/currentUser.js';
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

function CommentBlock({ block, bare, onEdit }: { block: Extract<ActivityBodyBlock, { kind: 'comment' }>; bare?: boolean; onEdit?: () => void }): React.ReactElement {
  // Figma `1487:173226` (Dispatcher Comment (Editable)): the `Comment` frame holds
  // ONLY the body text (V, pad 16, bg secondary-bg-subtle, radius 12 / `--rounding-xl`).
  // The "N Edits" label + Edit button live in a SEPARATE `Edit section` row BELOW
  // the card — a sibling in Timeline Details (gap 8), on the default surface — NOT
  // inside the tinted card.
  const card = (
    <div
      style={{
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
    </div>
  );
  if (block.edits == null) return card;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-8px)', width: '100%' }}>
      {card}
      {/* Edit section — Figma `Edit section`: H, gap 10, SPACE_BETWEEN, below the
          card on the default surface. "N Edits" = Label/M/Regular /
          `--text-default-label-idle`; Edit button = Plain / Medium / Leading Icon,
          outlined `Edit-Outline` glyph, no underline (`Show Underline: false`).
          Edit is only offered on the user's OWN comment (`editable`), and clicking
          it swaps the row into the inline editor (see CommentEditor). */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, width: '100%' }}>
        <span className="text-label-m-regular" style={{ color: 'var(--text-default-label-idle)' }}>{block.edits} Edits</span>
        {block.editable && (
          <Button variant="plain" size="medium" iconLeft="Edit" iconOutlined showUnderline={false} onClick={onEdit}>
            Edit
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Inline comment editor — the Figma "Dispatcher Comment (Editing)" state
 * (`1685:119878`, updated 2026-07-31), shown after the user clicks Edit on their
 * OWN comment. The comment card + edit section is replaced by a Rich Data Entry
 * (State=Active, pre-filled, auto-focused) whose footer carries the formatting
 * toggles on the left and **Cancel (Secondary) + Save (Primary), both Small** in
 * the trailing slot — the DS `TextArea variant="rich"` default. (The prior
 * separate Card Footer was removed by the designer.)
 */
function CommentEditor({
  initialHtml,
  onCancel,
  onSave,
}: {
  initialHtml: string;
  onCancel: () => void;
  onSave: (html: string) => void;
}): React.ReactElement {
  const [html, setHtml] = React.useState(initialHtml);
  const canSave = htmlToPlainText(html).trim().length > 0;
  return (
    <TextArea
      variant="rich"
      showLabel={false}
      showHelper={false}
      showCounter={false}
      autoFocus
      value={html}
      onChange={setHtml}
      onCancel={onCancel}
      onSave={() => canSave && onSave(html)}
      saveDisabled={!canSave}
      style={{ width: '100%' }}
    />
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

function EntryBody({ blocks, onView, onStartEdit }: { blocks: ActivityBodyBlock[]; onView: (thumbnailSrc: string, label: string) => void; onStartEdit?: () => void }): React.ReactElement | null {
  if (blocks.length === 0) return null;
  if (blocks.length === 1 && blocks[0]!.kind === 'comment') {
    return <CommentBlock block={blocks[0] as Extract<ActivityBodyBlock, { kind: 'comment' }>} bare onEdit={onStartEdit} />;
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
  editing,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
}: {
  item: ActivityItem;
  isLast: boolean;
  onView: (thumbnailSrc: string, label: string) => void;
  editing: boolean;
  onStartEdit: (id: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string, html: string) => void;
}): React.ReactElement {
  const { open, toggle } = useAccordion(true);
  const hasBody = item.blocks.length > 0;
  // A single editable comment (the user's own) can switch into the inline editor.
  const editableComment =
    item.blocks.length === 1 && item.blocks[0]!.kind === 'comment' && item.blocks[0]!.editable
      ? (item.blocks[0] as Extract<ActivityBodyBlock, { kind: 'comment' }>)
      : null;

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
            32px column. A `repeating-linear-gradient` on a 1px-wide div reproduces
            the exact 6/6 rhythm but rendered visibly faint — reported and reproduced:
            a hairline element positioned at a fractional CSS pixel anti-aliases
            across two device-pixel columns, washing out the color regardless of the
            gradient's own hard stops. A native dashed `border-left` doesn't hit that
            failure mode (browsers rasterize border dashes without the extra
            anti-aliasing pass a background gradient gets) at the cost of an
            approximate, browser-chosen dash length rather than an exact 6/6.
            Omitted on the last row (Figma's creation variants have no Line child). */}
        {!isLast && (
          <div
            style={{
              flex: '1 0 0',
              width: 0,
              minHeight: 12,
              borderLeft: 'var(--stroke-xs) dashed var(--border-neutral-default)',
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
            {editing && editableComment ? (
              <CommentEditor
                initialHtml={editableComment.text}
                onCancel={onCancelEdit}
                onSave={(html) => onSaveEdit(item.id, html)}
              />
            ) : (
              <EntryBody blocks={item.blocks} onView={onView} onStartEdit={() => onStartEdit(item.id)} />
            )}
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
  onEditComment,
}: {
  items: ActivityItem[];
  onViewProof: (file: ProofFile) => void;
  /** Commit an edited comment (id + new sanitized HTML). Only fired for the
   *  user's own editable comments. */
  onEditComment?: (id: string, html: string) => void;
}): React.ReactElement {
  const [filter, setFilter] = React.useState<ActivityFilter>('all');
  const [editingId, setEditingId] = React.useState<string | null>(null);

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
          visible.map((item, i) => (
            <ActivityRow
              key={item.id}
              item={item}
              isLast={i === visible.length - 1}
              onView={onView}
              editing={editingId === item.id}
              onStartEdit={setEditingId}
              onCancelEdit={() => setEditingId(null)}
              onSaveEdit={(id, html) => {
                onEditComment?.(id, html);
                setEditingId(null);
              }}
            />
          ))
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
 * Spacing: `Container` gap 20 (divider → content), `Main Body` pad-bottom 24
 * (the designer reverted the Activity-tab Main Body to `[24,16,24,16]`).
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

/* ---- Comment Field (Figma `1691:120714`) — idle ⇆ active composer ---------- */

let commentStyleInjected = false;
function ensureCommentFieldStyles(): void {
  if (commentStyleInjected || typeof document === 'undefined') return;
  commentStyleInjected = true;
  const el = document.createElement('style');
  el.setAttribute('data-leta', 'comment-field');
  // Idle single-line field (Figma `Comment Field / Idle` — Input Field / Basic):
  // 40px, `--surface-neutral-input-field`, 1px `--border-neutral-default`, radius
  // 8, pad 10/12, left-aligned placeholder. A click target that expands to the
  // rich editor — so it carries a subtle hover (border darkens) to read as one.
  el.textContent = `
.leta-comment-idle {
  display: flex; align-items: center; width: 100%; height: 40px; box-sizing: border-box;
  padding: var(--padding-10px) var(--padding-12px); text-align: left; cursor: text;
  background: var(--surface-neutral-input-field);
  border: var(--stroke-xs) solid var(--border-neutral-default);
  border-radius: var(--rounding-lg);
  color: var(--text-default-placeholder);
  transition: border-color 150ms cubic-bezier(0.2, 0, 0, 1);
}
.leta-comment-idle:hover { border-color: var(--border-neutral-hover, var(--icons-neutral-idle)); }
.leta-comment-idle:focus-visible {
  outline: var(--stroke-sm) solid var(--border-secondary-component-focus); outline-offset: 2px;
}
@keyframes leta-comment-field-in { from { opacity: 0; } to { opacity: 1; } }
.leta-comment-active { animation: leta-comment-field-in 200ms cubic-bezier(0.2, 0, 0, 1); }
@media (prefers-reduced-motion: reduce) { .leta-comment-active { animation: none; } }
`;
  document.head.appendChild(el);
}

/**
 * Animates its own height when `trigger` flips, between whatever content is
 * mounted before and after. Interruptible (a plain CSS `height` transition, per
 * make-interfaces-feel-better — never `transition: all`); releases to `height:auto`
 * once settled so the rich field can still grow as the user types. Honors
 * `prefers-reduced-motion`.
 */
function AnimatedHeight({ trigger, children }: { trigger: boolean; children: React.ReactNode }): React.ReactElement {
  const ref = React.useRef<HTMLDivElement>(null);
  const prevH = React.useRef<number | null>(null);
  const mounted = React.useRef(false);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;
    el.style.height = 'auto';
    const to = el.offsetHeight;
    if (!mounted.current) {
      mounted.current = true;
      prevH.current = to;
      el.style.overflow = 'visible';
      return;
    }
    const from = prevH.current ?? to;
    prevH.current = to;
    if (from === to || reduce) {
      el.style.overflow = 'visible';
      return;
    }
    el.style.overflow = 'hidden';
    el.style.height = `${from}px`;
    void el.offsetHeight; // reflow so the transition runs from `from`
    el.style.height = `${to}px`;
    const onEnd = (e: TransitionEvent) => {
      if (e.propertyName !== 'height') return;
      el.style.height = 'auto';
      el.style.overflow = 'visible';
      el.removeEventListener('transitionend', onEnd);
    };
    el.addEventListener('transitionend', onEnd);
    return () => el.removeEventListener('transitionend', onEnd);
  }, [trigger]);
  return (
    <div ref={ref} style={{ transitionProperty: 'height', transitionDuration: '280ms', transitionTimingFunction: 'cubic-bezier(0.2, 0, 0, 1)' }}>
      {children}
    </div>
  );
}

/**
 * The docked comment composer (Figma `Comment Field` `1691:120714`). Two states:
 * - **Idle**: the dispatcher's Avatar + a compact single-line "Leave a comment"
 *   click target + the editable-window notice.
 * - **Active**: the single-line is swapped for a Rich Text Area (auto-focused;
 *   formatting toggles + Cancel/Save), same avatar + notice.
 *
 * Clicking the idle field — or the footer "Add Comment" button (via `active`) —
 * expands to Active; **Cancel** discards + collapses, **Save** posts + collapses.
 * The idle↔active height change animates (see {@link AnimatedHeight}).
 */
function CommentField({
  active,
  onActivate,
  onDeactivate,
  onPost,
}: {
  active: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  onPost: (html: string) => void;
}): React.ReactElement {
  ensureCommentFieldStyles();
  // `html` is sanitized rich text; emptiness is measured on visible text, not the
  // markup, so an empty bolded span doesn't count as content.
  const [html, setHtml] = React.useState('');
  const hasText = htmlToPlainText(html).trim().length > 0;
  const save = () => {
    if (!hasText) return;
    onPost(html);
    setHtml('');
    onDeactivate();
  };
  const cancel = () => {
    setHtml('');
    onDeactivate();
  };
  return (
    // Avatar + Input column, gap 12 (Figma). Top-aligned so the 40px avatar sits
    // level with the field's first line as the field grows.
    <div style={{ display: 'flex', gap: 'var(--spacing-12px)', alignItems: 'flex-start', width: '100%' }}>
      {/* The signed-in user's avatar — their uploaded photo if set, otherwise their
          tone monogram (same identity + styling as the TopBar / User Menu avatar). */}
      <Avatar name={CURRENT_USER.name} src={CURRENT_USER.avatarSrc} tone={CURRENT_USER.tone} size="medium" decorative />
      <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-16px)' }}>
        <AnimatedHeight trigger={active}>
          {active ? (
            <div className="leta-comment-active">
              <TextArea
                variant="rich"
                showLabel={false}
                showHelper={false}
                showCounter={false}
                autoFocus
                placeholder="Leave a comment"
                value={html}
                onChange={setHtml}
                onSave={save}
                onCancel={cancel}
                saveDisabled={!hasText}
                style={{ width: '100%' }}
              />
            </div>
          ) : (
            <button type="button" className="leta-comment-idle text-label-m-regular" onClick={onActivate}>
              Leave a comment
            </button>
          )}
        </AnimatedHeight>
        <NotificationBanner type="neutral" variant="subtle" description="Comments are editable within 5 minutes." />
      </div>
    </div>
  );
}

/**
 * Fixed comment-composer section — the Figma `Comment Field` docked at the bottom
 * of the Activity tab's Container. Wraps {@link CommentField} in the shared
 * {@link BottomRegion} (demarcator + insets). `active` is owned by the drawer so
 * the footer "Add Comment" button can expand it.
 */
export function ActivityComposerSection({
  active,
  onActivate,
  onDeactivate,
  onPost,
}: {
  active: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  onPost: (html: string) => void;
}): React.ReactElement {
  return (
    <BottomRegion>
      <CommentField active={active} onActivate={onActivate} onDeactivate={onDeactivate} onPost={onPost} />
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
