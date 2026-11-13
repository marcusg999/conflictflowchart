import type { ReactNode } from 'react';

/**
 * A deliberately small Markdown renderer for therapist-written resource files.
 * Supports headings, paragraphs, bullet and numbered lists, **bold**, *italic*
 * and [links](https://… | tel:… | sms:…). HTML is never interpreted: comments
 * are dropped and any other tags show as plain text. Output is React elements.
 */

export const TODO_MARKER = 'TODO: clinician content';

export function isUnwritten(md: string): boolean {
  return md.includes(TODO_MARKER);
}

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*|\[([^\]]+)\]\(((?:https:\/\/|tel:|sms:)[^)\s]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${key}-${i++}`;
    if (m[1] !== undefined) out.push(<strong key={k}>{m[1]}</strong>);
    else if (m[2] !== undefined) out.push(<em key={k}>{m[2]}</em>);
    else {
      const href = m[4]!;
      const web = href.startsWith('https://');
      out.push(
        <a key={k} href={href} {...(web ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className="text-accent-ink underline underline-offset-4">
          {m[3]}
        </a>,
      );
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function renderMarkdown(source: string, { skipFirstHeading = false } = {}): ReactNode[] {
  const lines = source.replace(/<!--[\s\S]*?-->/g, '').replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let skipped = !skipFirstHeading;
  let n = 0;

  const flushPara = () => {
    if (para.length) blocks.push(<p key={`p${n++}`}>{inline(para.join(' '), `p${n}`)}</p>);
    para = [];
  };
  const flushList = () => {
    if (!list) return;
    const items = list.items.map((t, i) => <li key={i}>{inline(t, `l${n}-${i}`)}</li>);
    blocks.push(
      list.ordered ? (
        <ol key={`l${n++}`} className="list-decimal pl-6">{items}</ol>
      ) : (
        <ul key={`l${n++}`} className="list-disc pl-6">{items}</ul>
      ),
    );
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    const ul = /^\s*[-*]\s+(.*)$/.exec(line);
    const ol = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (h) {
      flushPara();
      flushList();
      if (!skipped && h[1] === '#') {
        skipped = true;
        continue;
      }
      const level = h[1]!.length;
      const cls = level === 1 ? 'text-question font-bold' : level === 2 ? 'text-lead font-bold' : 'text-body font-bold';
      blocks.push(
        level <= 2 ? (
          <h3 key={`h${n++}`} className={cls}>{inline(h[2]!, `h${n}`)}</h3>
        ) : (
          <h4 key={`h${n++}`} className={cls}>{inline(h[2]!, `h${n}`)}</h4>
        ),
      );
    } else if (ul || ol) {
      flushPara();
      const ordered = !!ol;
      if (list && list.ordered !== ordered) flushList();
      list ??= { ordered, items: [] };
      list.items.push((ul ?? ol)![1]!);
    } else if (line.trim() === '') {
      flushPara();
      flushList();
    } else {
      flushList();
      para.push(line.trim());
    }
  }
  flushPara();
  flushList();
  return blocks;
}
