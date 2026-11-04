# Cloud build plan ($35 credit): Brainstorm / Discovery Notes
Date: 2026-11-04 · Goal: finalize what this cloud session builds with the last ~$35 of credit (must be used within one day), then execute.
Status: complete (interview). Executing A → E; resume point = BUILD-LOG.md, newest entry.
Context sources: docs/QUALITY-PLAN.md, docs/TEACHING-BIBLE.md, docs/LEARNING-ENGINE.md, brainstorms/2026-11-04-pregenerated-study-assets.md, PR Zarif0101/nibley#1 (src/learn, library)

## Summary / key decisions
- Draft plan (assistant, 2026-11-04): A quality gates (CI, scorecard, lint, phrase matcher) → B personalization modules (kind, style, pace, curve, snapshot) → C teaching content (style cards + gold examples, styles.js, eval scorer) → D visuals (overlay simulator, 3D mood loops) → E teach-back module + key points for 40 basic topics. Commit after every item.
- File ownership: cloud adds new files + src/learn/ + library/styles/ + test/; the local session owns src/main.js, overlay.js, tts.js, brain.js.
- PR #1: not merged yet (Zarif's subscription limit ended). Cloud pulls PR #1's branch into this branch itself; Zarif merges later.
- Build order (Q1, confirmed): A → B → C → D → E. Whatever is last may be cut if credit runs out.
- Style mode (Q2, confirmed): Auto by default; per-answer override by voice; tray can lock one style (Fixed). Resolves QUALITY-PLAN open decision 2.
- Simulator looks (Q3, confirmed): subtitles only (TEACHING-BIBLE section 5), on white slide + dark video, for Zarif's OK before QUALITY-PLAN T2.
- Teach-back content (Q4, confirmed): the 40 physics + maths topics with the most dependents in the prerequisite graph.
- Delivery (Q5, confirmed): no PR; push to `claude/brave-cori-ykrswn` only. Zarif decides about a PR later.
- SCOPE CHANGE (Zarif, mid-build): universal learning on ANY topic (coding etc.). Needs analogies + many more assets and diagrams beyond physics; research first. "Don't ask me anything... keep working until my limit is over." New order: finish B → F (analogy research + analogy library + assets + diagrams) → C → D → E.
- Credit: ~$35 left, Zarif: "I have one day to use all of the $35 of credit, so I'm just going to do everything I can."

## Q&A log
### Q0 - PR #1 before Phase B
- Asked: merge PR #1 now, or should the cloud pull it into this branch?
- Captured: "We can merge it later because my actual limit has ended." → cloud pulls `claude/sleepy-darwin-jy0kpp` into `claude/brave-cori-ykrswn`.
- Flags: Zarif merges PR #1 (and this branch) into main later -> Zarif

### Q1 - Build order if credit runs short
- Asked: which order (first = guaranteed, last = may be cut)? Options: A→B→C→D→E (suggested), visuals first, brain first, content first.
- Captured: A→B→C→D→E (picked the suggestion).
- Flags: none
### Q2 - Teaching style mode
- Asked: Auto (Nibley picks per question and learns) vs Fixed (user picks, Nibley suggests) vs ask on first launch. Suggested Auto.
- Captured: Auto by default (picked the suggestion).
- Flags: none
### Q3 - New looks in the overlay simulator
- Asked: subtitles only (suggested) / + note paper / + all 5 layouts / none.
- Captured: subtitles only (picked the suggestion).
- Flags: subtitle look approval -> Zarif, when screenshots are ready
### Q4 - Which 40 topics get teach-back key points
- Asked: most-used basics (suggested) / what he's studying now / 11th physics first / skip content.
- Captured: most-used basics (picked the suggestion).
- Known from library (not asked): 229 topics, also chemistry (40) and biology (33) beyond the physics + maths scope; most-depended-on: arithmetic-basics, trig-ratios, forces-basics (8 dependents each), fractions-decimals, units-si (7).
- Flags: none
### Q5 - Anything else / PR at the end
- Asked: start and open one PR at the end (suggested) / start, no PR, just push / add something first.
- Captured: "Start; no PR, just push."
- Flags: PR decision -> Zarif, later
### Mid-build message (no question asked)
- Captured (his words): "We are going to be using it for universal learning on any topic, like coding or any stuff. We need analogies, and for those analogies, we need more assets other than those physics and stuff. Also create many assets and diagrams for those cases. Research those cases and then add that. Don't ask me anything. I'm going to sleep... Just keep working until my limit is over."
- Decided (assistant, no questions allowed): new Phase F after B; C, D, E keep their order after F.
- Flags: PRD v1 scope says physics + maths study from YouTube; "any topic" needs PRD v2 to say so -> Zarif, PRD v2

## Open flags (pending input)
- Merge PR #1 and this branch into main -> Zarif, later
- OK the subtitle look from the simulator screenshots -> Zarif
- QUALITY-PLAN open decisions 1, 3, 4 (auto-pause video, learner data location, first-line voice) -> Zarif (2 resolved in Q2)
