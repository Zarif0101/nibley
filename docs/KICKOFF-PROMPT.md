Paste this into a new Claude Code session opened in `C:\Users\arko4\Desktop\Nibley` (Opus, extra-high effort).

---

Build Nibley v1 in this session, end to end.

Read `CLAUDE.md`, then `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/BUILD-PLAN.md`, `docs/DESIGN.md`. Those are the spec. Don't re-plan or re-interview me; it's all decided.

How to work:
- Follow BUILD-PLAN.md section 6 order. Build each part, test it right away, then move on.
- Every problem in BUILD-PLAN section 4 has a planned fix. Use it. If a fix fails, try the next-best option, log why in `docs/BUILD-LOG.md`, keep going.
- Stop and ask me only for the cases in BUILD-PLAN section 7.
- The Groq key is in `.env`. Never print it.
- Look: DESIGN.md only. I hate AI slop.
- Keep `docs/BUILD-LOG.md` current so a new session can resume if my usage limit hits.

When finished, give me the summary in BUILD-PLAN section 8 format: what works and how to start it, the test table with real numbers, what you didn't check, known problems, and my one next decision.
