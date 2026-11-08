# Nibley: rules for any agent working here

Nibley = Zarif's voice study buddy for Windows. Hold Win+` and ask; it reads the screen, explains in simple words, draws on screen, runs on his Claude subscription.

## Read first, in this order
1. `docs/PRD.md`: what to build (approved 2026-10-28).
2. `docs/ARCHITECTURE.md`: how it fits together, measured numbers.
3. `docs/BUILD-PLAN.md`: file tree, every known problem + fix, tests, stop rules, summary format.
4. `docs/DESIGN.md`: the only allowed look. Zarif hates AI slop; no styles outside it.
5. `docs/NEXT-ROUND.md`: the current work (approved 2026-11-05; start at phase 1 step 0). Background: `docs/QUALITY-PLAN.md` (scorecard + blueprints T0-T11), with `docs/SPEED-TOKEN-PLAN.md` (P0-P8: speed and token use). `docs/TEACHING-BIBLE.md` and `docs/LEARNING-ENGINE.md`: inputs to PRD v2, not built yet.

## Rules
- Follow BUILD-PLAN.md. If you must deviate, write why in `docs/BUILD-LOG.md` and in the final summary.
- Build in one session, test each part as soon as it exists. No "done" without a passing test.
- Zarif doesn't read code. Explain results in plain words.
- No new dependencies beyond BUILD-PLAN section 2 without a written reason. No native npm modules.
- Never print, log or commit `.env` or the Groq key.
- Learner data (lessons, study pages, cards, transcripts, learner memory, style scores) lives inside the app: `%APPDATA%\nibley\nibley\` (setting `dataPath` overrides; tests use it). Never design around Obsidian or other third-party apps (Zarif 2026-11-08).
- Zarif's Second Brain vault is for dev notes only: research, brainstorms, one line in `logs/lessons.md` at the end. Old `Second Brain\nibley\` is a one-time-copied legacy folder; don't write to it.
- Spawn `claude.exe` with `shell:false`. Never use `--bare` (it blocks the subscription login).
- Keep `docs/BUILD-LOG.md` updated as you go (what's done, what's next), so a new session can resume if limits hit.
