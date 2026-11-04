# Nibley: Switching Plan (Windows to Linux Mint)

Use this **only if** Zarif moves the laptop to Linux. Not part of v1. Written 2026-10-28.

## 1. Before wiping Windows (Zarif, ~15 min)
1. Copy to a USB drive or cloud: the `Second Brain` folder and the `Nibley` folder (including `.env`; it holds the Groq key).
2. Write down which Claude account you sign in with.
3. Check Nibley's `settings.json` for anything you changed (voice, ink colour).

## 2. Install (Zarif, ~1 hour)
1. Install **Linux Mint, Cinnamon edition**. Keep the default X11 session. Not Ubuntu or Fedora: they use Wayland, which blocks hold-to-talk, auto-clicks and silent screenshots.
2. Open Terminal and run:
   `sudo apt install xdotool python3-xlib python3-pyatspi nodejs npm git`
3. Install Claude Code with the native Linux installer and sign in once.
4. Copy `Second Brain` and `Nibley` back into your home folder.

## 3. Port session (Claude Code, Opus)
Open Claude Code in the `Nibley` folder and paste:
> Read CLAUDE.md, then docs/SWITCHING-PLAN.md section 4. Port Nibley to Linux Mint X11: write src/platform/linux.js and linux_helper.py to the same contract as windows.js, add nibley.desktop, update vaultPath and claudePath in settings.json, run every test, and report in the usual summary format.

Expected: a small session (the platform layer is about 10 functions). The rest of Nibley is shared code.

## 4. How each Windows piece maps to Linux
| Contract piece | Linux Mint X11 tool |
|---|---|
| `onPtt` | `src/platform/linux_helper.py` (python3 + `python3-xlib`): `XGrabKey` on Super+grave → press/release events, combo consumed. Cinnamon opens its menu on a lone Super release; grabbed combos usually don't trigger it, test and fall back to `Ctrl`+`` ` `` if they do. |
| click/type/key/scroll | `xdotool` (apt) |
| `elementAt`, `focusedIsPassword` | AT-SPI via `python3-pyatspi` in the same helper (role `PASSWORD_TEXT` = password) |
| `onMouseClick` | XRecord in the helper |
| Screenshot | Electron `desktopCapturer` works on X11 as is |
| Overlay | Needs Cinnamon's compositor (on by default). Electron flag `--enable-transparent-visuals` if the window turns black |
| Backup voice | `speechSynthesis` uses espeak on Linux (robotic). Edge voices stay primary |
| Claude Code | Native Linux installer, sign in once |

## 5. Check after the port
- Hold `Super`+`` ` ``: Cinnamon menu must not open. If it does, switch the hotkey to `Ctrl`+`` ` ``.
- Overlay over full-screen YouTube, click-through works, not black.
- All PRD tests 1-10 again, plus idle CPU.
