import { describe, expect, it } from 'vitest';
import { flow, resources } from '../src/content.ts';
import { reviewText } from '../src/lib/review.ts';

describe('review mode text', () => {
  const text = reviewText(flow, resources);
  it('flags the nodes with no inbound edge, the unreachable ones, and the loop', () => {
    expect(text).toContain('(aware_partner_need)');
    expect(text).toContain('(stuck_disagreement)');
    expect(text).toMatch(/Can't be reached from the start \(6\)/);
    expect(text).toContain('“Is defensiveness present?” → No → “Does this reaction make sense given the circumstance?” → Yes');
  });
  it('shows every unconfirmed note', () => {
    for (const n of Object.values(flow.nodes)) if (!n.confirmed) expect(text).toContain(n.note!);
  });
  it('lists every node and every answer', () => {
    for (const [id, n] of Object.entries(flow.nodes)) {
      expect(text).toContain(`(${id})`);
      if (n.type === 'question') for (const c of n.choices) expect(text).toContain(`${c.label} → `);
    }
  });
});
