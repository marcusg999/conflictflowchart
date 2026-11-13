import type { Flow, FlowNode } from '../schema/flow.ts';
import type { Resources } from '../schema/resources.ts';
import { cycles, edgesOf, orphans, unreachable } from './graph.ts';
import { S, fmt } from '../strings.ts';

/** How a node reads in review. Outcomes include their body so the three "Do it." cards are told apart. */
export function said(node: FlowNode): string {
  if (node.type === 'question') return node.prompt;
  return node.body ? `${node.title} ${node.body}` : node.title;
}

/** A loop described in words: "A" → Yes → "B" → No → back to "A". */
export function describeLoop(flow: Flow, loop: string[]): string {
  const parts: string[] = [];
  loop.forEach((id, i) => {
    const next = loop[(i + 1) % loop.length]!;
    const edge = edgesOf(id, flow.nodes[id]!).find((e) => e.to === next);
    parts.push(`“${said(flow.nodes[id]!)}” → ${edge?.label ?? S.review.continuesTo}`);
  });
  return `${parts.join(' → ')} → “${said(flow.nodes[loop[0]!]!)}”`;
}

export type ReviewIssues = { noInbound: string[]; unreachable: string[]; loops: string[][] };

export function reviewIssues(flow: Flow): ReviewIssues {
  return { noInbound: orphans(flow), unreachable: unreachable(flow), loops: cycles(flow) };
}

/** The whole map as plain text, for emailing corrections back. */
export function reviewText(flow: Flow, resources: Resources): string {
  const out: string[] = [fmt(S.review.headerText, { version: String(flow.version) }), ''];
  const issues = reviewIssues(flow);
  const name = (id: string) => `“${said(flow.nodes[id]!)}” (${id})`;

  out.push(S.review.attention.toUpperCase());
  if (issues.noInbound.length) out.push(`- ${S.review.noInbound} ${issues.noInbound.map(name).join('; ')}`);
  if (issues.unreachable.length)
    out.push(`- ${fmt(S.review.unreachable, { count: String(issues.unreachable.length) })} ${issues.unreachable.map(name).join('; ')}`);
  for (const loop of issues.loops) out.push(`- ${S.review.loops} ${describeLoop(flow, loop)}`);
  const unconfirmed = Object.entries(flow.nodes).filter(([, n]) => !n.confirmed);
  for (const [id, n] of unconfirmed) out.push(`- ${S.review.unconfirmed}: ${name(id)} — ${n.note ?? ''}`);
  out.push('');

  for (const phase of flow.phases) {
    out.push(`== ${phase.title} ==`);
    for (const [id, n] of Object.entries(flow.nodes)) {
      if (n.phase !== phase.id) continue;
      out.push(`${n.confirmed ? '' : '[UNCONFIRMED] '}${said(n)}  (${id})`);
      if (n.type === 'question') {
        if (n.help) out.push(`    ${S.review.help}: ${n.help}`);
        for (const c of n.choices) out.push(`    ${c.label} → ${name(c.next)}`);
      } else {
        if (n.body) out.push(`    ${S.review.body}: ${n.body}`);
        out.push(`    ${S.review.tone}: ${n.tone}`);
        out.push(n.continue ? `    ${S.review.continuesTo} → ${name(n.continue)}` : `    ${S.review.ending}`);
        if (n.stems?.length) out.push(`    ${S.review.stems}: ${n.stems.map((s) => `“${s}”`).join(' / ')}`);
      }
      if (n.resources?.length)
        out.push(`    ${S.review.resources}: ${n.resources.map((r) => resources.resources[r]?.label ?? r).join(', ')}`);
      if (!n.confirmed && n.note) out.push(`    NOTE: ${n.note}`);
      out.push('');
    }
  }

  out.push(`== ${S.review.resourcesTitle} ==`);
  for (const [id, r] of Object.entries(resources.resources)) {
    out.push(`${r.confirmed ? '' : '[UNCONFIRMED] '}${r.label}  (${id}, ${r.type})`);
    if (r.note) out.push(`    NOTE: ${r.note}`);
  }
  return out.join('\n');
}
