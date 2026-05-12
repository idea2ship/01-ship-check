'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { copyToClipboard } from '@/lib/clipboard';

type ShareState =
  | { kind: 'idle' }
  | { kind: 'sharing' }
  | { kind: 'copied'; url: string }
  | { kind: 'error' };

type LocalSaveState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved' }
  | { kind: 'error' };

type Props = {
  getMarkdown: () => string;
  shareState: ShareState;
  contributeState: LocalSaveState;
  onShare: () => void;
  onContribute: () => void;
  /** Reset the share button back to the idle label after the "복사 완료" beat. */
  onResetShare: () => void;
};

const RESET_MS = 1800;

export function ShareSection({
  getMarkdown,
  shareState,
  contributeState,
  onShare,
  onContribute,
  onResetShare,
}: Props) {
  return (
    <section className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <ShareCard
          shareState={shareState}
          onShare={onShare}
          onResetShare={onResetShare}
        />
        <CopyCard getMarkdown={getMarkdown} />
        <ContributeCard
          contributeState={contributeState}
          onContribute={onContribute}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-ink/55">
        <span className="inline-flex items-center gap-1.5">
          <LockIcon />
          공유·사례 등록 시에만 서버에 익명으로 보관됩니다.
        </span>
        <Link
          href="/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-medium text-ink/75 underline underline-offset-2 transition-colors hover:text-ink"
        >
          개인정보 정책
          <span aria-hidden>›</span>
        </Link>
      </div>
    </section>
  );
}

// ---------- Cards ----------

function ShareCard({
  shareState,
  onShare,
  onResetShare,
}: {
  shareState: ShareState;
  onShare: () => void;
  onResetShare: () => void;
}) {
  const sharing = shareState.kind === 'sharing';
  const copied = shareState.kind === 'copied';
  const errored = shareState.kind === 'error';

  // Auto-revert the copied/error state back to idle after a short hold so the
  // button doesn't stay frozen on the "복사 완료!" microstate.
  useEffect(() => {
    if (!copied && !errored) return;
    const t = setTimeout(onResetShare, RESET_MS);
    return () => clearTimeout(t);
  }, [copied, errored, onResetShare]);

  const title = sharing
    ? '공유 링크 생성 중…'
    : copied
      ? '복사 완료!'
      : errored
        ? '다시 시도해 주세요'
        : '결과 공유하기';

  const subtitle = sharing
    ? '잠시만요'
    : copied
      ? '다른사람들과 공유해요!'
      : errored
        ? '잠시 후 다시 눌러보세요'
        : '이미지로 저장해서 공유할 수 있어요';

  return (
    <button
      type="button"
      onClick={onShare}
      disabled={sharing}
      className="group relative flex items-center gap-3 overflow-hidden rounded-2xl bg-mint-strong px-4 py-3.5 text-left text-white shadow-soft transition hover:bg-mint-strong/95 disabled:cursor-wait disabled:opacity-90"
      aria-live="polite"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
        <AnimatePresence mode="wait" initial={false}>
          {sharing ? (
            <motion.span
              key="sp"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.14 }}
            >
              <Spinner />
            </motion.span>
          ) : copied ? (
            <motion.span
              key="ok"
              initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 460, damping: 16 }}
            >
              <CheckIcon />
            </motion.span>
          ) : errored ? (
            <motion.span
              key="er"
              initial={{ opacity: 0, x: 4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.16 }}
            >
              <CrossIcon />
            </motion.span>
          ) : (
            <motion.span
              key="id"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
            >
              <ShareIcon />
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <AnimatedLabel
          text={title}
          className="text-sm font-semibold leading-tight"
        />
        <span className="text-[11px] leading-snug text-white/80">
          {subtitle}
        </span>
      </div>
    </button>
  );
}

function CopyCard({ getMarkdown }: { getMarkdown: () => string }) {
  const [state, setState] = useState<'idle' | 'pending' | 'copied' | 'error'>(
    'idle',
  );

  useEffect(() => {
    if (state !== 'copied' && state !== 'error') return;
    const t = setTimeout(() => setState('idle'), RESET_MS);
    return () => clearTimeout(t);
  }, [state]);

  async function handleClick() {
    if (state === 'pending') return;
    // Capture text upfront so React state churn can't invalidate the closure.
    const text = getMarkdown();
    setState('pending');
    const startedAt = Date.now();
    const ok = await copyToClipboard(text);
    const elapsed = Date.now() - startedAt;
    setTimeout(() => setState(ok ? 'copied' : 'error'), Math.max(0, 220 - elapsed));
  }

  const title =
    state === 'pending'
      ? '복사 중…'
      : state === 'copied'
        ? '복사 완료!'
        : state === 'error'
          ? '복사에 실패했어요'
          : '결과 복사하기';
  const subtitle =
    state === 'copied'
      ? '메모장이나 노션에 그대로 붙여넣기'
      : '텍스트로 복사해서 메모에 붙여넣기';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={state === 'pending'}
      className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-ink/10 bg-white/85 px-4 py-3.5 text-left text-ink shadow-soft transition hover:border-ink/25 hover:bg-white disabled:cursor-wait"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink/[0.06] text-ink/80">
        <AnimatePresence mode="wait" initial={false}>
          {state === 'pending' ? (
            <motion.span
              key="p"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.14 }}
            >
              <Spinner />
            </motion.span>
          ) : state === 'copied' ? (
            <motion.span
              key="c"
              initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 460, damping: 16 }}
              className="text-ink"
            >
              <CheckIcon />
            </motion.span>
          ) : state === 'error' ? (
            <motion.span
              key="e"
              initial={{ opacity: 0, x: 4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.16 }}
              className="text-red-500"
            >
              <CrossIcon />
            </motion.span>
          ) : (
            <motion.span
              key="i"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.12 }}
            >
              <CopyIcon />
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <AnimatedLabel
          text={title}
          className="text-sm font-semibold leading-tight text-ink"
        />
        <span className="text-[11px] leading-snug text-ink/60">{subtitle}</span>
      </div>
    </button>
  );
}

function ContributeCard({
  contributeState,
  onContribute,
}: {
  contributeState: LocalSaveState;
  onContribute: () => void;
}) {
  const saving = contributeState.kind === 'saving';
  const saved = contributeState.kind === 'saved';
  const errored = contributeState.kind === 'error';

  const title = saving
    ? '보내는 중…'
    : saved
      ? '잘 받았어요'
      : errored
        ? '다시 시도해 주세요'
        : '아이디어 보태기';

  const subtitle = saving
    ? '잠시만요'
    : saved
      ? '함께해주셔서 감사해요!'
      : errored
        ? '잠시 후 다시 눌러보세요'
        : '메이커에게 도움이 돼요';

  return (
    <button
      type="button"
      onClick={onContribute}
      disabled={saving || saved}
      className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-ink/10 bg-white/85 px-4 py-3.5 text-left text-ink shadow-soft transition hover:border-ink/25 hover:bg-white disabled:cursor-default disabled:opacity-95"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink/[0.06] text-ink/80">
        <AnimatePresence mode="wait" initial={false}>
          {saving ? (
            <motion.span
              key="sv"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.14 }}
            >
              <Spinner />
            </motion.span>
          ) : saved ? (
            <motion.span
              key="ok"
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 480, damping: 14 }}
              className="text-pink-500"
            >
              <HeartFilledIcon />
            </motion.span>
          ) : errored ? (
            <motion.span
              key="er"
              initial={{ opacity: 0, x: 4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.16 }}
              className="text-red-500"
            >
              <CrossIcon />
            </motion.span>
          ) : (
            <motion.span
              key="id"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.12 }}
            >
              <HeartPlusIcon />
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <AnimatedLabel
          text={title}
          className="text-sm font-semibold leading-tight text-ink"
        />
        {subtitle ? (
          <span className="text-[11px] leading-snug text-ink/60">
            {subtitle}
          </span>
        ) : null}
      </div>
    </button>
  );
}

// ---------- Animated label ----------

function AnimatedLabel({ text, className }: { text: string; className?: string }) {
  // Re-key on text change so AnimatePresence runs the stagger entrance for
  // each new title (sharing → copied, etc.).
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={text}
        className={`inline-flex ${className ?? ''}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.08 } }}
        aria-label={text}
      >
        {Array.from(text).map((c, i) => (
          <motion.span
            key={`${c}-${i}`}
            initial={{ opacity: 0, y: -6, x: -4, rotate: -10 }}
            animate={{ opacity: 1, y: 0, x: 0, rotate: 0 }}
            transition={{
              delay: i * 0.018,
              duration: 0.3,
              ease: [0.34, 1.56, 0.64, 1],
            }}
            aria-hidden
            className="inline-block whitespace-pre"
          >
            {c}
          </motion.span>
        ))}
      </motion.span>
    </AnimatePresence>
  );
}

// ---------- Icons (lucide-style, inlined) ----------

function ShareIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
      <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function HeartFilledIcon() {
  // Lucide "heart" filled — used as the "received your contribution" cue.
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}

function HeartPlusIcon() {
  // Lucide "heart-handshake" simplified — a heart with a small "+" feel,
  // signaling a generous, additive action rather than a private save.
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      <path d="M12 5 9.04 7.96a2.17 2.17 0 0 0 0 3.08v0c.82.82 2.13.85 3 .07l2.07-1.91a2.82 2.82 0 0 1 3.79 0l2.96 2.66" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="inline-block"
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
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
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.22"
      />
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
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
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
      width="18"
      height="18"
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

export type { ShareState, LocalSaveState };
