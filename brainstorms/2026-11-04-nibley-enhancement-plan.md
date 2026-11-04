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
- Research scope (Q2): the brain features (flashcards + spaced repetition, daily review queue, gap finder, knowledge map, pause quizzes + hint ladder, teach-it-back grading, confusion detector) PLUS a scan for new ideas from top learning apps and learning science. Screen features (note paper, layouts, subtitles, chat, buttons, chapters) are out: local session + PRD v2 own them. Start now.

## Research findings (assistant, not yet confirmed by Zarif)
Reports in `research/` (2026-11-04). Highlights:
- Spaced repetition: reimplement FSRS-6 (~60 lines JS, 21 default params, checked against ts-fsrs 6.0.0 MIT source); don't vendor ts-fsrs (needs Node 24 + extra dep). Voice rating: model judges the spoken answer -> Again/Hard/Good (Easy only on "too easy"); bare "got it" never trusted. Daily queue ~10 cards (8 due + max 2 new, up to 3 weak-root questions), lowest retrievability first, hard cap, no backlog shame; "fresh start" offer if backlog > 60.
- Learner model (written from memory, numbers unverified): one P(known) per topic via BKT with hand-set params (L0 0.3, learn 0.15, guess 0.25, slip 0.1) x FSRS retrievability. Gap finder: binary search over failed topic's ancestors with root checks, max 4 questions; a pass raises ancestors, a fail only marks suspects. Map levels not started / shaky / okay / strong, one "ready to learn" topic, no percentages. Optional "sure?" on ~1 in 3 questions; sure+wrong = misconception, goes first in review.
- Quizzes/hints/teach-back/confusion: 1 pause question per natural segment end (~4-6 min, min 3 min apart, cap ~4/hour), 2nd only if 1st wrong, always skippable. Hint ladder 3 levels (idea -> partial step -> answer + why + twin problem); reaching level 3 = Again/Hard. Teach-back: pre-generated 3-5 key points per topic (must / accept / common_wrong / fix), one Haiku call returns fine/missing/wrong per point, unclear = missing. Confusion: score signals in a 3-min window, at score >= 3 show a dismissible chip, never auto-speak, max 3 offers/session. All thresholds are starting guesses to tune.
- New ideas (ranked): prequestions before a video (S, moderate-strong evidence); prerequisite check before a video (Nibley's unique edge); interleaved review queue; confidence calibration; end-of-video free recall instead of summaries. Skip body doubling and Pomodoro (no ADHD trials). Keep instant feedback, tiny sessions, forgiving streaks.

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

### Q2 - What the research and specs cover
- Asked: (1) only the brain features, (2) all 14 MVP features, (3) brain features + new-ideas scan. Assistant suggested 3.
- Captured: "start 1 and 3" -> brain features plus the new-ideas scan, and start now.
- Tentative / suggested (assistant): research reports go in a new top-level `research/` folder (not `docs/`, which the local session is editing). Brain modules are pure functions (state in, state out) so storage can be decided later in PRD v2.
- Flags: where learner data is stored (vault markdown vs app JSON) -> PRD v2 / Zarif, later.

## Open flags (pending input)
- Learner data storage (vault markdown vs app JSON vs both) -> Zarif, during PRD v2
- Social media posts + animations: platforms, content, purpose -> Zarif (after the build, if credit remains)
