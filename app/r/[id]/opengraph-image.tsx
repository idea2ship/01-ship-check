import { ImageResponse } from 'next/og';
import { loadOgFonts } from '@/lib/og-font';
import { getSavedIdea } from '@/lib/supabase';

export const runtime = 'nodejs';
export const alt = 'Ship Check result';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const CREAM = '#FAF7F0';
const CREAM_SOFT = '#F4EFE4';
const INK = '#1A1A1A';
const INK_SOFT = '#3A3A3A';
const INK_MUTED = 'rgba(26,26,26,0.55)';
const INK_FAINT = 'rgba(26,26,26,0.3)';
const MINT = '#59B87B';
const MINT_TINT = 'rgba(89,184,123,0.16)';
const MINT_BORDER = 'rgba(89,184,123,0.32)';

const SCORE_BANDS: { min: number; label: string }[] = [
  { min: 80, label: '이대로 출시 가능' },
  { min: 60, label: '조금만 다듬으면 출시 가능' },
  { min: 40, label: '한 번 더 구체화가 필요' },
  { min: 0, label: '아직 탐색 단계' },
];

function scoreBandLabel(score: number): string {
  return SCORE_BANDS.find((b) => score >= b.min)?.label ?? '아직 탐색 단계';
}

// Inline 4-point sparkle. Pretendard doesn't ship the ✦ glyph, so we draw
// it as a polygon — Satori handles polygon points reliably (the curved
// path version rendered as a plus sign in tests).
function SparkleSvg({ color, size = 14 }: { color: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <polygon
        fill={color}
        points="12,2 13.7,10.3 22,12 13.7,13.7 12,22 10.3,13.7 2,12 10.3,10.3"
      />
    </svg>
  );
}

type Props = { params: Promise<{ id: string }> };

export default async function ResultOg({ params }: Props) {
  const { id } = await params;
  const saved = await getSavedIdea(id);
  const { bold, regular } = await loadOgFonts();

  // Graceful fallback — id not found / DB error.
  if (!saved) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            background: CREAM,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 48,
            color: INK_MUTED,
            fontFamily: 'Pretendard',
          }}
        >
          이 결과는 더 이상 존재하지 않습니다
        </div>
      ),
      {
        ...size,
        fonts: [{ name: 'Pretendard', data: regular, weight: 400 }],
      },
    );
  }

  const { result } = saved;
  const { shipType, confidence } = result;
  const summary = result.summary?.trim() ?? '';

  // Satori can't resolve relative URLs; promote to absolute using site URL.
  const siteOrigin =
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://01.idea2ship.xyz';
  const absoluteImageUrl =
    saved.conceptImageUrl && saved.conceptImageUrl.startsWith('/')
      ? `${siteOrigin}${saved.conceptImageUrl}`
      : saved.conceptImageUrl;

  const barPct = Math.max(2, Math.min(100, confidence));

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: CREAM,
          display: 'flex',
          flexDirection: 'column',
          padding: '48px 64px',
          fontFamily: 'Pretendard',
          color: INK,
          position: 'relative',
        }}
      >
        {/* Soft accent wash so the cream isn't flat */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 12% 16%, rgba(89,184,123,0.12), transparent 38%), radial-gradient(circle at 86% 88%, rgba(26,26,26,0.04), transparent 36%)',
            display: 'flex',
          }}
        />

        {/* Eyebrow row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 20,
            color: INK_MUTED,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            zIndex: 1,
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ color: MINT, fontWeight: 700 }}>/1&gt;</span>
            <span>Ship Check</span>
          </span>
          <span style={{ display: 'flex' }}>Shared Result</span>
        </div>

        {/* Main body: left text column + right image */}
        <div
          style={{
            marginTop: 30,
            display: 'flex',
            flex: 1,
            gap: 40,
            zIndex: 1,
          }}
        >
          {/* LEFT: Ship Type header + AI summary */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minWidth: 0,
              gap: 22,
            }}
          >
            {/* Ship Type header card — mirrors the in-app gradient header */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '24px 28px',
                background:
                  'linear-gradient(135deg, rgba(224,246,233,0.85) 0%, rgba(255,255,255,0.5) 60%, rgba(255,255,255,0.4) 100%)',
                border: `1px solid ${MINT_BORDER}`,
                borderRadius: 22,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 20,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: 16,
                      letterSpacing: '0.28em',
                      color: MINT,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      display: 'flex',
                    }}
                  >
                    Ship Type
                  </span>
                  <span
                    style={{
                      marginTop: 6,
                      fontSize: 56,
                      fontWeight: 800,
                      lineHeight: 1.02,
                      letterSpacing: '-0.02em',
                      color: INK,
                      display: 'flex',
                    }}
                  >
                    {shipType.name}
                  </span>
                  <span
                    style={{
                      marginTop: 4,
                      fontSize: 18,
                      color: INK_MUTED,
                      letterSpacing: '0.16em',
                      textTransform: 'uppercase',
                      display: 'flex',
                    }}
                  >
                    {shipType.nameEn}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: 16,
                      letterSpacing: '0.22em',
                      color: INK_MUTED,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      display: 'flex',
                    }}
                  >
                    Score
                  </span>
                  <span
                    style={{
                      marginTop: 2,
                      fontSize: 88,
                      fontWeight: 900,
                      letterSpacing: '-0.02em',
                      color: INK,
                      lineHeight: 1,
                      display: 'flex',
                    }}
                  >
                    {confidence}
                  </span>
                  <span
                    style={{
                      marginTop: 2,
                      fontSize: 16,
                      color: INK_FAINT,
                      fontWeight: 700,
                      display: 'flex',
                    }}
                  >
                    /100
                  </span>
                </div>
              </div>

              {/* Progress bar + qualitative band */}
              <div
                style={{
                  marginTop: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  width: '62%',
                }}
              >
                <div
                  style={{
                    height: 8,
                    background: 'rgba(26,26,26,0.08)',
                    borderRadius: 999,
                    overflow: 'hidden',
                    display: 'flex',
                  }}
                >
                  <div
                    style={{
                      width: `${barPct}%`,
                      height: '100%',
                      background: MINT,
                      borderRadius: 999,
                      display: 'flex',
                    }}
                  />
                </div>
                <span
                  style={{
                    marginTop: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 16,
                    color: INK_SOFT,
                    fontWeight: 700,
                  }}
                >
                  <SparkleSvg color={MINT} size={14} />
                  <span style={{ display: 'flex' }}>
                    {scoreBandLabel(confidence)}
                  </span>
                </span>
              </div>
            </div>

            {/* AI 한 줄 요약 — render only if present */}
            {summary ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '18px 22px',
                  background: MINT_TINT,
                  border: `1px solid ${MINT_BORDER}`,
                  borderRadius: 18,
                }}
              >
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: MINT,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <SparkleSvg color={MINT} size={16} />
                  <span style={{ display: 'flex' }}>AI 한 줄 요약</span>
                </span>
                <span
                  style={{
                    marginTop: 8,
                    fontSize: 22,
                    color: INK,
                    fontWeight: 400,
                    lineHeight: 1.35,
                    display: 'flex',
                  }}
                >
                  {summary}
                </span>
              </div>
            ) : null}
          </div>

          {/* RIGHT: concept image */}
          <div
            style={{
              width: 360,
              height: 360,
              alignSelf: 'center',
              borderRadius: 26,
              background: CREAM_SOFT,
              border: '1px solid rgba(26,26,26,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {absoluteImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={absoluteImageUrl}
                alt=""
                width={360}
                height={360}
                style={{
                  objectFit: 'cover',
                  width: '100%',
                  height: '100%',
                }}
              />
            ) : (
              <span style={{ fontSize: 22, color: INK_MUTED, display: 'flex' }}>
                no preview
              </span>
            )}
          </div>
        </div>

        {/* Bottom brand strip */}
        <div
          style={{
            marginTop: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 18,
            borderTop: '1px solid rgba(26,26,26,0.12)',
            fontSize: 18,
            color: INK_MUTED,
            zIndex: 1,
          }}
        >
          <span style={{ display: 'flex' }}>idea2ship · 매주 하나씩 출시</span>
          <span style={{ display: 'flex', letterSpacing: '0.2em' }}>
            01.IDEA2SHIP.XYZ
          </span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Pretendard', data: bold, weight: 700, style: 'normal' },
        { name: 'Pretendard', data: regular, weight: 400, style: 'normal' },
      ],
    },
  );
}
