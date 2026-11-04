# Nibley build log

Newest at the bottom. A new session reads this to resume.

## 2026-10-28 session 1
- Read all docs. No `.env` file yet: Groq key missing (BUILD-PLAN 7: ask Zarif at STT step).
- Deps pinned: electron 44.7.1 (no 45.x is 2 weeks old yet: 45.0.0 came out 2026-10-21), msedge-tts 2.1.0, @fontsource/instrument-sans 5.3.0.
- Deviation: no `dotenv`. Node's built-in `process.loadEnvFile()` reads `.env` (one dependency fewer).
- Electron 44 downloads its binary on first run, not on `npm install`.
- DONE `src/script.js`, `src/gate.js` + unit tests (19 pass).
- DONE `src/platform/` (helper.ps1, windows.js, fake.js, index.js). Helper starts in ~2.0 s, ping 12 ms, UI Automation 9-335 ms.
  - Tested with simulated keys: Win+` gives one ptt_down/ptt_up (key repeat ignored), Start menu stays closed, Terminal quake stays closed, plain ` still types. Control runs without the helper proved Start and quake do open, so the check is real.
  - Deviation: menu-mask key is vk 0xE8 (AutoHotkey's current default), not 0xFF. Sent at ptt_down while Win is held.
  - Deviation: helper ignores only its own injected input (tagged with dwExtraInfo), not all injected input. Lets tests drive it with SendInput.
  - Deviation: stdin commands are plain text (`<id> <cmd> <args>`, text args base64), replies JSON lines. No JSON parser needed in C#.
- Brain probe (claude 2.1.303, stream-json): `init` arrives per turn, not at start; plugins = 3 built-ins only, tools = [], model claude-haiku-5-5. Interrupt control_request works (12 ms, context kept). First text 1.2-1.8 s after send (text only).
  - Found: Claude Code emits `post_turn_summary` ~3 s after message_stop, before `result` (an extra background call). A new message waits behind it. Plan B being tested: send interrupt, then the new question.
  - Usage limit hit once mid-build (session paused, then resumed).
- Fix for post_turn_summary: it only runs because this build session's own CLAUDE_CODE_* env vars leaked into the child. brain.js now spawns claude with all CLAUDE*/ANTHROPIC*/MCP_* vars removed. Result now lands 30-130 ms after the answer.
- DONE `src/brain.js`, `src/prompt.js`, `src/log.js`. Brain on fixtures (Haiku): CC step hit the button centre exactly (768,566); diagram got 3 marks on right parts; refusal works; follow-up understood.
  - First request of a fresh process was slow (5.2 s). Fix: silent warm-up message at process start. Now first text 1.25-1.5 s.
- Fixtures in `test/fixtures/` (lecture.png MIT 18.06, diagram.png 3B1B neural net, player.png 3B1B with controls) + boxes.json. Re-capture: `npx electron test/capture-fixtures.js`.
- Deviation: msedge-tts 2.1.1 (3 days old), not 2.1.0. 2.1.0 points at api.msedgeservices.com, which now answers 200 instead of a WebSocket (no voice at all). 2.1.1 uses speech.platform.bing.com and works.
- DONE `src/tts.js`: pre-opened Edge connections (refreshed on hotkey press) + a second request if no audio in 800 ms. Back-to-back sentences now 275-477 ms each (was 200 ms to 3.5 s, some failures).
- DONE `src/stt.js` (Groq). Error paths tested (no key, bad key). Real transcription NOT tested yet: `.env` missing.
- Deviation: Instrument Sans has no 800 weight (static files stop at 700). Step numbers use 700.
- DONE `src/memory.js` (tested on a scratch vault copy: dated lines, rule add/remove logged, undo restores both, learner run 7.4 s gave 2 lines + 1 rule + a question), `src/lessons.js`, `src/main.js`, `src/overlay/*`, `start-nibley.vbs`.
- Deviation: tray "Z" sits on a `paper` square. Zarif's taskbar is dark (SystemUsesLightTheme=0), so a bare black Z would be invisible. Still only DESIGN tokens.
- Deviation: lesson replay draws in the overlay itself (saved screenshot as background, Esc closes) instead of a separate viewer window. Same drawing code, less code.
- NEXT: first full launch, overlay checks (transparent, click-through, over full-screen YouTube, not in screenshots), unit tests for platform contract, e2e, idle CPU.
- Zarif, 2026-10-28 (mid-build): accent is blue. `ink` = #1F5BFF everywhere (DESIGN.md updated; settings.ink now actually drives overlay + lessons window). Highlighter swipe stays #FFB000 (it's the highlighter, not the accent).
- Zarif: name is Nibley. Tray letter "Z" (old DESIGN.md text) changed to "N". DESIGN.md updated.
- Groq key was in `.env.example`. Harness won't let the builder touch `.env`; asked Zarif to rename `.env.example` to `.env`.
- Fix: first real hotkey press hit a stale pre-opened Edge socket (no audio in 2.5 s) and the whole session fell back to Windows voices. Now sockets older than 10 s are replaced at each hotkey press, and the backup voice lasts one turn (whole session only after 3 failed turns).
- DONE test/e2e.js (fake platform, scratch vault). NEXT: run it.
- Zarif sent a brand board (pixel mascot, sky blues, Inter). Scope he picked: brand on Nibley's own UI + brand-blue pen marks. DESIGN.md rewritten (v2). Name stays Nibley (board's "explainly" treated as placeholder).
  - New: `src/overlay/mascot.js` (20x20 pixel mascot, 6 faces), status pill with mascot (listening/thinking/speaking/error), blue label chips, rounded step blocks, lessons window as cards, mascot tray + app icons.
  - Dependency change: + @fontsource/inter 5.3.0 (brand font), − @fontsource/instrument-sans.
  - Labels now avoid all marks and pick the calmest side of the screenshot (busy map from main.js).
- Groq key: Zarif keeps it in .env.example. App reads .env first, then .env.example (groqKey() in main.js). Key never printed or logged.
- PRD 8 measured (speech file -> Groq -> Claude -> first audio, no mic time): 5 samples worst 3.5 s, median 2.5 s, but most samples used the Windows backup voice. Edge throttles this IP after heavy testing (even a plain probe failed, then recovered).
  - tts.js simplified: one pre-opened connection, no hedge (the hedge opened extra connections exactly when Edge was slow). First sentence waits max 1.5 s for Edge, then Windows voice for that turn; Edge retried next turn; whole session on backup only after 3 failed turns.
  - TODO: re-measure PRD 8 with Edge healthy at the end of the session.
- STT accuracy: 0/50 word errors over 3 runs (one run 1/50). Groq median ~250 ms.
- Overlay checks on the real screen: transparent (pixels under it unchanged, not black), stays above a full-screen window, click-through works (clicked + typed into Notepad underneath; UI Automation sees Notepad's editor through it).
- FOUND: setContentProtection does NOT keep the overlay out of desktopCapturer here (ring visible in the screenshot, both runtime toggle and at creation). Fix (BUILD-PLAN 4.4 fallback): main.js captureClean() hides the overlay for the screenshot, then shows it. Verified: ring absent, overlay back. Cost: capture ~0.9 s, so the Listening pill appears ~0.9 s after the press (tray icon changes at once).
- desktopCapturer itself takes ~450 ms here (plan threshold 400 ms). Not switched to CopyFromScreen: it runs while Zarif is still talking, so it doesn't delay the answer.
- PRD 9 idle CPU: 0.76% of total CPU over 60 s (all Nibley processes: electron x5, claude x2, helper). RAM 867 MB working set (more than the 150-250 MB estimate; 2 warm Claude processes).
- Final e2e: 10/10 pass (PRD 1-8, 10 + STT accuracy). But Edge voice failed on most in-app turns, so PRD 8 numbers (1.3-1.4 s) mostly measure the Windows backup voice. With Edge working (earlier run): first turn 1.9 s.
  - Investigated: not idle sockets (fine up to 9 s), not punctuation (random), not Electron. Edge's free endpoint gets slow/throttled after ~1 h of heavy test traffic from this IP: same sentence 0.4 s one minute, 3 s or nothing the next. tts.js logs connect timing on each failure.
  - Known risk for daily use: if Edge throttles, answers start in the Windows voice (robotic) after 1.5 s.
- Code review (code-review skill, src/): fixed interview swallowing a real question, backup voice now retries Edge after 5 min, lessons path check uses path.relative, content-protection comment corrected. Skipped: card-number regex also blocks 13+ digit numbers (safe side), busyMap cost on main thread.
- STATUS: v1 built. All automated tests pass (23 unit, 10 e2e). Needs Zarif: real mic, real YouTube test 4, voice by feel.
- Voice options (Zarif dislikes the voice he heard: mostly the Windows backup). Groq Orpheus TTS (`canopylabs/orpheus-v1-english`) works on his key after he accepted terms: voices autumn, diana, hannah, austin, daniel, troy; first byte 230-370 ms, 2-sentence clip ~1.0-1.3 s, WAV. Free limits: 100 requests/day, 1200 tokens/min. Samples 12-17 added to test/voice-samples (served by `.claude/launch.json` "voice-samples", port 8777).
- Voice: Zarif keeps Edge voices (Groq Orpheus limit 100/day too low). Tray > Voice lists all 11 Edge voices; picking one saves it, reconnects, and says a sample line. tts.init now does a silent warm-up sentence (first Edge request of a fresh app was often silent). Test: 4 switches, all saved, 3 spoke in Edge, 1 backup (burst).
- Piper offline backup voice (Zarif OK'd download, 2026-10-28): rhasspy/piper 2023.11.14-2 `piper_windows_amd64.zip` (22.5 MB, size matches GitHub) + `en_US-lessac-medium` voice from huggingface rhasspy/piper-voices (63 MB, sha256 matches). Installed in `piper/` (gitignored, 98 MB). Reason for the new binary: Zarif hates the robotic Windows voice.
  - `src/piper.js`: one piper.exe kept running (`--json-input`), warm-up at start. Real-time factor 0.18; 0.13-0.7 s per sentence once loaded. Idle CPU 0, RAM 94 MB.
  - Voice order now: Edge -> Piper -> Windows. First sentence: Piper starts in parallel; Edge gets 1.2 s.
  - Tested in-app: Edge forced off -> first word 1.8 s in Piper; real Edge (throttled) -> Piper, first word 2.3 s. 25/25 unit tests (new piper.test.js checks order after a timeout).

## 2026-11-04 cloud session (brave-cori)
- Zarif sent the real brand board + 2 turnaround sheets (saved in `design/mascot-3d/reference/`). The app icon `app-256.png` is NOT the reference.
- DONE `design/mascot-3d/`: smooth 3D Nibley (8 blended shapes, face on the surface, 7 moods), viewer page, 8 turnaround + 7 mood renders, `nibley.glb`, `compare-reference.png`.
  - Checked: rendered colours measured against the board (face ≈ #8BD9FC, lower body ≈ #2B88FA); side-by-side compared on 5 views; page loads with no script errors (headless Chromium, SwiftShader).
  - Deviation: three.js 0.170.0 is used, but only in this design page (from jsDelivr) and in `render.js` (dev tool, `npm i --no-save`). Not an app dependency; package.json unchanged.
  - Not checked: on Zarif's laptop or a phone; real GPU speed (built in ~1.2 s here in software rendering).
- NEXT: quality plan + teaching bible (Zarif asked: quality first, small tweaks, 5 teacher styles, layouts, personalization plan, blueprints for the local session). Then, if wanted, mood sprite loops for the overlay.
