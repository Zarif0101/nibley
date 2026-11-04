# Nibley: Learning engine (personalization + distillation)

Date: 2026-11-04 · Status: draft for Zarif's OK, input to PRD v2
Builds on `src/learn/` (learner model, gap finder, FSRS, review queue, map, quizzes, confusion detector: PR Zarif0101/nibley#1, 93 tests). Same conventions: pure functions, plain-JSON state in → new state out, `node:test`, no dependencies. Numbers marked **(guess)** are starting values to tune on Zarif's real data.

## 1. Goal
Each answer fits Zarif a little better than the last: the right **style** (TEACHING-BIBLE section 2), the right **pace**, built on what he already **knows**, and coming back at the right **time** to stick.

## 2. What Nibley notices (signals)
Only things that already happen. No camera, no tracking outside Nibley.

| Signal | Where it comes from | Means |
|---|---|---|
| Graded answer (right/wrong, sure?) | pause quiz, review, root check, teach-back | Real evidence of knowing (`model.observe`) |
| Hint level used (0-3) | hint ladder | How hard it was (`fsrs.gradeFromAnswer`) |
| Re-ask within 90 s on the same topic ("what?", "I don't get it", same topic id) | `handleText` + `lib.findTopics` | The explanation didn't land |
| "got it", "makes sense", "thanks" within 30 s | `handleText` | It landed |
| Moves to a new topic without re-asking | next question's topic | Probably landed (weak) |
| "again", "slower", "faster", "more detail", "shorter" | QUALITY-PLAN T4 commands | Pace is off |
| Barge-in during the first 2 lines | `bargeIn()` timing | Too slow or already known |
| Confusion score ≥ 3 | `confusion.js` (seek-back, long pause, wrong answers) | Struggling right now |

Asking about a topic is never counted as failing it (`model.noteAsked`, as in `src/learn`).

## 3. What Nibley keeps (state, one JSON file)
```json
{
  "version": 1,
  "model":  { "...": "src/learn/model.js state: mastery + gaps per topic" },
  "cards":  [ "src/learn/fsrs.js cards" ],
  "style":  { "concept": { "doodle-story": {"a": 2, "b": 1}, "board-builder": {"a": 1, "b": 1} }, "problem": {} },
  "pace":   { "words": 16, "lines": 4, "rate": 0, "pauseMs": 200, "pending": [] },
  "curve":  { "newtons-second-law": [[1730700000000, 0.31], [1730900000000, 0.62]] },
  "worked": [ { "topic": "inertia", "analogy": "pushing a full shopping cart", "at": 1730700000000 } ]
}
```
Where the file lives is open decision 3 (vault or app folder).

## 4. Algorithms (new modules in `src/learn/`)

### 4.1 `kind.js`: what kind of question is this?
`questionKind(text, {screenHasPlot}) -> 'concept' | 'formula' | 'problem' | 'visual' | 'check'`
Keyword rules first ("how do I solve / calculate / find" → problem; "derive / prove / where does … come from" → formula; "graph / vector / wave / field / shape" or a plot on screen → visual; "quiz me / test me / check me" → check; else concept). No model call. Unit test: 40 labelled questions, ≥ 90% right.

### 4.2 `style.js`: pick the style (Thompson sampling with guardrails)
Every (kind, style) pair holds a score as two counts: `a` = answers that landed, `b` = answers that didn't. Picking = for each allowed style, draw a random number from Beta(a, b) and take the biggest. Styles that work get picked more; untried ones still get a chance.
```
pickStyle(state, kind, {fixed, sameThread, now}) -> {style, explore}
  if fixed: return fixed                        (tray > Teaching style)
  if sameThread: return last style              (follow-up on the same topic within 2 min: never switch mid-explanation)
  allowed = STYLES minus 'question-buddy' unless kind == 'check' or topic level is okay/strong
  for s in allowed: theta[s] = sampleBeta(a[s] + prior[kind][s], b[s] + 1)
  best = argmax theta; explore = best != style with highest mean
  if explore and exploredRecently(state, 5 answers): best = highest mean    (explore at most 1 in 5)
landed(state, kind, style, value 0..1) -> state   a += value, b += 1 - value
decay(state, now) -> state   every day a, b move 2% back toward the prior (his taste can change)  (guess)
```
- **Prior** (head start, before any data): concept → Doodle Story, formula → Board Builder, problem → Exam Coach, visual → Picture First, check → Question Buddy: prior `a` = 2 for that pair, 1 for the rest.
- `sampleBeta` via two gamma draws (Marsaglia-Tsang, ~15 lines). Tests pass a seeded random function.
- **Did it land?** (feeds `landed`): +1 next graded answer on the topic within 24 h is right, or "got it" within 30 s; +0.5 moves to a new topic without re-asking; 0 re-ask within 90 s, confusion offer accepted within 3 min, or next graded answer wrong. The first signal counts; the rest are ignored for that answer.
- **Suggest, don't switch** (Fixed mode): 2 answers in a row that didn't land on the same kind → Nibley offers the best other style in one line.

### 4.3 `pace.js`: words, lines, speed, pauses
| Dial | Range | Start | Up | Down |
|---|---|---|---|---|
| words per say line | 12-20 | 16 | "more detail" | "what?", "slower" |
| say lines per answer | 3-6 | 4 | "more detail" | barge-in in the first 2 lines, "shorter" |
| speaking rate | -15% to +10% | 0 | "faster" | "slower", "again" |
| pause after the key line | 0-500 ms | 200 | "slower" | "faster" |
- A spoken command ("slower") moves its dial one step at once. Indirect signals (barge-in, re-ask) need 2 in the same direction within 7 days **(guess)**.
- No signal for 14 days → each dial drifts one step back toward its start **(guess)**.
- `paceFor(state)` returns the numbers for the prompt header; `rate` also goes to TTS.

### 4.4 `curve.js`: the learning curve
- Every `model.observe` adds `[time, p]` to that topic's curve (keep the last 50).
- `weekSummary(state, now)` → "2 topics got stronger, 1 needs a refresh". No percentages (same rule as `map.js`).
- "Needs a refresh" = FSRS retrievability below 0.7 on a card he knew **(guess)**. Feeds the daily review queue and the map.
- `timeToOkay(topic)` = days from first seen to `okay`. Shows which kinds of explanations make him learn faster (style × time-to-okay, used later to check `style.js`).

### 4.5 `snapshot.js`: what Haiku is told per question
≤ 120 tokens, put at the top of the user message (not the system prompt, see 5.1). Example:
```
[nibley] style=board-builder pace=words16,lines4 topic=newtons-second-law(shaky)
key: F = m·a; more mass needs more force for the same speed-up
weak basics: vectors-basics (gap)  misconception: thinks heavier falls faster
worked before: "pushing a full shopping cart" for inertia
```
Haiku's card tells it never to read this block aloud.

## 5. Distillation: making a cheap model teach like a good teacher
### 5.1 What goes where
| Piece | Size | Lives in | Why |
|---|---|---|---|
| Core rules + script format (today's `prompt.js` CORE) | ~900 words | system prompt | Already there |
| Ten rules + 5 style cards (TEACHING-BIBLE) | ~700 words | system prompt | Fixed text, so Claude Code can reuse it cheaply every turn |
| One gold example per style | ~5 lines each | system prompt, inside the cards | Haiku copies shape better than it follows instructions |
| Per-question header (4.5) | ≤ 120 tokens | top of the user message | `brain.js` starts claude once with `--system-prompt-file`, so anything that changes per question must ride in the message |
| Topic note lines (library) | ≤ 3 lines | header | Only the lines that matter now, not the full 400-word note |
| Answer guard (QUALITY-PLAN T6) | code | `src/lint.js` | Cuts what the prompt can't guarantee |
- Keep memory (`about-me`, `rules`, `learning`) under its current 2,000-word cap. The system prompt only changes when the app restarts or memory changes (then `brain.rotate()`).

### 5.2 Gold examples
- Written once by a strong model (a cloud session on Opus) from the TEACHING-BIBLE examples: 2 per style (physics + maths), each checked by hand for correct physics/maths and the ten rules.
- Stored as `library/styles/<style>.md` (card + examples). `prompt.js` builds the style section from these files.
- Rule: a gold example must pass `src/lint.js` with zero fixes.

### 5.3 Learning from what worked
- When an answer lands (4.2) and used an analogy, save it to `worked` (and one line in `learning.md`, as the learner already does). Next time the same topic comes up, the header carries it.
- The idle learner (`memory.js`) may add a teaching rule only when the same lesson shows up in ≥ 3 landed/not-landed results **(guess)**, and every change goes to `changelog.md` as today.

## 6. Eval harness (the quality gate for any prompt change)
- `test/eval/questions.json`: 30 questions on `test/fixtures/` (lecture, diagram, player) plus 3 new frames (a graph, a worked problem, a vector diagram). Each item: `{fixture, question, kind, box?, mustMention?, style?}`.
- `test/eval/run.js`: runs each through the real brain on Haiku (uses the subscription: about 30 questions per run, so only when prompts change), saves scripts to `test/out/eval-<date>.json`, scores:
  - S1 first line answers in ≤ 15 words, no filler opener;
  - S2 ≤ 5 say lines, each ≤ 20 words (before lint);
  - S3 marks land in `box` (30 px tolerance);
  - S4 concept questions contain an analogy ("like", "think of", "imagine");
  - S5 every `mustMention` term is said;
  - S6 the style's shape is there (Board Builder: ≥ 2 steps + a ring; Exam Coach: a trap line; Picture First: a mark before the formula; Doodle Story: a story line; Question Buddy: ends with a question);
  - S7 no banned words (easy, obviously, just, simply).
- Score = average of S1-S7 (0-1). Optional judge: Sonnet rates 10 answers for correct + plain words (1-5).
- **Gate:** a prompt or style change ships only if the score is ≥ baseline − 0.02 and S3 ≥ 0.9. Run the baseline twice first to see how much it wobbles (QUALITY-PLAN T9).

## 7. Tests (no human, no Claude calls)
- `learn-kind.test.js`: 40 labelled questions, ≥ 90% right kind.
- `learn-style.test.js`: 3 fake learners with a hidden favourite style (and one with none). 200 seeded runs of 30 answers each: the favourite is picked ≥ 70% of the time in answers 21-30 in ≥ 90% of runs; exploration ≤ 20%; never a switch inside a thread; Fixed mode never changes style.
- `learn-pace.test.js`: dials stay in range; one command moves one step; indirect signals need two; drift after 14 days.
- `learn-curve.test.js`: curve grows on observe, capped at 50; week summary has no numbers with %.
- `learn-snapshot.test.js`: ≤ 120 tokens (≈ 4 characters per token) for the worst case; never empty fields like `weak basics: ` with nothing after.

## 8. Privacy
One local JSON file. Nothing leaves the laptop except what already does (the screenshot and question sent to Claude, the audio sent to Groq). The header sends topic ids and short notes, no history dump.

## 9. Build order (after PRD v2 is OK)
1. `kind.js` + `style.js` + `pace.js` with tests (pure, can be built in a cloud session).
2. `snapshot.js` + `prompt.js` style section + `library/styles/` gold examples.
3. Wire into `main.js` (signals → state → header) on the laptop.
4. Eval: must beat the baseline from QUALITY-PLAN T9.
5. `curve.js` + week summary with the knowledge map (PRD v2 phase 4).

## 10. Open decisions
- Style mode: Auto by default or Fixed (TEACHING-BIBLE section 3).
- Where the state file lives (vault or app folder).
- Is a weekly summary wanted at all, or only the map?
