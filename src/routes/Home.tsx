import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { flow } from '../content.ts';
import { Shell } from '../components/Shell.tsx';
import { Intro } from './Intro.tsx';
import { routeFor, useSession } from '../state/SessionProvider.tsx';
import { currentNodeId, loadSession } from '../state/session.ts';
import { setPrefs, usePrefs } from '../state/prefs.ts';
import { S, fmt } from '../strings.ts';

/**
 * "/" — the intro on first launch, then the start screen.
 * A saved walk is offered ("Pick up where you left off" / "Start fresh"),
 * never resumed automatically.
 */
export function Home() {
  const prefs = usePrefs();
  const location = useLocation();
  const navigate = useNavigate();
  const session = useSession();
  const navState = (location.state ?? {}) as { putDown?: boolean; intro?: boolean };
  const [showIntro, setShowIntro] = useState(!prefs.introSeen || !!navState.intro);
  const heading = useRef<HTMLHeadingElement>(null);

  const inMemory = session.state.path.length > 0;
  // Re-read storage whenever the in-memory walk changes (e.g. after "Put this down").
  const saved = useMemo(() => (inMemory ? null : loadSession(flow)), [inMemory]);

  useEffect(() => {
    if (!showIntro) heading.current?.focus({ preventScroll: true });
  }, [showIntro]);

  const finishIntro = () => {
    setPrefs({ introSeen: true });
    setShowIntro(false);
  };

  const start = () => {
    session.startFresh();
    navigate(routeFor(flow.start), { replace: true });
  };
  const resume = () => {
    if (!saved) return;
    session.restore(saved);
    navigate(routeFor(currentNodeId(flow, saved)), { replace: true });
  };
  const keepGoing = () => navigate(routeFor(session.currentId), { replace: true });

  if (showIntro) {
    return (
      <Shell>
        <Intro onDone={finishIntro} />
      </Shell>
    );
  }

  const name = prefs.therapistName.trim();
  const primary = 'min-h-16 w-full rounded-soft bg-accent px-6 py-4 text-lead font-bold text-on-accent shadow-soft';
  const secondary = 'min-h-14 w-full rounded-soft border-2 border-line bg-card px-6 py-3 text-body font-bold text-ink';

  return (
    <Shell showAbout>
      <main className="screen-in flex flex-1 flex-col" aria-labelledby="home-title">
        <div className="flex flex-col gap-4 pt-[12vh]">
          <h1 id="home-title" ref={heading} tabIndex={-1} className="text-outcome font-bold">
            {S.home.title}
            <br />
            <span className="text-ink-soft">{S.home.titleLine2}</span>
          </h1>
          <p className="text-lead text-ink-soft">{S.home.lede}</p>
          {name && <p className="text-body text-ink-soft">{fmt(S.home.therapistLine, { name })}</p>}
        </div>

        {navState.putDown && (
          <div role="status" className="mt-8 rounded-soft bg-card p-5 shadow-soft">
            <p className="text-lead font-bold">{S.home.putDownTitle}</p>
            <p className="mt-1 text-body text-ink-soft">{S.home.putDownBody}</p>
          </div>
        )}

        <div className="mt-auto flex flex-col gap-4 pt-10">
          {inMemory ? (
            <>
              <button type="button" onClick={keepGoing} className={primary}>{S.home.keepGoing}</button>
              <button type="button" onClick={start} className={secondary}>{S.home.startOver}</button>
            </>
          ) : saved ? (
            <>
              <p className="text-body text-ink-soft">{S.home.resumeTitle}</p>
              <button type="button" onClick={resume} className={primary}>{S.home.resume}</button>
              <button type="button" onClick={start} className={secondary}>{S.home.startFresh}</button>
            </>
          ) : (
            <button type="button" onClick={start} className={primary}>{S.home.start}</button>
          )}
        </div>
      </main>
    </Shell>
  );
}
