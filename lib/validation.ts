import type { EvaluationResult, ParsedField, ParsedIdea } from './types';

export const IDEA_MIN = 20;
export const IDEA_MAX = 1000;
export const SUCCESS_MIN = 10;
export const SUCCESS_MAX = 500;
export const PARSE_MIN = 15;

export type ValidationError =
  | { kind: 'MISSING'; field: 'idea' | 'successCriteria' }
  | { kind: 'TOO_SHORT'; field: 'idea' | 'successCriteria'; min: number }
  | { kind: 'TOO_LONG'; field: 'idea' | 'successCriteria'; max: number };

export function validateInput(
  idea: unknown,
  successCriteria: unknown,
): ValidationError | null {
  if (typeof idea !== 'string' || idea.trim().length === 0) {
    return { kind: 'MISSING', field: 'idea' };
  }
  if (typeof successCriteria !== 'string' || successCriteria.trim().length === 0) {
    return { kind: 'MISSING', field: 'successCriteria' };
  }
  const ideaLen = idea.trim().length;
  const successLen = successCriteria.trim().length;

  if (ideaLen < IDEA_MIN) {
    return { kind: 'TOO_SHORT', field: 'idea', min: IDEA_MIN };
  }
  if (ideaLen > IDEA_MAX) {
    return { kind: 'TOO_LONG', field: 'idea', max: IDEA_MAX };
  }
  if (successLen < SUCCESS_MIN) {
    return { kind: 'TOO_SHORT', field: 'successCriteria', min: SUCCESS_MIN };
  }
  if (successLen > SUCCESS_MAX) {
    return { kind: 'TOO_LONG', field: 'successCriteria', max: SUCCESS_MAX };
  }
  return null;
}

function clampScore(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(5, Math.round(n)));
}

const EVAL_LIMITS = {
  summary: 100,
  comment: 80,
  title: 18,
  description: 80,
  metric: 90,
  risk: 36,
  action: 32,
  shouldCut: 20,
  shouldCutMax: 3,
  riskMax: 3,
  actionMax: 3,
  imagePrompt: 240,
};

function trunc(value: string, max: number): string {
  const t = value.trim();
  if (t.length <= max) return t;
  return t.slice(0, max).trimEnd() + '…';
}

function asStringArray(
  value: unknown,
  itemMax?: number,
  countMax?: number,
): string[] {
  if (!Array.isArray(value)) return [];
  let arr = value.filter(
    (v): v is string => typeof v === 'string' && v.trim().length > 0,
  );
  if (itemMax) arr = arr.map((v) => trunc(v, itemMax));
  if (countMax) arr = arr.slice(0, countMax);
  return arr;
}

export function normalizeEvaluation(raw: unknown): EvaluationResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  const summary = typeof r.summary === 'string' ? r.summary.trim() : '';
  if (!summary) return null;

  const clarity = (r.clarityReview ?? {}) as Record<string, unknown>;
  const mvp = (r.mvpScope ?? {}) as Record<string, unknown>;
  const first = (r.firstFeature ?? {}) as Record<string, unknown>;

  const firstTitle = typeof first.title === 'string' ? first.title.trim() : '';
  const firstDesc = typeof first.description === 'string' ? first.description.trim() : '';
  if (!firstTitle || !firstDesc) return null;

  return {
    summary: trunc(summary, EVAL_LIMITS.summary),
    clarityReview: {
      score: clampScore(clarity.score),
      comment:
        typeof clarity.comment === 'string'
          ? trunc(clarity.comment, EVAL_LIMITS.comment)
          : '',
    },
    mvpScope: {
      score: clampScore(mvp.score),
      comment:
        typeof mvp.comment === 'string'
          ? trunc(mvp.comment, EVAL_LIMITS.comment)
          : '',
      shouldCut: asStringArray(
        mvp.shouldCut,
        EVAL_LIMITS.shouldCut,
        EVAL_LIMITS.shouldCutMax,
      ),
    },
    firstFeature: {
      title: trunc(firstTitle, EVAL_LIMITS.title),
      description: trunc(firstDesc, EVAL_LIMITS.description),
    },
    improvedSuccessMetric:
      typeof r.improvedSuccessMetric === 'string'
        ? trunc(r.improvedSuccessMetric, EVAL_LIMITS.metric)
        : '',
    risks: asStringArray(r.risks, EVAL_LIMITS.risk, EVAL_LIMITS.riskMax),
    nextActions: asStringArray(
      r.nextActions,
      EVAL_LIMITS.action,
      EVAL_LIMITS.actionMax,
    ),
    imagePrompt:
      typeof r.imagePrompt === 'string'
        ? trunc(r.imagePrompt, EVAL_LIMITS.imagePrompt)
        : '',
  };
}

export function isEvaluationResult(value: unknown): value is EvaluationResult {
  return normalizeEvaluation(value) !== null;
}

/**
 * Pick the correct Korean object particle (을/를) based on whether the
 * last Korean syllable of `s` has a final consonant (jongseong).
 *
 *   has jongseong  → "을"   (e.g., 마감일 놓침 → 놓침을)
 *   no jongseong   → "를"   (e.g., 정보 찾기 어려움 → 어려움를 X, see below)
 *
 * Hangul syllables are encoded at U+AC00..U+D7A3 with the formula
 *   code = 0xAC00 + 초성*588 + 중성*28 + 종성
 * so jongseong = (code - 0xAC00) % 28. 0 means no final consonant.
 */
export function eulReul(value: string | null | undefined): string {
  if (!value) return '를';
  const trimmed = value.trim();
  for (let i = trimmed.length - 1; i >= 0; i--) {
    const code = trimmed.charCodeAt(i);
    if (code >= 0xac00 && code <= 0xd7a3) {
      const jongseong = (code - 0xac00) % 28;
      return jongseong === 0 ? '를' : '을';
    }
  }
  return '를';
}

const PARSED_FIELDS: ParsedField[] = ['actor', 'situation', 'problem', 'solution'];
const SLOT_DISPLAY_MAX = 11;
const SENTENCE_DISPLAY_MAX = 120;

function nullableString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === 'null') return null;
  return trimmed;
}

function truncateMid(value: string, max: number): string {
  if (value.length <= max) return value;
  return value.slice(0, max).trimEnd() + '…';
}

function nullableShort(value: unknown, max = SLOT_DISPLAY_MAX): string | null {
  const s = nullableString(value);
  if (!s) return null;
  return truncateMid(s, max);
}

export function normalizeParsedIdea(raw: unknown): ParsedIdea | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  const actor = nullableShort(r.actor);
  const situation = nullableShort(r.situation);
  const problem = nullableShort(r.problem);
  const solution = nullableShort(r.solution);

  const filled = { actor, situation, problem, solution };
  const missingFields = PARSED_FIELDS.filter((f) => filled[f] === null);

  let confidence = typeof r.confidence === 'number' ? r.confidence : Number(r.confidence);
  if (!Number.isFinite(confidence)) confidence = 0;
  confidence = Math.max(0, Math.min(1, confidence));

  const declaredComplete = r.isComplete === true;
  const isComplete = declaredComplete && missingFields.length === 0;

  return {
    actor,
    situation,
    problem,
    solution,
    isComplete,
    confidence,
    displaySentence: (() => {
      const s = nullableString(r.displaySentence);
      return s ? truncateMid(s, SENTENCE_DISPLAY_MAX) : null;
    })(),
    missingFields,
  };
}
