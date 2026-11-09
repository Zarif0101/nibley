# Set up Nibley

Nibley is a voice study buddy for Windows. Hold **Win + `** (the key left of 1), ask about anything on your screen, and it explains out loud and points at things.

## What you need
- A Windows 10 or 11 PC with internet
- A microphone (headset, webcam mic or desk mic) and speakers or headphones
- One AI subscription: **Claude** (Pro or Max) or **Google AI Pro / Ultra** (Gemini). The free Google tier runs out after about 15 questions a day.
- About 15 minutes

## The easy way: let your AI coding app do it
Open your agent (Antigravity, Codex, Claude Code, Cursor, Gemini CLI, or similar) and paste this:

> Set up Nibley for me on this PC. Follow the instructions in https://github.com/Zarif0101/nibley/blob/main/AGENT-SETUP.md step by step. Ask me one question at a time. Don't ask me for passwords or keys in chat.

Your agent installs everything. You only do 2 things yourself:
1. **Sign in** to Claude or Google when a browser window opens.
2. **Get a free Groq key** (it turns your voice into text) and paste it into a file the agent opens for you in Notepad.

## The manual way
1. Install [Node.js LTS](https://nodejs.org) and [Git](https://git-scm.com/download/win).
2. Open PowerShell and run:
   ```
   git clone https://github.com/Zarif0101/nibley.git "$env:USERPROFILE\Nibley"
   cd "$env:USERPROFILE\Nibley"
   powershell -ExecutionPolicy Bypass -File setup.ps1 -Name YourFirstName -Brain gemini
   ```
   Use `-Brain claude` if you have Claude instead of Google AI.
3. Do what the **TODO** lines say, then run the last command again until it says **READY**.

## Using it
- Start: double-click **Nibley** on your desktop. A small Nibley tab appears on the right edge of the screen.
- Ask: hold **Win + `**, talk, let go. With Gemini the answer starts after about 10 seconds; with Claude about 2.
- Study: open a YouTube lecture in Brave, Chrome or Edge, open the sidebar (click the tab) and press **Analyze this video**.
- Problems or ideas: click **Feedback** at the top of the sidebar. It goes straight to Nibley's maker.
- Updates: Nibley updates itself when a new version is out, restarts once and tells you what's new. Nothing to do.
