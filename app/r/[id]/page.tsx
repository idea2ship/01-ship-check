import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { ResultCard } from '@/components/ResultCard';
import { CopyButton } from '@/components/CopyButton';
import { resultToMarkdown } from '@/lib/markdown';
import { getSavedIdea } from '@/lib/supabase';

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const saved = await getSavedIdea(id);
  if (!saved) {
    return { title: 'Result not found — /1> Ship Check' };
  }

  const ogTitle = `${saved.result.shipType.name} · ${saved.result.shipType.nameEn}`;
  const description = saved.result.summary;

  return {
    title: `${ogTitle} — /1> Ship Check`,
    description,
    openGraph: {
      title: ogTitle,
      description,
      siteName: 'idea2ship',
      type: 'article',
      images: saved.conceptImageUrl
        ? [
            {
              url: saved.conceptImageUrl,
              width: 1024,
              height: 1024,
              alt: saved.result.shipType.name,
            },
          ]
        : undefined,
    },
    twitter: {
      card: saved.conceptImageUrl ? 'summary_large_image' : 'summary',
      title: ogTitle,
      description,
      images: saved.conceptImageUrl ? [saved.conceptImageUrl] : undefined,
    },
  };
}

export default async function SharedResultPage({ params }: PageProps) {
  const { id } = await params;
  const saved = await getSavedIdea(id);
  if (!saved) notFound();

  const markdown = resultToMarkdown(
    saved.ideaText,
    saved.successCriteria,
    saved.result,
  );
  const createdAt = new Date(saved.createdAt).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <main className="relative flex min-h-screen flex-col">
      <Header />
      <div className="mx-auto w-full max-w-2xl px-6 py-10 sm:px-10 lg:py-14">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-glow font-mono text-xs tracking-tight text-ink/85">
            <span className="text-mint-strong">/1&gt;</span> Shared Result
          </p>
          <p className="text-glow font-mono text-[10px] uppercase tracking-[0.18em] text-ink/55">
            {createdAt}
          </p>
        </div>

        {/* Idea + Success Metric context (above the result card) */}
        <section className="mb-5 rounded-2xl border border-white/60 bg-white/65 p-5 backdrop-blur-sm">
          <p className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/55">
            Idea
          </p>
          <p className="text-sm leading-relaxed text-ink">{saved.ideaText}</p>

          <p className="mt-4 mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/55">
            Success Metric
          </p>
          <p className="text-sm leading-relaxed text-ink">
            {saved.successCriteria}
          </p>
        </section>

        <ResultCard
          result={saved.result}
          conceptImageUrl={saved.conceptImageUrl}
          showBrandStrip
        />

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border-soft pt-6">
          <div className="flex flex-wrap gap-2">
            <CopyButton getText={() => markdown} label="Copy result" />
            <CopyButton
              getText={() =>
                typeof window !== 'undefined' ? window.location.href : ''
              }
              label="Copy link"
              copiedLabel="Link copied"
            />
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-2xl bg-ink px-5 py-2.5 text-sm font-medium text-cream transition hover:bg-ink/90"
          >
            <span>Make your own</span>
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
