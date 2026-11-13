import en from '../content/strings.en.json';

/**
 * Every word of UI copy lives in content/strings.<lang>.json — no English in
 * components. English ships; another language is a file drop
 * (e.g. content/strings.es.json with the same keys). Missing keys fall back to English.
 */
export type Strings = typeof en;

const files = import.meta.glob<Strings>('../content/strings.*.json', { eager: true, import: 'default' });

function merge<T>(base: T, over: unknown): T {
  if (typeof base !== 'object' || base === null || Array.isArray(base)) {
    return (typeof over === typeof base && over !== undefined ? over : base) as T;
  }
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  const o = (over ?? {}) as Record<string, unknown>;
  for (const k of Object.keys(out)) out[k] = merge(out[k], o[k]);
  return out as T;
}

function pick(): Strings {
  const lang = (globalThis.navigator?.language ?? 'en').slice(0, 2).toLowerCase();
  const file = files[`../content/strings.${lang}.json`];
  return lang !== 'en' && file ? merge(en, file) : en;
}

export const S: Strings = pick();
export const LANG_FILES = Object.keys(files);

/** Fill {placeholders}: fmt('Call {number}', { number: '911' }). */
export function fmt(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m);
}
