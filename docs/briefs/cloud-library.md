# Brief: cloud session (study library)

Runs on: Claude Code cloud session credits ($100). Opus as lead at extra effort; cheaper subagents (Sonnet/Haiku) do the bulk writing and drawing. Opus reviews every batch.
Repo: Nibley on GitHub. Work on a branch `library-v1`, open a PR at the end.
Read first: `CLAUDE.md`, `docs/DESIGN.md`, `brainstorms/2026-11-04-pregenerated-study-assets.md`.

## Why this exists
Nibley's runtime brain is Haiku (cheap, fast, not very smart). This library is the "distillation": a smart model works out the hard parts once, in advance, so at runtime Haiku only looks things up and places ready-made drawings. Example: Haiku writes `draw ball` and `arrow to ball.top` instead of inventing a drawing or a teaching order.

## Scope
- Subjects: Physics and Maths. Level: 11th-12th standard, plus the foundation topics they depend on.
- No single board. Compare major syllabi (CBSE/NCERT, Bangladesh HSC, Cambridge A-Level, AP, IB) and keep the shared core. Use syllabi only for topic lists.
- Only touch `library/`. Do not edit `src/`, `docs/` or `test/`. Another session is changing the app code at the same time.

## Output contract (the app will read exactly this)

### `library/topics.json`
Array of topics:
```json
{
  "id": "newtons-second-law",
  "subject": "physics",
  "level": "11",
  "title": "Newton's second law",
  "summary": "Force equals mass times acceleration; more force, more speed-up.",
  "prereqs": ["vectors-basics", "acceleration"],
  "assets": ["block", "arrow-force", "ramp"]
}
```
- `id`: lowercase kebab-case, unique.
- `subject`: `physics` | `maths`. `level`: `foundation` | `11` | `12`.
- `summary`: plain words, max 20 words.
- `prereqs`: ids that must exist. The graph must have no cycles. Foundation topics are the roots (for example basic algebra, fractions, units).
- `assets`: names that exist in `library/assets/index.json`.

### `library/notes/<id>.md`
One teaching note per topic, written for Haiku to read at runtime. Max 400 words. These exact headings, in this order:
1. `## Simple idea`: max 60 words, plain words, one everyday example.
2. `## Key formulas`: plain text or Unicode (F = m·a), with every symbol named. Write "none" if there are none.
3. `## Picture it`: which assets to draw and where the arrows and labels go, in 1-3 lines.
4. `## Common mistakes`: 3 bullets.
5. `## Check questions`: 3 questions with short answers (for pause quizzes).
6. `## Flashcards`: 5 `Q:` / `A:` pairs.
7. `## Root check`: one quick question per prerequisite. A wrong answer means that root is weak (for the gap finder).

### `library/assets/<name>.svg` + `library/assets/index.json`
Drawings in Nibley's hand-drawn pen style (see `docs/DESIGN.md`, "Marks on screen"):
- `viewBox="0 0 200 200"`, `<path>` elements only, `fill="none"`, `stroke="currentColor"`, `stroke-width="3.5"`, round caps and joins.
- No text, no colours, no fills, no gradients, no filters. The app adds colour, labels and the draw-on animation (`stroke-dashoffset`), so path order = drawing order.
- Slightly hand-drawn (small wobble, ends that don't quite meet), not clip-art. Max 12 paths, max 4 KB per file.
- `index.json` entries: `{ "name": "ball", "subject": "physics", "tags": ["sphere","projectile"], "desc": "round ball", "anchors": { "center": [100,100], "top": [100,40] } }`. Anchors are named points so Haiku can aim arrows and labels.

### `library/check.js`
A plain Node script (no dependencies). Checks every rule above: unique ids, existing prereqs, no cycles, a note for every topic with all 7 headings and ≤400 words, assets referenced = assets present, SVG rules (only paths, no fill, size ≤4 KB, valid viewBox). Prints a pass/fail summary and exits non-zero on any failure. `node library/check.js` must pass before each commit.

### `library/README.md`
How the library was made, which syllabi were compared, topic and asset counts, known gaps.

## Order of work (commit after each step, so leftover credit still leaves usable work)
1. Syllabus comparison, then `topics.json` for both subjects plus foundations. Write `check.js` and make it pass on the topics.
2. Asset list (shared, reusable drawings first: ball, block, spring, ramp, pulley, lens, wave, circuit parts, axes, triangle, circle, vector arrow, number line, graph shapes). Draw, check, commit.
3. Notes in batches of ~15 topics per subagent. Opus spot-checks 3 notes per batch for correctness and plain wording. Commit per batch.
4. README, final `check.js` run, open the PR.

Rough size target: ~60 topics per subject plus foundations, ~60-80 assets. Stop earlier if credit runs low, after a clean commit.

## Rules
- Original wording only. Never copy textbook text, figures or syllabus documents into the repo.
- Physics and maths must be correct. If unsure about a fact, leave it out and list it in the README under "Known gaps".
- No secrets, no `.env`, no network calls from `check.js`.
- Final summary for Zarif (he reads the summary, not the code): what was made (counts), what `check.js` reported, what was NOT checked (for example "Opus reviewed 30 of 120 notes"), and the PR link.
