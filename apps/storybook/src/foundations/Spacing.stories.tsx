import type { Meta, StoryObj } from '@storybook/react-vite';
import * as React from 'react';
import { tokens } from '@leta-io/design-tokens';

/** Bar whose width equals the resolved CSS value of the spacing token. */
const Bar = ({ cssVar }: { cssVar: string }) => (
  <div
    aria-hidden
    style={{
      width: `var(${cssVar})`,
      height: 12,
      background: 'var(--colors-primary-default)',
      borderRadius: 2,
    }}
  />
);

const SpacingView: React.FC = () => {
  const items = Object.values(tokens)
    .filter((cssVar) => cssVar.startsWith('--spacing-'))
    .sort((a, b) => {
      const numA = parseFloat(a.replace(/.*-(\d+)px$/, '$1')) || 0;
      const numB = parseFloat(b.replace(/.*-(\d+)px$/, '$1')) || 0;
      return numA - numB;
    });
  return (
    <div>
      <p style={{ color: 'var(--text-default-helper)', maxWidth: 640 }}>
        Spacing tokens (used for gaps between elements) shown at their actual computed CSS value. {items.length} total.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((cssVar) => (
          <div key={cssVar} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <code style={{ fontSize: 11, minWidth: 220 }}>{cssVar}</code>
            <Bar cssVar={cssVar} />
          </div>
        ))}
      </div>
    </div>
  );
};

const meta: Meta<typeof SpacingView> = {
  title: 'Foundations/Tokens/Spacing',
  component: SpacingView,
};

export default meta;
type Story = StoryObj<typeof SpacingView>;

export const All: Story = {};
