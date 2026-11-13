import { vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { SessionProvider } from '../src/state/SessionProvider.tsx';
import { AppRoutes } from '../src/App.tsx';
import { reloadPrefs } from '../src/state/prefs.ts';
import { _resetAudioForTests } from '../src/exercises/audio.ts';

/** Fresh device: empty storage, no cached prefs, no audio context. */
export function freshDevice(prefs: Record<string, unknown> | null = { introSeen: true }) {
  localStorage.clear();
  if (prefs) localStorage.setItem('conflictflow.prefs.v1', JSON.stringify(prefs));
  reloadPrefs();
  _resetAudioForTests();
}

export function renderApp(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SessionProvider>
        <AppRoutes />
      </SessionProvider>
    </MemoryRouter>,
  );
}

export function mockMatchMedia(reducedMotion: boolean) {
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: q.includes('prefers-reduced-motion') ? reducedMotion : false,
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  }));
}

/** A hand-cranked requestAnimationFrame so tests can count pending callbacks. */
export function mockRaf() {
  const queue = new Map<number, FrameRequestCallback>();
  let next = 1;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    const id = next++;
    queue.set(id, cb);
    return id;
  });
  const cancel = vi.fn((id: number) => {
    queue.delete(id);
  });
  vi.stubGlobal('cancelAnimationFrame', cancel);
  return {
    cancel,
    pending: () => queue.size,
    frame(now = performance.now()) {
      const cbs = [...queue.entries()];
      queue.clear();
      for (const [, cb] of cbs) cb(now);
    },
  };
}

/**
 * A minimal fake Web Audio graph that records every node, every connection
 * and disconnection, and every direct `.value =` assignment on an AudioParam.
 */
export function mockAudio() {
  const nodes: FakeNode[] = [];
  const contexts: FakeContext[] = [];
  const directAssignments: string[] = [];
  let setupDone = false;

  class FakeParam {
    private v = 0;
    constructor(private name: string) {}
    get value() {
      return this.v;
    }
    set value(v: number) {
      directAssignments.push(`${this.name}=${v}${setupDone ? ' (after setup)' : ''}`);
      this.v = v;
    }
    setValueAtTime(v: number) {
      this.v = v;
      return this;
    }
    setTargetAtTime() {
      return this;
    }
    linearRampToValueAtTime() {
      return this;
    }
    exponentialRampToValueAtTime() {
      return this;
    }
    cancelScheduledValues() {
      return this;
    }
  }
  class FakeNode {
    disconnected = false;
    constructor(public kind: string) {
      nodes.push(this);
    }
    connect<T>(n: T) {
      return n;
    }
    disconnect() {
      this.disconnected = true;
    }
  }
  class FakeGain extends FakeNode {
    gain = new FakeParam('gain');
    constructor() {
      super('gain');
    }
  }
  class FakeFilter extends FakeNode {
    type = 'lowpass';
    frequency = new FakeParam('frequency');
    Q = new FakeParam('Q');
    constructor() {
      super('filter');
    }
  }
  class FakeSource extends FakeNode {
    onended: (() => void) | null = null;
    stopped = false;
    start() {}
    stop() {
      this.stopped = true;
    }
  }
  class FakeOsc extends FakeSource {
    type = 'sine';
    frequency = new FakeParam('frequency');
    detune = new FakeParam('detune');
    constructor() {
      super('osc');
    }
  }
  class FakeBufferSource extends FakeSource {
    buffer: unknown = null;
    loop = false;
    constructor() {
      super('buffer');
    }
  }
  class FakeContext {
    state = 'running';
    currentTime = 0;
    sampleRate = 4000;
    destination = { connect: () => {}, disconnect: () => {} };
    constructor() {
      contexts.push(this);
    }
    createGain() {
      return new FakeGain();
    }
    createBiquadFilter() {
      return new FakeFilter();
    }
    createOscillator() {
      return new FakeOsc();
    }
    createBufferSource() {
      return new FakeBufferSource();
    }
    createBuffer(_c: number, length: number) {
      const data = new Float32Array(length);
      return { getChannelData: () => data };
    }
    resume() {
      this.state = 'running';
      return Promise.resolve();
    }
    suspend() {
      this.state = 'suspended';
      return Promise.resolve();
    }
  }
  vi.stubGlobal('AudioContext', FakeContext);
  return {
    nodes,
    contexts,
    directAssignments,
    markSetupDone: () => (setupDone = true),
    live: () => nodes.filter((n) => !n.disconnected),
  };
}
