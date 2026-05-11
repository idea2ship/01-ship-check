'use client';

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
  allowContentUse: boolean;
  saveState: SaveState;
  savedId: string | null;
  onAllowContentUseChange: (value: boolean) => void;
  onSave: () => void;
};

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

function Check() {
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
        transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1], delay: 0.05 }}
      />
    </motion.svg>
  );
}

const labelTransition = { duration: 0.22, ease: [0.4, 0, 0.2, 1] as const };

export function ShareSection({
  getMarkdown,
  allowContentUse,
  saveState,
  savedId,
  onAllowContentUseChange,
  onSave,
}: Props) {
  const saveDisabled =
    saveState.kind === 'saving' || saveState.kind === 'saved';

  function getShareUrl(): string {
    if (typeof window === 'undefined' || !savedId) return '';
    return `${window.location.origin}/r/${savedId}`;
  }

  return (
    <section className="rounded-2xl border border-border-soft bg-white p-5 shadow-soft sm:p-6">
      <h3 className="mb-4 text-sm font-medium text-ink">Share result</h3>

      <div className="mb-6 space-y-2">
        <p className="text-xs text-muted">
          평가 결과를 클립보드에 복사하거나, 저장 후 생성된 링크를 친구에게
          보낼 수 있습니다.
        </p>
        <div className="flex flex-wrap gap-2">
          <CopyButton getText={getMarkdown} label="Copy result" />
          {savedId ? (
            <CopyButton
              getText={getShareUrl}
              label="Copy link"
              copiedLabel="Link copied"
            />
          ) : null}
        </div>
        {savedId ? (
          <p className="break-all rounded-xl border border-border-soft bg-cream/40 px-3 py-2 font-mono text-[11px] text-ink/70">
            {getShareUrl() || `/r/${savedId}`}
          </p>
        ) : null}
      </div>

      <div className="space-y-3 border-t border-border-soft pt-5">
        <p className="text-xs text-muted">
          저장 버튼을 누르면 아이디어와 AI 평가 결과가 익명으로 보관됩니다.
          개인을 식별할 수 있는 정보는 수집하지 않습니다.{' '}
          <Link
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-ink"
          >
            저장 정책 보기 ↗
          </Link>
        </p>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-mint-soft/30 p-3">
          <input
            type="checkbox"
            checked={allowContentUse}
            onChange={(e) => onAllowContentUseChange(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border-soft text-mint accent-mint focus:ring-mint"
          />
          <div className="text-sm">
            <p className="text-ink">
              [선택] 콘텐츠 예시 활용에도 동의합니다
            </p>
            <p className="mt-1 text-xs text-muted">
              익명 처리된 아이디어와 평가 결과가 추후 idea2ship 콘텐츠 예시로
              활용될 수 있습니다. 공개 시 개인을 식별할 수 있는 정보는
              제거합니다.{' '}
              <Link
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="underline underline-offset-2 hover:text-ink"
              >
                자세히 보기 ↗
              </Link>
            </p>
          </div>
        </label>

        <div className="flex flex-col-reverse items-stretch gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted">
            {saveState.kind === 'saved'
              ? '저장 완료. 함께해 주셔서 감사합니다.'
              : '버튼 클릭 = 익명 저장 동의'}
          </p>
          <button
            type="button"
            onClick={onSave}
            disabled={saveDisabled}
            className={`relative inline-flex min-w-[160px] items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed ${
              saveState.kind === 'saved'
                ? 'bg-mint-strong text-white'
                : saveDisabled
                  ? 'bg-mint/70 text-ink'
                  : 'bg-mint text-ink hover:bg-mint/90'
            }`}
          >
            <AnimatePresence mode="wait" initial={false}>
              {saveState.kind === 'saving' ? (
                <motion.span
                  key="saving"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={labelTransition}
                  className="inline-flex items-center gap-2"
                >
                  <Spinner />
                  <span>Saving…</span>
                </motion.span>
              ) : saveState.kind === 'saved' ? (
                <motion.span
                  key="saved"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={labelTransition}
                  className="inline-flex items-center gap-2"
                >
                  <Check />
                  <span>Saved</span>
                </motion.span>
              ) : (
                <motion.span
                  key="idle"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={labelTransition}
                >
                  Save anonymously
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>

        {saveState.kind === 'error' ? (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700"
          >
            {saveState.message}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export type { SaveState };
