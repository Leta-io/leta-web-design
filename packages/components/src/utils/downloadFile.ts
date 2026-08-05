/**
 * Downloads a URL as a local file. Tries a fetch→blob round trip first (works
 * for data-URI assets and same-origin/CORS-permissive remote files, and
 * forces a real "Save" rather than a navigation); if that's blocked — a
 * cross-origin image host without CORS headers, for example — falls back to
 * opening the URL in a new tab so the action never dead-ends.
 *
 * Shared by any component that offers a "download this asset" action (e.g.
 * `ModalDialog`'s image/signature proof viewers) so the CORS/blob handling is
 * solved once, not per component.
 */
export async function downloadFile(url: string, filename: string): Promise<void> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`downloadFile: fetch failed with ${response.status}`);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
