# Open questions for the therapist

Things the app needs a decision on. Nothing below has been guessed into the app
without being marked: every guess shows up highlighted on the `/review` page.

The first seven are about the chart itself. Items marked **OPEN 1–6** come
straight from the notes in `content/flow.json` (a test checks the two stay in
sync). Item 7 was found by the app's own checks.

---

## A. The chart

### OPEN 1 — "Can your partner respect your boundary?" → Yes
The Yes line runs off the left edge of the photographed chart.
**Right now it goes to:** "Can you take accountability for your part in the conflict?" (a guess).
**Question:** Where should Yes go?

### OPEN 2 — "Can your partner [take accountability for their part]?" → Yes
**Right now it goes to:** "Are you aware of what you need?"
**Question:** Is that right, or should it go to "Are you both stuck in a disagreement?"

### OPEN 3 — "Are you aware of what you need?" → No
The No line leaves the left edge of the chart.
**Right now it goes to:** "Go to individual therapy." (a guess).
**Question:** Where should No go?

### OPEN 4 — Nothing leads to "Are you aware of what your partner needs?"
The line into this question is hidden under a fold in the paper. Because nothing
leads in, **the whole "Their needs" track can't be reached** — five screens:
- Are you aware of what your partner needs?
- Have you asked your partner what they need?
- Is what they need reasonable, and something you are willing to give?
- Do it. (Ask your partner what they need.)
- Do it. (Give what they're asking for.)

**Question:** Which question and which answer lead into "Are you aware of what your partner needs?"

### OPEN 5 — Nothing leads to "Are you both stuck in a disagreement?"
And both of its answers are guesses.
**Right now:** Yes → "Can you accept your partner's differences?" · No → "Good repair."
**Question:** What leads into this question, and where do Yes and No go?

### OPEN 6 — "Do you want a partner who ignores your boundaries?" → Yes
The No line is clear ("You're allowed to leave."). The Yes line isn't.
**Right now it goes to:** "Can you accept your partner's differences?" (a guess).
**Question:** Where should Yes go?

### OPEN 7 — A loop with no way out for one set of answers
"Is defensiveness present?" → **No** → "Does this reaction make sense given the
circumstance?" → **Yes** → back to "Is defensiveness present?"

Someone who answers No, then Yes, goes round these two questions forever. Other
answers do lead out, but the person in the loop won't feel that.
**Question:** Is one of these lines meant to go somewhere else?

### Also: the three "Do it." cards
The chart has three identical "Do it!" cards. The app splits them so each says
what to go do ("Ask for what you need." / "Ask your partner what they need." /
"Give what they're asking for."). **Question:** Keep them separate, or use one
shared card?

---

## B. Safety and resources

8. **988 Suicide & Crisis Lifeline.** It isn't on the original chart. Should it be
   listed alongside the domestic violence hotline?
9. **The privacy line on the safety screen** (draft, needs your wording):
   "Calls and websites you visit can show up in your phone's history. If someone
   might check your phone, think about using a friend's phone or a public computer."
10. **"Ruth", the hotline's AI chat.** thehotline.org also offers an AI chat
    ("Ruth") for when live advocates are busy. It's left out, because this app
    shows no generated text. Do you want it listed as a link?
11. **The app's name on the phone.** "So You're In Conflict. Now What?" (or "Now
    What?" on the home screen) shows in the app switcher and browser history. For
    someone whose phone may be checked, should there be a neutral name and icon option?
12. **Finding a therapist:** four directories are listed (all checked to load):
    Psychology Today, Open Path Collective, Inclusive Therapists, AAMFT Therapist
    Locator. Keep, change, or replace?
13. **Communication** and **trauma responses**: which links should these list?
    (Until then they show "not written yet".)
14. **Reading content** to write: Setting a boundary · Where big reactions come from
    · Talking about needs · Checking your expectations · What you want in a partner.
15. **Link labels** under questions were drafted by the developer (e.g. "Where big
    reactions come from"). Change any you like in `content/resources.json`.

---

## C. Features waiting on your words (from "Making it work for actual clients")

16. **How long should a real break be, and what's the return-time script?**
    (Research on flooding suggests about 20 minutes; the number is yours to set.)
17. **Should the app ask the couple to set up a break agreement in advance?**
    What should it ask? (break signal, length, where each person goes, who reaches out first)
18. **If a session loops through regulation three times, should the app re-ask
    "Are you safe?"** — and in what words?
19. **Is there a late-night message you'd want shown, and after what hour?**
20. **Sentence starters** for the three "Do it" outcomes? (The app is ready to show
    them — add a `"stems"` list to the outcome in `flow.json`.)
21. **Spanish** — needed at launch, or later? (The app is ready for it: it's a
    translated copy of `content/strings.en.json` plus the chart text.)
