// @vitest-environment jsdom
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { freshDevice, mockAudio, mockMatchMedia, mockRaf } from './helpers.tsx';
import { BreathingExercise } from '../src/exercises/BreathingExercise.tsx';
import { ExerciseHost, IMPLEMENTED_EXERCISES } from '../src/exercises/ExerciseHost.tsx';
import { primeAudioFromGesture } from '../src/exercises/audio.ts';
import { PATTERNS } from '../src/exercises/patterns.ts';
import { easeIn, easeOut, frameAt } from '../src/exercises/clock.ts';
import { EXERCISES } from '../src/schema/resources.ts';
import { PREFS_KEY } from '../src/state/prefs.ts';

const root = `${process.cwd()}/`;
let now = 0;

beforeEach(() => {
  freshDevice();
  now = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.stubGlobal('navigator', Object.assign(Object.create(navigator), { vibrate: vi.fn(), wakeLock: undefined }));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('exercises: lifecycle', () => {
  for (const reduced of [false, true]) {
    it(`every exercise mounts and tears down cleanly (reduced motion ${reduced ? 'on' : 'off'})`, () => {
      mockMatchMedia(reduced);
      for (const id of IMPLEMENTED_EXERCISES) {
        const raf = mockRaf();
        const { unmount } = render(<ExerciseHost first={id} also={[]} onDone={() => {}} />);
        act(() => raf.frame());
        unmount();
        expect(raf.pending(), id).toBe(0);
      }
    });
  }

  it('leaves zero live audio nodes and zero pending animation frames after unmount', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    mockMatchMedia(false);
    const audio = mockAudio();
    const raf = mockRaf();
    primeAudioFromGesture(); // as a tap would
    const { unmount } = render(<BreathingExercise id="physiological-sigh" sound haptics={false} />);
    for (let i = 0; i < 40; i++) {
      now += 500; // walk through several phase changes, so bells are created too
      act(() => raf.frame());
    }
    expect(audio.live().length).toBeGreaterThan(5);
    unmount();
    expect(raf.pending()).toBe(0);
    expect(raf.cancel).toHaveBeenCalled();
    vi.advanceTimersByTime(1000); // the fade-out before stopping
    expect(audio.live()).toEqual([]);
  });

  it('never constructs an AudioContext before a tap', () => {
    mockMatchMedia(false);
    const audio = mockAudio();
    localStorage.setItem(PREFS_KEY, JSON.stringify({ introSeen: true, sound: 'on' }));
    freshDevice({ introSeen: true, sound: 'on' });
    const raf = mockRaf();
    render(<ExerciseHost first="physiological-sigh" also={[]} onDone={() => {}} />);
    act(() => raf.frame());
    expect(audio.contexts).toHaveLength(0);
    // A tap on the sound toggle may create it.
    fireEvent.click(screen.getByRole('button', { name: 'Turn sound off' }));
    fireEvent.click(screen.getByRole('button', { name: 'Turn sound on' }));
    expect(audio.contexts).toHaveLength(1);
  });

  it('never assigns an AudioParam .value directly (every change is ramped)', () => {
    // Static: the engine source contains no `.value =` at all.
    const src = readFileSync(`${root}src/exercises/audio.ts`, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    expect(src).not.toMatch(/\.value\s*=[^=]/);
    // Runtime: running the engine records no direct assignment.
    mockMatchMedia(false);
    const audio = mockAudio();
    const raf = mockRaf();
    primeAudioFromGesture();
    const { unmount } = render(<BreathingExercise id="box-breathing" sound haptics={false} />);
    for (let i = 0; i < 20; i++) {
      now += 1000;
      act(() => raf.frame());
    }
    unmount();
    expect(audio.directAssignments).toEqual([]);
  });
});

describe('exercises: sound choice', () => {
  it('the sound question appears exactly once, and the answer persists', () => {
    mockMatchMedia(false);
    mockAudio();
    mockRaf();
    const first = render(<ExerciseHost first="physiological-sigh" also={[]} onDone={() => {}} />);
    expect(screen.getByText('Sound or quiet?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Keep it quiet' }));
    expect(screen.queryByText('Sound or quiet?')).toBeNull();
    expect(JSON.parse(localStorage.getItem(PREFS_KEY)!).sound).toBe('off');
    first.unmount();

    render(<ExerciseHost first="box-breathing" also={[]} onDone={() => {}} />);
    expect(screen.queryByText('Sound or quiet?')).toBeNull();
  });

  it('choosing "Sound on" creates the audio context inside the tap', () => {
    mockMatchMedia(false);
    const audio = mockAudio();
    mockRaf();
    render(<ExerciseHost first="physiological-sigh" also={[]} onDone={() => {}} />);
    expect(audio.contexts).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Sound on' }));
    expect(audio.contexts).toHaveLength(1);
  });

  it('"I\'m ready" is always present and enabled, with no timer', () => {
    mockMatchMedia(false);
    mockRaf();
    const onDone = vi.fn();
    for (const id of IMPLEMENTED_EXERCISES) {
      render(<ExerciseHost first={id} also={[]} onDone={onDone} />);
      const ready = screen.getByRole('button', { name: "I'm ready" }) as HTMLButtonElement;
      expect(ready.disabled).toBe(false);
      fireEvent.click(ready);
      cleanup();
    }
    expect(onDone).toHaveBeenCalledTimes(IMPLEMENTED_EXERCISES.length);
  });
});

describe('exercises: reduced motion', () => {
  it('with reduced motion: no scale transform, no moving dot, and audio still starts', () => {
    mockMatchMedia(true);
    const audio = mockAudio();
    const raf = mockRaf();
    primeAudioFromGesture();
    const { container } = render(<BreathingExercise id="box-breathing" sound haptics={false} />);
    now = 2000;
    act(() => raf.frame());
    const styled = [...container.querySelectorAll<HTMLElement>('[style]')].map((el) => el.style.transform);
    expect(styled.some((t) => t.includes('scale'))).toBe(false);
    expect(styled.some((t) => t.includes('translate'))).toBe(false);
    expect(audio.nodes.length).toBeGreaterThan(0);
  });

  it('without reduced motion, the orb scales with the breath', () => {
    mockMatchMedia(false);
    const raf = mockRaf();
    const { container } = render(<BreathingExercise id="box-breathing" sound={false} haptics={false} />);
    now = 2000;
    act(() => raf.frame());
    const styled = [...container.querySelectorAll<HTMLElement>('[style]')].map((el) => el.style.transform);
    expect(styled.some((t) => t.includes('scale'))).toBe(true);
  });

  it('announces phase changes politely', () => {
    mockMatchMedia(false);
    const raf = mockRaf();
    render(<BreathingExercise id="box-breathing" sound={false} haptics={false} />);
    act(() => raf.frame());
    const live = screen.getByTestId('phase-live');
    expect(live.getAttribute('aria-live')).toBe('polite');
    expect(live.textContent).toBe('Breathe in…');
    now = 4500;
    act(() => raf.frame());
    expect(live.textContent).toBe('Hold…');
  });
});

describe('breath patterns and clock', () => {
  it('physiological sigh has a visible second catch on the in-breath', () => {
    const phases = PATTERNS['physiological-sigh'].phasesFor(0);
    expect(phases.map((p) => p.kind)).toEqual(['in', 'in2', 'out', 'rest']);
    expect(phases[1]!.to).toBeGreaterThan(phases[0]!.to);
  });

  it('extended exhale lengthens the out-breath to 8 and never changes the in-breath', () => {
    const p = PATTERNS['extended-exhale'];
    const outs = [0, 1, 2, 3, 4, 10].map((c) => p.phasesFor(c).find((x) => x.kind === 'out')!.seconds);
    expect(outs[0]).toBe(6);
    expect(outs.at(-1)).toBe(8);
    expect([...outs].sort((a, b) => a - b)).toEqual(outs);
    expect(new Set([0, 5, 10].map((c) => p.phasesFor(c)[0]!.seconds))).toEqual(new Set([4]));
  });

  it('holds are genuinely still and the out-breath lands more slowly than the in-breath rises', () => {
    const a = frameAt(PATTERNS['box-breathing'], 4.2);
    const b = frameAt(PATTERNS['box-breathing'], 7.8);
    expect(a.phase.kind).toBe('hold');
    expect(a.level).toBe(b.level);
    // Softer landing: the last 30% of an out-breath covers less distance than the
    // last 30% of an in-breath — a long, slow settle rather than an even stop.
    expect(1 - easeOut(0.7)).toBeLessThan(1 - easeIn(0.7));
    expect(easeOut(0)).toBe(0);
    expect(easeOut(1)).toBeCloseTo(1);
  });

  it('every exercise in the schema is implemented', () => {
    expect([...IMPLEMENTED_EXERCISES].sort()).toEqual([...EXERCISES].sort());
  });
});

describe('no bundled audio', () => {
  it('the repo contains no .mp3, .wav, .ogg or .m4a files', () => {
    const found: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        if (['node_modules', '.git', 'dist', 'dev-dist'].includes(name)) continue;
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(mp3|wav|ogg|m4a)$/i.test(name)) found.push(p);
      }
    };
    walk(root);
    expect(found).toEqual([]);
  });
});
