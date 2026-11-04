# Pre-generated study assets: Brainstorm / Discovery Notes
Date: 2026-11-04 · Goal: decide if and how to spend the $100 credit on a ready-made library of study drawings (plants, balls, etc.), so the cheap model (Haiku) only picks and places assets instead of inventing drawings.
Status: paused (2026-11-04). Resume point: paid-version sources/licences. Build order decided (Q13). Repo public + MIT. Briefs written: docs/briefs/cloud-library.md, docs/briefs/local-app.md.
Context sources: docs/PRD.md (4.4 draw on screen), docs/ARCHITECTURE.md (overlay, script format), docs/BUILD-PLAN.md 4.8, docs/DESIGN.md

## Summary / key decisions
- SCOPE CHANGED (Q1): this is no longer only about assets. Nibley pivots from a HeyClicky-style screen pointer to a learning app: notes, flashcards, study materials, study techniques built in. "It's not going to be a Hey Clicky clone."
- Distillation is a core goal: pass knowledge down to cheap models (Haiku) through system prompts and other techniques. Pre-made assets are one of those techniques.
- Must-haves named so far: subtitles for everything Nibley says; fix TTS (still unsolved); note papers over the screen that Nibley writes on while explaining; user can ask questions in chat during an explanation; Nibley can create interactive buttons and similar UI. "As advanced as possible."
- Main flow (Q2): learning from a YouTube video. Nibley uses the video as context (transcript + screen).
- v1 learner features (Q3): auto flashcards with spaced repetition, pause quizzes, teach it back, gap finder. All four.
- Knowledge map (Q4, "big big feature"): Nibley learns the user's gaps and shows mind maps of what they know, what they're confident about, and what to learn next. Tied to "the root level of studying" = prerequisite tree down to basics; weak roots fixed first (Q5). Personalization + learning-behaviour algorithms built in.
- $100 = Claude Code cloud session credits, unused (Q4c). Use: cloud agents pre-build drawings + prerequisite trees (needs Nibley on GitHub).
- First target level (Q6): 11th-12th standard. Subjects (Q7): Physics + Maths. No board (Q8): universal core of what 11th-12th curricula share.
- User-selectable learning layouts (Q8/Q9): note paper over video, side panel, full whiteboard, focus card mode. User picks a default; Nibley only suggests switching (Q10b, corrected from B).
- Advanced MVP features (Q12): confusion detector, hint ladder, daily review queue, video chapters + timestamped notes.
- Two versions: free + open source on GitHub; paid version built on academic sources and curriculum that are not public or are expensive.

## Known from docs (not asked)
- Today Nibley only draws marks on top of what is already on screen: ring, point, arrow, label, highlight, step. Hand-drawn pen look, brand blue, Instrument Sans.
- Haiku writes a line-based script; Nibley's code draws. Model output never runs as code.
- PRD says: no API credits, no paid services. The $100 credit would be a one-time build cost, not runtime cost. Needs confirming.

## Assistant view (suggestion, not confirmed)
- Idea is sound: a fixed library means Haiku outputs `draw plant at 400,300` instead of inventing SVG. Cheaper, faster, consistent look.
- Better fit than images: SVG assets drawn in the same pen style, animated with the same draw-on effect. Raster images (PNG) would clash with DESIGN.md.

## Q&A log
### Q1 - When would Nibley draw a ball or plant?
- Asked: is it for when the screen has no diagram (e.g. draw a plant for photosynthesis)?
- Captured (Zarif's words where they matter):
  - Product pivot: "student-friendly or learner-friendly app for someone who wants to take notes, create flashcards, and study materials, with tools and techniques built inside." "Pivoted from the goal Hey Clicky has and focus more on the learning part."
  - "Because we are using lower-intelligence models for token efficiency, we should be focusing on distillation and passing down knowledge to the lower models with system prompts and various techniques."
  - Subtitles whenever Nibley speaks: "it's really hard to understand what he's actually saying." TTS problem "hasn't been solved yet. We have to solve that."
  - "Whenever Niblay is explaining, we should be adding note papers over the screen and writing on it." Interactive: user can ask questions in chat during it. Nibley "can also create interactive buttons and related stuff."
  - Two versions: (1) free, open source on GitHub; (2) paid, "trained academical sources and curriculum and stuff thats mostly not available to the public or very cost heavy for the public."
- Answer to the asset question (inferred, confirm later): assets live on the note paper Nibley writes on.
- Flags: what exactly is wrong with TTS today? Where do paid-version sources come from, and do we have rights to use them?

### Q2 - Main daily study flow
- Asked: what's the one study flow used every day? Suggested: lecture → "explain this" → note paper → offer flashcards.
- Captured: main case is learning from a video / YouTube video. "Nibley should scrape that video and use that as context." Zarif asked what other advanced features would add value for the learner.
- Tentative / suggested (assistant): get the video's transcript (YouTube captions, with timestamps) + screenshots instead of sending the whole video. Cheap, and Haiku gets the full lecture as context.
- Flags: none new.

### Q3 - Which learner features go in v1
- Asked (picker): auto flashcards + review, pause quizzes, teach it back, gap finder.
- Captured: Zarif picked all four for v1.
  - Auto flashcards from the video, linked to timestamps, spaced repetition (FSRS).
  - Pause quizzes: 1-2 recall questions at natural breaks.
  - Teach it back: user explains out loud, Nibley fixes only what was missed or wrong.
  - Gap finder: finds the missing basic idea, explains it first, then returns.
- Flags: four features + note paper + chat + subtitles is a big v1. Build order to decide later. -> Zarif + architecture step

### Q4 - What is the $100 credit?
- Asked: Anthropic API, OpenRouter, image site, or other?
- Captured: not answered. Zarif added a new feature instead ("that's all I wanted to say for now"):
  - "A big big feature": the app learns the user's gaps and creates wireframes and mind maps of what they know, what they are confident about, and what they should learn.
  - "It should be connected to the root level of studying."
  - "Algorithms built inside for user personalization and learning behaviour."
- Tentative / suggested (assistant): this is a knowledge map. Each topic is a node with a confidence score fed by quizzes, teach-backs and flashcard results. It links naturally to Gap finder (Q3).
- Flags: $100 credit type still open (answered in Q4b). Meaning of "root level of studying" unclear. -> Zarif

### Q4b - $100 credit (late answer to Q4)
- Captured: "its cloude anthropic api" -> Claude Anthropic API credit.
- Tentative / suggested (assistant): use it for one-time build work with a smart model (Sonnet/Opus): SVG asset library in Nibley's pen style + distilled prompts/knowledge for Haiku. Runtime stays on the subscription (PRD rule).
- Flags: Q5 (root level of studying) still unanswered.

### Q5 - What "root level of studying" means
- Asked: (A) prerequisite tree down to basics, weak roots fixed first, or (B) school curriculum, or (C) both.
- Captured: "yes" to A. Every topic links down to the basics it depends on (eigenvalues -> matrices -> vectors -> basic algebra). The map shows which roots are weak; Nibley fixes those first.
- Tentative / suggested (assistant): the prerequisite tree is a good use of the $100 API credit. A smart model builds it once per subject; Haiku only looks it up.
- Flags: none new.

### Q4c - Credit clarification (asked during Q6)
- Captured: "i mean cloud api credits of anthropic". Not yet clear: is it API credit in console.anthropic.com (used with an API key), or credit for Claude Code cloud/web sessions? -> Zarif
- Q6 (which subjects first) still open.
- Answer: "Cloud session credits. $100 of $100 left." -> Claude Code cloud/web sessions, nothing spent yet.
- Tentative / suggested (assistant): cloud sessions start from a GitHub repo. The Nibley folder is not a git repo yet, so it must go to GitHub first. That fits the free open-source version anyway. Cloud agents then build the asset library + prerequisite trees as files and open a PR.
- Flags: put Nibley on GitHub (public or private for now?), and never commit `.env` / the Groq key. -> Zarif, before the build

### Q6 - Which subjects and level first
- Asked: which subjects/level for the first asset library + prerequisite trees? Suggested: university maths/physics.
- Captured: level = "11th or 12th standard" (high school, pre-university). Subjects not named yet.
- Flags: which subjects? Which board/curriculum (NCERT/CBSE, Bangladesh HSC, other)? -> Zarif (Q7)

### Q7 - Which subjects first
- Asked (picker): physics, maths, chemistry, biology.
- Captured: Physics + Maths. Chemistry and Biology not in the first library.
- Flags: which board/curriculum? -> Zarif (Q8)

### Q8 - Which board/curriculum
- Asked: Bangladesh HSC, CBSE/NCERT, A-Level/IB, or none?
- Captured: none. "Take something more universal. Don't look at a board or curriculums. Look at what similar stuff is taught in those standards." -> build from the topics most 11th-12th curricula share.
- Also new: "Nibley should have different types of learning layouts, so the user can choose from there."
- Tentative / suggested (assistant): research step compares a few major syllabi (CBSE, HSC, A-Level, AP, IB) and keeps the shared core topics.
- Flags: what "learning layouts" means. -> Zarif (Q9)

### Q9 - Which learning layouts
- Asked (picker): note paper over video, side panel, full whiteboard, focus card mode.
- Captured: all four.
  - Note paper over video: sheet floats beside video, Nibley writes/draws while talking.
  - Side panel: video left, notes + chat + subtitles right.
  - Full whiteboard: video pauses, full-screen board for deep explanation.
  - Focus card mode: one card at a time (flashcards, quizzes, teach-back), no video.
- Flags: which layout is the default, and does the user switch or does Nibley pick per moment? -> Zarif (Q10)

### Q10 - Who picks the layout
- Asked: (A) user picks, fixed; (B) Nibley picks per moment, user can override; (C) user default, Nibley suggests. Assistant suggested C.
- ~~Captured: B. Nibley picks the layout per moment. User can always override.~~ SUPERSEDED by Q10b.
- Flags: none new.

### Q10b - Correction
- Captured: "C not B". User picks a default layout; Nibley only suggests switching (e.g. "open the whiteboard for this?"). User stays in control.

### Q11 - What's wrong with TTS
- Asked: hard to understand, stops/switches mid-way, slow start, or other?
- Captured: "It doesn't work." Assistant checking the logs for the cause before asking more.
- Evidence (logs/nibley-2026-10-28.log, only log file; nothing newer): every launch, Edge TTS gives "no audio in 2.5 s" on the first line, then every later line goes to `backup_voice` for the whole session. So the main voice basically never plays. Log predates the Piper change.
- Flags: does the user hear nothing at all, or only the robotic backup voice? -> Zarif (Q11b). Fixing TTS = separate debug task after the interview.

### Q11b - What the user hears
- Captured: "Piper shows up. Not the chosen ones, chosen TTS es." -> the Piper backup plays; the voice picked in the tray (Edge voices) never plays.
- Decision: TTS fix goes to the local session (needs this Windows laptop to test).

### Pause - two sessions next
- Captured: "I am gonna start the two session one on my subscription with opus at extra and 100 cloud credit opus extra with lower sub agents. So lets prepare."
- Split (assistant proposal): local session = app code (TTS fix, subtitles, then PRD v2). Cloud session = study library content (topic list, prerequisite trees, SVG drawings, distilled topic notes for Haiku). Briefs in `docs/briefs/`.
- Done after pause: repo public at github.com/Zarif0101/nibley, MIT license. Groq key moved from .env.example to gitignored .env.

### Resume - advanced features for the MVP
- Captured: "also lets decide on some advanced features in this mvp".
- Already in v1 (Q1-Q10): note paper, chat during explanations, interactive buttons, subtitles, 4 layouts, flashcards + FSRS, pause quizzes, teach it back, gap finder, knowledge map on prerequisite tree.
- Asking (Q12): which new advanced features to add.

### Q12 - New advanced features
- Asked (picker): confusion detector, hint ladder, daily review queue, video chapters + notes.
- Captured: all four.
  - Confusion detector: rewinds, long pauses, wrong answers -> Nibley offers help first. This is the "learning behaviour algorithm".
  - Hint ladder: hint 1, hint 2, then the answer.
  - Daily review queue: on app start, due cards + weak roots, ~5 min before new video.
  - Video chapters + notes: chapters from the transcript, timestamped notes, click to jump.
- Flags: MVP is now 14 features. Build order / phases needed. -> Zarif (Q13)

### Q13 - Build order
- Asked: 4 phases, each usable on its own.
- Captured: "ok" -> approved.
  1. Core loop: TTS fix, subtitles, video transcript as context, note paper, chat during explanations.
  2. Remember: flashcards + FSRS, daily review queue, video chapters + notes.
  3. Check yourself: pause quizzes, hint ladder, teach it back.
  4. Smart layer: gap finder, knowledge map, confusion detector, 4 layouts, buttons (needs cloud library).
- Coach note given: Zarif picked every option in 3 pickers; advised shipping one loop first.

## Open flags (pending input)
- ~~What kind of $100 credit?~~ Resolved Q4c: Claude Code cloud session credits, $100 unused.
- Nibley is not on GitHub yet; cloud sessions need it there. Public or private first? -> Zarif
- ~~What does "root level of studying" mean?~~ Resolved Q5: prerequisite tree.
- TTS: what exactly is still broken (sound quality, speed, accent, fails)? -> Zarif
- Paid version: source of non-public academic material + license/rights to use it. Copyright risk if content is used without a licence. -> Zarif (maybe a lawyer later)
- PRD.md says "no paid services"; paid version + $100 credit change that. PRD needs a v2. -> after interview
