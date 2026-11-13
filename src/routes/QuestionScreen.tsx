import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { flow } from '../content.ts';
import { Shell } from '../components/Shell.tsx';
import { Trail } from '../components/Trail.tsx';
import { BackButton } from '../components/BackButton.tsx';
import { ResourceChips } from '../components/ResourceChips.tsx';
import { Arrow } from '../components/Marks.tsx';
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
  const phase = flow.phases.find((p) => p.id === node.phase);

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
    <Shell left={<BackButton />}>
      <main className="flex flex-1 flex-col" aria-labelledby={`q-${nodeId}`}>
        <div className="relative pt-7">
          {phase && (
            <p className="stamp absolute right-0 top-2">
              <span className="tab">{phase.title}</span>
            </p>
          )}
          <h1
            id={`q-${nodeId}`}
            ref={heading}
            tabIndex={-1}
            className="riso-question stamp stamp-2 -ml-0.5 mt-6 pr-6 text-question"
          >
            {node.prompt}
          </h1>
          {node.help && (
            <p className="stamp stamp-3 ml-[12%] mt-4 border-l-4 border-coral pl-3 text-lead text-ink-soft">{node.help}</p>
          )}
          <div className="stamp stamp-4 ml-[12%] mt-2">
            <ResourceChips ids={node.resources ?? []} />
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-4 pt-10" role="group" aria-labelledby={`q-${nodeId}`}>
          {node.choices.map((c, i) => (
            <button
              key={c.label}
              type="button"
              onClick={() => choose(c.label, c.next)}
              className={`sticker stamp ${i % 2 ? 'sticker-tilt-r stamp-3' : 'sticker-tilt-l stamp-2'} flex min-h-16 w-full items-center justify-between gap-3 px-6 py-4 text-left font-display text-lead font-bold`}
            >
              {c.label}
              <Arrow className="h-5 w-9 shrink-0 text-blue" />
            </button>
          ))}
        </div>
      </main>

      <footer className="mt-8 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <Trail />
        </div>
        <button type="button" onClick={putDown} className="rounded-lg px-1 py-1.5 text-small text-ink-soft underline decoration-coral decoration-2 underline-offset-4">
          {S.question.putDown}
        </button>
      </footer>
    </Shell>
  );
}
