# Nibley: PRD v2

Date: 2026-11-04 · Owner: Zarif · Status: approved by Zarif, 2026-11-04
Replaces the product direction of `docs/PRD.md` (v1, kept as is). v1 features stay unless this file says otherwise.
Sources: `brainstorms/2026-11-04-pregenerated-study-assets.md` (interview Q1-Q13), `docs/PRD.md`, `docs/briefs/cloud-library.md`, `docs/BUILD-LOG.md`.

## 1. Job
A learning buddy for video lectures (YouTube first, but any browser, any site, local videos) and study files on Zarif's Windows laptop. It watches the lecture with him, explains in simple words (voice, subtitles, a note paper it writes on), then helps him remember and checks that he understood.

v1 was a voice screen pointer: ask, it explains and draws on the screen. v2 keeps all of that and adds the learning part: notes, flashcards, quizzes, and a map of what he knows. Zarif: "It's not going to be a Hey Clicky clone."

## 2. Who it is for
- Zarif first. English. ADHD: answer first, one idea at a time, short spoken replies, visible progress.
- Later, other learners through the free open-source version (section 8).
- First subjects: Physics and Maths, 11th-12th standard, plus the basics they depend on. No single school board: the shared core of the big syllabi (CBSE/NCERT, Bangladesh HSC, A-Level, AP, IB).

## 3. Main flow
1. Zarif watches a lecture: YouTube or any other site, in any browser, or a local video.
2. Nibley hears the lecture (it transcribes the sound the laptop plays) and has a screenshot when he asks.
3. He holds the hotkey and asks, or types in the chat.
4. Nibley explains: voice + subtitles, writes and draws on a note paper, rings and arrows on the video.
5. Afterwards: flashcards and notes linked to timestamps, quizzes at breaks, a daily review the next day.

## 4. Hard constraints
- **Cost while running:** Zarif's Claude subscription through Claude Code (Haiku by default, Sonnet by tray switch) plus free services (Groq speech-to-text, Edge voices). No paid services while running (Zarif, 2026-11-04). One-time build costs are allowed, such as the $100 cloud credit for the study library.
- **Distillation:** the runtime model is Haiku, so the hard thinking is done once, ahead of time, by a smart model: the study library (section 7) and the prompts. At runtime Haiku looks things up and places ready-made drawings instead of inventing them.
- **PC:** i5-6200U (2 cores), 8 GB RAM. Screen is now 1600x900 (was 1366x768 in v1). v1 already uses ~870 MB RAM.
- **Windows only, laptop only, English only.**
- **Online.** Piper is an offline backup voice only; Claude and the transcript need internet.
- Everything Nibley stores lives in `Second Brain/nibley/` as plain files Zarif can open (same rule as v1 memory).

## 5. Features, in build order
v1 = all 4 phases (Zarif, 2026-11-04). Build them in this order. Each phase is usable on its own, and the next one starts only after the one before passes its tests (section 9).

### Phase 1: core loop
- **Voice that works.** The chosen Edge voice on every line; Piper takes over for the rest of an answer only when Edge is slow or offline. Built 2026-11-04; real-Claude test still to run (test 1).
- **Subtitles.** Every spoken line shows as a subtitle while it plays (style in `docs/DESIGN.md`). Built 2026-11-04; real-Claude test still to run.
- **Transcript as context, universal** (Zarif, 2026-11-04: any browser, any video site, no extension to install, local videos and PDFs). Nibley transcribes the sound the laptop plays (free Groq Whisper, silence and calls skipped, tray off switch) and gives Haiku the last 2 minutes. Haiku can answer "what did he just say about X?" without a screenshot. On YouTube, an optional extension adds exact captions and video times. PDFs and pages without sound use the screenshot.
- **Note paper.** A sheet over the screen that Nibley writes on while it explains: short lines, formulas, small drawings from the library. Pen marks on the video stay as in v1. "Save this" saves the note paper with the lesson.
- **Chat during explanations.** Zarif can type a question while Nibley is talking. Nibley answers it, then carries on or stops cleanly. (v1 listed "typing mode" as not in v1; this replaces that.)

### Phase 2: remember
- **Flashcards.** Made from the video and the explanation, each linked to its timestamp. Scheduled with spaced repetition (FSRS).
- **Daily review queue.** On app start: due cards plus weak basics, about 5 minutes, before a new video.
- **Video chapters and timestamped notes.** Chapters made from the transcript. Notes sit under their chapter; clicking one jumps the video there.

### Phase 3: check yourself
- **Pause quizzes.** 1-2 recall questions at natural breaks (chapter ends).
- **Hint ladder.** Stuck on a question: hint 1, then hint 2, then the answer.
- **Teach it back.** Zarif explains out loud; Nibley fixes only what was missing or wrong.

### Phase 4: smart layer (needs the study library)
- **Gap finder.** Finds the missing basic idea behind a confusion, explains it first, then goes back.
- **Knowledge map.** Every topic sits on a prerequisite tree down to the basics (eigenvalues -> matrices -> vectors -> algebra). Each topic has a confidence score from quizzes, teach-backs and flashcards. The map shows what he knows, what is shaky, and what to learn next. Weak roots get fixed first.
- **Confusion detector.** Rewinds, long pauses or wrong answers make Nibley offer help first.
- **Four layouts.** Note paper over the video, side panel (video left; notes, chat, subtitles right), full whiteboard (video paused), focus card (one card at a time, no video). Zarif picks a default; Nibley only suggests a switch ("open the whiteboard for this?").
- **Buttons.** Nibley can show small buttons to click, for example "Quiz me" or "Simpler, please".

## 6. Carried from v1, unchanged
- Hold `Win` + `` ` `` to talk. Groq Whisper for speech-to-text.
- Screenshot when he lets go; marks timed to speech; marks clear on the next press.
- Actions with **Ask first** as default, and the hard limits: never types passwords or payment details, never deletes files, never sends, posts or pays.
- Memory in `Second Brain/nibley/` (`about-me.md`, `learning.md`, `rules.md`, `changelog.md`) and one mini-interview per session.
- Saved lessons and replay without a Claude call.

## 7. Study library (built once, ahead of time)
- Built by a Claude Code cloud session with the $100 cloud credit (brief: `docs/briefs/cloud-library.md`). Delivered as a PR into `library/`.
- Contents: topic list with prerequisites (`library/topics.json`), one teaching note per topic for Haiku (simple idea, formulas, picture, mistakes, check questions, flashcards, root checks), and pen-style SVG drawings with named anchor points.
- `node library/check.js` checks the format. Physics and maths correctness is spot-checked by Opus, not fully.
- Phases 1-3 use it when it is there and work without it. Phase 4 needs it.
- **Swappable content pack** (Zarif, 2026-11-04: "make it easy to swap"). The app reads study content only through this one format: topics, notes, drawings, plus a `LICENSE` file for the pack. The folder is a setting (default `library/`). A different pack in the same format, such as a paid one, replaces it by changing that one setting. No app code knows which pack it is, and `check.js` validates any pack.

## 8. Two versions
- **Free:** open source on GitHub (github.com/Zarif0101/nibley), MIT licence. Everything in this PRD.
- **Paid:** the same app with a different content pack (section 7), built on academic sources and curricula that are not public or are expensive. Sources decided later; the app only has to make the swap one setting.

## 9. Done means (acceptance tests)
Run on Zarif's laptop with real lectures: YouTube in Brave, one other site, one local video.

### Phase 1
1. Voice: 3 questions in a row, then again after switching voice in the tray. The log shows the chosen Edge voice on every line, except lines where Edge itself was slow; offline, Piper speaks every line. (2026-11-04: 27/29 lines Edge, offline OK, with canned answers. Real Claude answers still to run.)
2. Subtitles: each line shows while it plays, max 2 lines, never over a pen mark, on a white slide and a dark video frame. (2026-11-04: 8/8.)
3. Transcript: on a YouTube lecture in Brave, on another video site and on a local video file, "what did he just say about X?" gets an answer about the right part. With nothing playing, no audio is sent anywhere; during a call, none either.
4. Note paper: "explain this" puts at least 2 written lines and 1 drawing on the note paper while Nibley talks. "Save this" keeps it; replay shows it again.
5. Chat: a typed question during an explanation gets an answer, and Nibley then carries on or stops without talking over itself.
6. Speed: first spoken word within 5 s of letting go (target 3 s), with the transcript in the context. Measured and logged.
7. Idle CPU under 5%.

### Phase 2
8. A 10-minute lecture gives at least 5 flashcards, each with a timestamp that jumps to the right moment.
9. Due dates follow FSRS: a card answered "hard" comes back sooner than one answered "easy".
10. On app start with due cards, the review queue takes about 5 minutes and shows how many are left.
11. Chapters appear for a lecture; clicking a chapter or a note jumps the video there.

### Phase 3
12. At a chapter end, a pause quiz asks 1-2 questions about that chapter.
13. Saying "I'm stuck" on a question gives hint 1, then hint 2, then the answer.
14. Teach it back: after Zarif explains a topic and leaves out one key point, Nibley names that point and nothing he got right.

### Phase 4
15. A wrong answer to a root check marks that root weak on the map, and the gap finder offers to explain it.
16. The knowledge map shows topics with their confidence and the next topic to learn.
17. Two rewinds of the same part within a minute make Nibley offer help.
18. Each of the 4 layouts opens; the default sticks after a restart; Nibley suggests a switch but never switches on its own.
19. Content pack swap: point the content setting at a second pack in the same format (a small test pack). After a restart Nibley's topics, notes and drawings come from that pack, with no code change.

## 10. Open questions for Zarif
1. ~~**Which phases make v1?**~~ Answered 2026-11-04: all 4 phases. Built in phase order, each phase tested before the next.
2. ~~**Paid version sources and licence.**~~ Deferred 2026-11-04: decide later. This build makes the content swappable (section 7). When sources are picked, use only licensed or self-written material (copyright risk otherwise).
3. ~~**"No paid services" (PRD v1).**~~ Answered 2026-11-04: keep it for running the free app (subscription + free services only). One-time build costs, like the $100 cloud credit, are allowed.

## 11. Risks
- **Edge voice throttling.** Edge's free voice service has slow minutes (3-7 s per sentence) after bursts of requests from one IP (measured 2026-11-04). Nibley falls back to Piper for those answers. If it gets worse, look at another voice.
- **Lecture sound to Groq.** While a lecture plays, its sound is sent to Groq (free) to be transcribed. Calls are skipped and there is an off switch, but other sound (music, games) also goes while it is on. Free limit: about 8 hours of audio a day.
- **Subscription limits.** Transcripts, flashcards and quizzes mean more Claude calls per video than v1. Sonnet hits the cap sooner than Haiku.
- **Correctness.** Haiku can get physics and maths wrong. The library notes reduce that; they are spot-checked, not fully checked.
- **Laptop.** 8 GB RAM and 2 cores. More windows and features must keep idle CPU under 5% and RAM in check.
- **Screen size.** Clicks and "click here" steps still assume 1366x768 on the new 1600x900 screen (BUILD-LOG 2026-11-04). Fix before phase 1 is called done.

## 12. Not in v2
Chemistry and Biology, Bangla, phone app, camera, physical books, wake word, background workers, rewriting its own code, building the paid version.
