# Nibley: Architecture v1

Date: 2026-10-28 · Status: draft for Zarif's OK · Follows `PRD.md` (approved)

## 1. Measured on Zarif's laptop (2026-10-28)
Spike: `claude -p` (Claude Code 2.1.303) on Haiku, one process kept running, real 1366x768 screenshot sent as an image.

| Step | Time |
|---|---|
| Start Claude Code process (once, at app start) | 2.6 s |
| First word, text only, warm | ~0.7 s |
| First word, with screenshot, warm | 0.7-0.9 s |
| Pointing test: centre of a window title | off by ~13 px |

- Isolation flags work: only Claude Code's built-in plugins load. Zarif's own plugins, hooks, MCP servers and CLAUDE.md stay out.
- The `result` line arrives ~2 s after the last word. Speak from the streamed words, never wait for `result`.
- Zarif is on the **Pro** plan. The 5-hour limit was at 68% during the spike. Heavy study sessions can hit it.

## 2. Stack
**Electron + Node, one process tree.** Why: one language covers the see-through overlay, mic recording, screenshots, SVG drawing, audio playback and running Claude Code. Rejected: Tauri (Rust builds take very long on 2 cores), Python (no good see-through overlay with smooth drawing), WinUI/.NET (more code for the same result).
Cost: ~150-250 MB RAM. Fine on 8 GB.

## 3. Parts
```
hotkey (Win+`) ──> recorder ──> STT ──┐
screenshot (on release) ──────────────┼──> brain (claude -p, warm) ──> script stream
memory (vault nibley/*.md) ────────────┘                                   │
                       ┌──────────────── parser ◄────────────────────────┘
                       ├──> voice (TTS, sentence by sentence)
                       ├──> overlay (SVG marks, timed to the voice)
                       ├──> actions (ask-first / auto, hard limits)
                       └──> lessons (save / replay)
learner (after 5 min idle) ──> nibley/learning.md, rules.md, changelog.md
```

| Part | Choice | Notes |
|---|---|---|
| Hotkey | `uiohook-napi` for key down/up of `Win`+`` ` `` | Must swallow the combo so Start menu and Windows Terminal don't react. If uiohook can't swallow it, fallback: tiny C# helper with a low-level keyboard hook. Proven in milestone 0. |
| Recorder | Mic in the overlay window (`MediaRecorder`, webm/opus) | No CPU-heavy work on the laptop. |
| STT | Groq free Whisper (`whisper-large-v3-turbo`); fallback Windows online speech | Both behind one function `transcribe(audio) -> text`. |
| Screenshot | Electron `desktopCapturer`, native 1366x768 PNG | No resizing, so Claude's x,y map 1:1 to the screen. |
| Brain | One warm `claude -p` process | Flags: `--model haiku\|sonnet --setting-sources "" --strict-mcp-config --tools "" --disable-slash-commands --no-session-persistence --system-prompt-file <built> --input-format stream-json --output-format stream-json --verbose --include-partial-messages`. Started at app launch. Restarted on model switch or crash. No tools: Claude only writes the script; Nibley's code does every action. |
| Script format | Line-based commands, streamed (section 4) | Not JavaScript. Model output never runs as code. |
| Voice | `msedge-tts` (Edge online voices), fallback Chromium `speechSynthesis` (Windows voices, offline) | Starts on the first full `say` line. |
| Overlay | Full-screen see-through window: always on top, clicks pass through, never takes focus | Marks drawn as SVG with a draw-on animation. One ink colour + soft glow, pills for labels, numbered badges for steps (HeyClicky's look, simplified). |
| Actions | One long-running PowerShell helper using `SendInput` | Click, type, scroll, media play/pause, open app/URL. No native builds. |
| Memory | Vault folder `Second Brain/nibley/` | `about-me.md`, `learning.md`, `rules.md` go into the system prompt at process start. Kept under ~2k words total. |
| Learner | One-shot `claude -p` (Haiku) after 5 min idle | Reads that session's turns and returns: new `learning.md` lines and proposed `rules.md` edits. Nibley writes them and logs each rule change in `changelog.md`. |
| Lessons | `nibley/lessons/<date>-<slug>/` with `shot.png`, `script.txt`, `meta.json` | Replay = the same parser + voice + overlay on the saved screenshot. No Claude call. |

## 4. Script format (what Claude writes)
One command per line. Coordinates are screenshot pixels. Nibley's parser runs each line as it streams in.
```
say Think of voltage like water pressure in a pipe.
ring 640 360 40 | voltage
arrow 500 300 -> 640 360
say This arrow shows where the current flows.
highlight 420 200 300 60
step 1 1210 690 | Click CC
wait_click 1210 690
action click 1210 690
action key media_play_pause
title Ohm's law from the lecture
```
- Commands: `say`, `point`, `ring`, `arrow`, `highlight`, `label`, `step`, `wait_click`, `action`, `title`, `clear`.
- Unknown or broken line: skipped and logged, never fatal.
- Marks between two `say` lines appear while the first one is spoken.
- `action` lines go through the safety gate: Ask-first asks out loud and waits for "yes"; hard limits are checked in code, not only in the prompt (password fields, delete keys, send buttons).

## 5. Speech-to-text: **Groq chosen** (Zarif, 2026-10-28). Windows online speech = fallback.
Key lives in `nibley/.env` as `GROQ_API_KEY` (Zarif pastes it; never committed).

| | Groq free Whisper | Windows online speech |
|---|---|---|
| Accuracy | High | OK, worse with accents |
| Speed | ~0.3-0.6 s after release | Streams while you talk |
| Setup | Free Groq account; you paste the key into `.env` yourself | Turn on "Online speech recognition" in Windows privacy settings |
| Build effort | Small (one web request) | Larger (Windows speech API from Node needs a helper) |
| Bangla later | Yes | Weak |

PRD 4.1 updated to match.

## 6. Latency budget (target: first word within 3 s, limit 5 s)
Release hotkey → STT 0.5 s → Claude first words 0.9 s → first full `say` line ~0.6 s → TTS first audio ~0.5 s ≈ **2.5 s**. The STT and TTS times are estimates until milestone 1 measures them.

## 7. Build order
Superseded 2026-10-28: Zarif wants one build session, not phases. Follow `BUILD-PLAN.md` section 6. The list below is kept for reference only.
0. **Spike:** hold `Win`+`` ` `` with swallowing; record + STT. Test: 10 phrases, count mistakes, time it.
1. **Talk loop:** hotkey → STT → screenshot → Claude → voice. Test: PRD test 6 + timing log (PRD test 8).
2. **Overlay + script parser.** Test: PRD tests 1 and 3.
3. **Steps + actions + safety gate + tray switches.** Test: PRD tests 2, 4, 5.
4. **Memory + learner.** Test: PRD test 7.
5. **Lessons.** Test: PRD test 10.
6. **Full acceptance run** of PRD tests 1-10 + idle CPU (test 9).

## 8. Risks
- **Pro plan limits:** every question sends a ~1,400-token screenshot. Zarif accepts the usage on Haiku (2026-10-28). If it gets serious, his plan: buy OpenRouter credits and use a cheaper model. So the brain stays behind one function `ask(screenshot, text) -> script stream`, swappable later. Smaller fix first: send a crop around the mouse for follow-ups.
- **Hotkey swallowing** may need the C# helper (milestone 0 decides).
- **Subscription terms:** Nibley runs the official Claude Code app on Zarif's own machine with his own login. Zarif still reads Anthropic's current terms before daily use.
- **Edge voices** use an unofficial endpoint and may break. Windows voices are the automatic fallback.
