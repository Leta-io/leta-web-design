import * as React from 'react';
import { sanitizeRichText } from '@leta-io/components';

// Converts a Rich Text Area value into real React elements — never raw markup
// injection. `sanitizeRichText` already reduces the string to a fixed allowlist
// (strong/em/u/br/text), so this walk is exhaustive and has no "else, trust it"
// branch: anything unrecognized is dropped to its text content.
function nodeToReact(node: ChildNode, key: number): React.ReactNode {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (node.nodeType !== Node.ELEMENT_NODE) return null;
  const el = node as Element;
  const children = Array.from(el.childNodes).map((c, i) => nodeToReact(c, i));
  switch (el.tagName) {
    case 'STRONG':
    case 'B':
      return <strong key={key}>{children}</strong>;
    case 'EM':
    case 'I':
      return <em key={key}>{children}</em>;
    case 'U':
      return <u key={key}>{children}</u>;
    case 'BR':
      return <br key={key} />;
    default:
      return children;
  }
}

/** Render a Rich Text Area value (bold/italic/underline/line-breaks only) as React nodes. */
export function renderRichText(html: string): React.ReactNode {
  const clean = sanitizeRichText(html);
  if (typeof DOMParser === 'undefined') return clean;
  const parsed = new DOMParser().parseFromString(clean, 'text/html');
  return Array.from(parsed.body.childNodes).map((n, i) => nodeToReact(n, i));
}
