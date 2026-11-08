# Automatic lesson capture: Brainstorm / Discovery Notes
Date: 2026-11-08 · Goal: Nibley picks up transcript and context from YouTube, paid course sites and open courses with no setup or hassle for the user.
Status: paused at Q2 (how much lecture text per question; suggestion: only matching parts + last 2 min). Paused 2026-11-08 for a full project audit.
Context sources: `src/ear.js`, `docs/NEXT-ROUND.md` (group C3: course transcripts)

## What already exists (from code, not asked)
- `src/ear.js` already transcribes all lecture sound the laptop plays, in any browser or player, automatically. Skips silence, Nibley's own voice and calls. Text only, no audio kept.
- Every 30 s piece is appended to `Second Brain/nibley/sessions/YYYY-MM-DD.md` with time + window title.
- In memory: last 30 min. Sent with a question: only the last 2 min.
- YouTube extension adds title, time and transcript on YouTube watch pages only.
- Gaps: daily file is one long list, not split per lesson/video; Nibley never searches older lines; no slide snapshots; no transcript panels from Udemy/Coursera.

## Summary / key decisions
- Nibley uses captured lesson text both live (during the lecture) and for later recall. Live is built first.

## Q&A log
### Q1 - When captured text gets used
- Asked: live during the lecture, later recall days after, or both?
- Captured: "Both, live first."
- Tentative / suggested: live is about half a day (text already in memory for 30 min).
- Flags: none

## Open flags (pending input)
- Can a browser extension read Udemy/Coursera transcript panels? -> needs a live test (Claude)
