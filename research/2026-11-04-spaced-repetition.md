# Spaced repetition and the daily review queue

Date: 2026-11-04. Topic owner: research agent. Evidence tags: [strong] [moderate] [weak].

## What to build
1. Reimplement FSRS-6 in about 60 lines of plain JS with the default 21 numbers (below). Do not vendor ts-fsrs.
2. Voice rating: the model judges the spoken answer, then we map to Again / Hard / Good. Easy only if he says "too easy". Never trust a bare "got it".
3. Daily queue: about 10 cards (about 8 due + 2 new at most), plus up to 3 weak-root questions inside those 10. Lowest retrievability first. Hard cap, no guilt backlog.
4. After missed days: do not reschedule or punish. Overdue cards stay due and are served lowest-retrievability first, 10 per session. Offer "one more round" but never force it.
5. Always show the answer and feedback after each question. Feedback roughly doubles the testing benefit [moderate].

## 1. FSRS

Current version in the official wiki: FSRS-6 (21 parameters). The new wiki is https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm (the old fsrs4anki wiki page just redirects there). ts-fsrs README mentions an FSRS-7 default scheduler, but I could not find its formulas. Treat FSRS-7 as unverified. FSRS-6 is enough.

Formulas below were checked against the ts-fsrs 6.0.0 source (`dist/fsrs-6-*.mjs`), which links to that wiki page. Grades: 1 Again, 2 Hard, 3 Good, 4 Easy. S = stability (days until R falls to 90%), D = difficulty (1 to 10), R = retrievability, t = days since last review. w[i] = parameter i.

- Decay and factor: `decay = -w[20]`, `factor = 0.9^(1/decay) - 1`
- Retrievability: `R(t,S) = (1 + factor * t / S) ^ decay` (so R = 0.9 when t = S)
- Next interval for desired retention r: `I = S / factor * (r^(1/decay) - 1)`, rounded, minimum 1 day
- First review: `S0 = w[grade-1]`, `D0(g) = w[4] - exp((g-1) * w[5]) + 1`, then D clamped to 1..10
- Difficulty update: `dD = -w[6] * (g - 3)`; `D' = D + dD * (10 - D) / 9`; then mean reversion `D'' = w[7] * D0(4) + (1 - w[7]) * D'`; clamp 1..10
- Stability after recall (g = 2,3,4): `S' = S * (1 + exp(w[8]) * (11 - D) * S^(-w[9]) * (exp(w[10] * (1 - R)) - 1) * hardPenalty * easyBonus)`. hardPenalty = w[15] if Hard else 1. easyBonus = w[16] if Easy else 1.
- Stability after lapse (g = 1): `Sf = w[11] * D^(-w[12]) * ((S+1)^w[13] - 1) * exp(w[14] * (1 - R))`. In the source, final S' = min(Sf, S / exp(w[17]*w[18])) but not below the minimum 0.001. Simple rule: S' = min(Sf, S).
- Same-day review (t = 0): `S' = S * exp(w[17] * (g - 3 + w[18])) * S^(-w[19])`. For g >= 2 the multiplier is at least 1. Use this for the hint ladder or a retry in the same session.
- Clamp S to 0.001..36500.

Default parameters, FSRS-6, 21 values (verified in wiki and source):
`[0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542]`

Optimizing parameters needs hundreds to thousands of reviews (the "about 1000" figure is from memory, unverified). One student will not have that for months. Use the defaults and expose `desiredRetention` (suggest 0.90; 0.85 if workload feels heavy).

Licence: ts-fsrs 6.0.0 is MIT (npm registry). The wiki page is public. Reimplementing from the published formulas is fine. Credit FSRS in a code comment and the README.

Vendor ts-fsrs? Not recommended:
- 6.0.0 package: 172 KB tarball, 861 KB unpacked, whose runtime code is about 43 KB plus a 11 KB FSRS-6 model file. It also pulls `@open-spaced-repetition/srs-kit`.
- `engines: node >=24`. Our Electron's Node may be older (check). Brief says minimal deps.
- It brings learning steps, fuzzing, leech and middleware features we do not need.
- If we want a test oracle, install it in a scratch folder only and compare outputs to our function on 20 review sequences.

State per card (data shape): `{ id, topicId, kind: "flashcard"|"quiz"|"root", S, D, lastReview (ISO), due (ISO), reps, lapses, state: "new"|"review" }`. State in, state out: `schedule(card, grade, nowISO, desiredRetention) -> card`. Compute R live from `lastReview` and `now`, do not store it. A card is "due" when `now >= due`. Make `due = lastReview + I days`. For sub-day sessions, store full timestamps, not dates.

Easy edge cases: first review is Again -> S0 = 0.212 days (about 5 hours), interval rounds to 1 day. Fine for us: no learning steps, an Again card is re-asked once at the end of the same session (use the same-day formula for that retry), then it is due tomorrow.

## 2. Voice-friendly rating

Four buttons do not fit speech. Mapping Nibley should use (the model judges; Zarif speaks):
- Wrong, "I don't know", or reveal needed -> Again (1)
- Correct but only after hint 1 or hint 2, or he said "not sure" and was right -> Hard (2)
- Correct, no hint, normal confidence -> Good (3)
- Correct, instant, and he says "easy" / "too easy" -> Easy (4). Never infer Easy from speed alone. Without this, Easy is rare, which is fine.
- Partly right (missed one key part) -> Again if the missing part is the core idea, else Hard. Model must return one of `again|hard|good|easy` plus a one-line reason. Log reason for debugging.
- "Got it" with no answer: ask him to say it. A self-rating without producing the answer is a weaker test (recall is the point). Do not schedule on a bare claim.

Evidence for 2-button vs 4-button: [weak]. No peer-reviewed study found. Anki community threads say pass/fail (Again/Good only) works about as well, and reportedly the official Anki FAQ says FSRS may be even more accurate with only Again and Good because people use Hard/Easy inconsistently (I could not retrieve the FAQ text: unverified). A forum comparison was confounded (the two groups differed). Conclusion: 3 outcomes (Again / Hard / Good) with Easy optional is a safe design; pure pass/fail is a safe fallback. Source: https://forums.ankiweb.net/t/does-using-all-4-answer-buttons-make-fsrs-more-accurate/70312 (community, not primary).

## 3. Daily review queue

Size. About 5 minutes. Spoken card cycle (read question, he answers, judge, short feedback) is probably 20 to 30 seconds. So 8 to 12 cards. This is my estimate, not measured: measure it in the first week and adjust. Suggest hard cap 10 cards, stop early at 6 minutes.

Order.
1. Compute R for every due card. Sort by R ascending (most forgotten first). This handles overdue gracefully: FSRS already lowers R with elapsed time and also accounts for it in the stability update.
2. Take up to 3 weak-root questions (root-check cards whose last grade was Again, or topic nodes with low confidence on the knowledge map), only if they are due or have never been reviewed. They count inside the 10.
3. New cards: at most 2 per day, only when due cards are fewer than the cap. New cards come from topics he recently watched/opened, not random.
4. If nothing is due: say so, finish. Do not invent cards.

Interleaving vs blocking. Mix topics within a session (do not do 10 cards of the same topic). Evidence: interleaving meta-analysis (Brunmair and Richter 2019, Psychological Bulletin) found overall g about 0.42, larger for similar-looking categories (paintings g 0.67), small and variable for maths, negative for word learning (g about -0.39) [moderate]. Reviews are short single-fact cards: light mixing is free, no need to engineer it. Do not block by topic.

Missed days. Do not change due dates (they are the honest schedule). Cap the session at 10; leftovers stay due. After more than 3 days away, show "welcome back, 10 today" not the backlog number (ADHD: avoids shame wall). If the backlog is over 60 for more than a week, offer a "fresh start" that only re-queues weak-root and low-R cards. Optional load balancing: when computing `due`, add small fuzz (plus/minus 5% for intervals above 7 days, a common FSRS practice, details unverified here) and if a day already has more than 15 due, shift a new interval by one day. Low priority: one student with 229 topics will have a small load.

Review spacing details to leave alone: desired retention 0.90 is the FSRS default. Retention 0.85 cuts workload at a small memory cost (my reasoning from the formula, not a measured claim).

## 4. Learning science backing

- Testing effect (retrieval practice beats rereading): Rowland 2014 meta-analysis, g about 0.50 [strong]. Adesope et al. 2017, 118 articles, g about 0.61 fixed-effect (0.70 random-effects; sources disagree on the headline) [strong]. Feedback after the test raises the effect (about g 0.73 with feedback vs 0.39 without, from a secondary source, unverified) [moderate]. So always give feedback.
- Spacing effect: Cepeda et al. 2006 meta-analysis of distributed practice (317 experiments, from memory, unverified numbers) [strong]. Best gap grows with how long you need to remember (Cepeda 2008) [moderate].
- Dunlosky et al. 2013 rated practice testing and distributed practice "high utility", interleaving "low/needs more evidence" (from memory, unverified) [strong for the first two].
- Interleaving: see section 3 [moderate].
- FSRS itself: the forgetting curve fit is validated on a large Anki dataset by its maintainers (open benchmark); the benchmark is by the FSRS authors, not independent [moderate].
- Caveat: lab studies use short facts and typed answers; spoken recall for physics/maths/chem concepts and derivations is less studied [weak]. Cards should have short, checkable answers.

## Sources
- FSRS algorithm wiki (FSRS-6): https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm
- Old wiki (redirect): https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm
- ts-fsrs repo (MIT): https://github.com/open-spaced-repetition/ts-fsrs
- ts-fsrs 6.0.0 on npm registry (licence, size, deps, source read from tarball): https://registry.npmjs.org/ts-fsrs/latest
- Anki forum 4-button thread (community): https://forums.ankiweb.net/t/does-using-all-4-answer-buttons-make-fsrs-more-accurate/70312
- Brunmair and Richter 2019: https://pubmed.ncbi.nlm.nih.gov/31556629/
- Adesope et al. 2017, Review of Educational Research: https://journals.sagepub.com/doi/10.3102/0034654316689306
- Rowland 2014 (g = 0.50, via secondary citation): https://link.springer.com/10.1186/s41235-023-00508-8
