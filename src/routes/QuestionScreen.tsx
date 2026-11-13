import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { flow } from '../content.ts';
import { Shell } from '../components/Shell.tsx';
import { Trail } from '../components/Trail.tsx';
import { ResourceChips } from '../components/ResourceChips.tsx';
import { routeFor, useSession } from '../state/SessionProvider.tsx';
import { S } from '../strings.ts';

/** One question per screen. Answers sit in the bottom third, in thumb reach. */
export function QuestionScreen({ nodeId }: { nodeId: string }) {
  const node = flow.nodes[nodeId]!;
  const { answer, clearMemory } = useSession();
  const navigate = useNavigate();
  const heading = useRef<HTMLHeadingElement>(null);

  // Move focus to the new question so screen readers announce it.
  useEffect(() => heading.current?.focus({ preventScroll: true }), []);

  if (node.type !== 'question') return null;

  const choose = (label: string, next: string) => {
    answer(nodeId, label);
    navigate(routeFor(next), { replace: true });
  };

  const putDown = () => {
    // The walk is already saved after every answer; this just leaves, kindly.
    clearMemory();
    navigate('/', { replace: true, state: { putDown: true } });
  };

  return (
    <Shell>
      <Trail />
      <main className="screen-in flex flex-1 flex-col" aria-labelledby={`q-${nodeId}`}>
        <div className="flex flex-col gap-3 pt-6">
          <h1 id={`q-${nodeId}`} ref={heading} tabIndex={-1} className="text-question font-bold text-ink">
            {node.prompt}
          </h1>
          {node.help && <p className="text-lead text-ink-soft">{node.help}</p>}
          <ResourceChips ids={node.resources ?? []} />
        </div>

        <div className="mt-auto flex flex-col gap-4 pt-10" role="group" aria-labelledby={`q-${nodeId}`}>
          {node.choices.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => choose(c.label, c.next)}
              className="min-h-16 w-full rounded-soft border-2 border-line bg-card px-6 py-4 text-left text-lead font-bold text-ink shadow-soft transition-colors hover:border-accent active:bg-accent-soft motion-reduce:transition-none"
            >
              {c.label}
            </button>
          ))}
        </div>
      </main>

      <footer className="mt-8 flex justify-center">
        <button type="button" onClick={putDown} className="rounded-lg px-3 py-2 text-small text-ink-soft underline-offset-4 hover:underline">
          {S.question.putDown}
        </button>
      </footer>
    </Shell>
  );
}
