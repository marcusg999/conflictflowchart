// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, render } from '@testing-library/react';
import { freshDevice, mockAudio, renderApp } from './helpers.tsx';
import { navigation } from '../src/lib/quickExit.ts';
import {
  HOTLINE_PHONE_DISPLAY,
  HOTLINE_PHONE_TEL,
  HOTLINE_SMS_DISPLAY,
  QUICK_EXIT_URL,
} from '../src/constants/safety.ts';
import { STORAGE_KEY } from '../src/state/session.ts';
import { resources } from '../src/content.ts';
import { ResourceContent } from '../src/components/ResourceContent.tsx';

const answer = (label: string) => fireEvent.click(screen.getByRole('button', { name: label, exact: true }));

describe('safety gate', () => {
  beforeEach(() => freshDevice());
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('cannot be deep-linked past: any question or outcome without a session goes to the start screen', () => {
    for (const path of ['/q/everyone_regulated', '/q/accept_differences', '/outcome/good_repair', '/outcome/ipv_safety', '/q/nope']) {
      renderApp(path);
      expect(screen.queryByRole('heading', { level: 1, name: /now what/i }), path).not.toBeNull();
      cleanup();
    }
  });

  it('the start question is reachable directly', () => {
    renderApp('/q/safe');
    expect(screen.getByRole('heading', { level: 1, name: 'Are you safe?' })).toBeTruthy();
  });

  it('a saved session is never restored around the gate, and never auto-resumed', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ path: [{ nodeId: 'safe', choiceLabel: 'No' }] }));
    renderApp('/outcome/ipv_safety');
    expect(screen.queryByText('Pick up where you left off')).toBeNull();
    cleanup();

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ path: [{ nodeId: 'safe', choiceLabel: 'Yes' }] }));
    renderApp('/q/everyone_regulated');
    // Lands on the start screen with a choice, not in the middle of the path.
    expect(screen.queryByRole('heading', { name: 'Is everyone regulated?' })).toBeNull();
    expect(screen.getByText('Pick up where you left off')).toBeTruthy();
    fireEvent.click(screen.getByText('Pick up where you left off'));
    expect(screen.getByRole('heading', { name: 'Is everyone regulated?' })).toBeTruthy();
  });

  it('"No" shows the safety card: hotline from constants, no way to continue, nothing stored, no sound', () => {
    const audio = mockAudio();
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    renderApp('/q/safe');
    setItem.mockClear();
    answer('No');

    expect(screen.getByRole('heading', { level: 1, name: 'Get to a safe location.' })).toBeTruthy();
    expect(screen.getByText(HOTLINE_PHONE_DISPLAY)).toBeTruthy();
    expect(screen.getByText(HOTLINE_SMS_DISPLAY)).toBeTruthy();
    expect(document.querySelector(`a[href="tel:${HOTLINE_PHONE_TEL}"]`)).not.toBeNull();
    expect(document.querySelector('a[href="sms:88788?&body=START"]')).not.toBeNull();

    // The only buttons: Quick Exit and Back to the start. No "continue anyway".
    const buttons = screen.getAllByRole('button').map((b) => b.textContent?.trim() ?? '');
    expect(buttons.map((b) => b.replace(/Leaves this app.*$/, '').trim())).toEqual(['Quick exit', 'Back to the start']);
    expect(screen.queryByText(/share/i)).toBeNull();
    expect(screen.queryByText(/how i got here/i)).toBeNull();

    expect(setItem).not.toHaveBeenCalled();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(audio.contexts).toHaveLength(0);

    // "Back to the start" clears memory without touching storage.
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem');
    fireEvent.click(screen.getByText('Back to the start'));
    expect(setItem).not.toHaveBeenCalled();
    expect(removeItem).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Start' })).toBeTruthy();
  });

  it('ipv-resources renders with no AudioContext and its hotline values come from constants', () => {
    const audio = mockAudio();
    render(<ResourceContent resource={resources.resources['ipv-resources']!} onDone={() => {}} />);
    expect(screen.getByText(HOTLINE_PHONE_DISPLAY)).toBeTruthy();
    expect(audio.contexts).toHaveLength(0);
  });
});

describe('quick exit', () => {
  beforeEach(() => freshDevice());
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.documentElement.style.visibility = '';
  });

  it('is on every screen, clears memory and the saved session, then replaces the page', () => {
    const replace = vi.spyOn(navigation, 'replace').mockImplementation(() => {});
    renderApp('/q/safe');
    answer('Yes');
    answer('Yes');
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    expect(screen.getByRole('heading', { name: /speaking and acting/ })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Quick exit/ }));
    expect(replace).toHaveBeenCalledWith(QUICK_EXIT_URL);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    // In-memory walk is gone: the guard has sent the app back to the start.
    expect(screen.queryByRole('heading', { name: /speaking and acting/ })).toBeNull();
  });

  it('is reachable on the start, about, outcome, and safety screens', () => {
    for (const path of ['/', '/about', '/q/safe']) {
      renderApp(path);
      expect(screen.getAllByRole('button', { name: /Quick exit/ }).length, path).toBeGreaterThan(0);
      cleanup();
    }
    renderApp('/q/safe');
    answer('No');
    expect(screen.getAllByRole('button', { name: /Quick exit/ })).toHaveLength(1);
  });
});
