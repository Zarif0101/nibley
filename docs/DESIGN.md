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
| Sizes | Chips 14/20. Status pill 13/16. Step numbers 16. Lessons: H1 24/32, card title 18/24, body 16/24, caption 12/16 | |
| Radius | Chips and step blocks 8 px. Cards 12 px. Status pill fully round | |
| Shadow | Chips, steps, pill: `0 2px 8px rgba(43,58,75,.28)`. Cards: `0 1px 3px rgba(43,58,75,.08)` | |
| Stroke | Pen 3.5 px, round caps | |

## Mascot
- Pixel spark (20x20 grid, `src/overlay/mascot.js`), crisp pixels, faces: happy, listening, thinking, speaking, confused, error (X eyes + `error` mark).
- Uses: status pill, tray icon (happy; error face when something needs fixing), lessons header and empty state, app icon (mascot on an `ink` rounded square).
- 3D version (`design/mascot-3d/`, Zarif 2026-11-04): same sky blues. Extras for cuteness: blush cheeks (`error` coral at ~60%, soft edge), a small white-blue spark star beside the tuft (`sky` #BDE9FF, glow #8BD9FC; Zarif 2026-11-04: not yellow), nub hands, second eye glint. For marketing, onboarding and mood loops; the 16 px tray icon stays pixel art.

## Marks on screen
- **Ring:** a hand-drawn loop, not a perfect ellipse. Starts at ~10 o'clock, goes round once, overshoots ~25° so the ends cross. Radius jitter ±4%. Seeded per mark, so replays look identical.
- **Arrow:** a slightly curved line (one bend, 6-10% of length), short open arrowhead, two strokes.
- **Highlight:** a highlighter swipe: ragged short ends, skewed −2°, `swipe` colour. Drawn left to right. Sits under pen strokes.
- **Point:** a short pen tick beside the target, plus a small ring.
- **Label:** a `deep` chip with white Inter 600, never covering a mark or another label, placed on the calmest side (least busy part of the screenshot). Max 6 words. Beside an arrow, not along it.
- **Step:** a 28 px `deep` rounded block with the number, plus a ring on the target. Current step full colour; done steps 35% opacity; next steps not shown until reached.
- **Clear:** pen marks erase by running the pen backwards (200 ms); chips fade out.

## Motion
- Pen speed like a hand: rings 450 ms, arrows 300 ms, swipes 350 ms. `cubic-bezier(.3,.7,.2,1)`.
- Marks start when their `say` line starts, spaced across the line.
- Chips slide 6 px from the left and fade in (180 ms).
- `prefers-reduced-motion`: marks appear whole, no animation, mascot doesn't animate.

## Status pill near the cursor
White pill, 18 px below-right of where the cursor was at the hotkey press:
- Listening: `deep` pill, mascot listening face, 3 white bars moving with the mic level, "Listening".
- Thinking: mascot thinking face, 3 `ink` dots pulsing, "Thinking".
- Speaking: mascot mouth opening and closing, "Speaking". Hides when the answer ends.
- Didn't catch: confused face, "Didn't catch that", 1.5 s.
- Problem (no key, no internet, Claude limit): error face, short text, 4 s.

## Subtitles
Approved by Zarif 2026-11-04 ("we can tweak the subtitles in the future"). Built in `src/overlay/subtitles.js`; preview `test/out/sim-subtitles-preview.png`.
- The line being spoken, bottom-centre, 72 px above the screen bottom (clear of YouTube's own captions), max width 760 px, max 2 lines.
- Inter 600 20/28, white on a `text` (#2B3A4B) chip at 88%, radius 8, chip shadow.
- Shows when the line's audio starts, fades 120 ms after it ends; no fade with reduced motion.
- Moves to top-centre when a mark sits in the bottom quarter of the screen.

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
