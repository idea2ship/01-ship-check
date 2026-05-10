import Link from 'next/link';

export function Header() {
  return (
    <header className="relative z-10">
      <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-6 py-5 sm:px-10 lg:px-12">
        <Link
          href="/"
          className="text-glow font-mono text-sm tracking-tight text-ink"
        >
          <span className="text-mint-strong">/1&gt;</span> Ship Check
        </Link>
        <nav className="flex items-center gap-4 text-sm text-ink/75">
          <span className="text-glow hidden sm:inline">idea2ship</span>
          <Link
            href="/privacy"
            className="text-glow underline-offset-4 hover:text-ink hover:underline"
          >
            Privacy
          </Link>
        </nav>
      </div>
    </header>
  );
}
