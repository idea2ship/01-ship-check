import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { EvaluationResult, ShipTypeKey } from './types';

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

const SHIP_TYPE_KEYS: ShipTypeKey[] = [
  'ready_shipper',
  'scope_down_shipper',
  'big_vision',
  'foggy_idea',
  'discovery_mode',
];

function clampScore(v: unknown, fallback = 3): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(5, Math.round(n)));
}

function clampConfidence(v: unknown, fallback = 50): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export async function getSavedIdea(id: string): Promise<SavedIdea | null> {
  if (!UUID_REGEX.test(id)) return null;

  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from('ship_check_ideas')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;

  const shipTypeKeyRaw = data.ship_type_key as string | null;
  const shipTypeKey: ShipTypeKey = SHIP_TYPE_KEYS.includes(
    shipTypeKeyRaw as ShipTypeKey,
  )
    ? (shipTypeKeyRaw as ShipTypeKey)
    : 'scope_down_shipper';

  const result: EvaluationResult = {
    summary: data.ai_summary ?? '',
    shipType: {
      key: shipTypeKey,
      name: data.ship_type_name ?? '핵심 출시형',
      nameEn: data.ship_type_name_en ?? 'Trim & Ship',
      blurb: data.ship_type_blurb ?? '',
      canShipInWeek:
        typeof data.can_ship_in_week === 'boolean'
          ? data.can_ship_in_week
          : false,
    },
    confidence: clampConfidence(data.confidence_score),
    scores: {
      clarity: clampScore(data.clarity ?? data.clarity_score),
      mvpScope: clampScore(data.mvp_scope ?? data.mvp_score),
      feasibility: clampScore(data.feasibility),
    },
    mvpStrategy: {
      keep: Array.isArray(data.mvp_keep) ? (data.mvp_keep as string[]) : [],
      cut: Array.isArray(data.mvp_cut)
        ? (data.mvp_cut as string[])
        : Array.isArray(data.should_cut)
          ? (data.should_cut as string[])
          : [],
    },
    nextActions: Array.isArray(data.next_actions)
      ? (data.next_actions as string[])
      : [],
    imagePrompt: data.concept_image_prompt ?? '',
    refinedSuccessMetric:
      typeof data.refined_success_metric === 'string'
        ? data.refined_success_metric
        : '',
  };

  return {
    id: data.id,
    ideaText: data.idea_text,
    successCriteria: data.success_criteria,
    allowContentUse: !!data.allow_content_use,
    createdAt: data.created_at,
    conceptImageUrl: data.concept_image_url ?? null,
    conceptImagePrompt: data.concept_image_prompt ?? null,
    result,
  };
}
