import type { ResourceLink } from '../schema/resources.ts';
import {
  HOTLINE_CHAT_DISPLAY,
  HOTLINE_CHAT_URL,
  HOTLINE_NAME,
  HOTLINE_PHONE_DISPLAY,
  HOTLINE_PHONE_TEL,
  HOTLINE_SMS_BODY,
  HOTLINE_SMS_DISPLAY,
  HOTLINE_SMS_NUMBER,
} from '../constants/safety.ts';
import { S, fmt } from '../strings.ts';

export function hrefFor(link: ResourceLink): string {
  switch (link.kind) {
    case 'tel':
      return `tel:${link.value}`;
    // "?&body=" is the form that works on both iOS and Android.
    case 'sms':
      return link.body ? `sms:${link.value}?&body=${encodeURIComponent(link.body)}` : `sms:${link.value}`;
    case 'web':
      return link.value;
  }
}

/** The national hotline, built only from src/constants/safety.ts. */
export function hotlineLinks(): ResourceLink[] {
  return [
    { kind: 'tel', label: fmt(S.safety.callLabel, { name: HOTLINE_NAME }), display: HOTLINE_PHONE_DISPLAY, value: HOTLINE_PHONE_TEL },
    { kind: 'sms', label: S.safety.textLabel, display: HOTLINE_SMS_DISPLAY, value: HOTLINE_SMS_NUMBER, body: HOTLINE_SMS_BODY },
    { kind: 'web', label: S.safety.chatLabel, display: HOTLINE_CHAT_DISPLAY, value: HOTLINE_CHAT_URL },
  ];
}

/**
 * Real destinations. Every number is also shown as plain, selectable text,
 * because someone may need to dial it from a phone that isn't theirs.
 */
export function LinkList({ links }: { links: ResourceLink[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {links.map((link) => {
        const external = link.kind === 'web';
        const shown = link.display ?? link.value.replace(/^https:\/\/(www\.)?/, '').replace(/\/$/, '');
        return (
          <li key={`${link.kind}:${link.value}`} className="rounded-soft border-2 border-line-strong bg-card p-4">
            <a
              href={hrefFor(link)}
              {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className="block rounded-lg font-display text-lead font-bold text-accent-ink underline decoration-2 underline-offset-4"
            >
              {link.label}
              {external && <span className="sr-only"> {S.resource.opensNewTab}</span>}
            </a>
            <p className="mt-1 text-body text-ink">
              <span className="dialable">{shown}</span>
            </p>
          </li>
        );
      })}
    </ul>
  );
}
