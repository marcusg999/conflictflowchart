import { useId } from 'react';
import { flushSync } from 'react-dom';
import { leaveNow } from '../lib/quickExit.ts';
import { useSession } from '../state/SessionProvider.tsx';
import { S } from '../strings.ts';

/**
 * Always on screen. Clears the session from memory first (synchronously),
 * then leaves via location.replace() so there is no back-button trail.
 * Deliberately not playful: solid ink, no tilt, no second plate.
 */
export function QuickExit({ prominent = false }: { prominent?: boolean }) {
  const { clearMemory } = useSession();
  const hintId = useId();
  const exit = () => {
    flushSync(() => clearMemory());
    leaveNow();
  };
  return (
    <button
      type="button"
      onClick={exit}
      aria-describedby={hintId}
      className={
        prominent
          ? 'w-full rounded-2xl bg-ink px-6 py-4 font-display text-lead font-bold text-paper'
          : 'rounded-full bg-ink px-4 py-2 font-display text-small font-bold tracking-wide text-paper'
      }
    >
      {S.quickExit.label}
      {/* Referenced by aria-describedby: read as a description, not as part of the name. */}
      <span id={hintId} hidden>
        {S.quickExit.hint}
      </span>
    </button>
  );
}
