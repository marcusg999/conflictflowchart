import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { QuickExit } from './QuickExit.tsx';
import { S } from '../strings.ts';

/**
 * Page frame: Quick Exit top-right on every screen (first in tab order),
 * then the screen's content in a narrow, phone-sized column.
 */
export function Shell({
  children,
  showAbout = false,
  hideQuickExit = false,
}: {
  children: ReactNode;
  showAbout?: boolean;
  /** Only for screens that render their own, larger Quick Exit. */
  hideQuickExit?: boolean;
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
      {/* row-reverse: Quick Exit is first in the DOM (first Tab stop) but sits on the right. */}
      <header className="flex min-h-12 flex-row-reverse items-center justify-between gap-3">
        {!hideQuickExit && <QuickExit />}
        <div>
          {showAbout && (
            <Link to="/about" replace className="rounded-lg px-1 py-2 text-small text-ink-soft underline-offset-4 hover:underline">
              {S.common.about}
            </Link>
          )}
        </div>
      </header>
      {children}
    </div>
  );
}
