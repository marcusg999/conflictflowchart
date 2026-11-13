import { useEffect, useState } from 'react';

export function useReducedMotion(): boolean {
  const query = '(prefers-reduced-motion: reduce)';
  const get = () => {
    try {
      return globalThis.matchMedia?.(query).matches ?? false;
    } catch {
      return false;
    }
  };
  const [reduced, setReduced] = useState(get);
  useEffect(() => {
    let mql: MediaQueryList | undefined;
    try {
      mql = globalThis.matchMedia?.(query);
    } catch {
      return;
    }
    if (!mql) return;
    const on = () => setReduced(mql!.matches);
    mql.addEventListener?.('change', on);
    return () => mql!.removeEventListener?.('change', on);
  }, []);
  return reduced;
}

type WakeLockSentinelLike = { release: () => Promise<void> };

/** Keep the screen on while mounted. Unsupported in places; must never throw. */
export function useWakeLock(): void {
  useEffect(() => {
    let lock: WakeLockSentinelLike | null = null;
    let done = false;
    const request = async () => {
      try {
        const wl = (navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<WakeLockSentinelLike> } }).wakeLock;
        if (!wl) return;
        const l = await wl.request('screen');
        if (done) void l.release().catch(() => {});
        else lock = l;
      } catch {
        // not allowed or not supported — fine
      }
    };
    void request();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void request();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      done = true;
      document.removeEventListener('visibilitychange', onVisible);
      try {
        void lock?.release().catch(() => {});
      } catch {
        // ignore
      }
    };
  }, []);
}

export function vibrate(ms: number): void {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // unsupported
  }
}
