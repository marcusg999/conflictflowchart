import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { flow } from '../content.ts';
import { Shell } from '../components/Shell.tsx';
import { Trail } from '../components/Trail.tsx';
import { ResourceChips } from '../components/ResourceChips.tsx';
import { routeFor, useSession } from '../state/SessionProvider.tsx';
import { composeShareText } from '../lib/share.ts';
import { shareOrCopy, copyText } from '../lib/clipboard.ts';
import { getPrefs } from '../state/prefs.ts';
import type { Tone } from '../schema/flow.ts';
import { S } from '../strings.ts';

const toneStyles: Record<Exclude<Tone, 'safety'>, { card: string; title: string }> = {
  // Soft accent wash: a breath, a pause.
  calm: { card: 'bg-accent-soft', title: 'text-ink' },
  // Plain card, accent rule: something to go and do.
  action: { card: 'bg-card border-l-4 border-accent', title: 'text-ink' },
  // No colour, no flourish. Plain words, room around them.
  hard: { card: 'bg-transparent', title: 'text-ink' },
};

export function OutcomeScreen({ nodeId }: { nodeId: string }) {
  const node = flow.nodes[nodeId]!;
  const session = useSession();
  const navigate = useNavigate();
  const heading = useRef<HTMLHeadingElement>(null);
  const [status, setStatus] = useState('');

  useEffect(() => heading.current?.focus({ preventScroll: true }), []);

  if (node.type !== 'outcome' || node.tone === 'safety') return null;
  const tone = toneStyles[node.tone];
  const isHard = node.tone === 'hard';

  const keepGoing = (next: string) => {
    session.continueFrom(nodeId);
    navigate(routeFor(next), { replace: true });
  };

  const share = async () => {
    const text = composeShareText(flow, session.state, { date: new Date(), therapistName: getPrefs().therapistName });
    if (!text) return;
    const result = await shareOrCopy(S.share.title, text);
    setStatus(result === 'copied' ? S.share.copiedFallback : result === 'failed' ? S.common.copyFailed : '');
  };

  const startOver = () => {
    session.startFresh();
    navigate('/', { replace: true });
  };

  const putDown = () => {
    session.clearMemory();
    navigate('/', { replace: true, state: { putDown: true } });
  };

  return (
    <Shell>
      <Trail />
      <main className="screen-in flex flex-1 flex-col" aria-labelledby={`o-${nodeId}`}>
        <div className={`mt-6 flex flex-col gap-4 rounded-soft ${isHard ? 'py-10' : 'p-6 shadow-soft'} ${tone.card}`}>
          <h1 id={`o-${nodeId}`} ref={heading} tabIndex={-1} className={`text-outcome font-bold ${tone.title}`}>
            {node.title}
          </h1>
          {node.body && <p className="text-lead text-ink">{node.body}</p>}
        </div>

        {node.stems && node.stems.length > 0 && <Stems stems={node.stems} />}

        <div className="mt-6">
          <ResourceChips ids={node.resources ?? []} />
        </div>

        <div className="mt-auto flex flex-col gap-4 pt-10">
          {node.continue ? (
            <button
              type="button"
              onClick={() => keepGoing(node.continue!)}
              className="min-h-16 w-full rounded-soft bg-accent px-6 py-4 text-lead font-bold text-on-accent shadow-soft"
            >
              {S.outcome.continue}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={share}
                className="min-h-16 w-full rounded-soft border-2 border-line bg-card px-6 py-4 text-lead font-bold text-ink shadow-soft"
              >
                {S.outcome.share}
              </button>
              <p role="status" className="min-h-6 text-small text-ink-soft">
                {status}
              </p>
              <button type="button" onClick={startOver} className="mt-4 self-center rounded-lg px-3 py-2 text-body text-ink-soft underline underline-offset-4">
                {S.outcome.startOver}
              </button>
            </>
          )}
        </div>
      </main>
      {node.continue && (
        <footer className="mt-8 flex justify-center">
          <button type="button" onClick={putDown} className="rounded-lg px-3 py-2 text-small text-ink-soft underline-offset-4 hover:underline">
            {S.question.putDown}
          </button>
        </footer>
      )}
    </Shell>
  );
}

function Stems({ stems }: { stems: string[] }) {
  const [copied, setCopied] = useState<number | null>(null);
  return (
    <section className="mt-6 flex flex-col gap-2" aria-labelledby="stems-title">
      <h2 id="stems-title" className="text-body font-bold">{S.outcome.stemsTitle}</h2>
      <p className="text-small text-ink-soft">{S.outcome.stemsHelp}</p>
      <ul className="flex flex-col gap-2">
        {stems.map((stem, i) => (
          <li key={stem}>
            <button
              type="button"
              onClick={async () => setCopied((await copyText(stem)) ? i : null)}
              className="w-full rounded-xl border border-line bg-card px-4 py-3 text-left text-body"
            >
              “{stem}”
              {copied === i && <span className="ml-2 text-small text-ink-soft">{S.common.copied}</span>}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
