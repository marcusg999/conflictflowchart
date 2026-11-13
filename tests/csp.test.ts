import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const root = `${process.cwd()}/`;

describe('privacy: no external connections', () => {
  const csp = JSON.parse(readFileSync(`${root}csp.json`, 'utf8')) as Record<string, string[]>;

  it('every CSP source is self or none — no hosts, no wildcards, no inline', () => {
    for (const [k, v] of Object.entries(csp)) {
      if (k === '//') continue;
      for (const src of v) expect(["'self'", "'none'"], `${k}: ${src}`).toContain(src);
    }
    expect(csp['connect-src']).toEqual(["'self'"]);
  });

  it('netlify.toml carries the same policy plus frame-ancestors', () => {
    const toml = readFileSync(`${root}netlify.toml`, 'utf8');
    const header = /Content-Security-Policy = "([^"]+)"/.exec(toml)?.[1] ?? '';
    for (const [k, v] of Object.entries(csp)) if (k !== '//') expect(header).toContain(`${k} ${v.join(' ')}`);
    expect(header).toContain("frame-ancestors 'none'");
  });

  it('no analytics, telemetry, or third-party script in the app source or HTML', () => {
    const html = readFileSync(`${root}index.html`, 'utf8');
    expect(html).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
    const pkg = JSON.parse(readFileSync(`${root}package.json`, 'utf8'));
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).join(' ');
    expect(deps).not.toMatch(/sentry|analytics|gtag|posthog|mixpanel|amplitude|segment|datadog|bugsnag|hotjar/i);
  });
});
