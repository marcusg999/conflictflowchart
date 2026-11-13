import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Shell } from '../components/Shell.tsx';
import { routeFor, useSession } from '../state/SessionProvider.tsx';
import { reloadPrefs, setPrefs, usePrefs } from '../state/prefs.ts';
import { deleteEverything } from '../state/storage.ts';
import { S } from '../strings.ts';

export function About() {
  const navigate = useNavigate();
  const session = useSession();
  const prefs = usePrefs();
  const [confirming, setConfirming] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const back = () =>
    navigate(session.state.path.length ? routeFor(session.currentId) : '/', { replace: true });

  const eraseAll = () => {
    session.clearMemory();
    deleteEverything();
    reloadPrefs();
    setConfirming(false);
    setDeleted(true);
  };

  const radio = (value: 'on' | 'off' | null, label: string) => (
    <label className="flex items-center gap-3 rounded-xl border-2 border-line-strong bg-card px-4 py-3">
      <input
        type="radio"
        name="sound"
        checked={prefs.sound === value}
        onChange={() => setPrefs({ sound: value })}
        className="h-5 w-5 accent-[var(--blue)]"
      />
      {label}
    </label>
  );

  return (
    <Shell>
      <main className="screen-in flex flex-1 flex-col gap-8 pt-4" aria-labelledby="about-title">
        <h1 id="about-title" className="riso-title text-outcome">{S.about.title}</h1>
        <p>{S.about.privacy}</p>

        <button
          type="button"
          onClick={() => navigate('/', { replace: true, state: { intro: true } })}
          className="self-start rounded-lg py-2 font-display text-body font-bold text-accent-ink underline decoration-coral decoration-2 underline-offset-4"
        >
          {S.about.readIntro}
        </button>

        <section className="flex flex-col gap-3" aria-labelledby="settings-title">
          <h2 id="settings-title" className="font-display text-lead font-bold">{S.about.settingsTitle}</h2>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-body">{S.about.soundLabel}</legend>
            {radio('on', S.about.soundOn)}
            {radio('off', S.about.soundOff)}
            {radio(null, S.about.soundUnset)}
          </fieldset>
          <label htmlFor="about-therapist" className="mt-2 text-body">{S.intro.nameLabel}</label>
          <input
            id="about-therapist"
            type="text"
            autoComplete="off"
            maxLength={80}
            value={prefs.therapistName}
            onChange={(e) => setPrefs({ therapistName: e.target.value })}
            className="rounded-xl border-2 border-line-strong bg-card px-4 py-3 text-body"
          />
        </section>

        <section className="flex flex-col gap-3 rounded-soft border-2 border-dashed border-line-strong p-5" aria-labelledby="delete-title">
          <h2 id="delete-title" className="font-display text-lead font-bold">{S.about.deleteTitle}</h2>
          <p className="text-body text-ink-soft">{S.about.deleteBody}</p>
          {deleted ? (
            <p role="status" className="font-bold">{S.about.deleted}</p>
          ) : confirming ? (
            <div className="flex flex-col gap-3">
              <button type="button" onClick={eraseAll} className="min-h-14 rounded-soft bg-ink px-6 py-3 font-display text-body font-bold text-paper">
                {S.about.deleteConfirm}
              </button>
              <button type="button" onClick={() => setConfirming(false)} className="min-h-14 rounded-soft border-2 border-line-strong px-6 py-3 font-display text-body font-bold">
                {S.about.deleteCancel}
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} className="min-h-14 self-start rounded-soft border-2 border-ink px-6 py-3 font-display text-body font-bold">
              {S.about.deleteButton}
            </button>
          )}
        </section>

        <button type="button" onClick={back} className="sticker mt-auto mb-4 min-h-14 w-full px-6 py-3 font-display text-body font-bold">
          {S.about.back}
        </button>
      </main>
    </Shell>
  );
}
