import { useId, useState } from 'react';
import { useNavigate } from 'react-router';
import { flow } from '../content.ts';
import { routeFor, useSession } from '../state/SessionProvider.tsx';
import { S } from '../strings.ts';

/**
 * "How I got here": the answers so far, printed like a receipt. Collapsed by
 * default. Tapping a line goes back to that question; everything after it is dropped.
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
        className="inline-flex items-center gap-2 self-start rounded-full px-1 py-1.5 font-display text-small font-bold text-ink-soft"
      >
        <span aria-hidden="true" className={`inline-block transition-transform motion-reduce:transition-none ${open ? 'rotate-90' : ''}`}>
          ▸
        </span>
        {open ? S.question.trailHide : S.question.trailShow}
      </button>
      {open && (
        <div id={panelId} className="fade-in receipt mt-1 px-4 pb-6 pt-3">
          {state.path.length === 0 ? (
            <p className="py-2 text-small text-ink-soft">{S.question.trailEmpty}</p>
          ) : (
            <ol className="flex flex-col">
              {state.path.map((entry, i) => {
                const node = flow.nodes[entry.nodeId]!;
                const said = node.type === 'question' ? node.prompt : node.title;
                return (
                  <li key={`${i}-${entry.nodeId}`} className="border-b border-dashed border-line last:border-0">
                    <button type="button" onClick={() => goBackTo(i)} className="flex w-full gap-3 rounded-lg px-1 py-2.5 text-left">
                      <span aria-hidden="true" className="riso-display pt-0.5 text-small font-bold text-coral">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="flex-1">
                        <span className="block text-small text-ink-soft">{said}</span>
                        <span className="block font-display text-body font-bold text-ink">{entry.choiceLabel ?? S.question.trailTookBreak}</span>
                        <span className="sr-only">. {S.question.trailChange}</span>
                      </span>
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
