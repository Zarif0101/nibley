# Nibley: Quality plan

Date: 2026-11-04 · Status: draft for Zarif's OK · For: the local session (Zarif's laptop, his subscription)
Zarif (2026-11-04): "slow down with the features and make the app more quality-focused, with small tweaks."
Companion docs: `TEACHING-BIBLE.md` (how Nibley teaches, layouts) and `LEARNING-ENGINE.md` (personalization, distillation). Those two are inputs to PRD v2; this plan is for the v1 app as it is today.

## 0. The rule
~~No new feature until the scorecard (section 1) is green on 3 real study sessions in a row.~~ Dropped by Zarif 2026-11-05: the next round is `docs/NEXT-ROUND.md` (bugs + voice, sidebar, new marks, 3D Nibley). Still in force: a tweak that turns another scorecard line red is reverted.

## 1. Scorecard (the quality bar)
`test/scorecard.js` (built in T0) reads the newest `logs/nibley-*.log` + `test/out/e2e-results.json` and prints this table with pass/fail.

| # | Check | Target | How it's measured | Today (evidence) |
|---|---|---|---|---|
| Q1 | Voice | The voice picked in the tray plays on ≥ 95% of spoken lines when online | `line_voice` log (new, T0) | Fails: "Piper shows up, not the chosen ones" (Zarif, 11-04) |
| Q2 | Speed | First word ≤ 2.5 s median, ≤ 4 s for 9 in 10 turns (PRD limit 5 s) | `turn` log, `first_audio` | Median 2.5 s, but measured mostly on backup voices |
| Q3 | Feedback | Something seen or heard ≤ 150 ms after pressing the hotkey | `turn` log, new `feedback_ms` | Tray icon instant; pill ~0.9 s late (overlay hidden for the screenshot) |
| Q4 | Understand | Every spoken line shows a subtitle, in sync ±150 ms | e2e | No subtitles |
| Q5 | Aim | Marks land in the target box on ≥ 90% of fixture questions (30 px tolerance) | e2e + eval | e2e passes on 3 fixtures; real YouTube untested |
| Q6 | Teach | Eval score ≥ baseline (LEARNING-ENGINE section 6) | `test/eval/run.js` | No eval set yet |
| Q7 | Stable | 0 unhandled errors in 50 turns. Claude crash mid-turn: plain message + next question works ≤ 5 s | log + kill test | `onCrash`/`rotate` exist, never stress-tested |
| Q8 | Light | Idle CPU < 2%, RAM < 900 MB, no growth over 2 h | `Get-Counter` | 0.76% CPU, 867 MB RAM (10-28) |
| Q9 | Calm | Only DESIGN.md tokens; ≤ 3 marks on screen at once; labels ≤ 6 words; ≤ 5 say lines | lint (T6) + token grep | Tokens ok; marks and lines uncapped |
| Q10 | Hear | Speech-to-text word errors ≤ 2% | e2e | 0-1 errors in 50 words: passes |

## 2. Blueprints, in this order
Each one: **Why** (evidence) · **Files** · **Change** · **Test** · **Done when**. Do them one at a time, log each result in `BUILD-LOG.md` with numbers.

### T0. Scorecard + one log line per spoken line
- **Why:** you can't fix what you can't see. Today only the first line's voice is logged (`voice:start` → `backup_voice` when `i === 0`).
- **Files:** `src/main.js` (`voice:start` handler, `sayLine`), new `test/scorecard.js`.
- **Change:** log `{ev:'line_voice', turn, i, src, synth_ms, wait_ms}` for every line (`synth_ms` = time to get audio, `wait_ms` = time the overlay waited for it). Log `feedback_ms` at `ptt_down`. `scorecard.js` prints Q1-Q10, one row each, pass/fail/no data.
- **Test:** `node test/scorecard.js` on the 10-28 log prints rows without crashing; after 5 new turns Q1 shows a real percentage.
- **Done when:** the table prints, and every later blueprint quotes its row before and after.

### T1. The chosen voice plays on every line (root cause first)
- **Why:** Q1 fails. It's the first thing Zarif notices.
- **What the code does now** (`src/main.js` `sayLine`): line 1 gives Edge 1.2 s (`tts.synth(text, i === 0 ? 1200 : 2500)`), Piper starts in parallel. Any Edge failure sets `ttsBackup = true` for the rest of that turn; 3 failed turns put the whole session on backup for 5 min.
- **Hypothesis (unverified, check before changing code):** Edge's first audio often takes longer than 1.2 s on this connection (BUILD-LOG 10-28 measured 0.4 s to 3 s when throttled). Line 1 misses, and the turn lock then sends every line to Piper. Second suspect: the spare socket is opened at `ptt_down` and used 2-6 s later (talking + STT + Claude); sockets idle ~20 s gave no audio before. The error text already says `connected X ms, opened Y ms before`: read it.
- **Steps:** (1) T0 log in place. (2) 20 real turns with the default voice, 10 after switching voice in the tray. (3) Group failures by cause from `synth_ms` and the error text. (4) Fix only what the data shows:
  - first audio slow but arrives → give line 1 up to 2.0 s, and check Edge starts on line 1 the moment its `say` line is parsed (not after the next line);
  - stale socket → open the fresh connection at `ptt_up` (the answer is ≥ 1 s away), not at `ptt_down`;
  - Edge refuses or throttles → ask Zarif (open decision 4) before allowing a voice change mid-answer.
- **Test:** the same 30 turns again. Wi-Fi off: Piper speaks within 1.5 s, no silence over 2 s.
- **Done when:** Q1 ≥ 95% on 30 turns and Q2 not worse than before.

### T2. Subtitles for every spoken line
- **Why:** "It's really hard to understand what he's actually saying" (Zarif). Q4.
- **Files:** look approved and in `docs/DESIGN.md` "Subtitles" (2026-11-04); module ready in `src/overlay/subtitles.js` (see `docs/briefs/wiring-checklist.md`). Wire into `src/overlay/overlay.html`, `src/overlay/overlay.js` (`run()`: show the line when its audio starts playing, clear on end).
- **Change:** one subtitle element; text = the `say` line; appears on `audio.onplaying`, fades 120 ms after `onended`; moves to top-centre when any mark sits in the bottom quarter.
- **Test:** e2e turn on `test/fixtures/lecture.png` (white) and `player.png` (dark): screenshot mid-line shows the subtitle; log start/end vs audio start/end within 150 ms; no overlap with a mark.
- **Done when:** Q4 passes on both fixtures and Zarif says it reads well.

### T3. Instant "I heard you" on press
- **Why:** Q3. The pill waits ~0.9 s because `captureClean()` hides the overlay for the screenshot.
- **Files:** `src/main.js` (`captureClean`, `onPtt`), `src/overlay/overlay.js`.
- **Change:** (a) skip hiding the overlay when it shows nothing (no marks, no pill): the screenshot then takes ~0.45 s, not ~0.9 s. (b) A 60 ms soft tick at `ptt_down` made with WebAudio in the overlay (sine 880→660 Hz, quiet). No sound file, no dependency.
- **Test:** 10 presses: `feedback_ms` ≤ 150 (the tick); pill shown ≤ 500 ms when the screen was empty; STT accuracy (Q10) unchanged with the tick (the mic is already recording).
- **Done when:** Q3 passes and Q10 still passes.

### T4. "Again" and "slower"
- **Why:** ADHD: missing one sentence loses the whole answer. Replaying costs no Claude use.
- **Files:** `src/main.js` (`handleText`, next to the `save this` check; keep the last turn's items + audio buffers), `src/tts.js` (speaking rate).
- **Change:** "again" / "say that again" / "repeat" → replay the last answer from memory: same audio, same marks, no network. "slower" → re-voice the last answer at -15% rate (Edge prosody rate; check that msedge-tts 2.1.1 takes a rate option, else SSML `<prosody rate="-15%">`), and save `settings.rate` one step slower for future answers.
- **Test:** unit test for the phrase matcher (and that "again, what is a vector?" is still a real question); e2e: replay makes 0 Claude calls and 0 TTS calls.
- **Done when:** both work 5 of 5 times by voice.

### T5. Stop means stop (check only)
- **Why:** a tap on the hotkey already calls `bargeIn()`, which stops voice and marks. Make sure it always does.
- **Test:** tap during line 1, line 3, during a step wait, during a replay: silence within 200 ms each time.
- **Done when:** 4 of 4. Fix only if one fails.

### T6. Answer guard (lint the script in code)
- **Why:** Haiku sometimes rambles; the prompt alone can't guarantee short answers. Q9.
- **Files:** new `src/lint.js` (pure), called from `onCmd` in `src/main.js`; `test/lint.test.js`.
- **Change:** say lines over 24 words are cut at the last comma or full stop before word 24; voice stops after 6 say lines (today 8); a 4th visible mark fades the oldest one (steps excepted); log `{ev:'lint', rule}` per fix. These counts feed the eval.
- **Test:** unit tests for each rule; e2e still 10/10.
- **Done when:** Q9 passes on 20 turns; lint fires on fewer than 1 in 5 turns (if more, fix the prompt, not just the cut).

### T7. Crash and limit recovery
- **Files:** `src/brain.js` (`onCrash`, `classify`), `src/main.js` (`brainError`).
- **Test:** kill `claude.exe` mid-answer → Nibley says "One second, I'm restarting" and the next question works within 5 s; disconnect Wi-Fi mid-answer → plain "No internet" message; usage-limit text from Claude → "Claude's limit is reached, back at <time>" when the time is in the message.
- **Done when:** 3 of 3, Q7 green over 50 turns.

### T8. Memory diet (measure first)
- **Why:** 867 MB with 2 warm Claude processes on an 8 GB laptop.
- **Steps:** log RAM per process (Electron ×5, claude ×2, helper, piper). If the spare Claude process costs > 200 MB, try starting it only after the first answer of a session.
- **Done when:** RAM < 750 MB with first word not more than 300 ms slower. Otherwise revert and log the numbers.

### T9. Eval baseline (before any prompt change)
- **Why:** Q6. Every prompt or style change later is judged against this.
- **What:** `test/eval/` as in `LEARNING-ENGINE.md` section 6: 30 questions on the fixtures, automatic scores, saved to `test/out/eval-<date>.json`.
- **Done when:** baseline saved and run twice (to see how much scores wobble on the same prompt).

### T10. Nibley comes alive (only after T0-T9 are green)
- **What:** replace the flat pixel mascot in the status pill with short loops rendered from the 3D model (`design/mascot-3d/render.js`): 24 frames per mood, 64 px WebP, ~20 KB each. Plain images, no 3D in the app. The tray icon stays pixel art.
- **Test:** CPU while the pill animates < 3%; looks right on the white and dark fixtures.
- **Done when:** Zarif likes it.

### T11. Word highlight in subtitles (optional)
- Only if msedge-tts gives word timings: the word being spoken turns `ink`. Skip if it costs more than a small change.

### T12. Nibley shows up the same way every time (Zarif: "it feels like he appears randomly")
- **Why (from the code):** the Listening pill waits for the screenshot (`captureClean`, ~0.9 s); if he lets go before that, Listening is skipped and Thinking appears first; the pill blinks on with no motion, wherever the mouse is, and snaps between states.
- **Ready (built + tested in the cloud):** `src/overlay/pill-sequence.js` (fixed order listening → thinking → speaking → none, each ≥ 350 ms, never skips Listening, blocked until the screen is grabbed; 5 tests), `src/overlay/pill-motion.js` (pop in 170 ms, width glide + mascot hop on state change, fade out 140 ms; reduced motion = none). Preview: `test/out/pill-motion-preview.webp`.
- **Place (Zarif, 2026-11-04):** same spot every time, only while active: bottom-centre, 184 px above the screen bottom, above the buttons and subtitle; to the top with them when a mark is in the bottom quarter. In `overlay.html`, wrap `#status` in a full-width centred flex row (`#status-wrap`) so width changes stay centred; drop the cursor-based `left`/`top`.
- **Change:** in `main.js` replace the direct `say('listening' | 'thinking' | ...)` calls with the sequencer (`press()` at `ptt_down`, `ready()` when the screenshot resolves, `push(...)` for the rest). In `overlay.js status()`: `enter` on first show, `morph` on a change, `leave` on none. With T3 (tick sound at once, no overlay hide when empty) the pill arrives ~0.45 s after the press.
- **Test:** 20 presses, half released early: the log shows the same order every time; no pill in any screenshot.
- **Done when:** Zarif says it no longer feels random.

### T13. Answer Nibley's questions by click or Enter
- **Why:** Zarif: when Nibley asks back, give options to click or Enter so he doesn't have to press the hotkey and speak again.
- **Ready (built + tested in the cloud):** script command `choices A | B | C` (2-3 options, ≤ 4 words, `src/script.js` + test), `src/overlay/choices.js` (buttons above the subtitle; Enter = first, 2/3 = others, Esc = dismiss; gone after 15 s, a pick, or the next hotkey press). Preview: `test/out/sim-ask-with-buttons-1.png`.
- **Change:**
  1. Prompt (`prompt.js` CORE): "When you ask him a yes/no or pick-one question, add a `choices` line right after it with 2-3 short options, the most likely first. Not for open questions he should answer in his own words."
  2. Buttons Nibley's own code adds without Claude: Ask-first actions → `Yes | No`; style or layout suggestions → `Yes | No`; pause quizzes → `Hint | Skip`; the mini-interview → `Skip`.
  3. Overlay: show on item `{ kind: 'choices', options }` when the asking line starts speaking; `ipcRenderer.send('choice', text)` → main `handleText(text)`, exactly like speech. Log `{ ev: 'choice', text, how: 'click' | 'key' }`.
  4. Clicks: the overlay ignores the mouse except over the buttons: `setIgnoreMouseEvents(true, { forward: true })`, and toggle it from `mouseenter`/`mouseleave` on the button row.
  5. Keys: the overlay can't take focus (it would steal it from YouTube), so the C# helper grabs **Enter, Esc, 1, 2, 3 only while buttons are showing** (≤ 15 s), and lets go at once on any other key so typing is never blocked.
- **Test:** an Ask-first pause: click Yes → paused; Enter → paused; type a letter while buttons show → typing works and the buttons go away; 15 s → gone; clicks elsewhere still reach YouTube.
- **Done when:** 5/5 of each.

## 3. Stop rules for the local session
- Two attempts at a root cause with no evidence → stop, write what you saw in `BUILD-LOG.md`, ask Zarif.
- Never say "done" without the test output (numbers) in `BUILD-LOG.md`.
- A change that turns another scorecard line red is reverted, then reported.
- Usage limit hit → write the resume point in `BUILD-LOG.md` and stop.

## 4. Not in this plan
Note paper, chat, layouts, teaching styles, flashcards, quizzes, knowledge map. They wait for PRD v2 (Zarif's process: play back → his OK → PRD v2 → build). `TEACHING-BIBLE.md` and `LEARNING-ENGINE.md` are written so PRD v2 can be quick.

## 5. Open decisions for Zarif
1. ~~When Nibley starts explaining, should it pause the YouTube video and play it again after?~~ Answered 2026-11-05: yes, pause and resume (`docs/NEXT-ROUND.md` phase 1 step 8).
2. Teaching style: Nibley picks per question ("Auto"), or one fixed style that Nibley only suggests changing? (`TEACHING-BIBLE.md` section 3)
3. Learner data: in the vault (`Second Brain/nibley/learner.json`, backed up with his notes) or in the app folder?
4. If Edge is slow on the first line: stay silent a bit longer (up to 2 s) for the chosen voice, or start in Piper and switch to the chosen voice from line 2?
