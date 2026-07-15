/** Uses the native share sheet on supporting devices (mainly mobile), falling back to copy-to-clipboard everywhere else.
 * If the user opens the share sheet and cancels it, we don't fall back to clipboard — that would be a surprising
 * side effect of dismissing a dialog. */
export async function shareOrCopyLink(url: string, title: string, onCopied: () => void): Promise<void> {
  const nav = typeof navigator === "undefined" ? null : (navigator as Navigator & { share?: (data: { title?: string; url?: string }) => Promise<void> });
  if (nav?.share) {
    try {
      await nav.share({ title, url });
    } catch {
      /* user cancelled or the browser rejected the share — do nothing further */
    }
    return;
  }
  try {
    await nav?.clipboard.writeText(url);
    onCopied();
  } catch {
    /* best-effort */
  }
}
