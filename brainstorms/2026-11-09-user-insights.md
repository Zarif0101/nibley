# Learning from users (with their permission): Brainstorm / Discovery Notes
Date: 2026-11-09 · Goal: Zarif wants information from users that helps him improve Nibley: insider feedback, complaints, and "permission-based personal information".
Status: built 2026-11-09 (src/insights.js, welcome panel, Settings switch)
Context sources: `src/feedback.js` (FormSubmit email, Feedback button, Not helpful ratings), logs in `logs/`, scorecard events, `src/updater.js`

## Facts (from code, not asked)
- Today Zarif only gets what the user actively sends: the Feedback button and "Not helpful" (question, answer, screenshot, recent errors).
- Nibley already logs a lot locally (`logs/nibley-*.log`): speed per answer, voice used, errors, tokens, which features ran. Nothing of it leaves the PC except error lines inside a feedback email.
- First outside user: Zarif's cousin. Age unknown: if a user is under 18, extra care (consent from a parent in many countries).

## Principles (Claude, to confirm)
- Nothing leaves the PC without the user saying yes, in plain words, and seeing exactly what is sent.
- Every choice can be changed later in Settings.
- Learner data stays in the app (rule from 2026-11-08); a report is a summary, not a copy of their lessons.

## Summary / key decisions
- Report = usage and problems only: how often used, answer speed, what broke, which features were used, ratings. No questions asked, no study content, no topics. With the user's yes.

## Q&A log
### Q1 - What to learn
- Asked: usage and problems, or also what they study?
- Captured: "Usage and problems."
- Decision: weekly usage report (Claude's suggestion, cadence still open); study topics are not collected.

### Q2 - Optional details about the user
- Asked: 3 optional questions at first start (each skippable), sent once with consent, or none?
- Captured: "Yes, 3 optional."
- Decision: (1) studying for (HSC, university, self-learning...), (2) age range (under 18, 18-24, 25+), (3) how they heard about Nibley. No name, email or anything identifying. Under 18: Nibley is more careful (Claude to propose).

### Q3 - How often
- Captured: "Daily for now."
- Decision: one email per user per day they used Nibley (covers the finished day). Switch to weekly later in one release.

## Build plan (Claude)
- First start: a Welcome panel in the sidebar. "Send a daily usage report to Nibley's maker?" Yes / No thanks (no default), "See an example" shows the exact text; then the 3 questions, each with Skip. Changeable in Settings any time.
- Under 18 (Claude's proposal for "more careful"): screenshots are never attached automatically (Not helpful sends text only; the Feedback picture box starts unticked).
- Report = counts from the local log for one finished day: times started, questions, answer speed (median, slowest), problems by kind, features used, Helpful / Not helpful, voice fallbacks, brain, version, Windows. No question text, no topics, no names.
- Profile answers go once, as their own email, only if he said yes to reports.

## Open flags (pending input)
