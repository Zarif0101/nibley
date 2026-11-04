# Pause quizzes, hint ladder, teach-it-back, confusion detector

Date: 2026-11-04. Evidence tags: STRONG / MODERATE / WEAK. "(memory)" = from my background knowledge, not re-checked this session; verify before citing.

## What to build
1. Pause quiz: at the end of each natural segment (about every 4-6 min), offer 1 spoken question (2 at most). Never mid-sentence. "Skip" always works.
2. Hint ladder: 3 levels (idea, partial step, answer), each tap is a new, slower level. Log hint taps. The answer level is allowed, but then the item is re-queued as "weak".
3. Teach-it-back: pre-generate 3-5 key points per topic. Grade each as fine / missing / wrong with one cheap Haiku call. Reply only about missing and wrong points.
4. Confusion detector: count signals in a rolling window (seek-back, replay of same span, pause, wrong answer, long silence). When a score passes a threshold, show a small "Want me to explain that bit?" chip. Never auto-speak.
5. ADHD: no solid ADHD-specific proof for any of this. Retrieval practice still helps ADHD students in small college studies. Keep sessions short, easy to skip, low pressure.

## 1. Pause quizzes (interpolated testing)
- Szpunar, Khan, Schacter 2013 (PNAS 110:6313): 21-min statistics video in 4 segments, a short test after each segment. Tested group had less mind wandering, took more notes, did better on the final test, and reported less anxiety about the final test. Press interviews quote about 40% mind wandering untested and about half that when tested (secondhand, check paper). Evidence: MODERATE for videos (one lab group plus replications, college students); STRONG for the underlying testing effect (many meta-analyses, Rowland 2014, Adesope 2017 (memory)).
- Frequency: Szpunar used about every 5 min. No study I found gives a proven best N. Recommendation: one question per segment end, trigger at a natural break (topic slide change, long pause in speech, or the user pauses), minimum 3 min since last quiz. This is a design choice, not a measured optimum.
- Count: 1 question per break. A 2nd only if the 1st was wrong (retry the same idea). Cap at about 4 per hour so it stays non-annoying (my choice).
- Types by voice: free recall ("what was the main idea of that part?") and short answer beat multiple choice for learning (MODERATE), but multiple choice is easier to speak and grade. Use short-answer-by-voice for 1 key fact, "predict what happens next" before a result, and "which of these two is right and why". Avoid long option lists (hard to hold in the ear).
- Use the existing note questions and flashcards for the topic, so no live question generation is needed. Feed answers into FSRS.
- Mind-wandering link is plausible for ADHD but see section 5.

## 2. Hint ladder
- Evidence base: Cognitive Tutor (Carnegie Learning), Andes (physics), ASSISTments. Tutors there use on-request hints ending in a "bottom-out" hint that states the step. Evidence that hints help: MODERATE (ITS meta-analyses, VanLehn 2011, step-based tutors close to human tutors (memory)).
- Levels: most systems use 3-5. Recommend 3 for voice:
  - L1 Point: name the relevant idea or ask a cue question. Do not give numbers. ("What does conservation of energy say about the start and end here?")
  - L2 Partial step: give the setup or the next step, leave the calculation. ("Write KE at the bottom = potential energy at the top. What's left to solve?")
  - L3 Bottom-out: full answer with a one-line why. Then ask him to redo a twin problem.
- Hint abuse: Aleven et al. 2006 (Geometry Cognitive Tutor): about 36% of actions counted as hint abuse, 14% if rapid successive hints counted as one (LearnLab wiki summary). Typical abuse pattern: click through the levels fast without reading and stop at the bottom-out. Baker's gaming detectors use rapid repeated help requests and guess-and-check answers. Detector models exist and transfer to ASSISTments (Paquette, Baker, Moskal) but code and exact rules were not retrieved.
- Simple rule for us: flag "skipping" if L2 or L3 is requested within 3 seconds of the previous level (3 s is my guess, tune it) or if 3 or more wrong answers come within 10 seconds. Response: make hints slow and calm and ask "which part lost you?", rather than blocking. Forced delays between hints just made students find another way to game (Murray and VanLehn, per LearnLab wiki, MODERATE).
- Log: hintLevelMax, timeToAnswer, wrongCount per item. Maximum hint reached feeds weak-root and FSRS grade (L3 = "Again" or "Hard").
- Worked-example fading: Renkl, Atkinson et al. (memory), fading steps from full worked example to blanks helps novices (STRONG for worked examples, MODERATE for fading). Expertise reversal (Kalyuga): once he is competent, stop giving full examples. Plan: weak topic -> worked example; next try with one step blanked; then full problem. L3 can be the worked example.

## 3. Teach-it-back
- Self-explanation (Chi et al. 1994; Dunlosky 2013 rates it "moderate utility") MODERATE-STRONG. Protégé effect and learning by teaching (Fiorella & Mayer 2013; Nestojko 2014, expecting to teach) MODERATE. Feynman style is a name for the same idea, no separate trials.
- Prompt: "Explain it to me like I'm a Year 8 student. I'll only fix what's missing."
- Grading with an LLM: evidence says rubric-guided grading is near human level on clear cases and weak on ambiguous ones; always include a confidence/defer path (arXiv 2412.06910; 2601.08843, both preprints). So: a rubric of 3-5 atomic points, each judged separately, temperature 0, JSON output, and "unclear" counts as missing (cheap and safe), then Nibley says only what was missed.
- Pre-generated rubric per topic (store in the topic's note):
```json
{
  "topicId": "newton-2nd-law",
  "prompt": "Explain Newton's second law to a younger student.",
  "points": [
    {"id":"p1","must":"Net force causes acceleration (F = ma)","accept":["push makes speed change","force over mass"],"common_wrong":["force is needed to keep moving"],"fix":"A force changes motion; it isn't needed to keep it going."},
    {"id":"p2","must":"More mass means less acceleration for the same force","accept":[],"common_wrong":[],"fix":"..."}
  ],
  "min_pass": "all points fine or at most 1 missing, 0 wrong"
}
```
- Grader output: `{"p1":"fine|missing|wrong","p2":"..."}` plus `"quote"` per wrong point. Input: speech-to-text transcript. STT errors on units and names are a risk, so grade meaning only and ignore wording.
- Reply template: say what was right in one short line, then only each missing/wrong point's `fix` text. One point at a time if there are 3 or more problems. Treat wrong as a weak-root signal.
- Cost: about 1 Haiku call per attempt, short prompt. Do not re-grade; cache the rubric.

## 4. Confusion detection from video behaviour
- Kim et al. 2014 (L@S, 862 edX videos): re-watching sessions and tutorials had sharper interaction peaks (replay/seek-back); readers interpret peaks as interest or confusion, but only 61% of 80 manually checked peaks lined up with visual transitions, so many peaks are not confusion. Higher dropout in longer videos. (MODERATE, observational.)
- Sinha et al. 2014 (EMNLP workshop): builds an "information processing" index from clickstream (e.g. repeated rewind, pauses, speed changes); full thresholds not retrieved. Treat as WEAK for fixed numbers.
- No published universal thresholds that I could verify. Everything below is a starting guess to tune with his own data (my choice, unverified):
  - seek-back of 5-30 s counted as a "rewind"; 2+ rewinds into the same 15 s span within 2 min = +2
  - pause longer than 20 s while not leaving the window = +1
  - speed lowered after being raised = +1
  - wrong answer on a quiz or root check about the current topic = +2; 2 in a row = +3
  - silence longer than 30 s after Nibley asked something = +1
  - Offer when score is 3 or more inside a 3-minute window.
- Avoid annoying: offer, never interrupt; chip fades after 8 s; after dismissal, wait 10 min or until a new segment; max 3 offers per session (my numbers); do not fire in the first 60 s of a video; ignore seek-backs that land on slide changes (this is the main false positive in Kim); do not offer while he is typing or talking. Track accept rate; if under 30% over a week, raise the threshold automatically.
- Do not claim to know he is confused; say "Want a quick explanation of that part?"

## 5. ADHD-specific evidence
- Retrieval practice: small college studies (about 36 per group). Minear et al. 2023 (Frontiers in Psychology): benefits for students with ADHD, but unmedicated students encode worse so retrieval does not fully close the gap. Earlier work is mixed; one found no benefit for free recall of prose. Easier formats (multiple choice) benefit them; whole-text free recall suggested by Stern and Halamish 2023. Evidence: WEAK-MODERATE, no adolescents, no video.
- Interpolated quizzes: general evidence says they reduce mind wandering; some authors say the gain may be partly about engagement. Nothing ADHD-specific found.
- Hints, teach-back, confusion detection: no ADHD-specific evidence found. Do not claim any.
- Sensible, low-cost design (rationale only, not proven): short quiz, immediate feedback, easy skip, no punishment, voice rather than typing.

## Licences
No code reused. Papers only. Baker's gaming detectors and Cognitive Tutor code were not reviewed; check licence before reuse.

## Sources
- Szpunar et al. 2013: https://pmc.ncbi.nlm.nih.gov/articles/PMC3631699/
- Hint abuse summary (Aleven 2006, Murray and VanLehn): https://learnlab.org/research/wiki/index.php/Help_abuse
- Gaming detector (Paquette, Baker): https://learninganalytics.upenn.edu/ryanbaker/multiprong_extended.pdf
- Kim et al. 2014: https://dspace.mit.edu/handle/1721.1/90413
- Sinha et al. 2014: https://aclanthology.org/W14-4102/
- Minear et al. 2023, ADHD retrieval: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10397724/
- LLM partial-credit grading: https://arxiv.org/pdf/2412.06910
- Rubric-conditioned LLM grading: https://arxiv.org/html/2601.08843
