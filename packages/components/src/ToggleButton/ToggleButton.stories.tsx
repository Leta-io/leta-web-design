import type { Meta, StoryObj } from '@storybook/react-vite';
import * as React from 'react';
import { ToggleButton } from './ToggleButton.js';

/**
 * Toggle Button (`10900:15545`) — icon-only binary switch that holds its
 * on/off state (`aria-pressed`). Same hover/press micro-animations as Button.
 */
const meta: Meta<typeof ToggleButton> = {
  title: 'Atoms/Toggle Button',
  component: ToggleButton,
  argTypes: {
    icon: { control: 'text' },
    pressed: { control: 'boolean' },
    defaultPressed: { control: 'boolean' },
    outlined: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};
export default meta;
type Story = StoryObj<typeof ToggleButton>;

/** Interactive — click to toggle (uncontrolled). */
export const Default: Story = {
  args: { icon: 'Format-Bold', 'aria-label': 'Bold' },
};

/** On / selected state (`aria-pressed="true"`). */
export const Selected: Story = {
  args: { icon: 'Format-Bold', 'aria-label': 'Bold', defaultPressed: true },
};

/** Disabled — dimmed icon, no interaction. */
export const Disabled: Story = {
  args: { icon: 'Format-Bold', 'aria-label': 'Bold', disabled: true },
};

/** All resting states side by side (hover/press/focus are runtime). */
export const Catalog: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: '120px auto', gap: 16, alignItems: 'center' }}>
      <span className="text-label-m-medium">Idle</span>
      <ToggleButton icon="Format-Bold" aria-label="Bold" />
      <span className="text-label-m-medium">Selected</span>
      <ToggleButton icon="Format-Bold" aria-label="Bold" defaultPressed />
      <span className="text-label-m-medium">Disabled</span>
      <ToggleButton icon="Format-Bold" aria-label="Bold" disabled />
    </div>
  ),
};
