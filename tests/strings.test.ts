import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const dir = `${process.cwd()}/content`;
const keys = (o: unknown, prefix = ''): string[] =>
  typeof o === 'object' && o !== null && !Array.isArray(o)
    ? Object.entries(o).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k))
    : [prefix];

describe('UI strings', () => {
  const en = JSON.parse(readFileSync(`${dir}/strings.en.json`, 'utf8'));

  it('every translation file has exactly the English keys', () => {
    for (const f of readdirSync(dir).filter((f) => /^strings\.[a-z]{2}\.json$/.test(f) && f !== 'strings.en.json')) {
      const other = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'));
      expect(keys(other).sort(), f).toEqual(keys(en).sort());
    }
  });

  it('components contain no stray user-facing English (spot check of JSX text nodes)', () => {
    const srcDir = `${process.cwd()}/src`;
    const files: string[] = [];
    const walk = (d: string) => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        if (e.isDirectory()) walk(`${d}/${e.name}`);
        else if (e.name.endsWith('.tsx')) files.push(`${d}/${e.name}`);
      }
    };
    walk(srcDir);
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      // Text directly between JSX tags with 2+ letter words, e.g. >Start over<
      for (const m of src.matchAll(/>\s*([A-Za-z][A-Za-z ,'’.!?]{3,})\s*</g)) offenders.push(`${f.replace(srcDir, 'src')}: ${m[1]}`);
    }
    expect(offenders).toEqual([]);
  });
});
