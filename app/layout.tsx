import type { Metadata, Viewport } from 'next';
import { BgLayer } from '@/components/BgLayer';
import './globals.css';

export const metadata: Metadata = {
  title: '/1> Ship Check — Can this idea be shipped in a week?',
  description:
    '막연한 아이디어를 1주일 안에 만들 수 있는 MVP로 줄여드립니다. idea2ship의 첫 번째 미니 서비스.',
  metadataBase: new URL('https://ship-check.idea2ship.com'),
  openGraph: {
    title: '/1> Ship Check',
    description: 'Can this idea be shipped in a week?',
    siteName: 'idea2ship',
    type: 'website',
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
        {children}
      </body>
    </html>
  );
}
