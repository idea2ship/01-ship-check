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

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
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
    summary,
    clarityReview: {
      score: clampScore(clarity.score),
      comment: typeof clarity.comment === 'string' ? clarity.comment.trim() : '',
    },
    mvpScope: {
      score: clampScore(mvp.score),
      comment: typeof mvp.comment === 'string' ? mvp.comment.trim() : '',
      shouldCut: asStringArray(mvp.shouldCut),
    },
    firstFeature: {
      title: firstTitle,
      description: firstDesc,
    },
    improvedSuccessMetric:
      typeof r.improvedSuccessMetric === 'string' ? r.improvedSuccessMetric.trim() : '',
    risks: asStringArray(r.risks),
    nextActions: asStringArray(r.nextActions),
  };
}

export function isEvaluationResult(value: unknown): value is EvaluationResult {
  return normalizeEvaluation(value) !== null;
}

const PARSED_FIELDS: ParsedField[] = ['actor', 'situation', 'problem', 'solution'];

function nullableString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === 'null') return null;
  return trimmed;
}

export function normalizeParsedIdea(raw: unknown): ParsedIdea | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  const actor = nullableString(r.actor);
  const situation = nullableString(r.situation);
  const problem = nullableString(r.problem);
  const solution = nullableString(r.solution);

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
    displaySentence: nullableString(r.displaySentence),
    missingFields,
  };
}
