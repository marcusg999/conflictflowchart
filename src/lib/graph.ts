import type { Flow, FlowNode } from '../schema/flow.ts';

/** An edge out of a node: a choice, or an outcome's "continue". */
export type Edge = { from: string; to: string; label: string | null };

export function edgesOf(id: string, node: FlowNode): Edge[] {
  if (node.type === 'question') return node.choices.map((c) => ({ from: id, to: c.next, label: c.label }));
  return node.continue ? [{ from: id, to: node.continue, label: null }] : [];
}

export function allEdges(flow: Flow): Edge[] {
  return Object.entries(flow.nodes).flatMap(([id, node]) => edgesOf(id, node));
}

/** An outcome with nowhere further to go: the end of a walk. */
export function isTerminal(node: FlowNode): boolean {
  return node.type === 'outcome' && !node.continue;
}

export function reachableFrom(flow: Flow, start: string): Set<string> {
  const seen = new Set<string>();
  const queue = [start];
  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id) || !(id in flow.nodes)) continue;
    seen.add(id);
    for (const e of edgesOf(id, flow.nodes[id]!)) queue.push(e.to);
  }
  return seen;
}

/** Nodes nothing points to (other than the start node). */
export function orphans(flow: Flow): string[] {
  const inbound = new Set(allEdges(flow).map((e) => e.to));
  return Object.keys(flow.nodes).filter((id) => id !== flow.start && !inbound.has(id)).sort();
}

/** Nodes a person can never land on when starting from `flow.start`. */
export function unreachable(flow: Flow): string[] {
  const seen = reachableFrom(flow, flow.start);
  return Object.keys(flow.nodes).filter((id) => !seen.has(id)).sort();
}

/** Every node from which at least one terminal outcome can be reached. */
export function canReachTerminal(flow: Flow): Set<string> {
  const ok = new Set(Object.keys(flow.nodes).filter((id) => isTerminal(flow.nodes[id]!)));
  const edges = allEdges(flow);
  let grew = true;
  while (grew) {
    grew = false;
    for (const e of edges) {
      if (ok.has(e.to) && !ok.has(e.from)) {
        ok.add(e.from);
        grew = true;
      }
    }
  }
  return ok;
}

/**
 * Loops in the chart, each listed once as a sequence of node ids.
 * The chart has deliberate loops; this is for surfacing them, not forbidding them.
 */
export function cycles(flow: Flow): string[][] {
  const found = new Map<string, string[]>();
  const ids = Object.keys(flow.nodes);
  const walk = (origin: string, at: string, trail: string[]) => {
    for (const e of edgesOf(at, flow.nodes[at]!)) {
      if (e.to === origin) {
        // Canonicalise by rotating so the smallest id leads; dedupes rotations.
        const min = trail.reduce((a, b) => (a < b ? a : b));
        const i = trail.indexOf(min);
        const canon = [...trail.slice(i), ...trail.slice(0, i)];
        found.set(canon.join('>'), canon);
      } else if (!trail.includes(e.to) && e.to in flow.nodes) {
        walk(origin, e.to, [...trail, e.to]);
      }
    }
  };
  for (const id of ids) walk(id, id, [id]);
  return [...found.values()];
}
