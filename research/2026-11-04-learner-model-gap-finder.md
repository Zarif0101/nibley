# Learner model, gap finder, knowledge map

Note: written from memory of the literature, no live web fetch this session. Every number marked "unverified" must be checked before it goes in the spec. Evidence tags: strong / moderate / weak.

## What to build
1. Per topic keep ONE number: P(known), updated by Bayesian Knowledge Tracing (BKT) with fixed, hand-set parameters (no fitting). Multiply by FSRS retrievability so old knowledge fades.
2. Gap finder: when he fails topic T, test only a few ancestors with root-check questions, choosing the one that splits the "suspects" in half (binary search on the prerequisite tree). Max 4 questions, then teach the deepest failed basic and return to T.
3. Map shows 4 levels (not started / shaky / okay / strong) plus ONE highlighted "ready to learn" topic (ALEKS outer fringe). No percentages.
4. One optional tap after an answer: "sure / not sure". Sure + wrong = misconception, goes first in the review queue.
5. Map is a small neighbourhood view (current topic, its basics, next 3 topics), with a "why" line per node and a way for him to correct it.

## 1. Mastery models (right/wrong in, per-topic estimate out)

**BKT** (Corbett and Anderson 1995; strong evidence it works in tutors, moderate for tiny-data use). Four parameters: prior L0, learn T, guess G, slip S.
- Correct: `post = L(1-S) / (L(1-S) + (1-L)G)`
- Wrong: `post = L·S / (L·S + (1-L)(1-G))`
- Then learning step: `L_next = post + (1-post)·T`
- Typical values (commonly seen, unverified): L0 0.2-0.4, T 0.1-0.2, G 0.1-0.25, S 0.05-0.15. Common sanity caps in fitting work: G<0.3, S<0.1 (unverified). Classic "mastered" cutoff is L ≥ 0.95 (Cognitive Tutor; moderate).
- Suggested defaults for Nibley (design choice, not from a paper): L0 0.3, T 0.15, G 0.25 (3-4 option quiz), S 0.1. Flashcards (open recall): G 0.05.
- Code is about 10 lines of JS. pyBKT exists (MIT) but we do not need it; fitting needs many students.

**Elo / Rasch-style** (Pelánek 2016, "Applications of the Elo rating system in adaptive educational systems", moderate). `p = 1/(1+e^-(θ-b))`, `θ += K(correct-p)`, `b -= K(correct-p)`, with K shrinking as answers grow (about 1/(1+0.05n), unverified). Needs a population to learn question difficulty b. We have one student, so b is unknown. Not chosen.

**EMA**: `m += α(correct - m)`, α about 0.3. Simple, but no guess/slip, and one lucky guess on a 3-question topic jumps the score. Fine as a fallback only.

**FSRS as input** (MIT licence, open-spaced-repetition). Each card has stability S and retrievability `R = (1 + F·t/S)^D`; FSRS-4.5/5 use D=-0.5, F=19/81 (FSRS-6 makes decay learnable; check the exact version we ship). Topic strength = `P(known) × mean R of that topic's cards` (weighted by cards reviewed at least once). R handles forgetting, BKT handles "do I understand it". Topic with no cards yet: use P(known) alone.

**Recommendation: BKT with fixed parameters, times FSRS retrievability.** Why: works from the first answer, treats lucky guesses and slips explicitly, needs no population data, needs no fitting, state is 1 number per topic, and it takes a prior (see 2) from the prerequisite tree. Store per topic: `{p, n, lastTs, conf:[...]}`.

## 2. Gap finding on the prerequisite tree

**Knowledge space theory** (Doignon and Falmagne; ALEKS is built on it; moderate-strong). A "state" = the set of topics a student knows; it must respect prerequisites.
- Outer fringe = topics not known whose prerequisites are all known = "ready to learn". Use for "Next up".
- Inner fringe = known topics that nothing known depends on (the newest, most fragile knowledge). Use for "check this first / review these".
- ALEKS asks adaptive questions (roughly 20-30 in the first assessment, unverified) and re-checks learned topics later to catch forgetting.

**Propagating evidence (asymmetric, design choice built on KST logic):**
- PASS on T: its ancestors are very probably known (you cannot easily solve T without them). Raise each ancestor `p = max(p, 0.8)` but flag `inferred:true`; inferred values never count as "strong", and they decay if never directly tested.
- FAIL on T: do NOT lower ancestors directly (T may be failed for its own reasons, or by slip). Just mark ancestors as "suspects" and run the diagnostic below.
- Fail on a basic B (root check) lowers B and marks B's ancestors suspects, same rule.
- Priors for unseen topics: `p0 = 0.3`, or `0.5` if all its prereqs are known (>=0.7) and `0.15` if any prereq is weak (<0.4). Cheap and sensible (design choice).

**Diagnostic algorithm (binary search on the tree):**
```
function nextRootCheck(T):
  suspects = ancestors(T) not already cleared (p < 0.7 or unknown)
  if suspects empty: return null          // gap is T itself: teach T
  w(a) = 1 - p(a)                          // weak-probability mass
  M = sum w(a) over suspects
  for each candidate c in suspects:
    cleared(c) = {c} ∪ ancestors(c)        // a pass clears all of these
    score(c) = | sum w over cleared(c) ∩ suspects  -  M/2 |
  return argmin score(c)                   // ask c's root-check question
after answer: BKT update c; if correct -> cleared(c) get inferred p=0.8
              if wrong and every direct prereq of c is known -> c is the gap, stop
stop when: gap found, OR 4 questions asked (then take the deepest failed node), OR no suspects.
```
On a plain chain of depth d this is exactly binary search (about log2(d) questions: 8 levels need about 3). On a tree the "half the mass" rule approximates maximum expected information gain (a pass clears about half, a fail keeps the rest; entropy of the answer is near 1 bit). Exact version: choose c maximising `H(prior) - E[H(posterior)]` using the BKT G and S; not worth the code at 229 topics. Do not trust one wrong answer on a root: if `p` after update is still above 0.5, re-ask a different phrasing or accept the fail only if confidence was "sure". After teaching the gap, quiz it with 1 question, then return to T.

## 3. Mastery levels, thresholds, confidence

What others use (details unverified, check before quoting):
- Khan Academy: Not started, Attempted, Familiar, Proficient, Mastered; mastery points roughly 50 / 80 / 100 for Familiar / Proficient / Mastered, and unit tests can promote or demote.
- ALEKS: topic is simply in or out of the "pie" (learned / ready to learn / not ready), plus periodic re-assessment that removes forgotten topics.
- Cognitive Tutor: mastered at P >= 0.95.

**Nibley levels (design choice):**

| Level | Rule |
|---|---|
| Not started | no direct answers yet (may show "probably ok" if inferred) |
| Shaky | p < 0.5, OR last answer was wrong, OR "sure" + wrong |
| Okay | 0.5 <= p < 0.85, or retrievability < 0.8 |
| Strong | p >= 0.85 AND answers on at least 2 different days AND retrievability >= 0.8 |

Strong needs two days because spacing is one of the best-supported effects (strong). Levels are a function of numbers, so thresholds can change without migrating data.

**Confidence vs correctness.** After an answer, one tap: "sure / not sure". Evidence: confidence-based marking improves self-assessment and study (Gardner-Medwin, UCL LAPT; moderate); the hypercorrection effect says confident errors are corrected best when feedback is given (Butterfield and Metcalfe 2001; moderate-strong in lab studies). Rules:
- sure + wrong = misconception: show the right answer at once, queue the topic first tomorrow.
- not sure + right = lucky or shaky: use `G = 0.4` in the BKT update for that answer.
- sure + right: normal update.
- Ask on about 1 in 3 questions, to keep it light. Track his calibration (share of "sure" that were right) and show it plainly once a week ("when you are sure you are right 8 times out of 10").

## 4. What to show in the map

Evidence (Bull and Kay 2010 and later reviews on "open learner models"; Long and Aleven 2017 found better outcomes when an open model was paired with self-assessment prompts; moderate, small studies, mostly university/school tutors): showing the model helps reflection and planning when it is simple and tied to an action. Mixed or no gain when it is only a display. There is no ADHD-specific evidence for knowledge maps (weak); the ADHD rules below are general load-reduction design, not tested claims.

Show:
- A small view: current topic, its basics (below), next 3 ready topics (above). Not all 229 nodes. Subject switch on top.
- One highlighted next step ("Learn Vectors, 5 min"). One primary button.
- 4 levels by colour AND shape AND word (never colour alone). No percentages, no decimals.
- A "why" line on tap: "3 of 3 right, last on Monday" or "inferred from Kinematics".
- "Today": what moved up (growth only). No streak counters, no red loss messaging.
- A "this is wrong" control: he can say "I know this" (counts as a weak prior, p=0.5 at most) or "I do not know this" (set shaky).
- Show root-check results as the gap path: "stuck on Work-energy, missing: Vectors" on the map line, one line only.

## Open questions for the spec
- How many answers does a topic get before "Okay" is believable? With 3 quiz questions, one pass gives p about 0.7 at best; that is intended.
- Are all prerequisites "hard" (needed) rather than "helpful"? The library does not mark this, so pass-inference may be too strong for loose edges. Use 0.8 cap and re-test.
- Parameter values need checking against his real answers after 2-3 weeks; log every answer (`topic, correct, conf, ts, kind`) so we can refit.

## Sources (not fetched this session; verify links)
- Corbett and Anderson 1995, "Knowledge tracing: Modeling the acquisition of procedural knowledge", User Modeling and User-Adapted Interaction. https://link.springer.com/article/10.1007/BF01099821
- pyBKT (MIT): https://github.com/CAHLR/pyBKT
- Pelánek 2016, Applications of the Elo rating system in adaptive educational systems, Computers & Education (title only; DOI unverified)
- FSRS (MIT): https://github.com/open-spaced-repetition/free-spaced-repetition-scheduler
- Knowledge space theory overview: https://en.wikipedia.org/wiki/Knowledge_space (ALEKS fringes; primary: Falmagne and Doignon, Learning Spaces, 2011)
- Gardner-Medwin, confidence-based marking, UCL LAPT: https://www.ucl.ac.uk/lapt/
- Butterfield and Metcalfe 2001, "Errors committed with high confidence are hypercorrected", JEP:LMC (link unverified)
- Bull and Kay 2010, Open Learner Models, in Advances in Intelligent Tutoring Systems (link unverified)
- Long and Aleven 2017, "Enhancing learning outcomes through self-regulated learning support with an Open Learner Model", UMUAI (link unverified)
- Khan Academy mastery levels: help-centre page, URL unverified
