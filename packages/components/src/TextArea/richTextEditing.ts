// Selection/Range-based formatting for the Rich Text Area's contentEditable
// surface. No `document.execCommand` — that API is formally deprecated and
// behaves inconsistently across browsers for edge cases (nested formatting,
// undo integration). These helpers manually wrap/unwrap the selected Range in
// <strong>/<em>/<u>, which is fully within our control and predictable.

export type RichTextFormat = 'bold' | 'italic' | 'underline';

/**
 * Canonical tag we WRITE per format (matches the allowlist in `sanitizeRichText`).
 * We standardize on the semantic tags (STRONG/EM) rather than presentational
 * (B/I), but recognize the legacy ones on READ (pasted content) — see FORMAT_TAGS_ANY.
 */
export const FORMAT_TAG: Record<RichTextFormat, string> = {
  bold: 'STRONG',
  italic: 'EM',
  underline: 'U',
};

/** All tag spellings a format can appear as (pasted HTML may still carry `<b>`/`<i>`). */
const FORMAT_TAGS_ANY: Record<RichTextFormat, Set<string>> = {
  bold: new Set(['STRONG', 'B']),
  italic: new Set(['EM', 'I']),
  underline: new Set(['U']),
};

/** Zero-width space used as the caret anchor for "sticky" formatting (§ below). */
export const ZWSP = '​';

/** Replace an element's entire content with (already-sanitized) HTML, node-by-node — never via a raw assignment. */
export function replaceContent(el: HTMLElement, html: string): void {
  while (el.firstChild) el.removeChild(el.firstChild);
  if (!html) return;
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  Array.from(parsed.body.childNodes).forEach((n) => el.appendChild(document.importNode(n, true)));
}

function isWithin(node: Node | null, root: HTMLElement): boolean {
  return !!node && (node === root || root.contains(node));
}

/** The current selection, but only if it lives inside `root` — else `null`. */
export function getSelectionIn(root: HTMLElement): Selection | null {
  const sel = typeof window !== 'undefined' ? window.getSelection() : null;
  if (!sel || sel.rangeCount === 0) return null;
  if (!isWithin(sel.anchorNode, root)) return null;
  return sel;
}

/** Formats active at a single point (the ancestor chain from `node` up to `root`). */
export function getFormatsAt(node: Node | null, root: HTMLElement): Set<RichTextFormat> {
  const active = new Set<RichTextFormat>();
  let el: Node | null = node;
  while (el && el !== root) {
    if (el.nodeType === Node.ELEMENT_NODE) {
      const tag = (el as Element).tagName;
      for (const [fmt, spellings] of Object.entries(FORMAT_TAGS_ANY) as [RichTextFormat, Set<string>][]) {
        if (spellings.has(tag)) active.add(fmt);
      }
    }
    el = el.parentNode;
  }
  return active;
}

/** True only if every non-empty text node touched by `range` has a formatting ancestor for `format` within `root`. */
export function isRangeFullyFormatted(range: Range, root: HTMLElement, format: RichTextFormat): boolean {
  const spellings = FORMAT_TAGS_ANY[format];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let sawText = false;
  let node: Node | null;
  // eslint-disable-next-line no-cond-assign
  while ((node = walker.nextNode())) {
    if (!range.intersectsNode(node)) continue;
    if (!node.textContent || node.textContent.length === 0) continue;
    sawText = true;
    let el: Node | null = node.parentNode;
    let found = false;
    while (el && el !== root) {
      if (el.nodeType === Node.ELEMENT_NODE && spellings.has((el as Element).tagName)) { found = true; break; }
      el = el.parentNode;
    }
    if (!found) return false;
  }
  return sawText;
}

/**
 * Flat character offset (relative to all of `root`'s text) equivalent to a
 * (node, nodeOffset) boundary point — the inverse of `resolveTextOffset`.
 * `Range.toString()` concatenates exactly the text content between two
 * boundary points per spec, so measuring a throwaway range from the start of
 * `root` is a correct, trivial way to compute this (handles a Text-node or an
 * Element/child-index container identically — no special-casing needed).
 */
function textOffsetAt(root: HTMLElement, node: Node, nodeOffset: number): number {
  const r = document.createRange();
  r.setStart(root, 0);
  r.setEnd(node, nodeOffset);
  return r.toString().length;
}

/**
 * Re-derive a (node, offset) boundary point for a flat character offset
 * (relative to `root`'s full text) — the inverse of `textOffsetAt`. Always
 * resolves to a real text node, immune to node merging/splitting elsewhere
 * (e.g. from `Node.normalize()`), unlike holding onto a specific Node reference.
 *
 * When `target` lands exactly on the junction between two text nodes (e.g. the
 * boundary of content this function's caller just wrapped/unwrapped, now
 * sitting between two sibling text nodes), which side wins matters: a START
 * boundary must land at the *start* of what follows (so a subsequent
 * `extractContents()`/edge-check treats it as "inside" that content, not
 * clinging to the end of the preceding sibling); an END boundary is the
 * mirror case and should keep the current (prefer-earlier) behavior. Pass
 * `preferFollowing: true` for start boundaries only.
 */
function resolveTextOffset(root: HTMLElement, target: number, preferFollowing = false): { node: Node; offset: number } {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let pos = 0;
  let last: Text | null = null;
  let node: Node | null;
  // eslint-disable-next-line no-cond-assign
  while ((node = walker.nextNode())) {
    const len = (node as Text).length;
    if (preferFollowing && pos + len === target) {
      pos += len;
      last = node as Text;
      continue; // let the next text node (if any) claim this junction at its own offset 0
    }
    if (pos + len >= target) return { node, offset: target - pos };
    pos += len;
    last = node as Text;
  }
  if (last) return { node: last, offset: last.length };
  return { node: root, offset: root.childNodes.length };
}

/**
 * Push a range boundary outward past every ancestor it sits at the very edge
 * of — regardless of tag (a Bold removal may need to climb *through* an
 * unrelated Italic wrapper to reach the Bold element beyond it). `extractContents()`
 * on a boundary that's merely at a text node's edge (offset 0, or offset ===
 * length) — even when that exactly spans an ancestor's entire content — only
 * extracts the text; it does NOT pull the wrapping element(s) along, leaving
 * empty shells behind live in the DOM (which a follow-up `insertNode()` at that
 * same spot lands right back inside, silently no-opping the unwrap).
 * Re-expressing the boundary as "before/after the element(s)" instead of "at
 * its text's edge" fixes this; `stripTags` afterward only removes the one tag
 * being toggled, so any other wrapper climbed through (like that Italic) is
 * carried into the extracted fragment untouched.
 */
function expandToOutermostEdge(node: Node, atEnd: boolean, root: Node): Node {
  let current = node;
  for (;;) {
    const parent = current.parentNode;
    if (!parent || parent === root) return current;
    const atEdge = atEnd ? current === parent.lastChild : current === parent.firstChild;
    if (!atEdge) return current;
    current = parent;
  }
}

/** Recursively unwrap every element inside `fragment` whose tagName is in `tags`, keeping its children in place. */
function stripTagss(fragment: DocumentFragment, tags: Set<string>): void {
  const selector = Array.from(tags).map((t) => t.toLowerCase()).join(',');
  const matches = fragment.querySelectorAll(selector);
  matches.forEach((el) => {
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
  });
}

/**
 * Toggle `format` across a non-collapsed selection: wraps the selected range in
 * the format's tag, or strips it if the whole selection is already formatted.
 * Re-selects the affected content afterward so it stays visibly highlighted.
 * No-ops if the selection is collapsed (see the sticky-caret path instead).
 */
export function applyFormatToSelection(root: HTMLElement, format: RichTextFormat): boolean {
  const sel = getSelectionIn(root);
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  if (range.collapsed) return false;

  const tag = FORMAT_TAG[format];
  const active = isRangeFullyFormatted(range, root, format);

  // Capture the affected span as flat character offsets *before* any boundary
  // expansion or DOM mutation — reselecting from these afterward (via
  // resolveTextOffset) is immune to `root.normalize()` merging/removing the
  // specific node references any operation below might otherwise hand back.
  const startFlatOffset = textOffsetAt(root, range.startContainer, range.startOffset);
  const endFlatOffset = textOffsetAt(root, range.endContainer, range.endOffset);

  if (active) {
    // Before extracting, push each boundary that sits exactly at a text node's
    // edge outward to the outermost fully-covered ancestor — see
    // expandToOutermostEdge — so the extraction below pulls every wrapper
    // element along instead of leaving empty shells behind; `stripTags` below
    // then removes only the one tag being toggled off.
    if (range.startContainer.nodeType === Node.TEXT_NODE && range.startOffset === 0) {
      const expanded = expandToOutermostEdge(range.startContainer, false, root);
      if (expanded !== range.startContainer) range.setStartBefore(expanded);
    }
    if (range.endContainer.nodeType === Node.TEXT_NODE && range.endOffset === (range.endContainer as Text).length) {
      const expanded = expandToOutermostEdge(range.endContainer, true, root);
      if (expanded !== range.endContainer) range.setEndAfter(expanded);
    }
  }

  const fragment = range.extractContents();

  let inserted: Node;
  if (active) {
    stripTagss(fragment, FORMAT_TAGS_ANY[format]);
    inserted = fragment;
  } else {
    const wrapper = document.createElement(tag);
    wrapper.appendChild(fragment);
    inserted = wrapper;
  }

  range.insertNode(inserted);

  // `extractContents()` can leave a now-empty (zero-length) text node behind
  // in the live DOM — invisible in the rendered HTML, but it silently breaks
  // the "is this node at the very edge of its parent" check a *later* toggle
  // relies on (expandToOutermostEdge). normalize() merges/removes those.
  root.normalize();

  // Reselect from the flat offsets captured up top — never from a specific
  // Node reference, since normalize() may have just merged or removed the
  // exact nodes this operation touched.
  const startBoundary = resolveTextOffset(root, startFlatOffset, true);
  const endBoundary = resolveTextOffset(root, endFlatOffset);
  const newRange = document.createRange();
  newRange.setStart(startBoundary.node, startBoundary.offset);
  newRange.setEnd(endBoundary.node, endBoundary.offset);
  sel.removeAllRanges();
  sel.addRange(newRange);
  return true;
}

/**
 * Insert a `<br>` at the caret (used to intercept Enter so line breaks stay a
 * single allowed tag, instead of letting the browser insert block elements
 * like `<div>`/`<p>` per line — which our sanitizer would otherwise unwrap,
 * silently merging separate lines together).
 */
export function insertLineBreak(root: HTMLElement): void {
  const sel = getSelectionIn(root);
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  const atFlat = textOffsetAt(root, range.startContainer, range.startOffset);
  range.deleteContents();
  const br = document.createElement('br');
  range.insertNode(br);
  root.normalize();
  // A <br> counts as one position in flat-offset terms (Range.toString()
  // skips it, so the boundary right after it is still "atFlat" — not +1).
  const boundary = resolveTextOffset(root, atFlat);
  const newRange = document.createRange();
  newRange.setStart(boundary.node, boundary.offset);
  newRange.collapse(true);
  sel.removeAllRanges();
  sel.addRange(newRange);
}

/** Insert plain text (no formatting) at the caret, replacing any selection. */
export function insertPlainText(root: HTMLElement, text: string): void {
  const sel = getSelectionIn(root);
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  const atFlat = textOffsetAt(root, range.startContainer, range.startOffset);
  range.deleteContents();
  const node = document.createTextNode(text);
  range.insertNode(node);
  root.normalize();
  const boundary = resolveTextOffset(root, atFlat + text.length);
  const newRange = document.createRange();
  newRange.setStart(boundary.node, boundary.offset);
  newRange.collapse(true);
  sel.removeAllRanges();
  sel.addRange(newRange);
}

/** Insert an already-sanitized HTML fragment at the caret, replacing any selection (paste). */
export function insertSanitizedFragment(root: HTMLElement, sanitizedHtml: string): void {
  const sel = getSelectionIn(root);
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  const atFlat = textOffsetAt(root, range.startContainer, range.startOffset);
  range.deleteContents();
  // Parse via DOMParser (detached document, nothing executes) rather than
  // assigning into a live element — the string is already allowlist-sanitized
  // by this point, but there's no reason to hand back a raw-markup foothold.
  const parsed = new DOMParser().parseFromString(sanitizedHtml, 'text/html');
  const fragment = document.createDocumentFragment();
  Array.from(parsed.body.childNodes).forEach((n) => fragment.appendChild(document.importNode(n, true)));
  const insertedLength = (fragment.textContent ?? '').length;
  range.insertNode(fragment);
  root.normalize();
  const boundary = resolveTextOffset(root, atFlat + insertedLength);
  const newRange = document.createRange();
  newRange.setStart(boundary.node, boundary.offset);
  newRange.collapse(true);
  sel.removeAllRanges();
  sel.addRange(newRange);
}

/**
 * "Sticky" formatting at a collapsed caret (no selection) — inserts a
 * zero-width-space marker nested in the requested tags and places the caret
 * inside it, so subsequent native typing lands already-formatted. Returns the
 * marker's innermost element (the caller tracks it to clean up the ZWSP once
 * real text is typed).
 */
export function insertStickyMarker(root: HTMLElement, formats: Set<RichTextFormat>): HTMLElement | null {
  const sel = getSelectionIn(root);
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  range.deleteContents();

  const zwsp = document.createTextNode(ZWSP);
  let innermost: HTMLElement | null = null;
  let node: Node = zwsp;
  // Nest in a fixed order so combined formats always produce the same shape.
  for (const format of (['underline', 'italic', 'bold'] as RichTextFormat[])) {
    if (!formats.has(format)) continue;
    const el = document.createElement(FORMAT_TAG[format]);
    el.appendChild(node);
    node = el;
    if (!innermost) innermost = el;
  }
  if (!innermost) return null; // nothing to wrap — caller should no-op

  range.insertNode(node);
  root.normalize(); // cleans up debris from deleteContents() above; never touches the ZWSP itself (it's an only child)
  const newRange = document.createRange();
  newRange.setStart(zwsp, 1);
  newRange.collapse(true);
  sel.removeAllRanges();
  sel.addRange(newRange);
  return innermost;
}

/** Remove a sticky marker element entirely (abandoned before any real typing). */
export function removeStickyMarker(root: HTMLElement, marker: HTMLElement): void {
  const sel = getSelectionIn(root);
  const parent = marker.parentNode;
  if (!parent) return;
  const atFlat = textOffsetAt(root, marker, 0);
  parent.removeChild(marker);
  root.normalize();
  if (sel) {
    const boundary = resolveTextOffset(root, atFlat);
    const newRange = document.createRange();
    newRange.setStart(boundary.node, boundary.offset);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);
  }
}

/** Strip the leading ZWSP from a marker once it contains real typed text. */
export function cleanStickyMarker(marker: HTMLElement): void {
  const walker = document.createTreeWalker(marker, NodeFilter.SHOW_TEXT);
  const first = walker.nextNode() as Text | null;
  if (first && first.textContent?.startsWith(ZWSP)) {
    first.textContent = first.textContent.slice(1);
    if (first.textContent.length === 0) first.parentNode?.removeChild(first);
  }
}
