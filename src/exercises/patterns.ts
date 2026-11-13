import type { ExerciseId } from '../schema/resources.ts';

export type PhaseKind = 'in' | 'in2' | 'hold' | 'out' | 'rest';

/** One step of a breath. `from`/`to` are breath levels: 0 = empty, 1 = full. */
export type Phase = { kind: PhaseKind; seconds: number; from: number; to: number };

export type BreathPattern = {
  id: Exclude<ExerciseId, 'grounding-54321'>;
  /** Phases for a given cycle (0-based). Lets a pattern change as it goes. */
  phasesFor: (cycle: number) => Phase[];
};

export const PATTERNS: Record<BreathPattern['id'], BreathPattern> = {
  // Two breaths in through the nose — a full one, then a small top-up — then a
  // long, slow breath out. The second catch is the technique; it must be visible.
  'physiological-sigh': {
    id: 'physiological-sigh',
    phasesFor: () => [
      { kind: 'in', seconds: 1.9, from: 0, to: 0.78 },
      { kind: 'in2', seconds: 0.9, from: 0.78, to: 1 },
      { kind: 'out', seconds: 6.5, from: 1, to: 0 },
      { kind: 'rest', seconds: 2, from: 0, to: 0 },
    ],
  },
  // In 4, hold 4, out 4, hold 4. One side of the square per phase.
  'box-breathing': {
    id: 'box-breathing',
    phasesFor: () => [
      { kind: 'in', seconds: 4, from: 0, to: 1 },
      { kind: 'hold', seconds: 4, from: 1, to: 1 },
      { kind: 'out', seconds: 4, from: 1, to: 0 },
      { kind: 'hold', seconds: 4, from: 0, to: 0 },
    ],
  },
  // In 4, out 6, the out-breath lengthening to 8. The in-breath never changes.
  'extended-exhale': {
    id: 'extended-exhale',
    phasesFor: (cycle) => [
      { kind: 'in', seconds: 4, from: 0, to: 1 },
      { kind: 'out', seconds: Math.min(8, 6 + cycle * 0.5), from: 1, to: 0 },
      { kind: 'rest', seconds: 0.6, from: 0, to: 0 },
    ],
  },
};
