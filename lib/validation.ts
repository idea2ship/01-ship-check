import type {
  EvaluationResult,
  ParsedField,
  ParsedIdea,
  ShipType,
  ShipTypeKey,
} from './types';

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

const EVAL_LIMITS = {
  summary: 100,
  shipTypeName: 18,
  shipTypeNameEn: 24,
  shipTypeBlurb: 80,
  mvpItem: 28,
  mvpItemCountMax: 3,
  action: 36,
  actionCountMax: 3,
  imagePrompt: 240,
};

function clampScore(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(5, Math.round(n)));
}

function clampConfidence(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}

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

const SHIP_TYPE_KEYS: ShipTypeKey[] = [
  'ready_shipper',
  'scope_down_shipper',
  'big_vision',
  'foggy_idea',
  'discovery_mode',
];

const SHIP_TYPE_DEFAULTS: Record<
  ShipTypeKey,
  { name: string; nameEn: string; canShipInWeek: boolean }
> = {
  ready_shipper: { name: '즉시 출시형', nameEn: 'Ship Now', canShipInWeek: true },
  scope_down_shipper: {
    name: '핵심 출시형',
    nameEn: 'Trim & Ship',
    canShipInWeek: true,
  },
  big_vision: { name: '장기 항로형', nameEn: 'Long Game', canShipInWeek: false },
  foggy_idea: { name: '안개 항로형', nameEn: 'Fog Ahead', canShipInWeek: false },
  discovery_mode: {
    name: '탐색 항해형',
    nameEn: 'Chart First',
    canShipInWeek: false,
  },
};

function normalizeShipType(raw: unknown): ShipType {
  const r = (raw ?? {}) as Record<string, unknown>;
  const keyRaw = typeof r.key === 'string' ? r.key : '';
  const key: ShipTypeKey = SHIP_TYPE_KEYS.includes(keyRaw as ShipTypeKey)
    ? (keyRaw as ShipTypeKey)
    : 'scope_down_shipper';
  const defaults = SHIP_TYPE_DEFAULTS[key];
  const name =
    typeof r.name === 'string' && r.name.trim().length > 0
      ? trunc(r.name, EVAL_LIMITS.shipTypeName)
      : defaults.name;
  const nameEn =
    typeof r.nameEn === 'string' && r.nameEn.trim().length > 0
      ? trunc(r.nameEn, EVAL_LIMITS.shipTypeNameEn)
      : defaults.nameEn;
  const blurb =
    typeof r.blurb === 'string'
      ? trunc(r.blurb, EVAL_LIMITS.shipTypeBlurb)
      : '';
  const canShipInWeek =
    typeof r.canShipInWeek === 'boolean'
      ? r.canShipInWeek
      : defaults.canShipInWeek;

  return { key, name, nameEn, blurb, canShipInWeek };
}

export function normalizeEvaluation(raw: unknown): EvaluationResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  const summary = typeof r.summary === 'string' ? r.summary.trim() : '';
  if (!summary) return null;

  const scores = (r.scores ?? {}) as Record<string, unknown>;
  const strategy = (r.mvpStrategy ?? {}) as Record<string, unknown>;

  return {
    summary: trunc(summary, EVAL_LIMITS.summary),
    shipType: normalizeShipType(r.shipType),
    confidence: clampConfidence(r.confidence),
    scores: {
      clarity: clampScore(scores.clarity),
      mvpScope: clampScore(scores.mvpScope),
      feasibility: clampScore(scores.feasibility),
    },
    mvpStrategy: {
      keep: asStringArray(
        strategy.keep,
        EVAL_LIMITS.mvpItem,
        EVAL_LIMITS.mvpItemCountMax,
      ),
      cut: asStringArray(
        strategy.cut,
        EVAL_LIMITS.mvpItem,
        EVAL_LIMITS.mvpItemCountMax,
      ),
    },
    nextActions: asStringArray(
      r.nextActions,
      EVAL_LIMITS.action,
      EVAL_LIMITS.actionCountMax,
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
// Backend safety cap. The LLM is asked to stay around 5~9 chars; this only
// kicks in when it overshoots. Raised from 11 → 14 so common phrases like
// "구현 가능성 확인 어려움" (13 chars) round-trip without ellipsis.
const SLOT_DISPLAY_MAX = 14;
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
