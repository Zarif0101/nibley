# Setup for any AI subscription and any agent coder: Brainstorm / Discovery Notes
Date: 2026-11-08 · Goal: Zarif's cousin (has Antigravity) is the first outside user. Step-by-step setup that works for every kind of agent coder (Antigravity, Codex, Claude Code...), with instructions the agent itself can follow, so anyone with a subscription can use Nibley.
Status: interview done 2026-11-09; built (Gemini brain, feedback, setup.ps1, SETUP.md, AGENT-SETUP.md)
Context sources: `src/brain.js`, `src/memory.js` (Claude calls), `docs/BUILD-PLAN.md`, audit item #1 ("only runs on your PC")

## What Nibley needs today (from code, not asked)
- **Brain:** `claude.exe` (Claude Code) logged in with a Claude subscription. Every answer, recap, analysis and quiz goes through it (`brain.js` live answers, `memory.runClaude` side calls).
- **Speech-to-text:** a Groq API key (free) in `.env`.
- **Voices:** Edge voices (free, online) + Piper offline voice (~98 MB download into `piper/`, not in git).
- **Runs on:** Windows only (helper uses PowerShell + UI Automation), Node + Electron from `npm install`.
- No installer; started with `npm start` or `start-nibley.vbs`.

## Summary / key decisions
- Nibley's brain becomes swappable: Claude (Claude Code), Gemini (Google account, Gemini CLI), ChatGPT (Codex CLI). The cousin uses his own Google subscription; no Claude needed.

## Q&A log
### Q1 - Run on the user's own AI subscription?
- Asked: make the brain work with any subscription (Claude, Gemini, ChatGPT), or keep Claude-only with an install guide?
- Captured: "Yes, any subscription."
- Tentative / suggested: test Gemini CLI speed for voice answers before building (~1 day of work).
- Flags: Gemini CLI speed unknown -> Claude to spike

### Q2 - Cousin's computer
- Asked: Windows laptop or Mac?
- Captured: "pc not laptop".
- Taken as: a Windows desktop PC (Nibley's Windows code works). Desktop PCs often have no built-in microphone or camera, and may use a big or second monitor.
- Flags: confirm it runs Windows 10/11 -> Zarif (assumed yes, "PC")

### Q3 - Microphone
- Asked: does his PC have a mic (desktop PCs often don't)?
- Captured: "Yes, headset or mic."
- Decision: voice setup as normal. Setup guide includes a mic check step.

### Q4 - Voice-to-text (Groq) key
- Asked: he makes his own free Groq key, or Zarif shares his?
- Captured: "He makes his own."
- Decision: the guide walks him through groq.com signup (Google login, free, ~2 min) and pasting the key; his agent never creates accounts for him.

## Found (not asked)
- github.com/Zarif0101/nibley answers 200 without login: the repo is public, so his agent can clone it. `.env` (Groq key) is gitignored, not in the repo.
- On Zarif's PC: Claude Code 2.1.318 (logged in), Codex CLI 0.163.0 (not logged in), Gemini CLI not installed. Node 24, npm 11, git 2.54.
- Repo's `CLAUDE.md` is rules for building Nibley; a user's agent would read it too. Setup instructions must live in their own file, and CLAUDE.md should point setup agents there.

### Q5 - Install Gemini CLI on Zarif's PC for testing
- Captured: "Yes, install it." Installed @google/gemini-cli 0.67.0 (official google-gemini repo). Login with Google works (settings `security.auth.selectedType: oauth-personal`).

## Gemini spikes 2026-11-09 (facts)
- CLI start alone: 5.0 s on this PC, every run. One-word answer cold: 8.3 s.
- Kept running (`gemini --acp`, JSON-RPC, image prompts supported): first answer text after 8.5-11.3 s on gemini-3-flash-preview, arriving all at once (not streamed). Claude today: ~1.8 s to first text. gemini-2.5-flash: 503 "high demand" / error; gemini-2.5-flash-lite: "no longer available to new users".
- Cause (inferred): the CLI is a coding agent with its own large instructions + thinking; Nibley can't swap in its own system prompt over ACP.
- Not yet tested: Gemini through a free Google AI Studio API key (plain HTTPS, streaming, Nibley's own prompt). Expected much faster; needs a key.

### Q6 - Faster Gemini via a free API key, or the slow CLI way?
- Asked: test Gemini through a free AI Studio key (expected ~1-2 s) or use the Gemini CLI as is (8-11 s before each answer)?
- Captured: "Use the slow way."
- Decision: Gemini brain = `gemini --acp` kept running (Google login, no key). Set expectations in the guide and in Nibley: first words after ~10 s; the "Thinking" pill stays up meanwhile.
- Flags: none

### Q7 - ChatGPT (Codex) as a brain now?
- Captured: "Skip ChatGPT for now."
- Decision: brains = Claude + Gemini. ChatGPT later. The setup guide still works with any agent app (Antigravity, Codex, Claude Code, Cursor, Gemini CLI) doing the installing.

## Gemini brain built + quality eval 2026-11-09 (facts)
- `src/brain-gemini.js`: one `gemini --acp` process, Nibley's prompt as each session's first message; `once()` for side calls. Learner name now a setting (`prompt.build({name})`, learner prompt) instead of "Zarif".
- 30-question eval on Gemini (`NIBLEY_BRAIN=gemini node test/eval/run.js`, saved `test/out/gemini-eval-2026-11-08T18-20-14.json`): the 15 answered questions scored well (0.60-1.00, most 0.80-1.00; Claude's baseline 0.74-0.84 overall). First spoken line: median 17.6 s, worst 35 s.
- **Blocker:** after ~15 questions Google answered "You have exhausted your daily quota on this model" (free Google login, gemini-3-flash-preview). The other 15 failed. A free account gets roughly 15-20 Nibley questions a day on this model; recaps and analysis use the same quota.

### Q8 - Does the cousin pay for Google AI?
- Captured: "Yes, AI Pro or Ultra."
- Decision: Gemini brain stays as built; paid plans get much higher Gemini CLI limits than the free account that ran out here. Guide tells him to sign in with that same paid Google account.
- Flags: paid-plan limits not verified (Zarif's test account is free) -> confirmed only on the cousin's first day

## New request (2026-11-09, mid-build)
- "He's also going to report me as a user. He's going to give me user feedback. Make a way that he can send me user feedback. Ask me questions for any ideas you have." -> interview after the Gemini quota question.

### Q9 - Where feedback lands
- Asked: online list (Supabase table) or Zarif's email?
- Captured: "My email."
- Decision: a "Send feedback" button in the sidebar sends an email to Zarif with the message, auto-attached details (brain, app version, last errors) and an optional screenshot.
- Tentative (Claude): delivery through a free form-to-email service (FormSubmit: no key; one confirmation email the first time; then a random alias so his address never sits in the public repo). Not decided yet.

### Q10 - Which address
- Asked: send feedback to his Gmail address? (address kept out of the repo)
- Captured: "Yes, that one." (explicit OK to give this address to FormSubmit)
- Next: one activation email from FormSubmit to click; then swap the address in code for FormSubmit's random alias.

### Q11 - Quick ratings after answers
- Asked: add thumbs up/down after some answers, or only the Send feedback button?
- Captured: "Yes, add thumbs."
- Decision (Claude's suggested details, accepted with the yes): shown on at most 1 answer in 3, never on an answer that already has buttons; only "Not helpful" emails Zarif (question, answer, screenshot); "Helpful" is just counted. Buttons are words + drawn icons, no emoji (design rule).

## Plan (proposed, not yet OK'd)
1. Brain switch: Claude, Gemini or ChatGPT (Codex), picked in Settings. Speed-test each with a screenshot question first.
2. `SETUP.md` for people: what you need, ~6 steps, and one sentence to paste into any agent (Antigravity, Codex, Claude Code, Cursor, Gemini CLI).
3. `AGENT-SETUP.md` for agents: exact steps (check Windows, install Node/git, clone, npm install, Piper download with checksum, install + log in the chosen AI tool, Groq key into `.env`, first-run check, fixes for common problems). The person does the logins and pastes keys; the agent never asks for passwords.
4. Test it like a new user: fresh clone in an empty folder, follow AGENT-SETUP.md, start Nibley on each brain.

## Open flags (pending input)
