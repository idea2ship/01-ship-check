'use client';

import { useState } from 'react';

type Props = {
  getText: () => string;
  label?: string;
  copiedLabel?: string;
  errorLabel?: string;
  icon?: React.ReactNode;
  className?: string;
};

export function CopyButton({
  getText,
  label = 'Copy result',
  copiedLabel = 'Copied',
  errorLabel = 'Copy failed',
  icon,
  className,
}: Props) {
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

  const display =
    state === 'copied'
      ? copiedLabel
      : state === 'error'
        ? errorLabel
        : label;

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={
        className ??
        'inline-flex items-center gap-2 rounded-2xl border border-border-soft bg-white px-4 py-2 text-sm text-ink transition hover:border-mint hover:bg-mint-soft/40'
      }
    >
      {icon}
      <span>{display}</span>
    </button>
  );
}
