/**
 * Safety contact details — the ONE place to correct them.
 *
 * Verified against https://www.thehotline.org on 2026-11-13:
 *   phone 1-800-799-7233 · text "START" to 88788 · live chat on thehotline.org.
 * Re-check these periodically (see README). The app imports them everywhere;
 * they are never copied into content/resources.json.
 */

export const HOTLINE_NAME = 'National Domestic Violence Hotline';

export const HOTLINE_PHONE_DISPLAY = '1-800-799-7233';
/** Digits for the tel: link. */
export const HOTLINE_PHONE_TEL = '+18007997233';

export const HOTLINE_SMS_NUMBER = '88788';
export const HOTLINE_SMS_BODY = 'START';
export const HOTLINE_SMS_DISPLAY = 'Text START to 88788';

/** Live chat opens from the hotline's own site. */
export const HOTLINE_CHAT_URL = 'https://www.thehotline.org/';
export const HOTLINE_CHAT_DISPLAY = 'thehotline.org';

export const EMERGENCY_NUMBER = '911';

/**
 * Where Quick Exit goes. location.replace() is used, so this page takes the
 * app's place in history and Back does not return to the app.
 */
export const QUICK_EXIT_URL = 'https://weather.com';
