import type { Flow } from '../schema/flow.ts';
import { currentNodeId, touchesSafetyBranch, type SessionState } from '../state/session.ts';

export type ShareOptions = {
  date: Date;
  therapistName?: string;
};

/**
 * Plain text for "Share with my therapist": the date, the questions and answers
 * in order, and where the person landed.
 *
 * The safety phase is left out entirely — even an answer of "Yes" — so the text
 * reads the same whatever was answered there. On the safety branch itself this
 * returns null: there is nothing to share.
 */
export function composeShareText(flow: Flow, state: SessionState, opts: ShareOptions): string | null {
  if (touchesSafetyBranch(flow, state)) return null;

  const isSafetyPhase = (id: string) => flow.nodes[id]?.phase === 'safety';
  const lines: string[] = [];

  const name = opts.therapistName?.trim();
  lines.push(name ? `For ${name}` : 'For my therapist');
  lines.push(opts.date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
  lines.push('');

  const steps = state.path.filter((e) => !isSafetyPhase(e.nodeId));
  if (steps.length) {
    lines.push('How I got here:');
    steps.forEach((e, i) => {
      const node = flow.nodes[e.nodeId]!;
      const said = node.type === 'question' ? node.prompt : node.title;
      lines.push(`${i + 1}. ${said} — ${e.choiceLabel ?? 'I took a break here'}`);
    });
    lines.push('');
  }

  const hereId = currentNodeId(flow, state);
  const here = flow.nodes[hereId]!;
  if (!isSafetyPhase(hereId)) {
    if (here.type === 'outcome') {
      lines.push(`Where I landed: ${here.title}${here.body ? ` ${here.body}` : ''}`);
    } else {
      lines.push(`Where I stopped: ${here.prompt}`);
    }
  }

  return lines.join('\n').trimEnd();
}
