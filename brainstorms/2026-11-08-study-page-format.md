# Study page format: Brainstorm / Discovery Notes
Date: 2026-11-08 · Goal: decide Nibley's study page: one Markdown format with study objects (cards, quiz, progress, streak, countdown), learned from HeyClicky's "paper".
Status: complete (mockup OK'd 2026-11-08, built the same day: src/study.js)
Context sources: `research/2026-11-08-heyclicky-feature-structure.md` (section 2, the paper), `docs/PRD-v2.md` (note paper, flashcards, daily review), `src/learn/` (fsrs, review, quiz: built, not wired), `brainstorms/2026-11-08-automatic-lesson-capture.md` (paused at Q2)

## Already decided elsewhere (not re-asked)
- PRD-v2: note paper Nibley writes on while explaining; "save this" keeps it with the lesson.
- PRD-v2: flashcards linked to video timestamps, FSRS scheduling, ~5 min daily review on app start.
- Lecture capture already runs (`ear.js`), recall not built. Live help builds first (lesson capture Q1).
- Answer note cards on screen (phase 3 v2) stay as they are.

## Summary / key decisions
- One study page per lecture (video). Opens when a video starts, fills in live, shown in the sidebar, saved as `nibley/lessons/<video title>.md`. Topic pages may come later, built from lecture pages.
- Fills from his questions (live) + a key-ideas recap every 10 min of lecture + a cards/quiz pass at the end.
- Cards: made automatically, all ticked; he unticks bad ones; ticked ones go to daily review.
- Quiz: 3 one-tap questions right when the video ends; misses become cards.
- Data lives inside Nibley (own data folder, own UI). No Obsidian or other third-party app. Exports optional, later.
- The line: dev logs + production info stay in Zarif's Second Brain; all learner data moves into the app.

## Q&A log
### Q1 - What one page covers
- Asked: one page per lecture, or one page per topic?
- Captured: "One page per lecture."
- Tentative / suggested: page holds key ideas with timestamps, his questions + Nibley's answers, flashcards, short end quiz; sidebar view; vault path `nibley/lessons/<video title>.md`.
- Flags: none

### Q2 - How the page fills in during a lecture
- Asked: only his questions (+ one end pass), questions + 10-min recap, or full live every 2 min?
- Captured: "Questions + 10-min recap."
- Decision: each question adds an entry (question, short answer, video time). Every 10 min of lecture audio, one small Haiku call turns the transcript into 2-3 timestamped key ideas (~6 calls/hour, ~1,500 tokens each, ~9k tokens/hour). End of video: cards + quiz pass.
- Flags: none

### Q3 - Who decides which flashcards are kept
- Asked: auto with untick, or approve each card?
- Captured: "Auto, I untick bad ones."
- Decision: ~5 cards per 10 min of lecture, shown ticked at the end; one click unticks a bad card; ticked cards go into FSRS review. Skipping the list keeps all.
- Flags: none

### Q4 - When the lecture quiz happens
- Asked: right at the end, or in the next day's review?
- Captured: "Right at the end."
- Decision: 3 one-tap questions on the page when the video ends (~1 min). Each miss becomes an extra flashcard for review.
- Flags: none

### Q5 - Where the page lives and how it looks outside Nibley
- Asked: clean Markdown for Obsidian, or custom objects?
- Captured (rejected both, product principle): "Keeping the information in Obsidian doesn't make it universal because it's only for the person who has Obsidian. We have to do something that's like keeping the information inside of the app... Why are we using third-party apps here?"
- Decision: lesson pages, cards and quiz data live inside Nibley's own data folder and show in Nibley's own UI. No Obsidian dependency. Any export (Markdown, PDF, Anki) is optional, later.
- Q6 follow-up (where the line is): "Obviously, you're going to keep the dev logs and production information inside [Second Brain] of mine, but the lessons and the related stuff that a learner or student needs are going to be inside of the app."
  - Stays in the vault: dev logs, build notes, research, production info.
  - Moves into the app: lecture transcripts (`ear.js` sessions), learner memory + rules (`memory.js`), saved lessons (`lessons.js`), teaching-style state (`teacher.js`), YouTube transcripts (`youtube.js`), notes read into the prompt (`prompt.js`).
- Found in code: every current write (lecture transcripts `ear.js`, memory, lessons, teaching style, YouTube transcripts, prompt notes) goes to `settings.vaultPath` + `nibley/`, default Zarif's Second Brain. That is the same dependency.
- Flags: none

## Open flags (pending input)
- Lesson capture interview Q2 (how much lecture text per question) still open -> Zarif
