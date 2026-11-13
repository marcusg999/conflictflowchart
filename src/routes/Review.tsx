import { useState } from 'react';
import { flow, resources } from '../content.ts';
import { describeLoop, reviewIssues, reviewText, said } from '../lib/review.ts';
import { copyText } from '../lib/clipboard.ts';
import { routeFor } from '../state/SessionProvider.tsx';
import { S, fmt } from '../strings.ts';

/**
 * /review — for the therapist. Not linked from the app. The whole graph as a
 * readable list, grouped by phase, with every guess highlighted.
 */
export function Review() {
  const issues = reviewIssues(flow);
  const [status, setStatus] = useState('');
  const name = (id: string) => (
    <a href={`#${id}`} className="underline underline-offset-2">
      {said(flow.nodes[id]!)}
    </a>
  );
  const flag = 'rounded-soft border-2 border-dashed border-line-strong bg-coral-soft text-ink';

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8">
      <h1 className="riso-title text-hero">{S.review.title}</h1>
      <p className="mt-2 text-ink-soft">{S.review.intro}</p>
      <button
        type="button"
        onClick={async () => setStatus((await copyText(reviewText(flow, resources))) ? S.common.copied : S.common.copyFailed)}
        className="sticker sticker-blue mt-6 px-5 py-3 font-display font-bold"
      >
        {S.review.copy}
      </button>
      <span role="status" className="ml-3 text-small text-ink-soft">{status}</span>

      <section className={`mt-8 p-5 ${flag}`} aria-labelledby="attention">
        <h2 id="attention" className="font-display text-lead font-bold">{S.review.attention}</h2>
        {issues.noInbound.length > 0 && (
          <>
            <p className="mt-3 font-bold">{S.review.noInbound}</p>
            <ul className="list-disc pl-6">{issues.noInbound.map((id) => <li key={id}>{name(id)} <code className="text-small">({id})</code></li>)}</ul>
          </>
        )}
        {issues.unreachable.length > 0 && (
          <>
            <p className="mt-3 font-bold">{fmt(S.review.unreachable, { count: String(issues.unreachable.length) })}</p>
            <ul className="list-disc pl-6">{issues.unreachable.map((id) => <li key={id}>{name(id)}</li>)}</ul>
          </>
        )}
        {issues.loops.length > 0 && (
          <>
            <p className="mt-3 font-bold">{S.review.loops}</p>
            <ul className="list-disc pl-6">{issues.loops.map((l) => <li key={l.join()}>{describeLoop(flow, l)}</li>)}</ul>
          </>
        )}
      </section>

      {flow.phases.map((phase) => (
        <section key={phase.id} className="mt-10" aria-labelledby={`ph-${phase.id}`}>
          <h2 id={`ph-${phase.id}`} className="riso-display border-b-[3px] border-line-strong pb-2 text-question font-bold">{phase.title}</h2>
          <ul className="mt-4 flex flex-col gap-4">
            {Object.entries(flow.nodes)
              .filter(([, n]) => n.phase === phase.id)
              .map(([id, n]) => (
                <li key={id} id={id} className={`p-4 ${n.confirmed ? 'rounded-soft border-2 border-line-strong bg-card' : flag}`}>
                  <p className="text-small text-ink-soft">
                    <code>{id}</code> · {n.type}
                    {n.type === 'outcome' && ` · ${n.tone}`}
                    {!n.confirmed && <strong> · {S.review.unconfirmed}</strong>}
                    {' · '}
                    <span>{routeFor(id)}</span>
                  </p>
                  <p className="mt-1 text-lead font-bold">{said(n)}</p>
                  {n.type === 'question' && n.help && <p className="text-ink-soft">{n.help}</p>}
                  {n.type === 'outcome' && n.body && <p>{n.body}</p>}
                  {n.type === 'question' ? (
                    <ul className="mt-2 flex flex-col gap-1">
                      {n.choices.map((c) => (
                        <li key={c.label}>
                          <strong>{c.label}</strong> {S.review.goesTo} {name(c.next)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2">{n.continue ? <>{S.review.continuesTo} {name(n.continue)}</> : S.review.ending}</p>
                  )}
                  {n.resources?.length ? (
                    <p className="mt-2 text-small">{S.review.resources}: {n.resources.map((r) => resources.resources[r]?.label ?? r).join(', ')}</p>
                  ) : null}
                  {!n.confirmed && n.note && <p className="mt-2 font-bold">{n.note}</p>}
                </li>
              ))}
          </ul>
        </section>
      ))}

      <section className="mt-10" aria-labelledby="res-title">
        <h2 id="res-title" className="riso-display border-b-[3px] border-line-strong pb-2 text-question font-bold">{S.review.resourcesTitle}</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {Object.entries(resources.resources).map(([id, r]) => (
            <li key={id} className={`p-4 ${r.confirmed ? 'rounded-soft border-2 border-line-strong bg-card' : flag}`}>
              <p className="font-bold">{r.label} <code className="text-small font-normal">({id}, {r.type})</code></p>
              {r.note && <p className="text-small">{r.note}</p>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
