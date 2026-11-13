import { flushSync } from 'react-dom';
import { leaveNow } from '../lib/quickExit.ts';
import { useSession } from '../state/SessionProvider.tsx';
import { S } from '../strings.ts';

/**
 * Always on screen. Clears the session from memory first (synchronously),
 * then leaves via location.replace() so there is no back-button trail.
 */
export function QuickExit({ prominent = false }: { prominent?: boolean }) {
  const { clearMemory } = useSession();
  const exit = () => {
    flushSync(() => clearMemory());
    leaveNow();
  };
  return (
    <button
      type="button"
      onClick={exit}
      aria-describedby="quick-exit-hint"
      className={
        prominent
          ? 'w-full rounded-2xl bg-ink px-6 py-4 text-lead font-bold text-paper shadow-soft active:scale-[0.99]'
          : 'rounded-full border-2 border-ink bg-card px-4 py-2 text-small font-bold text-ink shadow-soft active:scale-[0.98]'
      }
    >
      {S.quickExit.label}
      <span id="quick-exit-hint" className="sr-only">
        {' '}
        {S.quickExit.hint}
      </span>
    </button>
  );
}
