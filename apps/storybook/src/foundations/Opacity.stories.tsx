import type { Meta, StoryObj } from '@storybook/react-vite';
import * as React from 'react';
import { tokens } from '@leta-io/design-tokens';

/** Fixed chip with the opacity token applied as `opacity`. */
const OpacityChip = ({ cssVar }: { cssVar: string }) => (
  <div
    aria-hidden
    style={{
      width: 48,
      height: 24,
      background: 'var(--colors-neutral-default)',
      opacity: `var(${cssVar})`,
      borderRadius: 4,
    }}
  />
);

const OpacityView: React.FC = () => {
  const items = Object.values(tokens).filter((cssVar) => cssVar.startsWith('--opacity-'));
  return (
    <div>
      <p style={{ color: 'var(--text-default-helper)', maxWidth: 640 }}>
        Opacity tokens — applied as `opacity` on a neutral chip. {items.length} total.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((cssVar) => (
          <div key={cssVar} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <code style={{ fontSize: 11, minWidth: 220 }}>{cssVar}</code>
            <OpacityChip cssVar={cssVar} />
          </div>
        ))}
      </div>
    </div>
  );
};

const meta: Meta<typeof OpacityView> = {
  title: 'Foundations/Tokens/Opacity',
  component: OpacityView,
};

export default meta;
type Story = StoryObj<typeof OpacityView>;

export const All: Story = {};
