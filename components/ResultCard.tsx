'use client';

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';
import { ConceptImage } from './ConceptImage';
import type { EvaluationResult } from '@/lib/types';

type Props = {
  result: EvaluationResult;
  conceptImageUrl?: string | null;
  /** User's success metric input, echoed back as the measurable goal. */
  successCriteria?: string;
  /** Show "idea2ship.xyz" brand strip at the bottom — recommended for /r/[id] */
  showBrandStrip?: boolean;
};

const tiltSpring = { stiffness: 200, damping: 22, mass: 0.6 };

export function ResultCard({
  result,
  conceptImageUrl,
  successCriteria,
  showBrandStrip = false,
}: Props) {
  const { shipType, confidence, scores, mvpStrategy, nextActions } = result;
  // result.summary is referenced inline below; not destructured so the
  // optional-chaining stays explicit.

  // Cursor-tracking tilt: spring the raw motion values first (smoother and
  // SSR-safer than spring-on-transform), then derive rotate/glow from them.
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const smoothX = useSpring(rawX, tiltSpring);
  const smoothY = useSpring(rawY, tiltSpring);
  const rotateX = useTransform(smoothY, [-0.5, 0.5], [3, -3]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-3, 3]);
  const glowX = useTransform(smoothX, [-0.5, 0.5], ['0%', '100%']);
  const glowY = useTransform(smoothY, [-0.5, 0.5], ['0%', '100%']);
  const glow = useMotionTemplate`radial-gradient(circle at ${glowX} ${glowY}, rgba(255,255,255,0.35), transparent 55%)`;

  function handleMouseEnter() {
    // Tell BgLayer to pause its cursor parallax while we're on the card so
    // the background image stays still during the tilt.
    if (typeof document !== 'undefined') {
      document.body.dataset.cardHover = 'true';
    }
  }
  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    rawX.set((e.clientX - rect.left) / rect.width - 0.5);
    rawY.set((e.clientY - rect.top) / rect.height - 0.5);
  }
  function handleMouseLeave() {
    rawX.set(0);
    rawY.set(0);
    if (typeof document !== 'undefined') {
      document.body.dataset.cardHover = 'false';
    }
  }

  return (
    <motion.article
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 1200,
        transformStyle: 'preserve-3d',
      }}
      className="relative overflow-hidden rounded-[28px] border border-white/55 bg-white/45 p-4 shadow-[0_8px_32px_0_rgba(31,38,135,0.08)] backdrop-blur-2xl sm:p-5"
    >
      {/* Cursor glow overlay (decorative, doesn't block clicks) */}
      <motion.div
        aria-hidden
        style={{ background: glow }}
        className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-200"
      />

      <div className="relative z-10">
        {/* Hero — Ship Type info on the left, concept image woven in on the
            right of the SAME card (no longer a separate boxed image). The
            shared gradient + tiny decorative sparkles make the image feel
            like part of the result, not an attachment above it. */}
        <div className="relative mb-2.5 overflow-hidden rounded-[1.5rem] border border-mint-strong/25 bg-gradient-to-br from-mint-soft via-white/75 to-white/55 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] sm:p-6">
          {/* Decorative sparkles scattered around the image edge */}
          <span
            aria-hidden
            className="pointer-events-none absolute right-6 top-3 text-[10px] text-mint-strong/60"
          >
            ✦
          </span>
          <span
            aria-hidden
            className="pointer-events-none absolute right-32 top-10 text-[8px] text-mint-strong/40"
          >
            ✦
          </span>
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-4 right-10 text-[9px] text-mint-strong/50"
          >
            ✦
          </span>

          <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[1fr_140px] sm:gap-5">
            <div className="min-w-0">
              <div className="mb-1 flex items-center justify-between gap-3">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-mint-strong">
                  Ship Type
                </p>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-ink/45 sm:hidden">
                  Score
                </p>
              </div>

              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display text-[1.75rem] font-extrabold leading-[1.05] tracking-tight text-ink sm:text-[2rem]">
                    {shipType.name}
                  </h2>
                  <p className="mt-1 font-mono text-[12px] uppercase tracking-[0.18em] text-ink/55">
                    {shipType.nameEn}
                  </p>
                </div>
                <p className="flex shrink-0 items-baseline leading-none">
                  <span className="font-display text-[2.75rem] font-black tracking-tight text-ink">
                    {confidence}
                  </span>
                  <span className="ml-0.5 text-[10px] font-bold text-ink/45">
                    /100
                  </span>
                </p>
              </div>

              {/* Progress bar + qualitative band */}
              <div className="mt-3.5">
                <div
                  className="h-2 w-full overflow-hidden rounded-full bg-ink/[0.07]"
                  role="progressbar"
                  aria-valuenow={confidence}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full rounded-full bg-mint-strong"
                    style={{ width: `${Math.max(2, confidence)}%` }}
                  />
                </div>
                <p className="mt-2 flex items-center gap-1 text-[12px] font-medium text-ink/65">
                  <span aria-hidden className="text-mint-strong">
                    ✦
                  </span>
                  <span>{scoreBandLabel(confidence)}</span>
                </p>
              </div>
            </div>

            {/* Concept image — embedded inside the hero, no heavy border so
                it reads as part of the gradient surface rather than a chip
                pasted on top. */}
            {conceptImageUrl ? (
              <div className="mx-auto w-[78%] max-w-[180px] sm:mx-0 sm:w-auto sm:max-w-none">
                <div className="relative">
                  <ConceptImage
                    url={conceptImageUrl}
                    alt={shipType.name}
                    aspect="aspect-square"
                    embedded
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* AI summary + Verdict — paired 2-col cards. Hidden / amber treat
            for the non-shippable case. */}
        <div className="mb-2.5 grid gap-2.5 sm:grid-cols-2">
          {result.summary && result.summary.trim().length > 0 ? (
            <div className="rounded-2xl border border-mint-strong/20 bg-mint-soft/60 px-4 py-3">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0">
                  <SparkleIcon />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-[13px] font-bold text-mint-strong">
                    AI 한 줄 요약
                  </p>
                  <p className="text-sm leading-snug text-ink/85">
                    {result.summary.trim()}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            // Empty placeholder so the grid keeps its 2-col rhythm even when
            // the LLM didn't return a summary.
            <div />
          )}

          {shipType.canShipInWeek ? (
            <div className="rounded-2xl border border-mint-strong/20 bg-mint-soft/60 px-4 py-3">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-mint-strong text-white">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-[13px] font-bold text-mint-strong">
                    Can Ship in 1 Week
                  </p>
                  <p className="text-sm leading-snug text-ink/85">
                    {shipType.blurb || '1주 안에 출시 가능'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-400/30 bg-amber-100/60 px-4 py-3">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <line x1="12" x2="12" y1="9" y2="13" />
                    <line x1="12" x2="12.01" y1="17" y2="17" />
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-[13px] font-bold text-amber-700">
                    Not Yet Shippable
                  </p>
                  <p className="text-sm leading-snug text-ink/85">
                    {shipType.blurb || '조금 더 다듬어야 해요'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Measurable goal — prefer the LLM-refined version; fall back to
            the user's raw input so older rows without the refined column
            still render cleanly. */}
        {(() => {
          const refined = result.refinedSuccessMetric?.trim() ?? '';
          const raw = successCriteria?.trim() ?? '';
          const display = refined || raw;
          if (!display) return null;
          return (
            <div className="mb-2.5 rounded-2xl border border-mint-strong/20 bg-mint-soft/40 p-4">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0">
                  <IconTarget />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-[13px] font-bold text-mint-strong">
                    측정 가능한 성공 기준
                  </p>
                  <p className="text-sm leading-snug text-ink/85">
                    {display}
                  </p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* 3 metrics row — compact, with a mini progress bar under each
            value so the eye reads the score at a glance instead of having
            to parse "4/5" math. */}
        <div className="mb-2.5 grid grid-cols-3 gap-2 rounded-2xl border border-white/70 bg-white/60 p-3 sm:p-3.5">
          <Metric icon={<IconClarity />} label="명확성" value={scores.clarity} />
          <Metric icon={<IconScope />} label="MVP 범위" value={scores.mvpScope} />
          <Metric icon={<IconBolt />} label="실행 가능성" value={scores.feasibility} />
        </div>

        {/* Keep / Cut + Next Actions */}
        <div className="grid gap-2.5 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/70 bg-white/60 p-4">
            <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-bold text-mint-strong">
              <IconStar />
              <span>이번 주 MVP</span>
            </h3>
            <div className="space-y-2 text-xs">
              {mvpStrategy.keep.length > 0 ? (
                <div className="flex items-start gap-1.5">
                  <span className="mt-0.5 shrink-0 rounded bg-mint-soft px-1.5 py-0.5 text-[9px] font-bold text-mint-strong">
                    Keep
                  </span>
                  <span className="leading-snug text-ink/85">
                    {mvpStrategy.keep.join(' + ')}
                  </span>
                </div>
              ) : null}
              {mvpStrategy.keep.length > 0 && mvpStrategy.cut.length > 0 ? (
                <div className="border-t border-dashed border-ink/15" />
              ) : null}
              {mvpStrategy.cut.length > 0 ? (
                <div className="flex items-start gap-1.5">
                  <span className="mt-0.5 shrink-0 rounded bg-red-50 px-1.5 py-0.5 text-[9px] font-bold text-red-500">
                    Cut
                  </span>
                  <span className="leading-snug text-ink/55 line-through">
                    {mvpStrategy.cut.join(' · ')}
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-white/70 bg-white/60 p-4">
            <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-bold text-mint-strong">
              <IconFlag />
              <span>다음 행동 3가지</span>
            </h3>
            <ol className="space-y-1.5 text-xs">
              {nextActions.map((a, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-mint-strong text-[9px] font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="leading-snug text-ink/85">{a}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Brand strip — recommended for /r/[id] screenshots */}
        {showBrandStrip ? (
          <div className="mt-3 flex items-center justify-between border-t border-ink/10 pt-3">
            <p className="font-mono text-[10px] tracking-tight text-ink/55">
              <span className="text-mint-strong">/1&gt;</span> Ship Check
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink/40">
              idea2ship.xyz
            </p>
          </div>
        ) : null}
      </div>
    </motion.article>
  );
}

// Score band → semantic color. 1 = red, 2-3 = amber, 4-5 = mint (default).
// Tailwind classes are static strings so JIT can pick them up; computing class
// names via template literals at runtime would defeat purge.
function metricTone(value: number) {
  if (value <= 1) {
    return { icon: 'text-red-500', bar: 'bg-red-500', value: 'text-red-600' };
  }
  if (value <= 3) {
    return {
      icon: 'text-amber-500',
      bar: 'bg-amber-500',
      value: 'text-amber-600',
    };
  }
  return {
    icon: 'text-mint-strong',
    bar: 'bg-mint-strong',
    value: 'text-ink',
  };
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  const pct = Math.max(8, Math.min(100, (value / 5) * 100));
  const tone = metricTone(value);
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-xl bg-white/40 px-3 py-2.5">
      <div className="flex items-center gap-1.5">
        <div className={`shrink-0 ${tone.icon}`}>{icon}</div>
        <p className="truncate text-[11px] font-medium text-ink/60">{label}</p>
      </div>
      <div className="flex items-baseline gap-1">
        <span
          className={`text-xl font-bold leading-none sm:text-[1.4rem] ${tone.value}`}
        >
          {value}
        </span>
        <span className="text-[10px] font-medium text-ink/40">/5</span>
      </div>
      <div
        className="h-1 w-full overflow-hidden rounded-full bg-ink/[0.06]"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={5}
      >
        <div
          className={`h-full rounded-full ${tone.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function scoreBandLabel(score: number): string {
  if (score >= 80) return '이대로 출시 가능';
  if (score >= 60) return '조금만 다듬으면 출시 가능';
  if (score >= 40) return '한 번 더 구체화가 필요';
  return '아직 탐색 단계';
}

function SparkleIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="mt-0.5 shrink-0 text-mint-strong"
    >
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      <path d="M20 3v4" />
      <path d="M22 5h-4" />
    </svg>
  );
}

function IconClarity() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconScope() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function IconBolt() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function IconTarget() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-mint-strong" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function IconStar() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-mint-strong" aria-hidden>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function IconFlag() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-mint-strong" aria-hidden>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" x2="4" y1="22" y2="15" />
    </svg>
  );
}
