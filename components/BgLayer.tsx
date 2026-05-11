'use client';

import { useEffect, useRef } from 'react';

/**
 * Renders the fixed-position background layer (the actual <div> that holds
 * the bg-image). Drives optional cursor parallax via a requestAnimationFrame
 * loop that lerps the current offset toward the target each frame.
 *
 * Why JS lerp instead of pure CSS transition:
 *   - On re-entry from outside the viewport, setting --cursor-x/y to a far
 *     value (e.g., +60px in a corner) made CSS transition cover the whole
 *     distance in one shot, which felt like a snap.
 *   - The lerp interpolates currentX/Y toward targetX/Y at SMOOTHING per
 *     frame, so the bg always glides regardless of how far the cursor jumps.
 */
export function BgLayer() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia('(hover: none)').matches) return;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let raf = 0;
    let pointerInside = false;

    // Per-frame closing factor. 0.09 takes ~25 frames (~420ms) to cover 90%
    // of any gap — slow enough to feel cinematic, fast enough to feel alive.
    const SMOOTHING = 0.09;
    const SETTLE_THRESHOLD = 0.15;

    const apply = () => {
      el.style.setProperty('--cursor-x', `${currentX.toFixed(2)}px`);
      el.style.setProperty('--cursor-y', `${currentY.toFixed(2)}px`);
    };

    const tick = () => {
      const dx = targetX - currentX;
      const dy = targetY - currentY;

      if (Math.abs(dx) < SETTLE_THRESHOLD && Math.abs(dy) < SETTLE_THRESHOLD) {
        currentX = targetX;
        currentY = targetY;
        apply();
        raf = 0;
        // Settled at origin with the pointer outside — drop the class so
        // the drift animation can take over again.
        if (!pointerInside && currentX === 0 && currentY === 0) {
          el.classList.remove('is-cursor-active');
        }
        return;
      }

      currentX += dx * SMOOTHING;
      currentY += dy * SMOOTHING;
      apply();
      raf = requestAnimationFrame(tick);
    };

    const ensureLoop = () => {
      if (raf === 0) {
        raf = requestAnimationFrame(tick);
      }
    };

    const onMove = (e: PointerEvent) => {
      // While the cursor is over a tilt-tracking result card we want the
      // card to react alone — pause bg parallax so they don't compete.
      if (document.body.dataset.cardHover === 'true') {
        pointerInside = true;
        return;
      }
      pointerInside = true;
      targetX = (e.clientX / window.innerWidth - 0.5) * 120;
      targetY = (e.clientY / window.innerHeight - 0.5) * 120;
      el.classList.add('is-cursor-active');
      ensureLoop();
    };

    const onLeave = () => {
      // Keep the target wherever the cursor last was — the bg should stay
      // in place when the cursor leaves the viewport. When the cursor
      // returns at a new position the lerp loop will glide it from this
      // resting offset to the new target.
      pointerInside = false;
    };

    window.addEventListener('pointermove', onMove);
    document.addEventListener('pointerleave', onLeave);
    window.addEventListener('blur', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onLeave);
      el.classList.remove('is-cursor-active');
    };
  }, []);

  return <div ref={ref} className="bg-layer" aria-hidden />;
}
