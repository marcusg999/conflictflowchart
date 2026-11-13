import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { flow } from '../src/content.ts';
import { cycles } from '../src/lib/graph.ts';

const doc = readFileSync(`${process.cwd()}/OPEN_QUESTIONS.md`, 'utf8');

describe('OPEN_QUESTIONS.md stays in sync with flow.json', () => {
  it('every "OPEN n" note in flow.json has a section in OPEN_QUESTIONS.md, and vice versa', () => {
    const inFlow = Object.values(flow.nodes)
      .map((n) => /OPEN (\d+)/.exec(n.note ?? '')?.[1])
      .filter(Boolean)
      .map(Number)
      .sort((a, b) => a - b);
    const inDoc = [...doc.matchAll(/^### OPEN (\d+)/gm)].map((m) => Number(m[1]));
    for (const n of inFlow) expect(inDoc, `OPEN ${n}`).toContain(n);
    // Every documented OPEN item is either in flow.json or the loop (item 7).
    const loops = cycles(flow).length;
    expect(inDoc.length).toBe(inFlow.length + loops);
  });

  it('every unconfirmed node is mentioned by its question text', () => {
    for (const n of Object.values(flow.nodes)) {
      if (n.confirmed || n.type !== 'question') continue;
      const words = n.prompt.replace(/\?$/, '');
      expect(doc, words).toContain(words);
    }
  });
});
