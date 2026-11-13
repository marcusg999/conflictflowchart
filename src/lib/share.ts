import type { Flow } from '../schema/flow.ts';
import { currentNodeId, touchesSafetyBranch, type SessionState } from '../state/session.ts';
import { S, fmt } from '../strings.ts';

export type ShareOptions = {
  date: Date;
  therapistName?: string;
};

/**
 * Plain text for "Share with my therapist": the date, the questions and answers
 * in order, any questions they went back and changed, and where they landed.
 *
 * The safety phase is left out entirely — even an answer of "Yes" — so the text
 * reads the same whatever was answered there. On the safety branch itself this
 * returns null: there is nothing to share.
 */
export function composeShareText(flow: Flow, state: SessionState, opts: ShareOptions): string | null {
  if (touchesSafetyBranch(flow, state)) return null;

  const isSafetyPhase = (id: string) => flow.nodes[id]?.phase === 'safety';
  const said = (id: string) => {
    const n = flow.nodes[id]!;
    return n.type === 'question' ? n.prompt : n.title;
  };
  const lines: string[] = [];

  const name = opts.therapistName?.trim();
  lines.push(name ? fmt(S.share.forName, { name }) : S.share.forTherapist);
  lines.push(opts.date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }));
  lines.push('');

  const steps = state.path.filter((e) => !isSafetyPhase(e.nodeId));
  if (steps.length) {
    lines.push(S.share.howIGotHere);
    steps.forEach((e, i) => lines.push(`${i + 1}. ${said(e.nodeId)} — ${e.choiceLabel ?? S.share.tookBreak}`));
    lines.push('');
  }

  const revised = (state.revised ?? []).filter((id) => id in flow.nodes && !isSafetyPhase(id));
  if (revised.length) {
    lines.push(S.share.wentBack);
    revised.forEach((id) => lines.push(`- ${said(id)}`));
    lines.push('');
  }

  const hereId = currentNodeId(flow, state);
  const here = flow.nodes[hereId]!;
  if (!isSafetyPhase(hereId)) {
    if (here.type === 'outcome') {
      lines.push(`${S.share.landed} ${here.title}${here.body ? ` ${here.body}` : ''}`);
    } else {
      lines.push(`${S.share.stopped} ${here.prompt}`);
    }
  }

  return lines.join('\n').trimEnd();
}
