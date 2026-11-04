# Analogies for any topic (2026-11-04)

Why: Zarif wants Nibley for universal learning ("coding or any stuff"), which needs analogies and drawings beyond physics. This note is what the analogy library (`library/analogies.json`, 107 analogies) and the 107 new drawings are built on.

## What the research says
1. **Teaching With Analogies (TWA)**, built by studying how strong teachers and textbook authors use analogies (Glynn 1991; Glynn, Duit & Thiele 1995). Six steps in order: introduce the target, cue the familiar thing, identify the relevant features, map the similarities, **say where the analogy breaks down**, draw conclusions. Step 5 is the one most explanations skip, and skipping it is how analogies plant wrong ideas.
2. **The "variable is a box" analogy causes a real misconception** (Hermans et al. 2018): students taught with boxes did better on single-assignment questions but were more likely to think a variable holds several values after two assignments; students taught "variable is a label" did better there. Runestone's teacher notes also warn that boxes suggest assignment *moves* a value out. → Nibley uses **name tags** for variables, and keeps "box" for the maths unknown only.
3. **Analogies reduce cognitive load for abstract computer science** (Saxena, Singh & Gupta 2023, *Mathematics* 11(15):3340), following **structure-mapping theory**: an analogy works when the *relations* match (pressure pushes flow, like voltage pushes current), not when the things merely look alike.
4. Textbooks and MOOCs use analogies heavily but rarely say where they fail (van der Werf et al. 2023, 2024).

## Rules Nibley follows (built into the library and TEACHING-BIBLE section 7)
- Every analogy has a `mapping` (2-4 familiar → target pairs) and a `breaks` line. Nibley says the break once, after the mapping.
- Map relations, not looks. Reject analogies that only share a picture.
- Use things a student anywhere knows: kitchens, markets, buses, phones, football-style games, school. No culture-bound analogies (no baseball, no specific holidays).
- One analogy per answer. If it didn't land (LEARNING-ENGINE 4.2), try the next-best one, never the same one again.
- An analogy that worked for him is reused for that topic (`worked`, snapshot header).
- Analogies with known side effects carry a `source` note (e.g. the name-tag one).

## Library contents (2026-11-04)
- 107 analogies: computing 57, maths 15, physics 9, chemistry 5, biology 8, economics 7, learning skills 6. 69 link to a library topic (`topic`), including the 24 programming topics.
- 107 new drawings in the same pen style: 70 everyday objects (`subject: everyday`), 21 computing diagrams (`computing`), 16 general diagram templates (`diagram`: steps, cycle, timeline, Venn, comparison, mind map, funnel, pyramid, 2×2, fishbone, before/after, spectrum, feedback loop, checklist, target, layers).
- `src/learn/analogies.js`: `findAnalogies(list, question, {topic, domain, exclude})` and `analogyLine(a)` for the per-question header.

## Honest limits
- Search results were mostly summaries; the TWA step wording varies between sources. The Hermans 2018 result is from the paper's abstract and summary pages, not a re-analysis.
- Most analogies come from common teaching practice, not from studies of each one. They're checked for correct mapping and a stated break, not tested on learners. Log which ones land (style.js outcomes) and drop the ones that don't.
- Coding now has 24 topics with notes and a prerequisite tree (added the same day); no teach-back points for them yet.

## Sources
- [Glynn 1995, The Science Teacher (TWA)](https://www.scribd.com/doc/48480905/Glynn-1995) · [TWA steps summary (CSUN)](https://csun.edu/science/ref/analogy/analogy.htm) · [Yener 2012, APFSLT](https://www.eduhk.hk/apfslt/v13_issue1/yener/page2.htm)
- [Hermans et al. 2018, Thinking out of the box: comparing metaphors for variables](https://research.tudelft.nl/en/publications/thinking-out-of-the-box-comparing-metaphors-for-variables-in-prog) · [author summary](https://www.felienne.com/archives/6063) · [Runestone teacher note: limits of the box analogy](https://runestone.academy/ns/books/published/TeacherCSP/CSPNameNumbers/noteLimitsBoxAnalogy.html)
- [Saxena, Singh & Gupta 2023, Mathematics 11(15):3340](https://mdpi.com/2227-7390/11/15/3340)
