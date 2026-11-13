import { useSyncExternalStore } from 'react';
import { STORAGE_PREFIX, safeStorage } from './storage.ts';

/** Small local settings. Never anything about a conflict. */
export type Prefs = {
  introSeen: boolean;
  therapistName: string;
  /** null until the person has answered the one-time sound question. */
  sound: 'on' | 'off' | null;
  haptics: boolean;
  iosHintShown: boolean;
};

export const PREFS_KEY = `${STORAGE_PREFIX}prefs.v1`;
const DEFAULTS: Prefs = { introSeen: false, therapistName: '', sound: null, haptics: false, iosHintShown: false };

let cache: Prefs | null = null;
const listeners = new Set<() => void>();

function read(): Prefs {
  if (cache) return cache;
  let stored: Partial<Prefs> = {};
  try {
    const raw = safeStorage()?.getItem(PREFS_KEY);
    if (raw) stored = JSON.parse(raw) as Partial<Prefs>;
  } catch {
    stored = {};
  }
  cache = {
    introSeen: stored.introSeen === true,
    therapistName: typeof stored.therapistName === 'string' ? stored.therapistName.slice(0, 80) : '',
    sound: stored.sound === 'on' || stored.sound === 'off' ? stored.sound : null,
    haptics: stored.haptics === true,
    iosHintShown: stored.iosHintShown === true,
  };
  return cache;
}

export function getPrefs(): Prefs {
  return read();
}

export function setPrefs(patch: Partial<Prefs>): void {
  cache = { ...read(), ...patch };
  try {
    safeStorage()?.setItem(PREFS_KEY, JSON.stringify(cache));
  } catch {
    // keep working in memory
  }
  listeners.forEach((l) => l());
}

/** Forget the in-memory copy (after "Delete everything", or between tests). */
export function reloadPrefs(): void {
  cache = null;
  listeners.forEach((l) => l());
}

export function usePrefs(): Prefs {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => DEFAULTS,
  );
}
