import type { Meta, StoryObj } from '@storybook/react-vite';
import { ModalDialog } from './ModalDialog.js';

/**
 * Modal Dialog (`1317:4855`) — a 512px-wide single-purpose modal. ModalHeaders +
 * body + FooterFrame. Five variants set the body: Comment (TextArea), Form
 * (2-col Input Fields), Signature (canvas), Image (preview), Multi-choice
 * (Option Cards). Comment/Form/Multi-choice footer: Close / Confirm.
 * Signature/Image footer: a single "Download Image" action that saves the
 * previewed image locally (dismiss is via the header ×).
 */
const meta: Meta<typeof ModalDialog> = {
  title: 'Templates/Modal Dialog',
  component: ModalDialog,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof ModalDialog>;

/** Comment — a single TextArea (counter on). */
export const Comment: Story = {
  render: () => <ModalDialog variant="comment" title="Add a comment" />,
};

/** Form — a two-column row of Input Fields. */
export const Form: Story = {
  render: () => <ModalDialog variant="form" title="Edit details" />,
};

/**
 * Signature — a bordered signature canvas (480×304). Footer is a single
 * "Download Image" action (no Close button — dismiss via the header ×).
 * Clicking it really downloads the sample signature asset as `signature.png`.
 */
export const Signature: Story = {
  render: () => <ModalDialog variant="signature" title="Signature" />,
};

/**
 * Image — an image preview (480×304). Same "Download Image" footer as
 * Signature — downloads the sample delivery photo as `proof-of-delivery.jpg`.
 */
export const Image: Story = {
  render: () => <ModalDialog variant="image" title="Proof of delivery" />,
};

/**
 * `showDownload={false}` escape hatch — falls back to the standard Close/Confirm
 * footer for a non-proof use of the `image`/`signature` variants.
 */
export const ImageWithoutDownload: Story = {
  render: () => <ModalDialog variant="image" title="Proof of delivery" showDownload={false} showConfirm={false} />,
};

/** Multi-choice — a vertical list of Option Cards. */
export const MultiChoice: Story = {
  render: () => <ModalDialog variant="multi-choice" title="Choose an option" />,
};

/** All five variants. */
export const Catalog: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'flex-start', padding: 24 }}>
      <ModalDialog variant="comment" title="Add a comment" />
      <ModalDialog variant="form" title="Edit details" />
      <ModalDialog variant="signature" title="Signature" />
      <ModalDialog variant="image" title="Proof of delivery" />
      <ModalDialog variant="multi-choice" title="Choose an option" />
    </div>
  ),
};
