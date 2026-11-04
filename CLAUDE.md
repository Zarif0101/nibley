# Nibley: rules for any agent working here

Nibley = Zarif's voice study buddy for Windows. Hold Win+` and ask; it reads the screen, explains in simple words, draws on screen, runs on his Claude subscription.

## Read first, in this order
1. `docs/PRD.md`: what to build (approved 2026-10-28).
2. `docs/ARCHITECTURE.md`: how it fits together, measured numbers.
3. `docs/BUILD-PLAN.md`: file tree, every known problem + fix, tests, stop rules, summary format.
4. `docs/DESIGN.md`: the only allowed look. Zarif hates AI slop; no styles outside it.
5. `docs/QUALITY-PLAN.md`: the current work (scorecard + blueprints T0-T11). `docs/TEACHING-BIBLE.md` and `docs/LEARNING-ENGINE.md`: inputs to PRD v2, not built yet.

## Rules
- Follow BUILD-PLAN.md. If you must deviate, write why in `docs/BUILD-LOG.md` and in the final summary.
- Build in one session, test each part as soon as it exists. No "done" without a passing test.
- Zarif doesn't read code. Explain results in plain words.
- No new dependencies beyond BUILD-PLAN section 2 without a written reason. No native npm modules.
- Never print, log or commit `.env` or the Groq key.
- Vault writes only inside `C:\Users\arko4\Desktop\Second Brain\nibley\` (plus one line in `logs/lessons.md` at the end).
- Spawn `claude.exe` with `shell:false`. Never use `--bare` (it blocks the subscription login).
- Keep `docs/BUILD-LOG.md` updated as you go (what's done, what's next), so a new session can resume if limits hit.
