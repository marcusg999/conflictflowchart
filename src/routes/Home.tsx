import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { flow } from '../content.ts';
import { Shell } from '../components/Shell.tsx';
import { Squiggle } from '../components/Marks.tsx';
import { RisoMapHero } from '../riso/RisoMapHero.tsx';
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
    window.scrollTo(0, 0);
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

  if (showIntro) return <Intro onDone={finishIntro} />;

  const name = prefs.therapistName.trim();
  const primary = 'sticker sticker-blue min-h-16 w-full px-6 py-4 font-display text-lead font-bold';
  const secondary = 'sticker min-h-14 w-full px-6 py-3 font-display text-body font-bold';

  return (
    <Shell showAbout>
      <main className="flex flex-1 flex-col" aria-labelledby="home-title">
        <RisoMapHero className="-mx-5 -mt-4 h-[44vh] max-h-[26rem] min-h-64" />

        <h1 id="home-title" ref={heading} tabIndex={-1} className="relative -mt-14 flex flex-col">
          <span className="stamp ml-1 font-display text-lead font-bold text-ink">{S.home.title}</span>
          <span className="riso-title stamp stamp-2 relative -ml-1 mt-1 inline-block self-start text-hero">
            {S.home.titleLine2}
            <Squiggle className="absolute -bottom-3 left-[38%] h-3 w-[58%] text-coral" />
          </span>
        </h1>
        <p className="stamp stamp-3 ml-[18%] mt-7 text-lead text-ink-soft">{S.home.lede}</p>
        {name && <p className="stamp stamp-4 ml-[18%] mt-2 text-body text-ink-soft">{fmt(S.home.therapistLine, { name })}</p>}

        {navState.putDown && (
          <div role="status" className="taped mt-10 px-5 pb-5 pt-6">
            <p className="font-display text-lead font-bold">{S.home.putDownTitle}</p>
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
              <p className="tab self-start">{S.home.resumeTitle}</p>
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
