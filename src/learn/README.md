# src/learn: Nibley's learning brain

Pure logic for the learner features (PRD v2 build phases 2-4). No UI, no audio, no I/O except `library.js` reading `library/`. The app (main process) owns storage and calls these functions; every state object is plain JSON, so it can be saved anywhere (vault or app data; PRD v2 decides).

Research behind every number: `research/2026-11-04-*.md`. Thresholds marked **(guess)** are starting values to tune on Zarif's real data.

## Conventions
- CommonJS, no dependencies, no classes. Functions take state and return a **new** state (never mutate input).
- Times are milliseconds since epoch (`at`, `now`). Days are UTC date keys (`model.dayKey`).
- Tests: `test/learn-<module>.test.js`, `node:test` + `node:assert/strict`. Run `node --test test/learn-*.test.js` (also picked up by `npm test`).
- Topic ids are library ids (`library/topics.json`).

## Modules

### library.js (done)
`loadLibrary(dir?)` → `lib`: `topics`, `get(id)`, `has(id)`, `prereqs(id)`, `dependents(id)`, `ancestors(id)` (nearest first), `descendants(id)`, `depth(id)` (0 = root), `note(id)` (parsed: `idea, formulas, picture, mistakes, checks[{q,a}], flashcards[{q,a}], rootChecks[{prereq,q,a}]`), `questionsFor(id)` (`[{topic,q,a,kind:'root'|'check',source}]`, root checks from harder topics first), `cardsFor(id)` (`[{id:'topic#n',topic,q,a}]`), `findTopics(text,{limit,subject})` (keyword prefilter; the runtime model confirms).

### model.js (done): learner model + gap tracker
State: `{ version, topics: {id: {p, seen, right, days, last, asked, inferred, misconception}}, gaps: {id: {status, openedAt, closedAt, source, under, history}} }`.
- `observe(state, id, {correct, at, sure, kind})`: BKT update. Only graded answers. `sure:false` + right counts less; `sure:true` + wrong sets `misconception`.
- `openGap(state, id, {at, source, why, under})`, `markKnown(state, id, {at})` (inferred 0.8), `noteAsked(state, id, {at})` (asking is not evidence).
- `level(state, id, {now})` → `not-started | shaky | okay | strong`. Strong = p ≥ 0.85, right on ≥ 2 different days, evidence in the last 45 days **(guess)**. Open gap or misconception → shaky.
- Gaps close automatically when the topic is answered right on a later day with p ≥ 0.85; a closed gap reopens on a wrong answer that drops p below 0.5. `history` keeps every open/close/reopen.
- `gaps(state, {status})`, `worthChecking(state)`, `mastery(state, id)`, `isKnown(state, id)`, `PARAMS`.

### gapfinder.js: find the weak basic in ≤ 6 questions
```
startGapFinder(lib, state, failedTopic, {maxQuestions = 6}) -> session
nextStep(lib, state, session) -> {done:false, ask, question} | {done:true, weak, rootCause, checked, untested}
answer(session, correct) -> session
applyGapFinder(state, session, {at}) -> state
```
- Suspects = ancestors of the failed topic that are not known (`isKnown`) and have at least one question (`questionsFor`). Untestable ancestors go to `untested`.
- Each step asks the suspect `s` that minimises the expected number of suspects left: P(fail) = 1 − p(s), where unseen basics count as 0.5 (the model's low prior would make it test the deepest roots first); fail → suspects ∩ ancestors(s); pass → suspects − ({s} ∪ ancestors(s)). Ties: smaller worst case (this makes it a binary search when there is no evidence), then larger `depth(s)`.
- Simulation over every topic × every one of its basics, one weak basic: found in 100% of cases with 6 questions (4.3 on average); 77% with 4.
- Never ask the same topic twice. Use the first unused question for `s`, preferring a root check written by a topic inside the failed topic's ancestry.
- Done when no suspects remain or `maxQuestions` reached. `weak` = the failed topic with the lowest depth among failures whose own prerequisites were not failed (if nothing below failed, `weak` is the original topic itself). `rootCause` = true if all of `weak`'s prerequisites were passed or already known.
- `applyGapFinder`: `observe` every answer with `kind:'root-check'`, `markKnown` each passed topic's ancestors, then `openGap(weak, {source:'gap-finder', under: failedTopic})` unless `weak` is the failed topic itself and nothing below failed (then no gap: he just needs the topic).

### fsrs.js: FSRS-6 scheduler
```
FSRS_PARAMS (21 defaults), GRADE = {again:1, hard:2, good:3, easy:4}
createCard(id, topic, now) -> card {id, topic, state:'new', stability, difficulty, reps, lapses, last, due}
retrievability(card, now) -> 0..1 (1 for a new card)
rate(card, grade, now, {retention = 0.9}) -> card
interval(stability, retention) -> days (rounded, min 1, max 36500)
gradeFromAnswer({correct, hintLevel = 0, sure, tooEasy}) -> 1..4
```
Formulas exactly as in `research/2026-11-04-spaced-repetition.md` section 1. Cross-checked against ts-fsrs 6.0.0 (MIT): stability and difficulty match exactly over 9 review histories (not a dependency). Lapse stability uses the source rule min(Sf, S / e^(w17·w18)); the same-day multiplier is clamped to ≥ 1 for grades ≥ 2, as in ts-fsrs. Same-day re-reviews use the short-term formula. `gradeFromAnswer`: wrong or hint level 3 → 1; right with a hint or `sure:false` → 2; `tooEasy` → 4; otherwise 3. A bare "got it" is not an answer: the app must have the model judge `correct`.

### review.js: daily review queue (~5 min on app start)
```
buildQueue(lib, model, cards, {now, size = 10, maxNew = 2, maxWeak = 3}) -> {items, backlog, freshStart}
  items: [{type:'card', card} | {type:'root', topic, question}]
answerItem(lib, {model, cards}, item, judgement, {at}) -> {model, cards}
```
- Due cards (due ≤ now), lowest retrievability first; then up to `maxWeak` weak-basic questions (open gaps first, then misconceptions, then shaky topics); then up to `maxNew` new cards. Total ≤ `size`.
- Interleave lightly: never two items of the same topic in a row when another order exists.
- `backlog` = due cards not served; `freshStart` = backlog > 60 **(guess)**. No other shame numbers.
- `answerItem`: card → `fsrs.rate` with `gradeFromAnswer(judgement)` and `model.observe(card.topic)`; root → `model.observe(topic, {kind:'review'})`.

### map.js: knowledge map data (the mind map draws this)
```
knowledgeMap(lib, model, {focus, subject, now, down = 2, up = 1}) -> {nodes, edges, readyToLearn, counts}
  nodes: [{id, title, subject, level, gap, inferred, why}]
  edges: [{from: prereq, to: topic}]
subjectSummary(lib, model, {now}) -> {physics: {not-started, shaky, okay, strong}, ...}
```
- With `focus`: the focus topic, its prerequisites `down` levels deep and its dependents `up` levels up. Without: the whole `subject`.
- `readyToLearn`: one topic only. Inside the view, a not-started or shaky topic whose prerequisites are all okay/strong; open-gap topics first, then lowest depth.
- `why`: one short plain line per node, e.g. "Gap found while studying Newton's second law", "Right on 3 different days", "Needs Fractions and decimals first". No percentages.

### prevideo.js: check the basics before a video
```
preVideoCheck(lib, model, topicIds, {maxRoot = 3, maxWarmup = 3, now}) -> {roots, warmups, skip}
applyPreVideo(model, answers, {at}) -> model
```
- `roots`: prerequisites of the video's topics (≤ 2 levels down) that are not known: open gaps first, then shaky, then not-started; one question each (`questionsFor`), at most `maxRoot`.
- `warmups`: 2-3 of the video topics' own check questions, asked BEFORE watching (pretesting). Not graded: wrong answers are expected and must not lower the model.
- `skip` = nothing to ask. `applyPreVideo` observes root answers only (`kind:'pre-video'`).

### quiz.js: pause quizzes + hint ladder
```
createQuizState(sessionStart) ; shouldQuiz(qs, {now, segmentEnd}) -> bool
pickQuestion(lib, model, qs, topic) -> question | null ; recordQuiz(qs, {at, topic, q, correct, skipped}) -> qs ; wantsFollowUp(qs) -> bool
createHints(question, at) ; nextHint(h, {at}) -> h  (h.level 1..3, h.rapid) ; hintGrade(h) -> 1..3 ; hintPrompt(lib, h) -> string
```
- Quiz only at a natural segment end, ≥ 3 min after the last quiz and after session start, ≤ 4 per rolling hour **(guess)**. Always skippable. A follow-up question only if the last one was wrong.
- `pickQuestion`: the topic's check questions not yet asked this session, then root checks of its weakest prerequisite.
- Hints: 1 = point to the idea, 2 = show the first step, 3 = the answer + a one-line why + a twin problem. `rapid` when a hint is asked < 3 s after the last one (answer with a calmer, slower hint; never block). `hintPrompt` builds the short instruction for the runtime model from the note (idea, formulas, answer). Reaching level 3 grades as Again.

### confusion.js: confusion detector
```
createDetector() ; addEvent(d, event) -> d ; score(d, now) -> number ; shouldOffer(d, now) -> bool ; recordOffer(d, {at, accepted}) -> d
event: {type: 'seek-back' | 'pause' | 'speed-down' | 'wrong' | 'silence' | 'slide-change', at, from?, to?, duration?}  (from/to: video seconds; duration: ms)
```
- Score over the last 3 minutes **(guess)**: seek-back into a span already rewatched 2, other seek-back 1, pause > 20 s 1, speed-down 1, wrong answer 2, silence > 15 s after a question 1. A seek-back landing within 2 s after a slide change scores 0 (people rewind to re-read slides).
- Offer when score ≥ 3, ≤ 3 offers per session, ≥ 5 min since the last offer, and 15 min quiet after two dismissals in a row. Offer = a dismissible chip ("Want a quick explanation of that part?"); never auto-speak.

### teachback.js: later
Needs 3-5 pre-written key points per topic (`must / accept / common_wrong / fix`), one Haiku call returns fine/missing/wrong per point, unclear = missing. Not built yet: content first.

## Wiring notes for the app session
- Load once: `const lib = loadLibrary()`. Keep `model` and `cards` in memory; save after each change.
- Map spoken questions to topics with `lib.findTopics(text)` + a one-line model confirmation.
- Every graded moment (pause quiz, review, root check, pre-video root) goes through `model.observe`. Chat questions go through `model.noteAsked` only.

## Personalization modules (2026-11-04, LEARNING-ENGINE.md section 4)

### kind.js: what kind of question
`questionKind(text, {screenHasPlot}) -> 'check' | 'problem' | 'formula' | 'visual' | 'concept'`. Keyword rules, first match wins. 40 labelled questions in the test (≥ 36 right).

### style.js: which teaching style (Auto mode by default, Zarif Q2)
```
createStyleState(now) ; pickStyle(state, kind, {mode, fixed, request, level, last, topic, now, rand}) -> {style, explore, reason}
recordPick(state, {kind, style, explore, at}) ; landed(state, {kind, style, value 0..1, at}) ; decay(state, now) ; suggestSwitch(state, kind, style, level)
```
Order: asked style ("like a story") > fixed mode > same thread (same topic within 2 min) > first tries (home style first, then each other style once) > Thompson sampling, at most 1 exploring pick in 5. Question Buddy only for check questions or topics at okay/strong. Measured on simulated learners: favourite learned in ~87-89% of runs within 30 answers.

### pace.js: words, lines, rate, pause
`createPace(now) ; signal(state, name, {at}) ; drift(state, now) ; paceFor(state) -> {words, lines, rate, pauseMs, rateText}`. Signals: slower, faster, more, shorter, again (spoken: at once) and lost, barge-in, reask (indirect: 2 within 7 days). 14 quiet days: one step back to the start.

### curve.js: learning curve
`addPoint(curve, topic, at, p)` after every `model.observe` ; `weekSummary({curve, cards}, now) -> {stronger, fading, text}` (no percentages) ; `timeToOkay(curve, topic)` in days.

### snapshot.js: the per-question header for Haiku
`snapshot({style, pace, topic, lib, model, worked, now}) -> string` (≤ 120 tokens; empty fields left out) ; `addWorked(worked, {topic, analogy, at})`. Goes at the top of the user message.

### teachback.js: teach it back (built 2026-11-04)
```
loadTeachback(file?) -> {topicId: [{must, common_wrong?, fix}]}      (library/teachback.json: 40 most-used physics + maths topics, 121 points)
teachbackPrompt(title, points, transcript) -> the one instruction for Haiku (one "<n> fine|missing|wrong" line per point)
parseVerdicts(text, n) -> ['fine'|'missing'|'wrong', ...]            (unclear or absent = missing, never wrong)
gradeTeachback(verdicts, points) -> {correct, fine, missing, wrong, score, grade 1..4, fixes (≤ 2, wrong first)}
applyTeachback(model, topic, result, {at}) -> model                  (kind 'teach-back'; a wrong point = sure-and-wrong = misconception)
feedbackScript(result, points, title) -> Nibley script               (right things first, ≤ 3 say lines)
```
Topics chosen by how many other topics build on them (all descendants in the prerequisite graph): arithmetic-basics (189) down to differentiation-rules (13).

### analogies.js: an analogy for any question (built 2026-11-04)
`loadAnalogies()`, `findAnalogies(list, question, {topic, domain, exclude, limit})` (needs the concept, a phrase or two keywords; plural-aware), `analogyLine(a)` for the snapshot header.
