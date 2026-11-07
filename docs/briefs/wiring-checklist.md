# Wiring checklist (local session)

Date: 2026-11-04 · Built in the cloud, tested with `npm test` (180 pass) and `node library/check.js` (PASS), **not yet connected to the app**. Each line: what to connect, where, how to check it. Do them in QUALITY-PLAN order; stop rules there apply.

## Now (quality pass, v1 app)
| Blueprint | Module (ready) | Connect in | Check |
|---|---|---|---|
| T0 | `test/scorecard.js` | Add `log({ ev: 'line_voice', turn, i, src, synth_ms, wait_ms })` for every line (`voice:start` handler) and `feedback_ms` at `ptt_down` in `src/main.js`; log `{ ev: 'start', lint: true }` once T6 is wired | `node test/scorecard.js` prints all 10 rows; Q1 shows a real % after 5 turns |
| T4 | `src/commands.js` | `handleText` in `src/main.js`, next to "save this": `const c = matchCommand(text); if (c) return onCommand(c);` (again = replay last turn from memory; slower/faster/shorter/more = pace + re-voice; gotit/lost = learning signals later) | `test/commands.test.js`; by voice 5/5 |
| T6 | `src/lint.js` | `ask()`: `ctx.lint = createLint()`; `onCmd()`: `const r = ctx.lint.check(cmd); r.fixes.forEach((rule) => log({ ev: 'lint', rule, turn: ctx.id })); if (!r.cmd) return;` then use `r.cmd`; `r.fadeOldest` → `send('item', ctx.id, { kind: 'fade-oldest' })` + overlay handler | `test/lint.test.js`; e2e 10/10; scorecard Q9 |
| T2 | `src/overlay/subtitles.js` (look approved 2026-11-04, DESIGN.md "Subtitles") | `overlay.html`: `<script src="subtitles.js">` before overlay.js (or `require`); `overlay.js run()`: after `await h.started` → `subs.show(it.text, { top: inBottomQuarter(visibleMarks) })`, on `h.ended` → `subs.hideSoon()`, `stopAll()` → `subs.hide()` | `node test/sim/sim.js` (pictures) + real turn on lecture and dark video; scorecard Q4 |
| T9 | `test/eval/run.js` | Nothing to wire. Run `node test/eval/run.js --baseline` twice (uses ~60 Haiku questions) | Two `test/out/eval-*.json`; scorecard Q6 |
| T10 | `src/overlay/mascot-loop.js` + `src/overlay/mascot3d/*.webp` (only after T0-T9 green) | `overlay.js status()`: replace the pixel face with `mascotLoop(FACE[kind] || 'happy', 28)` | CPU < 3% while the pill animates; preview `design/mascot-3d/renders/mood-loops-preview.webp` |
| T12 | `src/overlay/pill-sequence.js`, `src/overlay/pill-motion.js` | see QUALITY-PLAN T12 (sequencer in `main.js`, motion in `overlay.js status()`); load as plain scripts before overlay.js | 20 presses, same order every time; `node test/sim/sim.js --pill <dir>` frames |
| T13 | `src/overlay/choices.js`, `choices` command in `src/script.js` | see QUALITY-PLAN T13 (prompt line, app-made buttons, `choice` IPC → `handleText`, mouse forwarding, helper key grab) | click / Enter / typing / timeout checks in T13 |

## Speed and tokens (`docs/SPEED-TOKEN-PLAN.md`, do P0 together with QUALITY-PLAN T0)
| Blueprint | Module (ready) | Connect in | Check |
|---|---|---|---|
| P0 | `test/scorecard.js` (Q11-Q13 + "where the time goes") | `src/brain.js onEvent` (`result`): `log({ ev: 'claude_usage', turn, image, input, cache_write, cache_read, output, cost, api_ms })` from the line's `usage`, `total_cost_usd`, `duration_api_ms` (check the real field names once); `src/main.js`: `timing.first_say` when the first say line is parsed | `node test/scorecard.js` shows Q11, Q12 and the time line |
| P1 | `src/screen.js` (`screenKey`, `sameScreen`) | `main.js ask()`: `key = screenKey(s.bmp, s.w)`; `brain.ask`: if this process's last sent key is the same screen, send no image and add "(Same screen as your last question.)"; reset on rotation | 10 follow-ups on a paused video: `image: false`, marks still on target |
| P2 | none | `src/brain.js`: `MAX_IDLE` 10 min → 4.5 min (try `MAX_TURNS` 8 → 6) | Q11 falls, Q2 no worse |

## After PRD v2 is OK (new behaviour)
| Feature | Module (ready) | Connect in | Check |
|---|---|---|---|
| Teaching styles | `src/styles.js` + `library/styles/*.md` | `src/prompt.js build()`: append `styles.section()` | eval must stay ≥ baseline − 0.02 |
| Per-question header | `src/learn/snapshot.js`, `kind.js`, `style.js`, `pace.js`, `analogies.js` | `ask()`: kind → `pickStyle` → `snapshot({ style, pace, topic, lib, model, worked, analogy })` prepended to the question text; record pick, then `landed()` from the signals in LEARNING-ENGINE section 2 | eval with styles vs without (`NIBLEY_EVAL_STYLES=0`) |
| Learning curve | `src/learn/curve.js` | after every `model.observe` → `addPoint` | week summary text on app start |
| Teach-back | `src/learn/teachback.js` + `library/teachback.json` | "let me explain it back" → record → `teachbackPrompt` (one Claude call) → `parseVerdicts` → `gradeTeachback` → `applyTeachback` + speak `feedbackScript` | `test/learn-teachback.test.js`; 3 real teach-backs |
| Analogy drawings | `library/assets/` (231 drawings) | needs a `draw <asset> <x> <y> [size]` script command + overlay renderer (PRD v2) | sim pictures |

## Where things came from
Plan and decisions: `brainstorms/2026-11-04-cloud-build-plan.md`. Build notes: `docs/BUILD-LOG.md` (2026-11-04 cloud build). Research: `research/2026-11-04-analogies-for-any-topic.md`.
