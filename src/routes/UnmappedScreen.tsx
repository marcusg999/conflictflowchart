import { Link } from 'react-router';
import { Shell } from '../components/Shell.tsx';
import { S } from '../strings.ts';

/** Shown if a path leads somewhere the chart doesn't cover. Never improvised. */
export function UnmappedScreen() {
  return (
    <Shell>
      <main className="flex flex-1 flex-col justify-center gap-6">
        <h1 className="riso-question text-question">{S.outcome.unmapped}</h1>
        <Link to="/" replace className="text-body text-accent-ink underline underline-offset-4">
          {S.outcome.startOver}
        </Link>
      </main>
    </Shell>
  );
}
