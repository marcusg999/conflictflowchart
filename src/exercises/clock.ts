import type { BreathPattern, Phase } from './patterns.ts';

/**
 * The single clock for an exercise. Both the animation and the audio read
 * their position from frameAt(), so they can never drift apart.
 */
export type Frame = {
  cycle: number;
  /** Index of the phase within its cycle. */
  index: number;
  phase: Phase;
  /** 0..1 through the current phase. */
  progress: number;
  /** Breath level 0..1 after easing. */
  level: number;
  /** Seconds left in this phase. */
  remaining: number;
};

const sine = (p: number) => 0.5 - 0.5 * Math.cos(Math.PI * p);
const easeInSine = (p: number) => 1 - Math.cos((Math.PI * p) / 2);

/** In-breath: a slow, even ease in and out. */
export function easeIn(p: number): number {
  return sine(p);
}

/**
 * Out-breath: starts as gently as the in-breath but lands far more slowly, with
 * a long soft tail — so it feels longer and softer even when the count is equal.
 */
export function easeOut(p: number): number {
  return 1 - Math.pow(1 - easeInSine(p), 2.4);
}

function levelFor(phase: Phase, p: number): number {
  if (phase.from === phase.to) return phase.to; // holds are genuinely still
  const rising = phase.to > phase.from;
  const t = rising ? easeIn(p) : easeOut(p);
  return phase.from + (phase.to - phase.from) * t;
}

export function frameAt(pattern: BreathPattern, elapsedSeconds: number): Frame {
  let t = Math.max(0, elapsedSeconds);
  // Patterns are short; walking cycles is cheap and handles cycles that change length.
  for (let cycle = 0; cycle < 100000; cycle++) {
    const phases = pattern.phasesFor(cycle);
    const length = phases.reduce((s, p) => s + p.seconds, 0);
    if (t >= length) {
      t -= length;
      continue;
    }
    for (let index = 0; index < phases.length; index++) {
      const phase = phases[index]!;
      if (t < phase.seconds) {
        const progress = t / phase.seconds;
        return { cycle, index, phase, progress, level: levelFor(phase, progress), remaining: phase.seconds - t };
      }
      t -= phase.seconds;
    }
  }
  const phase = pattern.phasesFor(0)[0]!;
  return { cycle: 0, index: 0, phase, progress: 0, level: phase.from, remaining: phase.seconds };
}

export type Clock = { elapsed: () => number };

export function createClock(now: () => number = () => performance.now()): Clock {
  const start = now();
  return { elapsed: () => (now() - start) / 1000 };
}
