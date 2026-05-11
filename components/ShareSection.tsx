'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { CopyButton } from './CopyButton';

type SaveState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved' }
  | { kind: 'error'; message: string };

type Props = {
  getMarkdown: () => string;
  saveState: SaveState;
  savedId: string | null;
  /** Pass the content-use consent state captured from the checkbox. */
  onSave: (allowContentUse: boolean) => void;
};

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
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

function CheckMark() {
  return (
    <motion.svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      initial={{ scale: 0.4, rotate: -8 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 420, damping: 16 }}
    >
      <motion.path
        d="M5 13l4 4L19 7"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: 0.05 }}
      />
    </motion.svg>
  );
}

const transition = { duration: 0.28, ease: [0.4, 0, 0.2, 1] as const };

export function ShareSection({
  getMarkdown,
  saveState,
  savedId,
  onSave,
}: Props) {
  const [allowContentUse, setAllowContentUse] = useState(false);

  const shareUrl =
    typeof window !== 'undefined' && savedId
      ? `${window.location.origin}/r/${savedId}`
      : '';

  const saving = saveState.kind === 'saving';
  const saved = saveState.kind === 'saved';
  const errored = saveState.kind === 'error';

  return (
    <section className="rounded-2xl border border-white/65 bg-white/55 p-4 shadow-soft backdrop-blur-sm sm:p-5">
      <AnimatePresence mode="wait" initial={false}>
        {saved && shareUrl ? (
          <motion.div
            key="saved"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={transition}
            className="space-y-3"
          >
            <div className="flex items-center gap-2 text-sm">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-mint-strong text-white">
                <CheckMark />
              </span>
              <span className="font-medium text-ink">
                저장 완료 — 공유 링크가 생성되었어요
              </span>
            </div>
            <div className="break-all rounded-xl border border-ink/10 bg-white/85 px-3 py-2 font-mono text-[11px] text-ink/75">
              {shareUrl}
            </div>
            <div className="flex flex-wrap gap-2">
              <CopyButton
                getText={() => shareUrl}
                label="🔗 링크 복사"
                copiedLabel="✓ Link copied"
                className="inline-flex items-center gap-2 rounded-2xl bg-mint-strong px-4 py-2 text-sm font-medium text-white transition hover:bg-mint-strong/90"
              />
              <CopyButton
                getText={getMarkdown}
                label="📋 결과 복사"
                copiedLabel="✓ Copied"
                className="inline-flex items-center gap-2 rounded-2xl border border-ink/10 bg-white px-4 py-2 text-sm font-medium text-ink/85 transition hover:border-ink/25"
              />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={transition}
            className="space-y-3"
          >
            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-ink/10 bg-white/70 px-3 py-2.5 text-[12px] leading-snug text-ink/80 transition hover:border-ink/20">
              <input
                type="checkbox"
                checked={allowContentUse}
                onChange={(e) => setAllowContentUse(e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 shrink-0 cursor-pointer accent-ink"
              />
              <span>
                평가 결과를 익명 통계와 콘텐츠 개선에 활용하는 데 동의합니다.{' '}
                <Link
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="underline underline-offset-2 hover:text-ink"
                >
                  자세히 보기 ↗
                </Link>
              </span>
            </label>

            <div className="grid gap-2 sm:grid-cols-2">
              <CopyButton
                getText={getMarkdown}
                label="📋 결과 복사"
                copiedLabel="✓ Copied"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-ink/15 bg-white px-5 py-3 text-sm font-semibold text-ink/85 transition hover:border-ink/30 hover:bg-white"
              />
              <button
                type="button"
                onClick={() => onSave(allowContentUse)}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-cream transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? (
                  <>
                    <Spinner />
                    <span>Saving…</span>
                  </>
                ) : (
                  <>
                    <span>익명 저장</span>
                    <span aria-hidden>→</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {errored ? (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
        >
          {saveState.kind === 'error' ? saveState.message : ''}
        </p>
      ) : null}
    </section>
  );
}

export type { SaveState };
