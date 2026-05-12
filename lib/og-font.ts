/**
 * Pretendard Bold loader for `next/og` `ImageResponse`.
 *
 * Satori (the SVG renderer behind ImageResponse) ships an English-only
 * default; Korean characters render as tofu boxes without an explicit font.
 * Pretendard is a permissively-licensed Korean sans-serif that covers Hangul
 * + Latin in one file, so one fetch is enough for the whole layout.
 *
 * Cached at module scope: the first OG render in a process pays the network
 * cost (~250–400 KB), every subsequent render reuses the buffer.
 */

const PRETENDARD_BOLD =
  'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/public/static/Pretendard-Bold.otf';
const PRETENDARD_REGULAR =
  'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/public/static/Pretendard-Regular.otf';

let cache: { bold: ArrayBuffer; regular: ArrayBuffer } | null = null;

export async function loadOgFonts() {
  if (cache) return cache;
  const [bold, regular] = await Promise.all([
    fetch(PRETENDARD_BOLD).then((r) => r.arrayBuffer()),
    fetch(PRETENDARD_REGULAR).then((r) => r.arrayBuffer()),
  ]);
  cache = { bold, regular };
  return cache;
}
