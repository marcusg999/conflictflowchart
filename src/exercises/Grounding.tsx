import { useEffect, useRef, useState } from 'react';
import { S } from '../strings.ts';

/**
 * 5-4-3-2-1 sensory grounding. One prompt per screen, tap anywhere to move on.
 * No text input, nothing recorded, no "done" state.
 */
export function Grounding() {
  const steps = S.exercise.grounding.steps;
  const [i, setI] = useState(0);
  const last = i === steps.length - 1;
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => ref.current?.focus({ preventScroll: true }), []);

  return (
    <div className="flex flex-1 flex-col gap-4 py-4">
      <button
        ref={ref}
        type="button"
        onClick={() => !last && setI(i + 1)}
        aria-disabled={last}
        className="flex flex-1 flex-col items-center justify-center rounded-soft px-4 text-center"
      >
        <span key={i} className="fade-in riso-title text-outcome" aria-live="polite">
          {steps[i]}
        </span>
        {!last && <span className="mt-6 text-small text-ink-soft">{S.exercise.grounding.tapToContinue}</span>}
      </button>
      {last && (
        <button type="button" onClick={() => setI(0)} className="self-center rounded-lg px-3 py-2 text-body text-accent-ink underline underline-offset-4">
          {S.exercise.grounding.again}
        </button>
      )}
    </div>
  );
}
