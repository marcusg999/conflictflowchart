import { useNavigate } from 'react-router';
import { routeFor, useSession } from '../state/SessionProvider.tsx';
import { BackArrow } from './Marks.tsx';
import { S } from '../strings.ts';

/** One step back: undo the last answer and return to that question. */
export function BackButton() {
  const { state, rewind } = useSession();
  const navigate = useNavigate();
  const last = state.path.length - 1;
  if (last < 0) return null;
  const goBack = () => {
    const entry = state.path[last]!;
    rewind(last);
    navigate(routeFor(entry.nodeId), { replace: true });
  };
  return (
    <button
      type="button"
      onClick={goBack}
      aria-label={S.question.backLabel}
      className="inline-flex items-center gap-1.5 rounded-full border-2 border-line-strong bg-card px-3.5 py-1.5 font-display text-small font-bold text-ink"
    >
      <BackArrow className="h-4 w-5" />
      {S.question.back}
    </button>
  );
}
