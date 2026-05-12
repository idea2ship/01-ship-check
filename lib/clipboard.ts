/**
 * Cross-browser copy-to-clipboard helper.
 *
 * Tries the modern Async Clipboard API first; falls back to the legacy
 * `document.execCommand('copy')` path when the API is missing (HTTP origin,
 * old Safari) or throws ("NotAllowedError: Document is not focused" etc.).
 *
 * Returns true only when the OS clipboard actually received the text — the
 * execCommand fallback's boolean return is honoured, not assumed.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to execCommand fallback below
    }
  }

  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    // Place off-screen but in-viewport so iOS will allow selection.
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.left = '0';
    ta.style.opacity = '0';
    ta.style.pointerEvents = 'none';
    document.body.appendChild(ta);

    const previous = document.activeElement as HTMLElement | null;
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, ta.value.length);

    const ok = document.execCommand('copy');

    document.body.removeChild(ta);
    previous?.focus?.();
    return ok;
  } catch {
    return false;
  }
}
