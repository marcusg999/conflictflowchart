import { useId, useState } from 'react';
import { useNavigate } from 'react-router';
import { flow } from '../content.ts';
import { routeFor, useSession } from '../state/SessionProvider.tsx';
import { S } from '../strings.ts';

/**
 * "How I got here": the answers so far, collapsed by default.
 * Tapping one goes back to that question; everything after it is dropped.
 */
export function Trail() {
  const { state, rewind } = useSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const panelId = useId();

  const goBackTo = (index: number) => {
    const entry = state.path[index]!;
    rewind(index);
    navigate(routeFor(entry.nodeId), { replace: true });
  };

  return (
    <div className="flex flex-col">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 self-start rounded-lg py-2 text-small text-ink-soft"
      >
        <span aria-hidden="true" className={`inline-block transition-transform motion-reduce:transition-none ${open ? 'rotate-90' : ''}`}>
          ›
        </span>
        {open ? S.question.trailHide : S.question.trailShow}
      </button>
      {open && (
        <div id={panelId} className="fade-in">
          {state.path.length === 0 ? (
            <p className="py-2 text-small text-ink-soft">{S.question.trailEmpty}</p>
          ) : (
            <ol className="flex flex-col gap-2 border-l-2 border-line py-2 pl-4">
              {state.path.map((entry, i) => {
                const node = flow.nodes[entry.nodeId]!;
                const said = node.type === 'question' ? node.prompt : node.title;
                return (
                  <li key={`${i}-${entry.nodeId}`}>
                    <button
                      type="button"
                      onClick={() => goBackTo(i)}
                      className="w-full rounded-xl px-2 py-2 text-left hover:bg-paper-deep"
                    >
                      <span className="block text-small text-ink-soft">{said}</span>
                      <span className="block text-body font-bold text-ink">
                        {entry.choiceLabel ?? S.question.trailTookBreak}
                      </span>
                      <span className="sr-only">. {S.question.trailChange}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
