import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { flow, resources } from '../content.ts';
import { EMERGENCY_NUMBER } from '../constants/safety.ts';
import { QuickExit } from '../components/QuickExit.tsx';
import { LinkList, hotlineLinks } from '../components/LinkList.tsx';
import { useSession } from '../state/SessionProvider.tsx';
import { S, fmt } from '../strings.ts';

/**
 * Full-screen safety card for "Are you safe? — No".
 * The only ways out: the resources, Quick Exit, or "Back to the start".
 * No "continue anyway". Nothing here is stored, logged, or shareable, and
 * nothing here makes a sound.
 */
export function SafetyScreen({ nodeId }: { nodeId: string }) {
  const node = flow.nodes[nodeId]!;
  const heading = useRef<HTMLHeadingElement>(null);
  const navigate = useNavigate();
  const { clearMemory } = useSession();

  useEffect(() => heading.current?.focus(), []);

  const linkResources = (node.resources ?? [])
    .map((id) => resources.resources[id])
    .filter((r) => r?.type === 'links');

  // Memory only: "Back to the start" must not write to storage either.
  const backToStart = () => {
    clearMemory();
    navigate('/', { replace: true });
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-6 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <QuickExit prominent />

      <main className="flex flex-col gap-6" aria-labelledby="safety-title">
        <h1 id="safety-title" ref={heading} tabIndex={-1} className="text-outcome font-bold text-ink">
          {node.type === 'outcome' ? node.title : ''}
        </h1>

        <p className="rounded-soft bg-card p-4 text-lead font-bold text-ink shadow-soft">
          {fmt(S.safety.emergency, { number: EMERGENCY_NUMBER })}{' '}
          <a href={`tel:${EMERGENCY_NUMBER}`} className="text-accent-ink underline decoration-2 underline-offset-4">
            {fmt(S.safety.callEmergency, { number: EMERGENCY_NUMBER })}
          </a>
        </p>

        {linkResources.map((r) =>
          r && r.type === 'links' ? (
            <section key={r.label} className="flex flex-col gap-3">
              {r.intro && <p className="text-body text-ink-soft">{r.intro}</p>}
              <LinkList links={[...(r.hotline ? hotlineLinks() : []), ...r.links]} />
            </section>
          ) : null,
        )}
      </main>

      <div className="mt-auto pt-4">
        <button
          type="button"
          onClick={backToStart}
          className="w-full rounded-2xl border border-line bg-transparent px-6 py-4 text-body text-ink"
        >
          {S.safety.backToStart}
        </button>
      </div>
    </div>
  );
}
