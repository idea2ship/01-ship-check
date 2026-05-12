'use client';

import { motion } from 'framer-motion';
import { eulReul } from '@/lib/validation';
import type { ParsedIdea } from '@/lib/types';

/**
 * Per-character idle jitter so the "실시간 분석 중" label feels like it's
 * actively listening. Each char gets its own duration/delay/amplitude
 * derived from its index — deterministic so the layout doesn't reflow,
 * but unsynced enough to read as live noise rather than a synced pulse.
 */
function JitterText({ text, active }: { text: string; active: boolean }) {
  const chars = Array.from(text);
  return (
    <span aria-label={text} className="inline-flex">
      {chars.map((c, idx) => {
        const dur = 1.6 + ((idx * 7) % 8) * 0.13;
        const delay = ((idx * 13) % 11) * 0.13;
        const amp = active
          ? 0.9 + ((idx * 5) % 6) * 0.22
          : 0.4 + ((idx * 5) % 6) * 0.1;
        return (
          <motion.span
            key={idx}
            aria-hidden
            className="inline-block whitespace-pre"
            animate={{
              y: [0, -amp, 0, amp * 0.55, 0],
            }}
            transition={{
              duration: dur,
              delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {c === ' ' ? ' ' : c}
          </motion.span>
        );
      })}
    </span>
  );
}

type Props = {
  parsedIdea: ParsedIdea | null;
  parsing: boolean;
};

function Chip({
  value,
  fallback,
}: {
  value: string | null | undefined;
  fallback: string;
}) {
  const text = value && value.length > 0 ? value : null;
  const display = text ?? fallback;
  const filled = text !== null;
  return (
    <span
      key={display}
      className={`animate-type-in inline-block min-w-0 max-w-full shrink truncate px-1.5 leading-snug transition-colors ${
        filled
          ? 'bg-mint-soft text-ink'
          : 'bg-ink/[0.08] text-ink/55'
      }`}
      title={display}
    >
      {display}
    </span>
  );
}

function Suffix({ children }: { children: React.ReactNode }) {
  return <span className="shrink-0 text-ink/85">{children}</span>;
}

export function ParsedHero({ parsedIdea, parsing }: Props) {
  const ending = parsedIdea?.isComplete ? '해결합니다.' : '해결할까요?';
  const problemText = parsedIdea?.problem ?? '어떤 문제';
  const problemParticle = eulReul(problemText);

  return (
    <section className="text-glow">
      <div className="mb-8 flex items-center gap-2 lg:mb-12">
        <span className="text-[12px] font-semibold tracking-[0.04em] text-mint-strong">
          <JitterText text="실시간 분석 중" active={parsing} />
        </span>
        <span
          className={`h-1.5 w-1.5 rounded-full bg-mint-strong ${parsing ? 'animate-pulse' : ''}`}
        />
      </div>

      <div className="space-y-5 font-display text-3xl font-extrabold leading-[1.3] tracking-tight sm:text-4xl lg:space-y-6 lg:text-5xl">
        <div className="slot-row flex animate-row-rise items-baseline">
          <Chip value={parsedIdea?.actor} fallback="누가" />
        </div>
        <div className="slot-row flex animate-row-rise items-baseline gap-2 [animation-delay:60ms]">
          <Chip value={parsedIdea?.situation} fallback="어떤 상황에서" />
          <Suffix>겪는</Suffix>
        </div>
        <div className="slot-row flex animate-row-rise items-baseline [animation-delay:120ms]">
          <Chip value={parsedIdea?.problem} fallback="어떤 문제" />
          <Suffix>
            <span key={problemParticle} className="animate-fade-in">
              {problemParticle}
            </span>
          </Suffix>
        </div>
        <div className="slot-row flex animate-row-rise items-baseline gap-2 [animation-delay:180ms]">
          <Chip value={parsedIdea?.solution} fallback="어떻게" />
          <Suffix>{ending}</Suffix>
        </div>
      </div>

      <p className="mt-10 max-w-md text-base font-medium leading-relaxed text-ink/85 sm:text-lg lg:mt-12">
        아이디어를 입력하면 AI가 즉시 핵심 가설을 추출하고
        <br className="hidden sm:inline" />
        실현 가능성을 진단합니다.
      </p>
    </section>
  );
}
