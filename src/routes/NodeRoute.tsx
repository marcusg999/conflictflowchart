import { Navigate, useParams } from 'react-router';
import { flow } from '../content.ts';
import { routeFor, useSession } from '../state/SessionProvider.tsx';
import { SafetyScreen } from './SafetyScreen.tsx';
import { QuestionScreen } from './QuestionScreen.tsx';
import { OutcomeScreen } from './OutcomeScreen.tsx';
import { UnmappedScreen } from './UnmappedScreen.tsx';

/**
 * Guards /q/:nodeId and /outcome/:nodeId.
 * - With nothing answered yet, only the start question ("Are you safe?") is
 *   reachable; any other direct hit goes to "/". You can't deep-link past the gate.
 * - Otherwise the URL must match where the session actually is; if it doesn't,
 *   we go to where the session is. The URL never drives the walk.
 */
export function NodeRoute({ kind }: { kind: 'question' | 'outcome' }) {
  const { nodeId = '' } = useParams();
  const { state, currentId } = useSession();

  if (state.path.length === 0) {
    if (kind === 'question' && nodeId === flow.start) return <QuestionScreen key={nodeId} nodeId={nodeId} />;
    return <Navigate to="/" replace />;
  }

  if (nodeId !== currentId) return <Navigate to={routeFor(currentId)} replace />;

  const node = flow.nodes[currentId];
  if (!node) return <UnmappedScreen />;
  if (node.type !== kind) return <Navigate to={routeFor(currentId)} replace />;

  if (node.type === 'outcome' && node.tone === 'safety') return <SafetyScreen nodeId={currentId} />;
  return node.type === 'question' ? (
    <QuestionScreen key={currentId} nodeId={currentId} />
  ) : (
    <OutcomeScreen key={currentId} nodeId={currentId} />
  );
}
