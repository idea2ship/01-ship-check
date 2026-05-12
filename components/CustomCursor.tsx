'use client';

import { motion, useMotionValue, useSpring } from 'framer-motion';
import { useEffect, useState } from 'react';

// Anything matching this selector triggers the "expanded ring" hover state.
// closest() walks ancestors, so nested labels/icons inside a <button> still
// register as the button.
const INTERACTIVE_SELECTOR =
  'a, button, summary, label[for], select, [role="button"], [contenteditable="true"]';

/**
 * Mint dot + spring-trailing ring cursor.
 *
 *   • Tiny solid dot tracks the pointer 1:1 (no lag — feels like the real
 *     cursor tip).
 *   • Larger outline ring follows via spring, creating a soft trail.
 *   • Ring expands over interactive elements, both layers shrink on press.
 *
 * Touch / coarse-pointer devices skip rendering entirely (the OS cursor
 * doesn't exist there to hide). When the component does mount it sets a
 * class on <html> that hides the native cursor site-wide; if JS never
 * runs, the class never appears and the OS cursor remains as fallback.
 */
export function CustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [pressed, setPressed] = useState(false);

  // Raw cursor position — drives the leading dot directly.
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Spring-smoothed for the trailing ring. Tuned to feel "weighted" without
  // ever dragging behind enough to feel laggy on quick flicks.
  const ringX = useSpring(x, { stiffness: 380, damping: 30, mass: 0.55 });
  const ringY = useSpring(y, { stiffness: 380, damping: 30, mass: 0.55 });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      return;
    }

    setEnabled(true);
    document.documentElement.classList.add('has-custom-cursor');

    const handleMove = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      setVisible(true);
    };
    const handleLeave = () => setVisible(false);
    const handleEnter = () => setVisible(true);
    const handleDown = () => setPressed(true);
    const handleUp = () => setPressed(false);
    const handleOver = (e: MouseEvent) => {
      const target = e.target as Element | null;
      setHovering(!!target?.closest?.(INTERACTIVE_SELECTOR));
    };

    window.addEventListener('mousemove', handleMove, { passive: true });
    document.addEventListener('mouseleave', handleLeave);
    document.addEventListener('mouseenter', handleEnter);
    window.addEventListener('mousedown', handleDown);
    window.addEventListener('mouseup', handleUp);
    document.addEventListener('mouseover', handleOver);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseleave', handleLeave);
      document.removeEventListener('mouseenter', handleEnter);
      window.removeEventListener('mousedown', handleDown);
      window.removeEventListener('mouseup', handleUp);
      document.removeEventListener('mouseover', handleOver);
      document.documentElement.classList.remove('has-custom-cursor');
    };
  }, [x, y]);

  if (!enabled) return null;

  const ringSize = hovering ? 44 : 28;
  const dotSize = pressed ? 4 : 7;
  const ringOpacity = visible ? (hovering ? 0.9 : 0.55) : 0;

  return (
    <>
      {/* Ring — translate via motion (transform on outer), then center via
          negative-margin on inner so the two transforms don't collide. */}
      <motion.div
        aria-hidden
        style={{ x: ringX, y: ringY }}
        className="pointer-events-none fixed left-0 top-0 z-[9999] will-change-transform"
      >
        <div
          style={{
            width: ringSize,
            height: ringSize,
            marginLeft: -ringSize / 2,
            marginTop: -ringSize / 2,
            opacity: ringOpacity,
          }}
          className="rounded-full border-[1.5px] border-mint-strong transition-[width,height,margin,opacity] duration-200 ease-out"
        />
      </motion.div>

      {/* Dot — same nesting pattern, no spring so it tracks the pointer 1:1. */}
      <motion.div
        aria-hidden
        style={{ x, y }}
        className="pointer-events-none fixed left-0 top-0 z-[9999] will-change-transform"
      >
        <div
          style={{
            width: dotSize,
            height: dotSize,
            marginLeft: -dotSize / 2,
            marginTop: -dotSize / 2,
            opacity: visible ? 1 : 0,
          }}
          className="rounded-full bg-mint-strong transition-[width,height,margin,opacity] duration-100 ease-out"
        />
      </motion.div>
    </>
  );
}
