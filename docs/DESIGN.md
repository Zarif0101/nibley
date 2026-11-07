# Nibley: Design

Date: 2026-10-28 (v2, rebrand) · Applies to every pixel Nibley draws. Builder: follow this exactly; don't add styles.
Source: Zarif's brand board (2026-10-28): pixel mascot, sky blues, Inter. The board's wordmark says "explainly"; the product name is **Nibley**.
Scope (Zarif's pick): brand on Nibley's own UI (mascot status, tray, labels, lessons window). Rings and arrows on the video stay hand-drawn pen marks, in brand blue.

## Brief
- **For:** Zarif, studying with YouTube lectures and physical books. ADHD: one clear thing to look at.
- **Feeling:** a small, friendly spark that explains things. Calm, quick, a bit playful.
- **Avoiding:** glow, glassmorphism, gradients, emoji. No style outside the tokens below.

## Tokens (the only values allowed)
| Token | Value | Use |
|---|---|---|
| `ink` | `#2F8BFF` | Pen marks (rings, arrows, ticks), focus rings |
| `deep` | `#1E6FEB` | Label chips, step blocks, the Listening pill, mascot outline |
| `sky` | `#4DA3FF`, `#6CCCFF`, `#A7E3FF` | Mascot body/face/shine, card hover border |
| `swipe` | `#FFD98C` at 45% | Highlights only |
| `text` | `#2B3A4B` | Text on light, dark pen edge, mascot eyes |
| `muted` | `#6B7A90` | Dates, secondary text |
| `bg` / `line` | `#F7FAFF` / `#E6EEF8` | Lessons window background / card borders |
| `error` | `#FF8B7A` | Mascot error mark only |
| `edge` | `#2B3A4B` or `#FFFFFF`, picked by brightness under the mark | 1.5 px outline behind pen strokes so they read on any frame. No glow. |
| Font | Inter (bundled woff2 in `src/overlay/fonts/`): 400 body, 600 labels/titles, 700 step numbers | Nothing else |
| Sizes | Chips 14/20. Status pill 13/16. Subtitles 20/28. Step numbers 16. Lessons: H1 24/32, card title 18/24, body 16/24, caption 12/16 | |
| Radius | Chips and step blocks 8 px. Cards 12 px. Status pill fully round | |
| Shadow | Chips, steps, pill: `0 2px 8px rgba(43,58,75,.28)`. Cards: `0 1px 3px rgba(43,58,75,.08)` | |
| Stroke | Pen 3.5 px, round caps | |

## Mascot
- Pixel spark (20x20 grid, `src/overlay/mascot.js`), crisp pixels, faces: happy, listening, thinking, speaking, confused, error (X eyes + `error` mark).
- Uses: status pill, tray icon (happy; error face when something needs fixing), lessons header and empty state, app icon (mascot on an `ink` rounded square).
- 3D version (`design/mascot-3d/`, Zarif 2026-11-04): same sky blues. Extras for cuteness: blush cheeks (`error` coral at ~60%, soft edge), a small white-blue spark star beside the tuft (`sky` #BDE9FF, glow #8BD9FC; Zarif 2026-11-04: not yellow), nub hands, second eye glint. For marketing, onboarding and mood loops; the 16 px tray icon stays pixel art.

## Marks on screen: note cards (Zarif OK'd the mockup 2026-11-08, `design/notes-mockup.html`)
No free circles, arrows, ticks or highlighter swipes: they popped in and all looked the same. Every mark is a card with a line.
- **Card:** white, radius 12, chip shadow, 240 px wide (at 1366x768). Title Inter 600 15/20 `deep`; note Inter 400 14/20 `text`. Notebook-style: title + key fact or formula, max 12 words, never a copy of the voice.
- **Place:** the calmest empty spot near the target: never over the target, another card or anything drawn on the slide (any inked 16 px cell counts), never in the bottom-centre zone (pill, answer buttons, subtitle). In full screen this lands on the far side of the video.
- **Line:** a thin pen line (2 px, `edge` 5 px under it), a gentle curve from the card side nearest the target.
- **Soft mark** where the line ends: an underline (3.5 px) under text (box ≤ 48 px tall and wider than 1.6x its height), else a thin rounded outline (3 px, radius ≤ 12, 6 px padding) round the shape.
- **Step:** the same card with a 22 px `deep` number block; only the current step shows, the last one goes when the next draws in.
- **Max 2 cards** on screen; the oldest fades first (answer guard).
- **Leave:** cards fade (600 ms) about 5 s after the answer ends; the mouse on a card keeps them. Everything clears at once when he switches window or tab.

## Motion
- Card rises 6 px and fades in (180 ms); its note writes in left to right (≤ 1.1 s); the line draws (380 ms), then the soft mark (underline 300 ms, outline 450 ms). `cubic-bezier(.3,.7,.2,1)`.
- Cards start when their `say` line starts, spaced across the line.
- `prefers-reduced-motion`: marks appear whole, no animation, mascot doesn't animate.

## Status pill
White pill, centred at the bottom of the screen, 184 px above the screen bottom (above the answer buttons and the subtitle): the same spot every time, shown only while Nibley is active (Zarif, 2026-11-04: it felt random next to the mouse). When a mark sits in the bottom quarter, pill, buttons and subtitle move to the top together (pill 24 px from the top). The pill sits in a full-width centred row, so its width can change without it moving off centre.
- Listening: `deep` pill, mascot listening face, 3 white bars moving with the mic level, "Listening".
- Thinking: mascot thinking face, 3 `ink` dots pulsing, "Thinking".
- Speaking: mascot mouth opening and closing, "Speaking". Hides when the answer ends.
- Didn't catch: confused face, "Didn't catch that", 1.5 s.
- Problem (no key, no internet, Claude limit): error face, short text, 4 s.

## Subtitles (Zarif OK'd the look, 2026-11-04)
Every `say` line shows as a subtitle while its audio plays, then clears. Zarif: "it's really hard to understand what he's actually saying."
- Box: `text` background, white Inter 600 20/28, padding 8 px 16 px, radius 8 px (same as chips), chip shadow. Max width 760 px, text centred, max 2 lines.
- Place: bottom-centre, 64 px above the screen bottom (clears YouTube's control bar). If that spot would cover a pen mark or label, it moves to top-centre (64 px from the top). Labels never land on the subtitle.
- Longer than 2 lines: split into parts at word breaks, each shown for its share of the audio.
- Timing: appears when the line's audio starts, fades out 150 ms when it ends. Next line replaces it in place. `prefers-reduced-motion`: no fade.
- Why `text` and not `deep`: `deep` chips are labels on the video; the subtitle must not look like a label.
- Cloud module `src/overlay/subtitles.js` (72 px up, 120 ms fade) differs from the built overlay above. Reconcile at QUALITY-PLAN T2.

## Pill motion (proposed 2026-11-04, preview `test/out/pill-motion-preview.webp`)
- Same order on every press: Listening → Thinking → Speaking, each at least 350 ms; never skips Listening.
- Enter: pop from scale .82 to 1.04 to 1 with fade, 170 ms. State change: width glides to the new text, the mascot hops 3 px, colours cross-fade, 190 ms. Leave: fade + scale .92, 140 ms. Reduced motion: no animation.

## Answer buttons (proposed 2026-11-04, preview `test/out/sim-ask-with-buttons-1.png`)
- Up to 3 buttons centred just above the subtitle (follow it to the top when it moves). Inter 600 14/20, radius 8, chip shadow.
- First option: `deep` fill, white text, key hint "Enter". Others: white fill, `deep` text and 1.5 px `deep` border, key hints "2", "3". Hover: `ink` border. Rise 6 px + fade in, 180 ms.

## Lessons window
- `bg` background, header: mascot + "Lessons".
- One card per lesson: screenshot thumbnail (radius 8), title, "You asked: …" (2 lines max), date and time. Newest first.
- Hover: `sky` border. Keyboard focus: 2 px `ink` ring. Enter/click plays the lesson.
- Empty state: mascot + "No lessons yet. Say "save this" after an explanation."

## Check before shipping
- Squint test on a busy YouTube frame: the ring and chip are the first thing you see.
- Readable on a white lecture slide and on a dark video frame (the `edge` outline does this).
- No element outside these tokens.
