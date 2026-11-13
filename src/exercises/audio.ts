import type { PhaseKind } from './patterns.ts';

/**
 * Synthesised sound for the breathing exercises (Web Audio, no audio files).
 *
 * Rules this file keeps — please keep them too:
 * - Never assign an AudioParam's .value directly. Every change goes through
 *   setValueAtTime / setTargetAtTime / linearRampToValueAtTime. A direct
 *   assignment clicks, and a click at the end of an out-breath undoes the point.
 *   (tests/audio.test.ts fails the build if `.value =` appears here.)
 * - One AudioContext for the whole app, created only inside a tap.
 * - Suspended when the page is hidden or nothing is playing.
 * - Every node is stopped and disconnected on teardown.
 * - Nothing percussive, no dissonance: everything sits in one C-major chord.
 */

let ctx: AudioContext | null = null;
let active = 0;
let visibilityHooked = false;

type AudioContextCtor = new () => AudioContext;

function ctor(): AudioContextCtor | undefined {
  const w = globalThis as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
  return w.AudioContext ?? w.webkitAudioContext;
}

/**
 * Create (or wake) the shared AudioContext. Call ONLY from a tap/click handler:
 * iOS and Chrome refuse to start audio otherwise. Returns null if audio is
 * unavailable — the exercise then simply runs silent.
 */
export function primeAudioFromGesture(): AudioContext | null {
  try {
    if (!ctx) {
      const C = ctor();
      if (!C) return null;
      ctx = new C();
      hookVisibility();
    }
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
  } catch {
    ctx = null;
  }
  return ctx;
}

/** The shared context if a tap has already created it; never creates one. */
export function getAudioContext(): AudioContext | null {
  return ctx;
}

function hookVisibility() {
  if (visibilityHooked || typeof document === 'undefined') return;
  visibilityHooked = true;
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.visibilityState === 'hidden') void ctx.suspend().catch(() => {});
    else if (active > 0) void ctx.resume().catch(() => {});
  });
}

/** Test seam: forget the shared context. */
export function _resetAudioForTests(): void {
  ctx = null;
  active = 0;
}

// C-major: C3 root and G3 fifth for the drone; bells on chord tones above.
const ROOT = 130.81;
const FIFTH = 196.0;
const BELL: Partial<Record<PhaseKind, number>> = {
  in: 392.0, // G4
  in2: 523.25, // C5
  hold: 329.63, // E4
  out: 261.63, // C4
};

export const MASTER_LEVEL = 0.15;

let pinkCache: { rate: number; buffer: AudioBuffer } | null = null;

function pinkNoise(c: AudioContext): AudioBuffer {
  if (pinkCache && pinkCache.rate === c.sampleRate) return pinkCache.buffer;
  const length = Math.floor(c.sampleRate * 4);
  const buffer = c.createBuffer(1, length, c.sampleRate);
  const data = buffer.getChannelData(0);
  // Paul Kellet's pink-noise filter.
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }
  pinkCache = { rate: c.sampleRate, buffer };
  return buffer;
}

export class BreathSound {
  private c: AudioContext;
  private nodes: AudioNode[] = [];
  private sources: AudioScheduledSourceNode[] = [];
  private master: GainNode;
  private breathGain: GainNode;
  private breathFilter: BiquadFilterNode;
  private muted: boolean;
  private disposed = false;

  constructor(c: AudioContext, { muted = false } = {}) {
    this.c = c;
    this.muted = muted;
    active++;
    if (c.state === 'suspended') void c.resume().catch(() => {});
    const now = c.currentTime;

    this.master = this.track(c.createGain());
    this.master.gain.setValueAtTime(0, now);
    this.master.gain.setTargetAtTime(muted ? 0 : MASTER_LEVEL, now, 0.8);
    this.master.connect(c.destination);

    // Breath layer: pink noise through a lowpass that opens on the in-breath.
    const noise = this.source(c.createBufferSource());
    noise.buffer = pinkNoise(c);
    noise.loop = true;
    this.breathFilter = this.track(c.createBiquadFilter());
    this.breathFilter.type = 'lowpass';
    this.breathFilter.frequency.setValueAtTime(320, now);
    this.breathFilter.Q.setValueAtTime(0.7, now);
    this.breathGain = this.track(c.createGain());
    this.breathGain.gain.setValueAtTime(0.03, now);
    noise.connect(this.breathFilter).connect(this.breathGain).connect(this.master);

    // Drone: root + fifth, slightly detuned, lowpassed, breathing on its own slow LFO.
    const droneGain = this.track(c.createGain());
    droneGain.gain.setValueAtTime(0, now);
    droneGain.gain.setTargetAtTime(0.05, now, 2);
    const droneFilter = this.track(c.createBiquadFilter());
    droneFilter.type = 'lowpass';
    droneFilter.frequency.setValueAtTime(600, now);
    droneFilter.Q.setValueAtTime(0.5, now);
    droneFilter.connect(droneGain).connect(this.master);
    for (const [freq, cents, type] of [
      [ROOT, -4, 'sine'],
      [FIFTH, 5, 'sine'],
      [ROOT / 2, 3, 'triangle'],
    ] as const) {
      const osc = this.source(c.createOscillator());
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      osc.detune.setValueAtTime(cents, now);
      const g = this.track(c.createGain());
      g.gain.setValueAtTime(type === 'triangle' ? 0.25 : 0.5, now);
      osc.connect(g).connect(droneFilter);
    }
    const lfo = this.source(c.createOscillator());
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.05, now);
    const lfoDepth = this.track(c.createGain());
    lfoDepth.gain.setValueAtTime(0.015, now);
    lfo.connect(lfoDepth).connect(droneGain.gain);

    for (const s of this.sources) s.start(now);
  }

  private track<T extends AudioNode>(node: T): T {
    this.nodes.push(node);
    return node;
  }

  private source<T extends AudioScheduledSourceNode>(node: T): T {
    this.track(node);
    this.sources.push(node);
    return node;
  }

  /** Called on every phase change, from the shared clock. */
  phase(kind: PhaseKind, toLevel: number, seconds: number, { bell = true } = {}): void {
    if (this.disposed) return;
    const now = this.c.currentTime;
    const tc = Math.max(0.15, seconds / 3.5);
    this.breathFilter.frequency.setTargetAtTime(280 + 1500 * toLevel, now, tc);
    this.breathGain.gain.setTargetAtTime(0.03 + 0.22 * toLevel, now, tc);
    const pitch = BELL[kind];
    if (bell && pitch) this.bell(pitch);
  }

  /** A soft bell: sine, quick (not sharp) attack, long exponential fade, lowpassed. */
  private bell(freq: number): void {
    const c = this.c;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    const lp = c.createBiquadFilter();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2200, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.07, t + 0.015);
    g.gain.setTargetAtTime(0.0001, t + 0.015, 0.9);
    osc.connect(g).connect(lp).connect(this.master);
    this.nodes.push(osc, g, lp);
    this.sources.push(osc);
    osc.onended = () => {
      for (const n of [osc, g, lp]) {
        n.disconnect();
        const i = this.nodes.indexOf(n);
        if (i >= 0) this.nodes.splice(i, 1);
      }
      const j = this.sources.indexOf(osc);
      if (j >= 0) this.sources.splice(j, 1);
    };
    osc.start(t);
    osc.stop(t + 5);
  }

  setMuted(muted: boolean): void {
    if (this.disposed) return;
    this.muted = muted;
    const now = this.c.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(muted ? 0 : MASTER_LEVEL, now, 0.2);
  }

  get isMuted(): boolean {
    return this.muted;
  }

  /** Fade out (no click), then stop and disconnect every node. */
  dispose(fadeMs = 300): void {
    if (this.disposed) return;
    this.disposed = true;
    active = Math.max(0, active - 1);
    const now = this.c.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(0, now, fadeMs / 1000 / 4);
    setTimeout(() => {
      for (const s of this.sources) {
        try {
          s.onended = null;
          s.stop();
        } catch {
          // already stopped
        }
      }
      for (const n of this.nodes) n.disconnect();
      this.sources = [];
      this.nodes = [];
      if (active === 0) void this.c.suspend().catch(() => {});
    }, fadeMs);
  }
}
