function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/55 bg-white/35 backdrop-blur-sm ${className ?? ''}`}
    >
      <div
        aria-hidden
        className="animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/65 to-transparent"
      />
    </div>
  );
}

export function ResultSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="평가 결과를 만드는 중"
      className="animate-fade-in space-y-3"
    >
      <SkeletonBlock className="h-20" />
      <div className="grid grid-cols-2 gap-3">
        <SkeletonBlock className="h-24" />
        <SkeletonBlock className="h-24" />
      </div>
      <SkeletonBlock className="h-16" />
      <SkeletonBlock className="h-28" />
      <SkeletonBlock className="h-20" />
      <SkeletonBlock className="h-24" />
    </div>
  );
}
