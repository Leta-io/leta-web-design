import * as React from 'react';
import { Icon, type IconName } from '@leta/icons';
import { Avatar } from '../Avatar/Avatar.js';
import { FeaturedIcon } from '../FeaturedIcon/FeaturedIcon.js';
import { Badge, type BadgeColor } from '../Badge/Badge.js';
import { DesktopProgressIndicator } from '../DesktopProgressIndicator/DesktopProgressIndicator.js';

export type ContentPrimitivesType =
  | 'page-heading'
  | 'section-heading'
  | 'group-header'
  | 'utility'
  | 'progress-indicator'
  | 'vertical-list-row'
  | 'horizontal-list-row'
  | 'metrics';

export interface ContentPrimitivesProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children' | 'title'> {
  type?: ContentPrimitivesType;

  // Text
  /** Title content. Accepts a node for mixed inline styling (e.g. a grey count: "Items (15)"). */
  text?: React.ReactNode;
  subtext?: React.ReactNode;
  /** Show the subtitle/description line under the title. Default true. */
  showSubtext?: boolean;
  titleName?: string;
  listRowText?: string;
  metric?: string;
  eyebrowText?: string;

  // Visual Anchor (Utility, Group Header)
  showVisualAnchor?: boolean;
  showLeadingIcon?: boolean;
  leadingIcon?: IconName;
  leadingIconOutlined?: boolean;
  showAvatar?: boolean;
  avatarName?: string;
  avatarSrc?: string;
  showFeaturedIcon?: boolean;
  featuredIconName?: IconName;
  /** Render the featured icon glyph outlined rather than filled. @default false */
  featuredIconOutlined?: boolean;
  showMonogramIcon?: boolean;
  monogramLabel?: string;

  // Trailing Content
  showTrailingContent?: boolean;
  showPassiveElements?: boolean;
  passiveElements?: React.ReactNode;
  showInteractiveElements?: boolean;
  interactiveElements?: React.ReactNode;
  /**
   * Vertical alignment of the heading row's content (leading + trailing).
   * `center` (default) matches the standalone Utility/Group-Header primitives;
   * `top` mirrors instances whose Content frame is `crossAxis: MIN` (e.g. the
   * Option Card, where the trailing control aligns with the title). Only the
   * heading-family layouts honor this.
   */
  contentAlign?: 'center' | 'top';

  // List Row
  showDescriptionLeadingIcon?: boolean;
  descriptionLeadingIcon?: IconName;
  onCopy?: () => void;

  // Metrics
  showMetricVariance?: boolean;
  metricVarianceLabel?: string;
  /** Variance badge color (Figma "Variance": Neutral→neutral, Positive→success, Negative→error). */
  metricVarianceColor?: BadgeColor;
  /** Leading icon on the variance badge (e.g. Up-Arrow for positive, Down-Arrow for negative). */
  metricVarianceIcon?: IconName;
  showMetricSubtext?: boolean;
  showEyebrowTrailingIcon?: boolean;
  eyebrowTrailingIcon?: IconName;

  // Progress Indicator
  progressValue?: number;
  progressHelperText?: string;
  showProgressHelperText?: boolean;
  /**
   * Which {@link DesktopProgressIndicator} variant the Progress Indicator layout
   * renders. Defaults to `task` (green) — the historical behaviour. Pass
   * `system-process` for the blue system bar, as the Dispatch Logs Broadcast Status
   * Card does (its Figma instance binds `Type: System Process`).
   */
  progressVariant?: 'upload' | 'task' | 'system-process';
}

// ─── Visual Anchor ───────────────────────────────────────────────

function VisualAnchor({
  showLeadingIcon = true,
  leadingIcon = 'Orders',
  leadingIconOutlined = true,
  showAvatar = false,
  avatarName = 'AS',
  avatarSrc,
  showFeaturedIcon = false,
  featuredIconName = 'Orders',
  featuredIconOutlined = false,
  showMonogramIcon = false,
  monogramLabel = 'AS',
  iconSize = 20,
  align = 'top',
}: {
  showLeadingIcon?: boolean;
  leadingIcon?: IconName;
  leadingIconOutlined?: boolean;
  showAvatar?: boolean;
  avatarName?: string;
  avatarSrc?: string;
  showFeaturedIcon?: boolean;
  featuredIconName?: IconName;
  featuredIconOutlined?: boolean;
  showMonogramIcon?: boolean;
  monogramLabel?: string;
  iconSize?: number;
  /**
   * Leading-icon alignment. `top` pins the icon to the row top (+2px optical pad —
   * Utility / Group Header, single-line). `center` centers the 22px icon frame
   * against the title+subtext block (Section Heading — Figma Leading Content is
   * counterAxis CENTER with the 20px icon in a 22px pad-top-2 frame).
   */
  align?: 'top' | 'center';
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', flexShrink: 0 }}>
      {showLeadingIcon && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            alignSelf: align === 'center' ? 'center' : 'stretch',
            paddingTop: 2,
            flexShrink: 0,
          }}
        >
          <Icon name={leadingIcon} outlined={leadingIconOutlined} size={iconSize} />
        </div>
      )}
      {showAvatar && (
        <div style={{ display: 'flex', alignItems: 'center', alignSelf: 'stretch', flexShrink: 0 }}>
          <Avatar name={avatarName} src={avatarSrc} size="medium" />
        </div>
      )}
      {showFeaturedIcon && (
        <div style={{ display: 'flex', alignItems: 'center', alignSelf: 'stretch', flexShrink: 0 }}>
          <FeaturedIcon icon={featuredIconName} outlined={featuredIconOutlined} color="neutral" size="large" />
        </div>
      )}
      {showMonogramIcon && (
        <div style={{ display: 'flex', alignItems: 'center', alignSelf: 'stretch', flexShrink: 0 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--rounding-lg)',
              background: 'var(--surface-secondary-monogram)',
              border: 'var(--stroke-xs) solid var(--border-secondary-monogram)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span
              className="text-label-l-semibold"
              style={{ color: 'var(--text-secondary-label)', textAlign: 'center', whiteSpace: 'nowrap' }}
            >
              {monogramLabel}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Trailing Content ────────────────────────────────────────────

function TrailingContent({
  showPassiveElements = true,
  passiveElements,
  showInteractiveElements = true,
  interactiveElements,
  passiveAlignItems = 'center',
  verticalAlign = 'center',
}: {
  showPassiveElements?: boolean;
  passiveElements?: React.ReactNode;
  showInteractiveElements?: boolean;
  interactiveElements?: React.ReactNode;
  passiveAlignItems?: 'center' | 'flex-start';
  /** `center` stretches full height + centers; `top` hugs and aligns to the row top. */
  verticalAlign?: 'center' | 'top';
}) {
  const isTop = verticalAlign === 'top';
  const cross = isTop ? 'flex-start' : 'center';
  const self = isTop ? 'flex-start' : 'stretch';
  return (
    <div style={{ display: 'flex', gap: 'var(--spacing-16px)', alignItems: cross, justifyContent: 'flex-end', alignSelf: self, flexShrink: 0 }}>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: cross, alignSelf: self }}>
        {showPassiveElements && (
          <div
            style={{
              display: 'flex',
              gap: 'var(--spacing-8px)',
              height: '100%',
              alignItems: passiveAlignItems,
              justifyContent: 'flex-end',
              flexShrink: 0,
            }}
          >
            {passiveElements}
          </div>
        )}
      </div>
      {showInteractiveElements && (
        <div style={{ display: 'flex', gap: 'var(--spacing-16px)', alignItems: cross, justifyContent: 'flex-end', flexShrink: 0 }}>
          {interactiveElements}
        </div>
      )}
    </div>
  );
}

// ─── Title & Subtext ─────────────────────────────────────────────

const TITLE_CONFIG: Record<string, { className: string; color: string }> = {
  'page-heading': { className: 'text-heading-s-semibold', color: 'var(--text-default-heading)' },
  'section-heading': { className: 'text-body-l-semibold', color: 'var(--text-default-heading)' },
  'group-header': { className: 'text-body-m-semibold', color: 'var(--text-default-sub-heading)' },
  'utility': { className: 'text-label-m-semibold', color: 'var(--text-default-heading)' },
  'progress-indicator': { className: 'text-label-m-semibold', color: 'var(--text-default-heading)' },
};

function TitleAndSubtext({
  type,
  text = 'Text',
  subtext = 'Enter description here',
  showSubtext = true,
}: {
  type: string;
  text?: React.ReactNode;
  subtext?: React.ReactNode;
  showSubtext?: boolean;
}) {
  const config = TITLE_CONFIG[type];
  if (!config) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: '1 0 0',
        minWidth: 0,
        alignItems: 'flex-start',
        gap: 'var(--spacing-4px)',
      }}
    >
      <div style={{ display: 'flex', gap: 'var(--spacing-8px)', alignItems: 'center', flexShrink: 0 }}>
        <span className={config.className} style={{ color: config.color, whiteSpace: 'nowrap' }}>
          {text}
        </span>
      </div>
      {showSubtext && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, width: '100%' }}>
          <span
            className="text-body-m-regular"
            style={{ color: 'var(--text-default-sub-body)', flex: '1 0 0', minWidth: 0 }}
          >
            {subtext}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Heading variants (Page Heading, Group Header, Utility, Section Heading) ───

function HeadingLayout(props: ContentPrimitivesProps) {
  const {
    type = 'page-heading',
    text,
    subtext,
    showSubtext = true,
    showVisualAnchor = true,
    showLeadingIcon,
    leadingIcon,
    leadingIconOutlined,
    showAvatar,
    avatarName,
    avatarSrc,
    showFeaturedIcon,
    featuredIconName,
    featuredIconOutlined,
    showMonogramIcon,
    monogramLabel,
    showTrailingContent = true,
    showPassiveElements,
    passiveElements,
    showInteractiveElements,
    interactiveElements,
    contentAlign = 'center',
  } = props;

  // Section Heading gained a Visual Anchor in Figma (2026-07-02) — a 20px outlined
  // leading icon, visible by default (`Show Visual Anchor` / `Show Leading Icon`
  // both default true), centered against the title+subtext block.
  const hasVisualAnchor = type === 'utility' || type === 'group-header' || type === 'section-heading';
  const isTop = contentAlign === 'top';

  return (
    <div
      style={{
        display: 'flex',
        gap: 'var(--spacing-20px)',
        alignItems: isTop ? 'flex-start' : 'center',
        width: '100%',
        flexShrink: 0,
      }}
    >
      {/* Leading Content */}
      <div
        style={{
          display: 'flex',
          gap: type === 'page-heading' ? 0 : 'var(--spacing-8px)',
          alignItems: type === 'section-heading' ? 'center' : 'center',
          flex: '1 0 0',
          minWidth: 0,
        }}
      >
        {hasVisualAnchor && showVisualAnchor && (
          <VisualAnchor
            showLeadingIcon={showLeadingIcon}
            leadingIcon={leadingIcon}
            leadingIconOutlined={leadingIconOutlined}
            showAvatar={showAvatar}
            avatarName={avatarName}
            avatarSrc={avatarSrc}
            showFeaturedIcon={showFeaturedIcon}
            featuredIconName={featuredIconName}
            featuredIconOutlined={featuredIconOutlined}
            showMonogramIcon={showMonogramIcon}
            monogramLabel={monogramLabel}
            align={type === 'section-heading' ? 'center' : 'top'}
          />
        )}
        <TitleAndSubtext type={type} text={text} subtext={subtext} showSubtext={showSubtext} />
      </div>

      {/* Trailing Content */}
      {showTrailingContent && (
        <TrailingContent
          showPassiveElements={showPassiveElements}
          passiveElements={passiveElements}
          showInteractiveElements={showInteractiveElements}
          interactiveElements={interactiveElements}
          verticalAlign={isTop ? 'top' : 'center'}
        />
      )}
    </div>
  );
}

// ─── Progress Indicator ──────────────────────────────────────────

function ProgressIndicatorLayout(props: ContentPrimitivesProps) {
  const {
    text,
    subtext,
    showTrailingContent = true,
    showPassiveElements,
    passiveElements,
    showInteractiveElements,
    interactiveElements,
    progressValue = 50,
    progressHelperText = 'x of 10 steps completed',
    showProgressHelperText = true,
    progressVariant = 'task',
  } = props;

  return (
    <>
      {/* Top Stack */}
      <div style={{ display: 'flex', gap: 'var(--spacing-20px)', alignItems: 'center', width: '100%', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 'var(--spacing-8px)', alignItems: 'flex-start', flex: '1 0 0', minWidth: 0 }}>
          <TitleAndSubtext type="progress-indicator" text={text} subtext={subtext} />
        </div>
        {showTrailingContent && (
          <TrailingContent
            showPassiveElements={showPassiveElements}
            passiveElements={passiveElements}
            showInteractiveElements={showInteractiveElements}
            interactiveElements={interactiveElements}
          />
        )}
      </div>
      {/* Progress bar */}
      <DesktopProgressIndicator
        variant={progressVariant}
        value={progressValue}
        helperText={showProgressHelperText ? progressHelperText : undefined}
        style={{ width: '100%', flexShrink: 0 }}
      />
    </>
  );
}

// ─── List Rows ───────────────────────────────────────────────────

function ListRowLayout(props: ContentPrimitivesProps) {
  const {
    type = 'vertical-list-row',
    titleName = 'Title ',
    listRowText = 'Enter Description here',
    showDescriptionLeadingIcon = true,
    descriptionLeadingIcon = 'Question',
    showInteractiveElements = true,
    onCopy,
  } = props;

  const isHorizontal = type === 'horizontal-list-row';

  return (
    <div style={{ display: 'flex', gap: 'var(--spacing-20px)', alignItems: 'center', width: '100%', flexShrink: 0 }}>
      <div
        style={{
          display: 'flex',
          flexDirection: isHorizontal ? 'row' : 'column',
          gap: isHorizontal ? 'var(--spacing-20px)' : 'var(--spacing-4px)',
          flex: '1 0 0',
          minWidth: 0,
          alignItems: 'flex-start',
        }}
      >
        {/* Title */}
        <div
          style={{
            display: 'flex',
            gap: 'var(--spacing-8px)',
            alignItems: 'center',
            flexShrink: 0,
            ...(isHorizontal ? { flex: '1 0 0', minWidth: 0 } : { width: '100%' }),
          }}
        >
          <span className="text-body-m-regular" style={{ color: 'var(--text-default-sub-body)', whiteSpace: 'nowrap' }}>
            {titleName}
          </span>
        </div>

        {/* Description */}
        <div
          style={{
            display: 'flex',
            gap: 'var(--spacing-8px)',
            alignItems: 'flex-start',
            flexShrink: 0,
            ...(isHorizontal ? { flex: '1 0 0', justifyContent: 'flex-end', minWidth: 0 } : { width: '100%' }),
          }}
        >
          {showDescriptionLeadingIcon && (
            <div style={{ display: 'flex', alignItems: 'center', paddingTop: 2, flexShrink: 0, color: 'var(--icons-neutral-default)' }}>
              <Icon name={descriptionLeadingIcon} outlined size={16} />
            </div>
          )}
          <span
            className="text-body-m-medium"
            style={{ color: 'var(--text-default-body)', whiteSpace: isHorizontal ? 'nowrap' : 'normal', minWidth: 0 }}
          >
            {listRowText}
          </span>
          {showInteractiveElements && (
            <div style={{ display: 'flex', alignItems: 'center', paddingTop: 2, flexShrink: 0 }}>
              <button
                type="button"
                onClick={onCopy}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0,
                  padding: 0,
                  borderRadius: 'var(--rounding-lg)',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                }}
                aria-label="Copy"
              >
                <Icon name="Copy" outlined size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Metrics ─────────────────────────────────────────────────────

function MetricsLayout(props: ContentPrimitivesProps) {
  const {
    metric = '10',
    eyebrowText = 'This week',
    subtext = 'Enter description here',
    showVisualAnchor = true,
    leadingIcon = 'Orders',
    leadingIconOutlined = true,
    showTrailingContent = true,
    showPassiveElements,
    passiveElements,
    showInteractiveElements,
    interactiveElements,
    showMetricVariance = true,
    metricVarianceLabel = '0%',
    metricVarianceColor = 'neutral',
    metricVarianceIcon,
    showMetricSubtext = true,
    showEyebrowTrailingIcon = true,
    eyebrowTrailingIcon = 'Question',
  } = props;

  return (
    <div style={{ display: 'flex', gap: 'var(--spacing-20px)', alignItems: 'flex-start', width: '100%', flexShrink: 0 }}>
      {/* Leading Content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-8px)', alignItems: 'flex-start', flex: '1 0 0', minWidth: 0 }}>
        {/* Visual Anchor (24px icon) */}
        {showVisualAnchor && (
          <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <Icon name={leadingIcon} outlined={leadingIconOutlined} size={24} />
          </div>
        )}

        {/* Eyebrow */}
        <div style={{ display: 'flex', gap: 'var(--spacing-4px)', alignItems: 'center', flexShrink: 0 }}>
          <span className="text-label-m-regular" style={{ color: 'var(--text-default-eyebrow-text)', whiteSpace: 'nowrap' }}>
            {eyebrowText}
          </span>
          {showEyebrowTrailingIcon && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--icons-neutral-idle)' }}>
              <Icon name={eyebrowTrailingIcon} outlined size={16} />
            </div>
          )}
        </div>

        {/* Metric — value (Heading/S/SemiBold) stacked ABOVE the variance badge,
            left-aligned (Figma 2026-07-03: Metric frame flipped horizontal → vertical,
            gap 8; badge now sits under the number, not beside it). */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-8px)', alignItems: 'flex-start', flexShrink: 0 }}>
          <span className="text-heading-s-semibold" style={{ color: 'var(--text-default-heading)', whiteSpace: 'nowrap' }}>
            {metric}
          </span>
          {showMetricVariance && (
            <Badge color={metricVarianceColor} label={metricVarianceLabel} leadingIcon={metricVarianceIcon} />
          )}
        </div>

        {/* Metric Subtext — Label/S/Regular per Figma (updated 2026-07-02, was Body/S) */}
        {showMetricSubtext && (
          <span className="text-label-s-regular" style={{ color: 'var(--text-default-helper)', whiteSpace: 'nowrap' }}>
            {subtext}
          </span>
        )}
      </div>

      {/* Trailing Content — fills full height, centered vertically (Figma crossAxis CENTER) */}
      {showTrailingContent && (
        <TrailingContent
          showPassiveElements={showPassiveElements}
          passiveElements={passiveElements}
          showInteractiveElements={showInteractiveElements}
          interactiveElements={interactiveElements}
        />
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────

export const ContentPrimitives = React.forwardRef<HTMLDivElement, ContentPrimitivesProps>(
  function ContentPrimitives(
    { type = 'page-heading', style, className, ...rest },
    ref,
  ) {
    const isSectionHeading = type === 'section-heading';
    const isProgress = type === 'progress-indicator';
    const isListRow = type === 'vertical-list-row' || type === 'horizontal-list-row';
    const isMetrics = type === 'metrics';

    const rootStyle: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      width: '100%',
      position: 'relative',
      ...(isProgress ? { gap: 'var(--spacing-12px)' } : {}),
      ...(isListRow ? { overflow: 'clip' } : {}),
      ...style,
    };

    // Strip props that shouldn't hit the DOM
    const {
      text, subtext, showSubtext, titleName, listRowText, metric, eyebrowText,
      showVisualAnchor, showLeadingIcon, leadingIcon, leadingIconOutlined,
      showAvatar, avatarName, avatarSrc,
      showFeaturedIcon, featuredIconName, featuredIconOutlined,
      showMonogramIcon, monogramLabel,
      showTrailingContent, showPassiveElements, passiveElements,
      showInteractiveElements, interactiveElements, contentAlign,
      showDescriptionLeadingIcon, descriptionLeadingIcon, onCopy,
      showMetricVariance, metricVarianceLabel, metricVarianceColor, metricVarianceIcon, showMetricSubtext,
      showEyebrowTrailingIcon, eyebrowTrailingIcon,
      progressValue, progressHelperText, showProgressHelperText, progressVariant,
      ...htmlProps
    } = rest;

    const allProps: ContentPrimitivesProps = {
      type, text, subtext, showSubtext, titleName, listRowText, metric, eyebrowText,
      showVisualAnchor, showLeadingIcon, leadingIcon, leadingIconOutlined,
      showAvatar, avatarName, avatarSrc,
      showFeaturedIcon, featuredIconName, featuredIconOutlined,
      showMonogramIcon, monogramLabel,
      showTrailingContent, showPassiveElements, passiveElements,
      showInteractiveElements, interactiveElements, contentAlign,
      showDescriptionLeadingIcon, descriptionLeadingIcon, onCopy,
      showMetricVariance, metricVarianceLabel, metricVarianceColor, metricVarianceIcon, showMetricSubtext,
      showEyebrowTrailingIcon, eyebrowTrailingIcon,
      progressValue, progressHelperText, showProgressHelperText, progressVariant,
    };

    return (
      <div ref={ref} className={className} style={rootStyle} {...htmlProps}>
        {isMetrics && <MetricsLayout {...allProps} />}
        {isListRow && <ListRowLayout {...allProps} />}
        {isProgress && <ProgressIndicatorLayout {...allProps} />}
        {!isMetrics && !isListRow && !isProgress && <HeadingLayout {...allProps} />}
      </div>
    );
  },
);
