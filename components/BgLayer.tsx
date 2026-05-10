'use client';

import { useEffect } from 'react';

/**
 * Background image is rendered directly on <body> via CSS. This component
 * adds an optional cursor-driven parallax: it sets --cursor-x/y on <body>
 * and pauses the drift animation while the user is moving the pointer.
 * Returns no DOM — pure side-effect.
 */
export function BgLayer() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia('(hover: none)').matches) return;

    const body = document.body;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        // -0.5..0.5 → -1..1 → scale to ±60px on each axis.
        const x = (e.clientX / window.innerWidth - 0.5) * 120;
        const y = (e.clientY / window.innerHeight - 0.5) * 120;
        body.style.setProperty('--cursor-x', `${x}px`);
        body.style.setProperty('--cursor-y', `${y}px`);
        body.classList.add('is-cursor-active');
      });
    };

    const onLeave = () => {
      body.classList.remove('is-cursor-active');
    };

    window.addEventListener('pointermove', onMove);
    document.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      body.classList.remove('is-cursor-active');
    };
  }, []);

  return null;
}
