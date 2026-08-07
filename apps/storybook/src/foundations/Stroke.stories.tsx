import type { Meta, StoryObj } from '@storybook/react-vite';
import * as React from 'react';
import { tokens } from '@leta-io/design-tokens';

/** Outlined 48×48 box whose border thickness equals the stroke token. */
const StrokeBox = ({ cssVar }: { cssVar: string }) => (
  <div
    aria-hidden
    style={{
      width: 48,
      height: 48,
      background: 'transparent',
      borderRadius: 6,
      border: `var(${cssVar}) solid var(--colors-neutral-default)`,
    }}
  />
);

const StrokeView: React.FC = () => {
  const SIZE_ORDER: Record<string, number> = { none: 0, xs: 1, sm: 2, md: 3, lg: 4, xl: 5, xxl: 6 };
  const items = Object.values(tokens)
    .filter((cssVar) => cssVar.startsWith('--stroke-'))
    .sort((a, b) => {
      const keyA = a.replace('--stroke-', '');
      const keyB = b.replace('--stroke-', '');
      return (SIZE_ORDER[keyA] ?? 50) - (SIZE_ORDER[keyB] ?? 50);
    });
  return (
    <div>
      <p style={{ color: 'var(--text-default-helper)', maxWidth: 640 }}>
        Stroke (border-width) tokens — applied as `border-width` on a fixed 48×48 square. {items.length} total.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((cssVar) => (
          <div key={cssVar} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <code style={{ fontSize: 11, minWidth: 220 }}>{cssVar}</code>
            <StrokeBox cssVar={cssVar} />
          </div>
        ))}
      </div>
    </div>
  );
};

const meta: Meta<typeof StrokeView> = {
  title: 'Foundations/Tokens/Stroke',
  component: StrokeView,
};

export default meta;
type Story = StoryObj<typeof StrokeView>;

export const All: Story = {};
