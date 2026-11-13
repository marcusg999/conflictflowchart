import { useEffect, useRef, useState } from 'react';
import { createClock, frameAt } from './clock.ts';
import { PATTERNS, type BreathPattern, type PhaseKind } from './patterns.ts';
import { BreathSound, getAudioContext } from './audio.ts';
import { useReducedMotion, vibrate } from './hooks.ts';
import { S } from '../strings.ts';

/** Corners of the square, clockwise from bottom-left, as fractions of its size. */
const CORNERS: [number, number][] = [
  [-0.5, 0.5],
  [-0.5, -0.5],
  [0.5, -0.5],
  [0.5, 0.5],
];

/**
 * One soft, luminous orb that breathes. Breath-synced elements are driven from
 * the shared clock in a single requestAnimationFrame loop, animating only
 * transform and opacity. React re-renders only when the phase changes.
 */
export function BreathingExercise({
  id,
  sound,
  haptics,
  onSoundEngine,
}: {
  id: BreathPattern['id'];
  /** Whether sound should play. Audio starts only if a tap already created the context. */
  sound: boolean;
  haptics: boolean;
  onSoundEngine?: (engine: BreathSound | null) => void;
}) {
  const pattern = PATTERNS[id];
  const reduced = useReducedMotion();
  const [cue, setCue] = useState<PhaseKind>(pattern.phasesFor(0)[0]!.kind);

  const orb = useRef<HTMLDivElement>(null);
  const cool = useRef<HTMLDivElement>(null);
  const ripple = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);
  const engine = useRef<BreathSound | null>(null);
  const hapticsRef = useRef(haptics);
  hapticsRef.current = haptics;

  // Sound: one engine per exercise, created from the existing (tap-created) context.
  useEffect(() => {
    if (!sound) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    let e: BreathSound | null = null;
    try {
      e = new BreathSound(ctx);
    } catch {
      e = null; // run silent
    }
    engine.current = e;
    onSoundEngine?.(e);
    return () => {
      e?.dispose();
      engine.current = null;
      onSoundEngine?.(null);
    };
  }, [sound, id, onSoundEngine]);

  useEffect(() => {
    const clock = createClock();
    let raf = 0;
    let lastKey = '';
    const tick = () => {
      const f = frameAt(pattern, clock.elapsed());
      const key = `${f.cycle}:${f.index}`;
      if (key !== lastKey) {
        const first = lastKey === '';
        lastKey = key;
        setCue(f.phase.kind);
        engine.current?.phase(f.phase.kind, f.phase.to, f.phase.seconds, { bell: !first });
        if (!first && hapticsRef.current) vibrate(25);
      }

      const lvl = f.level;
      if (orb.current) {
        if (reduced) {
          // Still shape: no scaling. Breath carried by opacity and colour only.
          orb.current.style.transform = 'none';
          orb.current.style.opacity = String(0.45 + 0.55 * lvl);
        } else {
          orb.current.style.transform = `scale(${(0.52 + 0.48 * lvl).toFixed(4)})`;
          orb.current.style.opacity = '1';
        }
      }
      // Cooler and brighter toward the top of the in-breath, warmer at the bottom. Slight.
      if (cool.current) cool.current.style.opacity = (lvl * 0.85).toFixed(3);

      if (ripple.current) {
        if (!reduced && f.phase.kind === 'out') {
          const p = f.progress;
          ripple.current.style.transform = `scale(${(1 + 0.55 * p).toFixed(4)})`;
          ripple.current.style.opacity = ((1 - p) * 0.35 * Math.min(1, p * 8)).toFixed(3);
        } else {
          ripple.current.style.opacity = '0';
        }
      }

      if (dot.current && id === 'box-breathing' && !reduced) {
        const [ax, ay] = CORNERS[f.index % 4]!;
        const [bx, by] = CORNERS[(f.index + 1) % 4]!;
        const p = f.progress;
        dot.current.style.transform = `translate(${((ax + (bx - ax) * p) * 100).toFixed(2)}%, ${((ay + (by - ay) * p) * 100).toFixed(2)}%)`;
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pattern, reduced, id]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 py-4">
      <div className="relative aspect-square w-[min(72vw,300px)]" aria-hidden="true">
        {id === 'box-breathing' && (
          <>
            <div className="absolute inset-[4%] rounded-[8%] border-2 border-line" />
            {!reduced && (
              <div className="absolute inset-[4%]">
                <div ref={dot} className="absolute left-1/2 top-1/2 h-0 w-full" style={{ willChange: 'transform' }}>
                  <span className="absolute -left-2 -top-2 h-4 w-4 rounded-full bg-accent" />
                </div>
              </div>
            )}
          </>
        )}
        <div
          ref={ripple}
          className="absolute inset-[14%] rounded-full border-2 border-accent opacity-0"
          style={{ willChange: 'transform, opacity' }}
        />
        <div ref={orb} className="absolute inset-[14%]" style={{ willChange: 'transform, opacity' }}>
          <div className="absolute inset-0 rounded-full" style={{ background: 'var(--orb-warm)' }} />
          <div ref={cool} className="absolute inset-0 rounded-full opacity-0" style={{ background: 'var(--orb-cool)' }} />
        </div>
      </div>

      <p className="text-center text-question font-bold text-ink" aria-hidden="true">
        {S.exercise.cues[cue]}
      </p>
      {/* Polite announcements for screen readers on each phase change. */}
      <p className="sr-only" aria-live="polite" data-testid="phase-live">
        {S.exercise.cues[cue]}
      </p>
    </div>
  );
}
