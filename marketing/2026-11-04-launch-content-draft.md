# Nibley launch content: draft v2 for review (no rendering yet)

## v2 changes after audience research (research/2026-11-04-launch-content-research.md)
- Video 1 is the hero (native upload on X, then an Instagram Reel). It now OPENS on the pen ring being drawn on the slide (the hook), then "Hi. I'm Nibley." Burned-in captions throughout (sound off).
- Still 10 posts, but posts 2, 3 and 5 become swipeable carousels (single images get the weakest reach; vendor data, see report).
- Post 4 (ADHD) becomes a personal founder post on X: "made by a learner with ADHD" + the design choices (short answers, one idea at a time). Never claims it treats or helps ADHD. Zarif OK'd mentioning ADHD publicly.
- Requirements ("Windows + Claude subscription") go in the first line of every post caption and in a small corner tag in the videos, plus the end card.
- Privacy line in captions and README: "Nibley takes one screenshot only when you use the hotkey, and sends it with your question to Claude."
- Video 2 trimmed to about 24 s (shorter problem beat). Voices stay hannah + austin (Zarif's pick; research thinks they may sound like an ad: judge on the first render).
- Post 7 shows 3 real diagrams big, "200+ topics" small. Post 10 is made now but posted 2-4 weeks later.
- Never promise accuracy or better grades.

Goal: launch Nibley on GitHub, introduce it, reach learners (students included), lead with Nibley's cuteness.
Platforms: Instagram (posts + Reels) and X. Sizes: videos 1080×1920, posts 1080×1350.
Look: DESIGN.md only. Pixel spark mascot, blue pen marks drawn on, Inter, `bg #F7FAFF`, no glass, gradients or emoji. Neutral device mockups, no Apple or Windows logos.
Sound: Nibley speaks only in its ElevenLabs sounds (8 moods). Narration (video 2 only) uses Groq Orpheus: hannah = learner, austin = narrator.

Honesty rule for all copy: claim only what v1 does today (voice question → reads the screen → explains simply → draws on screen; saved lessons; it remembers how you learn). Flashcards, gap finder and knowledge map are built as modules but not in the app yet, so they appear only as "coming soon".

## Video 1: "Meet Nibley" (framework A), about 20 s, no narrator

| Time | Picture | Nibley sound | Caption |
|---|---|---|---|
| 0-1.5 s | A lecture slide on a laptop; a blue pen ring draws itself round the block | magical "Ting!" | (none: the drawing is the hook) |
| 1.5-3 s | A spark pops onto the screen | magical "Bli-bli!" | Hi. I'm Nibley. |
| 2-5 s | Nibley shuffles, looks down | shy "M-mip..." | I live on your screen while you study. |
| 5-8 s | Keycap Win + ` pressed; a speech bubble: "what's a normal force?" | confused "Hmmmmm?" | Hold the hotkey. Ask out loud. |
| 8-13 s | Nibley draws on the slide: a ring round the block, an arrow, a label "normal force" | magical "Ting!" then excited "WOO-pip!" | I explain simply. Then I draw it. |
| 13-16 s | Nibley winks next to a "MIT · free" tag | mischievous "Hehehe!" | Free. Open source. |
| 16-20 s | End card: Nibley happy + github.com/Zarif0101/nibley | excited "Tadaa!" | Say hi on GitHub. |

## Video 2: hook → problem → solution → call to action (framework C), about 28 s

| Beat | Time | Picture | Voice | Caption |
|---|---|---|---|---|
| Hook | 0-3 s | A lecture video's progress bar jumps back, three times | hannah: "I've rewatched this part three times." | Rewatched it 3 times? |
| Problem | 3-9 s | Tabs pile up: search, forum, another video | austin: "Lectures move fast. Stopping to search breaks your focus." | Searching kills your focus. |
| Solution | 9-14 s | Keycap Win + ` ; Nibley pops in | austin: "Meet Nibley. Hold the hotkey and ask." hannah: "What does this arrow mean?" | Hold the hotkey. Ask. |
| Solution | 14-22 s | Nibley rings the arrow, labels it, numbers the steps | Nibley "Ting!" · austin: "It sees your screen, explains in simple words, and draws the answer right on it." | It draws the answer on your screen. |
| Call to action | 22-28 s | End card: GitHub link, "Needs Windows and a Claude subscription" | austin: "Free and open source. Get Nibley on GitHub." Nibley "Tadaa!" | Get Nibley free on GitHub. |

## Copy review (ux-copy skill)
- Fixed a false claim: "Hold one key" -> "Hold the hotkey" (it is two keys, Win + `). Same words in every video and post.
- Captions cut to 8 words or fewer; calls to action start with a verb ("Say hi", "Get Nibley", "Star it").
- End card states the requirements plainly: "Needs Windows and a Claude subscription".
- Spelling: British "maths", to match the library. Switch to "math" for a mainly US audience.

## 10 posts (single images, 1080×1350)

1. **Meet Nibley.** Big mascot. "Hi, I'm Nibley. The study buddy that draws on your screen."
2. **How it works, 3 steps.** Hold Win + ` → ask out loud → it explains and draws.
3. **Before / after.** The same lecture slide, plain vs with Nibley's ring, arrow and label. "Same slide. Now it makes sense."
4. **Made for ADHD brains.** "Made by a learner with ADHD. Answer first. One idea at a time. Short replies."
5. **Nibley's moods.** Mascot faces grid: happy, listening, thinking, speaking, confused. "Which one are you today?"
6. **Free and open source.** MIT licence, runs on your own Claude subscription. "Star it, fork it, make it yours."
7. **Nibley is studying too.** The hand-drawn diagrams grid. "200+ topics. 120+ diagrams. Coming in the next update." (physics, maths, chemistry, biology; counts grow, so never print exact numbers; the library is not wired into the app yet)
8. **Save the good ones.** "Say 'save this'. Replay it later. No extra AI use."
9. **Built in public.** "One learner + Claude Code. Here's what Nibley is made of." (stack: Electron, Haiku, Whisper via Groq)
10. **Coming soon.** Flashcards, gap finder, knowledge map. "Next: Nibley finds the basic you're missing."

## Claims check (every line against PRD v1, the code and the repo)
| Claim | Source | OK? |
|---|---|---|
| Hold the hotkey (Win + `), ask out loud | PRD 4.1 | yes |
| It sees your screen | PRD 4.2 (one screenshot per question) | yes |
| Explains in simple words, out loud | PRD 4.3, 4.1 (Piper backup voice plays today; Edge voice bug being fixed) | yes |
| Draws rings, arrows, labels, steps on screen | PRD 4.4, src/script.js | yes |
| Save and replay, no extra AI use | PRD 4.7 ("No Claude call") | yes |
| Free and open source, MIT | LICENSE | yes |
| Needs Windows and a Claude subscription | PRD 3 | yes (install guide must also mention Claude Code and a free Groq key for speech-to-text) |
| Built with Electron, Haiku, Whisper via Groq | PRD 4.1, ARCHITECTURE.md | yes |
| 200+ topics, 120+ diagrams | library/ (229, 124) | yes as counts, but NOT in the app yet -> post 7 now says "coming in the next update" |
| Flashcards, gap finder, knowledge map | src/learn/ (built, not wired) | only as "coming soon" (post 10) |
| Made by a learner with ADHD | CLAUDE.md, PRD 2 | true, but personal: needs Zarif's OK to say publicly (post 4) |
| github.com/Zarif0101/nibley | repo is public | yes |

## Before posting (launch readiness, not content)
- Nibley v1 is set up for one laptop (Zarif's vault path, his settings). A learner who clicks the GitHub link needs an install guide and a configurable notes folder, or the launch brings stars but broken installs.
- The main voice bug (Edge voice never plays) is being fixed in the local session; videos must not show a feature that is broken that day.
- Check ElevenLabs licence for public use of the sounds.
