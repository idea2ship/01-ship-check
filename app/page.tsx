import { Header } from '@/components/Header';
import { ShipCheck } from '@/components/ShipCheck';

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col">
      <Header />
      <div className="flex-1">
        <ShipCheck />
      </div>
      <footer className="relative z-10">
        <div className="mx-auto w-full max-w-[1400px] px-6 pb-6 font-mono text-xs text-ink/65 sm:px-10 lg:px-12">
          <span className="text-glow">
            idea2ship · Turning ideas into small products, one week at a time.
          </span>
        </div>
      </footer>
    </main>
  );
}
