import { useEffect, useRef } from 'react';
import { EMERGENCY_NUMBER } from '../constants/safety.ts';
import { LinkList, hotlineLinks } from '../components/LinkList.tsx';
import { setPrefs, usePrefs } from '../state/prefs.ts';
import { S, fmt } from '../strings.ts';

/** First launch only (skippable); re-readable from About. Says once what this is and isn't. */
export function Intro({ onDone }: { onDone: () => void }) {
  const prefs = usePrefs();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus({ preventScroll: true }), []);
  const name = prefs.therapistName.trim();

  return (
    <main className="screen-in flex flex-1 flex-col gap-8 pt-4" aria-labelledby="intro-title">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-small font-bold uppercase tracking-wider text-ink-soft">{S.intro.eyebrow}</p>
          <h1 id="intro-title" ref={heading} tabIndex={-1} className="mt-1 text-question font-bold">
            {S.app.name}
          </h1>
        </div>
        <button type="button" onClick={onDone} className="shrink-0 rounded-lg px-3 py-2 text-small text-ink-soft underline underline-offset-4">
          {S.intro.skip}
        </button>
      </div>

      <section className="flex flex-col gap-1">
        <h2 className="text-lead font-bold">{S.intro.whatTitle}</h2>
        <p>{name ? fmt(S.intro.whatTherapist, { name }) : S.intro.whatBody}</p>
      </section>

      <section className="flex flex-col gap-1">
        <h2 className="text-lead font-bold">{S.intro.notTitle}</h2>
        <p>{S.intro.notBody}</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lead font-bold">{S.intro.dangerTitle}</h2>
        <p className="font-bold">
          {fmt(S.safety.emergency, { number: EMERGENCY_NUMBER })}{' '}
          <a href={`tel:${EMERGENCY_NUMBER}`} className="text-accent-ink underline underline-offset-4">
            {fmt(S.safety.callEmergency, { number: EMERGENCY_NUMBER })}
          </a>
        </p>
        <LinkList links={hotlineLinks()} />
      </section>

      <section className="flex flex-col gap-1">
        <h2 className="text-lead font-bold">{S.intro.privacyTitle}</h2>
        <p>{S.intro.privacyBody}</p>
      </section>

      <section className="flex flex-col gap-2">
        <label htmlFor="therapist-name" className="text-body font-bold">
          {S.intro.nameLabel}
        </label>
        <input
          id="therapist-name"
          type="text"
          autoComplete="off"
          maxLength={80}
          value={prefs.therapistName}
          onChange={(e) => setPrefs({ therapistName: e.target.value })}
          aria-describedby="therapist-name-help"
          className="rounded-xl border-2 border-line bg-card px-4 py-3 text-body text-ink"
        />
        <p id="therapist-name-help" className="text-small text-ink-soft">
          {S.intro.nameHelp}
        </p>
      </section>

      <button type="button" onClick={onDone} className="mb-4 min-h-16 w-full rounded-soft bg-accent px-6 py-4 text-lead font-bold text-on-accent shadow-soft">
        {S.intro.continue}
      </button>
    </main>
  );
}
