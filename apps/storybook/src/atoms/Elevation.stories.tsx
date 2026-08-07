import type { Meta, StoryObj } from '@storybook/react-vite';
import * as React from 'react';
import { tokens } from '@leta-io/design-tokens';

/**
 * One demo card showing a single elevation token applied as `box-shadow`.
 * Renders the token's `--shadow-*` CSS variable name plus the resolved value
 * (read at runtime so the story stays in sync with the token pipeline).
 */
const ShadowCard = ({ cssVar, label }: { cssVar: string; label: string }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [resolved, setResolved] = React.useState<string>('');

  React.useEffect(() => {
    if (!ref.current) return;
    const value = getComputedStyle(ref.current).getPropertyValue(cssVar).trim();
    setResolved(value);
  }, [cssVar]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div
        ref={ref}
        style={{
          width: 240,
          height: 120,
          background: 'var(--surface-neutral-bg-default)',
          borderRadius: 8,
          boxShadow: `var(${cssVar})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span className="text-label-m-semibold" style={{ color: 'var(--text-default-label)' }}>
          {label}
        </span>
      </div>
      <code style={{ fontSize: 11, color: 'var(--text-default-helper)' }}>{cssVar}</code>
      {resolved && (
        <code style={{ fontSize: 10, color: 'var(--text-default-helper)', maxWidth: 240, wordBreak: 'break-all' }}>
          {resolved}
        </code>
      )}
    </div>
  );
};

/** Pull all shadow tokens from the auto-generated tokens map. */
const shadowEntries = Object.entries(tokens)
  .filter(([, cssVar]) => cssVar.startsWith('--shadow-'))
  .map(([key, cssVar]) => ({
    key,
    cssVar,
    // Convert "shadowNeutral1" → "Neutral 1" for display
    label: key
      .replace(/^shadow/, '')
      .replace(/([A-Z])/g, ' $1')
      .replace(/(\d+)/g, ' $1')
      .trim(),
  }));

const ElevationView: React.FC = () => (
  <div style={{ padding: 16 }}>
    <p style={{ color: 'var(--text-default-helper)', maxWidth: 640, marginBottom: 32 }}>
      Elevation drop shadows — {shadowEntries.length} effect styles from the LETA Library. Each shadow
      composes one or more layers into a single `box-shadow` value. The FAB Button uses{' '}
      <code>--shadow-neutral-3</code>.
    </p>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'flex-start' }}>
      {shadowEntries.map(({ key, cssVar, label }) => (
        <ShadowCard key={key} cssVar={cssVar} label={label} />
      ))}
    </div>
  </div>
);

const meta: Meta<typeof ElevationView> = {
  title: 'Atoms/Elevation',
  component: ElevationView,
};

export default meta;
type Story = StoryObj<typeof ElevationView>;

export const All: Story = {};
