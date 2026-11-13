/**
 * Everything this app stores on the device uses this prefix, so
 * "Delete everything" can find and erase all of it.
 */
export const STORAGE_PREFIX = 'conflictflow.';

export function safeStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** Erase every key this app has written on this device. */
export function deleteEverything(store: Storage | null = safeStorage()): void {
  if (!store) return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i);
      if (k?.startsWith(STORAGE_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => store.removeItem(k));
  } catch {
    // blocked storage: nothing was stored either
  }
}
