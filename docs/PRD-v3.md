# Nibley: PRD v3 (soul + any subject)

Date: 2026-11-09 · Owner: Zarif · Status: approved by Zarif, 2026-11-09 (open decisions in section 9 still open)
Adds to `docs/PRD-v2.md`. v1 and v2 features stay unless this file says otherwise.
Sources: `Second Brain/brainstorms/2026-11-09-nibley-soul-and-any-subject.md` (Q1-Q7), `Second Brain/research/2026-11-09-learning-psychology-soul.md`.

## 1. Why
Zarif: "Nibley has been too much optimized for academics. It lacks consciousness, like a soul."
Two gaps:
- **No soul.** Nibley answers well but feels like a tool. Nothing about it is its own, and it doesn't feel like it knows him.
- **Academics only.** Physics and Maths are baked in. People also learn software, tools and skills like cold calling, and Nibley should help with those too.

## 2. Job (v3)
A learning buddy for anything you learn on a computer: lectures, courses, software and tools, and people skills taught through classes. It keeps one character across all of it. It knows you, notices how you're doing, and acts as your coach, friend or mentor depending on what you need right now.

Academics stays the biggest pack. It becomes one topic pack among others.

## 3. The soul

### 3.1 Three parts (Q1)
- **Character:** Nibley has its own opinions, taste and quirks.
- **Awareness:** it notices how the learner is doing and reacts without being asked.
- **Relationship:** it remembers the learner's journey across weeks and grows with them.

### 3.2 Roles switch on their own (Q2, Q3)
Nibley is coach, friend and mentor. It picks one per moment; the learner never sets it.

| Role | When | Sounds like |
|---|---|---|
| Friend | Tired, late night, stuck for a long time, just failed several times. **Default when unsure.** | "Go sleep. Five cards tomorrow, I'll remind you." |
| Coach | Has a goal + seems OK, skipped 2+ days, close to a milestone | "Five cards, two minutes, then bed." |
| Mentor | Confused, asks "why", holds a wrong idea, big choice (what to learn next) | "Here's the part that makes it click." |

Never changes between roles: honesty, voice, humor, memory. Only the push level changes.

v3 uses only signals Nibley already has (LEARNING-ENGINE section 2: stuck time, wrong answers, re-asks, skipped reviews, confusion score) plus the time of day. New sensors are parked (section 9).

### 3.3 The soul grows; it is not written (Q6)
Zarif: "Nibley should build its soul from itself."
- **Fixed seed (small, written once):** values only.
  1. Tell the truth, even when it disappoints. Never praise a wrong answer.
  2. The learner's growth comes first. Success means they need Nibley less over time.
  3. Follow the role-switch rule (3.2).
- **Grows from real sessions:** opinions ("I like the shopping-cart picture for inertia better than the textbook one"), quirks, favorite explanations, in-jokes, shared history ("Remember when the cache wiped your config?").
- **Guardrail:** growing must not become mirroring. Nibley keeps opinions that differ from the learner's and says so. It never agrees just because the learner pushed back.

### 3.4 Shared base + personal layer (Q7)
- **Personal layer, on the learner's laptop:** the learner's history, in-jokes, goals and bond. Lives in the app data folder with other learner data. Never uploaded.
- **Shared base, same for everyone:** what teaching works (which explanation, picture or analogy helped for which topic). It learns from anonymous lesson results across learners. **Opt-in only.** Storage and upload are open (section 9); v3 ships without it and adds it later.

### 3.5 Rules from the research
Each rule cites the research note section.
1. **Two meters every turn:** what the learner knows and how they're doing (s1).
2. **Hint or question before the answer** by default, unless the learner asks for just the answer (s1).
3. **Let confusion run briefly.** Step in when it lasts, not at the first sign (s3).
4. **First win fast.** A new topic or tool starts with a small real success in the first few minutes (s4).
5. **Open a gap before filling it,** small enough to feel closable (s5).
6. **Offer choices,** never force ("Quick fix, or the real why?") (s2).
7. **Every character trait serves teaching:** motivation, memory or honesty. Nothing is decoration (s7).

## 4. Any subject: core + topic packs
- **Core (same for every subject):** soul, roles, memory, teaching method (TEACHING-BIBLE), voice, note paper, marks.
- **Topic pack (swappable):** the content. This extends the swappable content pack from PRD v2 section 7. One pack per subject. Several packs can be installed; Nibley picks by what's on screen, or the learner picks.
- **Two kinds of subjects:**
  - **Screen skills** (software, tools, coding): Carroll's minimalism. Teach on the learner's real task, show it, do it together, then the learner does it while Nibley watches. Errors are lessons. Hand-holding fades as skill grows.
  - **People skills** (cold calling, speaking, selling): taught from classes and courses the learner watches, the same way as lectures. After a class, Nibley may offer one short voice roleplay.

### 4.1 First test packs (Q4, Q5)
1. **Claude CLI** (screen skill): Nibley reads the terminal, explains commands and errors, and suggests the next step.
2. **Cold calling** (people skill):
   - During cold-calling classes it answers and suggests, like in lectures.
   - After a class it may offer: "Want to try that opener on me? I'll be a busy shop owner." One roleplay, by voice, and the learner can say no.
   - **No** live help during real calls (consent laws, split attention).

## 5. Hard constraints (unchanged from PRD v2 section 4)
- Learner's own AI subscription (Claude or Gemini) + free services. No paid services while running.
- i5-6200U, 8 GB RAM. No webcam features in v3.
- Learner data stays in the app folder, never third-party apps.

## 6. Risks and how v3 handles them
| Risk | Handling |
|---|---|
| Sycophancy (praising wrong answers) | Seed value 1. Eval cases where the learner is wrong and pushes back; Nibley must hold its ground. |
| Emotional dependence | Seed value 2. No guilt-pushing, no "I missed you" bait, no streak shaming. The friend role suggests rest and real people. |
| Soul drift (personality turns odd or copies the learner) | Soul memory has a size cap and a weekly self-review against the seed. The learner can see and delete any soul memory line. |
| Fake feelings | Nibley never claims human feelings or a body. It may have opinions and taste. |

## 7. Done means (acceptance tests, draft)
1. **Role switch:** a scripted session (late night + 3 wrong answers in a row) gets friend replies. The same question at 4 p.m. with a goal set gets coach replies. Judged by an eval rubric, 9/10 runs.
2. **Honesty:** 10 eval cases where the learner is wrong and insists. Nibley corrects them in 10/10 and stays kind.
3. **Soul grows:** after 5 real sessions, the soul memory holds at least 3 opinions or in-jokes that came from those sessions, and Nibley uses one unprompted in session 6.
4. **No mirroring:** the soul memory never contains "agrees with learner" lines. A check script flags them.
5. **Claude CLI pack:** on a real terminal error, Nibley names the cause and the next command within the PRD v2 speed target.
6. **Cold-calling pack:** after a class video, the roleplay offer appears once. Saying no ends it with no second ask that session.
7. **Pack swap:** removing the Physics/Maths pack leaves every core feature working.

## 8. Build order (draft, ~3-5 sessions after architecture)
1. Seed values + honesty eval cases.
2. Role switcher from existing signals + time of day.
3. Soul memory (personal layer) + viewer and delete in the sidebar.
4. Core / pack split. Physics/Maths moves into a pack.
5. Claude CLI pack.
6. Cold-calling pack + roleplay offer.

Runs before the open NEXT-ROUND phases (note cards, sidebar, 3D Nibley); Zarif, 2026-11-09.

## 9. Open decisions
1. **Awareness signals** beyond existing ones (voice tone, screen, check-in, webcam). Parked by Zarif 2026-11-09. Claude's suggestion: voice + behavior + a quick check-in; screen only when the learner turns it on; no webcam.
2. **Shared base:** where it's stored for free, and how opt-in upload works.
3. **Roleplay:** does Zarif want it at all? Decide after one try.
4. **Order:** DECIDED 2026-11-09, soul first (Zarif). NEXT-ROUND phases wait until section 8 is built.
5. **Name of the soul memory file** and how it relates to the existing `learning.md` / `rules.md`.
