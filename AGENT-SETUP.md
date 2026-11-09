# Nibley setup: instructions for AI coding agents

You are helping a person install **Nibley** (a Windows voice study buddy) on their own PC so they can use it. You are not developing Nibley: don't change its code. (Developer rules are in CLAUDE.md; ignore them for this job.)

## Rules
- Ask the person **one question at a time**, in plain words. Many users are students, not programmers.
- **Never ask for a password, API key or sign-in code in chat.** Sign-ins happen in their browser; the Groq key goes into a file they paste it into themselves.
- Use **PowerShell** on Windows. Run commands yourself when your app allows it; otherwise show the exact command and ask them to run it.
- `setup.ps1` does the real work and is safe to run again. Trust its `OK` / `TODO` lines; relay each TODO in plain words.

## Steps
1. **Check the PC.** Windows 10 or 11 is required. If it's a Mac or Linux, stop and tell them Nibley is Windows-only for now.
2. **Ask 2 questions, one at a time:**
   - "What's your first name?" (Nibley uses it.)
   - "Which AI subscription do you have: Claude, or Google AI Pro/Ultra (Gemini)?" Claude answers in ~2 s; Gemini in ~10 s. If they have neither, say Nibley needs one of them and stop.
3. **Get Git and Node.js** if missing (`git --version`, `node --version`; Node must be 22 or newer):
   `winget install --id Git.Git -e` and `winget install --id OpenJS.NodeJS.LTS -e`. After installing, open a new terminal so PATH updates.
4. **Download Nibley:**
   `git clone https://github.com/Zarif0101/nibley.git "$env:USERPROFILE\Nibley"`
   (If it already exists: `cd "$env:USERPROFILE\Nibley"; git pull`.)
5. **Run setup** from that folder, with their answers:
   `powershell -ExecutionPolicy Bypass -File setup.ps1 -Name <FirstName> -Brain <claude|gemini>`
   It installs app files, downloads the offline voice (checked by SHA-256), saves settings, sets up the AI tool, makes a desktop shortcut and runs the unit tests. Allow its network access (npm, github.com, huggingface.co, Google).
6. **Walk them through each TODO**, then run step 5 again. Usual TODOs:
   - **Gemini sign-in:** they open a new terminal, run `gemini`, pick "Login with Google", sign in with the account that has Google AI Pro/Ultra, then close it.
   - **Claude:** they install Claude Code (`irm https://claude.ai/install.ps1 | iex`), run `claude` once and sign in.
   - **Groq key (free):** they go to https://console.groq.com/keys, sign in (Google works), click "Create API Key", copy it. Run `notepad "$env:USERPROFILE\Nibley\.env"` for them; they paste the key after `GROQ_API_KEY=` and save. Never read the key back or print `.env`.
7. **Done when setup prints `READY`.** Tell them:
   - Double-click **Nibley** on the desktop. The first time, Windows may ask for microphone access: allow it (Settings > Privacy > Microphone > "Let desktop apps access your microphone" must be on).
   - Hold **Win + `** (key left of 1), ask a question, let go.
   - **Feedback** at the top of the sidebar sends problems straight to Nibley's maker.
   - Nibley updates itself to each new release. Keep the folder where it is, and don't edit files in it (that would block updates).

## If something goes wrong
| What they see | What to do |
|---|---|
| `npm` or `node` not found | Install Node.js LTS (step 3), open a new terminal |
| "Electron did not download" | Check internet / firewall, run setup again |
| "Checksum mismatch" | A download was damaged or changed; run setup again; if it repeats, stop and send feedback |
| Gemini: "high demand" / "quota" | Google is busy or the daily limit is used up; it works again later. Free accounts get ~15 questions a day |
| Nibley says it can't use the microphone | Windows Settings > Privacy > Microphone: allow desktop apps |
| Nibley "didn't catch that" every time | Wrong or missing Groq key in `.env`: redo the Groq TODO |
| Answers are slow with Gemini | Normal: ~10 s before it starts talking |
| Anything else | Have them click **Feedback** in Nibley and describe it; logs are attached automatically |

## Notes per agent app
- **Antigravity:** run the commands in its terminal; approve each command when it asks. Browser sign-ins open in their normal browser.
- **Codex:** allow network access for the commands (setup downloads files); approve when asked.
- **Claude Code / Cursor / Gemini CLI:** run commands in the integrated terminal; same steps.
