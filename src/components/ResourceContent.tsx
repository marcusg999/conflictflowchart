import { resources } from '../content.ts';
import type { Resource } from '../schema/resources.ts';
import { LinkList, hotlineLinks } from './LinkList.tsx';
import { isUnwritten, renderMarkdown } from '../lib/markdown.tsx';
import { ExerciseHost } from '../exercises/ExerciseHost.tsx';
import { S } from '../strings.ts';

const markdownFiles = import.meta.glob<string>('../../content/resources/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

export function markdownFor(path: string): string | undefined {
  return markdownFiles[`../../${path}`];
}

function Reading({ path }: { path: string }) {
  const md = markdownFor(path);
  if (!md || isUnwritten(md)) return <p className="text-body text-ink-soft">{S.resource.notWritten}</p>;
  return <div className="flex flex-col gap-4 text-body">{renderMarkdown(md, { skipFirstHeading: true })}</div>;
}

export function ResourceContent({ resource, onDone }: { resource: Resource; onDone: () => void }) {
  switch (resource.type) {
    case 'exercise':
      return <ExerciseHost first={resource.exercise} also={resource.also ?? []} onDone={onDone} />;
    case 'links': {
      const links = [...(resource.hotline ? hotlineLinks() : []), ...resource.links];
      return (
        <div className="flex flex-col gap-4">
          {resource.intro && <p className="text-body text-ink-soft">{resource.intro}</p>}
          {links.length > 0 ? (
            <LinkList links={links} />
          ) : resource.markdown ? (
            <Reading path={resource.markdown} />
          ) : (
            <p className="text-body text-ink-soft">{S.resource.noLinksYet}</p>
          )}
        </div>
      );
    }
    case 'reading':
      return <Reading path={resource.markdown} />;
  }
}

export function getResource(id: string): Resource | undefined {
  return resources.resources[id];
}
