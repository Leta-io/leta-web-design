// Minimal allowlist sanitizer for the Rich Text Area's stored/rendered value.
// No external dependency (no DOMPurify in the repo) — the format surface is
// intentionally tiny (bold/italic/underline/line-breaks only), so a hand-rolled
// walker is both simpler and easier to audit than pulling in a general-purpose
// HTML sanitizer for three tags.
//
// Untrusted input is parsed with DOMParser into a detached document (never
// attached to the live page, scripts/images never execute or load), then
// walked node-by-node keeping only the allowed tags — nothing else survives.

const ALLOWED_TAGS = new Set(['STRONG', 'B', 'EM', 'I', 'U', 'BR']);

function walkInto(sourceNode: Node, target: Node, doc: Document): void {
  for (const child of Array.from(sourceNode.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      target.appendChild(doc.createTextNode(child.textContent ?? ''));
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue; // drop comments etc.
    const el = child as Element;
    if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') continue; // drop entirely, no hoisting
    if (ALLOWED_TAGS.has(el.tagName)) {
      const clean = doc.createElement(el.tagName);
      walkInto(el, clean, doc);
      target.appendChild(clean);
    } else {
      // Unknown tag (DIV/P/SPAN/A/IMG/...) — drop the wrapper, hoist its children
      // so the visible text survives, just unformatted.
      walkInto(el, target, doc);
    }
  }
}

/** Remove formatting elements left with no text content (e.g. a Bold toggled on/off with nothing typed). */
function pruneEmpty(root: Element): void {
  // Innermost-first so a chain of now-empty wrappers collapses fully in one pass.
  const candidates = Array.from(root.querySelectorAll('strong, b, em, i, u')).reverse();
  for (const el of candidates) {
    if ((el.textContent ?? '').length === 0 && !el.querySelector('br')) {
      el.parentNode?.removeChild(el);
    }
  }
}

/**
 * Reduce an HTML string down to only `<strong>/<b>/<em>/<i>/<u>/<br>`, no
 * attributes, no other tags — the output is inert markup, safe to render as
 * raw HTML anywhere downstream. No-ops (returns unchanged) outside a browser.
 */
export function sanitizeRichText(html: string): string {
  if (typeof DOMParser === 'undefined' || !html) return html ?? '';
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const out = parsed.createElement('div');
  walkInto(parsed.body, out, parsed);
  pruneEmpty(out);
  return out.innerHTML;
}

/** Plain visible text of a (rich or plain) HTML string — for length/emptiness checks. */
export function htmlToPlainText(html: string): string {
  if (typeof DOMParser === 'undefined' || !html) return html ?? '';
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  return parsed.body.textContent ?? '';
}
