/**
 * Builds a URL pointing to our internal `/api/concept-image` route, which
 * proxies to Cloudflare Workers AI (flux-1-schnell). The brand style suffix
 * and negative directives live server-side (see app/api/concept-image/route.ts)
 * so the URL stays short and the style/credentials never leak to the client.
 *
 * The URL is deterministic on (prompt, seed). The server caches successful
 * responses for 1 year with immutable headers, so repeat views and the
 * /r/[id] share page hit the edge cache and never re-fire generation.
 */

/** djb2 — small, deterministic hash so the same idea always maps to the same image. */
function djb2(input: string): number {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h + input.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function buildConceptImageUrl(
  imagePrompt: string,
  seedSource: string,
): string {
  const prompt = imagePrompt.trim() || 'abstract idea taking shape';
  const seed = djb2(seedSource);
  const params = new URLSearchParams({
    prompt,
    seed: String(seed),
  });
  return `/api/concept-image?${params.toString()}`;
}

export function seedFor(idea: string, successCriteria?: string): string {
  return [idea, successCriteria].filter(Boolean).join('|').trim();
}
