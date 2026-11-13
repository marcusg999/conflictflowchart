import { useCallback, useRef, useState } from 'react';
import type { ExerciseId } from '../schema/resources.ts';
import { BreathingExercise } from './BreathingExercise.tsx';
import { Grounding } from './Grounding.tsx';
import { primeAudioFromGesture, type BreathSound } from './audio.ts';
import { useReducedMotion, useWakeLock } from './hooks.ts';
import { setPrefs, usePrefs } from '../state/prefs.ts';
import { S } from '../strings.ts';

/** Every exercise id the app can run. Tests check resources.json against this. */
export const IMPLEMENTED_EXERCISES: readonly ExerciseId[] = [
  'physiological-sigh',
  'box-breathing',
  'extended-exhale',
  'grounding-54321',
];

const isIOS = () => {
  try {
    return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  } catch {
    return false;
  }
};

/**
 * Hosts the exercises: the one-time sound choice, the mute and vibration
 * toggles, "try something else", and the "I'm ready" exit — always visible,
 * never disabled, never on a timer. No counts, no "well done".
 */
export function ExerciseHost({ first, also, onDone }: { first: ExerciseId; also: ExerciseId[]; onDone: () => void }) {
  const [current, setCurrent] = useState<ExerciseId>(first);
  const prefs = usePrefs();
  const reduced = useReducedMotion();
  const [hint, setHint] = useState(false);
  const engineRef = useRef<BreathSound | null>(null);
  useWakeLock();

  const breathing = current !== 'grounding-54321';
  const others = [first, ...also].filter((x, i, a) => a.indexOf(x) === i && x !== current);

  const chooseSound = (on: boolean) => {
    if (on) primeAudioFromGesture(); // inside the tap
    const showHint = on && !prefs.iosHintShown && isIOS();
    setPrefs({ sound: on ? 'on' : 'off', ...(showHint ? { iosHintShown: true } : {}) });
    if (showHint) setHint(true);
  };

  const toggleSound = () => {
    const turningOn = prefs.sound !== 'on';
    if (turningOn) primeAudioFromGesture();
    engineRef.current?.setMuted(!turningOn); // ramped, not cut
    chooseSound(turningOn);
  };

  const onEngine = useCallback((e: BreathSound | null) => {
    engineRef.current = e;
  }, []);

  return (
    <div className="relative isolate flex flex-1 flex-col">
      {breathing && !reduced && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-[-30%] -z-10 overflow-hidden">
          <div className="drift h-full w-full" style={{ background: 'var(--ambient)' }} />
        </div>
      )}

      <p className="text-body font-bold text-ink-soft">{S.exercise.names[current]}</p>

      {breathing && prefs.sound === null && (
        <div className="mt-4 rounded-soft bg-card p-4 shadow-soft" role="group" aria-labelledby="sound-q">
          <p id="sound-q" className="text-body font-bold">{S.exercise.soundTitle}</p>
          <p className="text-small text-ink-soft">{S.exercise.soundBody}</p>
          <div className="mt-3 flex gap-3">
            <button type="button" onClick={() => chooseSound(true)} className="flex-1 rounded-xl border-2 border-line bg-paper px-4 py-3 text-body font-bold">
              {S.exercise.soundOn}
            </button>
            <button type="button" onClick={() => chooseSound(false)} className="flex-1 rounded-xl border-2 border-line bg-paper px-4 py-3 text-body font-bold">
              {S.exercise.soundOff}
            </button>
          </div>
        </div>
      )}
      {hint && <p className="mt-3 text-small text-ink-soft" role="status">{S.exercise.iosHint}</p>}

      {breathing ? (
        <BreathingExercise
          key={current}
          id={current}
          sound={prefs.sound === 'on'}
          haptics={prefs.haptics}
          onSoundEngine={onEngine}
        />
      ) : (
        <Grounding key={current} />
      )}

      <div className="flex flex-col gap-3">
        {breathing && prefs.sound !== null && (
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" onClick={toggleSound} aria-pressed={prefs.sound === 'on'} className="rounded-full border border-line px-4 py-2 text-small">
              {prefs.sound === 'on' ? S.exercise.mute : S.exercise.unmute}
            </button>
            {'vibrate' in navigator && (
              <button
                type="button"
                onClick={() => setPrefs({ haptics: !prefs.haptics })}
                aria-pressed={prefs.haptics}
                className="rounded-full border border-line px-4 py-2 text-small"
              >
                {prefs.haptics ? S.exercise.hapticsOn : S.exercise.hapticsOff}
              </button>
            )}
          </div>
        )}

        {others.length > 0 && (
          <details className="rounded-xl text-center">
            <summary className="cursor-pointer rounded-lg py-2 text-small text-accent-ink">{S.exercise.trySomethingElse}</summary>
            <ul className="mt-2 flex flex-col gap-2">
              {others.map((x) => (
                <li key={x}>
                  <button type="button" onClick={() => setCurrent(x)} className="w-full rounded-xl border border-line bg-card px-4 py-3 text-body">
                    {S.exercise.names[x]}
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )}

        <button
          type="button"
          onClick={onDone}
          data-autofocus
          className="min-h-14 w-full rounded-soft bg-accent px-6 py-3 text-lead font-bold text-on-accent shadow-soft"
        >
          {S.exercise.ready}
        </button>
      </div>
    </div>
  );
}
