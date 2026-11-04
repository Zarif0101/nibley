# Nibley: PRD v1

Date: 2026-10-28 · Owner: Zarif · Status: approved by Zarif, 2026-10-28
Name: Nibley (Zarif, 2026-10-28).
Sources: `Second Brain/brainstorms/2026-10-28-own-clicky.md` (interview), `Second Brain/research/2026-10-28-heyclicky-teardown.md` (how HeyClicky works).

## 1. Job
A voice study buddy on Zarif's Windows laptop. He holds a hotkey and asks out loud. It looks at his screen, explains in simple words, and draws on the screen to show what it means.

Main use: YouTube lectures while he studies from physical books.

## 2. Who it is for
One user: Zarif. English. Has ADHD: needs the answer first, one idea at a time, short spoken replies.

## 3. Hard constraints
- **Cost:** runs on his Claude subscription through Claude Code. No API credits, no paid services.
- **PC:** i5-6200U (2 cores), 8 GB RAM, one 1366x768 screen. Heavy work (speech-to-text, voices) runs online, not on the laptop.
- **Always online.** No offline mode.
- **Laptop only.** No phone app.
- **Windows only.** A move to Linux Mint is possible but undecided; nothing is built for it. Steps in `SWITCHING-PLAN.md` (only if he switches).

## 4. v1 features
### 4.1 Talk
- Hold `Win` + `` ` `` (the key under Escape), talk, let go. Changeable in settings.
  - Backtick alone still types normally.
  - Windows Terminal (installed, v1.24) uses `Win` + `` ` `` for its drop-down "quake" window. Nibley takes the combo first, so that Terminal feature stops working while Nibley runs.
  - Releasing `Win` must not open the Start menu.
  - Must not clash with HeyClicky's push-to-talk if both stay installed.
- Speech-to-text: Groq free Whisper (Zarif chose it 2026-10-28). Fallback: Windows online speech recognition.
- Answers spoken with Microsoft Edge online voices, starting on the first sentence.
- Follow-ups work in one session ("and what about that part?").

### 4.2 See
- Takes one screenshot of the whole screen when he lets go of the hotkey.
- Screen only. No camera, no physical books.

### 4.3 Explain
- Model: Claude Haiku by default. A tray switch changes it to Sonnet.
- Voice: friend + calm teacher. Analogies, very simple words, short replies.
- Answer first, then one idea at a time.

### 4.4 Draw on screen
- A see-through layer over the screen. Clicks pass through it.
- The buddy picks the style per question, on its own:
  - point and circle one thing, with a short label
  - step-by-step guide (numbered steps)
  - free markup (arrows, highlights, several labels)
- Drawing is timed to speech: each mark appears while the line about it is spoken (same idea as HeyClicky).
- Marks fade when he presses the hotkey again or after a set time.

### 4.5 Do basic things
- Basic actions: click, type text, scroll, open an app or website, pause/play YouTube.
- Tray switch: **Auto** (just does it) or **Ask first** (says what it will do, waits for "yes"). Default: Ask first.
- Hard limits in both modes: never types passwords or payment details, never deletes files, never sends messages or posts.

### 4.6 Memory and learning
- Its own folder in the vault: `Second Brain/nibley/`.
  - `about-me.md`: who Zarif is and how he learns (seeded once from `me/`).
  - `learning.md`: what he knows, what confused him, which analogies worked.
  - `rules.md`: the buddy's own teaching rules. It edits these itself.
  - `changelog.md`: every change to `rules.md`, dated, so he can undo it.
- Reads only `nibley/` on each question, not the whole vault (speed + subscription limits).
- Now and then asks one short question to learn more (a mini-interview), at most once per session.

### 4.7 Saved lessons
- Say "save this" after an explanation. Nibley saves the screenshot, the spoken text and the drawing script as one lesson.
- Each lesson gets a short title (Nibley writes it) and lives in `Second Brain/nibley/lessons/`.
- Replay: say "show my lessons" or open them from the tray. Replay redraws the marks on the saved screenshot and speaks the text again. No Claude call, so no subscription use.

## 5. Not in v1
Background workers, camera, Bangla, phone, wake word, typing mode, rewriting its own code.
Later: code self-upgrades, always with his permission (suggest, test in a copy, ask, roll back on crash).

## 6. Done means (acceptance tests)
Run on Zarif's laptop with real YouTube lectures:
1. Paused lecture frame + "what does this mean?" → correct plain-words answer with an analogy, and a circle on the right part of the frame.
2. "How do I turn on captions?" → step-by-step guide on the YouTube player, steps in the right places.
3. A diagram on screen + "explain this" → free markup on at least 2 parts of the diagram, timed to speech.
4. "Pause the video" in Ask first mode → asks, waits, pauses after "yes". In Auto mode → just pauses.
5. Ask for something on the hard-limit list → refuses and says why.
6. Follow-up question without repeating context → answers about the same thing.
7. After a session, `learning.md` has at least one new dated line; `rules.md` changes are in `changelog.md`.
8. Speed: first spoken word within **5 s** of letting go, on Haiku (target 3 s). Measured and logged.
9. Idle CPU under 5% with nothing happening.
10. "Save this" after test 1 → a lesson appears in `nibley/lessons/` with a title. Replaying it shows the same screenshot, marks and voice, with no internet call to Claude.

## 7. Risks
- **Speed:** Claude Code adds startup time. Keep one Claude Code process running and reuse it. If still over 5 s, rethink before building more.
- **Pointing accuracy:** Haiku can miss by a few pixels. Use Windows' accessibility info (button names and boxes) when the app exposes it, the screenshot otherwise. YouTube video frames have no button info, so pointing there relies on the screenshot only.
- **Subscription terms:** check Anthropic's current terms for using a Claude subscription through Claude Code inside a personal tool. Zarif reads; Claude links the pages before the build.
- **Subscription limits:** every question sends a screenshot. Heavy study sessions may hit the usage cap, Sonnet sooner than Haiku.

## 8. Open questions for Zarif
1. OK with Ask first as the default and the hard limits (section 4.5)?

Answered 2026-10-28: name = Nibley. Saved lessons = yes, in v1 (section 4.7). Hotkey = hold `Win` + `` ` `` (section 4.1).
