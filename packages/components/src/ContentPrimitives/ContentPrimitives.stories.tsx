import type { Meta, StoryObj } from '@storybook/react-vite';
import { ContentPrimitives, type ContentPrimitivesType } from './ContentPrimitives.js';
import { Icon, type IconName } from '@leta-io/icons';
import { Button } from '../Button/Button.js';
import { SelectionControl } from '../SelectionControl/SelectionControl.js';

const TYPES: ContentPrimitivesType[] = [
  'page-heading',
  'section-heading',
  'group-header',
  'utility',
  'progress-indicator',
  'vertical-list-row',
  'horizontal-list-row',
  'metrics',
];

const ICON_OPTIONS: IconName[] = [
  'Orders', 'Question', 'Help', 'Proceed', 'Cancel', 'Copy',
  'Settings', 'Account', 'Location', 'Calendar', 'Dashboard',
];

/* ─── Default passive content (metadata text + icon) ──────────── */
function DefaultPassive() {
  return (
    <div style={{ display: 'flex', gap: 'var(--spacing-8px)', alignItems: 'center', justifyContent: 'flex-end', color: 'var(--text-default-label-idle)' }}>
      <Icon name="Question" outlined size={16} />
      <span className="text-label-m-regular" style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
        Enter text here
      </span>
    </div>
  );
}

/* ─── Meta ─────────────────────────────────────────────────────── */

const meta: Meta<typeof ContentPrimitives> = {
  title: 'Molecules/ContentPrimitives',
  component: ContentPrimitives,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A flexible content-layout primitive that standardises how headings, metadata, ' +
          'and trailing actions are arranged across the product. It is the foundational ' +
          'building block composed inside cards, modals, accordions, drawers, and list rows.' +
          '\n\n' +
          'Figma `6961:41406`. 8 Type variants: Page Heading, Section Heading, Group Header, ' +
          'Utility, Progress Indicator, Vertical List Row, Horizontal List Row, Metrics.' +
          '\n\n' +
          '**Slots** — `passiveElements` (trailing metadata), `interactiveElements` (trailing actions). ' +
          'List Row variants have no slots — they use `onCopy` and `descriptionLeadingIcon` instead.' +
          '\n\n' +
          '**Visual Anchor** — Utility, Group Header and Section Heading carry a leading Visual Anchor ' +
          '(icon / avatar / featured icon / monogram), visible by default (`showVisualAnchor`). ' +
          'Section Heading gained its anchor in the 2026-07-02 Figma update: a 20px outlined icon ' +
          'centered against the title+subtext block. The Metrics variant uses `text-heading-s-semibold` ' +
          'for the metric value and `text-label-s-regular` for its description; the variance badge is ' +
          'stacked BELOW the metric value (left-aligned), not beside it (2026-07-03 update).',
      },
    },
  },
  argTypes: {
    passiveElements: { table: { disable: true } },
    interactiveElements: { table: { disable: true } },
  },
};
export default meta;
type Story = StoryObj<typeof ContentPrimitives>;

/* ============================================================================
 * Page Heading — top-level page title with subtext and trailing toggle
 * ========================================================================== */
export const PageHeading: Story = {
  args: {
    type: 'page-heading',
    text: 'Text',
    subtext: 'Enter description here',
    showTrailingContent: true,
  },
  render: (props) => (
    <ContentPrimitives
      {...props}
      passiveElements={<DefaultPassive />}
      interactiveElements={
        <SelectionControl variant="switch" label="" aria-label="Toggle" />
      }
    />
  ),
};

/* ============================================================================
 * Section Heading — leading 20px icon anchor + title/subtext + trailing
 * metadata + chevron. The Visual Anchor is visible by default per Figma.
 * ========================================================================== */
export const SectionHeading: Story = {
  args: {
    type: 'section-heading',
    text: 'Text',
    showTrailingContent: true,
  },
  render: (props) => (
    <ContentPrimitives
      {...props}
      passiveElements={<DefaultPassive />}
      interactiveElements={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--padding-10px)', borderRadius: 'var(--rounding-lg)' }}>
          <Icon name="Chevron-Down" size={20} />
        </div>
      }
    />
  ),
};

/* ============================================================================
 * Group Header — with Visual Anchor (icon) + trailing action button
 * ========================================================================== */
export const GroupHeader: Story = {
  args: {
    type: 'group-header',
    text: 'Text',
    showVisualAnchor: true,
    showLeadingIcon: true,
    leadingIcon: 'Orders',
    showTrailingContent: true,
  },
  render: (props) => (
    <ContentPrimitives
      {...props}
      passiveElements={<DefaultPassive />}
      interactiveElements={
        <div style={{ display: 'flex', gap: 'var(--spacing-8px)', height: 40, alignItems: 'center', justifyContent: 'flex-end' }}>
          <Button variant="secondary" size="small">Action</Button>
        </div>
      }
    />
  ),
};

/* ============================================================================
 * Utility — with Visual Anchor (icon) + trailing metadata + toggle
 * ========================================================================== */
export const Utility: Story = {
  args: {
    type: 'utility',
    text: 'Text',
    subtext: 'Enter description here',
    showVisualAnchor: true,
    showLeadingIcon: true,
    leadingIcon: 'Orders',
    showTrailingContent: true,
  },
  render: (props) => (
    <ContentPrimitives
      {...props}
      passiveElements={<DefaultPassive />}
      interactiveElements={
        <SelectionControl variant="switch" label="" aria-label="Toggle" checked />
      }
    />
  ),
};

/* ============================================================================
 * Progress Indicator — 50% progress with trailing metadata + action
 * ========================================================================== */
export const ProgressIndicator: Story = {
  args: {
    type: 'progress-indicator',
    text: 'Text',
    subtext: 'Enter description here',
    progressValue: 50,
    progressHelperText: 'x of 10 steps completed',
    showProgressHelperText: true,
    showTrailingContent: true,
  },
  render: (props) => (
    <ContentPrimitives
      {...props}
      passiveElements={<DefaultPassive />}
      interactiveElements={
        <div style={{ display: 'flex', gap: 'var(--spacing-8px)', height: 40, alignItems: 'center', justifyContent: 'flex-end' }}>
          <Button variant="secondary" size="small">Action</Button>
        </div>
      }
    />
  ),
};

/* ============================================================================
 * Vertical List Row — stacked title + description with icon + copy
 * ========================================================================== */
export const VerticalListRow: Story = {
  args: {
    type: 'vertical-list-row',
    titleName: 'Title',
    listRowText: 'Enter Description here',
    showDescriptionLeadingIcon: true,
    descriptionLeadingIcon: 'Question',
    showInteractiveElements: true,
  },
  render: (props) => (
    <ContentPrimitives {...props} onCopy={() => alert('Copied!')} />
  ),
};

/* ============================================================================
 * Horizontal List Row — side-by-side title + description
 * ========================================================================== */
export const HorizontalListRow: Story = {
  args: {
    type: 'horizontal-list-row',
    titleName: 'Title',
    listRowText: 'Enter Description here',
    showDescriptionLeadingIcon: true,
    descriptionLeadingIcon: 'Question',
    showInteractiveElements: true,
  },
  render: (props) => (
    <ContentPrimitives {...props} onCopy={() => alert('Copied!')} />
  ),
};

/* ============================================================================
 * Metrics — KPI display with eyebrow, metric value, variance badge
 * ========================================================================== */
export const Metrics: Story = {
  args: {
    type: 'metrics',
    metric: '10',
    eyebrowText: 'This week',
    subtext: 'Enter description here',
    showVisualAnchor: true,
    leadingIcon: 'Orders',
    showMetricVariance: true,
    metricVarianceLabel: '0%',
    showMetricSubtext: true,
    showEyebrowTrailingIcon: true,
    showTrailingContent: true,
  },
  render: (props) => (
    <ContentPrimitives
      {...props}
      passiveElements={
        <>
          <div style={{ display: 'flex', gap: 'var(--spacing-8px)', alignItems: 'center', justifyContent: 'flex-end', color: 'var(--text-default-label-idle)' }}>
            <Icon name="Question" outlined size={16} />
            <span className="text-label-m-regular" style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
              Enter text here
            </span>
          </div>
          <Icon name="Proceed" size={20} />
        </>
      }
      interactiveElements={
        <div style={{ display: 'flex', gap: 'var(--spacing-8px)', height: 40, alignItems: 'center', justifyContent: 'flex-end' }}>
          <Button variant="secondary" size="small">Action</Button>
        </div>
      }
    />
  ),
};

/* ============================================================================
 * Catalog — all 8 variants in a vertical stack
 * ========================================================================== */
export const Catalog: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 48, alignItems: 'flex-start', maxWidth: 856 }}>
      {/* Page Heading */}
      <div style={{ width: '100%' }}>
        <p className="text-body-s-medium" style={{ color: 'var(--text-default-helper)', marginBottom: 8 }}>Page Heading</p>
        <ContentPrimitives
          type="page-heading"
          text="Text"
          subtext="Enter description here"
          passiveElements={<DefaultPassive />}
          interactiveElements={<SelectionControl variant="switch" label="" aria-label="Toggle" checked />}
        />
      </div>

      {/* Section Heading */}
      <div style={{ width: '100%' }}>
        <p className="text-body-s-medium" style={{ color: 'var(--text-default-helper)', marginBottom: 8 }}>Section Heading</p>
        <ContentPrimitives
          type="section-heading"
          text="Text"
          passiveElements={<DefaultPassive />}
          interactiveElements={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--padding-10px)', borderRadius: 'var(--rounding-lg)' }}>
              <Icon name="Chevron-Down" size={20} />
            </div>
          }
        />
      </div>

      {/* Group Header */}
      <div style={{ width: '100%' }}>
        <p className="text-body-s-medium" style={{ color: 'var(--text-default-helper)', marginBottom: 8 }}>Group Header</p>
        <ContentPrimitives
          type="group-header"
          text="Text"
          showVisualAnchor
          showLeadingIcon
          leadingIcon="Orders"
          passiveElements={<DefaultPassive />}
          interactiveElements={
            <div style={{ display: 'flex', gap: 'var(--spacing-8px)', height: 40, alignItems: 'center', justifyContent: 'flex-end' }}>
              <Button variant="secondary" size="small">Action</Button>
            </div>
          }
        />
      </div>

      {/* Utility */}
      <div style={{ width: '100%' }}>
        <p className="text-body-s-medium" style={{ color: 'var(--text-default-helper)', marginBottom: 8 }}>Utility</p>
        <ContentPrimitives
          type="utility"
          text="Text"
          subtext="Enter description here"
          showVisualAnchor
          showLeadingIcon
          leadingIcon="Orders"
          passiveElements={<DefaultPassive />}
          interactiveElements={<SelectionControl variant="switch" label="" aria-label="Toggle" checked />}
        />
      </div>

      {/* Progress Indicator */}
      <div style={{ width: '100%' }}>
        <p className="text-body-s-medium" style={{ color: 'var(--text-default-helper)', marginBottom: 8 }}>Progress Indicator</p>
        <ContentPrimitives
          type="progress-indicator"
          text="Text"
          subtext="Enter description here"
          progressValue={50}
          progressHelperText="x of 10 steps completed"
          passiveElements={<DefaultPassive />}
          interactiveElements={
            <div style={{ display: 'flex', gap: 'var(--spacing-8px)', height: 40, alignItems: 'center', justifyContent: 'flex-end' }}>
              <Button variant="secondary" size="small">Action</Button>
            </div>
          }
        />
      </div>

      {/* Vertical List Row */}
      <div style={{ width: '100%' }}>
        <p className="text-body-s-medium" style={{ color: 'var(--text-default-helper)', marginBottom: 8 }}>Vertical List Row</p>
        <ContentPrimitives
          type="vertical-list-row"
          titleName="Title"
          listRowText="Enter Description here"
          showDescriptionLeadingIcon
          descriptionLeadingIcon="Question"
        />
      </div>

      {/* Horizontal List Row */}
      <div style={{ width: '100%' }}>
        <p className="text-body-s-medium" style={{ color: 'var(--text-default-helper)', marginBottom: 8 }}>Horizontal List Row</p>
        <ContentPrimitives
          type="horizontal-list-row"
          titleName="Title"
          listRowText="Enter Description here"
          showDescriptionLeadingIcon
          descriptionLeadingIcon="Question"
        />
      </div>

      {/* Metrics */}
      <div style={{ width: '100%' }}>
        <p className="text-body-s-medium" style={{ color: 'var(--text-default-helper)', marginBottom: 8 }}>Metrics</p>
        <ContentPrimitives
          type="metrics"
          metric="10"
          eyebrowText="This week"
          subtext="Enter description here"
          showVisualAnchor
          leadingIcon="Orders"
          showMetricVariance
          metricVarianceLabel="0%"
          showMetricSubtext
          showEyebrowTrailingIcon
          passiveElements={
            <>
              <div style={{ display: 'flex', gap: 'var(--spacing-8px)', alignItems: 'center', justifyContent: 'flex-end' }}>
                <Icon name="Question" outlined size={16} />
                <span className="text-label-m-regular" style={{ color: 'var(--text-default-label-idle)', whiteSpace: 'nowrap', textAlign: 'right' }}>
                  Enter text here
                </span>
              </div>
              <Icon name="Proceed" size={20} />
            </>
          }
          interactiveElements={
            <div style={{ display: 'flex', gap: 'var(--spacing-8px)', height: 40, alignItems: 'center', justifyContent: 'flex-end' }}>
              <Button variant="secondary" size="small">Action</Button>
            </div>
          }
        />
      </div>
    </div>
  ),
};
