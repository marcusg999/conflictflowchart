import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { QuickExit } from './QuickExit.tsx';
import { S } from '../strings.ts';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * A bottom sheet that slides up over the current screen. A real modal dialog:
 * focus is trapped inside, Escape closes it, the page behind is inert, and
 * focus goes back to whatever opened it. Quick Exit is inside it too, so it
 * stays reachable while the sheet is open.
 */
export function Sheet({
  title,
  onClose,
  children,
  tall = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Exercises take the whole screen. */
  tall?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const root = document.getElementById('root');
    root?.setAttribute('inert', '');
    root?.setAttribute('aria-hidden', 'true');
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const first = panel.current?.querySelector<HTMLElement>('[data-autofocus]') ?? panel.current;
    first?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panel.current) return;
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const firstEl = items[0]!;
      const lastEl = items[items.length - 1]!;
      const active = document.activeElement;
      if (e.shiftKey && (active === firstEl || active === panel.current)) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && active === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);

    return () => {
      document.removeEventListener('keydown', onKey, true);
      root?.removeAttribute('inert');
      root?.removeAttribute('aria-hidden');
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="fade-in absolute inset-0 bg-ink/40" onClick={() => closeRef.current()} aria-hidden="true" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        tabIndex={-1}
        className={`sheet-in relative flex w-full max-w-xl flex-col overflow-hidden rounded-t-[1.75rem] bg-paper shadow-soft outline-none ${
          tall ? 'h-dvh rounded-t-none sm:h-[95dvh] sm:rounded-t-[1.75rem]' : 'max-h-[88dvh]'
        }`}
      >
        <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
          <QuickExit />
          <button
            type="button"
            onClick={() => closeRef.current()}
            className="rounded-full px-4 py-2 text-small font-bold text-ink-soft"
          >
            {S.common.close}
          </button>
        </div>
        <h2 id="sheet-title" className="px-5 pb-3 text-lead font-bold">
          {title}
        </h2>
        <div className="flex flex-1 flex-col overflow-y-auto px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
