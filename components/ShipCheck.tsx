'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ConceptImage } from './ConceptImage';
import { IdeaForm } from './IdeaForm';
import { ParsedHero } from './ParsedHero';
import { ResultCard } from './ResultCard';
import { ResultSkeleton } from './ResultSkeleton';
import { ShareSection, type SaveState } from './ShareSection';
import { buildConceptImageUrl, seedFor } from '@/lib/image';
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

// Spring drives the FLIP transition when the form moves between columns.
const layoutSpring = {
  type: 'spring' as const,
  stiffness: 220,
  damping: 28,
  mass: 0.9,
};

// Plain easing for fade/slide entries and exits.
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

  const [allowContentUse, setAllowContentUse] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>({ kind: 'idle' });
  const [savedId, setSavedId] = useState<string | null>(null);

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
    setSaveState({ kind: 'idle' });
    setSavedId(null);

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
      setResult(data as EvaluationResult);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setEvaluateError(ERROR_MESSAGES.NETWORK);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  function handleResetToIdle() {
    evaluateAbortRef.current?.abort();
    setLoading(false);
    setResult(null);
    setEvaluateError(null);
    setSaveState({ kind: 'idle' });
    setSavedId(null);
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

  async function handleSave() {
    if (!result) return;
    setSaveState({ kind: 'saving' });
    try {
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idea,
          successCriteria,
          result,
          allowAnonymousStorage: true,
          allowContentUse,
          conceptImageUrl,
          conceptImagePrompt: result.imagePrompt,
        }),
      });
      if (!res.ok) {
        setSaveState({
          kind: 'error',
          message:
            '저장 중 문제가 발생했습니다. 평가 결과는 복사해서 보관할 수 있습니다.',
        });
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { id?: string };
      if (data.id) setSavedId(data.id);
      setSaveState({ kind: 'saved' });
    } catch {
      setSaveState({
        kind: 'error',
        message:
          '저장 중 문제가 발생했습니다. 평가 결과는 복사해서 보관할 수 있습니다.',
      });
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-6 pt-6 pb-12 sm:px-10 lg:px-12 lg:pt-12 lg:pb-20">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-start lg:gap-16 xl:gap-20">
        {/* Hero — popLayout mode lets the exiting hero be absolutely positioned
            so the form can begin its FLIP move into the left column immediately
            instead of waiting for the exit to finish. */}
        <AnimatePresence mode="popLayout">
          {view === 'idle' ? (
            <motion.div
              key="hero"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -32 }}
              transition={fadeEase}
              className="lg:order-1 lg:self-center"
            >
              <ParsedHero parsedIdea={parsedIdea} parsing={parsing} />
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Form — same DOM node throughout; framer's `layout` prop FLIP-animates
            the position change when the order class flips between states. */}
        <motion.div
          layout
          transition={layoutSpring}
          className={`w-full ${
            view === 'idle'
              ? 'lg:order-2 lg:max-w-lg lg:justify-self-end'
              : 'lg:order-1 lg:max-w-lg'
          }`}
        >
          <AnimatePresence>
            {view !== 'idle' ? (
              <motion.button
                key="back"
                type="button"
                onClick={handleResetToIdle}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                className="text-glow mb-3 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-ink/65 transition-colors hover:text-ink"
              >
                <span aria-hidden>←</span>
                <span>back to hero</span>
                <kbd className="rounded border border-ink/20 bg-white/45 px-1.5 py-0.5 text-[9px] font-medium tracking-normal text-ink/70">
                  ESC
                </kbd>
              </motion.button>
            ) : null}
          </AnimatePresence>
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

        {/* Right side — wait mode keeps skeleton↔result transitions sequential
            so they don't visually overlap in the same column. */}
        <AnimatePresence mode="wait">
          {view === 'loading' ? (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={fadeEase}
              className="lg:order-2"
            >
              <ResultSkeleton />
            </motion.div>
          ) : null}
          {view === 'result' && result ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={fadeEase}
              className="lg:order-2 space-y-4"
            >
              {conceptImageUrl ? (
                <ConceptImage
                  url={conceptImageUrl}
                  alt={result.firstFeature.title || result.summary}
                />
              ) : null}
              <ResultCard result={result} />
              <ShareSection
                getMarkdown={() => resultToMarkdown(idea, successCriteria, result)}
                allowContentUse={allowContentUse}
                saveState={saveState}
                savedId={savedId}
                onAllowContentUseChange={setAllowContentUse}
                onSave={handleSave}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
