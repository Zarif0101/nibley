# Updates reach every user: Brainstorm / Discovery Notes
Date: 2026-11-09 · Goal: "Every time I update Nibley, I want the user to actually update it."
Status: built 2026-11-09 (src/updater.js, scripts/release.js, setup step 1b)
Context sources: `setup.ps1`, `AGENT-SETUP.md`, `src/main.js`, `src/feedback.js` (VERSION from package.json)

## Facts (from code, not asked)
- Users install with `git clone` of the public repo (setup.ps1 / AGENT-SETUP.md), so `git pull` can update them; settings.json, .env, piper/ and node_modules are gitignored and survive a pull.
- Zarif pushes straight to `main`, often several times a day, sometimes before live testing.
- package.json version is still 1.0.0; feedback emails report it.
- No update check exists today.

## Summary / key decisions
- Only versions Zarif marks as ready reach users ("release this"). Pushes to main for work in progress never update anyone.

## Q&A log
### Q1 - Which changes reach users
- Asked: only marked releases, or every push to GitHub?
- Captured: "Only marked releases."
- Tentative (Claude): a release = a git tag like v1.1.0 on a tested commit + package.json version bump + a short "what's new" line.

### Q2 - Install by itself or ask?
- Captured: "Yes, automatically."
- Decision: Nibley checks GitHub at start (and every 6 h while running), installs a newer release, restarts once when no answer is playing, then says what's new. A failed update (no internet, failing tests) keeps the old version and tries again later.

## Design (Claude, from Q1-Q2)
- User installs sit on a release tag (detached HEAD). Zarif's dev copy is on branch `main`: Nibley never updates a copy that is on a branch.
- Update = `git fetch --tags`, newest `vX.Y.Z` above package.json's version, `git checkout -f`, `npm install` only if package files changed, unit tests; tests fail -> back to the old commit.
- Releasing = `node scripts/release.js 1.1.0 "what's new"`: clean tree on main, tests pass, bump version, commit, annotated tag with the notes, push main + tag. Zarif says "release this"; Claude runs it.
- setup.ps1 moves a fresh clone onto the newest release before installing.

## Open flags (pending input)
