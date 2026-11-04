# Nibley enhancement plan ($78 cloud credit): Brainstorm / Discovery Notes
Date: 2026-11-04 · Goal: decide how to spend the remaining ~$78 of Claude Code cloud credit on research, advanced feature planning, and building what can be built and tested in a cloud session.
Status: in progress (social media part: building). Build items 1-7 done in `src/learn/` (93 tests); item 8 teach-back deferred.
Context sources: brainstorms/2026-11-04-pregenerated-study-assets.md (14 MVP features, 4 build phases, Q13), docs/PRD.md (v1, hard constraints), docs/briefs/local-app.md, library/README.md (study library, PR Zarif0101/nibley#1)

## Known from context (not asked)
- Study library is done: 229 topics, 229 notes, 124 drawings, check.js passes (PR #1, not merged yet).
- Approved build order (earlier brainstorm, Q13): 1 core loop (voice fix, subtitles, transcript context, note paper, chat) -> 2 remember (flashcards + FSRS, daily review, chapters + notes) -> 3 check yourself (pause quizzes, hint ladder, teach-back) -> 4 smart layer (gap finder, knowledge map, confusion detector, layouts, buttons).
- Zarif's process (local brief, Task 3): play back understanding -> his OK -> PRD v2 -> architecture -> build. PRD v2 is being prepared in the local session.
- PRD v1 hard constraints: runs on his Claude subscription (no API credits, no paid services), weak laptop (i5-6200U, 8 GB), always online, Windows only.
- This cloud session cannot run or test the Electron app, voice, overlay or hotkey. It can build and test content and pure Node logic.

## Summary / key decisions
- Spend plan (Q1b, corrects Q1): A + C. Full research and feature specs (C) AND build the brain modules with tests (A). If credit is left after that: social media posts and animations.
- Gaps (Q3): Nibley does NOT force a fix. It saves the gap inside the app, shows it on the mind map / knowledge map, tells him "you have a learning gap on this topic", and he starts learning it when he wants. It keeps tracking over time whether the gap is still there, from his interactions.
- Build order (Q4, confirmed): 1 learner model + gap tracker, 2 gap finder, 3 knowledge map data, 4 FSRS flashcards + daily review, 5 pre-video check, 6 pause quiz + hint ladder, 7 confusion detector, 8 teach-back grading (last, needs new per-topic content). Plus one spec doc for the local session. Start building now.
- Next (Q5): social media: 2 animated videos + 10 posts. Teach-back deferred. Context questions first.
- Post goals (Q7): main = launch Nibley on GitHub. Also: introduce Nibley; find users, targeting LEARNERS in general (students included, not students only); PR built on Nibley's cuteness (the mascot); "many other things" (not yet named).
- Platforms (Q8): Instagram (feed posts + Reels) and X. Formats (assistant): posts 1080x1350 (4:5, works on both), videos 1080x1920 vertical (Reels; X plays vertical too).
- Sound (Q9 reply): Nibley has no voice of its own; the videos use cute sound effects Zarif generated with ElevenLabs: 8 mp3 files, each with 4-5 effects, in this order: magical, sleepy, sad, mischievous, shy, confused, surprised, excited. Files are in his Downloads folder (on his laptop).
- Video frameworks (Q9): video 1 = A "Meet Nibley" (cute first-person intro, speaks in sound effects + captions); video 2 = C hook -> problem -> solution -> call to action. Do NOT build straight away: ask for direction before building, and run skills.
- Lean mode (Q11 reply): credit is tight ("I don't have that much space on me right now, so utilize it accordingly"). No Mac interfaces "for now". Assistant reading: install no new skills (use the built-in ux-copy, design-critique, accessibility-review) and render with the HTML -> MP4 pipeline already working here.
- Voiceover (Q12): Groq TTS for video 2 ("I'm not using Grok TTS right now, so use it for this"); video 1 keeps Nibley's sounds. Voiceover optional if it doesn't work out.
- Voices (Q13): Groq Orpheus voices austin and hannah both sound good to him.
- Content plan (Q14): continue with the draft. Library counts are not final (more coming) -> say "200+ topics, 120+ diagrams" style, not exact numbers. Before building: more research on what people want to see, and check everything.
- ADHD can be mentioned publicly (Zarif, after Q14). Framing stays: made by a learner with ADHD; no claims that it treats or helps ADHD.
- Research scope (Q2): the brain features (flashcards + spaced repetition, daily review queue, gap finder, knowledge map, pause quizzes + hint ladder, teach-it-back grading, confusion detector) PLUS a scan for new ideas from top learning apps and learning science. Screen features (note paper, layouts, subtitles, chat, buttons, chapters) are out: local session + PRD v2 own them. Start now.

## Research findings (assistant, not yet confirmed by Zarif)
Reports in `research/` (2026-11-04). Highlights:
- Spaced repetition: reimplement FSRS-6 (~60 lines JS, 21 default params, checked against ts-fsrs 6.0.0 MIT source); don't vendor ts-fsrs (needs Node 24 + extra dep). Voice rating: model judges the spoken answer -> Again/Hard/Good (Easy only on "too easy"); bare "got it" never trusted. Daily queue ~10 cards (8 due + max 2 new, up to 3 weak-root questions), lowest retrievability first, hard cap, no backlog shame; "fresh start" offer if backlog > 60.
- Learner model (written from memory, numbers unverified): one P(known) per topic via BKT with hand-set params (L0 0.3, learn 0.15, guess 0.25, slip 0.1) x FSRS retrievability. Gap finder: binary search over failed topic's ancestors with root checks, max 4 questions; a pass raises ancestors, a fail only marks suspects. Map levels not started / shaky / okay / strong, one "ready to learn" topic, no percentages. Optional "sure?" on ~1 in 3 questions; sure+wrong = misconception, goes first in review.
- Quizzes/hints/teach-back/confusion: 1 pause question per natural segment end (~4-6 min, min 3 min apart, cap ~4/hour), 2nd only if 1st wrong, always skippable. Hint ladder 3 levels (idea -> partial step -> answer + why + twin problem); reaching level 3 = Again/Hard. Teach-back: pre-generated 3-5 key points per topic (must / accept / common_wrong / fix), one Haiku call returns fine/missing/wrong per point, unclear = missing. Confusion: score signals in a 3-min window, at score >= 3 show a dismissible chip, never auto-speak, max 3 offers/session. All thresholds are starting guesses to tune.
- New ideas (ranked): prequestions before a video (S, moderate-strong evidence); prerequisite check before a video (Nibley's unique edge); interleaved review queue; confidence calibration; end-of-video free recall instead of summaries. Skip body doubling and Pomodoro (no ADHD trials). Keep instant feedback, tiny sessions, forgiving streaks.

## Q&A log
### Q1 - What the $78 should mainly buy
- Asked: A brain modules (code + tests), B better content, C research/planning only, D mix (short research, then build). Assistant suggested D, and to build only standard parts that won't change with PRD v2 (FSRS scheduling, gap finder over the prerequisite tree).
- Captured: ~~chose D ("lets do what you suggested").~~ SUPERSEDED by Q1b. Also wants "some social media post and animations", but only "if we have some left" after D.
- Tentative / suggested: none new.
- Flags: social media posts + animations: which platforms, what they should show, and whether they are for Nibley's launch or Zarif's own brand -> Zarif, later (only if credit remains).

### Q1b - Correction to Q1
- Captured: "lets do A and C". So: research + planning/specs for the advanced features (C), plus brain modules as tested code (A). Not the light "short research" version of D.
- Still holds from Q1: social media posts + animations only if credit remains afterwards.
- Flags: none new.

### Q2 - What the research and specs cover
- Asked: (1) only the brain features, (2) all 14 MVP features, (3) brain features + new-ideas scan. Assistant suggested 3.
- Captured: "start 1 and 3" -> brain features plus the new-ideas scan, and start now.
- Tentative / suggested (assistant): research reports go in a new top-level `research/` folder (not `docs/`, which the local session is editing). Brain modules are pure functions (state in, state out) so storage can be decided later in PRD v2.
- Flags: where learner data is stored (vault markdown vs app JSON) -> PRD v2 / Zarif, later.

### Q3 - What happens when a weak basic is found
- Asked: A fix now (~1 min), B fix later in daily review, C ask each time (default now). Assistant suggested C.
- Captured (his words): "It saves the data inside of the harness or the like interface of the app and creates mind maps and gaps. Then we can start learning those if the user wants to. We can also inform them that you have a learning gap on this topic, and we will also track if they still have the gap in the future. via their interaction?"
  - So: save the gap in the app; show it on a mind map; tell him he has a gap; learning it is his choice, when he wants; keep checking over time whether the gap is still there.
- Tentative / suggested (assistant): yes, the learner model does this. Every graded answer (pause quiz, daily review, root check, teach-back) updates the topic's score, and the gap closes when answers show it's fixed. Caution: only GRADED answers count as evidence. Just asking about a topic in chat should not mark a gap (asking is not failing); at most it makes the topic "worth checking".
- Flags: storage: he said "inside the app", but PRD v1 4.6 keeps memory in the vault (`Second Brain/nibley/`). Conflict, resolve in PRD v2 -> Zarif.

### Q4 - Build order
- Asked: confirm order 1 learner model + gap tracker, 2 gap finder, 3 knowledge map data, 4 FSRS + daily review, 5 pre-video check, 6 pause quiz + hint ladder, 7 confusion detector, 8 teach-back grading; plus a spec doc. Assistant suggested keeping it.
- Captured: "keep that order, start building".
- Flags: none new.

### Q5 - Teach-back or social media next
- Asked: A teach-back (content + grading) or B social media posts + animations. Assistant suggested B if credit < ~$40.
- Captured: "B, lets do the social media posts". Wants **2 animated videos and 10 posts**. "ask me questions for context and clarification".
- Flags: none new (social media context questions follow).

### Q6 - Use the anchor-audit skill for drafting?
- Asked: use anchor-audit (drafts from specific input + patch-only audit) for posts and scripts? Assistant suggested yes.
- Captured: "no anchor audit". Instead: "ask me for the frameworks of the scripts. And the goal of the posts".
- Flags: script frameworks + goal of the posts -> asking Zarif next.

### Q7 - Goal of the posts
- Asked: A launch on GitHub, B grow his own brand, C find students, D other. Asked neutrally (his goal, no suggestion).
- Captured (his words): "Launch Niblay on GitHub." "We are also going to find students, but we are not going to target students. We are going to target learners, including students." "We are also going to be introducing Nibley." "We are going to do the PR with the cuteness of Nibley." "And many other things".
- Tentative / suggested: none.
- Flags: "many other things": which ones -> Zarif (ask in the completeness check at the end).

### Q8 - Platforms
- Asked: X, LinkedIn, Instagram, TikTok/Shorts, Reddit, other; which matters most.
- Captured: "Like reels and Instagram X also" -> Instagram (Reels + posts) first, X also. Not LinkedIn, TikTok, Reddit.
- Tentative / suggested (assistant): one size per type that works on both: posts 1080x1350 (4:5), videos 1080x1920 (9:16).
- Flags: none new.

### Q9 - Video script frameworks (still open) + sounds
- Asked: frameworks for the 2 videos: A Meet Nibley, B Stuck -> saved story, C Hook/problem/solution/CTA, D Before/after. Assistant suggested video 1 = A, video 2 = B.
- Captured: framework not answered at first (see Q9 answer below). Instead: "Niblay doesn't have a voice for him himself now, so I'll add the cute sounds". Generated with ElevenLabs. 8 mp3 files, "Each file already has 4 to 5 types of sound effects", in order: 1 magical, 2 sleepy, 3 sad, 4 mischievous, 5 shy, 6 confused, 7 surprised, 8 excited. "You should also check these files". "its in my download folder".
- Tentative / suggested (assistant): split each file into its single effects (by silence) and map them to mascot faces (DESIGN.md has happy, listening, thinking, speaking, confused, error).
- Flags: framework choice still open -> Zarif. ElevenLabs licence for public/commercial posts depends on his plan (free plan may need attribution / be non-commercial) -> Zarif to check. Getting the files into this cloud session -> Zarif.

### Q9 answer - frameworks
- Captured: "A and C for the video but dont just build it straight away ask for derection before building and run skills". On sound labels: "The history of the Eleven Labs doesn't cover all of the sound effects, but just do it somehow."
- So: video 1 = A (Meet Nibley), video 2 = C (hook / problem / solution / CTA). Get his direction (script, storyboard) before any rendering. Use skills in the process.
- Flags: which skills to run -> asking Zarif (his preference: ask before using a skill).

### Q10 - Which skills to run
- Asked: 1 find-skills (video/animation + social post skills on skills.sh), 2 ux-copy (hooks, captions, CTAs), 3 design-critique (storyboards + posts before render), 4 accessibility-review (text size/contrast). Order: 1 -> scripts + storyboards -> 2 -> his direction -> 3 + 4 on drafts -> final render. Assistant suggested all 4.
- Captured: "run all 4".
- Flags: none new.

### New request: 3D Mac / premium interfaces
- Captured: "Also use screenshots and web searches to actually build 3D models of Mac interfaces and premium interfaces for the videos."
- Tentative / suggested (assistant push-back, not decided): Nibley is Windows-only (PRD v1), so a macOS UI promises a Mac version; DESIGN.md bans glassmorphism, gradients and glow, which the usual "premium Mac" look relies on; copying Apple's UI/logo in marketing is a trade-dress risk. Counter-proposal: premium 3D neutral device mockups (no logos, OS-neutral window chrome) in Nibley's own tokens; web search for composition/lighting references only. Arbitrary website screenshots are not possible from this session (network allowlist).
- Flags: Mac look vs neutral premium mockup -> Zarif.

### New request: voiceover TTS
- Captured: "Also use some TTS from Grok or the TTSs we have for the video voiceover."
- Tentative / suggested (assistant, not decided): "Grok" probably means Groq (the project already uses a Groq key for speech-to-text); Groq TTS needs that key in this session (secure credential form, host api.groq.com). "TTSs we have" = Edge voices (msedge-tts, needs the Edge speech host allowed; licence for marketing use unclear) and Piper (local; voice models download from huggingface.co, licence differs per voice). Video 1 (Meet Nibley) uses Nibley's sounds, not a narrator; a voiceover fits video 2.
- Flags: which TTS + which voice -> Zarif. Groq or xAI Grok? -> Zarif.

### find-skills results (skills.sh API, 2026-11-04)
- skills.sh host added to the Default environment (approved). The `skills find` CLI still returns nothing; the search API works via curl.
- Candidates: remotion-dev/skills (official Remotion: remotion-best-practices 744K installs, remotion-render 270K); heygen-com/hyperframes (HeyGen: hyperframes 1.37M, product-launch-video 539K, motion-graphics 514K, three 69K); coreyhaines31/marketingskills (social-content 67K, copywriting 245K); emilkowalski/skills (review-animations 280K).
- Flagged: many near-identical "superpowers/ai-video-generation" copies from unknown owners with similar install counts (look inflated; also use paid AI APIs, against the no-paid-services rule) -> skip. cloudai-x/threejs-skills (~20K, unknown author) -> skeptical.
- Not verifiable here: GitHub stars and licences (GitHub access is scoped to this repo).
- Flags: which skills to install -> Zarif.

### Q11 - Install the skills.sh skills?
- Asked: install HyperFrames (product-launch-video + motion-graphics), Remotion best practices, social-content + copywriting, review-animations? Assistant suggested yes.
- Captured: "I don't have that much space on me right now, so utilize it accordingly. Let's not use Mac for now."
- Tentative / suggested (assistant): "space" read as credit -> install none, keep the 3 built-in skills, own render pipeline. Mac dropped for now (neutral device mockups instead).
- Flags: if "space" meant disk or something else -> Zarif can correct.

### Q12 - Voiceover voice
- Asked: A Edge voice, B Groq TTS (his key), C no voiceover. Assistant suggested C for credit.
- Captured: "Groq TTS". "if you don't want to use any voiceover, it's okay, but I'm not using Grok TTS right now, so use it for this." -> use Groq TTS (his quota is free right now).
- Flags: ~~Groq key must reach this session~~ done: key saved via the secure form on a new personal "nibley" environment (approved; this session moved onto it). Groq TTS model: canopylabs/orpheus-v1-english; voices autumn, diana, hannah, austin, daniel, troy. Samples of all 6 sent to Zarif.
- Also captured: "If you want clarification with the sound effects, you can use my browser to go to my Eleven Labs". Assistant: this cloud session cannot reach his browser; prompt-order labels are enough.

### Q13 - Narrator voice
- Asked: pick one of autumn, diana, hannah, austin, daniel, troy (no suggestion; taste call).
- Captured: "austin and hannah sounds good".
- Tentative / suggested (assistant): use both in video 2: hannah = the stuck learner (problem), austin = narrator (solution + call to action).
- Flags: confirm the two-voice split in the script review -> Zarif.

### Q14 - Review of the content draft
- Asked: render as written, or what to change? (Draft: marketing/2026-11-04-launch-content-draft.md, after ux-copy.) Assistant pushed back: the repo needs an install guide + configurable notes folder before posting.
- Captured: "let's continue with it, but about those 229 topics and 124 diagrams, it's not confirmed. We are going to add more, so do something like more than these topics". "Do a bit more research about what people would like to see, research that, and check everything, then we'll proceed with the building."
- Flags: launch-readiness push-back not answered -> Zarif (local session work).

### Audience research + checks (after Q14)
- Report: research/2026-11-04-launch-content-research.md (study-niche evidence is thin; mostly platform guidance + vendor data + creator anecdote).
- Applied to draft v2 (assistant): video 1 hero, opens on the ring being drawn; posts 2/3/5 as carousels (still 10 posts); ADHD post -> founder post on X, no health claims; requirements + privacy line in every caption; video 2 ~24 s; post 7 shows 3 diagrams, "200+ topics" small; post 10 posted later.
- Claims check: 12 claims checked against PRD/code/repo; post 7 reframed as "coming in the next update" (library not wired into the app yet).
- Flags: ~~saying "made by a learner with ADHD" publicly~~ resolved: "okay, ADHD is fine to mention publicly" (Zarif). Anthropic terms for a public tool that runs on each user's own Claude subscription via Claude Code -> Zarif to check before launch.

### Q15 - Build v2?
- Asked: build v2, or change first?
- Captured: "let's humanize it more, so no AI slop, with the design and the scripts, and then build it."
- Flags: none new.

### Sounds received (2026-11-04)
- Captured: Zarif attached all 8 ElevenLabs mp3s in chat. Assistant matched them to his order by file creation time (11:34 to 11:42): 1 magical, 2 sleepy, 3 sad, 4 mischievous, 5 shy, 6 confused, 7 surprised, 8 excited (assumption, he can correct). CONFIRMED: his screenshot of `Downloads/nibley sound effects` lists the 8 files in this same name order, and the sizes match (276, 129, 156, 131, 134, 156, 181, 166 KB).
- Checked (assistant): split by silence -> magical 8 short pieces (likely 4 effects of 2 parts), sleepy 4, sad 5, mischievous 4, shy 4, confused 4, surprised 4, excited 5. Confused file is much quieter (peak -16 dB vs about -2 to -6 dB for the others); every piece was loudness-normalised (-16 LUFS). Pieces kept in the session scratchpad, NOT in the public repo, until the ElevenLabs licence is confirmed.
- Prompts (Zarif's ElevenLabs history screenshot): magical "Bli-bli! Woop-wip! Ting! Bloop-blo..."; sleepy "Mmmmmm... Hmmm... Prrrr... Zzz..."; sad "Aww... Mmm... Pwoo... Oh..."; mischievous "Hehehe! Boop! Nyehehe! Bip-bip!"; shy "M-mip... Hehe... Pip... Eep..."; confused "Uhhh? Bip... bip? Hmmmmm? Wut?"; surprised "EEP! Wah! Ooh-WOAH! BWOOP?!"; excited "WOO-pip! Yay-yay-yay! Bweee-woo! Tadaa! Hm...". Split pieces labelled in this order (by order, not by ear).
- Limits: the assistant cannot hear moods; it checked count, length, loudness and spectrograms only.

## Build log (after Q4)
- Done: library.js, model.js (learner model + gap tracker), gapfinder.js, fsrs.js, review.js, map.js, prevideo.js, quiz.js, confusion.js, spec `src/learn/README.md`. 93 learn tests pass; full suite 117 pass, 0 fail.
- Changed from research: gap finder limit 4 -> 6 questions (simulation over 2,751 topic/basic cases: 77% found with 4, 100% with 6, 4.3 asked on average); unseen basics count as 50/50 so it binary-searches. Pre-video check skips basics already "okay", so it doesn't nag before every video.
- FSRS cross-checked against ts-fsrs 6.0.0: stability and difficulty match exactly on 9 histories (not a dependency).
- Not done: item 8 teach-back (needs 3-5 key points per topic first).

## Open flags (pending input)
- Post goals: "many other things" not named yet -> Zarif
- Learner data storage: Zarif said "inside the app" (Q3); PRD v1 says vault. Resolve in PRD v2 -> Zarif
- Social media posts + animations: platforms, content, purpose -> Zarif (after the build, if credit remains)
