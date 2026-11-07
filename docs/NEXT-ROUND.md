# Nibley next round: interview capture + handoff plan
Date: 2026-11-05 · Goal: turn Zarif's wish list (3D character, sidebar, better marks, better voice, interface, resource gathering, leftovers) into a plan a new session can resume.
Status: interview complete (Q1-Q21). Plan approved by Zarif 2026-11-05. Phase 1 done (steps 0-5, 7, 8 on 2026-11-05; step 6 on 2026-11-08, 10/10 on real lecture frames; numbers in BUILD-LOG). Resume at phase 2 (sidebar shell, mockup first).
Raw capture: `Second Brain/brainstorms/2026-11-05-nibley-sidebar-voice-marks.md` · Project copy: `docs/NEXT-ROUND.md`
Context sources: docs/QUALITY-PLAN.md, docs/PRD-v2.md, docs/BUILD-LOG.md, docs/DESIGN.md

## Context
Zarif used Nibley and listed what bothers him: the flat 2D mascot, marks that pop in and look the same every time, pages that take over with no way back, only a tray menu for control, the backup robot voice, Nibley guessing the topic wrong, and long answers. He accepts a few seconds more wait for a better voice and better answers. This plan turns his 21 answers into 5 build phases a new session can run one by one. QUALITY-PLAN rule 0 ("no new features until the scorecard is green") is dropped (Q17).

## First steps once this plan is approved (this session)
1. Copy this file to `docs/NEXT-ROUND.md` (the new session reads it from there) and to `Second Brain/brainstorms/2026-11-05-nibley-sidebar-voice-marks.md`.
2. `docs/QUALITY-PLAN.md`: mark rule 0 dropped, open decision 1 answered (pause + resume), point to `docs/NEXT-ROUND.md`.
3. `docs/BUILD-LOG.md`: one NEXT line pointing to `docs/NEXT-ROUND.md` phase 1.
4. Vault: `me/style-lab.md` (liked: animated side-by-side mockups), one line in `logs/lessons.md`.
5. Pattern for `me/how-i-work.md` (suggest to Zarif): he picked every option in 9 of 10 multi-select questions. Next interviews: ask him to rank, or pick one, instead of multi-select.

## Build plan (order from Q17; each phase: build, test, log numbers in BUILD-LOG, then next)

### Phase 1: bugs + voice (about 2 sessions)
0. **Eval baseline first** (QUALITY-PLAN T9) on the fixtures, so the prompt and thinking changes below can be judged. Save `test/out/eval-<date>.json`.
1. **Voice audition.** Script plays one sentence in Andrew Multilingual, Ava Multilingual, Christopher, Jenny (existing `src/tts.js`) and Kokoro (only after Zarif OKs the download + security check). Space Edge requests out (burst throttle). Zarif picks by ear.
2. **Voice chain** in `src/main.js sayLine` (~168-203): chosen voice, then Christopher, then Piper, then Windows. First-line budget up to ~5 s (Zarif accepts the wait). Build streaming playback (SPEED-TOKEN-PLAN P7; `tts.js:47`, `overlay.js:253-257`).
   - Test: `test/turns.js 30 --switch 20`. Online: 0 Piper/Windows lines, chosen voice ≥ 95%. First word ≤ 5 s for 9 in 10.
3. **Thinking.** Find how `claude.exe` takes a thinking budget (`claude --help`, or the thinking env var in the `brain.js` spawn env). Haiku thinks for quick questions, ≤ ~3 s extra. Sonnet for whiteboard answers waits for the note paper (PRD-v2 phase 1, not built).
   - Test: eval score ≥ baseline; first word +≤ 3 s.
4. **Talks too long.** Wire `src/lint.js` (T6) into `onCmd` in `main.js`. Change the mark cap from 3 to 2 (Q8).
   - Test: lint unit tests; 20 turns, ≤ 5 say lines, ≤ 24 words each.
5. **Wrong topic: "Now studying" detector.**
   - Helper `fg` already returns the process name (ignored in `ear.js:44`). For `brave.exe`, read the address bar URL with UI Automation (the helper already does UIA lookups).
   - Add a `[Source: title | url | time]` line to every question. The YouTube extension already sends the video time.
   - PDFs open in Brave (`file:///…pdf` or a web PDF); add the page number if UIA exposes it.
   - Test: 3 sources (YouTube, a course site, a PDF) x 3 questions; the source line is right 9/9.
6. **Marks off target.** Run the aim test on 10 real YouTube lecture frames (gitignored, `test/out/aim-*`). Target ≥ 90% in the box (Q5).
7. **Site actions.** Open sites in Brave (`settings.apps`), always in a new tab, always ask first with `Yes | No` buttons (T13 code). The back button comes with the sidebar (phase 5).
8. **Pause + resume the video** while Nibley talks (Q19). Reuse the existing pause action path; resume on `turn_end`, not after a barge-in.

### Phase 2: sidebar shell (about 1-2 sessions)
- Get Zarif's OK on an animated mockup first (style lab), then add a "Sidebar" section to `docs/DESIGN.md` (existing tokens only).
- **Window:** new focusable `sidebarWin` in `src/main.js`, frameless, right edge, full work-area height.
  - Starts at 360 px. The left edge drags; the width is saved in `settings.json` (`sidebarWidth`).
  - Docked as a Windows AppBar so the browser shrinks. The C# helper does `SHAppBarMessage` with `getNativeWindowHandle()`, and unregisters on close and on quit.
- **Open/close, 4 ways:**
  - edge tab: a tiny window at the right edge, top, Nibley's face; it moves to the sidebar's left edge when open;
  - Win+Shift+` in `src/platform/helper.ps1`, next to the Win+` hook;
  - voice "open/close sidebar" in `handleText`, the same way as "show my lessons" (`main.js:316`);
  - `tray.on('click')`. Right-click keeps the menu.
- **Sections now:** Settings and Lessons.
  - Settings: model, voice with a play sample (reuse `setVoice` at `main.js:95-102`), actions mode, lecture listening.
  - Lessons: reuse `src/overlay/lessons.html`. Replay gets a visible Back button; Esc still works. Remove the separate `lessonsWin`.
- Test:
  - each open way works 5/5;
  - Brave shrinks and comes back (window rect from the helper);
  - the width survives a restart;
  - idle CPU < 5%; RAM is logged before and after (T8).

### Phase 3: new marks (about 1-2 sessions)
- **Mockup first, then DESIGN.md.** Animated mockup of the final set, Zarif OKs it, then rewrite the DESIGN.md Marks section.
- **Prompt + parser.** A mark takes a target box `x y w h` plus an optional kind: underline, outline, spotlight, ring. Files: `src/prompt.js` 13-36, `src/script.js` 40-53 (parse, clamp), new unit tests.
- **Draw** (`src/overlay/overlay.js` `draw()` ~132-173): add a rounded outline, a spotlight (dim mask), and an underline. The ring gets a seeded random start angle and size.
- **Auto-pick when Claude gives no kind:**
  - thin wide box: underline;
  - small box: ring;
  - box over 25% of the screen: spotlight;
  - anything else: outline.
- **Arrival:**
  - a dot glides from Nibley (bottom-centre, ~500 ms), then the mark draws;
  - the mark starts ~300 ms after its say line begins; the prompt asks Claude to name the target in that line;
  - at most 2 marks on screen; the oldest fades first.
- **Dismiss:** a click on a mark clears all marks (reuse the T13 mouse forwarding over the marks' boxes). Esc only if the live test shows it doesn't break YouTube full screen.
- Test:
  - aim ≥ 90% on the fixtures and the real frames;
  - one screenshot of each kind on `test/fixtures/lecture.png` and `player.png`;
  - never more than 2 marks over 20 turns.

### Phase 4: 3D Nibley (about 1 session)
- Wire `src/overlay/mascot-loop.js` into `overlay.js status()` (`docs/briefs/wiring-checklist.md:13`). Map `FACE` to the 7 loop moods in `src/overlay/mascot3d/`.
- Bigger Nibley (72-96 px) at bottom-centre while he talks; the marks' glide starts from him. The same loops go on the sidebar header and the edge tab.
- Show an animated mockup: pill + big Nibley vs. merged into one. Zarif picks.
- Test: CPU < 3% while animating (T10); looks right on the white and dark fixtures.

### Phase 5: rest of the sidebar (about 2 sessions, order from Q6)
1. Now studying card (the phase 1 detector) + the actions Back button.
2. Today's questions (answer text; click shows its marks again) + Auto notes (timestamp; click jumps the video; saved under `Second Brain/nibley/notes/`).
3. Type to ask (goes to `handleText`), Again/slower (T4 module), Quick asks ("Simpler, please", "Quiz me", "Give an example", each goes to `handleText`).
4. Study timer (1-2 recall questions at the break) + Progress today (plain numbers).

### Still left from before (not in the phases above)
- T3 instant tick on press, T5 stop check, T7 crash/limit recovery, T8 memory diet (do it before phase 2 adds windows).
- Primary screen only; e2e PRD test 4 (auto pause) failed once; PRD-v2 note paper and chat are not built (the Sonnet whiteboard answers need them); `src/learn/` modules are not wired.

## Verification (every phase)
- Unit suite + `node test/e2e.js` + `node test/scorecard.js`, with before/after numbers in `docs/BUILD-LOG.md`.
- Live checks only with the test page in front, and real keys via keybd_event (memory: live-input-tests). Space Edge voice tests out.
- Summary to Zarif: what was tested + the result, what was not checked, his next decision.

## Zarif's wish list (raw, 2026-11-05)
1. Swap the 2D character for the 3D one.
2. "There are many bugs, so I want Nibley to somehow figure out how to gather the resources the user is learning from." (meaning to confirm)
3. Sidebar instead of pages forced on him; he can't go back now. Top right or similar, open/close. Holds control panel, notes, everything. Contents decided later.
4. Marks: the circle is repetitive, appears out of nowhere, irritating, same every time. Squares are bad. They look hand-drawn.
5. Voice: OK to spend a few more seconds for the best voice and output. "2, 3 seconds of thinking, more than that if we come to the board."
6. Interface beyond the tray: notes, teaching stuff, settings, more later. Wants 5-10 ideas.
7. What is left behind? He will resume in a new session.

## What exists today (from code, 2026-11-05)
- Windows: only 2. `overlay` (full screen, click-through, `src/main.js:55-68`) and `lessonsWin` (980x640 framed, `src/overlay/lessons.html`, `main.js:448-453`). Lesson replay takes over the whole screen; only Esc or the hotkey exits (`overlay.js:369`, `main.js:471-477`). No back/close button.
- Tray (`main.js:104-117`): Model, Voice (11 Edge), Actions mode, Listen to lecture sound, Lessons, Undo rule change, Open log folder, Quit. No settings window.
- Character: 2D pixel mascot in use (`src/overlay/mascot.js`, pill face `overlay.js:408`). 3D: `design/mascot-3d/nibley.glb` + pre-rendered loops `src/overlay/mascot3d/<mood>.webp` (7 moods, 30 frames, 128 px) + player `src/overlay/mascot-loop.js`. Not wired. Swap point: `overlay.js status()` (`docs/briefs/wiring-checklist.md:13`).
- Marks: hand-made SVG in `overlay.js` (ring 89-99, arrow 101-110, tick 112-115, highlight swipe 117-128). DESIGN.md asks for this hand-drawn look (lines 36-38). Ring always starts at 10 o'clock, same form each time. No box type; the "square" is the yellow highlight swipe. Marks pop in at the target with no lead-in.
- What Nibley knows about the source: screenshot + foreground window title (`ear.js:44`, process name ignored) + last 2 min of lecture sound + YouTube extension (YouTube watch pages only: title, time, transcript). No URL, no PDF name, no source list.
- Voice: Edge Christopher (picked for speed). Newer Edge voices (Andrew/Ava Multilingual) sound better but take 1.5-8.2 s in Edge slow periods (BUILD-LOG 194). Audio waits for the full sentence before playing (0.1-1.5 s per line, P7 not built). First word now ~1.9 s median.
- Brain: Haiku, no thinking flag, two warm processes. Sonnet only by tray switch (Sonnet 6.8 s vs Haiku 4.4 s per turn in aim test).
- Left behind (QUALITY-PLAN): T0, T1, T12, T13 done. T2 subtitles built (uncommitted test changes: `test/scorecard.js`, `test/subtitle-check.js`, `test/out/subtitle-results.json`). Not wired: T4 again/slower, T6 answer guard (`src/lint.js`), T9 eval, T10 3D mascot. Not started: T3, T5, T7, T8. PRD-v2 phase 1 not built: universal transcript is built (ear.js) but note paper, chat not built. Open: e2e PRD test 4 (auto pause) failed once; "open YouTube" opens Chrome not Brave; primary screen only.

## Summary / key decisions
- Resources = "Know what I study": Nibley detects the current source by itself (video title, link, time, PDF name). Not a saved library, not web search (Q1).
- All four surfaces feel forced: lesson replay, Lessons window, browser pages from actions, marks with no dismiss (Q2).
- Sidebar docks right and pushes the video (AppBar), nothing covered (Q3).
- Open/close: edge tab + second hotkey + voice + tray left-click (Q4).
- Sidebar sections: all 10 ideas picked (Q5).
- Build order: shell + settings + lessons, then Now studying, then notes + questions, then ask tools, then timer + progress (Q6).
- Marks: mix of B outline, C spotlight, D underline, A ring (varied), picked by target type (Q7).
- Mark arrival: glide from Nibley, words first, max 1-2 at once, Esc/click to clear (Q8).
- 3D Nibley everywhere: pill, bigger on screen while talking, sidebar + edge tab. Pre-rendered loops, no live 3D (Q9).
- Voice: audition 5 voices (Andrew, Ava, Christopher, Jenny, Kokoro), Zarif picks by ear (Q10).
- Thinking: Haiku + up to ~3 s thinking for quick questions; Sonnet for whiteboard explanations (Q11).
- Sources to detect: YouTube in Brave, other Brave sites, PDFs (Q12). PDFs also open in Brave, so one Brave detector covers all (Q13).
- Bugs to fix: wrong topic, marks off target, talks too long, robot voice (Q14).
- Site actions: new tab only, always ask first, sidebar back button (Q15), in Brave (Q16).
- Order: bugs + voice -> sidebar shell -> marks -> 3D Nibley -> rest of sidebar. Old rule 0 dropped (Q17).
- Sidebar width: drag to resize, start 360 px, remembered (Q18).
- Video pauses when Nibley talks, resumes after (Q19).

## Q&A log
### Q1 - What "gather the resources" means
- Asked: what should Nibley do with the resources he learns from?
- Captured: "Know what I study" only. Nibley reads the video title, link, time, or PDF name on its own so it stops guessing from screenshots.
- Not picked: source list, finding more material, reading the full source.

### Q2 - Which pages feel forced
- Asked: which page is forced on you, with no way back?
- Captured: all four. Lesson replay (full screen, Esc only), Lessons window, browser pages Nibley opens through actions, marks covering the screen with no dismiss.
- Meaning for the plan: everything Nibley shows must have a visible way out, and the sidebar replaces the full-screen replay and the separate Lessons window.

### Q3 - How the sidebar sits next to the video
- Asked: push the video or float over it?
- Captured: push the video. Sidebar docks on the right edge; Windows shrinks the browser so nothing is covered; closing gives the space back.
- Tech note (assistant): Windows "AppBar" (`SHAppBarMessage`) reserves the strip. The C# helper can register the Electron window's handle (`getNativeWindowHandle()`). Limit: a video in true full screen (F11 / YouTube full screen) ignores AppBars.

### Q4 - How to open and close the sidebar
- Asked: which ways to open/close?
- Captured: all four. Edge tab (thin, always visible, Nibley's face, right edge top), a second hotkey (suggested Win+Shift+`), voice ("open/close sidebar"), left-click on the tray icon (right-click keeps the menu).
- Flag: exact second hotkey not confirmed -> Zarif (default Win+Shift+` unless he says otherwise).

### Q5 - Sidebar sections (assistant gave 10 ideas)
- Asked: which sections go in the first version? (3 groups)
- Captured: all 10 picked.
  - Core: Now studying, Settings, Lessons (inside the sidebar with a back arrow), Type to ask.
  - Learning: Auto notes (timestamped, click jumps the video, saved to vault), Today's questions (text of each answer, click to see marks again), Again / slower buttons, Quick asks ("Simpler, please", "Quiz me", "Give an example").
  - Extras: Study timer (break = 1-2 recall questions), Progress today (plain numbers, no badges).

### Q6 - Build order for the sidebar
- Asked: which order?
- Captured: shell first. 1) Sidebar + open/close + Settings + Lessons moved in. 2) Now studying. 3) Today's questions + Auto notes. 4) Type to ask + Again/slower + Quick asks. 5) Timer + Progress.

### Q7 - Mark styles
- Asked (with a 4-panel mockup: A today's ring, B clean outline with glide-in dot, C spotlight, D underline): which styles replace the ring and swipe?
- Captured: all four. B clean outline, C spotlight, D underline, and keep A (hand-drawn ring) but vary it.
- Meaning for the plan (assistant): a mix, picked by what the target is, so it is not the same every time. Suggested rule: text line or formula -> D underline; word group or object -> B outline; "look at this whole area" -> C spotlight; A ring kept as one option with varied start angle and size. Needs Claude to send a target box (x, y, w, h), not only a centre + radius.
- Flag: style-lab mockup format (side-by-side animated panels) used; Zarif didn't say keep or drop -> ask at the end.

### Q8 - How a mark arrives
- Asked: how should a mark arrive instead of popping in?
- Captured: all four. Glide from Nibley (dot travels from Nibley to the target, then the mark draws); words first (Nibley names the thing a beat before the mark); one at a time (max 1-2 marks, the old one fades first); easy dismiss (Esc or a click on a mark clears all).
- Tech risk (assistant): the overlay can't take keys. Esc needs the helper key grab (as T13) while marks show, but Esc also exits YouTube full screen. Click-on-mark can reuse the T13 mouse forwarding. Decide Esc grab vs click-only in the build session after a live test.

### Q9 - Where the 3D Nibley lives
- Asked: pill, bigger on screen, or sidebar?
- Captured: all three. In the status pill (small), bigger on screen (~72-96 px, bottom-centre while he talks, marks glide out of him, hidden when idle), and in the sidebar header + edge tab.
- Suggested (assistant, unconfirmed): pill and big Nibley both sit bottom-centre, so merge them: big Nibley with the state word next to him replaces the pill. Assets: pre-rendered loops exist at 128 px, 30 frames, 7 moods (`src/overlay/mascot3d/`), player `src/overlay/mascot-loop.js`. No live 3D (2-core laptop).
- Flag: tray icon at 16 px stays pixel art (DESIGN.md rule) unless Zarif says otherwise.

### Q10 - How to pick the better voice
- Asked: how to pick the voice now that a few seconds of wait is OK?
- Captured: audition first. Build session plays one sentence in 5 voices (Edge Andrew Multilingual, Ava Multilingual, Christopher, Jenny, and Kokoro local) and Zarif picks by ear.
- Suggested (assistant): backup chain chosen voice -> Christopher (fast classic Edge) -> Piper, so slow Edge minutes don't drop straight to Piper. Build streaming playback (SPEED-TOKEN-PLAN P7) to win back 0.1-1.5 s per line. Kokoro needs a speed test on the i5-6200U first, as a separate exe like Piper (no native npm modules).

### Q11 - Thinking time and "the board"
- Asked: is "the board" the whiteboard/note paper, and how should extra thinking work?
- Captured: yes, board = whiteboard/note paper. Quick questions: Haiku with thinking on, up to ~3 s more. Whiteboard explanations: Sonnet, thinks longer.
- Dependency: the note paper/whiteboard is not built yet (PRD-v2 phase 1). Until then only the Haiku+thinking part applies.
- Flag (build session): check how `claude.exe` takes a thinking budget (`claude --help`; SPEED-TOKEN-PLAN P5). Today no flag is passed; logs show 0 thinking tokens on 113 of ~178 answers.

### Q12 - Where he studies from
- Asked: which sources must "Now studying" read?
- Captured: YouTube in Brave, other sites in Brave, PDFs. Not local videos.
- Tech note (assistant): Brave URL via UI Automation on the address bar (helper already does UIA); YouTube extension already sends title/time. Process name from the helper's `fg` is ignored today (`ear.js:44`).

### Q13 - PDF app
- Captured: Brave. So all three sources live in Brave: one detector (Brave tab title + URL) covers YouTube, sites and PDFs (`file:///...pdf` or web PDF).

### Q14 - Bugs that hit most
- Captured: all four. Wrong topic, marks off target (real lectures), talks too long, robot voice still shows up.
- Mapping to fixes (assistant):
  - Wrong topic -> "Now studying" detector feeds the source (title, URL, video time) into every question.
  - Marks off target -> aim test on real YouTube frames (Q5 untested there) + target box (x, y, w, h) from Claude for the new mark styles.
  - Talks too long -> wire T6 answer guard (`src/lint.js` exists, not wired).
  - Robot voice -> backup chain chosen voice -> Christopher -> Piper; log every fallback.

### Q15 - Actions that open sites
- Captured: new tab only (never replace his page), always ask first (Yes/No buttons before opening anything), back button in the sidebar ("Back to <page>", one click).
- Not picked: "Brave, not Chrome". Resolved in Q16.

### Q16 - Browser for actions
- Captured: Brave. Actions open sites in Brave (fix `settings.apps`, which lists only chrome and notepad).

### Q17 - Overall order, and the old "no new features" rule
- Captured: bugs + voice first. 1) Fix the 4 bugs + voice audition. 2) Sidebar shell. 3) New marks. 4) 3D Nibley. 5) Rest of the sidebar. QUALITY-PLAN rule 0 ("no new feature until scorecard green 3 sessions") is dropped.

### Q18 - Sidebar width
- Captured: drag to resize. Starts at 360 px, drag the left edge, width is remembered. Look follows DESIGN.md tokens.

### Q19 - Pause the video while explaining (QUALITY-PLAN open decision 1)
- Captured: pause + resume. Video pauses when Nibley starts talking, plays again when he is done.

### Q20 - Style lab: animated side-by-side mockup
- Captured: "Yes, keep it". Use animated side-by-side mockups for visual choices. Log as liked in `me/style-lab.md`.

### Q21 - Anything else
- Captured: "Nothing more". The pill + big Nibley merge stays an open flag (show a mockup in phase 4).

## Open flags (pending input)
- Second sidebar hotkey: default Win+Shift+` unless Zarif says otherwise -> Zarif.
- Merge the pill and the big 3D Nibley into one? -> Zarif, with an animated mockup in phase 4.
- Tray icon stays 16 px pixel art (DESIGN.md) -> Zarif, if he wants it 3D too.
- Esc to clear marks vs YouTube full screen (Esc exits it) -> live test in phase 3, then Zarif.
- ~~Kokoro download~~ Zarif said no (2026-11-05): Christopher kept, chain Christopher -> Piper -> Windows.
- ~~Uncommitted test changes~~ read and run 2026-11-05 (subtitle check 10/10, scorecard reads them); commit with phase 1.
- QUALITY-PLAN open decisions 2 (teaching style Auto vs fixed) and 3 (learner data in vault vs app) still open -> Zarif, before PRD-v2 phase 2.
