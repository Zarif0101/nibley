# Nibley enhancement plan ($78 cloud credit): Brainstorm / Discovery Notes
Date: 2026-11-04 · Goal: decide how to spend the remaining ~$78 of Claude Code cloud credit on research, advanced feature planning, and building what can be built and tested in a cloud session.
Status: in progress
Context sources: brainstorms/2026-11-04-pregenerated-study-assets.md (14 MVP features, 4 build phases, Q13), docs/PRD.md (v1, hard constraints), docs/briefs/local-app.md, library/README.md (study library, PR Zarif0101/nibley#1)

## Known from context (not asked)
- Study library is done: 229 topics, 229 notes, 124 drawings, check.js passes (PR #1, not merged yet).
- Approved build order (earlier brainstorm, Q13): 1 core loop (voice fix, subtitles, transcript context, note paper, chat) -> 2 remember (flashcards + FSRS, daily review, chapters + notes) -> 3 check yourself (pause quizzes, hint ladder, teach-back) -> 4 smart layer (gap finder, knowledge map, confusion detector, layouts, buttons).
- Zarif's process (local brief, Task 3): play back understanding -> his OK -> PRD v2 -> architecture -> build. PRD v2 is being prepared in the local session.
- PRD v1 hard constraints: runs on his Claude subscription (no API credits, no paid services), weak laptop (i5-6200U, 8 GB), always online, Windows only.
- This cloud session cannot run or test the Electron app, voice, overlay or hotkey. It can build and test content and pure Node logic.

## Summary / key decisions
- Spend plan (Q1b, corrects Q1): A + C. Full research and feature specs (C) AND build the brain modules with tests (A). If credit is left after that: social media posts and animations.

## Q&A log
### Q1 - What the $78 should mainly buy
- Asked: A brain modules (code + tests), B better content, C research/planning only, D mix (short research, then build). Assistant suggested D, and to build only standard parts that won't change with PRD v2 (FSRS scheduling, gap finder over the prerequisite tree).
- Captured: ~~chose D ("lets do what you suggested").~~ SUPERSEDED by Q1b. Also wants "some social media post and animations", but only "if we have some left" after D.
- Tentative / suggested: none new.
- Flags: social media posts + animations: which platforms, what they should show, and whether they are for Nibley's launch or Zarif's own brand -> Zarif, later (only if credit remains).

### Q1b - Correction to Q1
- Captured: "lets do A and C". So: research + planning/specs for the advanced features (C), plus brain modules as tested code (A). Not the light "short research" version of D.
- Still holds from Q1: social media posts + animations only if credit remains afterwards.
- Flags: none new.

## Open flags (pending input)
- Social media posts + animations: platforms, content, purpose -> Zarif (after the build, if credit remains)
