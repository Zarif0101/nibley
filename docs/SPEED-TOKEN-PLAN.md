# Nibley: Speed and token plan

Date: 2026-11-04 · Status: draft for Zarif's OK · For: the local session (needs the laptop, Claude Code, real turns)
Zarif (2026-11-04): "create a plan that will make the app both fast and token-efficient."
Works with `QUALITY-PLAN.md` (same blueprint format, same stop rules). Facts about caching and images come from the `claude-api` skill (Anthropic's docs), marked **(docs)**; my estimates are marked **(est.)**.

## 0. Rules
0. **Speed wins, tokens second** (Zarif, 2026-11-04). When a change saves tokens but makes the first word slower in any measurable way, don't ship it (e.g. keep the spare Claude process warm).
1. **Measure first.** Blueprint P0 comes before any change; every change quotes its numbers before and after.
2. **Never trade away teaching quality.** A change ships only if the eval (QUALITY-PLAN T9) stays ≥ baseline − 0.02 and marks-on-target (S3) stays ≥ 0.9.
3. **Speed and tokens together.** Most levers below help both: fewer tokens in means faster first words.

## 1. Where the tokens go today (est., from the code)
Each question goes to a warm `claude -p` process that keeps the whole conversation (`src/brain.js`: up to 8 turns, rotated after 10 min idle). The API is stateless, so **every turn re-sends everything before it** (docs).

| Piece | Size per question | Notes |
|---|---|---|
| Nibley's fixed instructions (`prompt.js` CORE) | ~930 tokens | Measured: 3,713 characters |
| Memory (`about-me`, `rules`, `learning`) | up to ~2,700 tokens | Capped at 2,000 words today |
| Teaching styles (PRD v2, not wired yet) | ~1,070 tokens | `src/styles.js`, 1 example per style |
| The screenshot | ~1,400 tokens | 1366×768; image tokens ≈ width × height / 750 (docs: Anthropic vision guide; check with real `usage`) |
| History: every earlier question, answer and **screenshot** | grows ~1,600 per turn | By turn 8: ~11,000 tokens of old screenshots and text |
| His question + Nibley's answer | ~200 tokens | Answers are short scripts |
| Warm-up message per new process | ~1,000-3,600 tokens | One per process start (2 at app start, 1 per rotation) |

**How caching changes the bill (docs):** Claude caches a repeated beginning (prefix) of the request. Reading from the cache costs about 0.1× normal input; writing it costs 1.25×. The cache lasts **5 minutes**. Haiku 5.5 caches prefixes of 512+ tokens, so Nibley's instructions do cache.

**The big leak:** Zarif studies with gaps. If more than 5 minutes pass between questions, the cache has expired, and the next question **re-writes the whole history, old screenshots included, at 1.25×**. Turn 8 after a 6-minute gap ≈ 14,000 token-units; the same question in a fresh process ≈ 2,600 (est.). Today's 10-minute idle rotation sits on the wrong side of the 5-minute cache.

**Unknown:** how Claude subscription limits weigh cached vs fresh tokens isn't documented in the skill. Cut total tokens, and cut fresh tokens hardest.

## 2. Where the time goes today (measured, BUILD-LOG 10-28)
| Step | Time | Notes |
|---|---|---|
| Speech-to-text (Groq) | ~250 ms | Fine |
| Screenshot | ~450 ms (+ ~450 ms hiding the overlay) | Runs while he talks; delays only the pill (QUALITY-PLAN T3) |
| Claude: first text | 0.7-1.8 s warm | Includes reading all input tokens; Haiku may also think first (see P5) |
| First full `say` line parsed | +0.1-0.3 s (est.) | Voice can't start before the line ends |
| Voice: first audio | 0.3-1.2 s Edge, more when throttled | QUALITY-PLAN T1 |
| **First word, total** | **median ~2.5 s** | Mostly on the backup voice |

## 3. Targets (added to the scorecard)
| # | Check | Target |
|---|---|---|
| Q2 (exists) | First word | median ≤ **2.0 s** (was 2.5 s target), ≤ 3 s for 9 in 10 |
| Q11 | Fresh tokens per question (`input + cache_write`) | median ≤ **2,500** |
| Q12 | Cache share (`cache_read / all input`) | ≥ **60%** |
| Q13 | Free answers (no Claude call: again, slower, replays, review cards he got right) | logged; grows over time |

## 4. Blueprints, in this order
Format as in QUALITY-PLAN: **Why · Files · Change · Test · Done when**.

### P0. Count every token and every millisecond
- **Why:** none of this is logged today. `brain.js` reads the `result` line and drops its usage numbers.
- **Files:** `src/brain.js` (`onEvent`, the `result` branch), `src/main.js` (turn log).
- **Change:** log `{ ev: 'claude_usage', turn, image, input, cache_write, cache_read, output, cost, api_ms }` from the `result` line's `usage` (`input_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`, `output_tokens`) plus `total_cost_usd` and `duration_api_ms` if present. **Check the real field names on the first run** (print one `result` line once, without the screenshot). Add `first_say` (when the first full `say` line is parsed) to the turn timing.
- **Test:** `node test/scorecard.js` shows Q11, Q12 and the "where the time goes" lines after 5 turns (already built: `test/scorecard.js`).
- **Done when:** 20 real turns logged; this plan's section 1 table replaced with measured numbers.

### P1. Don't re-send a screen Claude has already seen
- **Why:** follow-ups ("and this part?") are common, and the screen usually hasn't changed. Each repeat screenshot costs ~1,400 tokens now and again in every later turn.
- **Files:** `src/screen.js` (**built**: `screenKey(bitmap, width, height)` + `sameScreen(a, b)`, tested), `src/main.js` (`ask`), `src/brain.js` (`ask`).
- **Change:** compute `screenKey` from the capture bitmap. In `brain.ask`, if this process already got a screenshot with the same key (and hasn't rotated since), send no image and add "(Same screen as your last question.)" to the text. Coordinates stay valid because the screen is the same.
- **Test:** 10 follow-ups on a paused video: no image sent (log `image: false`), answers still point at the right spot (marks on target in the sim); scroll the page: image sent again.
- **Done when:** Q11 drops on follow-ups and eval S3 holds.

### P2. Rotate the brain before the cache goes cold
- **Why:** section 1's big leak. After 5 idle minutes, a long history costs more to re-send than a fresh process with a one-line summary (`brain.js` already carries one over: "Before this, we talked about...").
- **Files:** `src/brain.js` (`MAX_IDLE`, `MAX_TURNS`).
- **Change:** `MAX_IDLE` 10 min → **4.5 min**. Try `MAX_TURNS` 8 → 6. The spare process is already warm, so rotation adds no wait.
- **Test:** P0 numbers over a real study session: fresh tokens per question, first word, and whether follow-ups after a pause still make sense (3 checks by hand).
- **Done when:** Q11 median falls and Q2 doesn't get worse. Keep `MAX_TURNS` 8 if 6 makes follow-ups worse.

### P3. Slim the fixed instructions
- **Why:** memory alone can be ~2,700 tokens on every process start and every cold cache.
- **Files:** `src/prompt.js` (`build`), `src/memory.js` (learner).
- **Change:** memory cap 2,000 → **900 words**: all rules (≤ 15 lines), `about-me` (≤ 10 lines), the newest 15 `learning` lines. Keep the system prompt **byte-identical** within a process (no times, no counters), or the cache breaks (docs: any byte change invalidates everything after it). When teaching styles arrive (PRD v2), keep 1 example per style.
- **Test:** prompt size printed at start; eval ≥ baseline − 0.02.
- **Done when:** system prompt ≤ ~2,000 tokens with styles, ≤ ~1,300 without.

### P4. Try a smaller screenshot (experiment, may be dropped)
- **Why:** 1024×576 ≈ 790 tokens instead of ~1,400 (est., same formula), and less input means a faster first word. Anthropic recommends 1366×768 as a low-cost resolution for screen work, and warns not to downsample unless the detail isn't needed (docs). So this has to prove itself.
- **Files:** `src/main.js` (`capture`: resize before encoding), `src/script.js` (scale coordinates back by 1366/1024 before clamping).
- **Change:** behind a setting `shotScale: 1 | 0.75`, default 1.
- **Test:** eval twice at each scale. Keep 0.75 only if S3 ≥ 0.9 and the score holds; check small text (lecture slide) by eye in the sim.
- **Done when:** decided either way, with numbers in `BUILD-LOG.md`.

### P5. Think less for quick answers (check what Claude Code allows)
- **Why:** Haiku 5.5 thinks by default (docs: adaptive thinking on, effort `medium`). Thinking happens before the first word and costs output tokens. Nibley's answers are short; they rarely need deep thinking.
- **Files:** `src/brain.js` (`startProc` args).
- **Change:** run `claude --help` on the laptop and look for an effort or thinking option. If there is one, try effort `low`. If there isn't, skip P5 and note it.
- **Test:** eval at low vs current; P0 output tokens and first word.
- **Done when:** decided with numbers. Sonnet stays manual (tray switch); never switch models automatically.

### P6. Answers that cost nothing
- **Why:** the cheapest Claude call is the one you don't make.
- **Already built (wire per `docs/briefs/wiring-checklist.md`):** "again" (replay from memory), "slower" (re-voice only), lesson replay (exists), the daily review queue and flashcards from the library (`src/learn/review.js`), answer-guard fixes in code instead of re-asking.
- **Change:** log `{ ev: 'free_answer', kind }` for each, for Q13. For review cards, check exact or near-exact answers in code first; ask Claude to judge only when unsure.
- **Done when:** Q13 shows real numbers.

### P7. Shave the first-word wait
- **Why:** Q2 target 2.0 s.
- **Change, smallest first:** QUALITY-PLAN T1 (open the voice connection at key release, give the first line enough time) and T3 (skip hiding an empty overlay). Keep the first `say` line under 12 words so it finishes streaming sooner (style cards already ask for under 15). Start voicing the first line the moment it is parsed (check it isn't waiting on the next line).
- **Test:** scorecard Q2 and the "where the time goes" lines (P0).
- **Done when:** Q2 median ≤ 2.0 s on 20 turns.

### P8. Keep idle at zero
- **Why:** no tokens and no CPU when he isn't asking.
- **Change:** QUALITY-PLAN T8 (start the spare only after the first answer, but only if the first word is not slower at all: speed wins); the learner stays at once per session after 5 idle minutes, text only (never screenshots); no tools in the Claude process (`--tools ''` stays), because every tool definition adds tokens to every request.
- **Done when:** a 30-minute idle log shows 0 Claude calls after the learner.

## 5. Don't
- Don't compress the PNG to save tokens: image tokens depend on pixels, not file size.
- Don't run a local model on the i5-6200U: slower than Haiku and much heavier.
- Don't put the time, a turn counter or anything that changes into the system prompt: it breaks the cache.
- Don't switch to the API to use newer caching or thread features: Nibley must stay on the subscription (PRD 3).

## 6. Expected result (est., to be replaced by P0 numbers)
A typical question: ~2,600 fresh tokens → **~1,500** (P1 + P3), and a follow-up after a pause ~14,000 → **~2,600** (P2). First word ~2.5 s → **~2.0 s** (P7, with T1).
