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
        {/* Concept image — capped at ~176px tall so the share buttons below
            the card stay within the fold on a typical laptop viewport. */}
        {conceptImageUrl ? (
          <div className="mb-3">
            <ConceptImage
              url={conceptImageUrl}
              alt={shipType.name}
              aspect="aspect-[16/9] max-h-44"
            />
          </div>
        ) : null}

        {/* Ship type — promoted to the card's visual anchor. Confidence is
            demoted to a small chip in the corner so the type name dominates. */}
        <div className="relative mb-2.5 overflow-hidden rounded-2xl border border-mint-strong/25 bg-gradient-to-br from-mint-soft via-white/70 to-white/55 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
          <p className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-mint-strong">
            Ship Type
          </p>
          <h2 className="text-3xl font-black leading-[1.05] tracking-tight text-ink sm:text-[2.25rem]">
            {shipType.name}
          </h2>
          <p className="mt-1 font-mono text-xs uppercase tracking-[0.16em] text-ink/55">
            {shipType.nameEn}
          </p>

          <div className="absolute right-4 top-4 flex items-baseline gap-0.5 rounded-full border border-ink/10 bg-white/75 px-2.5 py-1 shadow-sm backdrop-blur-sm">
            <span className="text-base font-black leading-none tracking-tight text-ink">
              {confidence}
            </span>
            <span className="text-[10px] font-bold text-ink/55">/100</span>
          </div>
          <p className="absolute right-4 top-12 text-[9px] uppercase tracking-wider text-ink/45">
            신뢰도
          </p>
        </div>

        {/* Can Ship banner / fallback comment */}
        {shipType.canShipInWeek ? (
          <div className="mb-2.5 flex items-center gap-2.5 rounded-xl bg-mint-soft px-3 py-2">
            <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-mint-strong text-white">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            <p className="text-xs leading-snug">
              <span className="font-bold text-mint-strong">Can Ship in 1 Week</span>
              {shipType.blurb ? (
                <span className="ml-1.5 text-ink/80">{shipType.blurb}</span>
              ) : null}
            </p>
          </div>
        ) : shipType.blurb ? (
          <div className="mb-2.5 rounded-xl bg-ink/[0.04] px-3 py-2 text-xs leading-snug text-ink/80">
            {shipType.blurb}
          </div>
        ) : null}

        {/* User's success criteria, framed as the measurable goal that
            grounds the rest of the analysis. */}
        {successCriteria && successCriteria.trim().length > 0 ? (
          <div className="mb-2.5 rounded-2xl border border-white/70 bg-white/60 p-4">
            <div className="mb-1.5 flex items-center gap-1.5">
              <IconTarget />
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-ink/65">
                측정 가능한 성공 기준
              </p>
            </div>
            <p className="text-sm leading-snug text-ink/85">
              {successCriteria.trim()}
            </p>
          </div>
        ) : null}

        {/* 3 metrics row */}
        <div className="mb-2.5 grid grid-cols-3 divide-x divide-ink/10 rounded-2xl border border-white/70 bg-white/60 p-3">
          <Metric icon={<IconClarity />} label="명확성" value={scores.clarity} />
          <Metric icon={<IconScope />} label="MVP 범위" value={scores.mvpScope} />
          <Metric icon={<IconBolt />} label="실행 가능성" value={scores.feasibility} />
        </div>

        {/* Keep / Cut + Next Actions */}
        <div className="grid gap-2.5 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/70 bg-white/60 p-4">
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-ink">
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
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-ink">
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

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-2">
      <div className="mb-0.5 text-mint-strong">{icon}</div>
      <p className="mb-0.5 text-[10px] font-medium text-ink/55">{label}</p>
      <p className="text-base font-bold text-ink sm:text-lg">
        {value}
        <span className="ml-0.5 text-[10px] font-medium text-ink/40">/5</span>
      </p>
    </div>
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
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-mint-strong" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function IconStar() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-mint-strong" aria-hidden>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function IconFlag() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-mint-strong" aria-hidden>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" x2="4" y1="22" y2="15" />
    </svg>
  );
}
