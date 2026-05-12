'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { copyToClipboard } from '@/lib/clipboard';

type Props = {
  getText: () => string;
  label?: string;
  copiedLabel?: string;
  errorLabel?: string;
  /** Icon for the idle state. Spinner/check/cross take over during transitions. */
  icon?: React.ReactNode;
  className?: string;
  disabled?: boolean;
};

type State = 'idle' | 'pending' | 'copied' | 'error';

const COPIED_HOLD_MS = 1500;
const PENDING_MIN_MS = 220;

export function CopyButton({
  getText,
  label = 'Copy',
  copiedLabel = 'Copied',
  errorLabel = 'Failed',
  icon,
  className,
  disabled = false,
}: Props) {
  const [state, setState] = useState<State>('idle');

  // pending → copied/error after the actual clipboard call resolves AND a
  // small visual minimum so the spinner is always perceptible.
  useEffect(() => {
    if (state !== 'copied' && state !== 'error') return;
    const t = setTimeout(() => setState('idle'), COPIED_HOLD_MS);
    return () => clearTimeout(t);
  }, [state]);

  async function handleCopy() {
    if (disabled || state === 'pending') return;
    // Capture the text BEFORE switching state so a React re-render can't
    // invalidate the closure between the click and the clipboard write.
    const text = getText();
    setState('pending');

    const startedAt = Date.now();
    const ok = await copyToClipboard(text);

    // Hold the spinner for at least PENDING_MIN_MS so a fast clipboard call
    // doesn't make the loading state invisible.
    const elapsed = Date.now() - startedAt;
    const wait = Math.max(0, PENDING_MIN_MS - elapsed);
    setTimeout(() => setState(ok ? 'copied' : 'error'), wait);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={disabled || state === 'pending'}
      aria-live="polite"
      className={
        className ??
        'inline-flex items-center gap-2 rounded-2xl border border-border-soft bg-white px-4 py-2 text-sm text-ink transition hover:border-mint hover:bg-mint-soft/40'
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        {state === 'pending' ? (
          <motion.span
            key="pending"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.15 }}
            className="inline-flex items-center gap-2"
          >
            <Spinner />
            <AnimatedLabel text={label} muted />
          </motion.span>
        ) : state === 'copied' ? (
          <motion.span
            key="copied"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="inline-flex items-center gap-2"
          >
            <CheckIcon />
            <AnimatedLabel text={copiedLabel} stagger />
          </motion.span>
        ) : state === 'error' ? (
          <motion.span
            key="error"
            initial={{ opacity: 0, x: 4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="inline-flex items-center gap-2"
          >
            <CrossIcon />
            <AnimatedLabel text={errorLabel} stagger />
          </motion.span>
        ) : (
          <motion.span
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="inline-flex items-center gap-2"
          >
            {icon}
            <span>{label}</span>
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

/**
 * Characters fly in from a diagonal direction, settle into their final
 * baseline-aligned position with a tiny rotation correction. Staggered so the
 * eye reads the word forming left → right.
 */
function AnimatedLabel({
  text,
  stagger = false,
  muted = false,
}: {
  text: string;
  stagger?: boolean;
  muted?: boolean;
}) {
  if (!stagger) {
    return (
      <span className={muted ? 'opacity-60' : ''} aria-label={text}>
        {text}
      </span>
    );
  }
  // Use Array.from to handle Korean grapheme width correctly.
  const chars = Array.from(text);
  return (
    <span aria-label={text} className="inline-flex">
      {chars.map((c, i) => (
        <motion.span
          key={`${c}-${i}`}
          initial={{ opacity: 0, y: -8, x: -6, rotate: -14 }}
          animate={{ opacity: 1, y: 0, x: 0, rotate: 0 }}
          transition={{
            delay: i * 0.025,
            duration: 0.32,
            ease: [0.34, 1.56, 0.64, 1],
          }}
          aria-hidden
          className="inline-block whitespace-pre"
        >
          {c}
        </motion.span>
      ))}
    </span>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.22" />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <motion.svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      initial={{ scale: 0.5, rotate: -10 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 460, damping: 16 }}
    >
      <motion.path
        d="M20 6 9 17l-5-5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1], delay: 0.04 }}
      />
    </motion.svg>
  );
}

function CrossIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
