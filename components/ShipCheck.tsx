'use client';

import { useEffect, useRef, useState } from 'react';
import { IdeaForm } from './IdeaForm';
import { ParsedHero } from './ParsedHero';
import { ResultCard } from './ResultCard';
import { ShareSection, type SaveState } from './ShareSection';
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

export function ShipCheck() {
  const [idea, setIdea] = useState('');
  const [successCriteria, setSuccessCriteria] = useState('');

  const [parsedIdea, setParsedIdea] = useState<ParsedIdea | null>(null);
  const [parsing, setParsing] = useState(false);
  const parseAbortRef = useRef<AbortController | null>(null);

  const [loading, setLoading] = useState(false);
  const [evaluateError, setEvaluateError] = useState<string | null>(null);
  const [result, setResult] = useState<EvaluationResult | null>(null);

  const [allowContentUse, setAllowContentUse] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>({ kind: 'idle' });

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
    setLoading(true);
    setEvaluateError(null);
    setResult(null);
    setSaveState({ kind: 'idle' });

    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea, successCriteria, parsedIdea }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const code = typeof data?.error === 'string' ? data.error : 'UNKNOWN';
        setEvaluateError(ERROR_MESSAGES[code] ?? ERROR_MESSAGES.UNKNOWN);
        return;
      }
      setResult(data as EvaluationResult);
    } catch {
      setEvaluateError(ERROR_MESSAGES.NETWORK);
    } finally {
      setLoading(false);
    }
  }

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
    <>
      <div className="mx-auto w-full max-w-[1400px] px-6 pt-6 pb-12 sm:px-10 lg:px-12 lg:pt-12 lg:pb-20">
        <div className="flex flex-col gap-12 lg:flex-row lg:items-center lg:gap-20 xl:gap-24">
          <div className="lg:flex-1">
            <ParsedHero parsedIdea={parsedIdea} parsing={parsing} />
          </div>
          <div className="w-full lg:max-w-lg lg:flex-1">
            <IdeaForm
              idea={idea}
              successCriteria={successCriteria}
              loading={loading}
              errorMessage={evaluateError}
              onIdeaChange={setIdea}
              onSuccessChange={setSuccessCriteria}
              onSubmit={handleEvaluate}
            />
          </div>
        </div>
      </div>

      {result ? (
        <div className="mx-auto w-full max-w-2xl space-y-6 px-4 pb-16 sm:px-6">
          <h2 className="text-glow font-mono text-sm tracking-tight text-ink/85">
            <span className="text-mint-strong">/1&gt;</span> Result
          </h2>
          <ResultCard result={result} />
          <ShareSection
            getMarkdown={() => resultToMarkdown(idea, successCriteria, result)}
            allowContentUse={allowContentUse}
            saveState={saveState}
            onAllowContentUseChange={setAllowContentUse}
            onSave={handleSave}
          />
        </div>
      ) : null}
    </>
  );
}
