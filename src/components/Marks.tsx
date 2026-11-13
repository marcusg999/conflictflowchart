/** Small hand-drawn marks, printed in one ink. Decorative only. */

export function Arrow({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 20" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 11c6-3 14-4 21-2.5 4 .8 8 1.6 13 1.2" />
      <path d="M29 4.5c2.4 2 4.6 3.6 7 5.2-2.6 1.5-5 3.3-7.2 5.6" />
    </svg>
  );
}

export function BackArrow({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 20" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10.5c-5-.6-11-.8-18 .2" />
      <path d="M9 4C7 6 5.4 7.8 3.4 10.6 5.6 12.6 7.5 14.4 9.2 16.6" />
    </svg>
  );
}

/** A scribbled underline, drawn under a word. */
export function Squiggle({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 12" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" preserveAspectRatio="none">
      <path d="M3 8c10-5 18 3 28-1s17-4 27 0 17 3 28-1 16-3 31 1" />
    </svg>
  );
}

/** A little printed star / sparkle for resource chips. */
export function Spark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className} fill="currentColor">
      <path d="M10 1.5c.7 3.6 1.8 5.6 3.4 6.8 1.4 1 3 1.5 5.1 1.7-2.1.3-3.8.8-5.1 1.8-1.6 1.2-2.7 3.2-3.4 6.7-.7-3.5-1.8-5.5-3.4-6.7-1.3-1-3-1.5-5.1-1.8 2.1-.2 3.7-.7 5.1-1.7C8.2 7.1 9.3 5.1 10 1.5Z" />
    </svg>
  );
}
