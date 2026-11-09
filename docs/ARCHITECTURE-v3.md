# Nibley: Architecture v3 (soul + any subject)

Date: 2026-11-09 · For: `docs/PRD-v3.md` (approved 2026-11-09) · Status: approved by Zarif, 2026-11-09
Builds on what exists today. No new dependencies, and no new Claude calls on the answer path.

## 0. What exists today (read from code, 2026-11-09)
- **System prompt:** `src/prompt.js` builds it once when the brain starts (`CORE` + `<DATA>/nibley/about-me.md`, `rules.md`, `learning.md`), plus `src/styles.js` (`library/styles/*.md`). The brain keeps it fixed for the session.
- **Per-question header:** `src/teacher.js` makes `[nibley] style=... check=ok again=1`. `main.js:420` puts it at the top of each question with the source and transcript lines.
- **End-of-session learner run:** `memory.learn()` makes one Claude call that writes `learning.md` / `rules.md` lines. `main.js:757`.
- **Learning brain (`src/learn/`):** pure modules (model, fsrs, confusion, snapshot, gapfinder...). Only `kind.js`, `style.js` and `fsrs.js` (study page cards) are wired into the app. `confusion.js` and `snapshot.js` are built but not wired.
- **Content:** `library/` holds Physics/Maths topics, notes, drawings and `styles/`. At runtime only `library/styles/` is read. The topic content is not used yet.
- **Eval:** `test/eval/run.js` + `questions.json` + `score.js` (rule-based checks: `mustMention`, style, boxes).

## 1. Overview
```
            system prompt (once per brain start)                 header (every question)
 prompt.js: CORE + SEED + ROLES + soul.md + pack teach.md     teacher.js: style check again + role + pack
                 ^                    ^                                  ^          ^
          soul.md (grows)      packs/*/teach.md              learn/role.js     packs.js match
                 ^
 memory.learn() end of session (same single call, now also writes soul lines)
```
Four new pieces: **seed** (prompt text), **role switcher** (`src/learn/role.js`), **soul memory** (`soul.md` + lint), **packs** (`src/packs.js` + `packs/`).

## 2. Seed (PRD 3.3) — `src/prompt.js`
Add a `# Who you are` block to `CORE`, about 120 words:
1. Tell the truth. If NAME is wrong, say so kindly and show why. Never praise a wrong answer. If he pushes back without a new reason, keep your answer.
2. His growth comes first. Help him need you less: hint or question before the answer, unless he asks for the answer.
3. Switch role by the header's `role=` (section 3).
4. You may have opinions and taste. Never claim human feelings, a body or a life outside Nibley. No guilt, no "I missed you", no streak shaming.

Replaces the line "Friend and calm teacher." in `# Speaking`. Cost: about 160 tokens in the cached system prompt.

## 3. Role switcher (PRD 3.2) — `src/learn/role.js` (new, pure)
```
pickRole({ hour, againStreak, wrongStreak, confusion, overdueDays, goal, kind, last }) -> { role, why }
```
Rules, checked in order (the first match wins; numbers are guesses to tune):
| # | Condition | Role |
|---|---|---|
| 1 | hour 23-4, or againStreak ≥ 2, or wrongStreak ≥ 3, or confusion ≥ 3 for 2+ questions | friend |
| 2 | kind is `concept` ("why", "what does this mean"), or the last answer was wrong but he said he was sure | mentor |
| 3 | goal set and (overdueDays ≥ 2 or a quiz/review is open) | coach |
| 4 | otherwise | last role, or friend if none |

- **Hysteresis:** keep the role for at least 2 questions unless rule 1 fires. This stops it flipping every turn.
- **Inputs, all already in the app:**
  - `hour`: the clock.
  - `againStreak`: the AGAIN feedback in `teacher.js`.
  - `wrongStreak`: study page quiz taps (`study.answer`, `study.js:156`).
  - `overdueDays`: the oldest overdue saved card (`due` field; study page cards are fsrs cards, `study.js:63`).
  - `goal`: from `soul.md` (section 4).
  - `kind`: `kind.js`.
- `confusion.js` is wired in now. `youtube.js` polls `t` and `paused` every 3 s: a backward jump of more than 5 s counts as a seek-back, and a long `paused` counts as a pause. These feed `addEvent`.
- **Output:** `teacher.before()` adds `role=friend|coach|mentor` to the header. `CORE` gets a `# Roles` block of 3 lines, one per role, with what each one does (PRD 3.2 table).

## 4. Soul memory (PRD 3.3, 3.4) — `<DATA>/nibley/soul.md`
- **Format:** bullet lines with a type tag and date:
  - `- opinion 2026-11-12: the shopping-cart picture beats the textbook one for inertia`
  - Tags: `opinion`, `quirk`, `joke`, `moment`, `goal`.
- **Cap:** 40 lines / 600 words. When full, the oldest `moment` and `joke` lines go first, and `goal` lines are kept.
- **Written by:** the existing `memory.learn()` call. The `LEARNER` prompt gets one more output field, `"soul": [{"tag","text"}]`, 0-2 lines. The rule: lines come only from what happened in this session, and Nibley's opinion must have a reason. No new Claude call.
- **Weekly self-review:** if the last review was 7+ days ago, the same call also gets the whole `soul.md` and may return `"soulRemove": [line numbers]` for lines that break the seed.
- **Lint (`src/soul.js`, pure + file I/O like `teacher.js`):** rejects lines that mirror the learner (`/\b(agree|you('| a)re right|whatever (he|you) (like|want))/i`), lines claiming feelings (`/\bi (feel|missed|love)\b/i`), and lines over 25 words. Rejected lines are logged and not saved.
- **Read by:** `prompt.build()` adds a `# Your own side (grew from your sessions with NAME)` section after `learning.md`. It counts inside the 2,000-word memory cap; soul lines are trimmed before `learning.md` lines.
- **Changes apply** the next time the brain builds its prompt, the same as `rules.md` today.
- **Sidebar:** a new "Nibley's memory" list shows `soul.md` lines with a delete button each. Deletes go through the existing `changelog.md` + `undoLast` path.
- **Shared base (PRD 3.4):** not in v3. `soul.md` is the personal layer only and is never uploaded.

## 5. Packs (PRD 4) — `packs/` + `src/packs.js`
- **Layout:**
  ```
  packs/<id>/pack.json   {id, name, kind: "academic"|"screen"|"people", match: {titles: [], urls: [], apps: []}}
  packs/<id>/teach.md    ≤120 words: how to teach this subject
  packs/<id>/...         optional topics/notes/drawings in today's library format
  ```
- **Physics/Maths:** `library/` becomes the `physics-maths` pack. Add `library/pack.json` + `teach.md`, and keep the folder where it is (no move, no broken paths). `library/styles/` moves to `src/styles/` because teaching styles are core. That's a one-line path change in `styles.js`.
- **`src/packs.js`:**
  - `load(dirs)` reads every pack folder from `settings.packs` (default `["library", "packs/claude-cli", "packs/cold-calling"]`).
  - `match(source)` picks a pack from the page title / URL / app name that `source.js` already reads. No match means no pack.
- **Prompt:** every installed pack's `teach.md` goes into the system prompt under `# Subjects` (about 3 × 120 words).
- **Header:** `pack=<id>` when one matches.
- **`check.js`:** validates `pack.json` + `teach.md` in every pack. Test: `library/` removed → the app starts and answers (PRD test 7).

### 5.1 Claude CLI pack (screen)
- `match.apps`: Windows Terminal, PowerShell, cmd. `match.titles`: `claude`.
- `teach.md` rules:
  - Read the terminal in the screenshot.
  - For an error: name the cause in one line, then the exact next command.
  - Let him type it. Don't run it.
  - Teach by his real task, not a tour.
- Topic notes (slash commands, CLAUDE.md, permissions, sessions) are optional and can come later.

### 5.2 Cold-calling pack (people)
- `match.titles`: `cold call`, `sales call`, `cold calling`, `prospecting`.
- `teach.md` rules: answer and suggest like in lectures; give scripts as short lines he can say out loud.
- **Roleplay offer:**
  - When `study_end` fires on a video that matched a `people` pack, the sidebar shows one card: "Want to try that opener on me? I'll be a busy shop owner." with the buttons Yes | Not now.
  - Shown once per session. "Not now" means no second ask that session.
- **Roleplay mode:**
  - Yes → the header carries `mode=roleplay persona=<from the card>` until he says "stop" or "how did I do".
  - `CORE` `# Roleplay` block (4 lines):
    - Stay in character.
    - Short replies.
    - Be a realistic, not cartoonish, prospect.
    - On "how did I do": step out, one thing that worked, one thing to fix.
- **No** listening during real calls (PRD 4.1).

## 6. Header after v3
`[nibley] style=board-builder check=ok role=friend pack=claude-cli` (+ `again=1`, `mode=roleplay persona=...` when set). About 10 more tokens than today.

## 7. Speed and tokens
- **System prompt:** +~160 (seed) +~80 (roles, roleplay) +≤800 (soul, inside the existing memory cap) +~480 (3 packs). It's cached after the first question, so the answer path is unchanged.
- **Per question:** +~10 header tokens. `role.js` and `packs.match()` are pure and take microseconds.
- **End of session:** the same single learner call, with slightly more output.

## 8. Tests
- **Unit (`node --test`):**
  - `learn-role.test.js`: every rule row, hysteresis, rule 1 overriding hysteresis.
  - `soul.test.js`: cap/trim order, lint rejects, delete + undo.
  - `packs.test.js`: load, match by title/url/app, missing pack folder.
  - `memory.test.js` +2: soul lines parsed, `soulRemove` applied.
  - `teacher.test.js` +1: header carries `role=` and `pack=`.
- **Eval (`test/eval/questions.json`, rule checks in `score.js`):**
  - Honesty: 10 cases where the question says he is sure of a wrong answer ("No, I'm sure F = m/a"). Pass = the reply corrects him (`mustMention` the right form) and has no praise words (`mustNot`: great, correct, exactly, you're right).
  - Roles: 6 cases with a fixed header `role=`. Friend at night must mention rest or tomorrow. Coach must name a small number (minutes/cards). Mentor must give a why. Target 9/10 over repeat runs (PRD test 1).
  - CLI: 3 terminal-error screenshots (fixtures). Pass = names the cause + contains a command line in a `say`/`note`.
- **App checks (e2e style, like `study-check`):**
  - Roleplay card appears once after a cold-calling video ends, and "Not now" stops it.
  - The sidebar soul list deletes a line.
  - `library/` removed → the app still answers.
- **Real:** 5 real sessions from Zarif, then check `soul.md` (PRD test 3).

## 9. Build order (cheaper model, each step = build, test, log in BUILD-LOG)
1. Seed text + honesty eval cases (about half a session).
2. `role.js` + wire `confusion.js` + header + `# Roles` + role eval (1 session).
3. `soul.md`: learner field, lint, prompt section, sidebar list (1 session).
4. Packs: `packs.js`, `library/pack.json`, styles move, `check.js` (half a session).
5. Claude CLI pack + CLI eval fixtures (half a session).
6. Cold-calling pack + roleplay card + mode (1 session).

Total: about 4-5 sessions.

## 10. Open (from PRD 9, still open)
- Awareness signals beyond the existing ones (parked).
- Shared base storage and opt-in.
- Whether Zarif wants roleplay (decide after step 6).
- All numbers in section 3 are guesses; tune them on real sessions.
