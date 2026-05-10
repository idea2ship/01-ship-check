'use client';

import { IDEA_MAX, SUCCESS_MAX } from '@/lib/validation';

type Props = {
  idea: string;
  successCriteria: string;
  loading: boolean;
  errorMessage: string | null;
  onIdeaChange: (value: string) => void;
  onSuccessChange: (value: string) => void;
  onSubmit: () => void;
};

export function IdeaForm({
  idea,
  successCriteria,
  loading,
  errorMessage,
  onIdeaChange,
  onSuccessChange,
  onSubmit,
}: Props) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!loading) onSubmit();
      }}
    >
      <div className="relative flex flex-col gap-7 overflow-hidden rounded-2xl border border-white/60 bg-white/25 p-6 shadow-[0_8px_32px_rgba(26,26,26,0.10),inset_0_0_30px_rgba(255,255,255,0.45)] backdrop-blur-2xl sm:p-8">
        <div className="relative z-10 flex flex-col gap-3">
          <label
            htmlFor="idea"
            className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/70"
          >
            Idea Description
          </label>
          <textarea
            id="idea"
            value={idea}
            onChange={(e) => onIdeaChange(e.target.value)}
            placeholder="예: 학생들이 수업 공지를 확인할 때 마감일과 제출서류를 놓치는 문제를, 신청할 일만 카드로 정리해서 해결한다."
            rows={6}
            maxLength={IDEA_MAX}
            className="w-full resize-none rounded-lg border border-white/70 bg-white/85 p-4 text-sm leading-relaxed text-ink shadow-inner placeholder:text-ink/45 backdrop-blur-sm focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/15"
          />
        </div>

        <div className="relative z-10 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label
              htmlFor="success"
              className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/70"
            >
              Success Metric
            </label>
            <span className="text-[10px] uppercase tracking-wide text-ink/55">
              Measurable Goal
            </span>
          </div>
          <textarea
            id="success"
            value={successCriteria}
            onChange={(e) => onSuccessChange(e.target.value)}
            placeholder="1주일 후 무엇이 일어나면 성공인가요?"
            rows={2}
            maxLength={SUCCESS_MAX}
            className="w-full resize-none rounded-lg border border-white/70 bg-white/85 p-4 text-sm leading-relaxed text-ink shadow-inner placeholder:text-ink/45 backdrop-blur-sm focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/15"
          />
        </div>

        {errorMessage ? (
          <div
            role="alert"
            className="relative z-10 rounded-lg border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-700"
          >
            {errorMessage}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="relative z-10 flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-4 text-base font-semibold text-cream shadow-lg transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            'Checking…'
          ) : (
            <>
              Check my idea
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
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </>
          )}
        </button>

        <div className="relative z-10 flex items-start gap-2 text-sm font-medium text-ink/80">
          <svg
            className="mt-0.5 shrink-0"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <p className="leading-snug">
            당신의 아이디어는 비공개로 유지되며 오직 분석 목적으로만
            사용됩니다.
          </p>
        </div>
      </div>
    </form>
  );
}
