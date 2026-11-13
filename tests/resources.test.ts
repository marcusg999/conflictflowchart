import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import flowJson from '../content/flow.json';
import resourcesJson from '../content/resources.json';
import { parseFlow } from '../src/schema/flow.ts';
import { parseResources } from '../src/schema/resources.ts';
import * as safety from '../src/constants/safety.ts';

const root = `${process.cwd()}/`;
const flow = parseFlow(flowJson);
const resources = parseResources(resourcesJson);

describe('resources (Addendum Part A)', () => {
  it('every resource id referenced in flow.json exists in resources.json', () => {
    const referenced = [...new Set(Object.values(flow.nodes).flatMap((n) => n.resources ?? []))];
    expect(referenced.filter((r) => !(r in resources.resources))).toEqual([]);
  });

  it("every reading resource's markdown file exists (and every fallback markdown file)", () => {
    for (const [id, r] of Object.entries(resources.resources)) {
      if ('markdown' in r && r.markdown) expect(existsSync(`${root}${r.markdown}`), id).toBe(true);
      if (r.type === 'reading') expect(r.markdown, id).toBeTruthy();
    }
  });

  it('tel/sms values are digits (and +) only; web values are https://', () => {
    for (const r of Object.values(resources.resources)) {
      if (r.type !== 'links') continue;
      for (const l of r.links) {
        if (l.kind === 'web') expect(l.value).toMatch(/^https:\/\//);
        else expect(l.value).toMatch(/^\+?\d+$/);
      }
    }
    expect(safety.HOTLINE_PHONE_TEL).toMatch(/^\+?\d+$/);
    expect(safety.HOTLINE_SMS_NUMBER).toMatch(/^\d+$/);
    expect(safety.HOTLINE_CHAT_URL).toMatch(/^https:\/\//);
    expect(safety.QUICK_EXIT_URL).toMatch(/^https:\/\//);
  });

  it('ipv-resources takes the hotline from constants/safety.ts — no hotline literals in content files', () => {
    const ipv = resources.resources['ipv-resources']!;
    expect(ipv.type).toBe('links');
    expect(ipv.type === 'links' && ipv.hotline).toBe(true);
    const raw = readFileSync(`${root}content/resources.json`, 'utf8') + readFileSync(`${root}content/flow.json`, 'utf8');
    for (const literal of ['799-7233', '7997233', safety.HOTLINE_SMS_NUMBER, 'thehotline.org']) {
      expect(raw, literal).not.toContain(literal);
    }
  });

  it('the exit target and hotline values appear in exactly one source file', () => {
    // A cheap guard against copies drifting out of sync.
    const files = ['src/components/LinkList.tsx', 'src/routes/SafetyScreen.tsx', 'src/routes/Intro.tsx', 'src/lib/quickExit.ts'];
    for (const f of files) {
      const src = readFileSync(`${root}${f}`, 'utf8');
      for (const literal of ['799-7233', '88788', 'weather.com']) expect(src, `${f} has ${literal}`).not.toContain(literal);
    }
  });
});
