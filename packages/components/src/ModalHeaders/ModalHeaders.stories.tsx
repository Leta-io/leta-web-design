import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ModalHeaders, type ModalHeadersVariant } from './ModalHeaders.js';
import { PageTabsControl } from '../PageTabsControl/PageTabsControl.js';
import { Badge, type BadgeColor } from '../Badge/Badge.js';
import { Button, type ButtonVariant } from '../Button/Button.js';
import type { IconName } from '@leta-io/icons';

const BADGE_COLORS: BadgeColor[] = [
  'primary', 'caution', 'warning', 'error', 'information',
  'success', 'notice', 'neutral', 'highlight', 'secondary',
];

const BUTTON_VARIANTS: ButtonVariant[] = [
  'secondary', 'primary', 'ghost', 'ghost-error', 'dashed',
  'destructive', 'plain', 'success',
];

const VARIANTS: ModalHeadersVariant[] = ['default', 'with-tabs'];

const meta: Meta<typeof ModalHeaders> = {
  title: 'Molecules/ModalHeaders',
  component: ModalHeaders,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'The top region of a modal/dialog — title, optional breadcrumbs, optional leading icon, ' +
          'a close affordance, and (optionally) in-modal tab navigation.' +
          '\n\n' +
          'Figma `228:5568`. **Default** — title + close. **With Tabs** — adds a Page Tabs ' +
          'Control beneath the title. Both: `--surface-neutral-bg-default`, top-left/top-right ' +
          'radius `--rounding-xl`, bottom border `--stroke-sm` / `--border-neutral-default`.' +
          '\n\n' +
          '**Slots** — composable child-injection points mirroring Figma SLOT layers: ' +
          '`secondaryLeading` / `secondaryTrailing` (the Secondary Content slot — a SPACE_BETWEEN ' +
          'row, visible in Figma so shown by default), `tabs` (the Page Tabs Control slot), and ' +
          '`breadcrumb`. Composes Title, Button (Ghost/Prominent Icon Only for close), Badge, ' +
          'and PageTabsControl.',
      },
    },
  },
  argTypes: {
    // Hide the ReactNode slot props from controls — we expose
    // their internals as custom args below instead.
    secondaryLeading: { table: { disable: true } },
    secondaryTrailing: { table: { disable: true } },
    tabs: { table: { disable: true } },
    breadcrumb: { table: { disable: true } },
  },
};
export default meta;
type Story = StoryObj<typeof ModalHeaders>;

/* ============================================================================
 * Figma variant — Default (title + close + secondary content slot)
 *
 * Slot internals exposed as editable controls so the consumer can try
 * different badge colours/labels and button variants/labels inline.
 * ========================================================================== */
export const Default: Story = {
  argTypes: {
    badgeLabel: { control: 'text', name: 'Badge label' },
    badgeColor: { control: 'select', options: BADGE_COLORS, name: 'Badge color' },
    button1Label: { control: 'text', name: 'Button 1 label' },
    button1Variant: { control: 'select', options: BUTTON_VARIANTS, name: 'Button 1 variant' },
    button2Label: { control: 'text', name: 'Button 2 label' },
    button2Variant: { control: 'select', options: BUTTON_VARIANTS, name: 'Button 2 variant' },
  } as any,
  args: {
    variant: 'default',
    title: 'Title',
    showSecondaryContent: true,
    badgeLabel: 'Scheduled',
    badgeColor: 'primary',
    button1Label: 'Dispatch',
    button1Variant: 'secondary',
    button2Label: 'Dispatch',
    button2Variant: 'secondary',
  } as any,
  render: ({
    badgeLabel, badgeColor,
    button1Label, button1Variant,
    button2Label, button2Variant,
    ...props
  }: any) => (
    <ModalHeaders
      {...props}
      onClose={() => {}}
      secondaryLeading={<Badge color={badgeColor} label={badgeLabel} />}
      secondaryTrailing={
        <>
          <Button variant={button1Variant} size="small">{button1Label}</Button>
          <Button variant={button2Variant} size="small">{button2Label}</Button>
        </>
      }
    />
  ),
};

/* ============================================================================
 * With Tabs (title + close + secondary content + PageTabsControl)
 * ========================================================================== */
export const WithTabs: Story = {
  argTypes: {
    badgeLabel: { control: 'text', name: 'Badge label' },
    badgeColor: { control: 'select', options: BADGE_COLORS, name: 'Badge color' },
    button1Label: { control: 'text', name: 'Button 1 label' },
    button1Variant: { control: 'select', options: BUTTON_VARIANTS, name: 'Button 1 variant' },
    button2Label: { control: 'text', name: 'Button 2 label' },
    button2Variant: { control: 'select', options: BUTTON_VARIANTS, name: 'Button 2 variant' },
  } as any,
  args: {
    variant: 'with-tabs',
    title: 'Title',
    showSecondaryContent: true,
    badgeLabel: 'Scheduled',
    badgeColor: 'primary',
    button1Label: 'Dispatch',
    button1Variant: 'secondary',
    button2Label: 'Dispatch',
    button2Variant: 'secondary',
  } as any,
  render: ({
    badgeLabel, badgeColor,
    button1Label, button1Variant,
    button2Label, button2Variant,
    ...props
  }: any) => {
    const [active, setActive] = useState(0);
    return (
      <ModalHeaders
        {...props}
        onClose={() => {}}
        secondaryLeading={<Badge color={badgeColor} label={badgeLabel} />}
        secondaryTrailing={
          <>
            <Button variant={button1Variant} size="small">{button1Label}</Button>
            <Button variant={button2Variant} size="small">{button2Label}</Button>
          </>
        }
        tabs={
          <PageTabsControl
            variant="basic"
            tabs={[
              { label: 'Default' },
              { label: 'Default' },
              { label: 'Default' },
              { label: 'Default' },
              { label: 'Default' },
              { label: 'Default' },
            ]}
            value={active}
            onChange={setActive}
          />
        }
      />
    );
  },
};

/* ============================================================================
 * No Secondary Content — slot hidden (showSecondaryContent=false)
 * ========================================================================== */
export const WithoutSecondaryContent: Story = {
  args: {
    variant: 'default',
    title: 'Title',
    showSecondaryContent: false,
  } as any,
  render: (props: any) => <ModalHeaders {...props} onClose={() => {}} />,
};

/* ============================================================================
 * Catalog — both variants stacked
 * ========================================================================== */
export const Catalog: Story = {
  render: () => {
    const [active, setActive] = useState(0);
    const leading = <Badge color="primary" label="Scheduled" />;
    const trailing = (
      <>
        <Button variant="secondary" size="small">Dispatch</Button>
        <Button variant="secondary" size="small">Dispatch</Button>
      </>
    );
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'flex-start' }}>
        <ModalHeaders
          variant="default"
          title="Title"
          onClose={() => {}}
          secondaryLeading={leading}
          secondaryTrailing={trailing}
        />
        <ModalHeaders
          variant="with-tabs"
          title="Title"
          onClose={() => {}}
          secondaryLeading={leading}
          secondaryTrailing={trailing}
          tabs={
            <PageTabsControl
              variant="basic"
              tabs={[
                { label: 'Default' },
                { label: 'Default' },
                { label: 'Default' },
                { label: 'Default' },
                { label: 'Default' },
                { label: 'Default' },
              ]}
              value={active}
              onChange={setActive}
            />
          }
        />
      </div>
    );
  },
};
