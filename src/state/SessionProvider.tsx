import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { flow } from '../content.ts';
import {
  EMPTY,
  currentNodeId,
  persistSession,
  resetSession,
  sessionReducer,
  type SessionState,
} from './session.ts';

type SessionApi = {
  state: SessionState;
  /** The node the person is on now. */
  currentId: string;
  /** True once "Are you safe?" has been answered Yes in this session. */
  clearedSafety: boolean;
  answer: (nodeId: string, choiceLabel: string) => void;
  continueFrom: (nodeId: string) => void;
  rewind: (index: number) => void;
  restore: (state: SessionState) => void;
  /** Start a new walk: clears memory AND the saved session. */
  startFresh: () => void;
  /** Clear memory only. Storage is left exactly as it is. */
  clearMemory: () => void;
};

const SessionContext = createContext<SessionApi | null>(null);
const reducer = sessionReducer(flow);

export function SessionProvider({ children, initial = EMPTY }: { children: ReactNode; initial?: SessionState }) {
  // Never auto-resume: the app always opens with an empty walk. Resuming is an explicit choice.
  const [state, dispatch] = useReducer(reducer, initial);

  useEffect(() => {
    persistSession(flow, state);
  }, [state]);

  const answer = useCallback((nodeId: string, choiceLabel: string) => dispatch({ type: 'answer', nodeId, choiceLabel }), []);
  const continueFrom = useCallback((nodeId: string) => dispatch({ type: 'continue', nodeId }), []);
  const rewind = useCallback((index: number) => dispatch({ type: 'rewind', index }), []);
  const restore = useCallback((s: SessionState) => dispatch({ type: 'restore', state: s }), []);
  const startFresh = useCallback(() => {
    resetSession();
    dispatch({ type: 'reset' });
  }, []);
  const clearMemory = useCallback(() => dispatch({ type: 'reset' }), []);

  const api = useMemo<SessionApi>(() => {
    const first = state.path[0];
    // "Cleared" = the first answer is the one that does NOT lead to the safety branch.
    const clearedSafety =
      !!first && first.nodeId === flow.start && flow.nodes[currentNodeId(flow, { path: [first] })]?.phase !== 'safety';
    return {
      state,
      currentId: currentNodeId(flow, state),
      clearedSafety,
      answer,
      continueFrom,
      rewind,
      restore,
      startFresh,
      clearMemory,
    };
  }, [state, answer, continueFrom, rewind, restore, startFresh, clearMemory]);

  return <SessionContext.Provider value={api}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionApi {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}

/** The URL for a node: questions under /q, outcomes under /outcome. */
export function routeFor(nodeId: string): string {
  const node = flow.nodes[nodeId];
  return node?.type === 'outcome' ? `/outcome/${nodeId}` : `/q/${nodeId}`;
}
