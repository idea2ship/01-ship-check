/**
 * Pollinations image URL builder for the concept hero on each result.
 *
 * Why client-side: Pollinations URLs are stateless. The browser fetches the
 * image directly via <img src>. Our Vercel/OCI server never proxies the
 * image, so we don't spend our function quota.
 *
 * The LLM only writes the concept fragment. We always append a brand-locked
 * style suffix so every generated image stays on-brand across weeks.
 */

const BRAND_STYLE = [
  'minimal editorial concept illustration',
  'warm ivory background',
  'charcoal and electric mint color palette',
  'ample negative space, single focal element',
  'soft depth, vector illustration style',
  'modern startup aesthetic, premium feel',
  'no text, no letters, no logos, no UI screenshot, no watermark',
  'symbolic, not literal',
].join(', ');

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
  opts: { width?: number; height?: number; model?: string } = {},
): string {
  const concept = imagePrompt.trim() || 'abstract idea taking shape';
  const fullPrompt = `${concept}, ${BRAND_STYLE}`;

  const width = opts.width ?? 1024;
  const height = opts.height ?? 1024;
  const model = opts.model ?? 'flux';
  const seed = djb2(seedSource);

  // Pollinations encodes the prompt as part of the path. encodeURIComponent
  // is what their docs recommend.
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(
    fullPrompt,
  )}?width=${width}&height=${height}&nologo=true&model=${model}&seed=${seed}`;
}

/**
 * Combine the idea text and (optional) success criteria to derive a stable
 * seed source — same input ⇒ same image.
 */
export function seedFor(idea: string, successCriteria?: string): string {
  return [idea, successCriteria].filter(Boolean).join('|').trim();
}
