import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';
import { isEvaluationResult, validateInput } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  const {
    idea,
    successCriteria,
    result,
    allowAnonymousStorage,
    allowContentUse,
    conceptImageUrl,
    conceptImagePrompt,
  } = (body ?? {}) as {
    idea?: unknown;
    successCriteria?: unknown;
    result?: unknown;
    allowAnonymousStorage?: unknown;
    allowContentUse?: unknown;
    conceptImageUrl?: unknown;
    conceptImagePrompt?: unknown;
  };

  if (allowAnonymousStorage !== true) {
    return NextResponse.json({ error: 'CONSENT_REQUIRED' }, { status: 400 });
  }

  const inputError = validateInput(idea, successCriteria);
  if (inputError) {
    return NextResponse.json(
      { error: inputError.kind, field: inputError.field },
      { status: 400 },
    );
  }

  if (!isEvaluationResult(result)) {
    return NextResponse.json({ error: 'INVALID_RESULT' }, { status: 400 });
  }

  // New schema columns (ship_type_*, scores, keep/cut). The legacy wide-row
  // columns (clarity_score, mvp_score, etc.) are left null on new rows since
  // those fields no longer exist in EvaluationResult.
  const row = {
    idea_text: (idea as string).trim(),
    success_criteria: (successCriteria as string).trim(),
    ai_summary: result.summary,
    // Ship type classification
    ship_type_key: result.shipType.key,
    ship_type_name: result.shipType.name,
    ship_type_name_en: result.shipType.nameEn,
    ship_type_blurb: result.shipType.blurb,
    can_ship_in_week: result.shipType.canShipInWeek,
    confidence_score: result.confidence,
    // Scores
    clarity: result.scores.clarity,
    mvp_scope: result.scores.mvpScope,
    feasibility: result.scores.feasibility,
    // Strategy
    mvp_keep: result.mvpStrategy.keep,
    mvp_cut: result.mvpStrategy.cut,
    next_actions: result.nextActions,
    // Consent + image
    allow_anonymous_storage: true,
    allow_content_use: allowContentUse === true,
    concept_image_url:
      typeof conceptImageUrl === 'string' &&
      (conceptImageUrl.startsWith('http') || conceptImageUrl.startsWith('/'))
        ? conceptImageUrl
        : null,
    concept_image_prompt:
      typeof conceptImagePrompt === 'string' ? conceptImagePrompt : null,
    refined_success_metric:
      typeof result.refinedSuccessMetric === 'string'
        ? result.refinedSuccessMetric
        : null,
  };

  try {
    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from('ship_check_ideas')
      .insert(row)
      .select('id')
      .single();
    if (error) {
      console.error('[save] supabase error:', error.message);
      return NextResponse.json({ error: 'SAVE_FAILED' }, { status: 500 });
    }
    return NextResponse.json({ id: data.id }, { status: 200 });
  } catch (err) {
    console.error('[save] unexpected:', err);
    return NextResponse.json({ error: 'SAVE_FAILED' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'METHOD_NOT_ALLOWED' }, { status: 405 });
}
