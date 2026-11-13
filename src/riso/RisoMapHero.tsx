import { useEffect, useRef, useState } from 'react';
import { createRisoMap, risoColorsFromCss } from './mapRenderer.ts';
import { useReducedMotion } from '../exercises/hooks.ts';

const BASE = import.meta.env.BASE_URL;

/**
 * The home screen's folded riso map, rendered live in WebGL. It breathes
 * slowly (a fold every ~11s). Reduced motion: one still frame. No WebGL:
 * a pre-rendered still. Decorative — hidden from assistive tech.
 */
export function RisoMapHero({ className = '' }: { className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const map = createRisoMap(el, risoColorsFromCss());
    if (!map) {
      setFallback(true);
      return;
    }
    let raf = 0;
    let last = 0;
    const start = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (now - last < 33) return; // ~30fps is plenty for motion this slow
      last = now;
      if (document.visibilityState === 'hidden') return;
      const t = (now - start) / 1000;
      map.render(0.36 + 0.14 * Math.sin((t * 2 * Math.PI) / 11), 0.24 * Math.sin((t * 2 * Math.PI) / 23), t);
    };
    const still = () => map.render(0.42, 0.2, 0);

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { map.resize(); if (reduced) still(); }) : null;
    ro?.observe(el);
    if (reduced) still();
    else raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      map.dispose();
    };
  }, [reduced]);

  return (
    <div className={`relative ${className}`} aria-hidden="true">
      {fallback ? (
        <picture>
          <source srcSet={`${BASE}riso/map-dark.webp`} media="(prefers-color-scheme: dark)" />
          <img src={`${BASE}riso/map-light.webp`} alt="" className="absolute inset-0 h-full w-full object-contain" />
        </picture>
      ) : (
        <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
      )}
    </div>
  );
}
