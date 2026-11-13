import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** WCAG 2.x contrast ratio between two #rrggbb colours. */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, b2] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * b2!;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

const css = readFileSync(`${process.cwd()}/src/index.css`, 'utf8');
function tokens(block: string): Record<string, string> {
  return Object.fromEntries([...block.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1]!, m[2]!.toLowerCase()]));
}
const light = tokens(css.slice(css.indexOf(':root {'), css.indexOf('@media (prefers-color-scheme: dark)')));
const dark = tokens(css.slice(css.indexOf('@media (prefers-color-scheme: dark)'), css.indexOf('@theme')));

// [text, background, minimum]: 4.5 for body text, 3 for large text / UI outlines.
const PAIRS: [string, string, number][] = [
  ['ink', 'paper', 4.5],
  ['ink', 'card', 4.5],
  ['ink', 'paper-deep', 4.5],
  ['ink', 'accent-soft', 4.5],
  ['ink-soft', 'paper', 4.5],
  ['ink-soft', 'card', 4.5],
  ['ink-soft', 'paper-deep', 4.5],
  ['ink-soft', 'accent-soft', 4.5],
  ['accent-ink', 'paper', 4.5],
  ['accent-ink', 'card', 4.5],
  ['accent-ink', 'accent-soft', 4.5],
  ['on-accent', 'accent', 4.5],
  ['paper', 'ink', 4.5], // Quick Exit (prominent) and delete-confirm buttons
  ['accent', 'paper', 3], // focus ring
];

describe('colour contrast (WCAG AA)', () => {
  for (const [name, t] of [['light', light], ['dark', dark]] as const) {
    it(`${name} theme`, () => {
      const fails = PAIRS.map(([fg, bg, min]) => ({ fg, bg, min, ratio: contrast(t[fg]!, t[bg]!) })).filter((p) => !(p.ratio >= p.min));
      expect(fails).toEqual([]);
    });
  }

  it('blue ink (display type, links) on paper, and ink on the coral tint (tabs, review flags)', () => {
    for (const t of [light, dark]) {
      expect(contrast(t['blue']!, t['paper']!)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t['blue']!, t['card']!)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t['ink']!, t['coral-soft']!)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t['ink']!, t['blue-soft']!)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t['accent-ink']!, t['blue-soft']!)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t['on-accent']!, t['blue']!)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
