'use client';

import { useEffect, useState } from 'react';

type Props = {
  url: string;
  alt?: string;
  /** Tailwind aspect class. Defaults to square. */
  aspect?: string;
};

/**
 * Renders a Pollinations-generated concept image with a brand-tinted
 * placeholder while it loads, and a soft fallback if generation fails or
 * times out. The image is fetched directly by the browser — no server
 * proxy — so it doesn't burn our Vercel/OCI function quota.
 */
export function ConceptImage({ url, alt = 'Concept image', aspect = 'aspect-square' }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  // Pollinations sometimes queues requests during peak load. If the image
  // hasn't responded in 30s we show the fallback instead of hanging
  // forever.
  useEffect(() => {
    if (loaded || errored) return;
    const t = setTimeout(() => setTimedOut(true), 30_000);
    return () => clearTimeout(t);
  }, [loaded, errored]);

  const failed = errored || timedOut;

  return (
    <div
      className={`relative ${aspect} overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-br from-mint-soft via-cream to-mint-soft/40 shadow-soft`}
    >
      {!failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={alt}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          className={`h-full w-full object-cover transition-opacity duration-[700ms] ease-out ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ) : null}

      {!loaded && !failed ? (
        <div
          aria-hidden
          className="animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/55 to-transparent"
        />
      ) : null}

      {failed ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink/50">
            concept
          </p>
          <p className="text-xs text-ink/45">이미지를 불러오지 못했어요</p>
        </div>
      ) : null}
    </div>
  );
}
