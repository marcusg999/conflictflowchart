import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { QuickExit } from './QuickExit.tsx';
import { S } from '../strings.ts';

/**
 * Page frame: Quick Exit top-right on every screen (first in tab order),
 * an optional left-hand control (Back, About), then the screen's content.
 */
export function Shell({
  children,
  showAbout = false,
  left,
  hideQuickExit = false,
}: {
  children: ReactNode;
  showAbout?: boolean;
  left?: ReactNode;
  /** Only for screens that render their own, larger Quick Exit. */
  hideQuickExit?: boolean;
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
      {/* row-reverse: Quick Exit is first in the DOM (first Tab stop) but sits on the right. */}
      <header className="relative z-10 flex min-h-12 flex-row-reverse items-center justify-between gap-3">
        {!hideQuickExit && <QuickExit />}
        <div className="flex items-center gap-2">
          {left}
          {showAbout && (
            <Link to="/about" replace className="rounded-full border-2 border-line-strong bg-card px-3.5 py-1.5 font-display text-small font-bold text-ink">
              {S.common.about}
            </Link>
          )}
        </div>
      </header>
      {children}
    </div>
  );
}
