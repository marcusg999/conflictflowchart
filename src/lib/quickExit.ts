import { QUICK_EXIT_URL } from '../constants/safety.ts';
import { resetSession } from '../state/session.ts';

/** Seam for tests: the real thing replaces the current history entry. */
export const navigation = {
  replace: (url: string) => window.location.replace(url),
};

/**
 * Leave immediately. The caller has already cleared in-memory state.
 * This erases the saved session, blanks the page (so a back/forward cache
 * snapshot shows nothing), and replaces this history entry with a neutral page.
 */
export function leaveNow(): void {
  resetSession();
  try {
    document.documentElement.style.visibility = 'hidden';
    document.title = 'Weather';
  } catch {
    // keep going
  }
  navigation.replace(QUICK_EXIT_URL);
}
