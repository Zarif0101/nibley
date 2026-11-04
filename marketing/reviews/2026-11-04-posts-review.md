# Posts review (design-critique + accessibility-review, WCAG 2.1 AA)

## Overall
On brand: pen marks, pixel mascot, left-aligned type, tokens only, no gradients/glass/emoji. The before/after (post 3), founder post (4), moods (5) and lessons mock (8) read as hand-made. Weakest: post 2 cover (three blue number squares look like a template).

## Findings
| # | Post | Issue | Severity | Fix |
|---|---|---|---|---|
| 1 | 06 | `git clone github.com/Zarif0101/nibley` is not a valid clone URL | Critical (wrong instruction) | `git clone https://github.com/Zarif0101/nibley` |
| 2 | 04, 06 | Text set in ink `#2F8BFF`: 3.21:1 on bg, fails 1.4.3 for normal text; DESIGN reserves ink for pen marks | Major | Use deep `#1E6FEB` (4.43:1, passes as large text: keep ≥ 40 px semibold) |
| 3 | 01, 04, 07, chips | Text at 30-35 px is about 11-12 pt on a phone; the requirements line on post 1 matters | Major | Minimum 36 px for anything meant to be read; the "Nibley" footer brand mark may stay smaller |
| 4 | 02-2 | The backtick keycap looks empty | Moderate | Glyph ~140 px bold, plus "the key under Esc" under the keys |
| 5 | 02-1 | Generic numbered squares | Moderate | A row of the three real steps (keycaps, speech bubble, pen ring) with step chips |
| 6 | all | No alt text for posting (1.1.1) | Major | Alt text per image in captions.md (≤ 125 characters) for Instagram and X |

## Contrast (measured)
| Element | Ratio | Needed | Pass |
|---|---|---|---|
| text `#2B3A4B` on bg | 11.09:1 | 4.5:1 | yes |
| white on deep chip | 4.64:1 | 4.5:1 | yes |
| deep `#1E6FEB` on bg | 4.43:1 | 3:1 large | yes (large only) |
| ink `#2F8BFF` on bg | 3.21:1 | 4.5:1 | no for text |
| muted `#6B7A90` on bg | 4.17:1 | 4.5:1 | no (not used) |
| text on swipe | 8.60:1 | 4.5:1 | yes |
