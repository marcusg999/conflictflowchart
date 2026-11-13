import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import flowJson from '../content/flow.json';
import resourcesJson from '../content/resources.json';
import { flowSchema, parseFlow } from '../src/schema/flow.ts';
import { parseResources } from '../src/schema/resources.ts';
import {
  allEdges,
  canReachTerminal,
  cycles,
  orphans,
  reachableFrom,
  unreachable,
} from '../src/lib/graph.ts';
import {
  STORAGE_KEY,
  EMPTY,
  loadSession,
  persistSession,
  sessionReducer,
  type KeyValueStore,
  type SessionAction,
  type SessionState,
} from '../src/state/session.ts';
import { composeShareText } from '../src/lib/share.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const flow = parseFlow(flowJson);
const resources = parseResources(resourcesJson);

/**
 * The nodes nothing routes into, per the photographed chart (OPEN 4 and OPEN 5).
 * When the therapist answers those, this list changes — update it here.
 */
const EXPECTED_ORPHANS = ['aware_partner_need', 'stuck_disagreement'];

describe('graph integrity', () => {
  it('1. every next and continue resolves to a node that exists', () => {
    const dangling = allEdges(flow).filter((e) => !(e.to in flow.nodes));
    expect(dangling).toEqual([]);
    expect(flow.nodes[flow.start]).toBeDefined();
  });

  it('2. every question has at least two choices, with distinct labels', () => {
    for (const [id, node] of Object.entries(flow.nodes)) {
      if (node.type !== 'question') continue;
      expect(node.choices.length, id).toBeGreaterThanOrEqual(2);
      const labels = node.choices.map((c) => c.label.trim().toLowerCase());
      expect(new Set(labels).size, `${id} has duplicate choice labels`).toBe(labels.length);
    }
  });

  it('3. every resource referenced in flow.json exists in resources.json (and its markdown file exists)', () => {
    const referenced = new Set(Object.values(flow.nodes).flatMap((n) => n.resources ?? []));
    const missing = [...referenced].filter((r) => !(r in resources.resources));
    expect(missing).toEqual([]);
    for (const id of referenced) {
      const r = resources.resources[id]!;
      if ('markdown' in r && r.markdown) {
        expect(existsSync(`${root}${r.markdown}`), `${id}: ${r.markdown} is missing`).toBe(true);
      }
    }
  });

  it('4. from every node, some ending is reachable (loops are allowed, traps are not)', () => {
    const ok = canReachTerminal(flow);
    const trapped = Object.keys(flow.nodes).filter((id) => !ok.has(id));
    expect(trapped).toEqual([]);

    const loops = cycles(flow);
    if (loops.length) {
      console.warn(
        `[info] ${loops.length} loop(s) in the chart (allowed; each has a way out):\n` +
          loops.map((l) => `  ${[...l, l[0]].join(' → ')}`).join('\n'),
      );
    }
  });

  it('5. nodes nothing routes into are exactly the two known gaps; everything unreachable is explained by them', () => {
    const noInbound = orphans(flow);
    const lost = unreachable(flow);
    console.warn(
      `[warning] nothing routes into: ${noInbound.join(', ')}\n` +
        `[warning] unreachable from "${flow.start}" (${lost.length}): ${lost.join(', ')}`,
    );

    expect(noInbound).toEqual(EXPECTED_ORPHANS);

    // Every unreachable node must sit downstream of one of those gaps —
    // i.e. there is no *other*, unexplained hole in the chart.
    const explained = new Set(EXPECTED_ORPHANS.flatMap((o) => [...reachableFrom(flow, o)]));
    expect(lost.filter((id) => !explained.has(id))).toEqual([]);
  });

  it('6. the safety branch writes nothing to storage and never appears in share text', () => {
    const reduce = sessionReducer(flow);
    const ipv = flow.nodes.ipv_safety!;
    const safe = flow.nodes.safe!;
    expect(ipv.type === 'outcome' && ipv.tone).toBe('safety');

    const fakeStore = (initial: Record<string, string> = {}) => {
      const data = new Map(Object.entries(initial));
      const writes: string[] = [];
      const store: KeyValueStore = {
        getItem: (k) => data.get(k) ?? null,
        setItem: (k, v) => {
          writes.push(`set ${k}=${v}`);
          data.set(k, v);
        },
        removeItem: (k) => {
          writes.push(`remove ${k}`);
          data.delete(k);
        },
      };
      return { store, data, writes };
    };

    // (a) Fresh device: answer "No" to "Are you safe?" — nothing at all is written.
    {
      const { store, data, writes } = fakeStore();
      const s1 = reduce(EMPTY, { type: 'answer', nodeId: 'safe', choiceLabel: 'No' });
      expect(s1.path).toEqual([{ nodeId: 'safe', choiceLabel: 'No' }]);
      persistSession(flow, s1, store);
      expect(writes).toEqual([]);
      expect(data.size).toBe(0);
    }

    // (b) Device with a saved session: entering the safety branch leaves it byte-for-byte unchanged.
    {
      const saved = JSON.stringify({ path: [{ nodeId: 'safe', choiceLabel: 'Yes' }] });
      const { store, data, writes } = fakeStore({ [STORAGE_KEY]: saved, other: 'x' });
      let s: SessionState = loadSession(flow, store)!;
      expect(s).not.toBeNull();
      const actions: SessionAction[] = [
        { type: 'rewind', index: 0 },
        { type: 'answer', nodeId: 'safe', choiceLabel: 'No' },
      ];
      s = reduce(s, actions[0]!);
      s = reduce(s, actions[1]!);
      persistSession(flow, s, store);
      expect(writes).toEqual([]);
      expect(data.get(STORAGE_KEY)).toBe(saved);
    }

    // (c) A hand-edited saved value on the safety branch is never restored.
    {
      const { store } = fakeStore({ [STORAGE_KEY]: JSON.stringify({ path: [{ nodeId: 'safe', choiceLabel: 'No' }] }) });
      expect(loadSession(flow, store)).toBeNull();
    }

    // (d) Share text: none on the safety branch; no trace of the safety phase on any other path.
    const date = new Date('2026-01-02T12:00:00Z');
    expect(composeShareText(flow, { path: [{ nodeId: 'safe', choiceLabel: 'No' }] }, { date })).toBeNull();

    let s: SessionState = EMPTY;
    for (const a of [
      { type: 'answer', nodeId: 'safe', choiceLabel: 'Yes' },
      { type: 'answer', nodeId: 'everyone_regulated', choiceLabel: 'No' },
      { type: 'continue', nodeId: 'breathe' },
      { type: 'answer', nodeId: 'reaction_makes_sense', choiceLabel: 'No' },
      { type: 'answer', nodeId: 'outsized_reaction', choiceLabel: 'No' },
    ] as SessionAction[]) {
      s = reduce(s, a);
    }
    expect(s.path).toHaveLength(5);
    const text = composeShareText(flow, s, { date, therapistName: 'Dr. Rivera' })!;
    expect(text).toContain('Where I landed: Go to individual therapy.');
    expect(text).toContain('Is everyone regulated? — No');
    if (safe.type !== 'question' || ipv.type !== 'outcome') throw new Error('unexpected node types');
    for (const forbidden of [safe.prompt, safe.help!, ipv.title, 'ipv_safety', 'hotline']) {
      expect(text).not.toContain(forbidden);
    }
  });

  it('7. flow.json and resources.json validate against their schemas', () => {
    expect(flowSchema.safeParse(flowJson).success).toBe(true);
    expect(() => parseResources(resourcesJson)).not.toThrow();

    // And the schema really does catch the mistakes a hand edit is likely to make.
    const clone = () => structuredClone(flowJson) as Record<string, any>;
    const typo = clone();
    typo.nodes.safe.promt = typo.nodes.safe.prompt;
    expect(flowSchema.safeParse(typo).success, 'misspelled key').toBe(false);

    const dangling = clone();
    dangling.nodes.safe.choices[0].next = 'no_such_node';
    expect(flowSchema.safeParse(dangling).success, 'answer pointing nowhere').toBe(false);

    const noNote = clone();
    delete noNote.nodes.partner_respects_boundary.note;
    expect(flowSchema.safeParse(noNote).success, 'unconfirmed without a note').toBe(false);

    const oneChoice = clone();
    oneChoice.nodes.safe.choices.pop();
    expect(flowSchema.safeParse(oneChoice).success, 'question with one answer').toBe(false);
  });
});
