# Render brief (videos + posts)

Copy: `marketing/2026-11-04-final-copy.md` (use it word for word). Look: `docs/DESIGN.md` tokens only.

## Hard rules (Zarif hates AI slop)
- Tokens only: ink `#2F8BFF` (pen marks), deep `#1E6FEB` (chips), sky `#4DA3FF #6CCCFF #A7E3FF`, text `#2B3A4B`, muted `#6B7A90`, bg `#F7FAFF`, line `#E6EEF8`. Font: Inter 400/600/700 from `src/overlay/fonts/*.woff2` (@font-face with file:// paths). Radius: chips 8, cards 12. Shadows: chips `0 2px 8px rgba(43,58,75,.28)`, cards `0 1px 3px rgba(43,58,75,.08)`.
- NO gradients, glass/blur, glow, lens flares, emoji, stock 3D blobs, sparkle clip-art, centred-everything templates, giant gradient headlines. Left-aligned type, real-looking content, asymmetric layouts, generous whitespace.
- Mascot: pixel art from `src/overlay/mascot.js` (`svg(face, size)`, faces: happy, listening, thinking, speaking, confused). Keep pixels crisp (`shape-rendering: crispEdges`, integer scale). Express other moods with motion (shy = small, looks down, slight shrink; mischievous = happy + tilt + bounce; sleepy = slow bob). You may add at most 2 extra faces, same 20×20 grid and palette.
- Pen marks: hand-drawn, built with `library/tools/draw.js` helpers (`circle`, `arrow`, `line`, `toSvg`-style rendering via `render`): ring starts ~10 o'clock and overshoots, arrow has a slight bend. Draw-on with stroke-dashoffset (rings 450 ms, arrows 300 ms, easing cubic-bezier(.3,.7,.2,1)). Pen stroke 3.5 px (scale up for 1080 px canvases, ~7 px) with a 1.5 px (×2) `#2B3A4B` edge outline behind on light backgrounds. Label chips: `deep` fill, white Inter 600, slide in 6 px + fade 180 ms.
- Lecture slide mock: white slide, title in Inter 700 `#2B3A4B`, a block on the floor drawn from `library/assets/block.svg` + `ground.svg` in `#2B3A4B` (the lecturer's drawing), a printed "weight" arrow. Nibley's marks go on top in blue.
- Device: neutral flat laptop (dark `#2B3A4B` rounded bezel, simple base), no logos, no OS chrome from Apple or Microsoft. Optional subtle CSS 3D tilt (≤ 12°) easing to flat in the first 1.5 s. Video player chrome: generic progress bar, no YouTube branding.
- Keycaps: two rounded keys "Win" and "`", press = translateY + smaller shadow.
- Safe zones for Reels: keep captions and key text out of the top 220 px, bottom 420 px and right 140 px of a 1080×1920 frame.

## Videos (1080×1920, 30 fps, H.264 yuv420p, AAC, `-movflags +faststart`, loudness about -14 LUFS)
- One HTML page per video with `window.seek(t)` that sets EVERYTHING for time t (deterministic: no CSS transitions or timers). Render with Playwright (`require('playwright')`, `chromium.launch()`): for each frame call `seek(i/30)`, screenshot (jpeg q≈92), then ffmpeg.
- Burned-in captions on every beat: white card (radius 12, card shadow), text `#2B3A4B` Inter 600 ~58 px, max 2 lines.
- Nibley sounds: `/tmp/claude-0/-home-user-nibley/77fe0c19-3d64-5601-8230-97f34306a4e4/scratchpad/sounds/split/` (`index.json` maps mood + label to wav files, already loudness-normalised). Labels are best-effort.
- Voices (video 2): Groq TTS. `curl https://api.groq.com/openai/v1/audio/speech -H "Authorization: Bearer proxy-injected" -H "Content-Type: application/json" -d '{"model":"canopylabs/orpheus-v1-english","voice":"hannah","input":"...","response_format":"wav"}'` (the proxy injects the real key; never print or store a key). hannah = learner, austin = narrator. Time the beats from the real clip lengths.
- Mix with ffmpeg (adelay + amix, normalize=0), voice above sounds, sounds above silence (no music).

## Posts (1080×1350 PNG)
- One HTML template per post or slide, rendered with Playwright `page.screenshot`. Carousels: `post-02-1.png`, `post-02-2.png`...
- Write `captions.md` next to the images: for each post an Instagram caption and an X version (≤ 280 characters), each starting with `Free, open source. Windows + your Claude subscription.`, plus the privacy line where the screen is shown.

## Where things go
- Code: `/home/user/nibley/marketing/render/` (plain Node + HTML, no new dependencies in package.json).
- Outputs: `/tmp/claude-0/-home-user-nibley/77fe0c19-3d64-5601-8230-97f34306a4e4/scratchpad/launch-out/` (NOT the repo: the sounds' licence is not confirmed yet).
- Also save a keyframe contact sheet per video (1 frame per second) as PNG in the outputs folder, so the result can be reviewed without playing it.
