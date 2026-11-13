# So You're In Conflict. Now What?

A small app for phones. One person, in the middle of a relationship conflict,
answers one question at a time and lands on a clear next step. The questions
and answers are a licensed couples therapist's hand-drawn decision chart,
shown exactly as drawn.

- No accounts, no database, no server. Nothing anyone taps leaves their phone.
- No chatbot and no generated text. Every word comes from the files described below.
- Works with no internet once it has been opened once. It can be installed to a
  phone's home screen.
- "Are you safe?" is always the first question, and it can't be skipped.

This is not therapy, not crisis care, and not a diagnostic tool.

---

## Changing the app — a guide for non-engineers

Everything you'd want to change is a plain text file. Edit it (on GitHub you can
click the pencil icon), save, and the site rebuilds. There's nothing else to do.

### To change the wording of a question → `content/flow.json`

Find the question and change the text in quotes after `"prompt"`. The small line
under a question is `"help"`. For an ending, the headline is `"title"` and the
paragraph is `"body"`.

```json
"everyone_regulated": {
  "type": "question", "phase": "regulation",
  "prompt": "Is everyone regulated?",
  ...
```

Leave the word before the colon (`"prompt"`) and the id (`"everyone_regulated"`)
exactly as they are. Only change the words inside the quotes after the colon.

### To change where an answer goes → `content/flow.json`

Each answer has a `"label"` (what the button says) and a `"next"` (the id of the
question or ending it leads to):

```json
"choices": [
  { "label": "Yes", "next": "speaking_acting" },
  { "label": "No",  "next": "breathe" }
]
```

Change `"next"` to the id of a different question. An ending that moves on
afterwards (like "Take a few moments to breathe") uses `"continue"` instead.

When you've confirmed a line that was a guess, change `"confirmed": false` to
`"confirmed": true` and delete the `"note"`. Then update `OPEN_QUESTIONS.md`.

**If you make a mistake** (a typo in a field name, or an answer that points to an id
that doesn't exist), the automatic checks fail and the site won't publish. It will
never show a broken chart to a client.

**To see the whole chart at once,** open the site's `/review` page (for example,
`https://your-site.netlify.app/review`). It lists every question, every answer and
where it goes, highlights every guess, and has a "Copy as text" button for emailing
corrections. It isn't linked from the app.

### To write the resource content → the `content/resources/` folder

Each resource you write yourself (boundary prompts, values prompts and so on) is a
plain text file in `content/resources/`, written in
[Markdown](https://commonmark.org/help/) (`#` for a heading, `-` for a bullet,
`**bold**`). Delete the line `<!-- TODO: clinician content -->` once it's written.
Until then, the app tells the client "Your therapist hasn't written this part yet."

The **labels** shown under questions and the **lists of links** (phone numbers,
texts, websites) are in `content/resources.json`.

### To change the app's own wording (buttons, the intro, and so on) → `content/strings.en.json`

For Spanish, copy that file to `content/strings.es.json` and translate the text
after each colon. Phones set to Spanish will use it. The chart text in `flow.json`
would need translating as well.

### ⚠ Re-check the hotline number regularly

The national domestic violence hotline number, text code and website, and the
Quick Exit page, are in **one file: `src/constants/safety.ts`**.

They were last checked against [thehotline.org](https://www.thehotline.org) on
**13 November 2026**: phone **1-800-799-7233**, text **START to 88788**, live chat
on thehotline.org. Please check them every few months and after any news about
the hotline. If anything changes, change it in that one file only.

---

## Previewing and publishing

### Preview on your computer

You need [Node.js](https://nodejs.org) (version 22 or newer). In a terminal, in this folder:

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:5173. The chart review is at http://localhost:5173/review.

To run the automatic checks (the same ones that run before publishing):

```bash
npm test
```

### Publish (redeploy)

**GitHub Pages (how it's published now).** The site lives at
**https://marcusg999.github.io/conflictflowchart/** (the chart review is at
`…/conflictflowchart/review`). Every change saved to the `main` branch republishes
it automatically, usually within two minutes. The automatic checks run first; if
they fail, nothing is published and the live site stays as it was. You can watch
this under the repository's **Actions** tab ("Publish to GitHub Pages").

Behind the scenes, `.github/workflows/pages.yml` runs `npm test`, then
`npm run build:pages`, which builds the app for the `/conflictflowchart/`
sub-folder, and puts the result on the `gh-pages` branch. In the repository's
**Settings → Pages**, the source must be "Deploy from a branch: `gh-pages` /
(root)". Don't edit the `gh-pages` branch by hand; it's overwritten on every publish.

GitHub Pages can't send custom HTTP headers, so the privacy policy is enforced by
a tag inside the page instead. That covers everything that matters here (no outside
connections, scripts, fonts or images), but not the setting that stops other sites
from embedding the app in a frame. Netlify sets that too.

**Netlify** is the alternative with the strictest setup. In Netlify choose "Add new
site → Import an existing project", pick this GitHub repository, and accept the
settings. They come from `netlify.toml`, and there are no environment variables to
set. **Vercel** works the same way (it reads `vercel.json`). Both serve from the
root of a domain, so they use the plain `npm run build`.

Installed copies on phones update themselves the next time they're opened online.

---

## How it protects people

- **Quick Exit** is on every screen and is the biggest button on the safety
  screen. It erases the walk from memory and from the phone, then replaces the
  page with weather.com. Because the app only ever uses one browser history entry,
  pressing Back afterwards doesn't return to the app.
- **The safety answer is never kept.** Answering "No" to "Are you safe?" writes
  nothing to the phone, never appears in "How I got here" or anything shared, and
  can't be restored. "Share with my therapist" leaves out the safety question
  entirely, even a "Yes", so the shared text reads the same either way.
- **The safety screen makes no sound,** and has no "continue anyway". The ways out
  are the hotline, Quick Exit, or "Back to the start".
- **Nothing leaves the phone.** There are no analytics, no crash reporting, no
  third-party scripts and no web fonts. A Content-Security-Policy forbids every
  outside connection. Phone numbers are always shown as plain, selectable text as
  well as tap-to-call, for someone dialling from another phone.
- **Delete everything** (in About) erases everything the app has stored on the phone.
- **Sound** is never on until the person chooses "Sound on" once. That choice
  exists so the app can stay silent in a home where it needs to.
- The app never resumes into the middle of a walk without asking first.

## Accessibility

- Each question is the page's main heading, and focus moves to it so screen
  readers announce each new question. Answers are real buttons. Resource sheets
  are proper dialogs: focus stays inside, Escape closes them, and focus returns to
  where it was.
- Everything works by keyboard, with visible focus rings. Text is 18px or larger,
  and questions are 28px.
- Colour contrast meets WCAG AA in light and dark mode (checked automatically in
  `tests/contrast.test.ts`).
- Reduced motion is respected everywhere. In the breathing exercises the orb stops
  moving and shows the breath in soft light and colour instead, with the text cues
  and sound unchanged.

**Screen reader pass, current status:** an automated accessibility-tree and
keyboard-only check in Chromium passed. Headings, button names, the answer group,
the dialog name, the focus trap, Escape, and focus returning to the opener all
behave correctly. **A hands-on pass with VoiceOver (iPhone) and TalkBack (Android)
has not been done yet** and should happen before clients use the app.

---

## For developers

Vite + React + TypeScript, react-router, Tailwind, Zod, vite-plugin-pwa. Vitest
with jsdom and Testing Library for tests. No backend; the build is static.

```
content/
  flow.json             the chart (validated by src/schema/flow.ts)
  resources.json        resource labels, links, exercises (src/schema/resources.ts)
  resources/*.md        therapist-written reading
  strings.en.json       all UI copy
src/
  constants/safety.ts   hotline + quick-exit target (the only copy)
  schema/               Zod schemas; the app fails loudly on a malformed file
  state/session.ts      the walk: a reducer over { path }, one localStorage key
  state/prefs.ts        small local settings
  lib/graph.ts          reachability, orphans, loops (used by tests and /review)
  exercises/            shared clock, breath patterns, orb, Web Audio engine
  routes/ components/
tests/                  graph integrity, safety gate, exercises, resources,
                        contrast, CSP, strings, OPEN_QUESTIONS sync
csp.json                Content-Security-Policy, fed to the build and netlify.toml
```

Key decisions:
- **The URL never drives the walk.** `/q/:id` and `/outcome/:id` must match where
  the session is, or they redirect. A direct hit without a session goes to `/`.
  All in-app navigation uses `replace`, so Quick Exit leaves no back trail.
- **Storage is written only by explicit acts.** The walk is saved after each
  answer, but never on the safety branch and never when empty. Only "Start fresh",
  "Start over", Quick Exit and "Delete everything" clear it.
- **One clock** (`exercises/clock.ts`) drives both the animation (one rAF loop,
  transform and opacity only) and the audio envelope. Audio is synthesised (pink
  noise, a detuned root-and-fifth drone, a soft bell) and every gain change is
  ramped. A test fails the build on any direct `.value =` assignment.
- `npm audit` shows moderate advisories in `workbox-build`, which is build-time
  only. Production dependencies have none.

### Not built yet

- Phase 2, **Practice Mode**: deliberately not started until the live flow is
  approved.
- From "Making it work for actual clients": the timed break with a return time,
  the break agreement, the escalation re-check and the late-night message are
  waiting on the therapist's words (see `OPEN_QUESTIONS.md`, section C).
  Already in: all copy in a strings file (Spanish-ready), "Put this down for now",
  "Delete everything", tracking which answers were changed (included in the shared
  text), optional sentence starters on outcomes, and the therapist's name.
