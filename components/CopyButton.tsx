'use client';

import { useState } from 'react';

type Props = {
  getText: () => string;
};

export function CopyButton({ getText }: Props) {
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle');

  async function handleCopy() {
    const text = getText();
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setState('copied');
    } catch {
      setState('error');
    }
    setTimeout(() => setState('idle'), 1800);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-2 rounded-2xl border border-border-soft bg-white px-4 py-2 text-sm text-ink transition hover:border-mint hover:bg-mint-soft/40"
    >
      {state === 'copied'
        ? 'Copied'
        : state === 'error'
          ? 'Copy failed'
          : 'Copy result'}
    </button>
  );
}
