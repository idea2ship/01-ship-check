export type ParsedField = 'actor' | 'situation' | 'problem' | 'solution';

export type ParsedIdea = {
  actor: string | null;
  situation: string | null;
  problem: string | null;
  solution: string | null;
  isComplete: boolean;
  confidence: number;
  displaySentence: string | null;
  missingFields: ParsedField[];
};

export type ParseRequest = {
  idea: string;
};

export type ShipTypeKey =
  | 'ready_shipper'
  | 'scope_down_shipper'
  | 'big_vision'
  | 'foggy_idea'
  | 'discovery_mode';

export type ShipType = {
  /** Stable categorical key for analytics/styling */
  key: ShipTypeKey;
  /** Korean display name, e.g. "조건부 출시형" */
  name: string;
  /** English display name, e.g. "Scope-Down Shipper" */
  nameEn: string;
  /** Short reason this idea ended up in this category (≤60 chars) */
  blurb: string;
  /** Whether the banner "Can Ship in 1 Week" is shown */
  canShipInWeek: boolean;
};

export type EvaluationScores = {
  clarity: number; // 1~5
  mvpScope: number; // 1~5
  feasibility: number; // 1~5
};

export type MvpStrategy = {
  /** What to keep in the 1-week MVP (≤3 items, each ≤22 chars) */
  keep: string[];
  /** What to cut out (≤3 items, each ≤22 chars) */
  cut: string[];
};

export type EvaluationResult = {
  /** One-sentence headline, kept for OG card description + MD export */
  summary: string;
  shipType: ShipType;
  /** Overall confidence score, 0~100 integer */
  confidence: number;
  scores: EvaluationScores;
  mvpStrategy: MvpStrategy;
  nextActions: string[]; // exactly 3, each ≤25 chars, verb-start
  /** English prompt for concept image generation (no brand tokens — added in lib/image.ts) */
  imagePrompt: string;
  /**
   * Refined, measurable rewrite of the user's success criteria. Phrased as a
   * single concrete sentence the user can verify after 1 week. LLM-generated;
   * may be empty if the model couldn't improve on the input.
   */
  refinedSuccessMetric: string;
};

export type EvaluateRequest = {
  idea: string;
  successCriteria: string;
  parsedIdea?: ParsedIdea | null;
};

export type SaveRequest = {
  idea: string;
  successCriteria: string;
  result: EvaluationResult;
  allowAnonymousStorage: boolean;
  allowContentUse: boolean;
};

export type ApiError = {
  error: string;
  message?: string;
};
