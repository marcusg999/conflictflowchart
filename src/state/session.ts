import type { Flow } from '../schema/flow.ts';

/**
 * The live session: the ordered list of answers given so far.
 *
 * `choiceLabel` is the label of the answer chosen, or `null` when the person
 * moved on from an outcome that continues (e.g. "Take a few moments to breathe").
 */
export type PathEntry = { nodeId: string; choiceLabel: string | null };
export type SessionState = { path: PathEntry[] };

export type SessionAction =
  | { type: 'answer'; nodeId: string; choiceLabel: string }
  | { type: 'continue'; nodeId: string }
  /** Go back to the entry at `index` to change it; everything from there on is dropped. */
  | { type: 'rewind'; index: number }
  | { type: 'reset' }
  | { type: 'restore'; state: SessionState };

export const STORAGE_KEY = 'conflictflow.session.v1';
export const EMPTY: SessionState = { path: [] };

/** Where a single step leads, or null if the step is not valid for that node. */
function stepTarget(flow: Flow, entry: PathEntry): string | null {
  const node = flow.nodes[entry.nodeId];
  if (!node) return null;
  if (node.type === 'question') {
    return node.choices.find((c) => c.label === entry.choiceLabel)?.next ?? null;
  }
  return entry.choiceLabel === null && node.continue ? node.continue : null;
}

/**
 * Walk the path from the start. Returns the node the person is on now, or null
 * if the path is not a valid walk through this version of the chart.
 */
export function walk(flow: Flow, state: SessionState): string | null {
  let at = flow.start;
  for (const entry of state.path) {
    if (entry.nodeId !== at) return null;
    const next = stepTarget(flow, entry);
    if (!next) return null;
    at = next;
  }
  return at;
}

export function currentNodeId(flow: Flow, state: SessionState): string {
  return walk(flow, state) ?? flow.start;
}

/** Ids of nodes on the safety branch, i.e. outcomes with tone "safety". */
export function safetyNodeIds(flow: Flow): Set<string> {
  return new Set(
    Object.entries(flow.nodes)
      .filter(([, n]) => n.type === 'outcome' && n.tone === 'safety')
      .map(([id]) => id),
  );
}

/** True if the person is on, or has passed through, the safety branch. */
export function touchesSafetyBranch(flow: Flow, state: SessionState): boolean {
  const safety = safetyNodeIds(flow);
  if (safety.has(currentNodeId(flow, state))) return true;
  return state.path.some((e) => safety.has(e.nodeId) || safety.has(stepTarget(flow, e) ?? ''));
}

export function sessionReducer(flow: Flow) {
  return (state: SessionState, action: SessionAction): SessionState => {
    switch (action.type) {
      case 'answer': {
        const here = walk(flow, state);
        const node = here ? flow.nodes[here] : undefined;
        if (here !== action.nodeId || node?.type !== 'question') return state;
        if (!node.choices.some((c) => c.label === action.choiceLabel)) return state;
        return { path: [...state.path, { nodeId: action.nodeId, choiceLabel: action.choiceLabel }] };
      }
      case 'continue': {
        const here = walk(flow, state);
        const node = here ? flow.nodes[here] : undefined;
        if (here !== action.nodeId || node?.type !== 'outcome' || !node.continue) return state;
        return { path: [...state.path, { nodeId: action.nodeId, choiceLabel: null }] };
      }
      case 'rewind': {
        if (action.index < 0 || action.index >= state.path.length) return state;
        return { path: state.path.slice(0, action.index) };
      }
      case 'reset':
        return EMPTY;
      case 'restore':
        return walk(flow, action.state) === null ? state : action.state;
    }
  };
}

/** Minimal Storage interface so tests can pass a fake. */
export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function defaultStore(): KeyValueStore | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * Save the session. On the safety branch this writes NOTHING — not the path,
 * not a flag, not a cleared value. Storage stays exactly as it was.
 */
export function persistSession(flow: Flow, state: SessionState, store = defaultStore()): void {
  if (!store || touchesSafetyBranch(flow, state)) return;
  try {
    if (state.path.length === 0) store.removeItem(STORAGE_KEY);
    else store.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked: the app keeps working, it just can't resume.
  }
}

/**
 * Read a saved session, if there is a valid one to offer resuming.
 * Rejects anything malformed, anything that no longer walks the current chart,
 * and anything on the safety branch — so a hand-edited value can't restore
 * someone around the safety gate.
 */
export function loadSession(flow: Flow, store = defaultStore()): SessionState | null {
  if (!store) return null;
  let raw: string | null;
  try {
    raw = store.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isSessionState(parsed) || parsed.path.length === 0) return null;
    if (walk(flow, parsed) === null || touchesSafetyBranch(flow, parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Erase the saved live session from this device. */
export function resetSession(store = defaultStore()): void {
  try {
    store?.removeItem(STORAGE_KEY);
  } catch {
    // nothing to do
  }
}

function isSessionState(v: unknown): v is SessionState {
  if (typeof v !== 'object' || v === null || !Array.isArray((v as SessionState).path)) return false;
  return (v as SessionState).path.every(
    (e) =>
      typeof e === 'object' &&
      e !== null &&
      typeof e.nodeId === 'string' &&
      (typeof e.choiceLabel === 'string' || e.choiceLabel === null),
  );
}
