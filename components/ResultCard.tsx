import type { EvaluationResult } from '@/lib/types';

function ScoreBadge({ label, score }: { label: string; score: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-mint-soft px-3 py-1 font-mono text-xs text-ink">
      {label} {score}/5
    </span>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border-soft px-5 py-5 first:border-t-0 sm:px-6">
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
        {title}
      </h3>
      <div className="text-sm leading-relaxed text-ink">{children}</div>
    </section>
  );
}

export function ResultCard({ result }: { result: EvaluationResult }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-border-soft bg-white shadow-soft">
      <Section title="Idea Summary">
        <p>{result.summary}</p>
      </Section>

      <Section title="Clarity Review">
        <div className="mb-2">
          <ScoreBadge label="Clarity" score={result.clarityReview.score} />
        </div>
        {result.clarityReview.comment ? (
          <p>{result.clarityReview.comment}</p>
        ) : null}
      </Section>

      <Section title="MVP Scope">
        <div className="mb-2">
          <ScoreBadge label="MVP Scope" score={result.mvpScope.score} />
        </div>
        {result.mvpScope.comment ? (
          <p className="mb-3">{result.mvpScope.comment}</p>
        ) : null}
        {result.mvpScope.shouldCut.length > 0 ? (
          <div>
            <p className="mb-1 text-xs font-medium text-muted">줄여야 할 것</p>
            <ul className="list-disc space-y-1 pl-5">
              {result.mvpScope.shouldCut.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </Section>

      <Section title="First Feature">
        <p className="mb-1 font-medium">{result.firstFeature.title}</p>
        <p className="text-muted">{result.firstFeature.description}</p>
      </Section>

      <Section title="Success Metric">
        <p>{result.improvedSuccessMetric}</p>
      </Section>

      {result.risks.length > 0 ? (
        <Section title="Risk / Caution">
          <ul className="list-disc space-y-1 pl-5">
            {result.risks.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </Section>
      ) : null}

      {result.nextActions.length > 0 ? (
        <Section title="Next Action">
          <ol className="list-decimal space-y-1 pl-5">
            {result.nextActions.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ol>
        </Section>
      ) : null}
    </article>
  );
}
