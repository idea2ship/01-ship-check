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

  const row = {
    idea_text: (idea as string).trim(),
    success_criteria: (successCriteria as string).trim(),
    ai_summary: result.summary,
    clarity_score: result.clarityReview.score,
    clarity_comment: result.clarityReview.comment,
    mvp_score: result.mvpScope.score,
    mvp_comment: result.mvpScope.comment,
    should_cut: result.mvpScope.shouldCut,
    first_feature_title: result.firstFeature.title,
    first_feature_description: result.firstFeature.description,
    improved_success_metric: result.improvedSuccessMetric,
    risks: result.risks,
    next_actions: result.nextActions,
    allow_anonymous_storage: true,
    allow_content_use: allowContentUse === true,
    concept_image_url:
      typeof conceptImageUrl === 'string' && conceptImageUrl.startsWith('http')
        ? conceptImageUrl
        : null,
    concept_image_prompt:
      typeof conceptImagePrompt === 'string' ? conceptImagePrompt : null,
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
