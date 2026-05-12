'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { IdeaForm } from './IdeaForm';
import { ParsedHero } from './ParsedHero';
import { ResultCard } from './ResultCard';
import { ResultSkeleton } from './ResultSkeleton';
import {
  ShareSection,
  type ShareState,
  type LocalSaveState,
} from './ShareSection';
import { buildConceptImageUrl, seedFor } from '@/lib/image';
import { copyToClipboard } from '@/lib/clipboard';
import { resultToMarkdown } from '@/lib/markdown';
import type { EvaluationResult, ParsedIdea } from '@/lib/types';
import { IDEA_MIN, PARSE_MIN, SUCCESS_MIN } from '@/lib/validation';

const ERROR_MESSAGES: Record<string, string> = {
  MISSING: '아이디어와 성공 기준을 모두 적어주세요.',
  TOO_SHORT: '아이디어를 조금 더 구체적으로 적어주세요.',
  TOO_LONG: '입력이 너무 깁니다. 분량을 줄여주세요.',
  PARSE_FAILED: '평가 결과를 만드는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
  LLM_FAILED: '평가 서비스에 일시적인 문제가 있습니다. 잠시 후 다시 시도해주세요.',
  CONFIG: '평가 서비스 설정에 문제가 있습니다. 관리자에게 알려주세요.',
  INVALID_JSON: '요청 형식이 올바르지 않습니다.',
  UNKNOWN: '평가 결과를 만드는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
  NETWORK: '네트워크 오류가 발생했습니다. 연결 상태를 확인해주세요.',
};

const PARSE_DEBOUNCE_MS = 900;

type View = 'idle' | 'loading' | 'result';

/**
 * Resolves once the image at `url` has loaded (or errored / timed out).
 * Honours an AbortSignal so an in-flight wait can be cancelled when the
 * user hits ESC or starts a new evaluation.
 */
function waitForImage(
  url: string,
  signal: AbortSignal,
  timeoutMs: number,
): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  return new Promise<void>((resolve) => {
    if (signal.aborted) return resolve();
    const img = new window.Image();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      img.onload = null;
      img.onerror = null;
      signal.removeEventListener('abort', finish);
      clearTimeout(timer);
      resolve();
    };
    img.onload = finish;
    img.onerror = finish;
    signal.addEventListener('abort', finish);
    const timer = setTimeout(finish, timeoutMs);
    img.src = url;
  });
}

// Easing for the right-column swap between form → skeleton → result.
const fadeEase = {
  duration: 0.42,
  ease: [0.4, 0, 0.2, 1] as const,
};

export function ShipCheck() {
  const [idea, setIdea] = useState('');
  const [successCriteria, setSuccessCriteria] = useState('');

  const [parsedIdea, setParsedIdea] = useState<ParsedIdea | null>(null);
  const [parsing, setParsing] = useState(false);
  const parseAbortRef = useRef<AbortController | null>(null);

  const [loading, setLoading] = useState(false);
  const [evaluateError, setEvaluateError] = useState<string | null>(null);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const evaluateAbortRef = useRef<AbortController | null>(null);

  const [shareState, setShareState] = useState<ShareState>({ kind: 'idle' });
  const [savedId, setSavedId] = useState<string | null>(null);
  const [localSaveState, setLocalSaveState] = useState<LocalSaveState>({
    kind: 'idle',
  });
  const saveAbortRef = useRef<AbortController | null>(null);

  const view: View = loading ? 'loading' : result ? 'result' : 'idle';

  // Concept image URL is derived deterministically: same idea → same image.
  // Pollinations serves directly to <img>, no server proxy.
  const conceptImageUrl = useMemo(() => {
    if (!result || !result.imagePrompt) return null;
    return buildConceptImageUrl(
      result.imagePrompt,
      seedFor(idea, successCriteria),
    );
  }, [result, idea, successCriteria]);


  useEffect(() => {
    const trimmed = idea.trim();
    if (trimmed.length < PARSE_MIN) {
      setParsedIdea(null);
      setParsing(false);
      parseAbortRef.current?.abort();
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      parseAbortRef.current?.abort();
      parseAbortRef.current = controller;
      setParsing(true);
      try {
        const res = await fetch('/api/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idea: trimmed }),
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as ParsedIdea;
        if (!controller.signal.aborted) setParsedIdea(data);
      } catch {
        /* ignore network/abort */
      } finally {
        if (!controller.signal.aborted) setParsing(false);
      }
    }, PARSE_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [idea]);

  async function handleEvaluate() {
    if (idea.trim().length < IDEA_MIN || successCriteria.trim().length < SUCCESS_MIN) {
      setEvaluateError(ERROR_MESSAGES.TOO_SHORT);
      return;
    }
    evaluateAbortRef.current?.abort();
    const controller = new AbortController();
    evaluateAbortRef.current = controller;

    setLoading(true);
    setEvaluateError(null);
    setResult(null);
    setShareState({ kind: 'idle' });
    setSavedId(null);
    setLocalSaveState({ kind: 'idle' });
    saveAbortRef.current?.abort();

    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea, successCriteria, parsedIdea }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (controller.signal.aborted) return;
      if (!res.ok) {
        const code = typeof data?.error === 'string' ? data.error : 'UNKNOWN';
        setEvaluateError(ERROR_MESSAGES[code] ?? ERROR_MESSAGES.UNKNOWN);
        return;
      }

      // Preload the concept image so the result card doesn't appear with a
      // half-empty image slot that keeps animating after everything else has
      // settled. We cap the wait so a slow CF generation doesn't trap the
      // user in the loading state forever.
      const evalResult = data as EvaluationResult;
      if (evalResult?.imagePrompt) {
        const imgUrl = buildConceptImageUrl(
          evalResult.imagePrompt,
          seedFor(idea, successCriteria),
        );
        await waitForImage(imgUrl, controller.signal, 28_000);
        if (controller.signal.aborted) return;
      }

      setResult(evalResult);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setEvaluateError(ERROR_MESSAGES.NETWORK);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  function handleResetToIdle() {
    evaluateAbortRef.current?.abort();
    saveAbortRef.current?.abort();
    setLoading(false);
    setResult(null);
    setEvaluateError(null);
    setShareState({ kind: 'idle' });
    setSavedId(null);
    setLocalSaveState({ kind: 'idle' });
  }

  // ESC anywhere on the page returns to the hero view (and cancels an
  // in-flight evaluation if loading). Skipped while an IME is composing
  // because ESC is also the "cancel composition" key.
  useEffect(() => {
    if (view === 'idle') return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing) return;
      if (e.key !== 'Escape') return;
      e.preventDefault();
      handleResetToIdle();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // handleResetToIdle is defined inline in this component; it only reads
    // refs and setters, both of which are stable, so view is the only dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // User-driven share: POST /api/save, get id, build URL, auto-copy.
  // If we already saved once (savedId set), skip the network round-trip and
  // re-copy the same URL.
  async function handleShare() {
    if (!result) return;
    if (shareState.kind === 'sharing') return;

    let id = savedId;

    if (!id) {
      const controller = new AbortController();
      saveAbortRef.current?.abort();
      saveAbortRef.current = controller;
      setShareState({ kind: 'sharing' });

      try {
        const res = await fetch('/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idea,
            successCriteria,
            result,
            allowAnonymousStorage: true,
            allowContentUse: false,
            conceptImageUrl,
            conceptImagePrompt: result.imagePrompt,
          }),
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (!res.ok) {
          setShareState({ kind: 'error' });
          return;
        }
        const data = (await res.json().catch(() => ({}))) as { id?: string };
        if (!data.id) {
          setShareState({ kind: 'error' });
          return;
        }
        id = data.id;
        setSavedId(id);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setShareState({ kind: 'error' });
        return;
      }
    }

    const url = `${window.location.origin}/r/${id}`;
    // Use the shared helper so the fallback path is identical to the other
    // copy actions on the page. Save succeeded either way; clipboard
    // failure just means the user has to copy by hand.
    await copyToClipboard(url);
    setShareState({ kind: 'copied', url });
  }

  // Contributor opt-in: save to server with allow_content_use=true. If the
  // row already exists (share was clicked first), PATCH consent instead of
  // creating a duplicate.
  async function handleContribute() {
    if (!result) return;
    if (localSaveState.kind === 'saving') return;
    setLocalSaveState({ kind: 'saving' });

    try {
      if (savedId) {
        const res = await fetch('/api/save/consent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: savedId, allowContentUse: true }),
        });
        if (!res.ok) {
          setLocalSaveState({ kind: 'error' });
          return;
        }
        setLocalSaveState({ kind: 'saved' });
        return;
      }

      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idea,
          successCriteria,
          result,
          allowAnonymousStorage: true,
          allowContentUse: true,
          conceptImageUrl,
          conceptImagePrompt: result.imagePrompt,
        }),
      });
      if (!res.ok) {
        setLocalSaveState({ kind: 'error' });
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { id?: string };
      if (data.id) setSavedId(data.id);
      setLocalSaveState({ kind: 'saved' });
    } catch {
      setLocalSaveState({ kind: 'error' });
    }
  }

  return (
    <div
      className={`mx-auto w-full max-w-[1400px] px-6 pb-12 sm:px-10 lg:px-12 lg:pb-20 ${
        view === 'idle' ? 'pt-6 lg:pt-10' : 'pt-0 lg:pt-0'
      }`}
    >
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-start lg:gap-16 xl:gap-20">
        {/* Left column — ParsedHero stays mounted across all states so the
            parsed sentence is always visible alongside the form/result. */}
        <div className="lg:order-1 lg:self-start lg:sticky lg:top-4">
          <ParsedHero parsedIdea={parsedIdea} parsing={parsing} />
        </div>

        {/* Right column — animates between form → skeleton → result.
            `wait` keeps transitions sequential so they don't visually overlap. */}
        <div className="lg:order-2 lg:max-w-xl">
          <AnimatePresence mode="wait">
            {view === 'idle' ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={fadeEase}
              >
                <IdeaForm
                  idea={idea}
                  successCriteria={successCriteria}
                  loading={loading}
                  errorMessage={evaluateError}
                  onIdeaChange={setIdea}
                  onSuccessChange={setSuccessCriteria}
                  onSubmit={handleEvaluate}
                />
              </motion.div>
            ) : null}

            {view === 'loading' ? (
              <motion.div
                key="skeleton"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={fadeEase}
              >
                <BackButton onClick={handleResetToIdle} />
                <ResultSkeleton />
              </motion.div>
            ) : null}

            {view === 'result' && result ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={fadeEase}
                className="space-y-3"
              >
                <BackButton onClick={handleResetToIdle} />
                <ResultCard
                  key={result.summary + result.confidence}
                  result={result}
                  successCriteria={successCriteria}
                  conceptImageUrl={conceptImageUrl}
                />
                <ShareSection
                  getMarkdown={() => resultToMarkdown(idea, successCriteria, result)}
                  shareState={shareState}
                  contributeState={localSaveState}
                  onShare={handleShare}
                  onContribute={handleContribute}
                  onResetShare={() => setShareState({ kind: 'idle' })}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-glow mb-1 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-ink/65 transition-colors hover:text-ink"
    >
      <span aria-hidden>←</span>
      <span>back</span>
      <kbd className="rounded border border-ink/20 bg-white/45 px-1.5 py-0.5 text-[9px] font-medium tracking-normal text-ink/70">
        ESC
      </kbd>
    </button>
  );
}
