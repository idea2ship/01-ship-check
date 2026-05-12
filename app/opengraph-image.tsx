import { ImageResponse } from 'next/og';
import { loadOgFonts } from '@/lib/og-font';

export const runtime = 'nodejs';
export const alt = '/1> Ship Check — Can this idea be shipped in a week?';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const CREAM = '#FAF7F0';
const INK = '#1A1A1A';
const MINT = '#59B87B';

export default async function HomeOg() {
  const { bold, regular } = await loadOgFonts();

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: CREAM,
          display: 'flex',
          flexDirection: 'column',
          padding: '72px 88px',
          fontFamily: 'Pretendard',
          color: INK,
          position: 'relative',
        }}
      >
        {/* Subtle paper-grain overlay via two soft radial gradients */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 18% 22%, rgba(89,184,123,0.16), transparent 42%), radial-gradient(circle at 84% 78%, rgba(26,26,26,0.06), transparent 38%)',
            display: 'flex',
          }}
        />

        {/* Top eyebrow */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            fontSize: 22,
            color: 'rgba(26,26,26,0.7)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            fontFamily: 'Pretendard',
            zIndex: 1,
          }}
        >
          <span style={{ color: MINT, fontWeight: 700 }}>/1&gt;</span>
          <span>Ship Check</span>
        </div>

        {/* Main title — single English line, no Korean font dependency here */}
        <div
          style={{
            marginTop: 36,
            fontSize: 96,
            fontWeight: 700,
            lineHeight: 1.04,
            letterSpacing: '-0.02em',
            zIndex: 1,
            display: 'flex',
          }}
        >
          Can this idea
        </div>
        <div
          style={{
            fontSize: 96,
            fontWeight: 700,
            lineHeight: 1.04,
            letterSpacing: '-0.02em',
            zIndex: 1,
            display: 'flex',
          }}
        >
          ship in <span style={{ color: MINT, marginLeft: 18 }}>1 week?</span>
        </div>

        {/* Korean subtitle */}
        <div
          style={{
            marginTop: 40,
            fontSize: 30,
            color: 'rgba(26,26,26,0.8)',
            lineHeight: 1.4,
            fontWeight: 400,
            zIndex: 1,
            display: 'flex',
            maxWidth: 920,
          }}
        >
          막연한 아이디어를 1주일짜리 MVP로 줄여드립니다.
        </div>

        {/* Bottom brand strip */}
        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 28,
            borderTop: '1px solid rgba(26,26,26,0.12)',
            fontSize: 22,
            color: 'rgba(26,26,26,0.65)',
            zIndex: 1,
          }}
        >
          <span style={{ display: 'flex' }}>idea2ship · 매주 하나씩 출시</span>
          <span style={{ display: 'flex', letterSpacing: '0.18em' }}>
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
