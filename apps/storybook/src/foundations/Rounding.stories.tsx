import type { Meta, StoryObj } from '@storybook/react-vite';
import * as React from 'react';
import { tokens } from '@leta-io/design-tokens';

/** Fixed 48×48 box with the rounding token applied as `border-radius`. */
const RoundedBox = ({ cssVar }: { cssVar: string }) => (
  <div
    aria-hidden
    style={{
      width: 48,
      height: 48,
      background: 'var(--colors-primary-default)',
      borderRadius: `var(${cssVar})`,
    }}
  />
);

const RoundingView: React.FC = () => {
  const SIZE_ORDER: Record<string, number> = { none: 0, xs: 1, sm: 2, md: 3, lg: 4, xl: 5, xxl: 6, round: 999 };
  const items = Object.values(tokens)
    .filter((cssVar) => cssVar.startsWith('--rounding-'))
    .sort((a, b) => {
      const keyA = a.replace('--rounding-', '');
      const keyB = b.replace('--rounding-', '');
      return (SIZE_ORDER[keyA] ?? 50) - (SIZE_ORDER[keyB] ?? 50);
    });
  return (
    <div>
      <p style={{ color: 'var(--text-default-helper)', maxWidth: 640 }}>
        Rounding tokens — applied as `border-radius` on a fixed 48×48 square. {items.length} total.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((cssVar) => (
          <div key={cssVar} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <code style={{ fontSize: 11, minWidth: 220 }}>{cssVar}</code>
            <RoundedBox cssVar={cssVar} />
          </div>
        ))}
      </div>
    </div>
  );
};

const meta: Meta<typeof RoundingView> = {
  title: 'Foundations/Tokens/Rounding',
  component: RoundingView,
};

export default meta;
type Story = StoryObj<typeof RoundingView>;

export const All: Story = {};
