/** Copy text; true on success. Never throws. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Open the native share sheet; fall back to the clipboard. Never auto-sends —
 * the person picks where it goes, or pastes it themselves.
 */
export async function shareOrCopy(title: string, text: string): Promise<'shared' | 'copied' | 'cancelled' | 'failed'> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
      // fall through to copy
    }
  }
  return (await copyText(text)) ? 'copied' : 'failed';
}
