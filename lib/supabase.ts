import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { EvaluationResult } from './types';

let cached: SupabaseClient | null = null;

export function getServerSupabase(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }
  cached = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return cached;
}

export type SavedIdea = {
  id: string;
  ideaText: string;
  successCriteria: string;
  result: EvaluationResult;
  allowContentUse: boolean;
  createdAt: string;
  conceptImageUrl: string | null;
  conceptImagePrompt: string | null;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getSavedIdea(id: string): Promise<SavedIdea | null> {
  if (!UUID_REGEX.test(id)) return null;

  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from('ship_check_ideas')
    .select(
      'id, idea_text, success_criteria, ai_summary, clarity_score, clarity_comment, mvp_score, mvp_comment, should_cut, first_feature_title, first_feature_description, improved_success_metric, risks, next_actions, allow_content_use, created_at, concept_image_url, concept_image_prompt',
    )
    .eq('id', id)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    ideaText: data.idea_text,
    successCriteria: data.success_criteria,
    allowContentUse: !!data.allow_content_use,
    createdAt: data.created_at,
    conceptImageUrl: data.concept_image_url ?? null,
    conceptImagePrompt: data.concept_image_prompt ?? null,
    result: {
      summary: data.ai_summary ?? '',
      clarityReview: {
        score: data.clarity_score ?? 1,
        comment: data.clarity_comment ?? '',
      },
      mvpScope: {
        score: data.mvp_score ?? 1,
        comment: data.mvp_comment ?? '',
        shouldCut: data.should_cut ?? [],
      },
      firstFeature: {
        title: data.first_feature_title ?? '',
        description: data.first_feature_description ?? '',
      },
      improvedSuccessMetric: data.improved_success_metric ?? '',
      risks: data.risks ?? [],
      nextActions: data.next_actions ?? [],
      imagePrompt: data.concept_image_prompt ?? '',
    },
  };
}
