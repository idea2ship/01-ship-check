export type ScoreReview = {
  score: number;
  comment: string;
};

export type MvpScopeReview = {
  score: number;
  comment: string;
  shouldCut: string[];
};

export type FirstFeature = {
  title: string;
  description: string;
};

export type EvaluationResult = {
  summary: string;
  clarityReview: ScoreReview;
  mvpScope: MvpScopeReview;
  firstFeature: FirstFeature;
  improvedSuccessMetric: string;
  risks: string[];
  nextActions: string[];
  /**
   * Short English visual description of the service concept. The brand
   * style suffix (cream bg, mint accent, no text, etc.) is appended by
   * `lib/image.ts` — the LLM only writes the concept itself.
   */
  imagePrompt: string;
};

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
