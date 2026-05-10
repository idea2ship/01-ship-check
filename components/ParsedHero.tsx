'use client';

import type { ParsedIdea } from '@/lib/types';

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
  const display = value && value.length > 0 ? value : fallback;
  return (
    <span
      key={display}
      className="animate-fade-in inline-block bg-mint-soft px-1.5 leading-snug"
    >
      {display}
    </span>
  );
}

export function ParsedHero({ parsedIdea, parsing }: Props) {
  const ending = parsedIdea?.isComplete ? '해결합니다.' : '해결할까요?';

  return (
    <section className="text-glow">
      <div className="mb-8 flex items-center gap-2 lg:mb-12">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-mint-strong">
          Live Analysis
        </span>
        <span
          className={`h-1.5 w-1.5 rounded-full bg-mint-strong ${parsing ? 'animate-pulse' : ''}`}
        />
      </div>

      <div className="space-y-5 text-3xl font-black leading-[1.3] tracking-tight sm:text-4xl lg:space-y-6 lg:text-5xl xl:text-6xl">
        <div className="slot-row">
          <Chip value={parsedIdea?.actor} fallback="누가" />
        </div>
        <div className="slot-row">
          <Chip value={parsedIdea?.situation} fallback="어떤 상황에서" />{' '}
          <span>겪는</span>
        </div>
        <div className="slot-row">
          <Chip value={parsedIdea?.problem} fallback="어떤 문제" />
          <span>를</span>
        </div>
        <div className="slot-row is-last">
          <Chip value={parsedIdea?.solution} fallback="어떻게" />{' '}
          <span>{ending}</span>
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
