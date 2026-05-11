import type { EvaluationResult } from '@/lib/types';

type CardProps = {
  label: string;
  children: React.ReactNode;
  highlight?: boolean;
  className?: string;
};

function Card({ label, children, highlight = false, className = '' }: CardProps) {
  return (
    <div
      className={`rounded-2xl border p-4 backdrop-blur-sm ${
        highlight
          ? 'border-mint-strong/30 bg-mint-soft/55'
          : 'border-white/60 bg-white/55'
      } ${className}`}
    >
      <p
        className={`mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] ${
          highlight ? 'text-mint-strong' : 'text-ink/55'
        }`}
      >
        {label}
      </p>
      {children}
    </div>
  );
}

function Score({ value }: { value: number }) {
  return (
    <span className="inline-flex items-baseline gap-1 font-mono">
      <span className="text-3xl font-semibold leading-none tracking-tight">
        {value}
      </span>
      <span className="text-sm text-ink/45">/5</span>
    </span>
  );
}

export function ResultCard({ result }: { result: EvaluationResult }) {
  return (
    <div className="space-y-3">
      <Card label="Summary">
        <p className="text-sm leading-relaxed text-ink">{result.summary}</p>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card label="Clarity">
          <div className="mb-1.5">
            <Score value={result.clarityReview.score} />
          </div>
          {result.clarityReview.comment ? (
            <p className="text-xs leading-relaxed text-ink/70">
              {result.clarityReview.comment}
            </p>
          ) : null}
        </Card>
        <Card label="MVP Scope">
          <div className="mb-1.5">
            <Score value={result.mvpScope.score} />
          </div>
          {result.mvpScope.comment ? (
            <p className="text-xs leading-relaxed text-ink/70">
              {result.mvpScope.comment}
            </p>
          ) : null}
        </Card>
      </div>

      {result.mvpScope.shouldCut.length > 0 ? (
        <Card label="줄여야 할 것">
          <div className="flex flex-wrap gap-1.5">
            {result.mvpScope.shouldCut.map((item, i) => (
              <span
                key={i}
                className="rounded-full bg-ink/[0.06] px-2.5 py-1 text-xs text-ink/80"
              >
                {item}
              </span>
            ))}
          </div>
        </Card>
      ) : null}

      <Card label="First Feature" highlight>
        <p className="text-base font-semibold text-ink">
          {result.firstFeature.title}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-ink/75">
          {result.firstFeature.description}
        </p>
      </Card>

      {result.improvedSuccessMetric ? (
        <Card label="Success Metric">
          <p className="text-sm leading-relaxed text-ink/85">
            {result.improvedSuccessMetric}
          </p>
        </Card>
      ) : null}

      {result.risks.length > 0 ? (
        <Card label="Risks">
          <ul className="space-y-1.5">
            {result.risks.map((r, i) => (
              <li key={i} className="flex gap-2 text-xs leading-relaxed text-ink/80">
                <span className="mt-0.5 text-ink/35">·</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {result.nextActions.length > 0 ? (
        <Card label="Next Actions" highlight>
          <ol className="space-y-2">
            {result.nextActions.map((a, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-sm leading-relaxed text-ink"
              >
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-mint-strong/20 font-mono text-[11px] font-semibold text-mint-strong">
                  {i + 1}
                </span>
                <span>{a}</span>
              </li>
            ))}
          </ol>
        </Card>
      ) : null}
    </div>
  );
}
