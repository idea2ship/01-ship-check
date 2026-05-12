import type { Metadata, Viewport } from 'next';
import { BgLayer } from '@/components/BgLayer';
import { CustomCursor } from '@/components/CustomCursor';
import './globals.css';

export const metadata: Metadata = {
  title: '/1> Ship Check — Can this idea be shipped in a week?',
  description:
    '막연한 아이디어를 1주일 안에 만들 수 있는 MVP로 줄여드립니다. idea2ship의 첫 번째 미니 서비스.',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://01.idea2ship.xyz',
  ),
  openGraph: {
    title: '/1> Ship Check',
    description: 'Can this idea be shipped in a week?',
    siteName: 'idea2ship',
    type: 'website',
    locale: 'ko_KR',
  },
  twitter: {
    card: 'summary_large_image',
    title: '/1> Ship Check',
    description: 'Can this idea be shipped in a week?',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#FAF7F0',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen text-ink antialiased">
        <BgLayer />
        <div className="bg-veil" aria-hidden />
        {children}
        <CustomCursor />
      </body>
    </html>
  );
}
