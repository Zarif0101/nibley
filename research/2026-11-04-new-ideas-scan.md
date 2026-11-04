# New feature ideas scan (2026-11-04)

## What to build
1. **Prequestions before a video**: 2-3 easy questions from the library, then watch. (Strong-ish evidence, small effort.)
2. **Interleaved review**: the daily queue mixes topics/subjects instead of one block. (Strong in maths, tiny effort.)
3. **Predict, then check (calibration)**: "How sure are you?" before each answer; show the gap weekly. (Strong that students misjudge.)
4. **Why-prompts + worked-example-then-fade** inside hints and quizzes. (Moderate.)
5. **Cheap ADHD supports only**: instant feedback, tiny sessions, streak that never punishes. Skip body doubling / Pomodoro as "features" (evidence weak).

## Ranked table

| # | Idea | What it does | Evidence | Effort | Haiku+free+weak PC | Reuses |
|---|---|---|---|---|---|---|
| 1 | Prequestions before video | Before a lecture, ask 2-3 library questions on its topic; wrong answers tell him what to listen for | Moderate-strong (prequestion meta-analysis g=0.54; video RCTs) | S | yes | notes quizzes, topic lookup |
| 2 | Prerequisite check before video | Same as #1 but uses the root-check questions of the topic's prereqs; weak basic -> 60s refresher first | Moderate (prior knowledge strongly predicts learning; the specific tool is untested) | S | yes | root checks, gap finder, prereq tree |
| 3 | Interleaved review queue | Mix topics and subjects in the daily queue, not 5 cards of one topic | Strong for maths (Rohrer RCT, d=0.83); moderate elsewhere | S | yes | FSRS queue |
| 4 | Confidence rating + calibration | Tap 1-3 sure/unsure before answering; show "you were sure and wrong" list | Strong that people overrate learning; calibration training itself: moderate | S | yes | quiz/flashcard UI, FSRS log |
| 5 | End-of-video recall (not summary) | When video ends: "say 3 things you remember" with notes closed, then compare to the note | Strong (retrieval practice; Dunlosky: high utility) | S | yes | teach-it-back, topic note |
| 6 | Video moment -> topic link | Nibley tags timestamps with library topics so a rewind jumps to the topic card; spots which topics a video touched | Weak as a learning claim; high convenience | M | mostly (needs transcript; topic match by keywords/Haiku) | topics.json, confusion detector |
| 7 | "Why?" questions (elaborative interrogation) | After a fact, Nibley asks "why is that true?" once | Moderate (Dunlosky); best for factual material | S | yes | hint ladder, notes |
| 8 | Worked example -> faded steps | Show full solved problem, then same problem with one step blank, then two | Strong in maths/physics for novices (expertise-reversal: fade as he improves) | M | yes | notes, hint ladder, knowledge map |
| 9 | Successive relearning | A card is "done" only after correct on N separate days; FSRS already spaces it, we add a mastery flag | Moderate-strong | S | yes | FSRS, knowledge map |
| 10 | Pre-bed 3-card review nudge | Offer a short review in the evening; sleep after study helps memory | Moderate (sleep-memory work; app-level effect unverified) | S | yes | daily queue |
| 11 | Mistake journal | Every wrong answer saved with the right reason; resurfaced as a "same trap" card | Moderate (error-correction/feedback literature) | M | yes | FSRS, gap finder |
| 12 | Streak + tiny wins, forgiving | Day streak with 1 free skip, progress bar on the map; no loss screens | Weak (gamification: mixed; for ADHD: anecdotal) | S | yes | knowledge map |

Not recommended: body doubling (only small, mixed studies; one controlled test found no effect; the pro data is a company survey), Pomodoro for ADHD (I found no controlled trial), LLM "Socratic only" mode (see below), dual-coding as a separate feature (drawings already do it).

## Top 5 in more detail

**1. Prequestions before video.** Before he starts, Nibley asks 2-3 short questions from the topic's note. He will get most wrong, and that is fine: Pan et al. found pretests before a 26-minute video cut mind-wandering and raised later scores; a 2024 meta-analysis found a moderate effect for prequestions. Helps ADHD attention as a bonus. Caveat: benefit is mostly for the tested material, so write questions on the key ideas.

**2. Prerequisite check before video.** Same screen, but questions are the root checks for the topic's prereqs. If one fails, Nibley gives the basic first (gap finder), then he watches. This is our unique edge: nobody else has a hand-made prereq tree. Evidence for "prior knowledge matters" is strong; the exact feature is untested, so log results and judge later.

**3. Interleaved review queue.** Rohrer's 4-month classroom trial (54 classes, 787 students) had interleaved maths practice beat blocked 61% vs 38% on a test a month later. Costs us a sorting rule: do not show two consecutive cards from the same topic when others are due. It feels harder; tell him so ("harder now = remembered later"). Caveat: only maths tested in that trial.

**4. Confidence rating + calibration.** Fluent lectures raise confidence but not learning (Toftness 2018; Carpenter 2019), and judgments made after a delay are more accurate than right after watching. So: ask "sure?" after a delay (at daily review, not right after the video). Show only one line: "Sure and wrong: 4 cards" to attack the illusion of knowing. Store one extra field per review.

**5. End-of-video recall.** Replace "here is a summary" with "tell me 3 things, notes closed." Retrieval practice is the best-supported technique (Dunlosky 2013: high utility; summarisation and rereading: low). Reuses teach-it-back; Nibley fixes only what was missed.

## Notes on competitors (what to copy / avoid)
- **Anki/FSRS, RemNote:** spaced cards; already planned. Copy: cards generated from notes (done by library).
- **Duolingo:** streaks and short daily sessions drive return visits (company claim; unverified here). Copy only a forgiving streak.
- **Khanmigo:** the biggest school study (Oreopoulos & Low, 2026 working paper) found small gains (~0.06-0.08 SD), and students stopped using it when it refused to answer and only asked questions. Lesson: keep the hint ladder (answer always reachable); never force Socratic mode.
- **Brilliant, Synthesis:** interactive problems, productive struggle. Our version is worked examples + faded steps (#8). Evidence for them as products: I did not verify any.

## Honest limits
- Did not retrieve full texts; Dunlosky ratings and numbers come from search summaries. Dual coding, generation effect, concrete examples not separately searched (judged: drawings and quizzes already cover them).
- Prequestion meta-analysis "general effect" figure was cut off; treat only g=0.54 (specific effect) as seen.
- Everything here is untested for one ADHD teen on Haiku. Log use per feature so Zarif can drop what he ignores.

## Sources
- Dunlosky et al. 2013 (summary): https://scottbarrykaufman.com/study-alert-improving-students-learning-with-effective-learning-techniques-from-cognitive-and-educational-psychology ; DOI 10.1177/1529100612453266
- Pretesting before video (Pan et al.): https://sc-pan.github.io/pdf/PS_2021.pdf ; prequestion meta-analysis (2024, Psychonomic Bulletin & Review): exact URL not retrieved, unverified link
- Rohrer interleaving RCT: https://pmc.ncbi.nlm.nih.gov/articles/PMC8589969 (one of the search hits; check) ; https://ies.ed.gov/use-work/awards/interleaved-mathematics-practice
- Fluency illusion: https://collaborate.princeton.edu/en/publications/instructor-fluency-leads-to-higher-confidence-in-learning-but-not/ ; https://pubmed.ncbi.nlm.nih.gov/31169395/ ; https://featuredcontent.psychonomic.org/avoiding-illusions-of-learning-strategies-for-improving-self-regulated-learning/
- Khanmigo study: https://edworkingpapers.com/sites/default/files/ai26-1551.pdf
- Body doubling: https://arxiv.org/abs/2509.12153 ; https://neurodiversity.org/?p=11449
