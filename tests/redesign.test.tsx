// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { freshDevice, mockMatchMedia, renderApp } from './helpers.tsx';
import { RisoMapHero } from '../src/riso/RisoMapHero.tsx';
import { Intro } from '../src/routes/Intro.tsx';
import { STORAGE_KEY } from '../src/state/session.ts';
import { SessionProvider } from '../src/state/SessionProvider.tsx';

const intro = () => (
  <SessionProvider>
    <Intro onDone={() => {}} />
  </SessionProvider>
);

beforeEach(() => {
  freshDevice();
  mockMatchMedia(false);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('riso redesign', () => {
  it('the WebGL map falls back to a still image when WebGL is unavailable, and is hidden from screen readers', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const { container } = render(<RisoMapHero />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('img')?.getAttribute('src')).toMatch(/riso\/map-light\.webp$/);
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('"Back" undoes exactly one answer and returns to that question', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    renderApp('/q/safe');
    expect(screen.queryByRole('button', { name: 'Go back one question' })).toBeNull(); // nothing to go back to
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }));
    expect(screen.getByRole('heading', { level: 1, name: /speaking and acting/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Go back one question' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Is everyone regulated?' })).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).path).toHaveLength(1);
  });

  it('the intro is plain, readable content when scroll effects are off (no IntersectionObserver / reduced motion)', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const { container } = render(intro());
    expect(container.querySelector('[data-scrolly="on"]')).toBeNull();
    for (const text of ["What this isn't", 'If you are in danger', 'Nothing you tap leaves this phone.']) {
      expect(screen.getByText(text)).toBeTruthy();
    }
    expect(screen.getAllByRole('button', { name: /Quick exit/ })).toHaveLength(1);
    cleanup();

    mockMatchMedia(true);
    vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
    const reduced = render(intro());
    expect(reduced.container.querySelector('[data-scrolly="on"]')).toBeNull();
  });

  it('the safety screen gets none of the playful treatment (no tilt, no tape, no second plate, no stamps)', () => {
    renderApp('/q/safe');
    fireEvent.click(screen.getByRole('button', { name: 'No' }));
    const html = document.body.innerHTML;
    for (const cls of ['taped', 'sticker', 'riso-title', 'stamp', 'tab', 'halftone']) {
      expect(html, cls).not.toMatch(new RegExp(`class="[^"]*\\b${cls}\\b`));
    }
  });
});
