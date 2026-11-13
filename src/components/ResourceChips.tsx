import { useState } from 'react';
import { Sheet } from './Sheet.tsx';
import { ResourceContent, getResource } from './ResourceContent.tsx';
import { Spark } from './Marks.tsx';
import { primeAudioFromGesture } from '../exercises/audio.ts';
import { getPrefs } from '../state/prefs.ts';
import { S } from '../strings.ts';

/**
 * Quiet, inviting links under a question, printed like little stickers.
 * Each opens a sheet over the screen; closing it returns to exactly the same question.
 */
export function ResourceChips({ ids }: { ids: string[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const items = ids.map((id) => ({ id, r: getResource(id) })).filter((x) => x.r);
  if (items.length === 0) return null;
  const open = openId ? getResource(openId) : undefined;

  return (
    <>
      <ul className="flex flex-wrap gap-2 pt-2" aria-label={S.question.resourcesLabel}>
        {items.map(({ id, r }) => (
          <li key={id}>
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={() => {
                // Audio can only start from a tap. If sound is on, wake it now, inside the tap.
                if (r!.type === 'exercise' && getPrefs().sound === 'on') primeAudioFromGesture();
                setOpenId(id);
              }}
              className="inline-flex -rotate-1 items-center gap-2 rounded-full border-2 border-blue bg-blue-soft px-4 py-2 font-display text-small font-bold text-accent-ink"
            >
              <Spark className="h-4 w-4 text-coral" />
              {r!.label}
            </button>
          </li>
        ))}
      </ul>
      {open && (
        <Sheet title={open.label} onClose={() => setOpenId(null)} tall={open.type === 'exercise'}>
          <ResourceContent resource={open} onDone={() => setOpenId(null)} />
        </Sheet>
      )}
    </>
  );
}
