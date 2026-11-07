# Brief: local session (app code)

> **Updated 2026-11-04 (later):** many parts are already built and tested in the cloud; connect them with `docs/briefs/wiring-checklist.md` instead of writing them again.
> **Updated 2026-11-04:** work from `docs/QUALITY-PLAN.md`, blueprints T0-T11 in order. Task 1 below = T1 (after T0's logging), Task 2 = T2. Task 3 (PRD v2) uses `docs/TEACHING-BIBLE.md` and `docs/LEARNING-ENGINE.md` as inputs and raises their open decisions. Merge PR Zarif0101/nibley#1 first (the `src/learn/` modules the learning engine builds on).

Runs on: Zarif's subscription, Opus at extra effort, on this Windows laptop (the voice and overlay can only be tested here).
Read first: `CLAUDE.md`, `docs/BUILD-LOG.md`, `brainstorms/2026-11-04-pregenerated-study-assets.md`.
Do not touch `library/`. A cloud session is building it at the same time and will deliver it as a PR.

## Task 1: fix the voice (first, it's broken today)
- Symptom (Zarif, 2026-11-04): "Piper shows up. Not the chosen ones." The Edge voice picked in the tray never plays; the Piper backup always does.
- Evidence: `logs/nibley-2026-10-28.log`. On every launch the first line logs `tts_fallback` "no audio in 2.5 s", then every later line logs `backup_voice` for the rest of the session. So one slow first request seems to switch off Edge for the whole session. That log predates the Piper change; check fresh logs.
- Use `superpowers:systematic-debugging`. Find the root cause before changing code. Files: `src/tts.js`, `src/piper.js`, the `sayLine()` cascade in `src/main.js`.
- Done when: launch Nibley, ask 3 questions in a row with the default voice and again after switching voice in the tray. The log shows the chosen Edge voice on every line, with no `backup_voice` unless the internet is off. Piper still takes over when offline (test by blocking the network).

## Task 2: subtitles
- Every line Nibley speaks shows as a subtitle while it plays, then clears. Zarif: "it's really hard to understand what he's actually saying."
- Look: only `docs/DESIGN.md` tokens (Inter, `text`/`deep`, existing radius and shadow). Bottom-centre, max 2 lines, never over a pen mark. Add the subtitle style to DESIGN.md first and show Zarif before building.
- Done when: a test turn shows each `say` line as a subtitle synced to its audio, on both a white lecture slide and a dark video frame (fixtures in `test/fixtures/`).

## Task 3: playback, then PRD v2 (no building yet)
- The brainstorm changes the product: a learning app, not a screen pointer. Zarif's process: play back what you understood, wait for his OK, then write the PRD, then the architecture.
- Play back in short points: YouTube transcript as context, note paper Nibley writes on, chat during explanations, interactive buttons, four layouts (user picks a default, Nibley suggests switches), flashcards with spaced repetition, pause quizzes, teach-it-back, gap finder, knowledge map on a prerequisite tree, confusion detector, hint ladder, daily review queue, video chapters with timestamped notes, free open-source version + paid version. Build phases (approved, brainstorm Q13): 1 core loop (voice, subtitles, transcript context, note paper, chat) -> 2 remember (flashcards + FSRS, daily review, chapters + notes) -> 3 check yourself (pause quizzes, hint ladder, teach-back) -> 4 smart layer (gap finder, knowledge map, confusion detector, layouts, buttons). The PRD v2 follows this order; build phase 1 only after Zarif OKs the PRD.
- Open flags to raise (from the brainstorm): build order for v1, paid-version sources and their licences, PRD v1 says "no paid services".
- Then write `docs/PRD-v2.md`. Keep `docs/PRD.md` as v1.

## Rules
- Follow `CLAUDE.md`: test each part, never print or commit `.env` or the Groq key, update `docs/BUILD-LOG.md` as you go.
- Final summary for Zarif: what you tested and the result, what you did NOT check, his next decision.
