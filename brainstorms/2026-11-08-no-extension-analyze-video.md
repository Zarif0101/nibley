# No browser extension + "Analyze this video": Brainstorm / Discovery Notes
Date: 2026-11-08 · Goal: drop the Chrome/Brave extension (no install for learners) and add a one-click "analyze the whole video" at lesson start.
Status: complete (built 2026-11-08)
Context sources: `src/youtube.js`, `extension/`, `src/study.js`, `src/platform/helper.ps1`

## What the extension does today
Video id, title, current time, paused, duration, the transcript, and (since edcce9d) seek for study page time links.

## Spikes run 2026-11-08 (facts, not asked)
- **Time without extension: works.** UI Automation on Brave's window (Chromium exposes the page): the "Seek slider" gives time (208 s) and duration (13960 s) plus text "3 Minutes 28 Seconds of 3 Hours 52 Minutes 40 Seconds"; the Play/Pause button name gives paused ("Play (k)" = paused). 150 ms per read, window need not be in front. Video id: address bar (helper already reads it).
- **Transcript without extension: works.** Plain HTTPS from Node to YouTube's player API with the ANDROID (or IOS) client returns caption tracks without the proof token; MIT 18.06 lecture: 1,323 lines. The WEB client is refused. Risk: YouTube can change this; fallback = the lecture ear (Groq, any site).
- **Seek without extension: does not work.** UIA SetValue on the seek slider is accepted but the video doesn't move (YouTube's slider ignores it).

## Summary / key decisions
- No extension at all, in any form. The `extension/` folder and the bridge server get removed. Learners install only Nibley.
- Time links open the video at that time in a new Brave tab.
- "Analyze this video" (Zarif: "Yes, build it"): button on the Study page; one Haiku call over the whole transcript gives chapters + ideas, "know this first", tricky parts; questions then carry the lecture map; 10-min recaps stop for that video. Transcript only, not slide pictures.

## Q&A log
### Q1 - Time links without the extension (asked, answer was the principle)
- Asked: time link reopens the video at that time in a new tab, or drop time links? (Both options were extension-free.)
- Captured: "I don't want this to have any relation with the extension. I don't want users to download extensions."
- Decision: remove the extension and everything tied to it. Q1 itself re-asked, with "no extension" made explicit.
- Flags: none

### Q1b - What a time link does (re-asked in plain words)
- Zarif found the questions hard to follow ("I'm really having a hard time understanding what you are trying to say in the questions"). Re-explained with a table: what Nibley needs, why, how it gets it.
- Captured: "Do whatever is best."
- Decision (Claude's pick): option A. Clicking a time opens the same video at that time in a new Brave tab (youtube.com/watch?v=ID&t=Ns).
- Lesson for later questions: plain words, say what the user sees and does, no internals.

## Open flags (pending input)
