function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/55 bg-white/35 ${className ?? ''}`}
    >
      <div
        aria-hidden
        className="animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/65 to-transparent"
      />
    </div>
  );
}

/**
 * Mirrors the new ResultCard layout so the page doesn't shift when the
 * skeleton swaps to the real result:
 *   image (4:3) → ship-type card → banner → 3 metrics → keep/cut + actions
 */
export function ResultSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="평가 결과를 만드는 중"
      className="animate-fade-in"
    >
      <article className="relative overflow-hidden rounded-[32px] border border-white/55 bg-white/45 p-5 shadow-[0_8px_32px_0_rgba(31,38,135,0.08)] backdrop-blur-2xl sm:p-7">
        {/* Image */}
        <SkeletonBlock className="mb-5 aspect-[4/3]" />

        {/* Ship type card */}
        <SkeletonBlock className="mb-3 h-[108px]" />

        {/* Banner */}
        <SkeletonBlock className="mb-3 h-12" />

        {/* 3 metrics */}
        <SkeletonBlock className="mb-3 h-[88px]" />

        {/* Two columns */}
        <div className="grid gap-3 sm:grid-cols-2">
          <SkeletonBlock className="h-32" />
          <SkeletonBlock className="h-32" />
        </div>
      </article>
    </div>
  );
}
