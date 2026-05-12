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

/**
 * In-process LRU cache for generated images.
 *
 * The original flow re-hit Cloudflare on every request: the route relied on
 * `Cache-Control: immutable` to pin the result in client/CDN caches, but a
 * cold visitor (e.g. someone opening a freshly-shared `/r/[id]` link)
 * always paid the 5-15 s flux generation. This map keeps the bytes
 * server-side so every visitor after the first one gets an instant reply.
 *
 * Key = `${seed}::${prompt}` — same shape the URL produces, so identical
 * URLs collide naturally. Size is bounded so a runaway prompt space can't
 * exhaust RAM (≈ 200 × 150 KB ≈ 30 MB).
 *
 * Cache lives in the Node process; a container restart drops it. That's
 * fine — the next visitor warms it again and pays the generation once.
 */
type CacheEntry = { bytes: Buffer; contentType: string };
const IMAGE_CACHE = new Map<string, CacheEntry>();
const IMAGE_CACHE_MAX = 200;

function cacheGet(key: string): CacheEntry | undefined {
  const hit = IMAGE_CACHE.get(key);
  if (!hit) return undefined;
  // Bump to most-recently-used position.
  IMAGE_CACHE.delete(key);
  IMAGE_CACHE.set(key, hit);
  return hit;
}

function cacheSet(key: string, entry: CacheEntry) {
  if (IMAGE_CACHE.has(key)) IMAGE_CACHE.delete(key);
  IMAGE_CACHE.set(key, entry);
  while (IMAGE_CACHE.size > IMAGE_CACHE_MAX) {
    const oldest = IMAGE_CACHE.keys().next().value;
    if (oldest === undefined) break;
    IMAGE_CACHE.delete(oldest);
  }
}

// flux-1-schnell is a fast 4-step distill that weights early tokens heavily
// and ignores classic negative prompts. So: lead with the strongest style
// anchor, keep total attributes tight (≤6), and phrase exclusions positively.
const BRAND_STYLE = [
  'flat vector editorial illustration, modern magazine cover aesthetic',
  'warm ivory paper background with subtle grain',
  'mint green #59B87B and deep charcoal #1A1A1A duotone palette',
  'one central symbolic subject with generous breathing room',
  'crisp focused composition, soft diffused light, gentle layered shadows',
  'calm optimistic mood, premium minimal startup feel',
].join(', ');

// Positive reframing of "no X". schnell respects affirmative descriptors far
// better than "no/avoid/without".
const QUALITY_ANCHORS = [
  'abstract symbolic metaphor instead of literal product depiction',
  'clean image area free of typography, letters, numbers, logos, UI mockups, device screens, or watermarks',
  'illustration style only, no photoreal humans or recognizable faces',
  'sharp clear edges, smooth gradients, high quality',
].join(', ');

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

  const cacheKey = `${seedParam ?? '0'}::${promptParam.trim()}`;
  const cached = cacheGet(cacheKey);
  if (cached) {
    // Wrap Buffer in Uint8Array — newer Node/Next type defs reject Buffer
    // as a BodyInit even though it works at runtime.
    return new Response(new Uint8Array(cached.bytes), {
      headers: {
        'Content-Type': cached.contentType,
        'Cache-Control':
          'public, max-age=31536000, immutable, s-maxage=31536000',
        'X-Image-Cache': 'HIT',
      },
    });
  }

  // Compose: scene → style → quality anchors. schnell weights early tokens
  // more, so the concrete scene leads, then the visual style locks the look,
  // then quality anchors clean up the long tail.
  const fullPrompt =
    `${promptParam.trim()}. Style: ${BRAND_STYLE}. ${QUALITY_ANCHORS}.`;

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

  // CF sometimes returns JPEG bytes even though docs say PNG — sniff the
  // first 3 bytes so the Content-Type matches the actual format.
  const isJpeg =
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff;
  const contentType = isJpeg ? 'image/jpeg' : 'image/png';

  cacheSet(cacheKey, { bytes: buffer, contentType });

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': contentType,
      // Deterministic URL (prompt + seed) → cache aggressively forever.
      // The hash of inputs is in the URL, so if the input changes the URL
      // changes and the new image is fetched.
      'Cache-Control':
        'public, max-age=31536000, immutable, s-maxage=31536000',
      'X-Image-Cache': 'MISS',
    },
  });
}
