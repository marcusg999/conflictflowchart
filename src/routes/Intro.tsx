import { useEffect, useRef, useState, type ReactNode } from 'react';
import { EMERGENCY_NUMBER } from '../constants/safety.ts';
import { LinkList, hotlineLinks } from '../components/LinkList.tsx';
import { QuickExit } from '../components/QuickExit.tsx';
import { Squiggle } from '../components/Marks.tsx';
import { useReducedMotion } from '../exercises/hooks.ts';
import { setPrefs, usePrefs } from '../state/prefs.ts';
import { S, fmt } from '../strings.ts';

const BASE = import.meta.env.BASE_URL;
const FRAMES = 36;
const frameUrl = (theme: 'light' | 'dark', i: number) => `${BASE}riso/intro-${theme}/${String(i).padStart(2, '0')}.webp`;

/**
 * First launch only (skippable); re-readable from About. Says once what this
 * is and isn't. A printed map unfolds as you scroll — pinned at the top while
 * the panels slide up over it. All content is ordinary, readable flow: with
 * reduced motion (or no JS effects) it's simply a still image and the text.
 */
export function Intro({ onDone }: { onDone: () => void }) {
  const prefs = usePrefs();
  const reduced = useReducedMotion();
  const heading = useRef<HTMLHeadingElement>(null);
  const story = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [scrolly, setScrolly] = useState(false);
  const name = prefs.therapistName.trim();

  useEffect(() => heading.current?.focus({ preventScroll: true }), []);

  // Scroll-scrubbed image sequence + staged panel reveals.
  useEffect(() => {
    const el = story.current;
    const cv = canvas.current;
    if (reduced || !el || !cv || typeof IntersectionObserver === 'undefined') return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const theme = globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const images = Array.from({ length: FRAMES }, (_, i) => {
      const img = new Image();
      img.decoding = 'async';
      img.src = frameUrl(theme, i);
      return img;
    });
    let shown = -1;
    let raf = 0;
    const draw = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const span = Math.max(1, rect.height - window.innerHeight);
      const p = Math.min(1, Math.max(0, -rect.top / span));
      const i = Math.round(p * (FRAMES - 1));
      // Use the nearest frame that has loaded, so it never flashes blank.
      let k = i;
      while (k > 0 && !(images[k]!.complete && images[k]!.naturalWidth)) k--;
      if (k === shown || !(images[k]!.complete && images[k]!.naturalWidth)) return;
      shown = k;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = cv.clientWidth * dpr;
      const h = cv.clientHeight * dpr;
      if (cv.width !== w || cv.height !== h) {
        cv.width = w;
        cv.height = h;
      }
      const s = Math.min(w, h);
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(images[k]!, (w - s) / 2, (h - s) / 2, s, s);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };
    images.forEach((img) => (img.onload = onScroll));
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.setAttribute('data-shown', '')),
      { rootMargin: '0px 0px -15% 0px' },
    );
    el.querySelectorAll('[data-reveal]').forEach((n) => io.observe(n));
    setScrolly(true);
    onScroll();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      io.disconnect();
    };
  }, [reduced]);

  return (
    <div className="mx-auto w-full max-w-xl px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-30 -mx-5 flex flex-row-reverse items-center justify-between gap-3 bg-paper/90 px-5 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-[2px]">
        <QuickExit />
        <button type="button" onClick={onDone} className="rounded-full border-2 border-line-strong bg-card px-3.5 py-1.5 font-display text-small font-bold text-ink">
          {S.intro.skip}
        </button>
      </header>

      <div ref={story} data-scrolly={scrolly ? 'on' : undefined} className="intro-story relative">
        {/* The pinned, scroll-scrubbed map. */}
        <div aria-hidden="true" className="sticky top-14 z-0 -mx-5 h-[42vh] max-h-[24rem]">
          {scrolly ? (
            <canvas ref={canvas} className="h-full w-full" />
          ) : (
            <>
              <canvas ref={canvas} className="hidden" />
              <picture>
                <source srcSet={`${BASE}riso/map-dark.webp`} media="(prefers-color-scheme: dark)" />
                <img src={`${BASE}riso/map-light.webp`} alt="" className="h-full w-full object-contain" />
              </picture>
            </>
          )}
        </div>

        <main aria-labelledby="intro-title" className="relative z-10 -mt-[6vh] flex flex-col gap-[14vh] pb-[8vh]">
          <div data-reveal className="intro-reveal">
            <span className="tab">{S.intro.eyebrow}</span>
            <h1 id="intro-title" ref={heading} tabIndex={-1} className="riso-title relative mt-4 text-[2.5rem] leading-[0.98]">
              {S.app.name}
              <Squiggle className="absolute -bottom-4 left-0 h-3 w-1/2 text-coral" />
            </h1>
            {scrolly && (
              <p className="mt-10 font-display text-small font-bold uppercase tracking-widest text-ink-soft" aria-hidden="true">
                {S.intro.scrollHint} ↓
              </p>
            )}
          </div>

          <Panel side="right" title={S.intro.whatTitle}>
            <p>{name ? fmt(S.intro.whatTherapist, { name }) : S.intro.whatBody}</p>
          </Panel>

          <Panel side="left" title={S.intro.notTitle}>
            <p>{S.intro.notBody}</p>
          </Panel>

          {/* Safety information: plain, still, untilted. */}
          <section data-reveal className="intro-reveal flex flex-col gap-3 rounded-soft border-2 border-line-strong bg-paper p-5" aria-labelledby="intro-danger">
            <h2 id="intro-danger" className="font-display text-lead font-bold">{S.intro.dangerTitle}</h2>
            <p className="font-bold">
              {fmt(S.safety.emergency, { number: EMERGENCY_NUMBER })}{' '}
              <a href={`tel:${EMERGENCY_NUMBER}`} className="text-accent-ink underline decoration-2 underline-offset-4">
                {fmt(S.safety.callEmergency, { number: EMERGENCY_NUMBER })}
              </a>
            </p>
            <LinkList links={hotlineLinks()} />
          </section>

          <Panel side="right" title={S.intro.privacyTitle}>
            <p>{S.intro.privacyBody}</p>
            <div className="mt-5 flex flex-col gap-2">
              <label htmlFor="therapist-name" className="font-display text-body font-bold">
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
                className="rounded-xl border-2 border-line-strong bg-paper px-4 py-3 text-body text-ink"
              />
              <p id="therapist-name-help" className="text-small text-ink-soft">
                {S.intro.nameHelp}
              </p>
            </div>
          </Panel>

          <div data-reveal className="intro-reveal">
            <button type="button" onClick={onDone} className="sticker sticker-blue min-h-16 w-full px-6 py-4 font-display text-lead font-bold">
              {S.intro.continue}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

function Panel({ side, title, children }: { side: 'left' | 'right'; title: string; children: ReactNode }) {
  return (
    <section
      data-reveal
      className={`intro-reveal taped w-[88%] px-5 pb-6 pt-7 ${side === 'right' ? 'ml-auto rotate-[1.2deg]' : 'mr-auto'}`}
    >
      <h2 className="riso-title text-[1.75rem] leading-tight">{title}</h2>
      <div className="mt-2 text-body">{children}</div>
    </section>
  );
}
