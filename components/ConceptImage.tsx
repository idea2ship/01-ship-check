'use client';

import { useEffect, useState } from 'react';

type Props = {
  url: string;
  alt?: string;
  /** Tailwind aspect class. Defaults to 16/9 (less tall than the older 4/3). */
  aspect?: string;
};

/**
 * Renders a Pollinations-generated concept image with a brand-tinted
 * placeholder while it loads. Pollinations free anonymous tier can be slow
 * (queue + cold gen of 15-45s) or rate-limited (429 with maxAllowed: 1 per
 * IP), so we keep a generous timeout, show a soft hint while waiting, and
 * offer a retry on failure.
 */
export function ConceptImage({
  url,
  alt = 'Concept image',
  aspect = 'aspect-[16/9]',
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [slowHint, setSlowHint] = useState(false);
  /** Bumping nonce changes <img src> and forces re-fetch. */
  const [nonce, setNonce] = useState(0);

  // Show a hint after 8s so the user knows we're not stuck.
  useEffect(() => {
    if (loaded || errored || timedOut) return;
    const t = setTimeout(() => setSlowHint(true), 8_000);
    return () => clearTimeout(t);
  }, [loaded, errored, timedOut, nonce]);

  // Hard timeout at 60s.
  useEffect(() => {
    if (loaded || errored) return;
    const t = setTimeout(() => setTimedOut(true), 60_000);
    return () => clearTimeout(t);
  }, [loaded, errored, nonce]);

  const failed = errored || timedOut;
  const srcWithNonce = nonce > 0 ? `${url}${url.includes('?') ? '&' : '?'}retry=${nonce}` : url;

  function handleRetry() {
    setLoaded(false);
    setErrored(false);
    setTimedOut(false);
    setSlowHint(false);
    setNonce((n) => n + 1);
  }

  return (
    <div
      className={`relative ${aspect} overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-br from-mint-soft via-cream to-mint-soft/40`}
    >
      {!failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={nonce}
          src={srcWithNonce}
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

      {!loaded && !failed && slowHint ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink/55">
            generating
          </p>
          <p className="text-xs text-ink/55">컨셉 이미지를 그리는 중…</p>
        </div>
      ) : null}

      {failed ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink/55">
            concept
          </p>
          <p className="text-xs text-ink/55">
            이미지 생성이 지연되고 있어요 (Pollinations free tier).
          </p>
          <button
            type="button"
            onClick={handleRetry}
            className="mt-1 rounded-full border border-ink/15 bg-white/80 px-3 py-1 text-[11px] font-medium text-ink/75 transition hover:border-ink/30 hover:bg-white"
          >
            다시 시도
          </button>
        </div>
      ) : null}
    </div>
  );
}
