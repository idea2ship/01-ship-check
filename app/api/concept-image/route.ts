import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Server-side proxy to Cloudflare Workers AI for concept image generation.
 *
 *   GET /api/concept-image?prompt=...&seed=...
 *
 * The client passes only the scene description; we append the brand style
 * suffix here so:
 *   1) the URL stays short
 *   2) the brand style stays consistent and version-controlled
 *   3) the CF credentials never leak to the client
 *
 * Successful responses are cached aggressively (immutable, 1 year) because
 * the URL is deterministic on (prompt, seed). Failures aren't cached.
 *
 * Cloudflare free tier: 10,000 neurons/day. flux-1-schnell ≈ 83 neurons
 * per image → ~120 free images/day.
 */

const MODEL = '@cf/black-forest-labs/flux-1-schnell';

const BRAND_STYLE = [
  'editorial concept illustration in the style of a modern tech magazine cover',
  'warm ivory background',
  'electric mint green accent (#59B87B)',
  'deep charcoal secondary (#1A1A1A)',
  'matte finish with subtle paper grain',
  'rule-of-thirds composition',
  'single clear focal subject with 2-3 supporting elements maximum',
  'soft diffused lighting, gentle shadows',
  'flat vector illustration style, smooth gradients, minimal line work',
  'modern startup aesthetic, premium feel, calm and optimistic mood',
  'symbolic visual metaphor, not literal product depiction',
].join(', ');

const NEGATIVE_HINTS =
  'do not include: text, letters, numbers, words, logos, watermarks, ' +
  'UI screenshots, app interfaces, phone or computer screens, ' +
  'human faces, recognizable people, photorealistic style, blurry or low-quality artifacts';

function jsonError(code: string, status: number) {
  return NextResponse.json(
    { error: code },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function GET(req: Request) {
  const accountId = process.env.CF_ACCOUNT_ID;
  const apiToken = process.env.CF_API_TOKEN;

  if (!accountId || !apiToken) {
    return jsonError('CONFIG', 500);
  }

  const url = new URL(req.url);
  const promptParam = url.searchParams.get('prompt');
  const seedParam = url.searchParams.get('seed');

  if (!promptParam || !promptParam.trim()) {
    return jsonError('MISSING_PROMPT', 400);
  }

  const seed = seedParam ? Number.parseInt(seedParam, 10) : undefined;

  // Compose: scene → negative directives → brand style. The order matters:
  // schnell weights early tokens slightly more, so the scene leads.
  const fullPrompt =
    `${promptParam.trim()}. ${NEGATIVE_HINTS}. Style: ${BRAND_STYLE}.`;

  const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${MODEL}`;

  let cfRes: Response;
  try {
    cfRes = await fetch(cfUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: fullPrompt,
        // 4 steps is the schnell sweet spot (fast + decent quality).
        steps: 4,
        ...(seed !== undefined && Number.isFinite(seed) ? { seed } : {}),
      }),
    });
  } catch (err) {
    console.error('[concept-image] network error:', err);
    return jsonError('NETWORK', 503);
  }

  if (!cfRes.ok) {
    const errText = await cfRes.text().catch(() => '');
    console.error('[concept-image] CF error:', cfRes.status, errText.slice(0, 200));
    // Translate 429 (rate limit) to 503 so the client knows to retry later.
    return jsonError('CF_FAILED', cfRes.status === 429 ? 503 : 502);
  }

  let data: unknown;
  try {
    data = await cfRes.json();
  } catch {
    return jsonError('PARSE_FAILED', 502);
  }

  // flux-1-schnell returns: { result: { image: "<base64>" }, success: true, ... }
  const base64 =
    typeof data === 'object' && data !== null
      ? ((data as Record<string, unknown>).result as
          | { image?: string }
          | undefined)?.image
      : undefined;

  if (!base64 || typeof base64 !== 'string') {
    console.error('[concept-image] missing image in CF response');
    return jsonError('NO_IMAGE', 502);
  }

  const buffer = Buffer.from(base64, 'base64');

  return new Response(buffer, {
    headers: {
      'Content-Type': 'image/png',
      // Deterministic URL (prompt + seed) → cache aggressively forever.
      // The hash of inputs is in the URL, so if the input changes the URL
      // changes and the new image is fetched.
      'Cache-Control':
        'public, max-age=31536000, immutable, s-maxage=31536000',
    },
  });
}
